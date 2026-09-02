/* ==========================================================================
   camera.js — 番組カメラディレクター
   キーフレーム間をスムーズ補間（Catmull-Rom的な減速＋手ブレ＋衝撃シェイク）
   ユーザー操作（ドラッグ／ピンチ）で自由視点にも切替可能
   ========================================================================== */
'use strict';

const CameraDirector = (function () {

  let cam;
  const pos = new THREE.Vector3();
  const look = new THREE.Vector3();
  const smPos = new THREE.Vector3();
  const smLook = new THREE.Vector3();
  let smFov = 42;
  let inited = false;

  /* 手動操作 */
  const manual = { active: false, yaw: 0, pitch: 0.2, dist: 420, target: new THREE.Vector3(0, 0, 0),
                   vYaw: 0, vPitch: 0, releaseAt: -1 };
  let shake = 0;

  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  function smoothstep(a, b, t) { const x = clamp((t - a) / (b - a), 0, 1); return x * x * (3 - 2 * x); }

  function init(camera) {
    cam = camera;
    bindInput();
  }

  /* ---------- キーフレーム探索 ---------- */
  function frameAt(t) {
    let i = 0;
    for (let k = 0; k < CAMERA_KEYS.length; k++) {
      if (CAMERA_KEYS[k].t <= t) i = k; else break;
    }
    const a = CAMERA_KEYS[i];
    const b = CAMERA_KEYS[Math.min(i + 1, CAMERA_KEYS.length - 1)];
    const span = Math.max(0.001, b.t - a.t);
    const x = clamp((t - a.t) / span, 0, 1);
    return { a: a, b: b, x: x, index: i };
  }

  /* ---------- 1キーフレームの絶対位置を求める ---------- */
  const _tp = new THREE.Vector3(), _up = new THREE.Vector3(0, 1, 0);
  const _side = new THREE.Vector3(), _fwd = new THREE.Vector3(), _u = new THREE.Vector3();

  function evalKey(key, t, outPos, outLook) {
    if (key.mode === 'orbit') {
      outPos.copy(Stage.ll2v(key.pos.lat, key.pos.lon, Stage.EARTH_R + key.pos.r));
      const L = key.look || { lat: 0, lon: 0, r: 0 };
      outLook.copy(Stage.ll2v(L.lat, L.lon, Stage.EARTH_R + (L.r || 0)));
      // 高度0の中心指定は原点
      if (!key.look) outLook.set(0, 0, 0);
      return;
    }
    // follow
    Stage.targetPos(key.target, t, _tp);
    outLook.copy(_tp);
    // 対象位置を基準に、地球中心からの外向き＝up、進行方向＝fwd
    _u.copy(_tp).normalize();
    if (_u.lengthSq() < 0.0001) _u.set(0, 1, 0);
    // 進行方向の近似（微小時間差）
    const p2 = Stage.targetPos(key.target, t + 0.6, new THREE.Vector3());
    _fwd.copy(p2).sub(_tp);
    if (_fwd.lengthSq() < 0.0001) _fwd.copy(_u).cross(_up).normalize();
    _fwd.normalize();
    _side.copy(_fwd).cross(_u).normalize();

    const o = key.offset || { side: 40, up: 20, back: 60 };
    outPos.copy(_tp)
      .add(_side.clone().multiplyScalar(o.side))
      .add(_u.clone().multiplyScalar(o.up))
      .add(_fwd.clone().multiplyScalar(-o.back));
  }

  /* ---------- 更新 ---------- */
  const _pa = new THREE.Vector3(), _pb = new THREE.Vector3();
  const _la = new THREE.Vector3(), _lb = new THREE.Vector3();

  function update(t, dt, playing) {
    const f = frameAt(t);
    // 各キーの絶対位置を評価してブレンド
    evalKey(f.a, t, _pa, _la);
    evalKey(f.b, t, _pb, _lb);
    const e = f.x * f.x * (3 - 2 * f.x);           // ease in-out
    pos.copy(_pa).lerp(_pb, e);
    look.copy(_la).lerp(_lb, e);
    const fov = (f.a.fov || 42) * (1 - e) + (f.b.fov || 42) * e;

    /* 衝撃シェイク：着弾・断裂・核 */
    let target = 0;
    SHOW.T_IMPACT.forEach(function (ti, i) {
      const x = t - ti;
      if (x >= 0 && x < 4.5) target = Math.max(target, (1 - x / 4.5) * (i === 0 ? 1 : 0.65));
    });
    const fx = t - SHOW.T_FRACTURE;
    if (fx >= 0 && fx < 3) target = Math.max(target, (1 - fx / 3) * 0.6);
    const ex = t - SHOW.T_ENTRY;
    if (ex >= 0 && ex < 12) target = Math.max(target, 0.18);
    shake += (target - shake) * Math.min(1, dt * 6);

    if (manual.active || t < 0) {
      updateManual(dt);
    } else {
      // 通常：滑らかに追従（フレームレート非依存の指数補間）
      const kPos = 1 - Math.pow(0.0016, dt);
      const kLook = 1 - Math.pow(0.0006, dt);
      if (!inited) { smPos.copy(pos); smLook.copy(look); smFov = fov; inited = true; }
      smPos.lerp(pos, kPos);
      smLook.lerp(look, kLook);
      smFov += (fov - smFov) * (1 - Math.pow(0.02, dt));

      cam.position.copy(smPos);
      // 微細な手持ちカメラ感
      const bob = playing ? 1 : 0.25;
      cam.position.x += Math.sin(t * 0.63) * 0.9 * bob;
      cam.position.y += Math.cos(t * 0.51) * 0.7 * bob;
      // 衝撃
      if (shake > 0.001) {
        const s = shake * 7.5;
        cam.position.x += (Math.random() - 0.5) * s;
        cam.position.y += (Math.random() - 0.5) * s;
        cam.position.z += (Math.random() - 0.5) * s;
      }
      cam.lookAt(smLook);
      if (shake > 0.001) cam.rotateZ((Math.random() - 0.5) * shake * 0.05);
      if (Math.abs(cam.fov - smFov) > 0.01) { cam.fov = smFov; cam.updateProjectionMatrix(); }
    }
  }

  /* ---------- 手動カメラ ---------- */
  function updateManual(dt) {
    manual.yaw += manual.vYaw * dt;
    manual.pitch = clamp(manual.pitch + manual.vPitch * dt, -1.35, 1.35);
    manual.vYaw *= Math.pow(0.02, dt);
    manual.vPitch *= Math.pow(0.02, dt);

    const r = manual.dist;
    const p = new THREE.Vector3(
      r * Math.cos(manual.pitch) * Math.sin(manual.yaw),
      r * Math.sin(manual.pitch),
      r * Math.cos(manual.pitch) * Math.cos(manual.yaw)
    ).add(manual.target);
    smPos.lerp(p, 1 - Math.pow(0.005, dt));
    smLook.lerp(manual.target, 1 - Math.pow(0.005, dt));
    cam.position.copy(smPos);
    cam.lookAt(smLook);
    if (Math.abs(cam.fov - 44) > 0.05) { cam.fov += (44 - cam.fov) * 0.1; cam.updateProjectionMatrix(); }
  }

  function enterManual() {
    if (manual.active) return;
    // 現在の視点から極座標を逆算
    const v = cam.position.clone().sub(smLook);
    manual.target.copy(smLook);
    manual.dist = clamp(v.length(), 130, 1400);
    manual.pitch = Math.asin(clamp(v.y / v.length(), -1, 1));
    manual.yaw = Math.atan2(v.x, v.z);
    manual.active = true;
    document.body.classList.add('manual-cam');
    if (typeof UI !== 'undefined') UI.setCamMode(true);
  }
  function exitManual() {
    manual.active = false;
    document.body.classList.remove('manual-cam');
    if (typeof UI !== 'undefined') UI.setCamMode(false);
  }
  function isManual() { return manual.active; }

  /* ---------- 入力 ---------- */
  function bindInput() {
    const el = document.getElementById('stage-canvas');
    let dragging = false, lx = 0, ly = 0, moved = 0;
    let pinchD = 0;

    function down(x, y) { dragging = true; lx = x; ly = y; moved = 0; }
    function move(x, y) {
      if (!dragging) return;
      const dx = x - lx, dy = y - ly;
      lx = x; ly = y;
      moved += Math.abs(dx) + Math.abs(dy);
      if (moved > 8 && !manual.active) enterManual();
      if (manual.active) {
        manual.vYaw = -dx * 0.012 / 0.016 * 0.016;
        manual.vPitch = dy * 0.012 / 0.016 * 0.016;
        manual.yaw -= dx * 0.006;
        manual.pitch = clamp(manual.pitch + dy * 0.005, -1.35, 1.35);
      }
    }
    function up() { dragging = false; }

    el.addEventListener('mousedown', function (e) { down(e.clientX, e.clientY); });
    window.addEventListener('mousemove', function (e) { move(e.clientX, e.clientY); });
    window.addEventListener('mouseup', up);

    el.addEventListener('touchstart', function (e) {
      if (e.touches.length === 1) down(e.touches[0].clientX, e.touches[0].clientY);
      else if (e.touches.length === 2) {
        pinchD = Math.hypot(e.touches[0].clientX - e.touches[1].clientX,
                            e.touches[0].clientY - e.touches[1].clientY);
        if (!manual.active) enterManual();
      }
    }, { passive: true });
    el.addEventListener('touchmove', function (e) {
      if (e.touches.length === 1) move(e.touches[0].clientX, e.touches[0].clientY);
      else if (e.touches.length === 2) {
        const d = Math.hypot(e.touches[0].clientX - e.touches[1].clientX,
                             e.touches[0].clientY - e.touches[1].clientY);
        if (pinchD > 0 && manual.active) manual.dist = clamp(manual.dist * (pinchD / d), 130, 1400);
        pinchD = d;
      }
      if (e.cancelable) e.preventDefault();
    }, { passive: false });
    el.addEventListener('touchend', function () { up(); pinchD = 0; }, { passive: true });

    el.addEventListener('wheel', function (e) {
      if (!manual.active) enterManual();
      manual.dist = clamp(manual.dist * (1 + Math.sign(e.deltaY) * 0.08), 130, 1400);
      e.preventDefault();
    }, { passive: false });
  }

  return {
    init: init, update: update,
    enterManual: enterManual, exitManual: exitManual, isManual: isManual,
    currentTag: function (t) { return frameAt(t).a.tag; },
    reset: function () { inited = false; }
  };
})();
