import { put } from "@vercel/blob";
import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { resolveOrganizationId } from "@/lib/auth/organization";

const ALLOWED_TYPES = new Set([
  "image/png",
  "image/jpeg",
  "image/webp",
  "image/gif",
]);

const MAX_BYTES = 2 * 1024 * 1024;

function extForMime(mime: string): string {
  switch (mime) {
    case "image/png":
      return "png";
    case "image/jpeg":
      return "jpg";
    case "image/webp":
      return "webp";
    case "image/gif":
      return "gif";
    default:
      return "bin";
  }
}

export async function POST(req: Request) {
  const { userId, orgId, orgSlug } = await auth();
  if (!userId) {
    return NextResponse.json({ error: "Sign in required" }, { status: 401 });
  }
  if (!orgId) {
    return NextResponse.json({ error: "Select an organization to continue" }, { status: 401 });
  }

  if (!process.env.BLOB_READ_WRITE_TOKEN) {
    return NextResponse.json(
      {
        error:
          "Logo upload is not configured. Add BLOB_READ_WRITE_TOKEN (Vercel Blob) to your environment.",
      },
      { status: 503 },
    );
  }

  const organizationId = await resolveOrganizationId(orgId, orgSlug ?? null);

  let formData: FormData;
  try {
    formData = await req.formData();
  } catch {
    return NextResponse.json({ error: "Invalid form data" }, { status: 400 });
  }

  const file = formData.get("file");
  if (!(file instanceof File)) {
    return NextResponse.json({ error: "Missing file" }, { status: 400 });
  }

  if (file.size === 0) {
    return NextResponse.json({ error: "Empty file" }, { status: 400 });
  }

  if (file.size > MAX_BYTES) {
    return NextResponse.json({ error: "Logo must be 2MB or smaller" }, { status: 400 });
  }

  const type = file.type;
  if (!ALLOWED_TYPES.has(type)) {
    return NextResponse.json(
      { error: "Use PNG, JPEG, WebP, or GIF (SVG is not supported for uploads)." },
      { status: 400 },
    );
  }

  const ext = extForMime(type);
  const pathname = `org-branding/${organizationId}/logo-${Date.now()}.${ext}`;

  try {
    const blob = await put(pathname, file, {
      access: "public",
      token: process.env.BLOB_READ_WRITE_TOKEN,
    });
    return NextResponse.json({ url: blob.url });
  } catch (e) {
    console.error("[org-logo upload]", e);
    return NextResponse.json({ error: "Upload failed. Try again or paste a logo URL instead." }, { status: 500 });
  }
}
