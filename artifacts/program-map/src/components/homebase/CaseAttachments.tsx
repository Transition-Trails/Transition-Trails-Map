/**
 * CaseAttachments
 *
 * Drag-and-drop / click-to-browse attachment zone for the case submission form.
 * Accepts any file type. Images show a thumbnail; other files show a file-type badge.
 *
 * Props:
 *   files       — controlled list of File objects
 *   onChange    — called with the new list whenever files are added or removed
 *   maxBytes    — per-file size cap (default 25 MB — SF ContentVersion limit)
 *   maxFiles    — total file cap (default 10)
 */

import { useRef, useState, useEffect } from "react";
import {
  Paperclip, X, Image as ImageIcon,
  FileText, File, UploadCloud,
} from "lucide-react";

// ── Constants ──────────────────────────────────────────────────────────────────

const DEFAULT_MAX_BYTES = 25 * 1024 * 1024; // 25 MB
const DEFAULT_MAX_FILES = 10;

// ── Helpers ────────────────────────────────────────────────────────────────────

function formatBytes(n: number): string {
  if (n < 1024)          return `${n} B`;
  if (n < 1024 * 1024)   return `${(n / 1024).toFixed(1)} KB`;
  return `${(n / (1024 * 1024)).toFixed(1)} MB`;
}

function fileIcon(type: string) {
  if (type.startsWith("image/")) return <ImageIcon className="w-3.5 h-3.5" />;
  if (type === "application/pdf") return <FileText className="w-3.5 h-3.5" />;
  return <File className="w-3.5 h-3.5" />;
}

// ── FilePreview ────────────────────────────────────────────────────────────────

function FilePreview({ file, onRemove }: { file: File; onRemove: () => void }) {
  const [thumb, setThumb] = useState<string | null>(null);

  useEffect(() => {
    if (!file.type.startsWith("image/")) return;
    const url = URL.createObjectURL(file);
    setThumb(url);
    return () => URL.revokeObjectURL(url);
  }, [file]);

  return (
    <div className="flex items-center gap-2 group rounded-lg border border-border bg-white px-2.5 py-2">
      {/* Thumbnail or icon */}
      {thumb ? (
        <img src={thumb} alt={file.name}
          className="w-8 h-8 rounded object-cover border border-border shrink-0" />
      ) : (
        <div className="w-8 h-8 rounded bg-muted flex items-center justify-center text-muted-foreground shrink-0">
          {fileIcon(file.type)}
        </div>
      )}

      {/* Name + size */}
      <div className="flex-1 min-w-0">
        <p className="text-[12px] font-medium text-foreground truncate">{file.name}</p>
        <p className="text-[10px] text-muted-foreground">{formatBytes(file.size)}</p>
      </div>

      {/* Remove */}
      <button
        type="button"
        onClick={onRemove}
        title="Remove"
        className="opacity-0 group-hover:opacity-100 p-1 rounded text-muted-foreground hover:text-rose-600 hover:bg-rose-50 transition-all"
      >
        <X className="w-3.5 h-3.5" />
      </button>
    </div>
  );
}

// ── Main component ─────────────────────────────────────────────────────────────

interface CaseAttachmentsProps {
  files:     File[];
  onChange:  (files: File[]) => void;
  maxBytes?: number;
  maxFiles?: number;
}

export function CaseAttachments({
  files,
  onChange,
  maxBytes = DEFAULT_MAX_BYTES,
  maxFiles = DEFAULT_MAX_FILES,
}: CaseAttachmentsProps) {
  const inputRef  = useRef<HTMLInputElement>(null);
  const [dragOver, setDragOver] = useState(false);
  const [errors,   setErrors]   = useState<string[]>([]);

  function addFiles(incoming: File[]) {
    const errs: string[] = [];
    const valid: File[] = [];

    for (const f of incoming) {
      if (f.size > maxBytes) {
        errs.push(`${f.name} exceeds ${formatBytes(maxBytes)}`);
        continue;
      }
      if (files.length + valid.length >= maxFiles) {
        errs.push(`Maximum ${maxFiles} files allowed`);
        break;
      }
      // Avoid exact duplicates (same name + size)
      if (!files.some(x => x.name === f.name && x.size === f.size)) {
        valid.push(f);
      }
    }

    setErrors(errs);
    if (valid.length > 0) onChange([...files, ...valid]);
  }

  function remove(idx: number) {
    onChange(files.filter((_, i) => i !== idx));
    setErrors([]);
  }

  // ── Drop zone handlers ───────────────────────────────────────────────────────

  function onDragOver(e: React.DragEvent) {
    e.preventDefault();
    setDragOver(true);
  }
  function onDragLeave() { setDragOver(false); }
  function onDrop(e: React.DragEvent) {
    e.preventDefault();
    setDragOver(false);
    addFiles(Array.from(e.dataTransfer.files));
  }
  function onInputChange(e: React.ChangeEvent<HTMLInputElement>) {
    addFiles(Array.from(e.target.files ?? []));
    e.target.value = "";
  }

  const atLimit = files.length >= maxFiles;

  return (
    <div className="space-y-2">
      <label className="text-[13px] font-medium text-foreground flex items-center gap-1.5">
        <Paperclip className="w-3.5 h-3.5 text-muted-foreground" />
        Attachments
        {files.length > 0 && (
          <span className="text-[11px] font-normal text-muted-foreground">
            ({files.length}/{maxFiles})
          </span>
        )}
      </label>

      {/* Drop zone */}
      {!atLimit && (
        <div
          onDragOver={onDragOver}
          onDragLeave={onDragLeave}
          onDrop={onDrop}
          onClick={() => inputRef.current?.click()}
          className={`relative cursor-pointer rounded-lg border-2 border-dashed px-4 py-5 flex flex-col items-center gap-1.5 transition-colors select-none ${
            dragOver
              ? "border-primary bg-primary/5"
              : "border-border hover:border-primary/50 hover:bg-muted/30"
          }`}
        >
          <UploadCloud className={`w-6 h-6 ${dragOver ? "text-primary" : "text-muted-foreground"}`} />
          <p className="text-[12px] text-muted-foreground text-center">
            <span className="font-medium text-foreground">Click to browse</span>
            {" "}or drag files here
          </p>
          <p className="text-[10px] text-muted-foreground">
            Any file type · max {formatBytes(maxBytes)} each
          </p>
          <input
            ref={inputRef}
            type="file"
            multiple
            className="sr-only"
            onChange={onInputChange}
          />
        </div>
      )}

      {/* Errors */}
      {errors.map((e, i) => (
        <p key={i} className="text-[11px] text-rose-600">{e}</p>
      ))}

      {/* File list */}
      {files.length > 0 && (
        <div className="space-y-1.5">
          {files.map((f, i) => (
            <FilePreview key={`${f.name}-${f.size}`} file={f} onRemove={() => remove(i)} />
          ))}
        </div>
      )}
    </div>
  );
}

// ── Utility: File → base64 string (no data-URL prefix) ────────────────────────

export function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      // Strip "data:<mime>;base64," prefix
      resolve(result.includes(",") ? result.split(",")[1]! : result);
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}
