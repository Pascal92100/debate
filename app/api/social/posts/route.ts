import { NextResponse } from "next/server";
import { createDebate } from "@/lib/debates";
import { createSocialPost, linkSocialPostToDebate, listSocialPosts } from "@/lib/social";
import { validMediaAttachments } from "@/lib/media";

export const runtime = "nodejs";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  return NextResponse.json({ posts: await listSocialPosts(searchParams.get("circleId")) });
}

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  if (!body || typeof body.body !== "string") return NextResponse.json({ error: "Invalid post content." }, { status: 400 });
  const allowedFormats = ["text", "image", "video", "reel", "event", "alert"];
  if (body.formats !== undefined && (!Array.isArray(body.formats) || body.formats.some((format: unknown) => typeof format !== "string" || !allowedFormats.includes(format)))) return NextResponse.json({ error: "Invalid publication format." }, { status: 400 });
  if (body.media !== undefined && !validMediaAttachments(body.media)) return NextResponse.json({ error: "Invalid media attachments." }, { status: 400 });
  const formats: string[] = body.formats ?? ["text"];
  const media = body.media ?? [];
  const event = body.event && typeof body.event === "object" ? body.event : null;
  const isEvent = formats.includes("event");
  const isAlert = formats.includes("alert");
  if (body.startDebate && body.body.trim().length < 8) return NextResponse.json({ error: "Opening arguments must contain at least eight characters." }, { status: 400 });
  if (!body.startDebate && !isEvent && !isAlert && body.body.trim().length < 1 && media.length === 0) return NextResponse.json({ error: "Add text or media before posting." }, { status: 400 });
  if (body.startDebate && (typeof body.title !== "string" || body.title.trim().length < 4)) {
    return NextResponse.json({ error: "Debate titles must contain at least four characters." }, { status: 400 });
  }
  if (isEvent && (!event || typeof event.title !== "string" || event.title.trim().length < 2 || typeof event.startsAt !== "string" || !Number.isFinite(Date.parse(event.startsAt)) || typeof event.location !== "string" || event.location.trim().length < 1)) return NextResponse.json({ error: "An event title, valid date, and location are required." }, { status: 400 });
  if (isAlert && (!body.body.trim() && media.length === 0 || !["feed", "story"].includes(body.target) || !["permanent", "1h", "1d", "1w"].includes(body.duration))) return NextResponse.json({ error: "An alert needs a message or media, a target, and a valid duration." }, { status: 400 });
  if (formats.includes("image") && !media.some((item: { contentType: string }) => item.contentType.startsWith("image/")) || (formats.includes("video") || formats.includes("reel")) && !media.some((item: { contentType: string }) => item.contentType.startsWith("video/"))) return NextResponse.json({ error: "Attach media matching the selected format." }, { status: 400 });
  const kind = body.startDebate ? "debate" : isEvent ? "event" : isAlert ? "alert" : "publication";
  const metadata = {
    ...(event ? { startsAt: event.startsAt || undefined, location: event.location } : {}),
    ...(typeof body.duration === "string" ? { duration: body.duration } : {}),
    ...(typeof body.target === "string" ? { target: body.target } : {})
  };

  const post = await createSocialPost({
    title: typeof body.title === "string" ? body.title : typeof event?.title === "string" ? event.title : body.formats?.includes("alert") ? "Alert" : "Post",
    body: body.body,
    circleId: typeof body.circleId === "string" ? body.circleId : null,
    profileId: typeof body.profileId === "string" ? body.profileId : undefined,
    kind,
    visibility: body.circleId ? "circle" : "public",
    media,
    formats,
    metadata
  });

  if (!body.startDebate) return NextResponse.json({ post }, { status: 201 });

  const debate = await createDebate({
    title: body.title.trim(),
    content: [body.body],
    from: post.author,
    authorProfileId: post.profileId,
    circleId: post.circleId,
    sourcePostId: post.id,
    theme: typeof body.theme === "string" ? body.theme : "lifestyle-ideas",
    start: "question",
    confidence: 50,
    media: body.media ?? []
  });
  await linkSocialPostToDebate(post.id, debate.id);
  return NextResponse.json({ post: { ...post, kind: "debate", debateId: debate.id }, debate }, { status: 201 });
}
