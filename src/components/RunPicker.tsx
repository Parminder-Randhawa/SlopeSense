import { createPortal } from "react-dom";
import { useState, useEffect, useRef } from "react";
import { allTrails } from "../data/demo";
import { resorts } from "../data/resorts";
import type { ResortId } from "../types/resort";
import { DifficultyPill } from "./Shared";
import { Icon } from "./Icon";
export function RunPicker({
  value,
  onPick,
  onClose,
}: {
  value: string;
  onPick: (id: string) => void;
  onClose: () => void;
}) {
  const closeButton = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    const previous = document.activeElement as HTMLElement;
    const y = window.scrollY;
    const previousStyle = document.body.getAttribute("style");
    document.body.style.position = "fixed";
    document.body.style.top = `-${y}px`;
    document.body.style.width = "100%";
    closeButton.current?.focus({ preventScroll: true });
    return () => {
      if (previousStyle === null) document.body.removeAttribute("style");
      else document.body.setAttribute("style", previousStyle);
      window.scrollTo(0, y);
      previous?.focus({ preventScroll: true });
    };
  }, []);
  const [resort, setResort] = useState<ResortId>(
      allTrails.find((t) => t.id === value)?.resortId || "cypress",
    ),
    [search, setSearch] = useState("");
  const shown = allTrails.filter(
    (t) =>
      t.resortId === resort &&
      t.name.toLowerCase().includes(search.toLowerCase()),
  );
  return createPortal(
    <div className="picker-backdrop" onClick={onClose}>
      <section
        className="run-picker"
        role="dialog"
        aria-modal="true"
        aria-labelledby="picker-title"
        onClick={(e) => e.stopPropagation()}
        onKeyDown={(e) => {
          if (e.key === "Escape") onClose();
          if (e.key === "Tab") {
            const nodes = Array.from(
              e.currentTarget.querySelectorAll<HTMLElement>("button,input"),
            );
            const first = nodes[0],
              last = nodes.at(-1);
            if (e.shiftKey && document.activeElement === first) {
              e.preventDefault();
              last?.focus();
            } else if (!e.shiftKey && document.activeElement === last) {
              e.preventDefault();
              first?.focus();
            }
          }
        }}
      >
        <header>
          <div>
            <p className="eyebrow">PLAN YOUR RIDE</p>
            <h2 id="picker-title">Choose a run</h2>
          </div>
          <button
            ref={closeButton}
            className="icon-button"
            aria-label="Close run picker"
            onClick={onClose}
          >
            <Icon name="close" />
          </button>
        </header>
        <div className="resort-switch">
          {resorts.map((r) => (
            <button
              key={r.id}
              className={resort === r.id ? "active" : ""}
              onClick={() => {
                setResort(r.id);
                setSearch("");
              }}
            >
              {r.shortName}
            </button>
          ))}
        </div>
        <input
          aria-label="Search runs"
          placeholder="Search runs…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <div className="picker-runs">
          {shown.map((t) => (
            <button
              key={t.id}
              className={t.id === value ? "selected" : ""}
              onClick={() => {
                onPick(t.id);
                onClose();
              }}
            >
              <DifficultyPill difficulty={t.difficulty} />
              <span>
                <strong>{t.name}</strong>
                <small>
                  {((t.lengthMeters || 0) / 1000).toFixed(2)} km mapped
                </small>
              </span>
              <Icon name={t.id === value ? "check" : "chevron"} size={17} />
            </button>
          ))}
          {!shown.length && (
            <p className="empty-inline">No runs match your search.</p>
          )}
        </div>
      </section>
    </div>,
    document.body,
  );
}
