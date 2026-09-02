/* ==========================================================================
   OPERATION BRITISH — U.C.0079 コロニー落とし 3Dドキュメンタリー
   番組台本データ（章立て・ナレーション・テロップ・年表・地点・カメラ）
   出典：Wikipedia「コロニー落とし」「一週間戦争」ほか 宇宙世紀公式年表
   ========================================================================== */
'use strict';

/* ---------- マスタータイムライン（秒） ---------- */
const SHOW = {
  duration: 268,

  /* 主要イベント時刻 */
  T_DECLARE:      30,   // 宣戦布告
  T_GAS:          66,   // 30バンチへのG3ガス投入
  T_SEIZE:        58,   // コロニー制圧開始
  T_THRUST_ON:    96,   // 姿勢制御・推進ユニット点火
  T_DEORBIT:     122,   // 降下軌道投入（地球へ向けて発進）
  T_MISSILE:     152,   // 連邦軍 核ミサイル斉射
  T_FRACTURE:    178,   // コロニー断裂（3分割）
  T_ENTRY:       205,   // 大気圏突入・軌道逸れ
  T_IMPACT:     [228, 231.5, 235],  // 着弾（シドニー / 南太平洋 / 北米）
  T_AFTERMATH:   246    // 被害集計
};

/* ---------- 章立て ---------- */
const CHAPTERS = [
  { no: 'CH.01', t0:   0, t1:  26, title: 'プロローグ　宇宙世紀',        sub: 'U.C.0079 — 人類の半数が宇宙に住んでいた' },
  { no: 'CH.02', t0:  26, t1:  56, title: '開戦　ジオン公国宣戦布告',    sub: 'U.C.0079.01.03 — 独立戦争の始まり' },
  { no: 'CH.03', t0:  56, t1:  86, title: 'サイド2 30バンチ制圧',        sub: '開放型コロニー「アイランド・イフィッシュ」' },
  { no: 'CH.04', t0:  86, t1: 116, title: 'ブリティッシュ作戦発動',      sub: 'コロニーを質量兵器へ改装' },
  { no: 'CH.05', t0: 116, t1: 146, title: '降下軌道　地球へ',            sub: '目標：地球連邦軍本部ジャブロー' },
  { no: 'CH.06', t0: 146, t1: 172, title: '連邦軍迎撃　核ミサイル斉射',  sub: 'ルナツー駐留艦隊による阻止行動' },
  { no: 'CH.07', t0: 172, t1: 196, title: '断裂　コロニー3分割',         sub: '軌道が逸れ、制御を失う' },
  { no: 'CH.08', t0: 196, t1: 222, title: '大気圏突入',                  sub: '摩擦熱に焼かれる36kmの構造体' },
  { no: 'CH.09', t0: 222, t1: 246, title: '着弾　シドニー',              sub: '直径約500kmのクレーター湾が生まれた' },
  { no: 'CH.10', t0: 246, t1: 268, title: '帰結　27億の死者',            sub: '南極条約、そして一年戦争へ' }
];

