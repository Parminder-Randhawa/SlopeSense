# Mountain artwork

`north-shore-diorama.png` is a generated realistic terrain illustration, created and refined with the built-in image-generation tool on October 5, 2026. Its three terrain groups are an illustrative composition, not a geographically surveyed reconstruction. It is decorative winter artwork and does not show current conditions.

References informed the broad forms: Cypress's Black Mountain / Mount Strachan basin, Grouse's compact summit and The Cut clearing, and Seymour's rolling wooded ridge toward Brockton Point. Source photographs are not served by the app.

- [Cypress trail maps](https://www.cypressmountain.com/trail-maps-and-stats)
- [Grouse winter map](https://www.grousemountain.com/maps/winter-map)
- [Seymour trail map](https://mtseymour.ca/the-mountain/trail-map)
- [Black Mountain reference photograph](https://commons.wikimedia.org/wiki/File:Cypress_mtn.jpg), Shaund, CC BY-SA 3.0, used as a geographic reference in an earlier generation. It was not pasted into the artwork.

The final refinement replaced repetitive conical trees with an irregular continuous coastal forest canopy, softened lighting, removed bright boundary rings and retained broad rounded ski terrain. The exact final prompt is in `artwork-prompt.txt` alongside this file. The bundled map geometry remains independent of the illustration and comes from OpenStreetMap (ODbL).

`mountain-winter.png` is the original project artwork, retained for compatibility with the original unused onboarding component. The first version used `north-shore-detailed.png`; the active responsive compositions are listed below.

## October 6 refinement

`north-shore-detailed.png` was edited using the built-in image-generation tool, with the earlier image as its edit target. Native output is 1254 × 1254; the source retains its native proportions. The home now uses cover cropping on desktop and a separate portrait composition on phones. The request for a larger generated resolution did not change the tool’s native output size. Cypress’s physical Olympic rings and Grouse’s Eye of the Wind are included as illustrative landmarks. The exact refinement prompt is `artwork-refinement-prompt.txt`.

Additional landmark references: [Cypress history](https://www.cypressmountain.com/our-history), [Grouse Eye of the Wind](https://www.grousemountain.com/press_releases/the-eye-of-the-wind-welcomes-the-world), [Seymour trail map](https://mtseymour.ca/the-mountain/trail-map).

## Full-screen portrait adaptation

`north-shore-portrait.png` was edited from the detailed artwork using the built-in image-generation tool on October 6, 2026. It recomposes all three mountains within a single full-bleed portrait background; it is not a separate square overlay. Native output is 887 × 1774. The lossless PNG is served at its original resolution, without artificial enlargement or compression. The tool did not deliver the requested larger dimensions. This earlier portrait remains in the repository; the active `<picture>` now selects the v2 assets by viewport shape. The exact final prompt is in `artwork-portrait-prompt.txt`.

## Responsive framing, contrast and snowfall

On October 6, 2026, the built-in image-generation tool adapted the artwork for four viewport shapes. All outputs are saved as lossless PNGs at the tool's native resolution. Larger pixel dimensions were requested, but the tool returned the dimensions below; source resolution remains a limit for Retina sharpness. Files have not been artificially upsampled. The more distant compositions and shape-specific selection reduce cover enlargement and keep all three illustrated summits visible.

| Shape | Saved asset | Native resolution | Exact built-in edit prompt |
| --- | --- | --- | --- |
| Wide desktop | [north-shore-wide-v2.png](north-shore-wide-v2.png) | 1672 × 941 | [artwork-landscape-v2-prompt.txt](artwork-landscape-v2-prompt.txt) |
| Tablet / compact or short landscape | [north-shore-medium-v2.png](north-shore-medium-v2.png) | 1448 × 1086 | [artwork-medium-v2-prompt.txt](artwork-medium-v2-prompt.txt) |
| Phone | [north-shore-portrait-v2.png](north-shore-portrait-v2.png) | 887 × 1774 | [artwork-portrait-v2-prompt.txt](artwork-portrait-v2-prompt.txt) |
| Very tall, narrow preview | [north-shore-tall-v2.png](north-shore-tall-v2.png) | 724 × 2172 | [artwork-tall-v2-prompt.txt](artwork-tall-v2-prompt.txt) |

The image remains one full-screen background. Source-image landmark coordinates in `src/data/homeArtwork.ts` align the mountain labels, a soft lighting mask and snow fields. The overlay darkens surrounding terrain while preserving brighter mountains; it does not alter the source PNG. Snowfall is more visible through brighter, slightly larger particles and denser fields. Intensity and motion still derive from current snowfall and wind. Missing/stale data and reduced-motion preferences stop animation. The artwork remains a decorative geographic interpretation, separate from live weather and mapped run geometry.
