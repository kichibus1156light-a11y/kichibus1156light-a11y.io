/* ==========================================================================
   main.js — 番組再生コントローラ（タイムライン／ループ／入力）
   ========================================================================== */
'use strict';

const Show = (function () {

  let t = 0;
  let playing = false;
  let started = false;
  let lastRaf = 0;
  let speed = 1;
  let hideTimer = null;
  let frameAccumulator = 0;
  let mobileFrameCap = 1 / 30;

  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));

  /* ---------------- 起動 ---------------- */
  function boot() {
    const canvas = document.getElementById('stage-canvas');
    Stage.init(canvas);
    CameraDirector.init(Stage.camera);
    UI.init();
    bindControls();

    // 1フレーム描画してからローダーを消す
    Stage.update(0, 0.016);
    CameraDirector.update(0, 0.016, false);
    Stage.render();

    setTimeout(function () {
      const l = document.getElementById('loader');
      if (l) l.classList.add('hidden');
      if (!started) document.getElementById('intro').classList.add('show');
    }, 700);

    // 検証・共有用：#t=120 のように時刻を指定して直接その場面から開始できる
    const m = window.DEBUG_T ? [null, String(window.DEBUG_T)]
            : /[#&?]t=(\d+(?:\.\d+)?)/.exec(location.hash + location.search);
    if (m) {
      const at = Math.min(SHOW.duration, parseFloat(m[1]));
      started = true;
      document.getElementById('intro').classList.remove('show');
      document.body.classList.add('show-started');
      seek(at);
      if (/paused/.test(location.hash + location.search)) pause(); else play();
    }

    mobileFrameCap = Stage.isMobile ? (1 / 30) : (1 / 60);
    lastRaf = performance.now();
    requestAnimationFrame(loop);
  }

  /* ---------------- メインループ ---------------- */
  function loop(now) {
    const raw = (now - lastRaf) / 1000;
    lastRaf = now;
    const dt = Math.min(0.05, Math.max(0.0005, raw));
    frameAccumulator += raw;
    if (Stage.isMobile && frameAccumulator < mobileFrameCap) {
      requestAnimationFrame(loop);
      return;
    }
    const frameDt = Stage.isMobile ? Math.min(frameAccumulator, 0.05) : dt;
    frameAccumulator = 0;

    if (playing) {
      t += frameDt * speed;
      if (t >= SHOW.duration) { t = SHOW.duration; pause(); }
    }

    Stage.update(t, frameDt);
    CameraDirector.update(t, frameDt, playing);
    UI.update(t, frameDt);
    Sound.tick(t, playing);
    Stage.render();

    requestAnimationFrame(loop);
  }

  /* ---------------- 再生制御 ---------------- */
  function play() {
    if (t >= SHOW.duration - 0.05) { seek(0); }
    playing = true;
    UI.setPlaying(true);
    document.body.classList.add('is-playing');
    scheduleHide();
  }
  function pause() {
    playing = false;
    UI.setPlaying(false);
    document.body.classList.remove('is-playing');
    showChrome();
  }
  function toggle() { playing ? pause() : play(); }

  function seek(nt) {
    t = clamp(nt, 0, SHOW.duration);
    UI.resetTransient();
    CameraDirector.reset();
    Stage.update(t, 0.016);
    CameraDirector.update(t, 0.016, playing);
    UI.update(t, 0.016);
    Stage.render();
  }

  function start() {
    if (started) return;
    started = true;
    document.getElementById('intro').classList.remove('show');
    document.body.classList.add('show-started');
    Sound.enable();
    UI.setSound(Sound.isOn());
    seek(0);
    play();
  }

  /* ---------------- UIの自動格納 ---------------- */
  function scheduleHide() {
    clearTimeout(hideTimer);
    hideTimer = setTimeout(function () {
      if (playing) document.body.classList.add('chrome-hidden');
    }, 3800);
  }
  function showChrome() {
    document.body.classList.remove('chrome-hidden');
    clearTimeout(hideTimer);
    if (playing) scheduleHide();
  }

  /* ---------------- 入力 ---------------- */
  function bindControls() {
    const btnPlay = document.getElementById('btn-play');
    const btnSound = document.getElementById('btn-sound');
    const btnCam = document.getElementById('btn-cam');
    const btnMenu = document.getElementById('btn-menu');
    const btnClose = document.getElementById('btn-menu-close');
    const btnPrev = document.getElementById('btn-prev');
    const btnNext = document.getElementById('btn-next');
    const btnSpeed = document.getElementById('btn-speed');
    const btnFull = document.getElementById('btn-full');
    const btnStart = document.getElementById('btn-start');
    const btnRestart = document.getElementById('btn-restart');
    const seek = document.getElementById('seek');

    btnStart.addEventListener('click', function () { start(); });
    btnRestart.addEventListener('click', function () { seek(0); play(); Sound.uiClick(); });

    btnPlay.addEventListener('click', function () { toggle(); Sound.uiClick(); });
    btnSound.addEventListener('click', function () {
      const on = Sound.toggle(); UI.setSound(on);
    });
    btnCam.addEventListener('click', function () {
      if (CameraDirector.isManual()) CameraDirector.exitManual();
      else CameraDirector.enterManual();
      Sound.uiClick();
    });
    btnMenu.addEventListener('click', function () { UI.toggleMenu(); Sound.uiClick(); });
    btnClose.addEventListener('click', function () { UI.closeMenu(); });

    btnPrev.addEventListener('click', function () { jumpChapter(-1); Sound.uiClick(); });
    btnNext.addEventListener('click', function () { jumpChapter(1); Sound.uiClick(); });

    btnSpeed.addEventListener('click', function () {
      speed = speed === 1 ? 1.5 : (speed === 1.5 ? 2 : (speed === 2 ? 0.5 : 1));
      btnSpeed.textContent = '×' + speed;
      Sound.uiClick();
    });

    btnFull.addEventListener('click', function () {
      const d = document.documentElement;
      if (!document.fullscreenElement) {
        (d.requestFullscreen || d.webkitRequestFullscreen || function () {}).call(d);
      } else {
        (document.exitFullscreen || document.webkitExitFullscreen || function () {}).call(document);
      }
      Sound.uiClick();
    });

    /* シーク操作 */
    let scrubbing = false;
    function seekFromEvent(clientX) {
      const r = seek.getBoundingClientRect();
      const p = clamp((clientX - r.left) / r.width, 0, 1);
      seek(p * SHOW.duration);
    }
    seek.addEventListener('mousedown', function (e) { scrubbing = true; seekFromEvent(e.clientX); });
    window.addEventListener('mousemove', function (e) { if (scrubbing) seekFromEvent(e.clientX); });
    window.addEventListener('mouseup', function () { scrubbing = false; });
    seek.addEventListener('touchstart', function (e) { scrubbing = true; seekFromEvent(e.touches[0].clientX); }, { passive: true });
    seek.addEventListener('touchmove', function (e) {
      if (scrubbing) { seekFromEvent(e.touches[0].clientX); if (e.cancelable) e.preventDefault(); }
    }, { passive: false });
    seek.addEventListener('touchend', function () { scrubbing = false; }, { passive: true });

    /* キーボード */
    window.addEventListener('keydown', function (e) {
      if (e.key === ' ') { e.preventDefault(); started ? toggle() : start(); }
      else if (e.key === 'ArrowRight') seek(t + (e.shiftKey ? 20 : 5));
      else if (e.key === 'ArrowLeft') seek(t - (e.shiftKey ? 20 : 5));
      else if (e.key === 'ArrowUp') jumpChapter(1);
      else if (e.key === 'ArrowDown') jumpChapter(-1);
      else if (e.key === 'm' || e.key === 'M') { UI.setSound(Sound.toggle()); }
      else if (e.key === 'c' || e.key === 'C') {
        CameraDirector.isManual() ? CameraDirector.exitManual() : CameraDirector.enterManual();
      }
      else if (e.key === 'Escape') { UI.closeMenu(); CameraDirector.exitManual(); }
    });

    /* UI自動格納 */
    ['mousemove', 'touchstart', 'click'].forEach(function (ev) {
      window.addEventListener(ev, showChrome, { passive: true });
    });

    /* タブ非アクティブ時は時間を進めない（dt制限で自動対応） */
    document.addEventListener('visibilitychange', function () {
      lastRaf = performance.now();
      frameAccumulator = 0;
      if (document.hidden && playing) pause();
    });
  }

  function jumpChapter(dir) {
    let idx = 0;
    for (let i = 0; i < CHAPTERS.length; i++) if (CHAPTERS[i].t0 <= t + 0.6) idx = i;
    const ni = clamp(idx + dir, 0, CHAPTERS.length - 1);
    seek(CHAPTERS[ni].t0 + 0.05);
    if (!playing) play();
  }

  /* ---------------- 公開 ---------------- */
  return {
    boot: boot, play: play, pause: pause, toggle: toggle, seek: seek, start: start,
    get time() { return t; },
    get playing() { return playing; }
  };
})();

window.addEventListener('load', function () { Show.boot(); });
