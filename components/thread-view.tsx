"use client";

import { useRef, useState } from "react";
import type { Comment, Debate } from "@/lib/debates";
import { CommentForm } from "@/components/comment-form";

const reportReasons = [
  { icon: "🚫", label: "Interdit" },
  { icon: "💨", label: "Hors sujet" },
  { icon: "🤣", label: "Humour" },
  { icon: "🔀", label: "Déviation" },
  { icon: "🔄🤯", label: "Mauvais raisonnement" },
  { icon: "❓", label: "Invérifiable" },
  { icon: "☢️", label: "Manipulation" },
  { icon: "🔞", label: "Sexuel" },
  { icon: "⚠️", label: "Choquant" },
  { icon: "❌", label: "Agressif" }
];

function MessageInfo({ debateId, id, author, confidence, replyTo, text }: { debateId: string; id: string; author: string; confidence: number | string; replyTo?: string; text: string }) {
  const [open, setOpen] = useState(false);
  const [feedback, setFeedback] = useState("");

  async function copyText() {
    try {
      await navigator.clipboard.writeText(text);
      setFeedback("Texte copié.");
    } catch {
      setFeedback("Copie indisponible dans ce navigateur.");
    }
  }

  async function shareMessage() {
    try {
      if (navigator.share) await navigator.share({ title: "Message de débat", text });
      else await navigator.clipboard.writeText(`${text}\n${window.location.href}#${id}`);
      setFeedback("Message prêt à partager.");
    } catch (error) {
      if (error instanceof Error && error.name === "AbortError") return;
      setFeedback("Partage indisponible dans ce navigateur.");
    }
  }

  async function reportMessage(icon: string, label: string) {
    const reason = `${icon} ${label}`;
    const response = await fetch(`/api/debates/${encodeURIComponent(debateId)}/reports`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ messageId: id, reason })
    }).catch(() => null);
    setFeedback(response?.ok ? `Signalement ${reason} envoyé.` : "Le signalement n’a pas pu être envoyé.");
  }

  return (
    <div className="message-tools">
      <button className="text-action" type="button" aria-expanded={open} onClick={() => setOpen(!open)}>{open ? "Masquer les infos" : "Infos du message"}</button>
      {open && <div className="message-info-panel">
        <dl><div><dt>Auteur</dt><dd>{author}</dd></div><div><dt>Confiance</dt><dd>{confidence}%</dd></div><div><dt>Identifiant</dt><dd>{id}</dd></div>{replyTo && <div><dt>Réponse à</dt><dd>{replyTo}</dd></div>}</dl>
        <div className="message-actions">
          <button className="text-action" type="button" onClick={copyText}>Copier</button>
          <button className="text-action" type="button" onClick={shareMessage}>Partager</button>
          <details className="report-menu"><summary>Signaler</summary><div>{reportReasons.map(({ icon, label }) => <button type="button" key={label} onClick={() => reportMessage(icon, label)}>{icon} {label}</button>)}</div></details>
        </div>
        {feedback && <span className="action-feedback" role="status">{feedback}</span>}
      </div>}
    </div>
  );
}

