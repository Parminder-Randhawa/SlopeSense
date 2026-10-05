import type { ResortId } from "../types/resort";
export const mountainInfo: Record<
  ResortId,
  { color: string; official: string }
> = {
  cypress: { color: "#eacb80", official: "https://cypressmountain.com/" },
  grouse: { color: "#f1a17a", official: "https://www.grousemountain.com/" },
  seymour: { color: "#8be0d0", official: "https://mtseymour.ca/" },
};
