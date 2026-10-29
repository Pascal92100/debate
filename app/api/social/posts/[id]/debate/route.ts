import { NextResponse } from "next/server";
import { createDebate } from "@/lib/debates";
import { getSocialPost, linkSocialPostToDebate } from "@/lib/social";

export const runtime = "nodejs";

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const post = await getSocialPost(id);
  if (!post) return NextResponse.json({ error: "Publication introuvable." }, { status: 404 });
  if (post.debateId) return NextResponse.json({ debateId: post.debateId });
  const body = await request.json().catch(() => ({}));
  const debate = await createDebate({
    title: typeof body.title === "string" && body.title.trim() ? body.title.trim() : post.title,
    content: [post.body],
    from: post.author,
    authorProfileId: post.profileId,
    circleId: post.circleId,
    sourcePostId: post.id,
    theme: typeof body.theme === "string" ? body.theme : "lifestyle-ideas",
    start: "question",
    confidence: 50
  });
  await linkSocialPostToDebate(post.id, debate.id);
  return NextResponse.json({ debateId: debate.id, debate }, { status: 201 });
}
