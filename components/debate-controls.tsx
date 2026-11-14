"use client";

import type { DebateFilter } from "@/lib/debate-filters";

export function DebateControls({ safe, onSafeChange, mode, onModeChange }: { safe: boolean; onSafeChange: (value: boolean) => void; mode: DebateFilter; onModeChange: (value: DebateFilter) => void }) {

  return <div className="debate-controls">
    <nav className="debate-tool-list" aria-label="Debate tools">
      <button type="button" className={`debate-tool${safe ? " selected" : ""}`} aria-pressed={safe} onClick={() => onSafeChange(!safe)}>Safe tagging filter</button>
      {([["my-posts", "My posts"], ["my-branches", "My posts + replies"], ["unanswered", "Unanswered"]] as const).map(([value, label]) => <button key={value} type="button" className={`debate-tool${mode === value ? " selected" : ""}`} aria-pressed={mode === value} onClick={() => onModeChange(mode === value ? null : value)}>{label}</button>)}
      <button type="button" className="debate-tool" disabled>AI summary</button>
      <button type="button" className="debate-tool" disabled>Sub-debates</button>
      <button type="button" className="debate-tool" disabled>Participants 👥</button>
    </nav>
    <div className="debate-control-bottom">
      <div className="debate-views" role="group" aria-label="Presentation mode">
        <button type="button" className="debate-view selected" aria-pressed="true">Classic</button>
        <button type="button" className="debate-view" disabled title="Graph view will be available later">Graph</button>
      </div>
    </div>
  </div>;
}