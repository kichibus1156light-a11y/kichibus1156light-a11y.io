/* ==========================================================================
   audio.js — WebAudioによる効果音・BGM（合成音のみ／外部ファイル不要）
   ドキュメンタリー的な低音ドローン＋イベント効果音
   ========================================================================== */
'use strict';

const Sound = (function () {
  let ctx = null, master = null, droneGain = null, enabled = false, started = false;
  const fired = {};

  function ensure() {
    if (ctx) return ctx;
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return null;
    ctx = new AC();
    master = ctx.createGain();
    master.gain.value = 0.0;
    master.connect(ctx.destination);
    buildDrone();
    return ctx;
  }

  /* ---------- 低音ドローン（宇宙の静寂） ---------- */
  function buildDrone() {
    droneGain = ctx.createGain();
    droneGain.gain.value = 0.16;
    const filt = ctx.createBiquadFilter();
    filt.type = 'lowpass'; filt.frequency.value = 320;
    droneGain.connect(filt); filt.connect(master);

    [55, 82.4, 110, 164.8].forEach(function (f, i) {
      const o = ctx.createOscillator();
      o.type = i % 2 ? 'sine' : 'triangle';
      o.frequency.value = f;
      const g = ctx.createGain();
      g.gain.value = 0.22 / (i + 1);
      // ゆっくりしたうねり
      const lfo = ctx.createOscillator();
      lfo.frequency.value = 0.03 + i * 0.017;
      const lg = ctx.createGain(); lg.gain.value = 0.1 / (i + 1);
      lfo.connect(lg); lg.connect(g.gain);
      lfo.start();
      o.connect(g); g.connect(droneGain);
      o.start();
    });
  }

  function noiseBuffer(sec) {
    const n = Math.floor(ctx.sampleRate * sec);
    const b = ctx.createBuffer(1, n, ctx.sampleRate);
    const d = b.getChannelData(0);
    for (let i = 0; i < n; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / n);
    return b;
  }

  /* ---------- 効果音 ---------- */
  function boom(power, dur) {
    if (!enabled || !ctx) return;
    const t = ctx.currentTime;
    // 低周波の衝撃
    const o = ctx.createOscillator();
    o.type = 'sine';
    o.frequency.setValueAtTime(120 * power, t);
    o.frequency.exponentialRampToValueAtTime(18, t + dur);
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(0.85 * power, t + 0.03);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g); g.connect(master);
    o.start(t); o.stop(t + dur + 0.1);

    // ノイズの轟音
    const src = ctx.createBufferSource();
    src.buffer = noiseBuffer(dur);
    const nf = ctx.createBiquadFilter();
    nf.type = 'lowpass';
    nf.frequency.setValueAtTime(1400 * power, t);
    nf.frequency.exponentialRampToValueAtTime(90, t + dur);
    const ng = ctx.createGain();
    ng.gain.setValueAtTime(0.5 * power, t);
    ng.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    src.connect(nf); nf.connect(ng); ng.connect(master);
    src.start(t);
  }

  function beep(freq, dur, vol, type) {
    if (!enabled || !ctx) return;
    const t = ctx.currentTime;
    const o = ctx.createOscillator();
    o.type = type || 'square';
    o.frequency.value = freq;
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(vol || 0.12, t + 0.01);
    g.gain.exponentialRampToValueAtTime(0.0001, t + (dur || 0.12));
    o.connect(g); g.connect(master);
    o.start(t); o.stop(t + (dur || 0.12) + 0.02);
  }

  function whoosh(dur, vol) {
    if (!enabled || !ctx) return;
    const t = ctx.currentTime;
    const src = ctx.createBufferSource();
    src.buffer = noiseBuffer(dur);
    const bp = ctx.createBiquadFilter();
    bp.type = 'bandpass';
    bp.frequency.setValueAtTime(180, t);
    bp.frequency.exponentialRampToValueAtTime(2600, t + dur * 0.6);
    bp.Q.value = 1.2;
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.linearRampToValueAtTime(vol || 0.3, t + dur * 0.35);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    src.connect(bp); bp.connect(g); g.connect(master);
    src.start(t);
  }

  /* ---------- 継続音（大気圏突入の轟音） ---------- */
  let entrySrc = null, entryGain = null;
  function setEntryRoar(level) {
    if (!ctx || !enabled) return;
    if (!entrySrc) {
      entryGain = ctx.createGain(); entryGain.gain.value = 0;
      const bp = ctx.createBiquadFilter(); bp.type = 'lowpass'; bp.frequency.value = 700;
      entrySrc = ctx.createBufferSource();
      const n = Math.floor(ctx.sampleRate * 2);
      const b = ctx.createBuffer(1, n, ctx.sampleRate);
      const d = b.getChannelData(0);
      for (let i = 0; i < n; i++) d[i] = Math.random() * 2 - 1;
      entrySrc.buffer = b; entrySrc.loop = true;
      entrySrc.connect(bp); bp.connect(entryGain); entryGain.connect(master);
      entrySrc.start();
    }
    entryGain.gain.value += (level * 0.35 - entryGain.gain.value) * 0.08;
  }

  /* ---------- タイムライン連動 ---------- */
  function tick(t, playing) {
    if (!enabled || !ctx) return;
    // ドローンの音量をシーンで変化
    if (droneGain) {
      const target = t > SHOW.T_ENTRY ? 0.06 : (t > SHOW.T_DEORBIT ? 0.20 : 0.14);
      droneGain.gain.value += (target - droneGain.gain.value) * 0.02;
    }
    // 突入轟音
    const roar = t > SHOW.T_ENTRY - 6 && t < SHOW.T_IMPACT[2] + 10
      ? Math.min(1, (t - (SHOW.T_ENTRY - 6)) / 6) : 0;
    setEntryRoar(roar);

    trig('declare', SHOW.T_DECLARE, t, function () { beep(880, 0.1, 0.1); setTimeout(function(){beep(660,0.14,0.1);}, 130); });
    trig('gas', SHOW.T_GAS, t, function () { whoosh(3.0, 0.18); });
    trig('thrust', SHOW.T_THRUST_ON, t, function () { boom(0.4, 2.2); whoosh(2.4, 0.2); });
    trig('deorbit', SHOW.T_DEORBIT, t, function () { boom(0.55, 2.6); });
    trig('missile', SHOW.T_MISSILE, t, function () {
      for (let i = 0; i < 6; i++) setTimeout(function () { whoosh(0.7, 0.14); }, i * 210);
    });
    trig('fracture', SHOW.T_FRACTURE, t, function () { boom(0.9, 3.4); setTimeout(function(){boom(0.7,2.6);}, 400); });
    SHOW.T_IMPACT.forEach(function (ti, i) {
      trig('impact' + i, ti, t, function () { boom(i === 0 ? 1.0 : 0.7, i === 0 ? 5.5 : 4.0); });
    });
  }

  function trig(key, at, t, fn) {
    if (fired[key]) {
      if (t < at - 1) fired[key] = false;  // 巻き戻し時に再武装
      return;
    }
    if (t >= at && t < at + 1.2) { fired[key] = true; fn(); }
  }

  function enable() {
    ensure();
    if (!ctx) return false;
    if (ctx.state === 'suspended') ctx.resume();
    enabled = true;
    master.gain.cancelScheduledValues(ctx.currentTime);
    master.gain.setTargetAtTime(0.62, ctx.currentTime, 0.6);
    return true;
  }
  function disable() {
    enabled = false;
    if (master && ctx) master.gain.setTargetAtTime(0.0, ctx.currentTime, 0.25);
  }
  function toggle() { if (enabled) { disable(); return false; } return enable(); }
  function isOn() { return enabled; }
  function uiClick() { beep(1200, 0.05, 0.06, 'sine'); }

  return { enable: enable, disable: disable, toggle: toggle, isOn: isOn, tick: tick, uiClick: uiClick };
})();
