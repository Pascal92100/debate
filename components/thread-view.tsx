"use client";

import { createContext, useContext, useRef, useState } from "react";
import type { Comment, Debate } from "@/lib/debates";
import { filterDebateComments, type DebateFilter, type DebateReportState } from "@/lib/debate-filters";
import { CommentForm } from "@/components/comment-form";
import { DebateControls } from "@/components/debate-controls";
import { DeleteEntityButton } from "@/components/delete-entity-button";
import { MediaGallery } from "@/components/media-gallery";

const reportReasons = [
  { icon: "🚫", label: "Prohibited" },
  { icon: "💨", label: "Off topic" },
  { icon: "🤣", label: "Humor" },
  { icon: "🔀", label: "Derailment" },
  { icon: "🔄🤯", label: "Faulty reasoning" },
  { icon: "❓", label: "Unverifiable" },
  { icon: "☢️", label: "Manipulation" },
  { icon: "🔞", label: "Sexual" },
  { icon: "⚠️", label: "Disturbing" },
  { icon: "❌", label: "Aggressive" }
];

const argumentEvaluations = [["👍🏻", "Agree"], ["👎🏻", "Disagree"], ["🔑", "Useful"], ["💡", "Inspiring"], ["🎓", "Interesting"], ["☀️", "Feel-good"]] as const;
const argumentStatuses = [["🛑", "Stop"], ["🆕", "New topic"], ["✏️", "Rewrite"], ["⏳", "On hold"], ["☑️", "End agreed"], ["🚧", "End disagreement"]] as const;
const unsafeReportReasons = new Set(["🚫 Prohibited", "🔞 Sexual", "⚠️ Disturbing", "❌ Aggressive"]);
type EvaluationState = Record<string, { counts: Record<string, number>; viewerEvaluation: string | null }>;
type StatusState = Record<string, { counts: Record<string, number>; selected: string[]; locked: boolean; editable: boolean; forkDebateId?: string }>;
const ReportContext = createContext<{ reports: DebateReportState; toggle: (messageId: string, reason: string) => void; statuses: StatusState; toggleStatus: (argumentId: string, status: string) => Promise<StatusState[string] | null>; evaluations: EvaluationState; toggleEvaluation: (argumentId: string, value: string) => void; filtering: boolean; profileId?: string }>({ reports: {}, toggle: () => {}, statuses: {}, toggleStatus: async () => null, evaluations: {}, toggleEvaluation: () => {}, filtering: false });

