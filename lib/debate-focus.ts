import type { Comment } from "./debates";

export function getDebateFocus(comments: Comment[], focusId: string | null) {
  const parents = new Map<string, string>();
  const visit = (nodes: Comment[]) => nodes.forEach((node) => {
    parents.set(node.id, node.replyTo);
    for (const paragraph of node.paragraphs ?? []) parents.set(paragraph.id, node.id);
    visit(node.children ?? []);
  });
  visit(comments);
  const ancestors = new Set<string>();
  let current = focusId;
  while (current && !ancestors.has(current)) {
    ancestors.add(current);
    current = parents.get(current) ?? null;
  }
  return {
    ancestors,
    commentVisible: (node: Comment) => !focusId || ancestors.has(node.id) || node.replyTo === focusId,
    paragraphVisible: (id: string, parentId: string, parentReplyTo?: string) => !focusId || ancestors.has(id) || parentId === focusId || parentReplyTo === focusId
  };
}