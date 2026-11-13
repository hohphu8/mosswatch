import { PADS, TOWERS, ENEMIES, WAVES, PATH_LENGTH, pointAt, towerStats, STEP } from './content.js';

export class Game {
  constructor() {
    this.status = 'ready';
    this.money = 180;
    this.health = 20;
    this.wave = 0;
    this.kills = 0;
    this.leaked = 0;
    this.time = 0;
    this.spawned = 0;
    this.waveTime = 0;
    this.nextId = 1;
    this.towers = [];
    this.enemies = [];
    this.projectiles = [];
    this.effects = [];
  }
  get terminal() { return this.status === 'won' || this.status === 'lost'; }
  assertEditable() { if (this.terminal) throw Error('Trận đã kết thúc. Hãy bắt đầu một trận mới.'); }
  towerAt(pad) { return this.towers.find(tower => tower.pad === pad); }
  place(pad, type) {
    this.assertEditable();
    if (!Number.isInteger(pad) || !PADS[pad] || !Object.hasOwn(TOWERS, type)) throw Error('Vị trí hoặc loại tháp không hợp lệ.');
    if (this.towerAt(pad)) throw Error('Ô này đã có tháp.');
    const definition = TOWERS[type];
    if (this.money < definition.cost) throw Error('Chưa đủ hạt để xây tháp này.');
    this.money -= definition.cost;
    this.towers.push({ id: this.nextId++, pad, type, level: 1, spent: definition.cost, cooldown: 0, angle: -Math.PI / 2, x: PADS[pad].x, y: PADS[pad].y });
  }
  upgrade(pad) {
    this.assertEditable();
    const tower = this.towerAt(pad);
    if (!tower) throw Error('Chọn một tháp để nâng cấp.');
    const cost = towerStats(tower.type, tower.level).upgradeCost;
    if (cost === null) throw Error('Tháp đã đạt cấp tối đa.');
    if (this.money < cost) throw Error('Chưa đủ hạt để nâng cấp.');
    this.money -= cost;
    tower.spent += cost;
    tower.level++;
  }
  sell(pad) {
    this.assertEditable();
    const tower = this.towerAt(pad);
    if (!tower) throw Error('Ô này chưa có tháp.');
    const refund = Math.floor(tower.spent * 0.7);
    this.money += refund;
    this.towers = this.towers.filter(item => item !== tower);
    return refund;
  }
  startWave() {
    if (this.status !== 'ready' || this.wave >= WAVES.length) throw Error('Hoàn thành đợt hiện tại trước khi gọi đợt mới.');
    this.wave++;
    this.spawned = 0;
    this.waveTime = 0;
    this.status = 'running';
  }
  pause() { if (this.status === 'running') this.status = 'paused'; }
  resume() { if (this.status === 'paused') this.status = 'running'; }
  spawn(type, scale) {
    const data = ENEMIES[type];
    const health = Math.round(data.health * scale);
    this.enemies.push({ id: this.nextId++, type, health, maxHealth: health, distance: 0, slowTime: 0, slowFactor: 1, ...pointAt(0) });
    this.spawned++;
  }
  hit(enemy, amount, stats) {
    if (enemy.health <= 0) return;
    enemy.health -= amount * ENEMIES[enemy.type].armor;
    if (stats.slow) {
      enemy.slowTime = Math.max(enemy.slowTime, stats.duration);
      enemy.slowFactor = stats.slow;
    }
    if (enemy.health <= 0) {
      this.money += ENEMIES[enemy.type].reward;
      this.kills++;
      this.effects.push({ x: enemy.x, y: enemy.y, life: 0.32, max: 0.32, radius: 22, color: '#efc575' });
    }
  }
  step(dt = STEP) {
    if (!Number.isFinite(dt) || dt <= 0 || dt > 0.05) throw Error('Simulation step must be in (0, 0.05].');
    if (this.status !== 'running') return;
    this.time += dt;
    this.waveTime += dt;
    const wave = WAVES[this.wave - 1];
    while (this.spawned < wave.count && this.waveTime >= this.spawned * wave.interval) {
      this.spawn(wave.order[this.spawned % wave.order.length], wave.scale);
    }
    for (const effect of this.effects) effect.life -= dt;
    this.effects = this.effects.filter(effect => effect.life > 0);

    for (const enemy of this.enemies) {
      enemy.slowTime = Math.max(0, enemy.slowTime - dt);
      enemy.distance += ENEMIES[enemy.type].speed * (enemy.slowTime > 0 ? enemy.slowFactor : 1) * dt;
      Object.assign(enemy, pointAt(enemy.distance));
      if (enemy.distance >= PATH_LENGTH) {
        this.health = Math.max(0, this.health - ENEMIES[enemy.type].damage);
        this.leaked++;
        enemy.health = 0;
      }
    }
    this.enemies = this.enemies.filter(enemy => enemy.health > 0);
    if (this.health <= 0) {
      this.status = 'lost';
      this.projectiles = [];
      this.effects = [];
      return;
    }

    for (const tower of this.towers) {
      const stats = towerStats(tower.type, tower.level);
      tower.cooldown = Math.max(0, tower.cooldown - dt);
      const target = this.enemies.filter(enemy => Math.hypot(enemy.x - tower.x, enemy.y - tower.y) <= stats.range)
        .sort((a, b) => b.distance - a.distance || a.id - b.id)[0];
      if (!target) continue;
      tower.angle = Math.atan2(target.y - tower.y, target.x - tower.x);
      if (tower.cooldown > 0) continue;
      tower.cooldown = stats.interval;
      this.projectiles.push({ x: tower.x, y: tower.y, target: target.id, type: tower.type, stats, life: 3 });
    }
    const survivors = [];
    for (const shot of this.projectiles) {
      shot.life -= dt;
      const target = this.enemies.find(enemy => enemy.id === shot.target && enemy.health > 0);
      if (!target || shot.life <= 0) continue;
      const distance = Math.hypot(target.x - shot.x, target.y - shot.y);
      const travel = shot.stats.projectileSpeed * dt;
      if (distance <= travel) {
        if (shot.stats.splash) {
          const center = { x: target.x, y: target.y };
          for (const enemy of this.enemies) {
            if (Math.hypot(enemy.x - center.x, enemy.y - center.y) <= shot.stats.splash) this.hit(enemy, shot.stats.damage, shot.stats);
          }
          this.effects.push({ ...center, life: 0.3, max: 0.3, radius: shot.stats.splash, color: shot.stats.color });
        } else this.hit(target, shot.stats.damage, shot.stats);
      } else {
        shot.x += (target.x - shot.x) / distance * travel;
        shot.y += (target.y - shot.y) / distance * travel;
        survivors.push(shot);
      }
    }
    this.projectiles = survivors;
    this.enemies = this.enemies.filter(enemy => enemy.health > 0);
    if (this.spawned === wave.count && this.enemies.length === 0) {
      this.projectiles = [];
      this.effects = [];
      this.money += wave.bonus;
      this.status = this.wave === WAVES.length ? 'won' : 'ready';
    }
  }
  snapshot() {
    return Object.freeze({
      status: this.status, money: this.money, health: this.health,
      wave: this.wave, kills: this.kills, leaked: this.leaked,
      remaining: this.status === 'running' || this.status === 'paused' ? WAVES[this.wave - 1].count - this.spawned + this.enemies.length : 0,
      towers: Object.freeze(this.towers.map(({ pad, type, level, spent }) => Object.freeze({ pad, type, level, spent }))),
    });
  }
}
