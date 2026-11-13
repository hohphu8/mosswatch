# Mosswatch — Trạm Rêu

Fourth GyosJS dogfood project: a complete Vietnamese, browser-local Canvas tower-defense game. Separate Git repository with incremental local commits. Owner chooses a remote later; do not create/push one automatically.

## Accepted scope

- One authored forest map with a fixed enemy route and 12 build pads; three distinct tower types (fast single target, area damage, slowing); five authored waves with light, fast and armored enemies.
- Place/select/upgrade/sell towers, integer economy, reactive money/health/wave/selection UI; explicit start-wave, pause/resume, 1×/2×/3× speed, confirmed restart, victory/defeat and replay.
- Mouse/touch canvas selection plus keyboard-accessible pad controls. Responsive Vietnamese UI, visible targeting/range, useful onboarding and error feedback, reduced-motion handling.
- Pure fixed-step simulation independent of GyosJS and Canvas. Canvas reads engine entities; the reactive UI receives compact snapshots at most ten times per second during play, with immediate publication on player commands. Do not push projectile positions through signals.
- Scope-owned frame scheduler, ResizeObserver, native listeners and dialogs. Switching tab pauses the battle and requires explicit resume. Restart must not accumulate engines or frame callbacks; unmount must release browser resources.
- Local-only game with no account, telemetry, server, paid assets or third-party game engine. No mid-battle save or offline reload promise in this first version; clearly explain reload starts a new game. No sound in v1.

## Delivery and evidence

1. Engine, authored content and domain tests (economy, combat, waves, deterministic stepping, win/loss).
2. Canvas renderer, reactive bridge and complete responsive product; browser preview.
3. Real pointer/touch/keyboard journeys, production checks, repeated restart/disposal, visual review, measured bridge/frame behavior; document findings and limits.

Use published GyosJS 0.5.5. Isolate suspected core defects independently before any framework patch; do not add APIs just to shorten game code. Never claim a universal frame-rate or memory guarantee from local automated measurements.