function ArgumentLine({ debateId, id, text, replies, depth = 0, compact = false }: { debateId: string; id: string; text: string; replies: Comment[]; depth?: number; compact?: boolean }) {
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
      setFeedback(`Signalement ${icon} ${label} envoyé.`);
    } else {
      setFeedback("Le signalement n’a pas pu être envoyé.");
    }
    setReportOpen(false);
  }

  async function shareArgument() {
    try {
      if (navigator.share) await navigator.share({ title: "Argument de débat", text });
      else await navigator.clipboard.writeText(`${text}\n${window.location.href}#${id}`);
      setFeedback("Argument prêt à partager.");
    } catch (error) {
      if (error instanceof Error && error.name === "AbortError") return;
      setFeedback("Partage indisponible dans ce navigateur.");
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
      setFeedback("Texte copié.");
    } catch {
      setFeedback("Copie indisponible dans ce navigateur.");
    }
    setContextOpen(false);
  }

  return <div className="argument-wrap">
    {(reportOpen || contextOpen) && <button className="report-dismiss" type="button" aria-label="Fermer le menu" onClick={() => { setReportOpen(false); setContextOpen(false); }} />}
    <div className="argument-line" data-argument-id={id} onContextMenu={(event) => { event.preventDefault(); setContextOpen(true); }} onPointerDown={startLongPress} onPointerUp={clearLongPress} onPointerCancel={clearLongPress}>
      <button className={`argument-text${compact ? " argument-text-compact" : ""}`} type="button" aria-expanded={replies.length > 0 ? repliesOpen : undefined} onClick={() => { if (longPressTriggered.current) { longPressTriggered.current = false; return; } if (replies.length > 0) setRepliesOpen(!repliesOpen); }} title={replies.length > 0 ? "Afficher ou masquer les réponses à cet argument" : "Argument sans réponse"}>{text}</button>
      {reportBadge && <span className="report-badge" title="Signalement envoyé">{reportBadge}</span>}
      <div className="argument-actions">
        <button className="argument-action reply-icon" type="button" title="Répondre à cette ligne" aria-label="Répondre à cet argument" onClick={() => document.getElementById(`reply-${id}`)?.click()}>↩</button>
        <button className="argument-action" type="button" title="Informations sur cette ligne" aria-label="Informations sur cet argument" aria-expanded={infoOpen} onClick={() => setInfoOpen(!infoOpen)}>ⓘ</button>
        <button className="argument-action share-icon" type="button" title="Partager cette ligne" aria-label="Partager cet argument" onClick={shareArgument}>↗</button>
        <div className="argument-report" onMouseEnter={() => setReportOpen(true)} onMouseLeave={() => setReportOpen(false)}>
          <button className="argument-action" type="button" title="Signaler cette ligne" aria-label="Signaler cet argument" aria-expanded={reportOpen} onClick={toggleReportMenu}>⚑</button>
          {reportOpen && <div className="report-palette">{reportReasons.map(({ icon, label }) => <button type="button" key={label} title={label} aria-label={`${icon} ${label}`} onClick={() => report(icon, label)}>{icon}<span>{label}</span></button>)}</div>}
        </div>
      </div>
    </div>
    {contextOpen && <div className="argument-context-menu" role="menu">
      <button type="button" role="menuitem" onClick={() => { setContextOpen(false); document.getElementById(`reply-${id}`)?.click(); }}>↩ Répondre</button>
      <button type="button" role="menuitem" onClick={copyArgument}>Copier</button>
      <button type="button" role="menuitem" onClick={() => { setContextOpen(false); void shareArgument(); }}>Partager</button>
      <button type="button" role="menuitem" onClick={() => { setContextOpen(false); setReportOpen(true); }}>⚑ Signaler</button>
    </div>}
    {infoOpen && <div className="argument-info"><span>Argument <code>{id}</code></span><button className="text-action" type="button" onClick={() => navigator.clipboard.writeText(text).then(() => setFeedback("Texte copié.")).catch(() => setFeedback("Copie indisponible."))}>Copier</button></div>}
    <CommentForm key={id} debateId={debateId} replyTo={id} controlId={`reply-${id}`} />
    {feedback && <span className="action-feedback argument-feedback" role="status">{feedback}</span>}
    {repliesOpen && <div className="argument-replies">{replies.map((reply) => <CommentCard key={reply.id} debateId={debateId} node={reply} depth={depth + 1} />)}</div>}
  </div>;
}

