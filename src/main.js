import Gyos from "gyosjs/csp";
import { Game } from "./engine.js";
import { Renderer } from "./renderer.js";
import { createLoop } from "./loop.js";
import { PADS, TOWERS, WAVES, towerStats } from "./content.js";
import "./style.css";

const mountMarkup = import.meta.env.DEV
  ? document.querySelector('[g-scope="Mosswatch"]').outerHTML
  : null;

Gyos.scope("Mosswatch", () => {
  let game = new Game(),
    renderer,
    loop,
    resize,
    root,
    dialog,
    returnFocus;
  let hover = null,
    pointer = null,
    alive = true,
    lastSnapshot = "",
    previousStatus = "ready";
  const lifetime = new AbortController();
  const media = matchMedia("(prefers-reduced-motion: reduce)");
  const state = Gyos.signal(game.snapshot()),
    selected = Gyos.signal(null),
    build = Gyos.signal("arrow");
  const speed = Gyos.signal(1),
    notice = Gyos.signal("Chọn một ô trống trên bản đồ để xây tháp đầu tiên.");
  const error = Gyos.signal(""),
    modal = Gyos.signal(""),
    pauseReason = Gyos.signal(""),
    fatal = Gyos.signal(false);
  const selectedTower = Gyos.computed(
    () => state().towers.find((tower) => tower.pad === selected()) || null,
  );
  const stats = Gyos.computed(() =>
    towerStats(selectedTower()?.type || build(), selectedTower()?.level || 1),
  );
  const selectedTitle = Gyos.computed(() =>
    selected() === null
      ? "Chọn một vị trí"
      : selectedTower()
        ? `${TOWERS[selectedTower().type].name} · Cấp ${selectedTower().level}`
        : `Ô ${selected() + 1} · sẵn sàng xây`,
  );
  const terminal = () => ["won", "lost"].includes(state().status);
  const canBuild = Gyos.computed(
    () =>
      selected() !== null &&
      !selectedTower() &&
      !terminal() &&
      state().money >= TOWERS[build()].cost &&
      !fatal(),
  );
  const canUpgrade = Gyos.computed(
    () =>
      !!selectedTower() &&
      stats().upgradeCost !== null &&
      state().money >= stats().upgradeCost &&
      !terminal() &&
      !fatal(),
  );
  const refund = Gyos.computed(() =>
    Math.floor(((selectedTower()?.spent || 0) * 7) / 10),
  );
  const waveInfo = Gyos.computed(
    () =>
      WAVES[
        Math.min(
          state().status === "ready"
            ? state().wave
            : Math.max(0, state().wave - 1),
          4,
        )
      ],
  );
  const statusText = Gyos.computed(
    () =>
      ({
        ready: "Giờ chuẩn bị",
        running: "Đang phòng thủ",
        paused: "Đã tạm dừng",
        won: "Khu rừng an toàn",
        lost: "Hạt sáng đã tắt",
      })[state().status],
  );
  const waveLabel = Gyos.computed(
    () =>
      `${Math.min(state().status === "ready" ? state().wave + 1 : Math.max(1, state().wave), 5)} / 5`,
  );
  const pauseLabel = Gyos.computed(() =>
    state().status === "paused" ? "Tiếp tục" : "Tạm dừng",
  );
  const upgradeLabel = Gyos.computed(() =>
    stats().upgradeCost === null
      ? "Đã đạt cấp tối đa"
      : `Nâng cấp · ${stats().upgradeCost} hạt`,
  );
  const pads = Gyos.computed(() =>
    PADS.map((pad) => {
      const tower = state().towers.find((item) => item.pad === pad.id);
      return {
        id: pad.id,
        label: `Ô ${pad.id + 1}: ${tower ? `${TOWERS[tower.type].name}, cấp ${tower.level}` : "trống"}`,
        occupied: !!tower,
      };
    }),
  );
  const cards = Object.entries(TOWERS).map(([id, tower]) => ({ id, ...tower }));
  function publish() {
    if (!alive) return;
    const snapshot = game.snapshot(),
      json = JSON.stringify(snapshot);
    if (json !== lastSnapshot) {
      state(snapshot);
      lastSnapshot = json;
    }
    if (game.status !== previousStatus) {
      if (game.status === "ready" && game.wave > 0)
        notice(
          `Đã qua đợt ${game.wave}. Nhận ${WAVES[game.wave - 1].bonus} hạt; chuẩn bị rồi gọi đợt tiếp theo.`,
        );
      if (game.status === "won")
        notice("Bạn đã giữ được Hạt sáng qua cả 5 đợt!");
      if (game.status === "lost")
        notice(
          "Hạt sáng đã tắt. Thử phối hợp tháp ở các khúc cua trong trận sau.",
        );
      if (game.terminal) selected(null);
      previousStatus = game.status;
    }
  }
  function redraw() {
    loop?.invalidate();
  }
  function command(fn, message) {
    if (!alive || fatal()) return;
    try {
      fn();
      error("");
      if (message) notice(message);
      loop?.command();
      if (!loop) publish();
    } catch (problem) {
      error(problem.message);
    }
  }
  function select(pad) {
    if (!PADS[pad] || !alive) return;
    selected(pad);
    if (!fatal()) error("");
    const tower = game.towerAt(pad);
    notice(
      tower
        ? `Đã chọn ${TOWERS[tower.type].name} ở ô ${pad + 1}.`
        : `Ô ${pad + 1} đã chọn. Chọn loại tháp rồi nhấn Xây tháp.`,
    );
    redraw();
  }
  function pause(reason = "") {
    if (game.status === "running") {
      game.pause();
      pauseReason(reason);
      loop?.command();
    }
  }
  function open(mode, event) {
    if (!dialog || !alive) return;
    pause("Trận đã tạm dừng khi mở bảng này. Nhấn Tiếp tục khi sẵn sàng.");
    returnFocus = event?.currentTarget || document.activeElement;
    modal(mode);
    dialog.showModal();
  }
  function close() {
    dialog?.close();
    modal("");
    if (returnFocus?.isConnected) returnFocus.focus();
  }
  function restart() {
    if (!alive) return;
    if (fatal()) {
      close();
      return;
    }
    game = new Game();
    previousStatus = "ready";
    lastSnapshot = "";
    Gyos.batch(() => {
      selected(null);
      build("arrow");
      speed(1);
      pauseReason("");
      error("");
      notice("Một lượt canh rừng mới. Chọn ô trống để bắt đầu.");
    });
    loop?.command();
    if (!loop) publish();
    close();
  }
  function draw() {
    renderer?.draw(game, {
      selected: selected(),
      build: build(),
      hover,
      reduced: media.matches,
    });
  }
  const api = {
    state,
    selected,
    build,
    speed,
    notice,
    error,
    modal,
    fatal,
    pauseReason,
    selectedTower,
    stats,
    selectedTitle,
    canBuild,
    canUpgrade,
    refund,
    terminal,
    waveInfo,
    statusText,
    waveLabel,
    pauseLabel,
    upgradeLabel,
    pads,
    cards,
    select,
    clearSelection() {
      selected(null);
      if (!fatal()) error("");
      redraw();
    },
    choose(type) {
      if (!Object.hasOwn(TOWERS, type)) return;
      build(type);
      if (!fatal()) error("");
      redraw();
    },
    place() {
      command(
        () => game.place(selected(), build()),
        `Đã xây ${TOWERS[build()].name}.`,
      );
    },
    upgrade() {
      command(() => game.upgrade(selected()), "Tháp đã được nâng cấp.");
    },
    sell() {
      command(() => {
        const amount = game.sell(selected());
        notice(`Đã bán tháp, nhận lại ${amount} hạt (70%).`);
      });
    },
    startWave() {
      command(() => {
        if (document.hidden) throw Error("Quay lại tab để bắt đầu đợt.");
        game.startWave();
        pauseReason("");
      }, "Đợt mới đang tới. Bạn vẫn có thể xây và nâng cấp tháp.");
    },
    togglePause() {
      command(() => {
        if (game.status === "paused") {
          if (document.hidden) throw Error("Quay lại tab để tiếp tục.");
          game.resume();
          pauseReason("");
        } else game.pause();
      });
    },
    setSpeed(value) {
      if (![1, 2, 3].includes(value)) return;
      speed(value);
      loop?.command();
    },
    help(event) {
      open("help", event);
    },
    askRestart(event) {
      open("restart", event);
    },
    close,
    restart,
    onMount() {
      root = this.$refs.root;
      dialog = this.$refs.dialog;
      const canvas = this.$refs.canvas,
        signal = lifetime.signal;
      dialog.addEventListener(
        "cancel",
        (event) => {
          event.preventDefault();
          close();
        },
        { signal },
      );
      try {
        renderer = new Renderer(canvas);
        loop = createLoop({ game: () => game, speed, render: draw, publish });
        resize = new ResizeObserver(() => {
          renderer.resize();
          redraw();
        });
        resize.observe(canvas);
        renderer.resize();
        canvas.addEventListener(
          "pointerdown",
          (event) => {
            if (event.isPrimary && event.button === 0)
              pointer = {
                id: event.pointerId,
                x: event.clientX,
                y: event.clientY,
              };
          },
          { signal },
        );
        canvas.addEventListener(
          "pointerup",
          (event) => {
            if (
              pointer?.id === event.pointerId &&
              Math.hypot(event.clientX - pointer.x, event.clientY - pointer.y) <
                10
            ) {
              const pad = renderer.hit(event.clientX, event.clientY);
              if (pad !== null) select(pad);
            }
            pointer = null;
          },
          { signal },
        );
        canvas.addEventListener(
          "pointercancel",
          () => {
            pointer = null;
          },
          { signal },
        );
        canvas.addEventListener(
          "pointermove",
          (event) => {
            if (event.pointerType !== "mouse") return;
            const next = renderer.hit(event.clientX, event.clientY);
            if (next !== hover) {
              hover = next;
              canvas.style.cursor = next === null ? "default" : "pointer";
              redraw();
            }
          },
          { signal },
        );
        canvas.addEventListener(
          "pointerleave",
          () => {
            hover = null;
            pointer = null;
            redraw();
          },
          { signal },
        );
        document.addEventListener(
          "keydown",
          (event) => {
            // Hiding the start/pause button can return focus to body.
            if (event.target !== document.body && !root.contains(event.target))
              return;
            if (
              event.isComposing ||
              event.ctrlKey ||
              event.metaKey ||
              event.altKey ||
              modal()
            )
              return;
            if (
              event.target.closest("input, textarea, select, [contenteditable]")
            )
              return;
            if (
              event.key.toLowerCase() === "p" &&
              ["running", "paused"].includes(game.status)
            ) {
              event.preventDefault();
              api.togglePause();
            }
            if (event.key === "Escape") {
              selected(null);
              error("");
              redraw();
            }
          },
          { signal },
        );
        document.addEventListener(
          "visibilitychange",
          () => {
            if (document.hidden)
              pause(
                "Bạn vừa chuyển tab. Trận đã được giữ nguyên; nhấn Tiếp tục để chơi.",
              );
          },
          { signal },
        );
        window.addEventListener(
          "pagehide",
          () => pause("Trận đã tạm dừng khi rời trang."),
          { signal },
        );
        media.addEventListener("change", redraw, { signal });
        loop.command();
      } catch (problem) {
        fatal(true);
        error(problem.message);
        resize?.disconnect();
        loop?.dispose();
        renderer?.dispose();
      }
      if (import.meta.env.DEV) {
        window.__mosswatch = {
          snapshot: () => game.snapshot(),
          inspect: () => ({
            time: game.time,
            enemies: game.enemies.length,
            projectiles: game.projectiles.length,
            ...loop?.stats(),
            draws: renderer?.draws,
            alive,
          }),
          dispose: () =>
            Gyos.cleanup(document.querySelector('[g-scope="Mosswatch"]')),
          remount: () => {
            const old = document.querySelector('[g-scope="Mosswatch"]');
            Gyos.cleanup(old);
            const template = document.createElement("template");
            template.innerHTML = mountMarkup;
            const next = template.content.firstElementChild;
            old.replaceWith(next);
            Gyos.mount(next);
          },
        };
      }
    },
    onUnmount() {
      alive = false;
      lifetime.abort();
      resize?.disconnect();
      loop?.dispose();
      renderer?.dispose();
      dialog?.close();
      pointer = null;
      hover = null;
      if (import.meta.env.DEV) delete window.__mosswatch;
    },
  };
  return api;
});
Gyos.mountAll();
