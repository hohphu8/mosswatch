# GyosJS dogfood — Mosswatch

Runtime: published npm `gyosjs@0.5.5`, `gyosjs/csp` entry. No patched node_modules, private-source alias or new framework API.

## The integration being tested

Mosswatch puts a continuously running simulation next to reactive controls. The engine uses ordinary JavaScript objects for enemies, projectiles, cooldowns and positions. Canvas reads those objects directly. This avoids making every moving coordinate a reactive dependency.

The scope factory owns one engine and one browser lifetime. A small frozen snapshot contains money, health, wave/status, counts and tower metadata. Computed values derive selected-tower information, prices, button availability and the numbered pad controls. `g-key` uses stable pad/type IDs. The renderer itself does not read state through a reactive effect: the frame loop explicitly draws it.

During battle, the bridge checks for a changed snapshot at most once per 100 ms of foreground elapsed time. Commands publish immediately. Identical snapshots do not write the signal again. The bridge's `publications` counter counts checks/callbacks, not DOM mutations or signal writes. Rendering and the reactive UI therefore have separate update budgets.

`createLoop` owns at most one requested animation frame, uses fixed 1/60-second simulation steps, and caps elapsed time at 100 ms before applying speed. Rendering stops once a paused/ready/terminal scene has been drawn; input, resize and selection invalidate a static scene on demand. This trades catching up on a slow device for responsive bounded work. Switching tabs pauses rather than simulating missed background time.

## Ownership and cleanup

Scope `onUnmount` aborts native listeners, disconnects ResizeObserver, cancels the owned frame, disposes the cached background canvas and closes dialogs. Every fresh mount creates its own AbortController. Restart replaces the engine but keeps the same scheduler/renderer; it does not register another set of listeners.

Dev-only observation exposes snapshot/loop counters and explicit cleanup/remount for browser tests. It is excluded from the production build. The remount probe replaces the old root with original template markup and calls actual Gyos cleanup/mount. The lifecycle test checks observer count, pending frames, shortcut interception, fresh starting state and retired counters across repeated cycles.

## Findings

1. **App economy bug, fixed:** `Math.floor(90 * 0.7)` is 62 due to floating-point representation. The integer-price refund rule now uses `Math.floor(spent * 7 / 10)`, giving 63. The domain and browser tests cover the upgraded-arrow sale.
2. **App focus integration, fixed:** hiding the start-wave button can move focus to `body`. A keyboard listener attached only to the inner game root then misses P. The owned document listener accepts the root or body, ignores editable controls/modifiers/dialogs, and is aborted at unmount. Browser regression covers the transition from start to pause.
3. **Touch design:** a full desktop sidebar below the map required excessive mobile scrolling. A selected pad now opens a compact bottom panel with type/build/upgrade/sell controls and an explicit close button. Hit testing chooses the nearest pad within a minimum 44-CSS-pixel target diameter; rendering stays scaled to the authored world. Physical-device usability remains worth testing.
4. **Test integration:** pointer coordinates must be computed after scrolling the Canvas into view. A test that clicked an offscreen coordinate after restarting from the result screen produced a false replay failure; corrected helper and replay journey pass independently.
5. **App pause UX, fixed:** a full-map pause overlay blocked pointer selection even though building while paused is allowed. A small banner with `pointer-events: none` now communicates the paused state without covering input. The regression selects a different pad and builds while the simulation remains paused.

No confirmed GyosJS core defect has been isolated. Canvas scheduling, combat simulation, pointer geometry and browser resource ownership are application concerns, not reasons to add a new global Gyos API.

## Useful documentation follow-up

A focused recipe could show how to bridge an external engine to GyosJS: keep engine internals plain, expose small snapshots through signals/computed, publish commands immediately, and attach the engine lifetime to the scope. Explain the snapshot/check frequency separately from render frequency. Avoid prescribing this architecture for simple counters or forms whose scope fields already work well.

See `VALIDATION.md` for final evidence and the limits of the measurements. Local virtual-clock tests cannot establish a universal FPS, touch-device performance or absence of every memory leak.
