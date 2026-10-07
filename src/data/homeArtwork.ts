import type { ResortId } from "../types/resort";
export type ArtworkFrame = "tall" | "portrait" | "medium" | "wide";
type Point = readonly [number, number];
type MountainFrame = {
  label: Point;
  glow: readonly [number, number, number, number];
  summit: Point;
  landmark: Point;
};
/** Source-image coordinates keep lighting, snowfall and labels on the terrain.
 * These are illustration landmarks, not geographic coordinates. */
export const homeArtwork: Record<
  ArtworkFrame,
  {
    src: string;
    width: number;
    height: number;
    mountains: Record<ResortId, MountainFrame>;
  }
> = {
  wide: {
    src: "/assets/north-shore-wide-hd.webp",
    width: 3840,
    height: 2161,
    mountains: {
      cypress: {
        label: [0.27, 0.53],
        glow: [0.27, 0.55, 0.17, 0.23],
        summit: [0.204, 0.426],
        landmark: [0.267, 0.64],
      },
      grouse: {
        label: [0.575, 0.38],
        glow: [0.57, 0.4, 0.16, 0.2],
        summit: [0.575, 0.25],
        landmark: [0.575, 0.25],
      },
      seymour: {
        label: [0.8, 0.6],
        glow: [0.8, 0.64, 0.15, 0.23],
        summit: [0.835, 0.452],
        landmark: [0.835, 0.452],
      },
    },
  },
  medium: {
    src: "/assets/north-shore-medium-hd.webp",
    width: 2896,
    height: 2172,
    mountains: {
      cypress: {
        label: [0.29, 0.49],
        glow: [0.29, 0.555, 0.18, 0.17],
        summit: [0.22, 0.454],
        landmark: [0.287, 0.606],
      },
      grouse: {
        label: [0.565, 0.43],
        glow: [0.565, 0.445, 0.16, 0.17],
        summit: [0.568, 0.327],
        landmark: [0.568, 0.327],
      },
      seymour: {
        label: [0.8, 0.59],
        glow: [0.79, 0.6, 0.16, 0.18],
        summit: [0.821, 0.485],
        landmark: [0.821, 0.485],
      },
    },
  },
  tall: {
    src: "/assets/north-shore-tall-hd.webp",
    width: 1448,
    height: 4344,
    mountains: {
      cypress: {
        label: [0.3, 0.44],
        glow: [0.28, 0.408, 0.23, 0.082],
        summit: [0.2, 0.359],
        landmark: [0.299, 0.425],
      },
      grouse: {
        label: [0.59, 0.328],
        glow: [0.59, 0.325, 0.22, 0.082],
        summit: [0.588, 0.278],
        landmark: [0.588, 0.278],
      },
      seymour: {
        label: [0.76, 0.447],
        glow: [0.76, 0.446, 0.22, 0.083],
        summit: [0.823, 0.383],
        landmark: [0.823, 0.383],
      },
    },
  },
  portrait: {
    src: "/assets/north-shore-portrait-hd.webp",
    width: 1774,
    height: 3548,
    mountains: {
      cypress: {
        label: [0.2, 0.44],
        glow: [0.28, 0.48, 0.19, 0.1],
        summit: [0.19, 0.417],
        landmark: [0.286, 0.523],
      },
      grouse: {
        label: [0.59, 0.365],
        glow: [0.59, 0.385, 0.2, 0.105],
        summit: [0.59, 0.289],
        landmark: [0.59, 0.289],
      },
      seymour: {
        label: [0.77, 0.575],
        glow: [0.77, 0.565, 0.19, 0.115],
        summit: [0.78, 0.45],
        landmark: [0.78, 0.45],
      },
    },
  },
};
export function frameForViewport(): ArtworkFrame {
  if (matchMedia("(max-aspect-ratio: 9/25)").matches) return "tall";
  if (matchMedia("(max-aspect-ratio: 1/1)").matches) return "portrait";
  return matchMedia("(max-height: 500px)").matches ||
    matchMedia("(max-aspect-ratio: 7/5)").matches
    ? "medium"
    : "wide";
}
