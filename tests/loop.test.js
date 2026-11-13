import test from 'node:test';
import assert from 'node:assert/strict';
import { createLoop } from '../src/loop.js';
import { Game } from '../src/engine.js';

function fixture() {
  let game = new Game(), speed = 1, id = 0, time = 0, renders = 0, publishes = 0;
  const queue = new Map();
  const loop = createLoop({ game: () => game, speed: () => speed, render: () => renders++, publish: () => publishes++, request: fn => { queue.set(++id, fn); return id; }, cancel: id => queue.delete(id) });
  return { loop, queue, get game() { return game; }, speed: n => { speed = n; }, reset: () => { game = new Game(); loop.command(); }, counts: () => ({ renders, publishes }), tick(ms = 1000 / 60) { time += ms; const entries = [...queue]; queue.clear(); for (const [, fn] of entries) fn(time); } };
}

test('idle invalidations coalesce, play has one frame, pause and disposal stop scheduling', () => {
  const f = fixture();
  for (let i = 0; i < 20; i++) f.loop.invalidate();
  assert.equal(f.queue.size, 1); f.tick(); assert.equal(f.queue.size, 0);
  f.game.startWave(); f.loop.command();
  for (let i = 0; i < 61; i++) { assert.equal(f.queue.size, 1); f.tick(); }
  assert.ok(Math.abs(f.game.time - 1) < 0.001);
  assert.ok(f.counts().publishes <= 11);
  assert.ok(f.counts().renders > 50);
  f.game.pause(); f.loop.command(); f.tick();
  assert.equal(f.queue.size, 0);
  f.game.resume(); f.loop.command(); f.tick();
  f.loop.dispose(); assert.equal(f.queue.size, 0);
  const before = f.counts(); f.loop.command(); f.loop.invalidate(); f.tick();
  assert.deepEqual(f.counts(), before);
});

test('speed multiplies fixed steps, long frames are capped, repeated restarts never multiply loops', () => {
  const f = fixture(); f.speed(3); f.game.startWave(); f.loop.command(); f.tick();
  for (let i = 0; i < 60; i++) f.tick();
  assert.ok(Math.abs(f.game.time - 3) < 0.001);
  const before = f.game.time; f.tick(60000);
  assert.ok(f.game.time - before < 0.301);
  assert.ok(f.loop.stats().droppedSeconds > 59);
  for (let i = 0; i < 30; i++) { f.reset(); f.game.startWave(); f.loop.command(); assert.equal(f.queue.size, 1); f.tick(); }
  f.reset(); f.tick(); assert.equal(f.queue.size, 0);
});
