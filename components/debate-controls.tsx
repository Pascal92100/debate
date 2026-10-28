"use client";

import { useState } from "react";

const tools = [
  ["buffer", "Draft buffer"],
  ["safe-filter", "Safe tagging filter"],
  ["my-posts-before", "My posts + context before"],
  ["my-posts-replies", "My posts + replies"],
  ["unread-replies", "Unread replies + context"],
  ["unanswered-replies", "Unanswered replies + context"],
  ["ai-summary-text", "AI text summary"],
  ["ai-summary-graph", "AI graph summary"],
  ["sub-debates", "Sub-debates"],
  ["participants", "Participants 👥"]
] as const;

export function DebateControls() {
  const [notice, setNotice] = useState("");
  const [filterActive, setFilterActive] = useState(false);

  return <div className="debate-controls">
    <nav className="debate-tool-list" aria-label="Outils du débat">
      {tools.map(([action, label]) => <button key={action} type="button" className="debate-tool" title={`${label} : en préparation`} onClick={() => setNotice(`${label} n’est pas encore disponible.`)}>{label}</button>)}
    </nav>
    <div className="debate-control-bottom">
      <div className="debate-views" role="group" aria-label="Forme de présentation">
        <button type="button" className="debate-view selected" aria-pressed="true">Classic</button>
        <button type="button" className="debate-view" disabled title="La vue Graph sera disponible ultérieurement">Graph <span>Bientôt</span></button>
      </div>
      <button type="button" className={`debate-tool filter-tool${filterActive ? " selected" : ""}`} aria-pressed={filterActive} onClick={() => { setFilterActive(!filterActive); setNotice("Le filtre avant / après vos réponses n’est pas encore disponible."); }}>
        Filter before / after my replies
      </button>
    </div>
    <p className="debate-control-notice" aria-live="polite">{notice}</p>
  </div>;
}