import type { Comment } from "./debates";

export type DebateFilter = "my-posts" | "my-branches" | "unanswered" | null;
export type DebateReportState = Record<string, { counts: Record<string, number>; selected: string[] }>;
export type DebateEvaluationState = Record<string, { counts: Record<string, number>; viewerEvaluation: string | null }>;

export function filterDebateComments(comments: Comment[], profileId: string | undefined, safe: boolean, mode: DebateFilter, reports: DebateReportState, evaluations: DebateEvaluationState): Comment[] {
  const unsafeReasons = new Set(["🚫 Prohibited", "🔞 Sexual", "⚠️ Disturbing", "❌ Aggressive"]);
  const ids = (comment: Comment) => [comment.id, ...(comment.paragraphs ?? []).map((paragraph) => paragraph.id)];
  const unsafe = (comment: Comment) => ids(comment).some((id) => Object.entries(reports[id]?.counts ?? {}).some(([reason, count]) => unsafeReasons.has(reason) && count > 0));
  const interacted = (comment: Comment) => ids(comment).some((id) => Boolean(evaluations[id]?.viewerEvaluation || reports[id]?.selected.length));
  const applySafety = (nodes: Comment[]): Comment[] => nodes.flatMap((node) => safe && unsafe(node) ? [] : [{ ...node, children: applySafety(node.children ?? []) }]);
  const safeComments = applySafety(comments);
  if (!mode) return safeComments;

  const filter = (nodes: Comment[], inOwnBranch: boolean): Comment[] => nodes.flatMap((node) => {
    const own = Boolean(profileId && node.authorProfileId === profileId);
    const keepBranch = mode === "my-branches" && (inOwnBranch || own);
    const children = filter(node.children ?? [], keepBranch);
    const unanswered = mode === "unanswered" && !own && (node.children ?? []).length === 0 && !interacted(node);
    if (!own && !keepBranch && !unanswered && children.length === 0) return [];
    if (mode === "unanswered" && own && children.length === 0) return [];
    return [{ ...node, children }];
  });
  return filter(safeComments, false);
}