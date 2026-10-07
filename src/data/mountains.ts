import type { ResortId } from "../types/resort";
export const mountainInfo: Record<
  ResortId,
  { color: string; official: string; conditions: string }
> = {
  cypress: {
    color: "#eacb80",
    official: "https://cypressmountain.com/",
    conditions: "https://www.cypressmountain.com/downhill-conditions-and-cams",
  },
  grouse: {
    color: "#f1a17a",
    official: "https://www.grousemountain.com/",
    conditions: "https://www.grousemountain.com/current_conditions",
  },
  seymour: {
    color: "#8be0d0",
    official: "https://mtseymour.ca/",
    conditions: "https://mtseymour.ca/the-mountain/todays-conditions-hours",
  },
};