/* ---------- ナレーション字幕 ---------- */
const NARRATION = [
  { t:   1.0, d: 7.0, text: '宇宙世紀0079。人類が増えすぎた人口を宇宙に移民させ、すでに半世紀が過ぎていた。' },
  { t:   8.5, d: 7.0, text: '地球を巡る巨大な人工都市——スペースコロニー。そこには数十億の人々が暮らしていた。' },
  { t:  16.0, d: 8.0, text: 'その巨大構造物は、やがて人類自身に向けられる史上最悪の兵器へと姿を変える。' },
  { t:  27.0, d: 7.5, text: '0079年1月3日。地球から最も遠いサイド3、ジオン公国が地球連邦政府に対し独立を宣言。' },
  { t:  35.0, d: 7.5, text: '宣戦布告と同時に、ジオン軍は各サイドの連邦軍駐留艦隊へ一斉に攻撃を開始した。' },
  { t:  43.5, d: 8.0, text: 'ミノフスキー粒子と機動兵器モビルスーツ。旧来の艦隊戦力は、わずか数日で無力化されていく。' },
  { t:  57.0, d: 7.0, text: '同じ日、ジオン軍の一隊が向かったのは戦場ではなく、無防備な民間コロニーだった。' },
  { t:  64.5, d: 8.0, text: 'サイド2、30バンチ——開放型コロニー「アイランド・イフィッシュ」。全長36キロメートル。' },
  { t:  73.0, d: 8.5, text: '住民への通告はなかった。注入されたのはG3ガス。居住区は数時間で沈黙し、都市は「容器」となった。' },
  { t:  87.0, d: 8.0, text: 'ブリティッシュ作戦。ジオン公国総帥ギレン・ザビが承認した、コロニーそのものを落とす作戦である。' },
  { t:  95.5, d: 8.0, text: '外壁に姿勢制御ロケットと大型推進ユニットが取り付けられ、街は加速する質量へ変えられた。' },
  { t: 104.0, d: 8.5, text: '質量、数千万トン。核兵器を用いず、運動エネルギーだけで大陸を破壊できる——それが質量兵器だ。' },
  { t: 117.0, d: 7.5, text: '1月4日、コロニーは軌道を離れる。狙いは南米アマゾン、地球連邦軍総司令部ジャブロー。' },
  { t: 125.5, d: 8.0, text: '地下深くに築かれた要塞を、上空から質量ごと押し潰す。それがジオンの描いた終戦の絵図だった。' },
  { t: 134.0, d: 8.0, text: '落下軌道に乗った構造体は、もはや誰の手にも止められない速度で地球へ向かい始める。' },
  { t: 147.0, d: 7.5, text: '連邦軍は事態を把握する。月面裏側の要塞ルナツーから、迎撃艦隊が緊急発進した。' },
  { t: 155.5, d: 8.0, text: '手段は選べなかった。艦隊は落下するコロニーへ向け、核ミサイルの斉射を敢行する。' },
  { t: 164.0, d: 7.0, text: '目的は破壊ではない。せめて軌道を逸らし、ジャブローへの直撃を避けること。' },
  { t: 173.0, d: 7.5, text: '数十発の核が炸裂。全長36キロの円筒は耐えきれず、ついに三つに分断された。' },
  { t: 181.0, d: 8.0, text: '軌道は確かに逸れた。しかし、それは落下地点が予測不能になったことを意味していた。' },
  { t: 190.0, d: 6.5, text: '三つの破片は、それぞれ別の空へ散っていく。' },
  { t: 197.0, d: 7.5, text: '1月10日。断裂した巨大構造体が、大気圏へ突入する。' },
  { t: 205.5, d: 8.0, text: '摩擦熱により外壁は白熱し、破片は巨大な火球となって空を裂いた。' },
  { t: 214.0, d: 7.0, text: '最大の破片——全体のおよそ三分の一が、オーストラリア大陸へ向かう。' },
  { t: 223.0, d: 6.0, text: '着弾。目標地点、シドニー。' },
  { t: 230.0, d: 7.5, text: '衝撃は大陸の一角を消し去り、直径500キロを超えるクレーター湾を形成した。' },
  { t: 238.0, d: 7.5, text: '残る破片は南太平洋と北米大陸に落下。地殻を揺らし、大津波と粉塵が地球を覆う。' },
  { t: 247.0, d: 8.0, text: '一週間戦争。この一週間で失われた命は、当時の総人口の半数——およそ27億人と記録される。' },
  { t: 255.5, d: 7.5, text: '両軍は南極条約を締結し、核・生物・化学兵器とコロニー落としの禁止を取り決めた。' },
  { t: 263.0, d: 5.0, text: '一年戦争は、ここから始まる。' }
];

