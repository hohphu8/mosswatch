import test from "node:test";
import assert from "node:assert/strict";
import { Game } from "../src/engine.js";
import {
  PADS,
  PATH_LENGTH,
  pointAt,
  towerStats,
  STEP,
} from "../src/content.js";

function finishWave(game, maxSeconds = 100) {
  for (let i = 0; i < maxSeconds / STEP && game.status === "running"; i++)
    game.step();
  assert.notEqual(game.status, "running", "wave must terminate");
}

test("economy validates commands atomically and selling cannot generate money", () => {
  const game = new Game();
  for (const [pad, type] of [
    [-1, "arrow"],
    [0, "__proto__"],
    [0.5, "arrow"],
  ])
    assert.throws(() => game.place(pad, type));
  assert.equal(game.money, 180);
  game.place(2, "cannon");
  assert.equal(game.money, 90);
  assert.throws(() => game.place(2, "arrow"));
  game.upgrade(2);
  assert.equal(game.money, 25);
  assert.throws(() => game.upgrade(2));
  assert.equal(game.towerAt(2).level, 2);
  assert.equal(game.sell(2), 108);
  assert.equal(game.money, 133);
  assert.throws(() => game.sell(2));
  const arrow = new Game();
  arrow.place(0, "arrow");
  arrow.upgrade(0);
  assert.equal(
    arrow.sell(0),
    63,
    "70% of 90 must not lose one seed to floating-point rounding",
  );
});

test("route interpolation follows corners and clamps at the beacon", () => {
  assert.deepEqual(pointAt(0), { x: -30, y: 210 });
  assert.deepEqual(pointAt(240), { x: 210, y: 210 });
  assert.deepEqual(pointAt(300), { x: 210, y: 150 });
  assert.deepEqual(pointAt(PATH_LENGTH + 10), { x: 795, y: 210 });
});

test("pause freezes all simulation state; resume continues; commands cannot overlap waves", () => {
  const game = new Game();
  game.place(0, "arrow");
  game.startWave();
  for (let i = 0; i < 120; i++) game.step();
  game.pause();
  const frozen = JSON.stringify(game);
  for (let i = 0; i < 180; i++) game.step();
  assert.equal(JSON.stringify(game), frozen);
  assert.throws(() => game.startWave());
  game.resume();
  game.step();
  assert.ok(game.time > 2);
  assert.throws(() => game.step(5));
});

test("unprotected route loses, terminal state cannot keep rewarding or accept commands", () => {
  const game = new Game();
  game.startWave();
  finishWave(game);
  assert.equal(game.health, 10);
  assert.equal(game.money, 225);
  game.startWave();
  finishWave(game);
  assert.equal(game.status, "lost");
  assert.equal(game.health, 0);
  const ended = JSON.stringify(game);
  for (let i = 0; i < 100; i++) game.step();
  assert.equal(JSON.stringify(game), ended);
  assert.throws(() => game.place(0, "arrow"));
  assert.throws(() => game.startWave());
});

test("damage awards each kill once; frost slows then expires and armor reduces damage", () => {
  const game = new Game();
  game.startWave();
  game.spawn("shell", 1);
  const enemy = game.enemies[0];
  const stats = towerStats("frost");
  game.hit(enemy, 10, stats);
  assert.equal(enemy.health, 167.8);
  game.step();
  assert.ok(Math.abs(enemy.distance - 27 * 0.55 * STEP) < 1e-10);
  for (let i = 0; i < 100; i++) game.step();
  assert.equal(enemy.slowTime, 0);
  const money = game.money;
  game.hit(enemy, 10000, stats);
  game.hit(enemy, 10000, stats);
  assert.equal(game.money, money + 15);
  assert.equal(game.kills, 1);
});

test("fixed steps are deterministic and UI snapshots expose no live entity state", () => {
  const a = new Game(),
    b = new Game();
  for (const game of [a, b]) {
    game.place(2, "arrow");
    game.place(4, "cannon");
    game.startWave();
  }
  for (let i = 0; i < 2400; i++) {
    a.step();
    b.step();
  }
  assert.equal(JSON.stringify(a), JSON.stringify(b));
  const snapshot = a.snapshot();
  assert.ok(Object.isFrozen(snapshot.towers[0]));
  assert.equal(snapshot.enemies, undefined);
  assert.equal(snapshot.time, undefined);
  assert.deepEqual(Object.keys(snapshot.towers[0]).sort(), [
    "level",
    "pad",
    "spent",
    "type",
  ]);
});

test("cannon impact damages nearby enemies only and stale projectiles cannot hit a new target", () => {
  const game = new Game();
  game.startWave();
  for (const distance of [300, 310, 600]) {
    game.spawn("ember", 1);
    Object.assign(game.enemies.at(-1), { distance, ...pointAt(distance) });
  }
  const [target, nearby, outside] = game.enemies;
  game.projectiles.push({
    x: target.x,
    y: target.y,
    target: target.id,
    type: "cannon",
    stats: towerStats("cannon"),
    life: 3,
  });
  game.step();
  assert.equal(target.health, 26);
  assert.equal(nearby.health, 26);
  assert.equal(outside.health, 62);
  game.projectiles.push({
    x: outside.x,
    y: outside.y,
    target: -999,
    type: "cannon",
    stats: towerStats("cannon"),
    life: 3,
  });
  game.step();
  assert.equal(outside.health, 62);
  assert.equal(game.projectiles.length, 0);
});

test("tower level caps at three and actor IDs stay unique across pads and enemies", () => {
  const game = new Game();
  game.place(5, "arrow");
  game.upgrade(5);
  game.upgrade(5);
  assert.equal(game.money, 25);
  assert.equal(game.towerAt(5).level, 3);
  assert.throws(() => game.upgrade(5));
  game.startWave();
  for (let i = 0; i < 120; i++) game.step();
  const ids = [...game.towers, ...game.enemies].map((actor) => actor.id);
  assert.equal(new Set(ids).size, ids.length);
});

test("five-wave campaign is winnable with an explicit mixed-tower strategy", () => {
  const game = new Game();
  game.place(2, "arrow");
  game.place(4, "arrow");
  game.place(6, "frost");
  const steps = [];
  for (let wave = 1; wave <= 5; wave++) {
    if (wave > 1) {
      // Spend only earned money, no direct state mutation or mid-wave cheats.
      for (const pad of [2, 4]) {
        const tower = game.towerAt(pad);
        const cost = towerStats(tower.type, tower.level).upgradeCost;
        if (cost !== null && game.money >= cost) game.upgrade(pad);
      }
      for (const pad of [9, 5, 0, 10])
        if (!game.towerAt(pad) && game.money >= 90) game.place(pad, "cannon");
      for (const tower of [...game.towers]) {
        const cost = towerStats(tower.type, tower.level).upgradeCost;
        if (cost !== null && game.money >= cost) game.upgrade(tower.pad);
      }
    }
    game.startWave();
    finishWave(game);
    steps.push({
      wave,
      health: game.health,
      money: game.money,
      kills: game.kills,
      towers: game.towers.length,
    });
    assert.notEqual(game.status, "lost", JSON.stringify(steps));
  }
  assert.equal(game.status, "won", JSON.stringify(steps));
  assert.ok(game.health > 0);
  assert.equal(game.kills + game.leaked, 84);
  assert.ok(game.towers.length <= PADS.length);
});
