import { NextResponse } from "next/server";
import { createDebate } from "@/lib/debates";
import { createSocialPost, linkSocialPostToDebate, listSocialPosts } from "@/lib/social";

export const runtime = "nodejs";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  return NextResponse.json({ posts: await listSocialPosts(searchParams.get("circleId")) });
}

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  if (!body || typeof body.body !== "string" || body.body.trim().length < 2) {
    return NextResponse.json({ error: "Écris un message avant de publier." }, { status: 400 });
  }
  if (body.startDebate && (typeof body.title !== "string" || body.title.trim().length < 4)) {
    return NextResponse.json({ error: "Un titre de débat d’au moins quatre caractères est nécessaire." }, { status: 400 });
  }

  const post = await createSocialPost({
    title: typeof body.title === "string" ? body.title : "Publication",
    body: body.body,
    circleId: typeof body.circleId === "string" ? body.circleId : null,
    profileId: typeof body.profileId === "string" ? body.profileId : undefined,
    kind: body.startDebate ? "debate" : "publication",
    visibility: body.circleId ? "circle" : "public"
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
    confidence: 50
  });
  await linkSocialPostToDebate(post.id, debate.id);
  return NextResponse.json({ post: { ...post, kind: "debate", debateId: debate.id }, debate }, { status: 201 });
}