/* ---------- テロップ（ローワーサード） ---------- */
const TELOPS = [
  { t:   2, d: 10, kicker: 'UNIVERSAL CENTURY 0079',  title: 'コロニー落とし',                sub: 'OPERATION BRITISH / 宇宙世紀最悪の質量兵器攻撃' },
  { t:  28, d:  9, kicker: 'U.C.0079.01.03',          title: 'ジオン公国 独立宣言',            sub: '地球連邦政府へ宣戦布告' },
  { t:  44, d:  8, kicker: 'NEW WEAPON',              title: 'モビルスーツ投入',              sub: 'ミノフスキー粒子により艦隊戦術が崩壊' },
  { t:  58, d:  9, kicker: 'SIDE 2 / BUNCH 30',       title: 'アイランド・イフィッシュ',       sub: '開放型（島3号型）コロニー・全長36km' },
  { t:  72, d:  8, kicker: 'ATROCITY',                title: 'G3ガス投入',                   sub: '住民のほぼ全員が死亡・コロニーを無人化' },
  { t:  88, d:  9, kicker: 'OPERATION',               title: 'ブリティッシュ作戦',            sub: '発案：ジオン公国総帥 ギレン・ザビ' },
  { t: 104, d:  8, kicker: 'MASS WEAPON',             title: '質量兵器',                     sub: '運動エネルギー＝質量 × 速度²／2' },
  { t: 118, d:  9, kicker: 'TARGET',                  title: '目標：ジャブロー',              sub: '南米アマゾン地下・地球連邦軍総司令部' },
  { t: 148, d:  9, kicker: 'FEDERATION FORCES',       title: 'ルナツー艦隊 迎撃行動',          sub: 'マゼラン級／サラミス級による阻止攻撃' },
  { t: 158, d:  8, kicker: 'INTERCEPT',               title: '核ミサイル斉射',                sub: '軌道偏向を目的とした緊急措置' },
  { t: 174, d:  9, kicker: 'FRACTURE',                title: 'コロニー断裂',                  sub: '構造体は3つの破片に分断された' },
  { t: 198, d:  8, kicker: 'U.C.0079.01.10',          title: '大気圏突入',                   sub: '突入速度は秒速数km・空は火に覆われた' },
  { t: 224, d:  9, kicker: 'IMPACT',                  title: '着弾：シドニー',                sub: 'オーストラリア大陸の一部が消失' },
  { t: 232, d:  8, kicker: 'AFTERMATH',               title: 'シドニー・クレーター湾',         sub: '直径約500km／現在も残る戦争の傷跡' },
  { t: 248, d:  9, kicker: 'ONE WEEK BATTLE',         title: '死者 約27億人',                 sub: '当時の総人口の約半数が失われた' },
  { t: 256, d:  8, kicker: 'TREATY',                  title: '南極条約',                     sub: '核・NBC兵器およびコロニー落としの禁止' }
];

/* ---------- データパネル（右側カード） ---------- */
const DATA_CARDS = [
  { t:  58, d: 34, title: 'COLONY SPEC', rows: [
      ['名称', 'アイランド・イフィッシュ'], ['所属', 'サイド2 / 30バンチ'],
      ['型式', '開放型（島3号型）'], ['全長', '約 36 km'], ['直径', '約 6.4 km'], ['人口', '数百万人規模'] ] },
  { t:  92, d: 30, title: 'MASS WEAPON DATA', rows: [
      ['作戦名', 'ブリティッシュ作戦'], ['推定質量', '数千万 t'],
      ['推進', '外装ロケット・姿勢制御'], ['落下速度', '秒速 数 km'], ['等価威力', '大陸規模'] ] },
  { t: 118, d: 28, title: 'PRIMARY TARGET', rows: [
      ['目標', 'ジャブロー'], ['位置', '南米・アマゾン地下'],
      ['性格', '地球連邦軍総司令部'], ['深度', '地下数百m級要塞'] ] },
  { t: 148, d: 26, title: 'FEDERATION RESPONSE', rows: [
      ['拠点', '宇宙要塞 ルナツー'], ['戦力', 'マゼラン級 / サラミス級'],
      ['手段', '核ミサイル斉射'], ['目的', '軌道偏向（撃破不能）'] ] },
  { t: 176, d: 26, title: 'FRACTURE ANALYSIS', rows: [
      ['破片数', '3'], ['最大破片', '全体の約 1/3'],
      ['軌道', '予測不能に変化'], ['ジャブロー', '直撃を回避'] ] },
  { t: 222, d: 24, title: 'IMPACT SITES', rows: [
      ['第1破片', 'シドニー（豪州）'], ['第2破片', '南太平洋'],
      ['第3破片', '北米大陸'], ['クレーター', '直径 約500 km'] ] },
  { t: 246, d: 22, title: 'CASUALTIES', rows: [
      ['期間', '一週間戦争（7日間）'], ['死者', '約 27 億人'],
      ['比率', '総人口の約 50%'], ['帰結', '南極条約 締結'] ] }
];

