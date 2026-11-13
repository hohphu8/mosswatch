import {
  WIDTH,
  HEIGHT,
  PATH,
  PADS,
  TOWERS,
  ENEMIES,
  towerStats,
} from "./content.js";

const palette = {
  land: "#25463f",
  shade: "#193b35",
  path: "#b9a786",
  edge: "#776f56",
  grass: "#547465",
  ink: "#eff5dc",
};
const circle = (ctx, x, y, radius, fill) => {
  ctx.beginPath();
  ctx.arc(x, y, radius, 0, Math.PI * 2);
  ctx.fillStyle = fill;
  ctx.fill();
};
function polygon(ctx, points, fill) {
  ctx.beginPath();
  points.forEach(([x, y], i) => (i ? ctx.lineTo(x, y) : ctx.moveTo(x, y)));
  ctx.closePath();
  ctx.fillStyle = fill;
  ctx.fill();
}
function line(ctx, points, color, width) {
  ctx.beginPath();
  points.forEach(({ x, y }, i) => (i ? ctx.lineTo(x, y) : ctx.moveTo(x, y)));
  ctx.strokeStyle = color;
  ctx.lineWidth = width;
  ctx.stroke();
}

function tree(ctx, x, y, size, variant) {
  circle(ctx, x + 3, y + size * 0.4, size * 0.8, "#13352d80");
  ctx.fillStyle = "#796e4e";
  ctx.fillRect(x - 2, y, 4, size * 0.7);
  polygon(
    ctx,
    [
      [x, y - size],
      [x - size * 0.7, y + size * 0.4],
      [x + size * 0.7, y + size * 0.4],
    ],
    variant ? "#365e4b" : "#426c53",
  );
  polygon(
    ctx,
    [
      [x, y - size],
      [x, y + size * 0.4],
      [x + size * 0.7, y + size * 0.4],
    ],
    "#254f3e",
  );
  line(
    ctx,
    [
      { x: x - size * 0.25, y: y - size * 0.08 },
      { x, y: y - size * 0.5 },
    ],
    "#78916a50",
    2,
  );
}

