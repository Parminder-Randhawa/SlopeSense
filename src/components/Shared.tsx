import type { ReactNode } from "react";
import type { Difficulty } from "../types/trail";
import { difficultySymbol, difficultyShortLabel } from "../lib/difficulty";
import { Icon } from "./Icon";
export function DifficultyPill({ difficulty }: { difficulty: Difficulty }) {
  return (
    <span className={`difficulty-pill ${difficulty}`}>
      {difficultySymbol[difficulty]} {difficultyShortLabel[difficulty]}
    </span>
  );
}
export function PageHeading({
  eyebrow,
  title,
  subtitle,
  action,
}: {
  eyebrow: string;
  title: string;
  subtitle?: string;
  action?: ReactNode;
}) {
  return (
    <div className="page-heading">
      <div>
        <p className="eyebrow">{eyebrow}</p>
        <h1>{title}</h1>
        {subtitle && <p className="muted">{subtitle}</p>}
      </div>
      {action}
    </div>
  );
}
export function Metric({
  value,
  label,
  unit,
}: {
  value: ReactNode;
  label: string;
  unit?: string;
}) {
  return (
    <div className="metric">
      <strong>
        {value}
        <small>{unit}</small>
      </strong>
      <span>{label}</span>
    </div>
  );
}
export function Notice({ children }: { children: ReactNode }) {
  return (
    <div className="notice">
      <Icon name="info" size={16} />
      <p>{children}</p>
    </div>
  );
}
export function Empty({
  title,
  children,
}: {
  title: string;
  children: ReactNode;
}) {
  return (
    <div className="empty-state">
      <Icon name="mountain" size={38} />
      <h3>{title}</h3>
      <p>{children}</p>
    </div>
  );
}
export function Match({ score, large }: { score: number; large?: boolean }) {
  return (
    <div className={`match ${large ? "large" : ""}`}>
      <strong>
        {score}
        <small>%</small>
      </strong>
      <span>match</span>
    </div>
  );
}
export function dateLabel(date: string) {
  return new Date(date).toLocaleDateString("en-CA", {
    month: "short",
    day: "numeric",
  });
}