/* ---------- 年表（左パネル） ---------- */
const CHRONOLOGY = [
  { t:  26, date: '0079.01.03', text: 'ジオン公国、独立宣言・宣戦布告' },
  { t:  40, date: '0079.01.03', text: '各サイドの連邦駐留艦隊へ奇襲' },
  { t:  56, date: '0079.01.03', text: 'サイド2 30バンチを制圧' },
  { t:  66, date: '0079.01.03', text: 'G3ガス投入・住民ほぼ全滅' },
  { t:  86, date: '0079.01.04', text: 'ブリティッシュ作戦 発動' },
  { t: 122, date: '0079.01.04', text: 'コロニー、降下軌道へ投入' },
  { t: 146, date: '0079.01.09', text: 'ルナツー艦隊による迎撃行動' },
  { t: 178, date: '0079.01.09', text: '核攻撃によりコロニー断裂' },
  { t: 205, date: '0079.01.10', text: '破片、大気圏へ突入' },
  { t: 228, date: '0079.01.10', text: 'シドニーへ着弾・湾が形成' },
  { t: 246, date: '0079.01.10', text: '一週間戦争終結・死者約27億' },
  { t: 256, date: '0079.01.31', text: '南極条約 締結' }
];

/* ---------- 地理座標（緯度・経度） ---------- */
const GEO = {
  sydney:   { lat: -33.87, lon: 151.21, name: 'シドニー',      tag: 'IMPACT 01' },
  pacific:  { lat: -22.00, lon:-158.00, name: '南太平洋',      tag: 'IMPACT 02' },
  namerica: { lat:  41.00, lon: -99.00, name: '北米大陸',      tag: 'IMPACT 03' },
  jaburo:   { lat:  -4.40, lon: -63.00, name: 'ジャブロー',    tag: 'TARGET' },
  odessa:   { lat:  46.48, lon:  30.73, name: 'オデッサ',      tag: 'REF' },
  california:{lat:  36.00, lon:-119.00, name: 'カリフォルニア',tag: 'REF' }
};

/* ---------- 着弾データ ---------- */
const IMPACTS = [
  { key: 'sydney',   geo: 'sydney',   t: SHOW.T_IMPACT[0], power: 1.00, crater: 7.2, label: 'シドニー',   note: '最大破片・約1/3' },
  { key: 'pacific',  geo: 'pacific',  t: SHOW.T_IMPACT[1], power: 0.62, crater: 4.2, label: '南太平洋',   note: '大津波を発生' },
  { key: 'namerica', geo: 'namerica', t: SHOW.T_IMPACT[2], power: 0.55, crater: 3.6, label: '北米大陸',   note: '内陸部に落下' }
];

/* ---------- 宇宙側の拠点（緯度経度＋高度で定義） ---------- */
const SPACE_NODES = {
  side2:    { lat:  16, lon: 176, r: 320, name: 'SIDE 2 / 30 BUNCH' },
  side3:    { lat: -26, lon:-150, r: 360, name: 'SIDE 3 (ZEON)' },
  lunaTwo:  { lat:  34, lon:  38, r: 300, name: 'LUNA TWO' },
  side5:    { lat: -10, lon:  92, r: 340, name: 'SIDE 5 (LOUM)' },
  fracture: { lat:  -4, lon:-166, r: 196, name: 'FRACTURE POINT' }
};

/* ---------- コロニー降下軌道（ノード） ---------- */
const DESCENT_PATH = [
  { lat:  16, lon: 176, r: 320 },
  { lat:  10, lon:-178, r: 288 },
  { lat:   2, lon:-172, r: 240 },
  { lat:  -4, lon:-166, r: 196 }   // 断裂点
];

/* ---------- 破片ごとの落下経路（断裂点→着弾点） ---------- */
const FRAGMENT_PATHS = [
  /* 第1破片：シドニー */
  [ { lat:  -4, lon:-166, r: 196 }, { lat: -14, lon: 178, r: 156 }, { lat: -26, lon: 162, r: 116 }, { lat: -33.87, lon: 151.21, r: 100 } ],
  /* 第2破片：南太平洋 */
  [ { lat:  -4, lon:-166, r: 196 }, { lat: -10, lon:-164, r: 152 }, { lat: -18, lon:-160, r: 114 }, { lat: -22.0, lon:-158.0, r: 100 } ],
  /* 第3破片：北米大陸 */
  [ { lat:  -4, lon:-166, r: 196 }, { lat:  12, lon:-150, r: 158 }, { lat:  30, lon:-120, r: 118 }, { lat:  41.0, lon: -99.0, r: 100 } ]
];

