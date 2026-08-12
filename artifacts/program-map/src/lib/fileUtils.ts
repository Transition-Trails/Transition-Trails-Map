/**
 * File utility helpers shared across the homebase case submission flow.
 */

/**
 * Converts a File object to a base64-encoded string (no data-URL prefix).
 * Strips the "data:<mime>;base64," prefix so the result is pure base64.
 */
export function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      resolve(result.includes(",") ? result.split(",")[1]! : result);
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}
