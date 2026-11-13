# Validation — 2026-11-13

Tested on Windows with Node 22.18.0, Vite 6.4.6, Playwright 1.55.1 and published npm GyosJS 0.5.5 (`gyosjs/csp`). Chromium uses installed Chrome; Firefox/WebKit use Playwright engines. WebKit is not a physical Safari/iPhone test.

## Results

| Check | Evidence |
| --- | --- |
| Domain and scheduler tests | 11 passed |
| Full development browser suite | 24 passed, no skips/failures/flaky cases; 5.4 minutes |
| Full production browser suite | 18 passed, 6 intentional skips, no failures/flaky cases; 4.6 minutes |
| Final pause/mobile regression | 6 development + 6 production cases passed across all three engines; no failures/flaky cases |
| Production build | Passed: HTML 11.76 kB (gzip 4.27), CSS 16.39 kB (gzip 4.47), JS 254.59 kB (gzip 80.84) |

The full suites ran concurrently on separate ports. After their completion, visual/interaction review found that the pause overlay prevented choosing a different Canvas pad while paused. It was replaced by a non-intercepting banner. The targeted final regression adds actual pad selection and construction while paused and checks all three engines plus mobile layout; no engine or bridge code changed after the full suites.

The six production skips are two dev-only probes on each engine: direct bridge observation and actual repeated cleanup/remount. Production still runs complete gameplay, victory/defeat/replay, input, pause/visibility, touch/layout and Canvas-failure journeys. The dev observation object is checked absent from production.

Raw full reports are retained locally in ignored `.local/full-development-results.json` and `.local/full-production-results.json`. Latest targeted reports use `.local/development-results.json` and `.local/production-results.json`. Traces/screenshots are generated under ignored `test-results/` and `.local/`.

## Requirement-to-evidence map

| Requirement | Verification |
| --- | --- |
| One map, three towers, five waves | Authored `content.js`; complete UI campaign starts each wave, buys mixed towers and upgrades using only earned money, reaches victory and restarts |
| Distinct combat roles | Unit checks for single-target damage, armor, slow/expiration, area damage with an outside target and stale projectile discard |
| Economy and tower lifecycle | Invalid commands preserve money, costs/level cap, 70% integer refund including the 90-seed regression; browser build/upgrade/sell/unaffordable/restart journeys |
| Victory and defeat | Both are reached through real UI commands and frame callbacks on all three engines, in dev and production; no engine money/health cheats |
| Pause/resume/speeds | Fixed-step unit tests verify 3× progression and long-gap cap; browser checks P, pause image stability, help, explicit resume, simulated hidden/visible transitions and paused construction |
| Mouse, touch, keyboard | Canvas coordinates, actual emulated touch taps, native focus/Enter on numbered pads, Escape and dialog-trigger focus |
| Responsive UI | No page overflow at 320, 390, 768 and 1440 widths; inspected desktop battle and mobile construction/upgrade screenshots |
| Reactive bridge | Small immutable UI snapshot, signal/computed bindings; measured bridge checks separately from frames; immediate command feedback exercised by economy assertions |
| Restart and mount lifetime | Eight restarts retain one pending frame; six fresh root replacements/mounts return to initial money/status with one ResizeObserver; retired counters stay unchanged and shortcut listeners stop intercepting |
| Failure handling | Simulated unavailable Canvas shows an actionable error and disables build/start; help remains accessible |
| Runtime isolation | Representative browser journey records no page errors, CSP violations or external resource requests; npm lockfile uses official registry |
| Delivery | Independent Git repo, incremental commits, README/plan/dogfood/validation, built static `dist/`; no remote created |

## Rendering and bridge observations

Five-second Playwright virtual-clock sample during active play:

| Engine | Frame callbacks | Fixed simulation steps | Bridge checks | Pending frames after cleanup |
| --- | ---: | ---: | ---: | ---: |
| Chrome | 315 | 303 | 45 | 0 |
| Firefox | 315 | 303 | 45 | 0 |
| WebKit | 314 | 302 | 45 | 0 |

The virtual-clock test intentionally executes real scheduled callbacks while advancing time; it is not an FPS benchmark. Checks call `publish`; unchanged snapshots do not write a signal, so this count is not DOM mutations. Command publications are immediate and outside the periodic limit.

A separate normal-clock headless Chrome sample observed **301 callbacks, 300 simulation steps and 43 bridge checks in 5004.9 ms**, with one pending frame and no dropped time. It ran during other browser tests. This confirms real-time progression on this machine, not a performance guarantee for other hardware. Raw samples: `.local/bridge-{chromium,firefox,webkit}.json`, `.local/real-clock-sample.json`.

## Visual review and limits

Reviewed `.local/desktop-prod.png`, `.local/mobile-prod.png`, `.local/battle-desktop.png` and `.local/mobile-tray.png`: map path/pads, range indication, moving enemies and health bars, HUD, tower cards, compact mobile build controls and layout bounds. Mobile has a fixed bottom panel only while a pad is selected, with an explicit close button. Canvas art, icons and favicon are local code-drawn assets.

- This is one casual scenario, not a general tower-defense engine or a balanced competitive game. A tested mixed-tower strategy can win; arbitrary placement is not guaranteed to win.
- No mid-battle persistence, audio, accounts or offline reload promise. Reload starts a new match; the UI states this.
- The game limits long foreground frame gaps and pauses on hidden tabs. Slow machines may advance simulation more slowly instead of performing unbounded catch-up.
- Touch is emulated, not tested on physical phones. Keyboard pad selection is available, but this is not a full nonvisual gameplay or accessibility conformance claim.
- Cleanup assertions cover owned callbacks/listeners/observers and retired counters. No long-duration heap study was performed; these checks do not prove the absence of every leak.
- No confirmed GyosJS core defect was isolated. See [DOGFOOD.md](DOGFOOD.md) for integration findings; no core API or version bump is part of this delivery.

## Reproduce

Use the commands in [README](../README.md). Full production check in PowerShell, after `npm run build`:

```powershell
$env:MOSSWATCH_PRODUCTION = '1'
npm run test:e2e
Remove-Item Env:MOSSWATCH_PRODUCTION
```

Ports 4230/4231 must be free; Playwright starts/stops its own Vite server. The focused post-build check is `npx playwright test --grep 'pause, help|touch selection'`.