/* ---------- 進行矢印 ---------- */
const ARROWS = [
  { id:'zeon-adv-1', t0: 30, t1: 60, side:'zeon', label:'ジオン軍 侵攻',
    path:[ SPACE_NODES.side3, { lat:-18, lon:-120, r: 340 }, { lat: -8, lon: 150, r: 330 }, SPACE_NODES.side2 ] },
  { id:'zeon-adv-2', t0: 36, t1: 66, side:'zeon', label:'サイド5方面',
    path:[ SPACE_NODES.side3, { lat:-22, lon:-40, r: 350 }, { lat:-16, lon:  40, r: 344 }, SPACE_NODES.side5 ] },
  { id:'colony-course', t0: 118, t1: 176, side:'colony', label:'コロニー降下軌道', path: DESCENT_PATH },
  { id:'fed-intercept', t0: 148, t1: 176, side:'fed', label:'ルナツー艦隊 迎撃',
    path:[ SPACE_NODES.lunaTwo, { lat: 22, lon:-70, r: 276 }, { lat:  6, lon:-140, r: 228 }, SPACE_NODES.fracture ] },
  { id:'frag-1', t0: 182, t1: 232, side:'impact', label:'第1破片 → シドニー', path: FRAGMENT_PATHS[0] },
  { id:'frag-2', t0: 184, t1: 234, side:'impact', label:'第2破片 → 南太平洋', path: FRAGMENT_PATHS[1] },
  { id:'frag-3', t0: 186, t1: 238, side:'impact', label:'第3破片 → 北米',     path: FRAGMENT_PATHS[2] }
];

/* ---------- 艦隊配置 ---------- */
const FLEETS = [
  { id:'zeon-strike', side:'zeon', name:'ジオン突撃機動軍', count: 9,
    t0: 30, t1: 120, from: SPACE_NODES.side3, to: SPACE_NODES.side2, spread: 26 },
  { id:'zeon-escort', side:'zeon', name:'コロニー護衛隊', count: 6,
    t0: 96, t1: 178, from: { lat: 18, lon: 172, r: 322 }, to: { lat: -2, lon:-168, r: 202 }, spread: 16 },
  { id:'fed-luna', side:'fed', name:'ルナツー迎撃艦隊', count: 11,
    t0: 146, t1: 182, from: SPACE_NODES.lunaTwo, to: { lat: 4, lon:-150, r: 224 }, spread: 30 },
  { id:'fed-reserve', side:'fed', name:'連邦 第2艦隊', count: 7,
    t0: 150, t1: 200, from: { lat: 40, lon:  60, r: 292 }, to: { lat: 20, lon: -30, r: 262 }, spread: 24 }
];

