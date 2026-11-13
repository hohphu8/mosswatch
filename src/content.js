export const WIDTH = 840,
  HEIGHT = 540,
  STEP = 1 / 60;
export const PATH = Object.freeze(
  [
    [-30, 210],
    [210, 210],
    [210, 90],
    [450, 90],
    [450, 390],
    [690, 390],
    [690, 210],
    [795, 210],
  ].map(([x, y]) => Object.freeze({ x, y })),
);
export const PADS = Object.freeze(
  [
    [90, 150],
    [150, 285],
    [275, 150],
    [340, 35],
    [380, 235],
    [525, 150],
    [525, 325],
    [380, 465],
    [590, 465],
    [625, 275],
    [765, 340],
    [765, 135],
  ].map(([x, y], id) => Object.freeze({ id, x, y })),
);
export const TOWERS = Object.freeze({
  arrow: Object.freeze({
    name: "Chòi Nỏ",
    short: "Nỏ",
    role: "Nhanh · một mục tiêu",
    detail: "Bắn nhanh, giá dễ xây. Tốt khi đặt ở những khúc đường dài.",
    cost: 50,
    color: "#e9be70",
    damage: 15,
    range: 142,
    interval: 0.58,
    projectileSpeed: 420,
    upgrade: [40, 65],
  }),
  cannon: Object.freeze({
    name: "Pháo Hạt",
    short: "Pháo",
    role: "Mạnh · sát thương vùng",
    detail:
      "Hạt nổ gây sát thương trong bán kính 62. Hiệu quả khi bầy địch tụ lại.",
    cost: 90,
    color: "#ed8d71",
    damage: 36,
    range: 155,
    interval: 1.5,
    projectileSpeed: 270,
    splash: 62,
    upgrade: [65, 90],
  }),
  frost: Object.freeze({
    name: "Tháp Sương",
    short: "Sương",
    role: "Hỗ trợ · làm chậm",
    detail:
      "Làm chậm 45% trong 1,6 giây. Kết hợp Nỏ hoặc Pháo để giữ địch trong tầm.",
    cost: 65,
    color: "#96d9d0",
    damage: 7,
    range: 125,
    interval: 0.92,
    projectileSpeed: 340,
    slow: 0.55,
    duration: 1.6,
    upgrade: [45, 70],
  }),
});
export const ENEMIES = Object.freeze({
  ember: Object.freeze({
    name: "Bọ than",
    health: 62,
    speed: 38,
    reward: 7,
    damage: 1,
    radius: 10,
    armor: 1,
    color: "#dd9265",
  }),
  swift: Object.freeze({
    name: "Cánh lửa",
    health: 43,
    speed: 65,
    reward: 8,
    damage: 1,
    radius: 8,
    armor: 1,
    color: "#efc575",
  }),
  shell: Object.freeze({
    name: "Giáp đá",
    health: 175,
    speed: 27,
    reward: 15,
    damage: 3,
    radius: 14,
    armor: 0.72,
    color: "#b2a8c6",
  }),
});
export const WAVES = Object.freeze(
  [
    {
      name: "Dấu chân trong sương",
      note: "10 Bọ than · làm quen tuyến đường",
      count: 10,
      interval: 1.05,
      scale: 1,
      order: ["ember"],
      bonus: 45,
    },
    {
      name: "Những đôi cánh lửa",
      note: "14 địch · Cánh lửa bắt đầu xuất hiện",
      count: 14,
      interval: 0.95,
      scale: 1.18,
      order: ["ember", "swift", "swift", "ember"],
      bonus: 55,
    },
    {
      name: "Lớp vỏ của khu rừng",
      note: "16 địch · Giáp đá chịu ít sát thương hơn",
      count: 16,
      interval: 1,
      scale: 1.35,
      order: ["shell", "ember", "ember", "swift"],
      bonus: 65,
    },
    {
      name: "Cơn mưa tàn lửa",
      note: "20 địch · bầy đông, hãy thử Pháo Hạt",
      count: 20,
      interval: 0.66,
      scale: 1.55,
      order: ["swift", "ember", "shell", "ember", "swift"],
      bonus: 75,
    },
    {
      name: "Giữ lại một đốm sáng",
      note: "24 địch · đợt cuối, dùng hết những gì bạn có",
      count: 24,
      interval: 0.72,
      scale: 1.85,
      order: ["shell", "swift", "ember", "shell", "swift", "ember"],
      bonus: 0,
    },
  ].map((wave) => Object.freeze({ ...wave, order: Object.freeze(wave.order) })),
);

export function towerStats(type, level = 1) {
  const data = TOWERS[type];
  return {
    ...data,
    damage: Math.round(data.damage * (1 + (level - 1) * 0.6)),
    range: data.range + (level - 1) * 13,
    interval: data.interval * (1 - (level - 1) * 0.1),
    upgradeCost: data.upgrade[level - 1] ?? null,
  };
}

export const SEGMENTS = PATH.slice(1).map((point, i) => ({
  from: PATH[i],
  to: point,
  length: Math.hypot(point.x - PATH[i].x, point.y - PATH[i].y),
}));
export const PATH_LENGTH = SEGMENTS.reduce(
  (sum, segment) => sum + segment.length,
  0,
);
export function pointAt(distance) {
  let remaining = Math.max(0, distance);
  for (const segment of SEGMENTS) {
    if (remaining <= segment.length) {
      const t = remaining / segment.length;
      return {
        x: segment.from.x + (segment.to.x - segment.from.x) * t,
        y: segment.from.y + (segment.to.y - segment.from.y) * t,
      };
    }
    remaining -= segment.length;
  }
  return { ...PATH.at(-1) };
}
