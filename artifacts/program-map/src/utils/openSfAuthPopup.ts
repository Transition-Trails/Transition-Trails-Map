/**
 * openSfAuthPopup
 *
 * Opens the Salesforce OAuth flow in a centered popup window.
 * After the user authenticates, the /api/auth/salesforce/connected page
 * reloads this window and closes the popup automatically.
 *
 * Usage:
 *   import { openSfAuthPopup } from "@/utils/openSfAuthPopup";
 *   <button onClick={openSfAuthPopup}>Reconnect Salesforce</button>
 */
export function openSfAuthPopup(): void {
  const width  = 620;
  const height = 720;
  const left   = Math.round(window.screenX + (window.outerWidth  - width)  / 2);
  const top    = Math.round(window.screenY + (window.outerHeight - height) / 2);

  window.open(
    "/api/auth/salesforce/login",
    "sf_auth_popup",
    `popup,width=${width},height=${height},left=${left},top=${top},resizable=yes,scrollbars=yes`,
  );
}
