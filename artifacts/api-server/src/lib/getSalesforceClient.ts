import type { Request } from "express";
import { SalesforceClient } from "./salesforceClient.js";

/**
 * Factory — builds a SalesforceClient from the caller's Express session.
 * This is the only file that bridges Express Request ↔ SalesforceClient.
 * Route handlers call this once at the top of their handler; everything else
 * goes through salesforceService.ts functions with the returned client.
 */
export function getSalesforceClient(req: Request): SalesforceClient {
  const { sfAccessToken, sfRefreshToken, sfInstanceUrl } = req.session;

  if (!sfAccessToken || !sfRefreshToken || !sfInstanceUrl) {
    throw new Error(
      "Not authenticated with Salesforce. " +
      "Visit /api/auth/salesforce/login to connect your account."
    );
  }

  const onTokenRefresh = async (
    newAccessToken: string,
    newIssuedAt: string
  ): Promise<void> => {
    req.session.sfAccessToken = newAccessToken;
    req.session.sfIssuedAt    = newIssuedAt;

    await new Promise<void>((resolve, reject) => {
      req.session.save((err: unknown) => {
        if (err) reject(err instanceof Error ? err : new Error(String(err)));
        else resolve();
      });
    });
  };

  return new SalesforceClient(
    sfAccessToken,
    sfRefreshToken,
    sfInstanceUrl,
    onTokenRefresh
  );
}
