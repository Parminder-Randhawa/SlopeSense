import type { Difficulty } from "../types/trail";

export const DIFFICULTIES: Difficulty[] = [
  "green",
  "blue",
  "black",
  "double-black",
  "unknown",
];

export const difficultyLabel: Record<Difficulty, string> = {
  green: "Green",
  blue: "Blue",
  black: "Black Diamond",
  "double-black": "Double Black",
  unknown: "Unrated",
};

export const difficultyShortLabel: Record<Difficulty, string> = {
  green: "Green",
  blue: "Blue",
  black: "Black",
  "double-black": "Double black",
  unknown: "Unknown",
};

export const difficultySymbol: Record<Difficulty, string> = {
  green: "●",
  blue: "■",
  black: "◆",
  "double-black": "◆◆",
  unknown: "?",
};

export const difficultyColor: Record<Difficulty, string> = {
  green: "#19a66f",
  blue: "#2878e8",
  black: "#16232d",
  "double-black": "#7c3aed",
  unknown: "#77848d",
};

export function isDifficulty(value: unknown): value is Difficulty {
  return (
    typeof value === "string" && DIFFICULTIES.includes(value as Difficulty)
  );
}
