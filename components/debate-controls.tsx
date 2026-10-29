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
    <nav className="debate-tool-list" aria-label="Debate tools">
      {tools.map(([action, label]) => <button key={action} type="button" className="debate-tool" title={`${label}: coming soon`} onClick={() => setNotice(`${label} is not available yet.`)}>{label}</button>)}
    </nav>
    <div className="debate-control-bottom">
      <div className="debate-views" role="group" aria-label="Presentation mode">
        <button type="button" className="debate-view selected" aria-pressed="true">Classic</button>
        <button type="button" className="debate-view" disabled title="Graph view will be available later">Graph <span>Coming soon</span></button>
      </div>
      <button type="button" className={`debate-tool filter-tool${filterActive ? " selected" : ""}`} aria-pressed={filterActive} onClick={() => { setFilterActive(!filterActive); setNotice("Filtering before and after your replies is not available yet."); }}>
        Filter before / after my replies
      </button>
    </div>
    <p className="debate-control-notice" aria-live="polite">{notice}</p>
  </div>;
}