export class Renderer {
  constructor(canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext("2d");
    if (!this.ctx)
      throw Error(
        "Trình duyệt chưa hỗ trợ Canvas 2D. Hãy thử Chrome, Firefox hoặc Safari mới hơn.",
      );
    this.background = document.createElement("canvas");
    this.background.width = WIDTH;
    this.background.height = HEIGHT;
    this.makeBackground();
    this.draws = 0;
    this.disposed = false;
  }
  resize() {
    if (this.disposed) return;
    const rect = this.canvas.getBoundingClientRect();
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const width = Math.max(1, Math.round(rect.width * dpr)),
      height = Math.max(1, Math.round(rect.height * dpr));
    if (this.canvas.width !== width || this.canvas.height !== height) {
      this.canvas.width = width;
      this.canvas.height = height;
    }
  }
  makeBackground() {
    const ctx = this.background.getContext("2d");
    ctx.fillStyle = palette.land;
    ctx.fillRect(0, 0, WIDTH, HEIGHT);
    // Deterministic decorative texture; it is not simulation state.
    for (let i = 0; i < 480; i++) {
      const x = (i * 137.37) % WIDTH,
        y = (i * 91.17) % HEIGHT;
      circle(ctx, x, y, 1 + (i % 3), i % 2 ? "#71907a12" : "#102d2820");
    }
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    line(
      ctx,
      PATH.map((p) => ({ x: p.x + 3, y: p.y + 8 })),
      "#132f2d70",
      62,
    );
    line(ctx, PATH, palette.edge, 51);
    line(ctx, PATH, palette.path, 43);
    line(
      ctx,
      PATH.map((p) => ({ x: p.x, y: p.y - 3 })),
      "#c9b99a60",
      27,
    );
    ctx.setLineDash([2, 18]);
    line(ctx, PATH, "#817b6150", 2);
    ctx.setLineDash([]);
    for (const [x, y, rotation] of [
      [75, 210, 0],
      [210, 135, -Math.PI / 2],
      [335, 90, 0],
      [450, 255, Math.PI / 2],
      [600, 390, 0],
      [690, 300, -Math.PI / 2],
    ]) {
      ctx.save();
      ctx.translate(x, y);
      ctx.rotate(rotation);
      line(
        ctx,
        [
          { x: -5, y: -5 },
          { x: 1, y: 0 },
          { x: -5, y: 5 },
        ],
        "#706f5360",
        2,
      );
      ctx.restore();
    }
    for (const [x, y, size] of [
      [25, 35, 24],
      [65, 45, 28],
      [115, 34, 20],
      [155, 70, 26],
      [55, 340, 31],
      [95, 375, 24],
      [35, 420, 32],
      [80, 475, 35],
      [145, 445, 23],
      [205, 370, 27],
      [255, 425, 33],
      [290, 470, 22],
      [310, 330, 25],
      [335, 285, 17],
      [550, 45, 26],
      [590, 80, 31],
      [630, 35, 22],
      [645, 140, 24],
      [565, 215, 24],
      [815, 435, 29],
      [765, 470, 32],
      [715, 490, 20],
      [680, 470, 23],
      [820, 65, 26],
    ])
      tree(ctx, x, y, size, x % 3);
    // A quiet pond gives the lower-left clearing a landmark.
    ctx.save();
    ctx.translate(195, 495);
    ctx.scale(1, 0.38);
    circle(ctx, 0, 0, 61, "#173f3f");
    circle(ctx, -3, -5, 48, "#47766c");
    ctx.strokeStyle = "#a6cdb64a";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(-5, -4, 33, 0.2, 2.7);
    ctx.stroke();
    ctx.restore();
    for (const [x, y] of [
      [34, 260],
      [300, 210],
      [560, 365],
      [720, 75],
      [650, 440],
    ]) {
      polygon(
        ctx,
        [
          [x - 10, y + 3],
          [x - 6, y - 5],
          [x + 6, y - 7],
          [x + 11, y + 4],
        ],
        "#829082",
      );
      line(
        ctx,
        [
          { x: x - 5, y: y - 4 },
          { x: x + 5, y: y - 5 },
        ],
        "#a6ae97",
        2,
      );
    }
    ctx.font = "600 9px system-ui";
    ctx.fillStyle = "#e1dcc080";
    ctx.fillText("BÌA RỪNG", 16, 250);
    ctx.font = "500 10px system-ui";
    ctx.fillStyle = "#b5cbb980";
    ctx.fillText("ĐẦM RÊU", 157, 529);
    ctx.fillText("LỐI MÒN PHÍA BẮC", 279, 73);
  }
  draw(game, view) {
    if (this.disposed) return;
    this.draws++;
    const ctx = this.ctx;
    ctx.setTransform(
      this.canvas.width / WIDTH,
      0,
      0,
      this.canvas.height / HEIGHT,
      0,
      0,
    );
    ctx.drawImage(this.background, 0, 0);
    // Beacon at the end of the path.
    circle(ctx, 795, 210, 29, "#12352d");
    circle(ctx, 795, 210, 23, "#62816a");
    circle(ctx, 795, 210, 18, "#d7e2ad28");
    polygon(
      ctx,
      [
        [795, 182],
        [808, 205],
        [795, 227],
        [782, 205],
      ],
      game.health > 0 ? "#f5dfa0" : "#75786f",
    );
    polygon(
      ctx,
      [
        [795, 182],
        [808, 205],
        [795, 227],
        [795, 205],
      ],
      game.health > 0 ? "#c9b270" : "#535d54",
    );
    ctx.font = "600 9px system-ui";
    ctx.textAlign = "center";
    ctx.fillStyle = "#f0e7c8";
    ctx.fillText("HẠT SÁNG", 790, 258);

    const selectedTower = game.towerAt(view.selected);
    const selectedType = selectedTower?.type || view.build;
    const selectedPad = PADS[view.selected];
    if (selectedPad && selectedType) {
      const stats = towerStats(selectedType, selectedTower?.level || 1);
      circle(
        ctx,
        selectedPad.x,
        selectedPad.y,
        stats.range,
        `${stats.color}13`,
      );
      ctx.beginPath();
      ctx.arc(selectedPad.x, selectedPad.y, stats.range, 0, Math.PI * 2);
      ctx.strokeStyle = `${stats.color}80`;
      ctx.lineWidth = 1.5;
      ctx.setLineDash([4, 5]);
      ctx.stroke();
      ctx.setLineDash([]);
    }
    for (const pad of PADS) {
      const tower = game.towerAt(pad.id);
      const selected = view.selected === pad.id,
        hovered = view.hover === pad.id;
      circle(ctx, pad.x + 2, pad.y + 5, 23, "#153a3190");
      circle(
        ctx,
        pad.x,
        pad.y,
        22,
        selected ? "#c2d6ae" : hovered ? "#789078" : "#617560",
      );
      circle(ctx, pad.x, pad.y, 18, selected ? "#496657" : "#385448");
      ctx.beginPath();
      ctx.arc(pad.x, pad.y, 22, 0, Math.PI * 2);
      ctx.strokeStyle = selected ? "#f2ddb0" : "#a2b09160";
      ctx.lineWidth = selected ? 2 : 1;
      ctx.stroke();
      if (tower) this.drawTower(tower);
      else {
        ctx.fillStyle = selected ? "#f7e6ba" : "#becbab";
        ctx.font = "500 15px system-ui";
        ctx.textAlign = "center";
        ctx.fillText("+", pad.x, pad.y + 5);
      }
      ctx.font = "600 8px system-ui";
      ctx.fillStyle = "#c7d1bba0";
      ctx.fillText(String(pad.id + 1).padStart(2, "0"), pad.x, pad.y + 35);
    }
    for (const enemy of game.enemies)
      this.drawEnemy(enemy, game.time, view.reduced);
    for (const shot of game.projectiles) {
      const radius =
        shot.type === "cannon" ? 5 : shot.type === "frost" ? 4 : 2.6;
      circle(ctx, shot.x, shot.y, radius + 2, `${shot.stats.color}22`);
      circle(ctx, shot.x, shot.y, radius, shot.stats.color);
    }
    if (!view.reduced)
      for (const effect of game.effects) {
        const progress = 1 - effect.life / effect.max;
        ctx.globalAlpha = (1 - progress) * 0.65;
        ctx.beginPath();
        ctx.arc(
          effect.x,
          effect.y,
          effect.radius * (0.3 + progress * 0.7),
          0,
          Math.PI * 2,
        );
        ctx.strokeStyle = effect.color;
        ctx.lineWidth = 3 * (1 - progress) + 1;
        ctx.stroke();
        ctx.globalAlpha = 1;
      }
    ctx.textAlign = "start";
  }
  drawTower(tower) {
    const ctx = this.ctx,
      color = TOWERS[tower.type].color;
    ctx.save();
    ctx.translate(tower.x, tower.y);
    circle(ctx, 0, 0, 14, "#1c3b32");
    if (tower.type === "frost") {
      polygon(
        ctx,
        [
          [0, -19],
          [10, -4],
          [0, 8],
          [-10, -4],
        ],
        color,
      );
      polygon(
        ctx,
        [
          [0, -19],
          [10, -4],
          [0, 8],
        ],
        "#60a99f",
      );
      circle(ctx, 0, 11, 5, "#a6d1b1");
    } else {
      ctx.save();
      ctx.rotate(tower.angle);
      ctx.fillStyle = "#c6b483";
      ctx.fillRect(-11, -9, 18, 18);
      if (tower.type === "cannon") {
        circle(ctx, -2, 0, 11, color);
        ctx.fillStyle = "#b2725d";
        ctx.fillRect(1, -6, 21, 12);
        circle(ctx, 21, 0, 6, "#463c33");
      } else {
        line(
          ctx,
          [
            { x: -2, y: -13 },
            { x: 8, y: 0 },
            { x: -2, y: 13 },
          ],
          color,
          4,
        );
        line(
          ctx,
          [
            { x: -2, y: -13 },
            { x: -2, y: 13 },
          ],
          "#e8dbac",
          1,
        );
        line(
          ctx,
          [
            { x: -9, y: 0 },
            { x: 17, y: 0 },
          ],
          "#e9c16f",
          3,
        );
      }
      ctx.restore();
    }
    for (let i = 0; i < tower.level; i++)
      circle(ctx, (i - (tower.level - 1) / 2) * 6, 19, 2, "#f2df9c");
    ctx.restore();
  }
  drawEnemy(enemy, time, reduced) {
    const ctx = this.ctx,
      data = ENEMIES[enemy.type];
    const wobble = reduced ? 0 : Math.sin(time * 13 + enemy.id) * 1.2;
    ctx.save();
    ctx.translate(enemy.x, enemy.y + wobble);
    circle(ctx, 2, 4, data.radius + 1, "#19372b88");
    if (enemy.type === "swift") {
      polygon(
        ctx,
        [
          [-14, -7],
          [0, -2],
          [14, -7],
          [7, 7],
          [0, 5],
          [-7, 7],
        ],
        "#af8250",
      );
    }
    circle(ctx, 0, 0, data.radius, data.color);
    if (enemy.type === "shell") {
      polygon(
        ctx,
        [
          [0, -12],
          [10, -6],
          [10, 6],
          [0, 12],
          [-10, 6],
          [-10, -6],
        ],
        "#7d7793",
      );
      line(
        ctx,
        [
          { x: 0, y: -10 },
          { x: 0, y: 10 },
        ],
        "#bcb4c7",
        2,
      );
    } else circle(ctx, -2, -2, data.radius * 0.55, "#f8c079");
    circle(ctx, 3, -2, 1.7, "#423d32");
    circle(ctx, -3, -2, 1.7, "#423d32");
    if (enemy.slowTime > 0) {
      ctx.beginPath();
      ctx.arc(0, 0, data.radius + 3, 0, Math.PI * 2);
      ctx.strokeStyle = "#a5e6dc";
      ctx.lineWidth = 2;
      ctx.stroke();
    }
    const barY = -data.radius - 8;
    ctx.fillStyle = "#17372e";
    ctx.fillRect(-12, barY, 24, 3);
    ctx.fillStyle = "#e7d58f";
    ctx.fillRect(
      -12,
      barY,
      24 * Math.max(0, enemy.health / enemy.maxHealth),
      3,
    );
    ctx.restore();
  }
  hit(clientX, clientY) {
    const rect = this.canvas.getBoundingClientRect();
    if (!rect.width || !rect.height) return null;
    const x = ((clientX - rect.left) / rect.width) * WIDTH,
      y = ((clientY - rect.top) / rect.height) * HEIGHT;
    const radius = Math.max(27, (22 * WIDTH) / rect.width);
    const pad = PADS.map((pad) => ({
      ...pad,
      distance: Math.hypot(pad.x - x, pad.y - y),
    }))
      .filter((pad) => pad.distance <= radius)
      .sort((a, b) => a.distance - b.distance)[0];
    return pad?.id ?? null;
  }
  dispose() {
    this.disposed = true;
    this.background.width = this.background.height = 0;
  }
}
