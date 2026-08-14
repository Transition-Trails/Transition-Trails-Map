// Salesforce client that routes all API calls through the Replit Connectors proxy.
// No session tokens or OAuth credentials needed — the proxy handles auth automatically.
// Replit integration: connection:conn_salesforce_01KTVV2KV10ESH5DJE3871WY1E (status: added)

import { ReplitConnectors } from "@replit/connectors-sdk";
import type {
  ISalesforceClient,
  SoqlQueryResult,
  SalesforceCreateResult,
} from "./salesforceClient.js";

const SF_API_VERSION = "v62.0";

export class ConnectorSalesforceClient implements ISalesforceClient {
  private connectors: ReplitConnectors;

  constructor() {
    this.connectors = new ReplitConnectors();
  }

  private async request<T>(
    method: string,
    path: string,
    body?: unknown
  ): Promise<T> {
    const proxyFetch = this.connectors.createProxyFetch("salesforce");
    const proxyUrl   = this.connectors.getProxyUrl();
    const url        = `${proxyUrl}${path}`;

    const resp = await proxyFetch(url, {
      method,
      headers: {
        "Content-Type": "application/json",
        Accept:          "application/json",
      },
      body: body !== undefined ? JSON.stringify(body) : undefined,
    });

    if (resp.status === 204) return undefined as unknown as T;

    if (!resp.ok) {
      let errorBody: string;
      try {
        errorBody = JSON.stringify(await resp.json());
      } catch {
        errorBody = await resp.text().catch(() => "(unreadable body)");
      }
      throw new Error(
        `Salesforce Connector error ${resp.status} ${method} ${path}: ${errorBody}`
      );
    }

    return resp.json() as Promise<T>;
  }

  /** Make an arbitrary REST GET against the Salesforce API (path includes /services/…). */
  rest<T>(path: string): Promise<T> {
    return this.request<T>("GET", path);
  }

  query<T>(soql: string): Promise<SoqlQueryResult<T>> {
    const encoded = encodeURIComponent(soql);
    return this.request<SoqlQueryResult<T>>(
      "GET",
      `/services/data/${SF_API_VERSION}/query?q=${encoded}`
    );
  }

  /**
   * Execute a SOQL query and automatically follow nextRecordsUrl pages until
   * done === true. Returns a flat array of all records across all pages.
   *
   * Use this instead of query() wherever the result set may exceed SF's default
   * page size (2 000 rows) to avoid silently truncating results.
   */
  async queryAll<T>(soql: string): Promise<T[]> {
    const first = await this.query<T>(soql);
    const records: T[] = [...first.records];
    let page = first;
    while (!page.done && page.nextRecordsUrl) {
      page = await this.request<SoqlQueryResult<T>>("GET", page.nextRecordsUrl);
      records.push(...page.records);
    }
    return records;
  }

  getRecord<T>(
    objectApiName: string,
    recordId: string,
    fields: string[]
  ): Promise<T> {
    return this.request<T>(
      "GET",
      `/services/data/${SF_API_VERSION}/sobjects/${objectApiName}/${recordId}?fields=${fields.join(",")}`
    );
  }

  createRecord(
    objectApiName: string,
    data: Record<string, unknown>
  ): Promise<SalesforceCreateResult> {
    return this.request<SalesforceCreateResult>(
      "POST",
      `/services/data/${SF_API_VERSION}/sobjects/${objectApiName}`,
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
      `/services/data/${SF_API_VERSION}/sobjects/${objectApiName}/${recordId}`,
      data
    );
  }

  deleteRecord(objectApiName: string, recordId: string): Promise<void> {
    return this.request<void>(
      "DELETE",
      `/services/data/${SF_API_VERSION}/sobjects/${objectApiName}/${recordId}`
    );
  }

  /**
   * Fetch a resource through the SF proxy without parsing the response body.
   * Used for binary assets (images, attachments) where the caller needs the raw Response.
   * `path` must start with `/` and be relative to the SF org root (e.g. `/servlet/rtaImage?...`).
   */
  async fetchRaw(path: string): Promise<Response> {
    const proxyFetch = this.connectors.createProxyFetch("salesforce");
    const proxyUrl   = this.connectors.getProxyUrl();
    return proxyFetch(`${proxyUrl}${path}`, { method: "GET" });
  }

  /** Return the base URL of the connected SF org (e.g. `https://myorg.salesforce.com`). */
  async getOrgBaseUrl(): Promise<string> {
    const info = await this.request<{ urls: { sobjects: string } }>(
      "GET",
      "/services/oauth2/userinfo"
    );
    // sobjects URL looks like: https://myorg.salesforce.com/services/data/vXX.0/sobjects/
    return info.urls.sobjects.replace(/\/services\/.*$/, "");
  }
}
