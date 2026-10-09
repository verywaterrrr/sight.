# Railway hosting

Repository: https://github.com/verywaterrrr/sight.

Application and recognition API: https://recognition-production-5d73.up.railway.app/

The `recognition` service in the `sight` project follows `main`. Railway builds the root Dockerfile on every push. The container serves the app and runs Python/Audiveris recognition; GitHub Pages uses its HTTPS API through `recognitionApiBase` in `assets/app-config.json`. The local server overrides that field to use its own API.

## Runtime

The Dockerfile installs the official Audiveris 5.11.0 Ubuntu 24 amd64 package, its bundled Java runtime, pinned full English Tesseract data and pypdf 6.10.0. Downloads are checksum verified. The Audiveris launcher config is patched to a 128 MB initial heap and 512 MB maximum heap; the build verifies the effective maximum. Headless mode, one processor and serial GC keep batch recognition within the configured 1 GB/1 CPU service allocation. One recognition process runs at a time.

Service settings:

- Port 8080; `/api/health` health check; three retries on failure.
- `SIGHT_ALLOWED_ORIGINS=https://verywaterrrr.github.io` for browser requests from Pages.
- `SIGHT_MAX_PENDING_JOBS=4`: reserves capacity before reading PDFs; cancelled pending requests retain capacity until their data is discarded.
- `SIGHT_MAX_PAGES=30`; PDFs must be at most 64 MB. Choose smaller passages for faster recognition.
- `JAVA_TOOL_OPTIONS=-Djava.awt.headless=true -Xmx512m -XX:ActiveProcessorCount=1 -XX:+UseSerialGC`.
- `OMP_THREAD_LIMIT=1`; `GDK_SCALE=1` avoids display probing in the headless container.

No keys or credentials are sent to the frontend. The current API is anonymous and bounded, suitable for this personal app. Processing storage is ephemeral: files are cleaned after 24 hours, finished job responses after one hour, and a redeploy can interrupt a job. Retry interrupted recognition. Finished scores, PDFs and corrections are saved in IndexedDB on the user's browser; they are specific to that device and website origin. Microphone audio stays on the device.

## Local recognition

Run `npm run dev` from this app folder. The configured local Audiveris runtime remains in `.runtime` and is excluded from Git and Docker. `server/start.cjs` accepts `SIGHT_PYTHON`; `AUDIVERIS_CLI` overrides the provider executable and `TESSDATA_PREFIX` overrides OCR data.

For a fresh installation, follow the requirements and virtual-environment commands in README.md. For local iPad microphone testing run `npm run dev:https` and open the printed setup page on the same Wi-Fi. The public Railway site provides HTTPS directly.

## Verification

```sh
npm test
python3 tests/cloud-boundary.test.py
python3 tests/service.test.py
SIGHT_TEST_URL=https://recognition-production-5d73.up.railway.app/ node tests/cloud-browser.cjs
SIGHT_TEST_URL=https://verywaterrrr.github.io/sight./ node tests/cloud-browser.cjs
```

The browser check exercises actual PDF-page selection, upload, Audiveris recognition, review, positioned notes, playback and saved reload. Set `SIGHT_TEST_PDF` to a local PDF path and `SIGHT_TEST_PAGES` to comma-separated one-based pages to test another score. Test PDFs are never committed by this workflow. Node/Playwright installation and Chrome are required for the check.

Recognition is fallible. Review extracted notation before practice. Physical iPad singing and speaker/microphone separation still need device testing.

## Third-party provider

Audiveris is a separate AGPLv3 executable installed from its official release. Its source and license are available at https://github.com/Audiveris/audiveris/tree/5.11.0. The container changes only launcher heap configuration. Full English OCR data is from https://github.com/tesseract-ocr/tessdata/tree/c2b2e0df86272ce11be323f23f96cf656565ed41.

## Deployment evidence — 9 October 2026

GitHub source connection, Linux container build, effective 512 MB Java heap, engine startup and Railway health check passed. A real two-page choir PDF browser upload produced five parts and positioned notes, followed by review, playback and persisted reload. GitHub Pages cross-origin verification is performed after the endpoint configuration is deployed.
