/**
 * uploadAttachments
 *
 * Uploads files sequentially to a Salesforce Case via the
 * POST /api/sf/cases/:caseId/attachments endpoint.
 *
 * The endpoint ALWAYS returns HTTP 200 — even when Salesforce rejects a file —
 * and embeds the per-file outcome in the JSON body:
 *   { uploaded: number; failed: number; results: { name, success, error? }[] }
 *
 * Callers MUST parse the JSON body to determine success, not rely on r.ok.
 * Using r.ok alone causes a false-success: the progress bar shows green even
 * when Salesforce returned a 4xx and the ContentVersion was never created.
 */

import { fileToBase64 } from "./fileUtils";

export interface AttachmentProgress {
  total:    number;
  uploaded: number;
  failed:   number;
  done:     boolean;
}

interface AttachEndpointResult {
  uploaded: number;
  failed:   number;
  results:  { name: string; success: boolean; error?: string }[];
}

/**
 * Uploads each file sequentially to the given SF Case, calling onProgress
 * after every file so the caller can update UI state.
 *
 * @param sfCaseId  Salesforce Case ID (15 or 18 chars)
 * @param files     Array of File objects to upload
 * @param onProgress Called after each file with cumulative progress
 * @param fetchFn   Optional fetch override for testing (defaults to global fetch)
 */
export async function uploadAttachments(
  sfCaseId: string,
  files: File[],
  onProgress: (p: AttachmentProgress) => void,
  fetchFn: typeof fetch = fetch,
): Promise<void> {
  if (files.length === 0) return;

  const progress: AttachmentProgress = {
    total:    files.length,
    uploaded: 0,
    failed:   0,
    done:     false,
  };
  onProgress({ ...progress });

  for (const file of files) {
    try {
      const base64 = await fileToBase64(file);
      const r = await fetchFn(`/api/sf/cases/${sfCaseId}/attachments`, {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({
          files: [{ name: file.name, base64, mimeType: file.type || "application/octet-stream" }],
        }),
      });

      if (!r.ok) {
        // Genuine HTTP error (network-layer failure, 5xx, etc.)
        progress.failed++;
      } else {
        // The endpoint always returns 200 — parse the body to find the real outcome.
        // results[0].success is the definitive per-file verdict from Salesforce.
        const body = await r.json() as AttachEndpointResult;
        const fileResult = body.results?.[0];
        if (fileResult?.success === true) {
          progress.uploaded++;
        } else {
          progress.failed++;
        }
      }
    } catch {
      // Network / fetch / JSON parse error — count as failed
      progress.failed++;
    }

    onProgress({ ...progress });
  }

  progress.done = true;
  onProgress({ ...progress });
}