/* ---------- カメラキーフレーム ----------
   mode: 'orbit'  = 地球中心座標系の緯度経度・距離で固定（look は地球中心 or 地点）
         'follow' = 追尾対象（colony / frag0..2 / fleet:xxx）＋オフセット
--------------------------------------------------------------------------- */
const CAMERA_KEYS = [
  { t:   0, mode:'orbit',  pos:{ lat: 18, lon: 128, r: 470 }, look:{ lat: 0, lon: 150, r: 0 }, fov: 42, tag:'CAM 01 / WIDE ORBIT' },
  { t:  16, mode:'orbit',  pos:{ lat: 12, lon: 150, r: 400 }, look:{ lat: 4, lon: 165, r: 40 }, fov: 40, tag:'CAM 01 / WIDE ORBIT' },
  { t:  26, mode:'follow', target:'colony', offset:{ side: 130, up: 46, back: 150 }, fov: 38, tag:'CAM 02 / COLONY CLUSTER' },
  { t:  44, mode:'orbit',  pos:{ lat: -8, lon:-140, r: 392 }, look:{ lat:-16, lon:-150, r: 250 }, fov: 44, tag:'CAM 03 / ZEON ADVANCE' },
  { t:  58, mode:'follow', target:'colony', offset:{ side: 34, up: 12, back: 44 }, fov: 34, tag:'CAM 04 / ISLAND IFFISH' },
  { t:  72, mode:'follow', target:'colony', offset:{ side: -14, up: 5, back: 20 }, fov: 30, tag:'CAM 05 / HULL CLOSE' },
  { t:  88, mode:'follow', target:'colony', offset:{ side: 40, up: -16, back: 62 }, fov: 36, tag:'CAM 06 / RETROFIT' },
  { t: 104, mode:'follow', target:'colony', offset:{ side: -52, up: 20, back: 70 }, fov: 34, tag:'CAM 07 / THRUSTER' },
  { t: 118, mode:'orbit',  pos:{ lat: 30, lon:-176, r: 420 }, look:{ lat: 2, lon:-172, r: 150 }, fov: 42, tag:'CAM 08 / DEORBIT VECTOR' },
  { t: 134, mode:'follow', target:'colony', offset:{ side: 70, up: 30, back: 96 }, fov: 36, tag:'CAM 09 / DESCENT' },
  { t: 148, mode:'follow', target:'fleet:fed-luna', offset:{ side: 26, up: 10, back: 40 }, fov: 34, tag:'CAM 10 / LUNA TWO FLEET' },
  { t: 162, mode:'follow', target:'colony', offset:{ side: -46, up: 16, back: 66 }, fov: 32, tag:'CAM 11 / INTERCEPT' },
  { t: 176, mode:'follow', target:'colony', offset:{ side: 22, up: 8, back: 34 }, fov: 30, tag:'CAM 12 / FRACTURE' },
  { t: 184, mode:'follow', target:'frag0',  offset:{ side: 62, up: 26, back: 86 }, fov: 40, tag:'CAM 13 / BREAKUP' },
  { t: 198, mode:'follow', target:'frag0',  offset:{ side: 30, up: 14, back: 54 }, fov: 36, tag:'CAM 14 / RE-ENTRY' },
  { t: 212, mode:'follow', target:'frag0',  offset:{ side: -18, up: 10, back: 34 }, fov: 32, tag:'CAM 15 / FIREBALL' },
  { t: 222, mode:'orbit',  pos:{ lat: -28, lon: 174, r: 150 }, look:{ lat:-33.87, lon: 151.21, r: 4 }, fov: 40, tag:'CAM 16 / IMPACT POINT' },
  { t: 231, mode:'orbit',  pos:{ lat: -31, lon: 168, r: 118 }, look:{ lat:-33.87, lon: 151.21, r: 4 }, fov: 46, tag:'CAM 17 / SHOCKWAVE' },
  { t: 240, mode:'orbit',  pos:{ lat: -20, lon: 176, r: 210 }, look:{ lat:-31, lon: 146, r: 6 }, fov: 44, tag:'CAM 18 / DEVASTATION' },
  { t: 252, mode:'orbit',  pos:{ lat:  -8, lon:-172, r: 330 }, look:{ lat:-16, lon: 168, r: 10 }, fov: 42, tag:'CAM 19 / GLOBAL DAMAGE' },
  { t: 268, mode:'orbit',  pos:{ lat:  10, lon:-168, r: 430 }, look:{ lat: -6, lon: 176, r: 0 }, fov: 40, tag:'CAM 20 / EPILOGUE' }
];

/* ---------- 3D空間に浮かぶラベル ---------- */
const WORLD_LABELS = [
  { id:'l-colony',  type:'colony', text:'アイランド・イフィッシュ', sub:'SIDE 2 / BUNCH 30', t0: 52, t1: 180, cls:'label-zeon' },
  { id:'l-frag0',   type:'frag0',  text:'第1破片',  sub:'→ SYDNEY',      t0: 182, t1: 228, cls:'label-impact' },
  { id:'l-frag1',   type:'frag1',  text:'第2破片',  sub:'→ PACIFIC',     t0: 184, t1: 231, cls:'label-impact' },
  { id:'l-frag2',   type:'frag2',  text:'第3破片',  sub:'→ N.AMERICA',   t0: 186, t1: 235, cls:'label-impact' },
  { id:'l-sydney',  type:'geo', geo:'sydney',   text:'シドニー',    sub:'IMPACT POINT 01', t0: 210, t1: 268, cls:'label-impact' },
  { id:'l-pacific', type:'geo', geo:'pacific',  text:'南太平洋',    sub:'IMPACT POINT 02', t0: 214, t1: 268, cls:'label-impact' },
  { id:'l-namerica',type:'geo', geo:'namerica', text:'北米大陸',    sub:'IMPACT POINT 03', t0: 216, t1: 268, cls:'label-impact' },
  { id:'l-jaburo',  type:'geo', geo:'jaburo',   text:'ジャブロー',  sub:'連邦軍総司令部',  t0: 116, t1: 200, cls:'label-fed' },
  { id:'l-luna',    type:'node',geo:'lunaTwo',  text:'ルナツー',    sub:'LUNA TWO',        t0: 144, t1: 186, cls:'label-fed' },
  { id:'l-side3',   type:'node',geo:'side3',    text:'サイド3',     sub:'ZEON',            t0:  27, t1:  70, cls:'label-zeon' }
];
