# Design and implementation boundaries

Approved direction: minimalist iPad choir practice, original PDF central, warm paper and restrained sage controls. The user declined additional design-skill templates on 9 October 2026. Work stays in this independent folder; `../app` is outside scope.

## Interaction decisions

- Portrait one page; landscape two. Navigation advances one page in both orientations.
- Reading defaults to fit width with vertical scrolling. Rendering uses actual PDF proportions and a 3× minimum raster target, capped for memory. Zoom rerenders the original bitmap.
- Voice controls live outside the paper and share one part state across systems/pages. Piano staves share their part. Rhythm mode is visibly distinct and selects one part.
- Note targets have 44-pixel invisible hit areas, with compact notehead feedback. Pointer taps choose the nearest printed head; keyboard activation honours the focused note. Loop selection uses the same controls.
- Bottom transport stays available. Metronome and voice monitor use right drawers. All feedback includes words/arrows as well as colour.
- Upload previews precede processing. Recognition warnings and suggested part names require review. Review has page and flagged-note navigation, safe edits, missing-note placement and undo.
- Local data and the processing computer are explained in the library. Microphone access is explicit and always stops on closing monitoring or backgrounding the app.

## Modules

- `app.js`: application controller and DOM interactions.
- `renderer.js`: PDF reading raster budget; `vendor/`: bundled PDF.js/PDF-lib and licences.
- `state.js`: page windows and linked voice/rhythm state.
- `timeline.js`: quarter-note musical event scheduling, count-in, ties and monitor target.
- `audio.js`: Web Audio look-ahead scheduler, independent metronome and live part gains.
- `pitch.js`: on-device capture, YIN, confidence/tolerances and accompaniment ambiguity.
- `corrections.js`: immutable validated edits and measure reflow; `sample-upgrade.js`: preserve edits during bundled sample expansion.
- `storage.js`: IndexedDB persistence; `recognition-client.js`: selected-page extraction and job lifecycle.
- `server/recognition.py`: external Audiveris normalization with original OMR geometry; `server/service.py`: local HTTP/optional TLS jobs and static assets.
- `server/https.cjs`: project-local certificates and iPad setup profile, with no trust-store installation.

## Evidence boundaries

Chrome and WebKit automation verify browser behaviour. Actual Web Audio rendering verifies audible frequencies and loop timing. Synthetic microphone capture verifies the analysis pipeline. None establishes physical iPad speaker bleed, singing accuracy, device latency or hosted deployment. Those remain release gates.