function ArgumentMenus({ id, text, locked = false, onReply, onEdit, onFork }: { id: string; text: string; locked?: boolean; onReply?: () => void; onEdit?: () => void; onFork?: (debateId: string) => void }) {
  const { reports, toggle, statuses, toggleStatus, evaluations, toggleEvaluation } = useContext(ReportContext);
  const [activeMenu, setActiveMenu] = useState<"reactions" | "status" | "actions" | null>(null);
  const [showReports, setShowReports] = useState(false);
  const status = statuses[id];
  const toggleMenu = (menu: "reactions" | "status" | "actions") => {
    setActiveMenu((current) => current === menu ? null : menu);
    if (menu !== "actions") setShowReports(false);
  };
  return <div className="argument-menus">
    <button type="button" className="argument-menu-trigger" aria-label="Positive reactions" aria-expanded={activeMenu === "reactions"} onClick={() => toggleMenu("reactions")}>🙂</button>
    <button type="button" className="argument-menu-trigger" aria-label="Argument status" aria-expanded={activeMenu === "status"} onClick={() => toggleMenu("status")}>🤔</button>
    <button type="button" className="argument-menu-trigger" aria-label="Argument actions" aria-expanded={activeMenu === "actions"} onClick={() => toggleMenu("actions")}>🔧</button>
    {activeMenu === "reactions" && <div className="argument-popover-panel" role="group" aria-label="Reactions"><strong>Reactions</strong>{argumentEvaluations.map(([icon, label]) => <button type="button" key={icon} disabled={locked} aria-pressed={evaluations[id]?.viewerEvaluation === icon} onClick={() => toggleEvaluation(id, icon)}><span>{icon}</span><span>{label}</span><small>{evaluations[id]?.counts[icon] ?? 0}</small></button>)}</div>}
    {activeMenu === "status" && <div className="argument-popover-panel" role="group" aria-label="Status"><strong>Status</strong>{argumentStatuses.map(([icon, label]) => <button type="button" key={icon} aria-pressed={status?.selected.includes(icon) ?? false} disabled={locked || (icon === "✏️" && !status?.editable)} onClick={async () => { if (icon === "✏️") { if (!status?.selected.includes(icon)) await toggleStatus(id, icon); onEdit?.(); return; } const updated = await toggleStatus(id, icon); if (icon === "🆕" && updated?.forkDebateId) onFork?.(updated.forkDebateId); }}><span>{icon}</span><span>{label}</span><small>{status?.counts[icon] ?? 0}</small></button>)}</div>}
    {activeMenu === "actions" && <div className="argument-popover-panel argument-actions-panel" role="group" aria-label="Actions"><button type="button" disabled={locked} onClick={onReply}>↩️<span>Reply</span></button><button type="button" disabled={locked} onClick={async () => { try { if (navigator.share) await navigator.share({ title: "Debate argument", text }); else await navigator.clipboard.writeText(`${text}\n${window.location.href}#${id}`); } catch {} }}>🔁<span>Share</span></button><button type="button" disabled={locked} aria-expanded={showReports} onClick={() => setShowReports((open) => !open)}>🚩<span>Report</span></button>{showReports && <div className="argument-report-list">{reportReasons.map(({ icon, label }) => { const reason = `${icon} ${label}`; return <button type="button" key={reason} disabled={locked} aria-pressed={reports[id]?.selected.includes(reason) ?? false} onClick={() => toggle(id, reason)}>{icon}<span>{label}</span><small>{reports[id]?.counts[reason] ?? 0}</small></button>; })}</div>}</div>}
  </div>;
}

function InlineArgumentBadges({ id }: { id: string }) {
  const { reports, statuses } = useContext(ReportContext);
  const riskBadges = reportReasons.filter(({ icon, label }) => unsafeReportReasons.has(`${icon} ${label}`)).flatMap(({ icon, label }) => {
    const count = reports[id]?.counts[`${icon} ${label}`] ?? 0;
    return count > 0 ? [{ icon, count, label }] : [];
  });
  const stateBadges = argumentStatuses.flatMap(([icon, label]) => {
    const count = statuses[id]?.counts[icon] ?? 0;
    return count > 0 ? [{ icon, count, label }] : [];
  });
  return <span className="argument-inline-badges">{[...riskBadges, ...stateBadges].map(({ icon, count, label }) => <span className="argument-risk-badge" key={`${id}-${icon}`} title={`${label}: ${count}`}>{icon}<small>{count}</small></span>)}</span>;
}

