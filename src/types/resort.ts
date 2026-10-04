export type ResortId = "cypress" | "grouse" | "seymour";

export type Resort = {
  id: ResortId;
  name: string;
  shortName: string;
  location: string;
  center: {
    lat: number;
    lng: number;
  };
  defaultZoom: number;
};
