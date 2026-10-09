# sight.

An iPad-first choir practice app with a minimalist score interface.

**Website with recognition:** https://recognition-production-5d73.up.railway.app/

**GitHub Pages:** https://verywaterrrr.github.io/sight./

**Repository:** https://github.com/verywaterrrr/sight.

## Hosted app

The public site includes **Morning Practice**, an original four-page SATB and piano exercise with authored pitches, rhythms and note positions. It supports:

- Sharp PDF rendering, zoom, one page in portrait and two in landscape. Page turns shift one page: 1–2 → 2–3 → 3–4.
- Shared part checkboxes, note-tap playback, adjustable BPM and count-in.
- One-part rhythm practice, inclusive practice loops and an independent metronome.
- Browser microphone pitch trace and note feedback. Permission is requested only when monitoring starts.
- Note/part/onset/duration and bar corrections, plus a saved-score library.
- PDF upload, page previews and selection, automatic note recognition, review and browser saving.

Automatic PDF recognition runs on the Railway Python/Audiveris service. GitHub Pages connects to that HTTPS API; the Railway URL serves the complete app directly. Only selected pages are uploaded. Processing files are cleaned after 24 hours; finished job responses after one hour. Saved PDFs, notation and corrections stay in the browser. Microphone audio stays on the device. Browser storage is specific to the device and website origin, so Pages, Railway and the local app have separate libraries.

The hosted service processes one score at a time, with at most four admitted jobs, 30 selected pages and a 64 MB upload limit. Smaller passages finish faster. Recognition needs human review. A redeploy can interrupt processing; retry the upload if that happens.

Voice feedback uses a conservative pitch detector. Silence, low confidence and known accompaniment-frequency overlaps stay neutral. Real iPad singing with speaker accompaniment has not been validated. Written repeat barlines and numbered endings follow their playback passes. Yellow repeat marks clear after the final pass; custom practice loops are supported. D.C., D.S. and coda jumps require manual navigation. Previously imported PDFs should be re-read once to obtain repeat metadata.

Piano playback uses recorded Salamander grand-piano samples; choir playback uses separate recorded female and male Sonatina voices. Sound credits and licenses are in [assets/sounds/LICENSES.md](assets/sounds/LICENSES.md).

## Local version with recognition

Requirements: Node.js, Python 3 with `pypdf`, and an official compatible Audiveris installation. Audiveris 5.11.0 was exercised on macOS arm64. Configure its English OCR data and set `AUDIVERIS_CLI` to the absolute executable path; `TESSDATA_PREFIX` can specify OCR data. Recognition uses Unix process-group cancellation. Audiveris remains a separate executable; its runtime is not distributed here.

```sh
python3 -m venv .venv
. .venv/bin/activate
pip install pypdf
export SIGHT_PYTHON="$VIRTUAL_ENV/bin/python3"
export AUDIVERIS_CLI='/absolute/path/to/Audiveris'
npm run dev
```

Open http://localhost:5173. Only selected PDF pages reach the local processing server. Review recognized pitches, rhythms, part names and positions before practice. Recognition correctness is not guaranteed. The local cache lives in `.runtime/jobs` and is cleaned after 24 hours; deleting a browser score does not immediately remove its processing cache.

For microphone practice on a physical iPad connected to your local computer, run `npm run dev:https` and follow its printed setup address. The script generates project-local certificates and requires manually trusting your own certificate on the device. It never installs trust automatically. Both public sites provide HTTPS and need no development certificate.

## Build and deployment

```sh
npm test
npm run build:pages
```

The build copies an explicit public-file allowlist into `dist/`. Runtime files, uploaded scores, local certificates and personal test evidence are excluded. The GitHub Actions workflow tests and builds on each push to `main`, then deploys `dist/` using GitHub Pages.

Railway follows the same branch and builds the Dockerfile, including the Linux recognition runtime. See [Railway setup](docs/railway-deployment.md) for service configuration and operating limits.

The supplied choir score used during local development and its extracted notation are excluded from the repository and deployed site. Local development can continue using those files when they are present.

## Verification

The unit suite covers page/part state, scheduling, ties, count-in, pitch feedback, correction validation, public page selection and publication boundaries. `tests/pages-browser.cjs` exercises the public build under the repository subpath, including the original demo and browser audio. `tests/cloud-browser.cjs` exercises real selected-page upload, recognition, review, positioned notes, playback and saved reload on either hosted URL. Run it with `SIGHT_TEST_URL` pointing at your built site; set `PLAYWRIGHT_MODULE` and `CHROME_PATH` for your machine. Other browser checks exercise private local recognition fixtures and use development-machine paths; those fixture PDFs and artifacts are intentionally excluded.

```sh
npm test
SIGHT_TEST_URL=https://verywaterrrr.github.io/sight./ node tests/pages-browser.cjs
SIGHT_TEST_URL=https://recognition-production-5d73.up.railway.app/ node tests/cloud-browser.cjs
```

Synthetic microphone checks do not establish physical singing or speaker-bleed accuracy.

## Third-party notices

PDF.js is distributed under Apache 2.0; PDF-lib under MIT. Their notices are included in `vendor/`. The original demo's music symbols use Bravura outlines by Steinberg under the SIL Open Font License, included in `scripts/fonts/OFL.txt`. Regenerating the demo needs Python `reportlab` and `fonttools`; run `python scripts/create-demo.py`.

The hosted recognition provider is [Audiveris 5.11.0](https://github.com/Audiveris/audiveris/tree/5.11.0), a separate AGPLv3 executable installed by Docker. Its source and license are available at that link; launcher heap settings are adjusted for the service.

No license has been selected for the application source. Third-party license terms remain applicable to their respective components.