function EditReplyForm({ debateId, node, profileId, onSaved }: { debateId: string; node: Comment; profileId: string; onSaved: () => void }) {
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    setSaving(true);
    const response = await fetch(`/api/debates/${encodeURIComponent(debateId)}/comments/${encodeURIComponent(node.id)}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ title: data.get("title"), text: data.get("text"), profileId }) }).catch(() => null);
    const result = await response?.json().catch(() => null);
    if (!response?.ok) { setError(result?.error || "The reply could not be updated."); setSaving(false); return; }
    onSaved();
  }
  return <form className="comment-form" onSubmit={submit}><label className="reply-title-field">Reply title<input name="title" defaultValue={node.title} required minLength={2} maxLength={140} /></label><textarea name="text" defaultValue={node.paragraphs.map((paragraph) => paragraph.text).join("\n")} aria-label="Reply text" /><div className="comment-actions"><button className="button-primary" disabled={saving}>{saving ? "Saving…" : "Save"}</button>{error && <span className="form-error" role="alert">{error}</span>}</div></form>;
}

function ArgumentLine({ debateId, id, text, replies, ownedProfileIds, authorProfileId, evaluationState, onEvaluate, depth = 0, compact = false, evaluation, forceLocked = false }: { debateId: string; id: string; text: string; replies: Comment[]; ownedProfileIds: string[]; authorProfileId: string; evaluationState: EvaluationState; onEvaluate: (argumentId: string, value: string) => void; depth?: number; compact?: boolean; evaluation?: string; forceLocked?: boolean }) {
  const { reports, statuses, filtering } = useContext(ReportContext);
  const [contextOpen, setContextOpen] = useState(false);
  const [repliesOpen, setRepliesOpen] = useState(filtering);
  const [feedback, setFeedback] = useState("");
  const pressTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const longPressTriggered = useRef(false);

  const locked = forceLocked || (statuses[id]?.locked ?? false);

  async function shareArgument() {
    try {
      if (navigator.share) await navigator.share({ title: "Debate argument", text });
      else await navigator.clipboard.writeText(`${text}\n${window.location.href}#${id}`);
      setFeedback("Argument ready to share.");
    } catch (error) {
      if (error instanceof Error && error.name === "AbortError") return;
      setFeedback("Sharing is unavailable in this browser.");
    }
  }

  function startLongPress(event: React.PointerEvent) {
    if (event.pointerType !== "touch") return;
    longPressTriggered.current = false;
    pressTimer.current = setTimeout(() => {
      longPressTriggered.current = true;
      setContextOpen(true);
    }, 500);
  }

  function clearLongPress() {
    if (pressTimer.current) clearTimeout(pressTimer.current);
    pressTimer.current = null;
  }

  return <div className="argument-wrap">
    {contextOpen && <button className="report-dismiss" type="button" aria-label="Close menu" onClick={() => setContextOpen(false)} />}
    <div className="argument-line" data-argument-id={id} onContextMenu={(event) => { event.preventDefault(); setContextOpen(true); }} onPointerDown={startLongPress} onPointerUp={clearLongPress} onPointerCancel={clearLongPress}>
      <span className="argument-reply-count" title={`${replies.length} ${replies.length === 1 ? "reply" : "replies"}`} aria-label={`${replies.length} ${replies.length === 1 ? "reply" : "replies"}`}>↳ {replies.length}</span>
      {statuses[id]?.selected.includes("🆕") && statuses[id]?.forkDebateId ? <a className={`argument-text${compact ? " argument-text-compact" : ""}`} href={`/debates/${encodeURIComponent(statuses[id].forkDebateId!)}?profileId=${encodeURIComponent(authorProfileId)}`}>{text}</a> : <button className={`argument-text${compact ? " argument-text-compact" : ""}`} type="button" aria-expanded={replies.length > 0 ? repliesOpen : undefined} onClick={() => { if (longPressTriggered.current) { longPressTriggered.current = false; return; } if (replies.length > 0 && !locked) setRepliesOpen(!repliesOpen); }} title={replies.length > 0 ? "Show or hide replies to this argument" : "No replies to this argument"}>{text}</button>}
      {evaluation && <span className="evaluation-badge argument-evaluation-badge" title="Reply evaluation">{evaluation}</span>}
      <div className="argument-inline-badges" aria-label="Selected status and risk reports">{reportReasons.filter(({ icon, label }) => unsafeReportReasons.has(`${icon} ${label}`)).map(({ icon, label }) => {
        const reason = `${icon} ${label}`;
        const count = reports[id]?.counts[reason] ?? 0;
        return count > 0 ? <span className="argument-risk-badge" key={reason} title={`${label}: ${count}`}>{icon}<small>{count}</small></span> : null;
      })}{argumentStatuses.filter(([icon]) => (statuses[id]?.counts[icon] ?? 0) > 0).map(([icon, label]) => <span className="argument-status-badge" key={icon} title={`${label}: ${statuses[id].counts[icon]}`}>{icon}<small>{statuses[id].counts[icon]}</small></span>)}</div>
      {locked ? <InlineArgumentBadges id={id} /> : <ArgumentMenus id={id} text={text} locked={locked} onReply={() => document.getElementById(`reply-${id}`)?.click()} onFork={(forkId) => window.location.assign(`/debates/${encodeURIComponent(forkId)}?profileId=${encodeURIComponent(authorProfileId)}`)} />}
    </div>
    {contextOpen && <div className="argument-context-menu" role="menu">
      <button type="button" role="menuitem" disabled={locked} onClick={() => { setContextOpen(false); document.getElementById(`reply-${id}`)?.click(); }}>↩️ Reply</button>
      <button type="button" role="menuitem" onClick={() => navigator.clipboard.writeText(text).catch(() => undefined)}>Copy</button>
      <button type="button" role="menuitem" onClick={() => { setContextOpen(false); void shareArgument(); }}>Share</button>
    </div>}
    {!locked && <CommentForm key={id} debateId={debateId} replyTo={id} controlId={`reply-${id}`} profileId={authorProfileId} compactTrigger />}
    {feedback && <span className="action-feedback argument-feedback" role="status">{feedback}</span>}
    {repliesOpen && !locked && <div className="argument-replies">{replies.map((reply) => <CommentCard key={reply.id} debateId={debateId} node={reply} ownedProfileIds={ownedProfileIds} authorProfileId={authorProfileId} evaluationState={evaluationState} onEvaluate={onEvaluate} depth={depth + 1} />)}</div>}
  </div>;
}

