/* ==========================================================================
   ui.js — TV特番HUD制御（テロップ／字幕／データパネル／年表／3Dラベル／シーク）
   ※ innerHTML に "</script>" 等の危険な文字列は生成しない
   ========================================================================== */
'use strict';

const UI = (function () {

  const el = {};
  let lastChapter = -1;
  const cardState = {};
  const chronoAdded = {};
  let labelNodes = {};
  const _v = new THREE.Vector3();

  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  function smooth(a, b, t) { const x = clamp((t - a) / (b - a), 0, 1); return x * x * (3 - 2 * x); }

  function q(id) { return document.getElementById(id); }

  function init() {
    ['chapter-badge','chapter-no','chapter-title','chapter-sub',
     'telop','telop-kicker','telop-title','telop-sub',
     'subtitle','data-panel','chrono-list','chrono-panel',
     'clock-date','clock-time','cam-tag','world-labels',
     'seek','seek-fill','seek-head','time-cur','time-dur',
     'btn-play','btn-sound','btn-cam','chapter-menu','chapter-menu-list',
     'alt-value','vel-value','stat-bar','flash-overlay','impact-alert','impact-alert-text',
     'stage-vignette','loader','intro','btn-start','btn-restart','end-card','damage-list'
    ].forEach(function (id) { el[id] = q(id); });

    buildChapterMenu();
    buildLabels();
    el['time-dur'].textContent = fmt(SHOW.duration);
  }

  function fmt(s) {
    s = Math.max(0, s);
    const m = Math.floor(s / 60), ss = Math.floor(s % 60);
    return (m < 10 ? '0' : '') + m + ':' + (ss < 10 ? '0' : '') + ss;
  }

  /* ---------------- 章メニュー ---------------- */
  function buildChapterMenu() {
    const list = el['chapter-menu-list'];
    list.textContent = '';
    CHAPTERS.forEach(function (c, i) {
      const b = document.createElement('button');
      b.type = 'button';
      b.className = 'chapter-item';
      b.setAttribute('data-t', String(c.t0));
      const no = document.createElement('span'); no.className = 'ci-no'; no.textContent = c.no;
      const tt = document.createElement('span'); tt.className = 'ci-title'; tt.textContent = c.title;
      const tm = document.createElement('span'); tm.className = 'ci-time'; tm.textContent = fmt(c.t0);
      b.appendChild(no); b.appendChild(tt); b.appendChild(tm);
      b.addEventListener('click', function () {
        Show.seek(c.t0 + 0.05);
        closeMenu();
        Sound.uiClick();
      });
      list.appendChild(b);
    });
    // シークバー上の章マーカー
    const seek = el['seek'];
    CHAPTERS.forEach(function (c) {
      const m = document.createElement('span');
      m.className = 'seek-mark';
      m.style.left = (c.t0 / SHOW.duration * 100) + '%';
      m.title = c.title;
      seek.appendChild(m);
    });
    SHOW.T_IMPACT.forEach(function (t) {
      const m = document.createElement('span');
      m.className = 'seek-mark seek-mark-impact';
      m.style.left = (t / SHOW.duration * 100) + '%';
      seek.appendChild(m);
    });
  }
  function openMenu() { el['chapter-menu'].classList.add('open'); }
  function closeMenu() { el['chapter-menu'].classList.remove('open'); }
  function toggleMenu() { el['chapter-menu'].classList.toggle('open'); }

  /* ---------------- 3Dラベル ---------------- */
  function buildLabels() {
    const host = el['world-labels'];
    host.textContent = '';
    labelNodes = {};
    WORLD_LABELS.forEach(function (L) {
      const d = document.createElement('div');
      d.className = 'world-label ' + (L.cls || '');
      const dot = document.createElement('i'); dot.className = 'wl-dot';
      const box = document.createElement('div'); box.className = 'wl-box';
      const t1 = document.createElement('div'); t1.className = 'wl-title'; t1.textContent = L.text;
      const t2 = document.createElement('div'); t2.className = 'wl-sub'; t2.textContent = L.sub;
      box.appendChild(t1); box.appendChild(t2);
      d.appendChild(dot); d.appendChild(box);
      host.appendChild(d);
      labelNodes[L.id] = d;
    });
  }

  function labelWorldPos(L, t, out) {
    if (L.type === 'colony') return Stage.targetPos('colony', t, out);
    if (L.type === 'frag0') return Stage.targetPos('frag0', t, out);
    if (L.type === 'frag1') return Stage.targetPos('frag1', t, out);
    if (L.type === 'frag2') return Stage.targetPos('frag2', t, out);
    if (L.type === 'geo') { const g = GEO[L.geo]; return out.copy(Stage.ll2v(g.lat, g.lon, Stage.EARTH_R * 1.01)); }
    if (L.type === 'node') { const n = SPACE_NODES[L.geo]; return out.copy(Stage.nodeToVec(n)); }
    return out.set(0, 0, 0);
  }

  function updateLabels(t) {
    const cam = Stage.camera;
    const w = window.innerWidth, h = window.innerHeight;
    const camDir = new THREE.Vector3();
    cam.getWorldDirection(camDir);

    WORLD_LABELS.forEach(function (L) {
      const node = labelNodes[L.id];
      const on = t >= L.t0 && t <= L.t1;
      if (!on) { if (node.style.display !== 'none') node.style.display = 'none'; return; }

      labelWorldPos(L, t, _v);
      const world = _v.clone();
      // 地表ラベルは地球の裏側なら隠す
      if (L.type === 'geo') {
        const toCam = cam.position.clone().sub(world).normalize();
        if (world.clone().normalize().dot(toCam) < 0.12) { node.style.display = 'none'; return; }
      }
      const p = world.clone().project(cam);
      if (p.z > 1 || p.z < -1) { node.style.display = 'none'; return; }
      const sx = (p.x * 0.5 + 0.5) * w, sy = (-p.y * 0.5 + 0.5) * h;
      if (sx < -160 || sx > w + 160 || sy < -80 || sy > h + 80) { node.style.display = 'none'; return; }

      const fade = smooth(L.t0, L.t0 + 1.2, t) * (1 - smooth(L.t1 - 1.2, L.t1, t));
      node.style.display = 'block';
      node.style.transform = 'translate(' + Math.round(sx) + 'px,' + Math.round(sy) + 'px)';
      node.style.opacity = String(fade);
      // 遠いほど小さく
      const dist = cam.position.distanceTo(world);
      const sc = clamp(520 / dist, 0.62, 1.12);
      node.style.setProperty('--wl-scale', sc.toFixed(3));
    });
  }

  /* ---------------- 章 ---------------- */
  function updateChapter(t) {
    let idx = 0;
    for (let i = 0; i < CHAPTERS.length; i++) if (CHAPTERS[i].t0 <= t) idx = i;
    if (idx !== lastChapter) {
      lastChapter = idx;
      const c = CHAPTERS[idx];
      el['chapter-no'].textContent = c.no;
      el['chapter-title'].textContent = c.title;
      el['chapter-sub'].textContent = c.sub;
      const b = el['chapter-badge'];
      b.classList.remove('pop'); void b.offsetWidth; b.classList.add('pop');
      // メニューのアクティブ
      const items = el['chapter-menu-list'].children;
      for (let i = 0; i < items.length; i++) items[i].classList.toggle('active', i === idx);
    }
  }

  /* ---------------- テロップ ---------------- */
  let curTelop = -1;
  function updateTelop(t) {
    let found = -1;
    for (let i = 0; i < TELOPS.length; i++) {
      const p = TELOPS[i];
      if (t >= p.t && t < p.t + p.d) { found = i; break; }
    }
    if (found !== curTelop) {
      curTelop = found;
      const box = el['telop'];
      if (found < 0) { box.classList.remove('show'); return; }
      const p = TELOPS[found];
      el['telop-kicker'].textContent = p.kicker;
      el['telop-title'].textContent = p.title;
      el['telop-sub'].textContent = p.sub;
      box.classList.remove('show'); void box.offsetWidth; box.classList.add('show');
    }
  }

  /* ---------------- 字幕（ナレーション） ---------------- */
  let curNar = -1;
  function updateSubtitle(t) {
    let found = -1;
    for (let i = 0; i < NARRATION.length; i++) {
      const n = NARRATION[i];
      if (t >= n.t && t < n.t + n.d) { found = i; break; }
    }
    if (found !== curNar) {
      curNar = found;
      const box = el['subtitle'];
      if (found < 0) { box.classList.remove('show'); box.textContent = ''; return; }
      box.textContent = NARRATION[found].text;
      box.classList.remove('show'); void box.offsetWidth; box.classList.add('show');
    }
  }

  /* ---------------- データパネル ---------------- */
  function updateDataCards(t) {
    DATA_CARDS.forEach(function (c, i) {
      const on = t >= c.t && t < c.t + c.d;
      if (on && !cardState[i]) {
        cardState[i] = true;
        renderCard(c);
      } else if (!on && cardState[i]) {
        cardState[i] = false;
        const node = el['data-panel'].querySelector('[data-card="' + i + '"]');
        if (node) { node.classList.remove('show'); setTimeout(function () { if (node.parentNode) node.parentNode.removeChild(node); }, 500); }
      }
      if (on) {
        const node = el['data-panel'].querySelector('[data-card="' + i + '"]');
        if (!node) { renderCard(c); }
      }
    });

    function renderCard(c) {
      const i = DATA_CARDS.indexOf(c);
      if (el['data-panel'].querySelector('[data-card="' + i + '"]')) return;
      const card = document.createElement('section');
      card.className = 'data-card';
      card.setAttribute('data-card', String(i));
      const h = document.createElement('h3'); h.className = 'dc-title';
      const hs = document.createElement('span'); hs.textContent = c.title;
      h.appendChild(hs);
      card.appendChild(h);
      const dl = document.createElement('dl'); dl.className = 'dc-rows';
      c.rows.forEach(function (r, ri) {
        const dt = document.createElement('dt'); dt.textContent = r[0];
        const dd = document.createElement('dd'); dd.textContent = r[1];
        dt.style.animationDelay = (ri * 60) + 'ms';
        dd.style.animationDelay = (ri * 60) + 'ms';
        dl.appendChild(dt); dl.appendChild(dd);
      });
      card.appendChild(dl);
      el['data-panel'].appendChild(card);
      requestAnimationFrame(function () { card.classList.add('show'); });
    }
  }

  /* ---------------- 年表 ---------------- */
  function updateChrono(t) {
    CHRONOLOGY.forEach(function (c, i) {
      if (t >= c.t && !chronoAdded[i]) {
        chronoAdded[i] = true;
        const li = document.createElement('li');
        li.className = 'chrono-item';
        const d = document.createElement('span'); d.className = 'ch-date'; d.textContent = c.date;
        const x = document.createElement('span'); x.className = 'ch-text'; x.textContent = c.text;
        li.appendChild(d); li.appendChild(x);
        el['chrono-list'].appendChild(li);
        requestAnimationFrame(function () { li.classList.add('show'); });
        // 最新5件のみ表示
        while (el['chrono-list'].children.length > 6) {
          el['chrono-list'].removeChild(el['chrono-list'].firstChild);
        }
      }
    });
    // 巻き戻し時のリセット
    let need = false;
    CHRONOLOGY.forEach(function (c, i) { if (chronoAdded[i] && t < c.t - 0.5) need = true; });
    if (need) {
      Object.keys(chronoAdded).forEach(function (k) { delete chronoAdded[k]; });
      el['chrono-list'].textContent = '';
    }
  }

  /* ---------------- テレメトリ（高度・速度） ---------------- */
  let lastTelemPos = null, shownVel = 0, shownAlt = 0;
  function updateTelemetry(t, dt) {
    const p = Stage.targetPos(t > SHOW.T_FRACTURE ? 'frag0' : 'colony', t, new THREE.Vector3());
    const altU = Math.max(0, p.length() - Stage.EARTH_R);
    // 100 unit = 6371km → 1 unit ≒ 63.71km
    const altKm = altU * 63.71;
    let velKm = 0;
    if (lastTelemPos && dt > 0) {
      velKm = lastTelemPos.distanceTo(p) / dt * 63.71 / 6;  // 演出上の相対値
    }
    lastTelemPos = p.clone();
    shownAlt += (altKm - shownAlt) * 0.14;
    shownVel += (velKm - shownVel) * 0.10;

    const landed = t >= SHOW.T_IMPACT[0];
    el['alt-value'].textContent = landed ? '0' : Math.round(shownAlt).toLocaleString('en-US');
    el['vel-value'].textContent = landed ? '—' : (shownVel).toFixed(1);
    el['stat-bar'].style.width = clamp(100 - shownAlt / 220 * 100, 0, 100) + '%';
    el['stat-bar'].classList.toggle('critical', shownAlt < 4000 && !landed);
  }

  /* ---------------- 日時表示 ---------------- */
  function updateClock(t) {
    let date = 'U.C.0079.01.03', time = '';
    if (t < SHOW.T_DECLARE) { date = 'U.C.0079.01.03'; time = '00:00'; }
    else if (t < SHOW.T_THRUST_ON) { date = 'U.C.0079.01.03'; time = '06:'+pad(Math.floor((t-30)*0.9)); }
    else if (t < SHOW.T_MISSILE) { date = 'U.C.0079.01.04'; time = '13:'+pad(Math.floor((t-96)*0.8)); }
    else if (t < SHOW.T_ENTRY) { date = 'U.C.0079.01.09'; time = '21:'+pad(Math.floor((t-152)*1.1)); }
    else if (t < SHOW.T_AFTERMATH) { date = 'U.C.0079.01.10', time = '08:'+pad(Math.floor((t-205)*1.3)); }
    else { date = 'U.C.0079.01.10'; time = '09:04'; }
    el['clock-date'].textContent = date;
    el['clock-time'].textContent = time;
    function pad(n) { n = Math.max(0, Math.min(59, n)); return (n < 10 ? '0' : '') + n; }
  }

  /* ---------------- 閃光・警報 ---------------- */
  let alertShown = {};
  function updateOverlays(t) {
    // 着弾閃光
    let f = 0;
    SHOW.T_IMPACT.forEach(function (ti, i) {
      const x = t - ti;
      if (x >= 0 && x < 1.1) f = Math.max(f, (1 - x / 1.1) * (i === 0 ? 0.9 : 0.6));
    });
    const fx = t - SHOW.T_FRACTURE;
    if (fx >= 0 && fx < 0.8) f = Math.max(f, (1 - fx / 0.8) * 0.55);
    el['flash-overlay'].style.opacity = String(f);

    // 警報テロップ
    const alerts = [
      { t: SHOW.T_MISSILE, d: 7, text: '警報：連邦軍 核ミサイル接近' },
      { t: SHOW.T_FRACTURE, d: 6, text: '構造崩壊：コロニー断裂を検知' },
      { t: SHOW.T_ENTRY, d: 8, text: '大気圏突入：落下地点 予測不能' },
      { t: SHOW.T_IMPACT[0] - 6, d: 6, text: '着弾 6秒前 — 目標地点 シドニー' }
    ];
    let cur = null;
    alerts.forEach(function (a) { if (t >= a.t && t < a.t + a.d) cur = a; });
    const box = el['impact-alert'];
    if (cur) {
      if (el['impact-alert-text'].textContent !== cur.text) el['impact-alert-text'].textContent = cur.text;
      box.classList.add('show');
    } else box.classList.remove('show');

    // 終了カード
    if (t >= SHOW.duration - 0.15) el['end-card'].classList.add('show');
    else el['end-card'].classList.remove('show');
  }

  /* ---------------- シークバー ---------------- */
  function updateSeek(t) {
    const p = clamp(t / SHOW.duration, 0, 1) * 100;
    el['seek-fill'].style.width = p + '%';
    el['seek-head'].style.left = p + '%';
    el['time-cur'].textContent = fmt(t);
  }

  function updateCamTag(t) {
    const tag = CameraDirector.isManual() ? 'CAM FREE / 手動操作' : CameraDirector.currentTag(t);
    if (el['cam-tag'].textContent !== tag) el['cam-tag'].textContent = tag;
  }

  function setCamMode(isManual) {
    el['btn-cam'].classList.toggle('active', isManual);
    el['btn-cam'].setAttribute('aria-pressed', isManual ? 'true' : 'false');
  }

  function setPlaying(p) {
    el['btn-play'].classList.toggle('playing', p);
    el['btn-play'].setAttribute('aria-label', p ? '一時停止' : '再生');
    const i = el['btn-play'].querySelector('i');
    if (i) i.className = p ? 'fa-solid fa-pause' : 'fa-solid fa-play';
  }

  function setSound(on) {
    el['btn-sound'].classList.toggle('active', on);
    const i = el['btn-sound'].querySelector('i');
    if (i) i.className = on ? 'fa-solid fa-volume-high' : 'fa-solid fa-volume-xmark';
  }

  /* ---------------- リセット（シーク後） ---------------- */
  function resetTransient() {
    lastChapter = -1; curTelop = -1; curNar = -1;
    lastTelemPos = null;
    Object.keys(chronoAdded).forEach(function (k) { delete chronoAdded[k]; });
    el['chrono-list'].textContent = '';
    Object.keys(cardState).forEach(function (k) { delete cardState[k]; });
    el['data-panel'].textContent = '';
    alertShown = {};
  }

  /* ---------------- メイン更新 ---------------- */
  function update(t, dt) {
    updateChapter(t);
    updateTelop(t);
    updateSubtitle(t);
    updateDataCards(t);
    updateChrono(t);
    updateTelemetry(t, dt);
    updateClock(t);
    updateOverlays(t);
    updateSeek(t);
    updateLabels(t);
    updateCamTag(t);
  }

  return {
    init: init, update: update, resetTransient: resetTransient,
    setPlaying: setPlaying, setSound: setSound, setCamMode: setCamMode,
    openMenu: openMenu, closeMenu: closeMenu, toggleMenu: toggleMenu,
    fmt: fmt, el: el
  };
})();
