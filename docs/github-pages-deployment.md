# GitHub Pages deployment

Requested outcome: a public repository named `sight.` and its web app hosted by GitHub Pages, preserving the approved design and separate project folder.

Public scope: application source and local recognition-provider code; an original demo; selected third-party notices. Exclude the supplied choir PDF and extracted notation, local runtime/cache/uploads, certificates/profiles, screenshots and personal handoff records.

The local server serves private sample configuration only when the private fixtures exist. The static public configuration selects the original demo and points recognition requests at the Railway HTTPS service. Selected PDF pages are uploaded to that service; extracted notation is reviewed and saved in the browser. Existing demo page selections scope playback to included pages and preserve corrections when pages are reintroduced. See [Railway configuration](railway-deployment.md).

The build uses an explicit allowlist, relative asset paths and GitHub's Pages artifact/deployment workflow. GitHub Pages is static hosting: [GitHub documentation](https://docs.github.com/en/pages/getting-started-with-github-pages/what-is-github-pages). The workflow follows [GitHub's custom workflow documentation](https://docs.github.com/en/pages/getting-started-with-github-pages/using-custom-workflows-with-github-pages).

Verification gates: 34 unit tests; public build contents; browser subpath, demo playback and actual hosted PDF recognition; repository public visibility; Pages deployment status; actual hosted browser checks. Physical iPad singing/speaker behaviour remains pending.

Pre-publication review found exact supplied-score pitch/duration/coordinate evidence in a research note and fixture test. Both remain local and are excluded from the initial public history. No other blocker was found. Previously reviewed app/vendor architecture, local recognition accuracy, physical singing, music-ownership questions and not-yet-run hosted checks were outside that deployment review. Local recognition remains available, supplied music stays unpublished, and actual hosted verification is performed separately.

## Verified publication — 9 October 2026

- Public repo https://github.com/verywaterrrr/sight. has the requested exact name and public visibility.
- HTTPS website https://verywaterrrr.github.io/sight./ is live.
- [Initial GitHub Actions deployment](https://github.com/verywaterrrr/sight./actions/runs/37896742944) passed 33 tests, public build and Pages deployment.
- The actual hosted browser check passed demo practice, orientations/page turns, shared parts/rhythm, Web Audio/metronome/synthetic microphone, page filtering/reinclusion, corrections/reload and PDF-only selected-page upload/save. No recognition API request occurred.
- The remote tracked tree excludes private score artifacts/evidence. The website returns404 for local trust material.

New source pushes to main redeploy both GitHub Pages and Railway automatically. The initial publication above used viewing-only imports; Railway adds hosted recognition. Physical microphone/speaker behaviour remains pending.