function ArgumentLines({ debateId, parentId, paragraphs, children, ownedProfileIds, authorProfileId, evaluationState, onEvaluate, depth = 0, compact = false, rootAliases = [], titleEvaluation, forceLocked = false }: { debateId: string; parentId: string; paragraphs: Array<{ id: string; text: string }>; children: Comment[]; ownedProfileIds: string[]; authorProfileId: string; evaluationState: EvaluationState; onEvaluate: (argumentId: string, value: string) => void; depth?: number; compact?: boolean; rootAliases?: string[]; titleEvaluation?: string; forceLocked?: boolean }) {
  return <div className="argument-list">{paragraphs.map((paragraph, index) => <ArgumentLine key={paragraph.id} debateId={debateId} id={paragraph.id} text={paragraph.text} replies={children.filter((child) => child.replyTo === paragraph.id)} ownedProfileIds={ownedProfileIds} authorProfileId={authorProfileId} evaluationState={evaluationState} onEvaluate={onEvaluate} depth={depth} compact={compact} evaluation={index === 0 ? titleEvaluation : undefined} forceLocked={forceLocked} />)}
    {!forceLocked && children.filter((child) => child.replyTo === parentId || rootAliases.includes(child.replyTo)).map((reply) => <CommentCard key={reply.id} debateId={debateId} node={reply} ownedProfileIds={ownedProfileIds} authorProfileId={authorProfileId} evaluationState={evaluationState} onEvaluate={onEvaluate} depth={depth + 1} />)}
  </div>;
}