function ArgumentLines({ debateId, parentId, paragraphs, children, depth = 0, compact = false, rootAliases = [] }: { debateId: string; parentId: string; paragraphs: Array<{ id: string; text: string }>; children: Comment[]; depth?: number; compact?: boolean; rootAliases?: string[] }) {
  return <div className="argument-list">{paragraphs.map((paragraph) => <ArgumentLine key={paragraph.id} debateId={debateId} id={paragraph.id} text={paragraph.text} replies={children.filter((child) => child.replyTo === paragraph.id)} depth={depth} compact={compact} />)}
    {children.filter((child) => child.replyTo === parentId || rootAliases.includes(child.replyTo)).map((reply) => <CommentCard key={reply.id} debateId={debateId} node={reply} depth={depth + 1} />)}
  </div>;
}

function CommentCard({ debateId, node, depth = 0 }: { debateId: string; node: Comment; depth?: number }) {
  const paragraphs = node.paragraphs ?? [];
  const text = paragraphs.map((paragraph) => paragraph.text).join(" ");

  return <article className="thread-message" style={{ "--depth": Math.min(depth, 4) } as React.CSSProperties}>
    <header className="thread-message-header"><span><strong>{node.author}</strong><span className="message-role">Participant</span></span><span className="message-confidence">💪 {node.confidence}%</span></header>
    {node.definitions?.length ? <details className="data-accordion"><summary>Définitions <span>{node.definitions.length}</span></summary><div>{node.definitions.map((item, index) => <p key={index}>{typeof item === "string" ? item : item.text}</p>)}</div></details> : null}
    {node.facts?.length ? <details className="data-accordion"><summary>Faits et repères <span>{node.facts.length}</span></summary><div>{node.facts.map((item, index) => <p key={index}>{typeof item === "string" ? item : item.text}</p>)}</div></details> : null}
    <h3 className="thread-message-title">{node.title}</h3>
    {node.evaluation && <span className="evaluation-badge" title="Auto-évaluation">{node.evaluation}</span>}
    <ArgumentLines debateId={debateId} parentId={node.id} paragraphs={paragraphs} children={node.children ?? []} depth={depth} compact />
    {paragraphs.length === 0 && <ArgumentLine debateId={debateId} id={node.id} text={node.title} replies={node.children ?? []} depth={depth} compact />}
    <div className="message-control-row">
      <MessageInfo debateId={debateId} id={node.id} author={node.author} confidence={node.confidence} replyTo={node.replyTo} text={`${node.title}\n${text}`} />
      <CommentForm debateId={debateId} replyTo={node.id} />
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

export function ThreadView({ debate, comments }: { debate: Debate; comments: Comment[] }) {
  const rootId = rootPostId(debate);
  const paragraphs = debate.content.flatMap((text) => text.replace(/\r\n?/g, "\n").split("\n").map((paragraph) => paragraph.trim()).filter(Boolean)).map((text, index) => ({
    id: rootId === "p1" ? `p1-${index + 1}` : `${rootId}-p-${index + 1}`,
    text
  }));

  const rootComments = comments;

  return <section className="thread-view" aria-label="Fil du débat">
    <article className="thread-message thread-root">
      {debate.definitions?.length ? <details className="data-accordion" open><summary>Définitions <span>{debate.definitions.length}</span></summary><div>{debate.definitions.map((item, index) => <p key={index}>{typeof item === "string" ? item : item.text}</p>)}</div></details> : null}
      {debate.facts?.length ? <details className="data-accordion" open><summary>Faits et repères <span>{debate.facts.length}</span></summary><div>{debate.facts.map((item, index) => <p key={index}>{typeof item === "string" ? item : item.text}</p>)}</div></details> : null}
      <ArgumentLines debateId={debate.id} parentId={rootId} paragraphs={paragraphs} children={rootComments} rootAliases={[debate.id]} compact />
      <div className="message-control-row"><MessageInfo debateId={debate.id} id={debate.id} author={debate.from || "Participant"} confidence={debate.confidence ?? 0} text={`${debate.title}\n${debate.content.join("\n")}`} /></div>
    </article>
  </section>;
}