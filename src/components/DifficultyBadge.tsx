import {
  difficultyLabel,
  difficultyShortLabel,
  difficultySymbol,
} from "../lib/difficulty";
import type { Difficulty } from "../types/trail";

type DifficultyBadgeProps = {
  difficulty: Difficulty;
  compact?: boolean;
};

export function DifficultyBadge({
  difficulty,
  compact = false,
}: DifficultyBadgeProps) {
  return (
    <span
      className="difficulty-badge"
      data-difficulty={difficulty}
      title={difficultyLabel[difficulty]}
    >
      <span className="difficulty-badge__symbol" aria-hidden="true">
        {difficultySymbol[difficulty]}
      </span>
      {!compact && difficultyShortLabel[difficulty]}
    </span>
  );
}