function CommentCard({ debateId, node, ownedProfileIds, authorProfileId, evaluationState, onEvaluate, depth = 0 }: { debateId: string; node: Comment; ownedProfileIds: string[]; authorProfileId: string; evaluationState: EvaluationState; onEvaluate: (argumentId: string, value: string) => void; depth?: number }) {
  const { filtering, statuses } = useContext(ReportContext);
  const [globalRepliesOpen, setGlobalRepliesOpen] = useState(filtering);
  const [editing, setEditing] = useState(false);
  const paragraphs = node.paragraphs ?? [];
  const text = paragraphs.map((paragraph) => paragraph.text).join(" ");
  const globalReplies = (node.children ?? []).filter((reply) => reply.replyTo === node.id);
  const paragraphReplies = (node.children ?? []).filter((reply) => reply.replyTo !== node.id);
  const locked = statuses[node.id]?.locked ?? false;
  const status = statuses[node.id];

  return <article className="thread-message" style={{ "--depth": Math.min(depth, 4) } as React.CSSProperties}>
    <header className="thread-message-header"><span><strong>{node.author}</strong></span><span className="thread-message-tools"><span className="message-confidence" title="Confidence">💪 {node.confidence}%</span>{!locked && node.authorProfileId && ownedProfileIds.includes(node.authorProfileId) && <DeleteEntityButton endpoint={`/api/debates/${encodeURIComponent(debateId)}/comments/${encodeURIComponent(node.id)}`} label="Delete my reply" confirmation="Delete this reply and all replies below it? This cannot be undone." iconOnly />}</span></header>
    {node.definitions?.length ? <details className="data-accordion"><summary>Definitions <span>{node.definitions.length}</span></summary><div>{node.definitions.map((item, index) => <p key={index}>{typeof item === "string" ? item : item.text}</p>)}</div></details> : null}
    {node.facts?.length ? <details className="data-accordion"><summary>Facts and references <span>{node.facts.length}</span></summary><div>{node.facts.map((item, index) => <p key={index}>{typeof item === "string" ? item : item.text}</p>)}</div></details> : null}
    <div className="thread-message-title-row">{status?.selected.includes("🆕") && status.forkDebateId ? <a className="thread-message-title thread-title-toggle" href={`/debates/${encodeURIComponent(status.forkDebateId)}?profileId=${encodeURIComponent(authorProfileId)}`}>{node.title}<span className="global-reply-count">↳ {globalReplies.length}</span></a> : <button className="thread-message-title thread-title-toggle" type="button" aria-expanded={globalRepliesOpen} disabled={globalReplies.length === 0 || locked} onClick={() => setGlobalRepliesOpen((open) => !open)}>{node.title}<span className="global-reply-count">↳ {globalReplies.length}</span></button>}{locked ? <InlineArgumentBadges id={node.id} /> : <><InlineArgumentBadges id={node.id} /><ArgumentMenus id={node.id} text={`${node.title}\n${text}`} locked={locked} onReply={() => document.getElementById(`reply-global-${node.id}`)?.click()} onEdit={() => setEditing(true)} onFork={(forkId) => window.location.assign(`/debates/${encodeURIComponent(forkId)}?profileId=${encodeURIComponent(authorProfileId)}`)} /></>}{node.evaluation && <span className="evaluation-badge" title="Reply evaluation">{node.evaluation}</span>}</div>
    {editing && <EditReplyForm debateId={debateId} node={node} profileId={authorProfileId} onSaved={() => window.location.reload()} />}
    {!editing && <ArgumentLines debateId={debateId} parentId={node.id} paragraphs={paragraphs} children={paragraphReplies} ownedProfileIds={ownedProfileIds} authorProfileId={authorProfileId} evaluationState={evaluationState} onEvaluate={onEvaluate} depth={depth} compact titleEvaluation={node.evaluation} forceLocked={locked} />}
    {!editing && paragraphs.length === 0 && <ArgumentLine debateId={debateId} id={node.id} text={text || node.title} replies={paragraphReplies} ownedProfileIds={ownedProfileIds} authorProfileId={authorProfileId} evaluationState={evaluationState} onEvaluate={onEvaluate} depth={depth} compact evaluation={node.evaluation} forceLocked={locked} />}
    {!locked && globalRepliesOpen && globalReplies.length > 0 && <div className="global-replies-accordion" aria-label="Global replies">{globalReplies.map((reply) => <CommentCard key={reply.id} debateId={debateId} node={reply} ownedProfileIds={ownedProfileIds} authorProfileId={authorProfileId} evaluationState={evaluationState} onEvaluate={onEvaluate} depth={depth + 1} />)}</div>}
    <MediaGallery media={node.media} compact />
    {!locked && <div className="global-reply-trigger"><CommentForm debateId={debateId} replyTo={node.id} controlId={`reply-global-${node.id}`} profileId={authorProfileId} compactTrigger /></div>}
  </article>;
}

