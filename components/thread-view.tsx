"use client";

import { useRef, useState } from "react";
import type { Comment, Debate } from "@/lib/debates";
import { CommentForm } from "@/components/comment-form";
import { DeleteEntityButton } from "@/components/delete-entity-button";

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

function MessageInfo({ debateId, id, author, confidence, replyTo, text }: { debateId: string; id: string; author: string; confidence: number | string; replyTo?: string; text: string }) {
  const [open, setOpen] = useState(false);
  const [feedback, setFeedback] = useState("");

  async function copyText() {
    try {
      await navigator.clipboard.writeText(text);
      setFeedback("Text copied.");
    } catch {
      setFeedback("Copy is unavailable in this browser.");
    }
  }

  async function shareMessage() {
    try {
      if (navigator.share) await navigator.share({ title: "Debate message", text });
      else await navigator.clipboard.writeText(`${text}\n${window.location.href}#${id}`);
      setFeedback("Message ready to share.");
    } catch (error) {
      if (error instanceof Error && error.name === "AbortError") return;
      setFeedback("Sharing is unavailable in this browser.");
    }
  }

  async function reportMessage(icon: string, label: string) {
    const reason = `${icon} ${label}`;
    const response = await fetch(`/api/debates/${encodeURIComponent(debateId)}/reports`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ messageId: id, reason })
    }).catch(() => null);
    setFeedback(response?.ok ? `Report ${reason} sent.` : "The report could not be sent.");
  }

  return (
    <div className="message-tools">
      <button className="argument-action" type="button" aria-label="Message information" title="Message information" aria-expanded={open} onClick={() => setOpen(!open)}>ⓘ</button>
      {open && <div className="message-info-panel">
        <dl><div><dt>Author</dt><dd>{author}</dd></div><div><dt>Confidence</dt><dd>{confidence}%</dd></div><div><dt>ID</dt><dd>{id}</dd></div>{replyTo && <div><dt>Reply to</dt><dd>{replyTo}</dd></div>}</dl>
        <div className="message-actions">
          <button className="text-action" type="button" onClick={copyText}>Copy</button>
          <button className="text-action" type="button" onClick={shareMessage}>Share</button>
          <details className="report-menu"><summary>Report</summary><div>{reportReasons.map(({ icon, label }) => <button type="button" key={label} onClick={() => reportMessage(icon, label)}>{icon} {label}</button>)}</div></details>
        </div>
        {feedback && <span className="action-feedback" role="status">{feedback}</span>}
      </div>}
    </div>
  );
}

function ShareMessageButton({ text }: { text: string }) {
  async function share() {
    try {
      if (navigator.share) await navigator.share({ title: "Debate message", text });
      else await navigator.clipboard.writeText(`${text}\n${window.location.href}`);
    } catch (error) {
      if (error instanceof Error && error.name === "AbortError") return;
    }
  }
  return <button className="argument-action share-icon" type="button" title="Transfer or share this reply" aria-label="Transfer or share this reply" onClick={() => void share()}>↗</button>;
}

