# Mosswatch — Trạm Rêu

A Vietnamese Canvas tower-defense mini-game built with published **GyosJS 0.5.5** and plain JavaScript. Protect the forest beacon through five authored waves. No account, backend, telemetry, remote assets or sound.

## Play locally

Use Node 22+:

```sh
npm ci
npm run dev
```

Open http://127.0.0.1:4230. Build with `npm run build`; `npm run preview` serves the production output at http://127.0.0.1:4231. Host `dist/` at a static site's domain root. No remote is configured automatically; the owner chooses the repository and hosting.

## How to play

- Start with 180 seeds and 20 beacon health. Select one of the twelve circular build pads, choose a tower, then confirm construction. Click/tap a tower to upgrade or sell it. The numbered pad controls also support keyboard selection.
- **Chòi Nỏ (50):** fast single-target shots. **Pháo Hạt (90):** area damage within 62 world units. **Tháp Sương (65):** slows its target by 45% for 1.6 simulation seconds. Slow refreshes rather than stacking.
- Towers reach level 3. Upgrades increase damage/range and shorten firing intervals. Selling returns the integer floor of 70% of total investment; already-fired projectiles finish normally.
- Call each wave when ready. Kills and completed waves earn seeds. You may build, upgrade or sell while enemies move, or pause to plan. Towers prioritize the furthest-progressed enemy in range; projectiles whose targets disappear are discarded.
- **Bọ than** and **Cánh lửa** cost one health if they reach the beacon; **Giáp đá** costs three and takes 72% damage from every tower. Survive all five waves with positive health to win.
- Use 1×/2×/3× speed. **P** pauses/resumes when focus is in the game; **Escape** dismisses a dialog or clears selection. Opening help/restart or leaving the tab pauses play. Closing a dialog or returning to the tab does not automatically resume.
- The game does not save a match. Reload starts over. Restart requires confirmation. No offline-reload guarantee is provided.

## Structure

- `src/content.js`: authored path, build pads, towers and waves.
- `src/engine.js`: simulation and economy independent of Canvas/GyosJS.
- `src/loop.js`: owned requestAnimationFrame scheduling and fixed 1/60-second steps; large time gaps are capped instead of replaying a background battle.
- `src/renderer.js`: cached map artwork, entity rendering, viewport scaling and hit testing. Visuals are drawn in code without downloaded assets.
- `src/main.js`: GyosJS scope factory, small UI snapshots, commands, input and resource lifetime. Positions/projectiles remain in the engine rather than reactive state.

## Checks

```sh
npm test
npm run build
npx playwright install
npm run test:e2e
```

Windows Chromium tests use installed Google Chrome. The test runner owns port 4230 (development) or 4231 (production). Set `MOSSWATCH_PRODUCTION=1` to run the browser suite against the build. Generated reports, traces and screenshots are ignored in `.local/` and `test-results/`.

See [plan](docs/PLAN.md), [validation and limits](docs/VALIDATION.md), and [GyosJS findings](docs/DOGFOOD.md).