function rootPostId(debate: Debate) {
  const targets: string[] = [];
  const scan = (nodes: Comment[] = []) => nodes.forEach((node) => {
    if (typeof node.replyTo === "string") targets.push(node.replyTo);
    scan(node.children);
  });
  scan(debate.children);
  return targets.some((target) => target === "p1" || target.startsWith("p1-")) ? "p1" : debate.id;
}

export function ThreadView({ debate, comments, ownedProfileIds = [], evaluatorProfileId, initialEvaluations = {}, initialReports = {}, initialStatuses = {} }: { debate: Debate; comments: Comment[]; ownedProfileIds?: string[]; evaluatorProfileId?: string; initialEvaluations?: EvaluationState; initialReports?: DebateReportState; initialStatuses?: StatusState }) {
  const authorProfileId = evaluatorProfileId ?? ownedProfileIds.find((profileId) => profileId !== "") ?? "profile-john";
  const [evaluationState, setEvaluationState] = useState(initialEvaluations);
  const [evaluationError, setEvaluationError] = useState("");
  const [reports, setReports] = useState(initialReports);
  const [statuses, setStatuses] = useState(initialStatuses);
  const [safe, setSafe] = useState(false);
  const [mode, setMode] = useState<DebateFilter>(null);
  const rootId = rootPostId(debate);
  const paragraphs = debate.content.flatMap((text) => text.replace(/\r\n?/g, "\n").split("\n").map((paragraph) => paragraph.trim()).filter(Boolean)).map((text, index) => ({
    id: rootId === "p1" ? `p1-${index + 1}` : `${rootId}-p-${index + 1}`,
    text
  }));

  const wholeDebateReported = safe && Object.entries(reports[debate.id]?.counts ?? {}).some(([reason, count]) => unsafeReportReasons.has(reason) && count > 0);
  const safeRootIds = safe ? new Set(paragraphs.filter((paragraph) => wholeDebateReported || Object.entries(reports[paragraph.id]?.counts ?? {}).some(([reason, count]) => unsafeReportReasons.has(reason) && count > 0)).map((paragraph) => paragraph.id)) : new Set<string>();
  const visibleParagraphs = paragraphs.filter((paragraph) => !safeRootIds.has(paragraph.id));
  const rootLocked = statuses[debate.id]?.locked ?? false;
  const rootComments = rootLocked || wholeDebateReported ? [] : filterDebateComments(comments, evaluatorProfileId, safe, mode, reports, evaluationState, paragraphs.map((paragraph) => paragraph.id));

  async function toggleReport(messageId: string, reason: string) {
    setEvaluationError("");
    const response = await fetch(`/api/debates/${encodeURIComponent(debate.id)}/reports`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ messageId, reason, profileId: evaluatorProfileId }) }).catch(() => null);
    const result = await response?.json().catch(() => null);
    if (!response?.ok) { setEvaluationError(result?.error || "The report could not be updated."); return; }
    setReports((current) => ({ ...current, [messageId]: result }));
  }

  async function evaluateArgument(argumentId: string, value: string) {
    setEvaluationError("");
    const response = await fetch(`/api/debates/${encodeURIComponent(debate.id)}/evaluations`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ argumentId, evaluation: value, profileId: evaluatorProfileId })
    }).catch(() => null);
    const result = await response?.json().catch(() => null);
    if (!response?.ok) {
      setEvaluationError(result?.error || "The evaluation could not be saved.");
      return;
    }
    setEvaluationState((current) => ({ ...current, [argumentId]: result }));
  }

  async function toggleStatus(argumentId: string, status: string) {
    setEvaluationError("");
    const response = await fetch(`/api/debates/${encodeURIComponent(debate.id)}/statuses`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ argumentId, status, profileId: evaluatorProfileId }) }).catch(() => null);
    const result = await response?.json().catch(() => null);
    if (!response?.ok) { setEvaluationError(result?.error || "The status could not be saved."); return null; }
    setStatuses((current) => ({ ...current, [argumentId]: result }));
    return result as StatusState[string];
  }

  return <ReportContext.Provider value={{ reports, toggle: toggleReport, statuses, toggleStatus, evaluations: evaluationState, toggleEvaluation: evaluateArgument, filtering: safe || mode !== null, profileId: evaluatorProfileId }}><section className="thread-view" aria-label="Debate thread">
    <header className="debate-heading debate-heading-thread">
      <p className="eyebrow">Open debate</p>
      <div className="debate-title-with-actions">{statuses[debate.id]?.selected.includes("🆕") && statuses[debate.id]?.forkDebateId ? <h1 className="serif"><a href={`/debates/${encodeURIComponent(statuses[debate.id].forkDebateId!)}?profileId=${encodeURIComponent(authorProfileId)}`}>{debate.title}</a></h1> : <h1 className="serif">{debate.title}</h1>}{statuses[debate.id]?.locked ? <InlineArgumentBadges id={debate.id} /> : <><InlineArgumentBadges id={debate.id} /><ArgumentMenus id={debate.id} text={`${debate.title}\n${debate.content.join("\n")}`} onReply={() => document.getElementById(`reply-debate-${debate.id}`)?.click()} onFork={(forkId) => window.location.assign(`/debates/${encodeURIComponent(forkId)}?profileId=${encodeURIComponent(authorProfileId)}`)} /></>}</div>
      <div className="debate-meta"><span>Opened by <strong>{debate.from || "Participant"}</strong></span><span>Starting point: <strong>{debate.start || "discussion"}</strong></span><span>Theme: <strong>{debate.theme === "economy-tech" ? "Economy / work / tech" : debate.theme || "—"}</strong></span><span>Mode: <strong>{debate.antiReaction ? "🐢 Slow mode" : "⚡ Normal"}</strong></span><span>Confidence: <strong>{debate.confidence ?? 0}%</strong> 💪</span><span>Icon: <strong>{debate.icon || "—"}</strong></span></div>
      {debate.sourcePostId && <a className="source-post-link" href={`/social#${encodeURIComponent(debate.sourcePostId)}`}>View original post in Circles →</a>}
    </header>
    <DebateControls safe={safe} onSafeChange={setSafe} mode={mode} onModeChange={setMode} />
    {evaluationError && <p className="form-error" role="alert">{evaluationError}</p>}
    <article className="thread-message thread-root" key={`${safe}-${mode ?? "all"}`}>
      {debate.definitions?.length ? <details className="data-accordion" open><summary>Definitions <span>{debate.definitions.length}</span></summary><div>{debate.definitions.map((item, index) => <p key={index}>{typeof item === "string" ? item : item.text}</p>)}</div></details> : null}
      {debate.facts?.length ? <details className="data-accordion" open><summary>Facts and references <span>{debate.facts.length}</span></summary><div>{debate.facts.map((item, index) => <p key={index}>{typeof item === "string" ? item : item.text}</p>)}</div></details> : null}
      <ArgumentLines debateId={debate.id} parentId={rootId} paragraphs={visibleParagraphs} children={rootComments} ownedProfileIds={ownedProfileIds} authorProfileId={authorProfileId} evaluationState={evaluationState} onEvaluate={evaluateArgument} rootAliases={[debate.id]} compact forceLocked={rootLocked} />
      <MediaGallery media={debate.media} />
      {!statuses[debate.id]?.locked && <div className="global-reply-trigger"><CommentForm debateId={debate.id} replyTo={debate.id} controlId={`reply-debate-${debate.id}`} profileId={authorProfileId} compactTrigger /></div>}
    </article>
  </section></ReportContext.Provider>;
}