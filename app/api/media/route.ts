import { put } from "@vercel/blob";
import { NextResponse } from "next/server";
import { listProfiles } from "@/lib/social";

export const runtime = "nodejs";
export const maxDuration = 30;

const MAX_FILE_SIZE = 20 * 1024 * 1024;

export async function POST(request: Request) {
  const form = await request.formData().catch(() => null);
  const file = form?.get("file");
  const profileId = form?.get("profileId");
  if (!(file instanceof File) || typeof profileId !== "string") return NextResponse.json({ error: "Choose a media file and author profile." }, { status: 400 });
  const profile = (await listProfiles()).find((item) => item.id === profileId);
  if (!profile) return NextResponse.json({ error: "Author profile not found or not owned by this account." }, { status: 403 });
  if (!(file.type.startsWith("image/") || file.type.startsWith("video/"))) return NextResponse.json({ error: "Only image and video files are supported." }, { status: 415 });
  if (file.size < 1 || file.size > MAX_FILE_SIZE) return NextResponse.json({ error: "Media files must be smaller than 20 MB." }, { status: 413 });
  if (!process.env.BLOB_READ_WRITE_TOKEN) return NextResponse.json({ error: "Media upload is not configured. Add BLOB_READ_WRITE_TOKEN in Vercel to enable image and video uploads." }, { status: 503 });

  try {
    const blob = await put(`circles/${encodeURIComponent(profileId)}/${file.name}`, file, {
      access: "public",
      addRandomSuffix: true,
      contentType: file.type
    });
    return NextResponse.json({ media: { url: blob.url, pathname: blob.pathname, contentType: file.type, name: file.name } }, { status: 201 });
  } catch {
    return NextResponse.json({ error: "The media upload failed. Please try again." }, { status: 502 });
  }
}