# GitHub Pages deployment

Requested outcome: a public repository named `sight.` and its web app hosted by GitHub Pages, preserving the approved design and separate project folder.

Public scope: application source and local recognition-provider code; an original demo; selected third-party notices. Exclude the supplied choir PDF and extracted notation, local runtime/cache/uploads, certificates/profiles, screenshots and personal handoff records.

The local server serves private sample configuration only when the private fixtures exist. The static public configuration selects the original demo and disables server recognition. Public PDF selection saves a viewing-only score; existing demo page selections scope playback to included pages and preserve corrections when pages are reintroduced. No recognition API requests are made on Pages.

The build uses an explicit allowlist, relative asset paths and GitHub's Pages artifact/deployment workflow. GitHub Pages is static hosting: [GitHub documentation](https://docs.github.com/en/pages/getting-started-with-github-pages/what-is-github-pages). The workflow follows [GitHub's custom workflow documentation](https://docs.github.com/en/pages/getting-started-with-github-pages/using-custom-workflows-with-github-pages).

Verification gates: 33 unit tests; public build contents; browser subpath, demo playback and PDF-only import; repository public visibility; Pages deployment status; actual hosted browser checks. Physical iPad singing/speaker behaviour remains pending.

Pre-publication review found exact supplied-score pitch/duration/coordinate evidence in a research note and fixture test. Both remain local and are excluded from the initial public history. No other blocker was found. Previously reviewed app/vendor architecture, local recognition accuracy, physical singing, music-ownership questions and not-yet-run hosted checks were outside that deployment review. Local recognition remains available, supplied music stays unpublished, and actual hosted verification is performed separately.