function ArgumentLine({ debateId, id, text, replies, ownedProfileIds, depth = 0, compact = false }: { debateId: string; id: string; text: string; replies: Comment[]; ownedProfileIds: string[]; depth?: number; compact?: boolean }) {
  const [reportOpen, setReportOpen] = useState(false);
  const [infoOpen, setInfoOpen] = useState(false);
  const [contextOpen, setContextOpen] = useState(false);
  const [repliesOpen, setRepliesOpen] = useState(false);
  const [reportBadge, setReportBadge] = useState("");
  const [feedback, setFeedback] = useState("");
  const pressTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const longPressTriggered = useRef(false);

  async function report(icon: string, label: string) {
    const response = await fetch(`/api/debates/${encodeURIComponent(debateId)}/reports`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ messageId: id, reason: `${icon} ${label}` })
    }).catch(() => null);
    if (response?.ok) {
      setReportBadge(icon);
      setFeedback(`Report ${icon} ${label} sent.`);
    } else {
      setFeedback("The report could not be sent.");
    }
    setReportOpen(false);
  }

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

  function toggleReportMenu() {
    const desktopHover = window.matchMedia("(hover: hover) and (pointer: fine)").matches;
    setReportOpen(desktopHover ? true : !reportOpen);
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

  async function copyArgument() {
    try {
      await navigator.clipboard.writeText(text);
      setFeedback("Text copied.");
    } catch {
      setFeedback("Copy is unavailable in this browser.");
    }
    setContextOpen(false);
  }

  return <div className="argument-wrap">
    {(reportOpen || contextOpen) && <button className="report-dismiss" type="button" aria-label="Close menu" onClick={() => { setReportOpen(false); setContextOpen(false); }} />}
    <div className="argument-line" data-argument-id={id} onContextMenu={(event) => { event.preventDefault(); setContextOpen(true); }} onPointerDown={startLongPress} onPointerUp={clearLongPress} onPointerCancel={clearLongPress}>
      <button className={`argument-text${compact ? " argument-text-compact" : ""}`} type="button" aria-expanded={replies.length > 0 ? repliesOpen : undefined} onClick={() => { if (longPressTriggered.current) { longPressTriggered.current = false; return; } if (replies.length > 0) setRepliesOpen(!repliesOpen); }} title={replies.length > 0 ? "Show or hide replies to this argument" : "No replies to this argument"}>{text}</button>
      {reportBadge && <span className="report-badge" title="Report sent">{reportBadge}</span>}
      <div className="argument-actions">
        <button className="argument-action reply-icon" type="button" title="Reply to this line" aria-label="Reply to this argument" onClick={() => document.getElementById(`reply-${id}`)?.click()}>↩</button>
        <button className="argument-action" type="button" title="Information about this line" aria-label="Argument information" aria-expanded={infoOpen} onClick={() => setInfoOpen(!infoOpen)}>ⓘ</button>
        <button className="argument-action share-icon" type="button" title="Share this line" aria-label="Share this argument" onClick={shareArgument}>↗</button>
        <div className="argument-report" onMouseEnter={() => setReportOpen(true)} onMouseLeave={() => setReportOpen(false)}>
          <button className="argument-action" type="button" title="Report this line" aria-label="Report this argument" aria-expanded={reportOpen} onClick={toggleReportMenu}>⚑</button>
          {reportOpen && <div className="report-palette">{reportReasons.map(({ icon, label }) => <button type="button" key={label} title={label} aria-label={`${icon} ${label}`} onClick={() => report(icon, label)}>{icon}<span>{label}</span></button>)}</div>}
        </div>
      </div>
    </div>
    {contextOpen && <div className="argument-context-menu" role="menu">
      <button type="button" role="menuitem" onClick={() => { setContextOpen(false); document.getElementById(`reply-${id}`)?.click(); }}>↩ Reply</button>
      <button type="button" role="menuitem" onClick={copyArgument}>Copy</button>
      <button type="button" role="menuitem" onClick={() => { setContextOpen(false); void shareArgument(); }}>Share</button>
      <button type="button" role="menuitem" onClick={() => { setContextOpen(false); setReportOpen(true); }}>⚑ Report</button>
    </div>}
    {infoOpen && <div className="argument-info"><span>Argument <code>{id}</code></span><button className="text-action" type="button" onClick={() => navigator.clipboard.writeText(text).then(() => setFeedback("Text copied.")).catch(() => setFeedback("Copy unavailable."))}>Copy</button></div>}
    <CommentForm key={id} debateId={debateId} replyTo={id} controlId={`reply-${id}`} />
    {feedback && <span className="action-feedback argument-feedback" role="status">{feedback}</span>}
    {repliesOpen && <div className="argument-replies">{replies.map((reply) => <CommentCard key={reply.id} debateId={debateId} node={reply} ownedProfileIds={ownedProfileIds} depth={depth + 1} />)}</div>}
  </div>;
}

function ArgumentLines({ debateId, parentId, paragraphs, children, ownedProfileIds, depth = 0, compact = false, rootAliases = [] }: { debateId: string; parentId: string; paragraphs: Array<{ id: string; text: string }>; children: Comment[]; ownedProfileIds: string[]; depth?: number; compact?: boolean; rootAliases?: string[] }) {
  return <div className="argument-list">{paragraphs.map((paragraph) => <ArgumentLine key={paragraph.id} debateId={debateId} id={paragraph.id} text={paragraph.text} replies={children.filter((child) => child.replyTo === paragraph.id)} ownedProfileIds={ownedProfileIds} depth={depth} compact={compact} />)}
    {children.filter((child) => child.replyTo === parentId || rootAliases.includes(child.replyTo)).map((reply) => <CommentCard key={reply.id} debateId={debateId} node={reply} ownedProfileIds={ownedProfileIds} depth={depth + 1} />)}
  </div>;
}

