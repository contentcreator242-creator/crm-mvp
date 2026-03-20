"use client";

import { useState } from "react";

type Props = {
  initialUrl: string;
};

export function BrandingLogoField({ initialUrl }: Props) {
  const [logoUrl, setLogoUrl] = useState(initialUrl);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);

  async function onFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadError(null);
    setUploading(true);
    try {
      const fd = new FormData();
      fd.append("file", file);
      const res = await fetch("/api/org-logo/upload", { method: "POST", body: fd });
      const data = (await res.json()) as { url?: string; error?: string };
      if (!res.ok) {
        throw new Error(data.error ?? "Upload failed");
      }
      if (data.url) setLogoUrl(data.url);
    } catch (err) {
      setUploadError(err instanceof Error ? err.message : "Upload failed");
    } finally {
      setUploading(false);
      e.target.value = "";
    }
  }

  function clearLogo() {
    setLogoUrl("");
    setUploadError(null);
  }

  return (
    <div>
      <label htmlFor="brandingLogoFile" className="crm-field-label">
        Logo
      </label>

      {logoUrl ? (
        <div className="mt-2 flex flex-wrap items-center gap-3 rounded-lg border border-slate-200 bg-slate-50 p-3">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={logoUrl} alt="Logo preview" className="max-h-16 max-w-[200px] object-contain" />
          <button type="button" onClick={clearLogo} className="btn-secondary text-xs">
            Remove
          </button>
        </div>
      ) : null}

      <div className="mt-2 flex flex-wrap items-center gap-2">
        <input
          id="brandingLogoFile"
          type="file"
          accept="image/png,image/jpeg,image/webp,image/gif"
          onChange={onFileChange}
          disabled={uploading}
          className="text-sm file:mr-2 file:rounded-md file:border-0 file:bg-slate-200 file:px-3 file:py-1.5 file:text-sm file:font-medium file:text-slate-800 hover:file:bg-slate-300"
        />
        {uploading ? <span className="text-sm text-slate-500">Uploading…</span> : null}
      </div>

      {uploadError ? (
        <p className="mt-2 text-xs text-red-700" role="alert">
          {uploadError}
        </p>
      ) : null}

      <label htmlFor="brandingLogoUrl" className="crm-field-label mt-4 block">
        Logo URL
      </label>
      <input
        id="brandingLogoUrl"
        name="brandingLogoUrl"
        type="url"
        value={logoUrl}
        onChange={(e) => {
          setLogoUrl(e.target.value);
          setUploadError(null);
        }}
        maxLength={2000}
        className="adm-input mt-1"
        placeholder="https://example.com/logo.png"
      />
      <p className="mt-1 text-xs text-slate-500">
        Upload an image above, or paste a public HTTPS URL (PNG/SVG/WebP). Shown on the embed form and in email
        headers.
      </p>
    </div>
  );
}
