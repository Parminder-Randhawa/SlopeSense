import type { Resort } from "../types/resort";

export const resorts: Resort[] = [
  {
    id: "cypress",
    name: "Cypress Mountain",
    shortName: "Cypress",
    location: "West Vancouver, BC",
    center: { lat: 49.3957, lng: -123.2033 },
    defaultZoom: 13.55,
  },
  {
    id: "grouse",
    name: "Grouse Mountain",
    shortName: "Grouse",
    location: "North Vancouver, BC",
    center: { lat: 49.3781, lng: -123.0815 },
    defaultZoom: 13.7,
  },
  {
    id: "seymour",
    name: "Mt Seymour",
    shortName: "Mt Seymour",
    location: "North Vancouver, BC",
    center: { lat: 49.3674, lng: -122.9484 },
    defaultZoom: 13.6,
  },
];

export const resortById = Object.fromEntries(
  resorts.map((resort) => [resort.id, resort]),
) as Record<Resort["id"], Resort>;