function CommentCard({ debateId, node, ownedProfileIds, depth = 0 }: { debateId: string; node: Comment; ownedProfileIds: string[]; depth?: number }) {
  const paragraphs = node.paragraphs ?? [];
  const text = paragraphs.map((paragraph) => paragraph.text).join(" ");
  const firstParagraph = paragraphs[0]?.text ?? "";
  const titleDuplicatesFirstParagraph = firstParagraph === node.title || (node.title.length === 72 && firstParagraph.startsWith(node.title));

  return <article className="thread-message" style={{ "--depth": Math.min(depth, 4) } as React.CSSProperties}>
    <header className="thread-message-header"><span><strong>{node.author}</strong></span><span className="thread-message-tools"><span className="message-confidence" title="Confidence">💪 {node.confidence}%</span>{node.authorProfileId && ownedProfileIds.includes(node.authorProfileId) && <DeleteEntityButton endpoint={`/api/debates/${encodeURIComponent(debateId)}/comments/${encodeURIComponent(node.id)}`} label="Delete my reply" confirmation="Delete this reply and all replies below it? This cannot be undone." iconOnly />}</span></header>
    {node.definitions?.length ? <details className="data-accordion"><summary>Definitions <span>{node.definitions.length}</span></summary><div>{node.definitions.map((item, index) => <p key={index}>{typeof item === "string" ? item : item.text}</p>)}</div></details> : null}
    {node.facts?.length ? <details className="data-accordion"><summary>Facts and references <span>{node.facts.length}</span></summary><div>{node.facts.map((item, index) => <p key={index}>{typeof item === "string" ? item : item.text}</p>)}</div></details> : null}
    {!titleDuplicatesFirstParagraph && <h3 className="thread-message-title">{node.title}</h3>}
    {node.evaluation && <span className="evaluation-badge" title="Self-evaluation">{node.evaluation}</span>}
    <ArgumentLines debateId={debateId} parentId={node.id} paragraphs={paragraphs} children={node.children ?? []} ownedProfileIds={ownedProfileIds} depth={depth} compact />
    {paragraphs.length === 0 && <ArgumentLine debateId={debateId} id={node.id} text={node.title} replies={node.children ?? []} ownedProfileIds={ownedProfileIds} depth={depth} compact />}
    <div className="message-control-row">
      <MessageInfo debateId={debateId} id={node.id} author={node.author} confidence={node.confidence} replyTo={node.replyTo} text={`${node.title}\n${text}`} />
      <ShareMessageButton text={`${node.title}\n${text}`} />
      <CommentForm debateId={debateId} replyTo={node.id} compactTrigger />
    </div>
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

export function ThreadView({ debate, comments, ownedProfileIds = [] }: { debate: Debate; comments: Comment[]; ownedProfileIds?: string[] }) {
  const rootId = rootPostId(debate);
  const paragraphs = debate.content.flatMap((text) => text.replace(/\r\n?/g, "\n").split("\n").map((paragraph) => paragraph.trim()).filter(Boolean)).map((text, index) => ({
    id: rootId === "p1" ? `p1-${index + 1}` : `${rootId}-p-${index + 1}`,
    text
  }));

  const rootComments = comments;

  return <section className="thread-view" aria-label="Debate thread">
    <article className="thread-message thread-root">
      {debate.definitions?.length ? <details className="data-accordion" open><summary>Definitions <span>{debate.definitions.length}</span></summary><div>{debate.definitions.map((item, index) => <p key={index}>{typeof item === "string" ? item : item.text}</p>)}</div></details> : null}
      {debate.facts?.length ? <details className="data-accordion" open><summary>Facts and references <span>{debate.facts.length}</span></summary><div>{debate.facts.map((item, index) => <p key={index}>{typeof item === "string" ? item : item.text}</p>)}</div></details> : null}
      <ArgumentLines debateId={debate.id} parentId={rootId} paragraphs={paragraphs} children={rootComments} ownedProfileIds={ownedProfileIds} rootAliases={[debate.id]} compact />
      <div className="message-control-row thread-root-actions"><MessageInfo debateId={debate.id} id={debate.id} author={debate.from || "Participant"} confidence={debate.confidence ?? 0} text={`${debate.title}\n${debate.content.join("\n")}`} /><ShareMessageButton text={`${debate.title}\n${debate.content.join("\n")}`} /><CommentForm debateId={debate.id} replyTo={debate.id} compactTrigger /></div>
    </article>
  </section>;
}