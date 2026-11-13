import { STEP } from './content.js';

// Fixed simulation steps, one owned frame request, no background catch-up.
export function createLoop({ game, render, publish, speed, request = requestAnimationFrame, cancel = cancelAnimationFrame }) {
  let frame = null, last = null, accumulator = 0, sincePublish = 0, disposed = false;
  const metrics = { frames: 0, steps: 0, publications: 0, droppedSeconds: 0 };
  const send = () => { metrics.publications++; publish(); };
  function tick(timestamp) {
    frame = null;
    if (disposed) return;
    metrics.frames++;
    const current = game();
    if (current.status === 'running') {
      const raw = last === null ? 0 : Math.max(0, (timestamp - last) / 1000);
      const elapsed = Math.min(0.1, raw);
      metrics.droppedSeconds += Math.max(0, raw - elapsed);
      accumulator += elapsed * speed();
      sincePublish += elapsed;
      while (accumulator + 1e-10 >= STEP && current.status === 'running') {
        current.step(STEP); accumulator -= STEP; metrics.steps++;
      }
      if (sincePublish >= 0.1 || current.status !== 'running') { sincePublish = 0; send(); }
    } else { accumulator = 0; sincePublish = 0; }
    render();
    if (current.status === 'running') { last = timestamp; invalidate(); }
    else last = null;
  }
  function invalidate() {
    if (!disposed && frame === null) frame = request(tick);
  }
  return {
    invalidate,
    command() {
      if (disposed) return;
      last = null; accumulator = 0; sincePublish = 0;
      send(); invalidate();
    },
    stats: () => ({ ...metrics, pendingFrames: frame === null ? 0 : 1, disposed }),
    dispose() {
      disposed = true;
      if (frame !== null) cancel(frame);
      frame = null; last = null; accumulator = 0;
    },
  };
}
