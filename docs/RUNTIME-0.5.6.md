# GyosJS 0.5.6 rollout — 2026-11-15

The app now pins the published `gyosjs@0.5.6` CSP runtime from the official npm registry. Canvas simulation, reactive bridge, game rules, wave content and input behavior are unchanged.

Validated locally on Windows with Node 22.18.0, Vite 6.4.6 and Playwright 1.55.1 (installed Chrome plus Playwright Firefox/WebKit):

- `npm ci --registry=https://registry.npmjs.org` and `npm audit --audit-level=high`: passed, zero audit findings.
- `npm test`: 11 domain/scheduler tests passed; `npm run build` passed.
- `MOSSWATCH_PRODUCTION=1 npm run test:e2e`: 18 passed, 6 existing intentional skips for development-only bridge/lifecycle probes; no failures. Covers actual UI victory through all five waves, defeat/replay, construction/upgrades/selling, input, pause/visibility, responsive layout and Canvas failure.
- Installed CSP bundles/styles match the verified official npm package bytes.

The first browser run was interrupted. These results come from the completed full rerun, not partial logs. The [earlier validation](VALIDATION.md) retains its original runtime and measurements. This rollout is not an FPS benchmark, public deployment or physical-device Safari test.
