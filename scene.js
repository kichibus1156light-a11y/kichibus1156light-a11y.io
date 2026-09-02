/* ==========================================================================
   scene.js — 3Dステージ構築（地球／宇宙／コロニー／艦隊／矢印／FX）
   THREE r128 (UMD, global THREE)
   ※ コロニー・艦艇は視認性のため非スケール（誇張）表示
   ========================================================================== */
'use strict';

const EARTH_R = 100;

const Stage = (function () {

  /* ---------------- 内部状態 ---------------- */
  let renderer, scene, camera, clock;
  let isMobile = false, isLowPower = false, quality = 1;
  const registry = {
    earth: null, cloudsRing: null, atmosphere: null, starField: null,
    colony: null, fragments: [], arrows: [], fleets: [], impacts: [],
    markers: [], missiles: [], gasFx: null, thrusters: [], nukeFlashes: [],
    reentryFx: [], craters: [], shockRings: [], debris: []
  };
  let sunLight, fillLight, impactLight;
  let tNow = 0;

  /* ---------------- 座標変換 ---------------- */
  function ll2v(lat, lon, r) {
    const phi = (90 - lat) * Math.PI / 180;
    const theta = (lon + 180) * Math.PI / 180;
    return new THREE.Vector3(
      -r * Math.sin(phi) * Math.cos(theta),
       r * Math.cos(phi),
       r * Math.sin(phi) * Math.sin(theta)
    );
  }
  function nodeToVec(n) { return ll2v(n.lat, n.lon, n.r); }

  /* ---------------- 汎用 ---------------- */
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const clamp01 = v => clamp(v, 0, 1);
  function smooth(a, b, t) { const x = clamp01((t - a) / (b - a)); return x * x * (3 - 2 * x); }
  function easeIn(x, p) { return Math.pow(clamp01(x), p || 2); }

  /* ---------------- キャンバステクスチャ ---------------- */
  function texGlow(inner, outer) {
    const s = 128, c = document.createElement('canvas'); c.width = c.height = s;
    const g = c.getContext('2d');
    const grd = g.createRadialGradient(s / 2, s / 2, 0, s / 2, s / 2, s / 2);
    grd.addColorStop(0.0, inner || 'rgba(255,255,255,1)');
    grd.addColorStop(0.25, outer || 'rgba(255,190,90,0.65)');
    grd.addColorStop(1.0, 'rgba(255,120,40,0)');
    g.fillStyle = grd; g.fillRect(0, 0, s, s);
    const t = new THREE.CanvasTexture(c); return t;
  }
  function texRing() {
    const s = 256, c = document.createElement('canvas'); c.width = c.height = s;
    const g = c.getContext('2d');
    g.clearRect(0, 0, s, s);
    g.strokeStyle = 'rgba(255,255,255,0.95)'; g.lineWidth = 10;
    g.beginPath(); g.arc(s / 2, s / 2, s / 2 - 16, 0, Math.PI * 2); g.stroke();
    g.strokeStyle = 'rgba(255,255,255,0.35)'; g.lineWidth = 26;
    g.beginPath(); g.arc(s / 2, s / 2, s / 2 - 40, 0, Math.PI * 2); g.stroke();
    return new THREE.CanvasTexture(c);
  }
  function texSmoke() {
    const s = 128, c = document.createElement('canvas'); c.width = c.height = s;
    const g = c.getContext('2d');
    const grd = g.createRadialGradient(s / 2, s / 2, 0, s / 2, s / 2, s / 2);
    grd.addColorStop(0, 'rgba(210,200,190,0.55)');
    grd.addColorStop(0.5, 'rgba(150,140,130,0.28)');
    grd.addColorStop(1, 'rgba(90,84,78,0)');
    g.fillStyle = grd; g.fillRect(0, 0, s, s);
    return new THREE.CanvasTexture(c);
  }
  function texCrater() {
    const s = 256, c = document.createElement('canvas'); c.width = c.height = s;
    const g = c.getContext('2d');
    const grd = g.createRadialGradient(s / 2, s / 2, 0, s / 2, s / 2, s / 2);
    grd.addColorStop(0.00, 'rgba(18,14,12,0.96)');
    grd.addColorStop(0.42, 'rgba(38,26,20,0.92)');
    grd.addColorStop(0.62, 'rgba(86,52,32,0.70)');
    grd.addColorStop(0.80, 'rgba(120,80,52,0.34)');
    grd.addColorStop(1.00, 'rgba(120,90,60,0)');
    g.fillStyle = grd; g.fillRect(0, 0, s, s);
    // 放射状のイジェクタ条痕
    g.globalCompositeOperation = 'source-atop';
    for (let i = 0; i < 90; i++) {
      const a = Math.random() * Math.PI * 2;
      const r0 = s * (0.20 + Math.random() * 0.16), r1 = s * (0.34 + Math.random() * 0.16);
      g.strokeStyle = 'rgba(150,110,70,' + (0.05 + Math.random() * 0.14).toFixed(3) + ')';
      g.lineWidth = 1 + Math.random() * 3;
      g.beginPath();
      g.moveTo(s / 2 + Math.cos(a) * r0, s / 2 + Math.sin(a) * r0);
      g.lineTo(s / 2 + Math.cos(a) * r1, s / 2 + Math.sin(a) * r1);
      g.stroke();
    }
    return new THREE.CanvasTexture(c);
  }
  let TEX = {};

  /* ---------------- 初期化 ---------------- */
  function init(canvas) {
    const mobileUA = /Android|iPhone|iPad|iPod|Mobile/i.test(navigator.userAgent);
    const shortSide = Math.min(window.innerWidth, window.innerHeight);
    const memory = Number(navigator.deviceMemory || 0);
    isMobile = shortSide < 760 || mobileUA;
    isLowPower = isMobile || (memory > 0 && memory <= 4);
    quality = isLowPower ? 0.52 : 1;

    renderer = new THREE.WebGLRenderer({
      canvas: canvas,
      antialias: !isLowPower,
      alpha: false,
      powerPreference: 'high-performance',
      preserveDrawingBuffer: false
    });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, isLowPower ? 1.25 : 1.75));
    renderer.setSize(window.innerWidth, window.innerHeight, false);
    renderer.setClearColor(0x01030a, 1);

    scene = new THREE.Scene();
    scene.fog = null;
    camera = new THREE.PerspectiveCamera(42, window.innerWidth / window.innerHeight, 0.5, 20000);
    camera.position.set(0, 120, 460);
    clock = new THREE.Clock();

    TEX = { glow: texGlow(), ring: texRing(), smoke: texSmoke(), crater: texCrater(),
            glowBlue: texGlow('rgba(255,255,255,1)', 'rgba(120,200,255,0.6)') };

    buildLights();
    buildSky();
    buildEarth();
    buildGraticule();
    buildSpaceNodes();
    buildColony();
    buildFragments();
    buildArrows();
    buildFleets();
    buildMarkers();
    buildImpacts();
    buildMissiles();

    window.addEventListener('resize', onResize, false);
    canvas.addEventListener('webglcontextlost', function (e) { e.preventDefault(); }, false);
    canvas.addEventListener('webglcontextrestored', function () { onResize(); }, false);
    return { renderer, scene, camera };
  }

  function onResize() {
    const w = window.innerWidth, h = window.innerHeight;
    camera.aspect = w / h; camera.updateProjectionMatrix();
    renderer.setSize(w, h, false);
  }

  /* ---------------- ライト ---------------- */
  function buildLights() {
    sunLight = new THREE.DirectionalLight(0xfff3e0, 1.45);
    sunLight.position.set(-380, 180, 460);
    scene.add(sunLight);

    fillLight = new THREE.DirectionalLight(0x3a6ea8, 0.42);
    fillLight.position.set(320, -160, -300);
    scene.add(fillLight);

    scene.add(new THREE.AmbientLight(0x223349, 0.55));

    impactLight = new THREE.PointLight(0xffc070, 0, 700, 2);
    scene.add(impactLight);
  }

  /* ---------------- 星空 ---------------- */
  function buildSky() {
    const loader = new THREE.TextureLoader();
    const skyMat = new THREE.MeshBasicMaterial({
      map: loader.load('images/night-sky.png'), side: THREE.BackSide, depthWrite: false
    });
    const sky = new THREE.Mesh(new THREE.SphereGeometry(6000, 32, 20), skyMat);
    scene.add(sky);

    // 追加の点光源的な星
    const n = isLowPower ? 520 : 2200;
    const pos = new Float32Array(n * 3);
    for (let i = 0; i < n; i++) {
      const v = new THREE.Vector3().setFromSphericalCoords(
        2600 + Math.random() * 2200,
        Math.acos(2 * Math.random() - 1),
        Math.random() * Math.PI * 2);
      pos[i * 3] = v.x; pos[i * 3 + 1] = v.y; pos[i * 3 + 2] = v.z;
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    registry.starField = new THREE.Points(g, new THREE.PointsMaterial({
      color: 0xdfe9ff, size: 9, sizeAttenuation: true, transparent: true, opacity: 0.85, depthWrite: false
    }));
    scene.add(registry.starField);
  }

  /* ---------------- 地球 ---------------- */
  function buildEarth() {
    const loader = new THREE.TextureLoader();
    const seg = isLowPower ? 48 : 112;
    const mat = new THREE.MeshPhongMaterial({
      map: loader.load('images/earth-blue-marble.jpg'),
      bumpMap: loader.load('images/earth-topology.png'),
      bumpScale: 1.4,
      specularMap: loader.load('images/earth-water.png'),
      specular: new THREE.Color(0x2b4b6b),
      shininess: 14
    });
    const earth = new THREE.Mesh(new THREE.SphereGeometry(EARTH_R, seg, seg / 2), mat);
    earth.name = 'earth';
    registry.earth = earth;
    scene.add(earth);

    // 大気（フレネル）
    const atmMat = new THREE.ShaderMaterial({
      transparent: true, side: THREE.BackSide, depthWrite: false, blending: THREE.AdditiveBlending,
      uniforms: { uColor: { value: new THREE.Color(0x5aa9ff) }, uPower: { value: 2.6 } },
      vertexShader: [
        'varying vec3 vN; varying vec3 vP;',
        'void main(){ vN = normalize(normalMatrix * normal);',
        ' vec4 mv = modelViewMatrix * vec4(position,1.0); vP = mv.xyz;',
        ' gl_Position = projectionMatrix * mv; }'
      ].join('\n'),
      fragmentShader: [
        'uniform vec3 uColor; uniform float uPower; varying vec3 vN; varying vec3 vP;',
        'void main(){ float f = pow(clamp(1.0 - abs(dot(normalize(vN), normalize(-vP))), 0.0, 1.0), uPower);',
        ' gl_FragColor = vec4(uColor, f * 0.95); }'
      ].join('\n')
    });
    registry.atmosphere = new THREE.Mesh(new THREE.SphereGeometry(EARTH_R * 1.055, 48, 32), atmMat);
    scene.add(registry.atmosphere);

    // 薄い雲リング風のハロー
    const halo = new THREE.Mesh(
      new THREE.SphereGeometry(EARTH_R * 1.012, 48, 32),
      new THREE.MeshPhongMaterial({ color: 0x7fb2e5, transparent: true, opacity: 0.055,
        depthWrite: false, blending: THREE.AdditiveBlending })
    );
    registry.cloudsRing = halo;
    scene.add(halo);
  }

  /* ---------------- 経緯線グリッド ---------------- */
  function buildGraticule() {
    const grp = new THREE.Group();
    const mat = new THREE.LineBasicMaterial({ color: 0x2f6ea0, transparent: true, opacity: 0.16 });
    for (let lat = -60; lat <= 60; lat += 30) {
      const pts = [];
      for (let lon = -180; lon <= 180; lon += 4) pts.push(ll2v(lat, lon, EARTH_R * 1.003));
      grp.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints(pts), mat));
    }
    for (let lon = -180; lon < 180; lon += 30) {
      const pts = [];
      for (let lat = -88; lat <= 88; lat += 4) pts.push(ll2v(lat, lon, EARTH_R * 1.003));
      grp.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints(pts), mat));
    }
    grp.name = 'graticule';
    scene.add(grp);
  }

  /* ---------------- 宇宙拠点（サイド／要塞） ---------------- */
  function buildSpaceNodes() {
    const grp = new THREE.Group();
    Object.keys(SPACE_NODES).forEach(function (k) {
      if (k === 'fracture') return;
      const n = SPACE_NODES[k];
      const p = nodeToVec(n);
      const isZeon = (k === 'side3' || k === 'side2');
      const col = isZeon ? 0xff5a3c : 0x49b8ff;

      // クラスタを表す小円筒群
      const cluster = new THREE.Group();
      const cnt = k === 'lunaTwo' ? 1 : 5;
      for (let i = 0; i < cnt; i++) {
        const m = new THREE.Mesh(
          k === 'lunaTwo'
            ? new THREE.IcosahedronGeometry(5.4, 0)
            : new THREE.CylinderGeometry(1.1, 1.1, 4.6, 8),
          new THREE.MeshPhongMaterial({ color: 0x8fa2b5, emissive: new THREE.Color(col).multiplyScalar(0.12), shininess: 30 })
        );
        const a = (i / cnt) * Math.PI * 2;
        m.position.set(Math.cos(a) * 7.5, (Math.random() - 0.5) * 3, Math.sin(a) * 7.5);
        m.rotation.set(Math.random(), Math.random(), Math.random());
        cluster.add(m);
      }
      // リングマーカー
      const ring = new THREE.Sprite(new THREE.SpriteMaterial({
        map: TEX.ring, color: col, transparent: true, opacity: 0.75,
        blending: THREE.AdditiveBlending, depthWrite: false
      }));
      ring.scale.set(34, 34, 1);
      cluster.add(ring);

      cluster.position.copy(p);
      cluster.lookAt(0, 0, 0);
      cluster.userData.spin = 0.12 + Math.random() * 0.1;
      grp.add(cluster);
    });
    grp.name = 'spaceNodes';
    scene.add(grp);
    registry.spaceNodes = grp;
  }

  /* ---------------- コロニー（開放型・島3号型） ---------------- */
  function makeColonyBody(len, rad, detail) {
    const g = new THREE.Group();
    const hullMat = new THREE.MeshPhongMaterial({ color: 0xb9c4cf, shininess: 44, specular: 0x4a5560 });
    const landMat = new THREE.MeshPhongMaterial({ color: 0x3f6b41, shininess: 6 });
    const glassMat = new THREE.MeshPhongMaterial({
      color: 0x9fd8ff, emissive: 0x2a5a80, transparent: true, opacity: 0.42, shininess: 90, side: THREE.DoubleSide
    });

    // 3枚の居住パネル＋3枚の窓（開放型 = 60度ずつ交互）
    for (let i = 0; i < 3; i++) {
      const base = i * (Math.PI * 2 / 3);
      const land = new THREE.Mesh(
        new THREE.CylinderGeometry(rad, rad, len, detail, 1, true, base, Math.PI / 3 * 0.98),
        landMat);
      g.add(land);
      const glass = new THREE.Mesh(
        new THREE.CylinderGeometry(rad * 0.995, rad * 0.995, len, detail, 1, true, base + Math.PI / 3, Math.PI / 3 * 0.98),
        glassMat);
      g.add(glass);
      // 窓枠のフレーム
      for (let f = -1; f <= 1; f += 2) {
        const fr = new THREE.Mesh(new THREE.BoxGeometry(rad * 0.14, len, rad * 0.1), hullMat);
        const a = base + Math.PI / 3 + (f > 0 ? Math.PI / 3 : 0);
        fr.position.set(Math.cos(a) * rad, 0, -Math.sin(a) * rad);
        fr.rotation.y = -a;
        g.add(fr);
      }
      // 反射ミラー（外部に開く3枚）
      const mirror = new THREE.Mesh(
        new THREE.PlaneGeometry(rad * 1.9, len * 0.92),
        new THREE.MeshPhongMaterial({ color: 0xdfe8f2, emissive: 0x27384a, shininess: 120,
          side: THREE.DoubleSide, transparent: true, opacity: 0.72 })
      );
      const am = base + Math.PI / 3 + Math.PI / 6;
      const outR = rad * 1.85;
      mirror.position.set(Math.cos(am) * outR, 0, -Math.sin(am) * outR);
      mirror.rotation.y = -am + Math.PI / 2;
      mirror.rotation.z = 0.42;
      g.add(mirror);
    }

    // 外殻リブ
    for (let z = -1; z <= 1; z++) {
      const rib = new THREE.Mesh(new THREE.TorusGeometry(rad * 1.02, rad * 0.045, 6, detail), hullMat);
      rib.rotation.x = Math.PI / 2;
      rib.position.y = z * len * 0.34;
      g.add(rib);
    }
    // 両端キャップ
    [-1, 1].forEach(function (s) {
      const cap = new THREE.Mesh(new THREE.CylinderGeometry(rad * 1.04, rad * 0.72, len * 0.06, detail), hullMat);
      cap.position.y = s * len * 0.5;
      g.add(cap);
      const port = new THREE.Mesh(new THREE.CylinderGeometry(rad * 0.3, rad * 0.3, len * 0.05, 10), hullMat);
      port.position.y = s * len * 0.55;
      g.add(port);
    });
    return g;
  }

  function buildColony() {
    const grp = new THREE.Group();
    const detail = isLowPower ? 12 : 24;
    const body = makeColonyBody(26, 3.2, detail);
    grp.add(body);

    // 推進ユニット（作戦後に出現）
    const thrusterGrp = new THREE.Group();
    for (let i = 0; i < 3; i++) {
      const a = i * (Math.PI * 2 / 3) + 0.5;
      const unit = new THREE.Group();
      const nozzle = new THREE.Mesh(
        new THREE.CylinderGeometry(1.15, 1.7, 4.4, 10),
        new THREE.MeshPhongMaterial({ color: 0x6f7885, shininess: 50 }));
      unit.add(nozzle);
      const flame = new THREE.Mesh(
        new THREE.ConeGeometry(1.35, 12, 10, 1, true),
        new THREE.MeshBasicMaterial({ color: 0x7fd0ff, transparent: true, opacity: 0.0,
          blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide }));
      flame.position.y = -7.6; flame.rotation.x = Math.PI;
      unit.add(flame);
      const halo = new THREE.Sprite(new THREE.SpriteMaterial({ map: TEX.glowBlue, color: 0x9fe0ff,
        transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false }));
      halo.scale.set(14, 14, 1); halo.position.y = -6;
      unit.add(halo);
      unit.position.set(Math.cos(a) * 2.6, -14.6, Math.sin(a) * 2.6);
      unit.userData = { flame: flame, halo: halo };
      thrusterGrp.add(unit);
      registry.thrusters.push(unit);
    }
    thrusterGrp.visible = false;
    grp.add(thrusterGrp);

    // 姿勢制御スラスタ（小）
    const rcs = new THREE.Group();
    for (let i = 0; i < 6; i++) {
      const a = i * Math.PI / 3;
      const m = new THREE.Mesh(new THREE.BoxGeometry(1.5, 1.5, 1.5),
        new THREE.MeshPhongMaterial({ color: 0x8a919c }));
      m.position.set(Math.cos(a) * 3.6, 11.2, Math.sin(a) * 3.6);
      rcs.add(m);
    }
    rcs.visible = false;
    grp.add(rcs);

    // G3ガスFX（緑の霧）
    const gasCount = isLowPower ? 70 : 260;
    const gpos = new Float32Array(gasCount * 3);
    for (let i = 0; i < gasCount; i++) {
      const a = Math.random() * Math.PI * 2, rr = 1.4 + Math.random() * 1.6;
      gpos[i * 3] = Math.cos(a) * rr;
      gpos[i * 3 + 1] = (Math.random() - 0.5) * 24;
      gpos[i * 3 + 2] = Math.sin(a) * rr;
    }
    const gg = new THREE.BufferGeometry();
    gg.setAttribute('position', new THREE.BufferAttribute(gpos, 3));
    const gas = new THREE.Points(gg, new THREE.PointsMaterial({
      color: 0x8dff9a, size: 2.2, transparent: true, opacity: 0,
      blending: THREE.AdditiveBlending, depthWrite: false, map: TEX.glow
    }));
    grp.add(gas);
    registry.gasFx = gas;

    // 位置決め
    grp.position.copy(nodeToVec(SPACE_NODES.side2));
    grp.userData = { body: body, thrusterGrp: thrusterGrp, rcs: rcs, spin: 0 };
    registry.colony = grp;
    scene.add(grp);

    // 降下カーブ
    registry.descentCurve = new THREE.CatmullRomCurve3(DESCENT_PATH.map(nodeToVec), false, 'catmullrom', 0.35);
  }

  /* ---------------- 断裂後の破片 ---------------- */
  function tearGeometry(geo, amp) {
    const p = geo.attributes.position;
    for (let i = 0; i < p.count; i++) {
      const y = p.getY(i);
      const edge = Math.abs(Math.abs(y) - (geo.parameters.height / 2)) < 0.01;
      if (edge) {
        p.setY(i, y + (Math.random() - 0.5) * amp);
        p.setX(i, p.getX(i) * (0.92 + Math.random() * 0.16));
        p.setZ(i, p.getZ(i) * (0.92 + Math.random() * 0.16));
      }
    }
    p.needsUpdate = true;
    geo.computeVertexNormals();
    return geo;
  }

  function buildFragments() {
    const detail = isLowPower ? 10 : 20;
    const lens = [11.5, 8.0, 7.0];
    for (let i = 0; i < 3; i++) {
      const grp = new THREE.Group();
      const len = lens[i];

      // 破断した外殻
      const hull = new THREE.Mesh(
        tearGeometry(new THREE.CylinderGeometry(3.2, 3.2, len, detail, 2, true), 2.6),
        new THREE.MeshPhongMaterial({ color: 0x9aa6b2, emissive: 0x000000, shininess: 30, side: THREE.DoubleSide })
      );
      grp.add(hull);
      // 内部の土壌断面
      const core = new THREE.Mesh(
        new THREE.CylinderGeometry(2.9, 2.9, len * 0.98, detail, 1, true),
        new THREE.MeshPhongMaterial({ color: 0x54402e, emissive: 0x000000, side: THREE.DoubleSide, shininess: 4 })
      );
      grp.add(core);
      // 折れた構造材
      for (let k = 0; k < 6; k++) {
        const bar = new THREE.Mesh(new THREE.BoxGeometry(0.4, 1.6 + Math.random() * 3.4, 0.4),
          new THREE.MeshPhongMaterial({ color: 0x77808c }));
        const a = Math.random() * Math.PI * 2;
        bar.position.set(Math.cos(a) * 3.1, (Math.random() - 0.5) * len, Math.sin(a) * 3.1);
        bar.rotation.set(Math.random(), Math.random(), Math.random());
        grp.add(bar);
      }

      // 再突入プラズマ
      const plasma = new THREE.Mesh(
        new THREE.ConeGeometry(5.6, 16, 16, 1, true),
        new THREE.MeshBasicMaterial({ color: 0xffb055, transparent: true, opacity: 0,
          blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide })
      );
      plasma.rotation.x = Math.PI;
      plasma.position.y = -len * 0.55;
      grp.add(plasma);

      const glow = new THREE.Sprite(new THREE.SpriteMaterial({ map: TEX.glow, color: 0xff9a3c,
        transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false }));
      glow.scale.set(34, 34, 1);
      grp.add(glow);

      // 火の粉トレイル
      const n = isLowPower ? 36 : 130;
      const arr = new Float32Array(n * 3);
      const tg = new THREE.BufferGeometry();
      tg.setAttribute('position', new THREE.BufferAttribute(arr, 3));
      const trail = new THREE.Points(tg, new THREE.PointsMaterial({
        map: TEX.glow, color: 0xffb066, size: 5.2, transparent: true, opacity: 0,
        blending: THREE.AdditiveBlending, depthWrite: false
      }));
      trail.frustumCulled = false;
      scene.add(trail);

      grp.visible = false;
      grp.userData = {
        curve: new THREE.CatmullRomCurve3(FRAGMENT_PATHS[i].map(nodeToVec), false, 'catmullrom', 0.3),
        plasma: plasma, glow: glow, hull: hull, core: core, trail: trail,
        trailPts: [], len: len, spin: (Math.random() - 0.5) * 1.6, tumble: Math.random() * 6
      };
      scene.add(grp);
      registry.fragments.push(grp);
    }
  }

  /* ---------------- 進行矢印（軌道チューブ＋矢頭） ---------------- */
  const ARROW_COLORS = { zeon: 0xff4f3a, fed: 0x3fa9ff, colony: 0xffc63a, impact: 0xff7a2a };

  function buildArrows() {
    ARROWS.forEach(function (a) {
      const curve = new THREE.CatmullRomCurve3(a.path.map(nodeToVec), false, 'catmullrom', 0.32);
      const segs = isLowPower ? 70 : 160;
      const geo = new THREE.TubeGeometry(curve, segs, a.side === 'colony' ? 1.5 : 1.0, 8, false);
      const col = ARROW_COLORS[a.side];
      const mat = new THREE.MeshBasicMaterial({ color: col, transparent: true, opacity: 0.0,
        blending: THREE.AdditiveBlending, depthWrite: false });
      const tube = new THREE.Mesh(geo, mat);
      tube.geometry.setDrawRange(0, 0);
      scene.add(tube);

      // ガイドライン（薄い破線的な補助線）
      const guidePts = curve.getPoints(segs);
      const guide = new THREE.Line(
        new THREE.BufferGeometry().setFromPoints(guidePts),
        new THREE.LineDashedMaterial({ color: col, transparent: true, opacity: 0,
          dashSize: 6, gapSize: 5, depthWrite: false }));
      guide.computeLineDistances();
      scene.add(guide);

      // 矢頭
      const head = new THREE.Mesh(
        new THREE.ConeGeometry(a.side === 'colony' ? 4.6 : 3.4, a.side === 'colony' ? 12 : 9, 12),
        new THREE.MeshBasicMaterial({ color: col, transparent: true, opacity: 0, depthWrite: false })
      );
      scene.add(head);

      registry.arrows.push({ def: a, curve: curve, tube: tube, head: head, guide: guide,
        total: geo.index ? geo.index.count : 0, color: col });
    });
  }

  /* ---------------- 艦隊 ---------------- */
  function makeShip(side) {
    const g = new THREE.Group();
    const hull = new THREE.MeshPhongMaterial({ color: side === 'zeon' ? 0x8f7f6d : 0xa9b6c4, shininess: 40 });
    const acc = new THREE.MeshPhongMaterial({ color: side === 'zeon' ? 0x5f5245 : 0x6d7987, shininess: 20 });
    if (side === 'zeon') {
      // ムサイ級風：円錐＋2本の主砲柱
      const body = new THREE.Mesh(new THREE.CylinderGeometry(0.55, 1.5, 5.4, 8), hull);
      body.rotation.x = Math.PI / 2; g.add(body);
      [-1, 1].forEach(function (s) {
        const arm = new THREE.Mesh(new THREE.CylinderGeometry(0.34, 0.34, 3.6, 6), acc);
        arm.rotation.x = Math.PI / 2; arm.position.set(s * 1.2, 0.3, -0.8); g.add(arm);
      });
      const eng = new THREE.Mesh(new THREE.CylinderGeometry(1.0, 1.2, 1.2, 8), acc);
      eng.rotation.x = Math.PI / 2; eng.position.z = -3.0; g.add(eng);
    } else {
      // サラミス／マゼラン級風：箱型艦体＋艦橋
      const body = new THREE.Mesh(new THREE.BoxGeometry(1.5, 1.1, 6.2), hull); g.add(body);
      const bow = new THREE.Mesh(new THREE.ConeGeometry(0.8, 2.0, 6), hull);
      bow.rotation.x = Math.PI / 2; bow.position.z = 3.8; g.add(bow);
      const brg = new THREE.Mesh(new THREE.BoxGeometry(0.9, 0.9, 1.4), acc);
      brg.position.set(0, 0.9, -1.6); g.add(brg);
      [-1, 1].forEach(function (s) {
        const pod = new THREE.Mesh(new THREE.BoxGeometry(0.6, 0.6, 2.6), acc);
        pod.position.set(s * 1.25, -0.2, -1.0); g.add(pod);
      });
    }
    // エンジン光
    const glow = new THREE.Sprite(new THREE.SpriteMaterial({
      map: TEX.glowBlue, color: side === 'zeon' ? 0xffb060 : 0x8fd4ff,
      transparent: true, opacity: 0.9, blending: THREE.AdditiveBlending, depthWrite: false }));
    glow.scale.set(5.5, 5.5, 1); glow.position.z = -3.6;
    g.add(glow);
    return g;
  }

  function buildFleets() {
    FLEETS.forEach(function (f) {
      const grp = new THREE.Group();
      const from = nodeToVec(f.from), to = nodeToVec(f.to);
      const ships = [];
      for (let i = 0; i < Math.max(3, Math.round(f.count * (isLowPower ? 0.55 : 1))); i++) {
        const s = makeShip(f.side);
        const sc = 1.0 + Math.random() * 0.5;
        s.scale.setScalar(sc);
        s.userData.off = new THREE.Vector3(
          (Math.random() - 0.5) * f.spread,
          (Math.random() - 0.5) * f.spread * 0.55,
          (Math.random() - 0.5) * f.spread);
        s.userData.ph = Math.random() * Math.PI * 2;
        grp.add(s);
        ships.push(s);
      }
      // 編隊を示す薄い接続線
      grp.visible = false;
      scene.add(grp);
      registry.fleets.push({ def: f, group: grp, ships: ships, from: from, to: to,
        curve: new THREE.CatmullRomCurve3([from, from.clone().lerp(to, 0.5)
          .add(from.clone().cross(to).normalize().multiplyScalar(24)), to], false, 'catmullrom', 0.3) });
    });
  }

  /* ---------------- 地表マーカー ---------------- */
  function buildMarkers() {
    Object.keys(GEO).forEach(function (k) {
      const g = GEO[k];
      const surf = ll2v(g.lat, g.lon, EARTH_R * 1.004);
      const isTarget = (k === 'jaburo');
      const col = isTarget ? 0x4fb0ff : 0xff6a3d;
      const grp = new THREE.Group();

      // 十字ターゲット
      const ring = new THREE.Mesh(
        new THREE.RingGeometry(2.2, 3.0, 32),
        new THREE.MeshBasicMaterial({ color: col, transparent: true, opacity: 0,
          side: THREE.DoubleSide, depthWrite: false, blending: THREE.AdditiveBlending })
      );
      grp.add(ring);
      const ring2 = new THREE.Mesh(
        new THREE.RingGeometry(4.4, 4.9, 40),
        new THREE.MeshBasicMaterial({ color: col, transparent: true, opacity: 0,
          side: THREE.DoubleSide, depthWrite: false, blending: THREE.AdditiveBlending })
      );
      grp.add(ring2);
      // 引き出し線
      const stem = new THREE.Line(
        new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(0, 0, 0), new THREE.Vector3(0, 0, 16)]),
        new THREE.LineBasicMaterial({ color: col, transparent: true, opacity: 0 })
      );
      grp.add(stem);

      grp.position.copy(surf);
      grp.lookAt(0, 0, 0);
      grp.rotateY(Math.PI);
      grp.userData = { key: k, ring: ring, ring2: ring2, stem: stem, col: col };
      scene.add(grp);
      registry.markers.push(grp);
    });
  }

  /* ---------------- 着弾FX ---------------- */
  function buildImpacts() {
    IMPACTS.forEach(function (im) {
      const g = GEO[im.geo];
      const up = ll2v(g.lat, g.lon, 1).normalize();
      const surf = up.clone().multiplyScalar(EARTH_R);
      const grp = new THREE.Group();
      grp.position.copy(surf.clone().multiplyScalar(1.001));
      grp.lookAt(0, 0, 0);

      // クレーター（地表デカール）
      const crater = new THREE.Mesh(
        new THREE.CircleGeometry(im.crater * 3.2, 48),
        new THREE.MeshBasicMaterial({ map: TEX.crater, transparent: true, opacity: 0,
          depthWrite: false })
      );
      crater.position.z = 0.15;
      crater.rotation.z = Math.random() * Math.PI;
      crater.scale.setScalar(0.2);
      grp.add(crater);

      // 閃光
      const flash = new THREE.Sprite(new THREE.SpriteMaterial({ map: TEX.glow, color: 0xfff2c8,
        transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false }));
      flash.scale.set(10, 10, 1);
      grp.add(flash);

      // 衝撃波リング（3重）
      const rings = [];
      for (let i = 0; i < 3; i++) {
        const r = new THREE.Mesh(
          new THREE.RingGeometry(0.9, 1.0, 64),
          new THREE.MeshBasicMaterial({ color: i === 0 ? 0xfff0c0 : 0xff9a52, transparent: true,
            opacity: 0, side: THREE.DoubleSide, depthWrite: false, blending: THREE.AdditiveBlending })
        );
        r.position.z = 0.4 + i * 0.05;
        r.userData.delay = i * 0.55;
        grp.add(r); rings.push(r);
      }

      // キノコ雲／粉塵
      const n = isLowPower ? 70 : 300;
      const pos = new Float32Array(n * 3);
      const seed = [];
      for (let i = 0; i < n; i++) {
        const a = Math.random() * Math.PI * 2;
        const rr = Math.pow(Math.random(), 0.6);
        seed.push({ a: a, r: rr, h: Math.random(), sp: 0.6 + Math.random() * 0.9 });
        pos[i * 3] = 0; pos[i * 3 + 1] = 0; pos[i * 3 + 2] = 0;
      }
      const dg = new THREE.BufferGeometry();
      dg.setAttribute('position', new THREE.BufferAttribute(pos, 3));
      const dust = new THREE.Points(dg, new THREE.PointsMaterial({
        map: TEX.smoke, color: 0xcfc4b4, size: im.crater * 2.4, transparent: true, opacity: 0,
        depthWrite: false, sizeAttenuation: true
      }));
      dust.frustumCulled = false;
      grp.add(dust);

      // イジェクタ（放出物）
      const en = isLowPower ? 26 : 90;
      const epos = new Float32Array(en * 3);
      const eseed = [];
      for (let i = 0; i < en; i++) {
        eseed.push({ a: Math.random() * Math.PI * 2, el: 0.4 + Math.random() * 0.9, sp: 8 + Math.random() * 26 });
      }
      const eg = new THREE.BufferGeometry();
      eg.setAttribute('position', new THREE.BufferAttribute(epos, 3));
      const ejecta = new THREE.Points(eg, new THREE.PointsMaterial({
        map: TEX.glow, color: 0xffb070, size: 4.5, transparent: true, opacity: 0,
        blending: THREE.AdditiveBlending, depthWrite: false
      }));
      ejecta.frustumCulled = false;
      grp.add(ejecta);

      // 火柱
      const pillar = new THREE.Mesh(
        new THREE.CylinderGeometry(im.crater * 0.8, im.crater * 1.6, im.crater * 6, 16, 1, true),
        new THREE.MeshBasicMaterial({ color: 0xff8a3a, transparent: true, opacity: 0,
          blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide })
      );
      pillar.rotation.x = Math.PI / 2;
      pillar.position.z = im.crater * 3;
      grp.add(pillar);

      scene.add(grp);
      registry.impacts.push({ def: im, group: grp, crater: crater, flash: flash, rings: rings,
        dust: dust, dustSeed: seed, ejecta: ejecta, ejectaSeed: eseed, pillar: pillar, up: up, surf: surf });
    });
  }

  /* ---------------- 核ミサイルと爆発 ---------------- */
  function buildMissiles() {
    const n = isLowPower ? 10 : 26;
    for (let i = 0; i < n; i++) {
      const m = new THREE.Group();
      const body = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.16, 2.2, 6),
        new THREE.MeshPhongMaterial({ color: 0xd8dee6 }));
      body.rotation.x = Math.PI / 2;
      m.add(body);
      const flame = new THREE.Sprite(new THREE.SpriteMaterial({ map: TEX.glowBlue, color: 0xaee4ff,
        transparent: true, opacity: 0.95, blending: THREE.AdditiveBlending, depthWrite: false }));
      flame.scale.set(3.6, 3.6, 1); flame.position.z = -1.6;
      m.add(flame);
      m.visible = false;
      scene.add(m);
      registry.missiles.push({ obj: m, t0: 0, t1: 0, from: new THREE.Vector3(), lead: Math.random() });
    }
    // 核爆発フラッシュ
    for (let i = 0; i < (isLowPower ? 6 : 16); i++) {
      const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: TEX.glow, color: 0xffffff,
        transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false }));
      s.scale.set(1, 1, 1);
      scene.add(s);
      registry.nukeFlashes.push({ spr: s, t: -1, dur: 1.4, pos: new THREE.Vector3(), size: 40 + Math.random() * 46 });
    }
  }

  /* ======================================================================
     位置計算：コロニー／破片
     ====================================================================== */
  const _v1 = new THREE.Vector3(), _v2 = new THREE.Vector3(), _q = new THREE.Quaternion();
  const _m = new THREE.Matrix4(), _up = new THREE.Vector3(0, 1, 0);

  function colonyProgress(t) {
    if (t < SHOW.T_DEORBIT) return 0;
    const x = clamp01((t - SHOW.T_DEORBIT) / (SHOW.T_FRACTURE - SHOW.T_DEORBIT));
    return Math.pow(x, 1.55) * 0.999;
  }
  function colonyPos(t, out) {
    const p = colonyProgress(t);
    const v = registry.descentCurve.getPoint(p);
    // 待機中の微小ドリフト
    if (t < SHOW.T_DEORBIT) {
      const w = t * 0.06;
      v.x += Math.sin(w) * 2.4; v.y += Math.cos(w * 0.8) * 1.8; v.z += Math.sin(w * 1.3) * 2.0;
    }
    return (out || new THREE.Vector3()).copy(v);
  }
  function fragProgress(i, t) {
    const t0 = SHOW.T_FRACTURE + 2 + i * 1.2;
    const t1 = SHOW.T_IMPACT[i];
    const x = clamp01((t - t0) / (t1 - t0));
    return Math.pow(x, 1.35);
  }
  function fragPos(i, t, out) {
    const f = registry.fragments[i];
    const v = f.userData.curve.getPoint(clamp01(fragProgress(i, t)));
    return (out || new THREE.Vector3()).copy(v);
  }

  /** カメラ追尾対象の現在位置 */
  function targetPos(name, t, out) {
    out = out || new THREE.Vector3();
    if (!name) return out.set(0, 0, 0);
    if (name === 'colony') {
      if (t > SHOW.T_FRACTURE) return fragPos(0, t, out);
      return colonyPos(t, out);
    }
    if (name.indexOf('frag') === 0) {
      const i = parseInt(name.slice(4), 10) || 0;
      if (t < SHOW.T_FRACTURE) return colonyPos(t, out);
      return fragPos(i, t, out);
    }
    if (name.indexOf('fleet:') === 0) {
      const id = name.slice(6);
      const fl = registry.fleets.filter(function (f) { return f.def.id === id; })[0];
      if (!fl) return out.set(0, 0, 0);
      const x = clamp01((t - fl.def.t0) / (fl.def.t1 - fl.def.t0));
      return out.copy(fl.curve.getPoint(x));
    }
    return out.set(0, 0, 0);
  }

  /* ======================================================================
     更新
     ====================================================================== */
  function update(t, dt) {
    tNow = t;
    updateEarth(t, dt);
    updateColony(t, dt);
    updateFragments(t, dt);
    updateArrows(t);
    updateFleets(t, dt);
    updateMissiles(t, dt);
    updateMarkers(t, dt);
    updateImpacts(t, dt);
    updateSpaceNodes(t, dt);
  }

  function updateEarth(t, dt) {
    registry.earth.rotation.y += dt * 0.0075;
    registry.cloudsRing.rotation.y += dt * 0.011;
    if (registry.starField) registry.starField.rotation.y += dt * 0.0012;

    // 着弾以降、地球が暗くくすむ（粉塵）
    const dark = smooth(SHOW.T_IMPACT[0], SHOW.T_IMPACT[0] + 16, t) * 0.42;
    registry.earth.material.color.setRGB(1 - dark * 0.55, 1 - dark * 0.62, 1 - dark * 0.68);
    sunLight.intensity = 1.45 - dark * 0.5;
    registry.atmosphere.material.uniforms.uColor.value.setHSL(0.58 - dark * 0.11, 0.85, 0.62 - dark * 0.14);
  }

  function updateColony(t, dt) {
    const c = registry.colony;
    const ud = c.userData;
    const visible = t < SHOW.T_FRACTURE + 0.4;
    c.visible = visible;
    if (!visible) return;

    colonyPos(t, _v1);
    c.position.copy(_v1);

    // 進行方向へ長軸を向ける
    const p = colonyProgress(t);
    if (t >= SHOW.T_DEORBIT) {
      registry.descentCurve.getTangent(clamp01(p), _v2);
    } else {
      _v2.copy(_v1).cross(_up).normalize();
    }
    _m.lookAt(new THREE.Vector3(0, 0, 0), _v2, _up);
    _q.setFromRotationMatrix(_m);
    // 円筒のY軸を進行方向に合わせる
    const align = new THREE.Quaternion().setFromUnitVectors(_up, _v2.clone().normalize());
    c.quaternion.slerp(align, 1 - Math.pow(0.001, dt));

    // 自転（居住のための回転）
    ud.spin += dt * (t < SHOW.T_SEIZE ? 0.42 : 0.2);
    ud.body.rotation.y = ud.spin;

    // 制圧＝居住区の灯が消える
    const dead = smooth(SHOW.T_GAS, SHOW.T_GAS + 10, t);
    ud.body.traverse(function (o) {
      if (o.material && o.material.emissive) {
        if (o.material.opacity !== undefined && o.material.transparent && o.material.color) {
          // 窓ガラス
          o.material.emissive.setRGB(0.16 * (1 - dead) + 0.02, 0.35 * (1 - dead) + 0.02, 0.5 * (1 - dead) + 0.03);
        }
      }
    });

    // G3ガス
    const gasOn = smooth(SHOW.T_GAS, SHOW.T_GAS + 4, t) * (1 - smooth(SHOW.T_GAS + 14, SHOW.T_GAS + 22, t));
    registry.gasFx.material.opacity = gasOn * 0.55;
    registry.gasFx.rotation.y += dt * 0.6;

    // 推進ユニット装着
    ud.thrusterGrp.visible = t >= SHOW.T_THRUST_ON - 4;
    ud.rcs.visible = t >= SHOW.T_THRUST_ON - 4;
    const burn = smooth(SHOW.T_THRUST_ON, SHOW.T_THRUST_ON + 6, t) *
                 (1 - smooth(SHOW.T_FRACTURE - 14, SHOW.T_FRACTURE, t) * 0.55);
    const flick = 0.82 + Math.sin(t * 22) * 0.1 + Math.sin(t * 37) * 0.08;
    registry.thrusters.forEach(function (u, i) {
      u.userData.flame.material.opacity = burn * 0.72 * flick;
      u.userData.flame.scale.set(1, 0.75 + burn * 0.5 + Math.sin(t * 18 + i) * 0.08, 1);
      u.userData.halo.material.opacity = burn * 0.75 * flick;
    });
  }

  function updateFragments(t, dt) {
    const on = t >= SHOW.T_FRACTURE;
    registry.fragments.forEach(function (f, i) {
      const ud = f.userData;
      const landed = t >= SHOW.T_IMPACT[i];
      f.visible = on && !landed;
      ud.trail.material.opacity = (on && !landed) ? 0.85 : 0;
      if (!f.visible) { return; }

      fragPos(i, t, _v1);
      f.position.copy(_v1);
      ud.curve.getTangent(clamp01(fragProgress(i, t)), _v2);

      // 落下方向へ倒れ込みつつ不安定に回転
      const align = new THREE.Quaternion().setFromUnitVectors(_up, _v2.clone().normalize());
      f.quaternion.slerp(align, 1 - Math.pow(0.02, dt));
      f.rotateY(ud.spin * dt * 3);
      f.rotateX(Math.sin(t * 0.8 + ud.tumble) * dt * 0.9);

      // 断裂直後の飛散
      const burst = 1 - smooth(SHOW.T_FRACTURE, SHOW.T_FRACTURE + 6, t);
      if (burst > 0) {
        const dir = _v1.clone().normalize().cross(_up).normalize();
        f.position.add(dir.multiplyScalar((i - 1) * 12 * burst));
      }

      // 大気圏突入で白熱
      const alt = _v1.length() - EARTH_R;
      const heat = clamp01(1 - alt / 78);
      const heat2 = Math.pow(heat, 1.6);
      ud.plasma.material.opacity = heat2 * 0.85;
      ud.plasma.scale.setScalar(0.8 + heat2 * 1.5);
      ud.glow.material.opacity = heat2 * 0.9;
      ud.glow.scale.setScalar(1 + heat2 * 2.2);
      ud.hull.material.emissive.setRGB(heat2 * 1.0, heat2 * 0.42, heat2 * 0.08);
      ud.core.material.emissive.setRGB(heat2 * 0.8, heat2 * 0.24, 0);

      // トレイル更新
      const pts = ud.trailPts;
      pts.unshift(_v1.clone());
      const maxP = ud.trail.geometry.attributes.position.count;
      if (pts.length > maxP) pts.length = maxP;
      const arr = ud.trail.geometry.attributes.position.array;
      for (let k = 0; k < maxP; k++) {
        const src = pts[Math.min(k, pts.length - 1)];
        const j = k * 3;
        const jitter = 1 + k * 0.02;
        arr[j] = src.x + (Math.random() - 0.5) * jitter;
        arr[j + 1] = src.y + (Math.random() - 0.5) * jitter;
        arr[j + 2] = src.z + (Math.random() - 0.5) * jitter;
      }
      ud.trail.geometry.attributes.position.needsUpdate = true;
      ud.trail.material.size = 3 + heat2 * 7;
      ud.trail.material.opacity = 0.3 + heat2 * 0.6;
    });
  }

  function updateArrows(t) {
    registry.arrows.forEach(function (a) {
      const d = a.def;
      const fadeIn = smooth(d.t0 - 2, d.t0 + 1.5, t);
      const fadeOut = 1 - smooth(d.t1 + 6, d.t1 + 14, t);
      const alpha = fadeIn * fadeOut;
      const prog = clamp01((t - d.t0) / (d.t1 - d.t0));

      a.tube.material.opacity = alpha * 0.55;
      a.guide.material.opacity = alpha * 0.3;
      a.tube.geometry.setDrawRange(0, Math.floor(a.total * prog));

      if (alpha > 0.02 && prog > 0.002) {
        a.head.visible = true;
        a.head.material.opacity = alpha * 0.95;
        a.curve.getPoint(prog, _v1);
        a.curve.getTangent(prog, _v2);
        a.head.position.copy(_v1);
        a.head.quaternion.setFromUnitVectors(_up, _v2.normalize());
      } else {
        a.head.visible = false;
      }
      a.tube.visible = alpha > 0.01;
      a.guide.visible = alpha > 0.01;
    });
  }

  function updateFleets(t, dt) {
    registry.fleets.forEach(function (fl) {
      const d = fl.def;
      const on = t > d.t0 - 3 && t < d.t1 + 12;
      fl.group.visible = on;
      if (!on) return;
      const x = clamp01((t - d.t0) / (d.t1 - d.t0));
      const base = fl.curve.getPoint(x);
      const tan = fl.curve.getTangent(x).normalize();
      const alpha = smooth(d.t0 - 3, d.t0, t) * (1 - smooth(d.t1 + 4, d.t1 + 12, t));

      fl.ships.forEach(function (s, i) {
        const o = s.userData.off;
        const wob = Math.sin(t * 0.9 + s.userData.ph) * 2.2;
        s.position.copy(base)
          .add(new THREE.Vector3(o.x, o.y + wob, o.z));
        s.lookAt(s.position.clone().add(tan));
        s.traverse(function (m) {
          if (m.material) {
            m.material.transparent = true;
            m.material.opacity = (m.type === 'Sprite' ? 0.9 : 1.0) * alpha;
          }
        });
      });
    });
  }

  function updateMissiles(t, dt) {
    const fired = t >= SHOW.T_MISSILE;
    const fleet = registry.fleets.filter(function (f) { return f.def.id === 'fed-luna'; })[0];
    registry.missiles.forEach(function (ms, i) {
      const t0 = SHOW.T_MISSILE + ms.lead * 8;
      const t1 = SHOW.T_FRACTURE + (Math.random() * 0.001);
      const flight = t1 - t0;
      const x = (t - t0) / flight;
      if (!fired || x < 0 || x > 1) { ms.obj.visible = false; return; }
      ms.obj.visible = true;
      // 発射元＝連邦艦隊付近
      if (!ms.fromSet && fleet) {
        const xx = clamp01((t0 - fleet.def.t0) / (fleet.def.t1 - fleet.def.t0));
        ms.from.copy(fleet.curve.getPoint(xx)).add(new THREE.Vector3(
          (Math.random() - 0.5) * 30, (Math.random() - 0.5) * 18, (Math.random() - 0.5) * 30));
        ms.fromSet = true;
      }
      colonyPos(t, _v2);
      const cur = ms.from.clone().lerp(_v2, easeIn(x, 1.4));
      // 弧を描かせる
      const bulge = Math.sin(x * Math.PI) * 26;
      cur.add(ms.from.clone().cross(_v2).normalize().multiplyScalar(bulge * (i % 2 ? 1 : -1) * 0.5));
      ms.obj.position.copy(cur);
      ms.obj.lookAt(_v2);
    });

    // 核爆発フラッシュ
    registry.nukeFlashes.forEach(function (nf, i) {
      const t0 = SHOW.T_FRACTURE - 4 + i * 0.22;
      const x = (t - t0) / nf.dur;
      if (x < 0 || x > 1) { nf.spr.material.opacity = 0; nf.spr.visible = false; return; }
      nf.spr.visible = true;
      if (!nf.placed) {
        colonyPos(t, _v2);
        nf.pos.copy(_v2).add(new THREE.Vector3(
          (Math.random() - 0.5) * 26, (Math.random() - 0.5) * 26, (Math.random() - 0.5) * 26));
        nf.placed = true;
      }
      nf.spr.position.copy(nf.pos);
      const e = Math.sin(Math.pow(x, 0.45) * Math.PI);
      nf.spr.material.opacity = e;
      nf.spr.scale.setScalar(nf.size * (0.3 + Math.pow(x, 0.5) * 1.6));
    });
    // リセット（シーク時）
    if (t < SHOW.T_MISSILE - 1) {
      registry.missiles.forEach(function (m) { m.fromSet = false; });
      registry.nukeFlashes.forEach(function (n) { n.placed = false; });
    }
  }

  function updateMarkers(t, dt) {
    registry.markers.forEach(function (m) {
      const ud = m.userData;
      let alpha = 0;
      if (ud.key === 'jaburo') alpha = smooth(114, 120, t) * (1 - smooth(196, 206, t));
      else if (ud.key === 'sydney') alpha = smooth(206, 214, t);
      else if (ud.key === 'pacific') alpha = smooth(210, 218, t);
      else if (ud.key === 'namerica') alpha = smooth(212, 220, t);
      else alpha = 0;
      const pulse = 0.6 + Math.sin(t * 3.4) * 0.4;
      ud.ring.material.opacity = alpha * 0.9;
      ud.ring2.material.opacity = alpha * 0.45 * pulse;
      ud.stem.material.opacity = alpha * 0.5;
      ud.ring2.scale.setScalar(1 + Math.sin(t * 2.2) * 0.12);
      m.visible = alpha > 0.01;
    });
  }

  function updateImpacts(t, dt) {
    let lightSum = 0;
    registry.impacts.forEach(function (im, idx) {
      const T = im.def.t;
      const x = t - T;
      if (x < -0.2) {
        im.crater.material.opacity = 0;
        im.flash.material.opacity = 0;
        im.dust.material.opacity = 0;
        im.ejecta.material.opacity = 0;
        im.pillar.material.opacity = 0;
        im.rings.forEach(function (r) { r.material.opacity = 0; });
        im.group.visible = false;
        return;
      }
      im.group.visible = true;
      const P = im.def.power;

      // 閃光
      const fl = Math.max(0, 1 - x / 1.5);
      im.flash.material.opacity = Math.pow(fl, 1.3);
      im.flash.scale.setScalar(12 + (1 - fl) * 120 * P);
      lightSum += Math.pow(fl, 1.4) * P * 5.5;

      // クレーター成長
      const cg = smooth(0, 3.2, x);
      im.crater.material.opacity = cg * 0.95;
      im.crater.scale.setScalar(0.25 + cg * 0.9);

      // 衝撃波リング
      im.rings.forEach(function (r, i) {
        const xr = x - r.userData.delay;
        if (xr < 0) { r.material.opacity = 0; return; }
        const s = xr / (10 + i * 4);
        if (s > 1) { r.material.opacity = 0; return; }
        const rad = 1 + s * im.def.crater * 13;
        r.scale.setScalar(rad);
        r.material.opacity = (1 - s) * 0.75 * P;
      });

      // 粉塵（キノコ雲）
      const dl = smooth(0.2, 6, x);
      im.dust.material.opacity = dl * 0.5 * (1 - smooth(30, 70, x) * 0.45);
      const dpos = im.dust.geometry.attributes.position.array;
      const ct = Math.min(x, 40);
      im.dustSeed.forEach(function (s, i) {
        const rise = Math.pow(ct * s.sp * 0.55, 0.86) * (0.5 + s.h);
        const spread = Math.pow(ct * 0.5, 0.9) * s.r * im.def.crater * 1.5;
        const j = i * 3;
        dpos[j] = Math.cos(s.a + ct * 0.05) * spread;
        dpos[j + 1] = Math.sin(s.a + ct * 0.05) * spread;
        dpos[j + 2] = rise * im.def.crater * 0.5;
      });
      im.dust.geometry.attributes.position.needsUpdate = true;
      im.dust.material.size = im.def.crater * (2.0 + Math.min(x, 20) * 0.16);

      // イジェクタ
      const el = 1 - smooth(0.2, 9, x);
      im.ejecta.material.opacity = el * 0.9;
      const epos = im.ejecta.geometry.attributes.position.array;
      im.ejectaSeed.forEach(function (s, i) {
        const tt = Math.max(0, x);
        const d = s.sp * tt;
        const j = i * 3;
        epos[j] = Math.cos(s.a) * d * 0.8;
        epos[j + 1] = Math.sin(s.a) * d * 0.8;
        epos[j + 2] = d * s.el - 4.0 * tt * tt;
      });
      im.ejecta.geometry.attributes.position.needsUpdate = true;

      // 火柱
      const pl = Math.max(0, 1 - x / 5.5);
      im.pillar.material.opacity = Math.pow(pl, 1.2) * 0.8;
      im.pillar.scale.set(1 + (1 - pl) * 0.6, 1 + (1 - pl) * 1.4, 1);
    });
    impactLight.intensity = lightSum;
    if (lightSum > 0.05) {
      const strongest = registry.impacts.reduce(function (a, b) {
        return Math.abs(tNow - a.def.t) < Math.abs(tNow - b.def.t) ? a : b;
      });
      impactLight.position.copy(strongest.surf.clone().multiplyScalar(1.25));
    }
  }

  function updateSpaceNodes(t, dt) {
    if (!registry.spaceNodes) return;
    registry.spaceNodes.children.forEach(function (c) {
      c.rotateZ(dt * (c.userData.spin || 0.1) * 0.3);
    });
  }

  /* ---------------- 公開API ---------------- */
  return {
    init: init,
    update: update,
    render: function () { renderer.render(scene, camera); },
    get camera() { return camera; },
    get scene() { return scene; },
    get renderer() { return renderer; },
    get isMobile() { return isMobile; },
    ll2v: ll2v,
    nodeToVec: nodeToVec,
    targetPos: targetPos,
    colonyPos: colonyPos,
    fragPos: fragPos,
    EARTH_R: EARTH_R,
    registry: registry
  };
})();
