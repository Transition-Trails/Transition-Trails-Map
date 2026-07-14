import { refreshAccessToken } from "./salesforceOAuth.js";

// ── Types ─────────────────────────────────────────────────────────────────────

export interface SoqlQueryResult<T> {
  records: T[];
  totalSize: number;
  done: boolean;
}

export interface SalesforceCreateResult {
  id: string;
  success: boolean;
}

// Shared interface implemented by both SalesforceClient (session-based)
// and ConnectorSalesforceClient (Replit proxy-based).
export interface ISalesforceClient {
  query<T>(soql: string): Promise<SoqlQueryResult<T>>;
  getRecord<T>(objectApiName: string, recordId: string, fields: string[]): Promise<T>;
  createRecord(objectApiName: string, data: Record<string, unknown>): Promise<SalesforceCreateResult>;
  updateRecord(objectApiName: string, recordId: string, data: Record<string, unknown>): Promise<void>;
}

// ── Client ────────────────────────────────────────────────────────────────────

export class SalesforceClient {
  private accessToken: string;
  private readonly refreshToken: string;
  private readonly instanceUrl: string;
  private readonly onTokenRefresh: (
    newAccessToken: string,
    newIssuedAt: string
  ) => Promise<void>;

  constructor(
    accessToken: string,
    refreshToken: string,
    instanceUrl: string,
    onTokenRefresh: (newAccessToken: string, newIssuedAt: string) => Promise<void>
  ) {
    this.accessToken  = accessToken;
    this.refreshToken = refreshToken;
    this.instanceUrl  = instanceUrl;
    this.onTokenRefresh = onTokenRefresh;
  }

  // ── Private HTTP core ────────────────────────────────────────────────────

  private async request<T>(
    method: string,
    path: string,
    body?: unknown,
    isRetry = false
  ): Promise<T> {
    const url = `${this.instanceUrl}${path}`;

    const headers: Record<string, string> = {
      Authorization:  `Bearer ${this.accessToken}`,
      "Content-Type": "application/json",
      Accept:         "application/json",
    };

    const init: RequestInit = {
      method,
      headers,
      body: body !== undefined ? JSON.stringify(body) : undefined,
    };

    const resp = await fetch(url, init);

    // Transparent token refresh on 401
    if (resp.status === 401 && !isRetry) {
      const refreshed = await refreshAccessToken(this.refreshToken);
      this.accessToken = refreshed.accessToken;
      await this.onTokenRefresh(refreshed.accessToken, refreshed.issuedAt);
      return this.request<T>(method, path, body, true);
    }

    // 204 No Content — return empty object cast to T
    if (resp.status === 204) {
      return undefined as unknown as T;
    }

    if (!resp.ok) {
      let errorBody: string;
      try {
        const parsed = await resp.json() as unknown;
        errorBody = JSON.stringify(parsed);
      } catch {
        errorBody = await resp.text().catch(() => "(unreadable body)");
      }
      throw new Error(
        `Salesforce API error ${resp.status} ${method} ${path}: ${errorBody}`
      );
    }

    return resp.json() as Promise<T>;
  }

  // ── Public API ───────────────────────────────────────────────────────────

  query<T>(soql: string): Promise<SoqlQueryResult<T>> {
    const encoded = encodeURIComponent(soql);
    return this.request<SoqlQueryResult<T>>(
      "GET",
      `/services/data/v62.0/query?q=${encoded}`
    );
  }

  getRecord<T>(
    objectApiName: string,
    recordId: string,
    fields: string[]
  ): Promise<T> {
    const fieldList = fields.join(",");
    return this.request<T>(
      "GET",
      `/services/data/v62.0/sobjects/${objectApiName}/${recordId}?fields=${fieldList}`
    );
  }

  createRecord(
    objectApiName: string,
    data: Record<string, unknown>
  ): Promise<SalesforceCreateResult> {
    return this.request<SalesforceCreateResult>(
      "POST",
      `/services/data/v62.0/sobjects/${objectApiName}`,
      data
    );
  }

  updateRecord(
    objectApiName: string,
    recordId: string,
    data: Record<string, unknown>
  ): Promise<void> {
    return this.request<void>(
      "PATCH",
      `/services/data/v62.0/sobjects/${objectApiName}/${recordId}`,
      data
    );
  }
}
