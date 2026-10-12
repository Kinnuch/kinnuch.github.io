// 规则常量。数值出处与推导见 design/00-规则规格与里程碑.md。
// 内核以固定步长推进：1 步 = dt 秒，所有周期都换算成整数步，保证逐步可复现。

export const RULES = {
  dt: 0.05,               // 1 步 = 0.05 秒（20 Hz）

  // 造船
  prodInterval: 1.0,      // 约每秒 1 艘
  prodJitter: 0.05,       // 间隔 ±5%
  lowControlSlow: 3,      // 控制度为 0 时造船间隔 ×3，100 时 ×1（线性）
  starCap: 50,            // 单星造船上限（飞来的船不受此限）
  capPerStar: 8,          // 势力总船数上限 = 星系星数 × 8

  // 外发
  sendEvery: 5,           // 每 5 步（0.25 秒）发一批
  sendRate: 4,            // 艘/秒

  // 交战（每 0.5 秒结算一次，各方同时扣船）
  fightEvery: 10,
  lossBase: [3, 6],       // [下限, 上限)：基础每次损失 3–5 艘
  lossShielded: [2, 4],   // 原地防守（星主没有外发）或身处气体云：2–3 艘
  lossBoth: [1, 3],       // 两者兼得：1–2 艘
  lossCapMul: 2,          // 单次损失不超过「最大敌军 × 2」
  bigBattle: 25,          // 较大一方每满 25 艘，损失再翻倍，最多 ×4
  bigBattleMax: 4,
  peaceGrace: 1.0,        // 交战停止 1 秒后才算和平

  // 控制度（约每秒结算一次）
  ctrlInterval: 1.0,
  ctrlJitter: 0.05,
  growthDiv: 5,           // 增长 = round(兵力优势 / 5)
  growthCap: 5,           // 最多 +5（兵力优势超过 25 艘不再更快）
  ownerBonus: 1,          // 星主占优时再 +1（自然回复）
  ownerHold: 10,          // 星主在场超过 10 艘但不占优：对方增长减半
  loseBelow: 20,          // 星主控制度跌破 20 即失守

  // 开局与时限
  homeShips: 10,
  timeLimit: 900,         // 默认 15 分钟，到时星最多者胜

  // 势力刷新：计数、来袭兵力、威胁场、足迹、出局判定
  facEvery: 5,
  lingerSec: 1,           // 舰船离开后，这颗星在迷雾里还能再看清 1 秒

  // AI（逐星决策）
  aiInterval: 1.0,
  aiJitter: 0.1,
  aiOwnerWeight: 11 / 7,  // 估算兵力时，星主的守军按 11/7 计
  aiDefendMargin: 5,      // 敌方兵力 + 5 超过己方即取消外发、原地防守
  threatMax: 32,          // 威胁场：交战星 / 敌星为 32，每远一跳减 1

  // 得分
  scoreMinSec: 120,       // 不足 2 分钟的对局不计分
  scoreCapture: 500, scoreLostStar: 250, scoreShipMade: 2, scoreShipLost: 1,
  scoreFullFleet: 0.95,   // 舰船曾达上限的 95%：得分 ×1.25
  scoreFloorPerMin: 3333, // 保底：每分钟 3333 × min(0.5, 最多星数 / 被占星总数)
};

// 异常天体：每 32 颗星的配额（星系越小，洗牌后落在星图上的越少）
export const ANOMALY_POOL = { nebula: 1, gas: 2, plasma: 1, asteroid: 2, comets: 2, vortex: 2 };

// 异常天体的规则效果
export const ANOMALY_FX = {
  nebula:   { prodSlow: 2, growthAdj: 1 },          // 造船间隔 ×2；控制度增长 adj +1；不能当母星
  gas:      { shielded: true },                     // 在此交战各方损失按「防守」档
  plasma:   { lossAdd: [1, 2], fleetCap: 25 },      // 损失 +1/+2；每方最多驻留 25，多出的被烧毁
  asteroid: { prodAmount: 2 },                      // 每次造 2 艘
  comets:   { sendMul: 2 },                         // 外发 ×2
  vortex:   { sendMul: 0.5 },                       // 外发 ÷2
};

// 异常天体的名称与说明（界面用）
export const ANOMALIES = {
  nebula: {
    name: '星云', good: '控制度涨得快一倍——好攻也难守', bad: '造船慢一倍；不能作为母星',
    lore: '一团尚在孕育恒星的气体，没有行星可开采。',
  },
  gas: {
    name: '气体云', good: '在此交战，各方损失都减少', bad: '',
    lore: '浓密的电离氢云包裹着恒星，干扰了所有舰船的自动瞄准。',
  },
  plasma: {
    name: '等离子', good: '', bad: '在此交战损失增加；每方最多驻留 25 艘，多出的会被烧毁',
    lore: '主星正在撕碎一颗被俘获的红矮星，整片星域险恶异常。',
  },
  asteroid: {
    name: '小行星带', good: '每次造 2 艘船', bad: '',
    lore: '环绕恒星的小行星带里，资源唾手可得。',
  },
  comets: {
    name: '彗星', good: '外发速度加倍', bad: '',
    lore: '几颗巨大的彗星被恒星引力俘获，舰船在此补给极快。',
  },
  vortex: {
    name: '漩涡', good: '', bad: '外发速度减半',
    lore: '强引力与电磁辐射扰乱了跃迁。',
  },
};

// 难度。aiPace：AI 舰船航程倍数（难度越低 AI 的船飞得越慢）；
// growth / loss：人类玩家的控制度增长与交战损失倍数（[分子, 分母]，整数截断）；score：得分倍数；
// personalities：AI 随机带上一种性格和它的能力卡组（否则只会调度舰船）。
export const CHALLENGES = {
  beginner:  { name: '新兵',   aiPace: 2.0, growth: [2, 1],  loss: [1, 2],     score: 0.35, personalities: false, desc: '适合上手：你占领快一倍、交战损失减半，AI 的船飞得慢一倍、不用能力' },
  easy:      { name: '中尉',   aiPace: 1.5, growth: [10, 8], loss: [75, 100],  score: 0.7,  personalities: false, desc: '你略占优势，AI 的船飞得慢一些、不用能力' },
  normal:    { name: '指挥官', aiPace: 1.2, growth: null,    loss: null,       score: 1,    personalities: false, desc: 'AI 的船飞得稍慢，不用能力' },
  hard:      { name: '上将',   aiPace: 1.0, growth: null,    loss: null,       score: 1.5,  personalities: true,  desc: 'AI 全速，各自带一种性格和能力卡组' },
  nightmare: { name: '皇帝',   aiPace: 1.0, growth: null,    loss: [125, 100], score: 2,    personalities: true,  desc: 'AI 全速、带能力，你的交战损失 +25%' },
};

// ——— 能力 ———
//
// 开局前在大厅配卡组（总点数 ≤ deckPoints）；对局里点卡、再点目标发动。
// 每张卡开局即在冷却中；发动后要等「持续 + 冷却」才能再用。互克的一对：别的势力开着克制卡时，你这张失效
// （定向卡须作用在同一颗星上；暗幕与间谍网是全局的，任何地方开着都算）。
//
// target：own 己方星 · enemy 敌方星（与你的星相邻或你刚到过）· ownOrNeutral 己方或中立星 · battle 有你在场的交战星
//         visited 你刚到过、控制度未满的星 · enemyVisited 你刚到过的敌方星
//         teleport 己方星 → 任意星 · route 你在场的星 → 相连的星 · newRoute 你在场的星 → 能新开星路的星
export const ABILITIES = {
  patriotism: { name: '爱国', cost: 2, dur: 20, cd: 60, target: 'own', counter: 'propaganda',
    desc: '目标星上敌人涨不了控制度、你的回升加倍；生效期间你所有的星不怕无政府、受贿赂大减' },
  propaganda: { name: '宣传', cost: 2, dur: 20, cd: 60, target: 'enemy', counter: 'patriotism',
    desc: '目标星的星主占优时控制度回升减半，你占优时增长加倍；在这颗星上贿赂更有效' },
  stealth:    { name: '暗幕', cost: 3, dur: 30, cd: 60, target: 'own', counter: 'spy',
    desc: '你的星和舰船从敌人视野里消失，敌人忘掉你的领地；你所有星的守军交战损失减少' },
  spy:        { name: '间谍网', cost: 3, dur: 30, cd: 60, target: 'enemy', counter: 'stealth',
    desc: '看清目标星主人的全部领土；他所有星的守军交战损失 +1' },
  stabilize:  { name: '拓宽', cost: 3, dur: 30, cd: 30, target: 'route', counter: 'degrade',
    desc: '拓宽一条星路：沿它外发每秒多 4 艘' },
  degrade:    { name: '干扰', cost: 3, dur: 30, cd: 30, target: 'route', counter: 'stabilize',
    desc: '干扰一条星路：沿它外发只剩四分之一' },
  defense:    { name: '防御', cost: 4, dur: 20, cd: 30, target: 'own', counter: 'offense',
    desc: '目标星上的敌军损失翻倍，你的损失减半（不足 6 艘时不损失）' },
  offense:    { name: '破坏', cost: 4, dur: 20, cd: 30, target: 'enemy', counter: 'defense',
    desc: '目标星上除你以外各方损失翻倍，你的损失减半（不足 6 艘时不损失）' },
  recruits:   { name: '征兵', cost: 4, dur: 0, cd: 70, target: 'ownOrNeutral',
    desc: '立刻募集舰船：自己的星 30–39 艘，有你舰船的星 20–29 艘，否则 5–9 艘（不受上限限制）' },
  explosion:  { name: '偷袭', cost: 4, dur: 0, cd: 20, target: 'battle',
    desc: '在敌军中引爆反物质弹头：除你以外每支舰队损失 75–89%' },
  bribe:      { name: '贿赂', cost: 5, dur: 0, cd: 45, target: 'visited',
    desc: '操纵选举：控制度 +100（中立且无人争夺）或 +65；对开着爱国的势力只有 +15–30，配合宣传 +75–100' },
  anarchy:    { name: '无政府', cost: 5, dur: 0, cd: 65, target: 'enemyVisited',
    desc: '煽动动乱：星主控制度减半、其他人清零，星立刻变中立（星主开着爱国时改为你 +20 控制度）' },
  teleport:   { name: '突击队', cost: 5, dur: 0, cd: 25, target: 'teleport',
    desc: '从自己的星抽出最多 25 艘，以十倍速直飞任意一颗星，不必沿星路' },
  purge:      { name: '清洗', cost: 5, dur: 0, cd: 25, target: 'own',
    desc: '全民起义：你所有星上的敌舰立刻全灭' },
  add:        { name: '开辟', cost: 6, dur: 0, cd: 45, target: 'newRoute',
    desc: '在两颗星之间新开一条星路（不能太远，不能与已有星路交叉）' },
  remove:     { name: '断航', cost: 6, dur: 0, cd: 60, target: 'route',
    desc: '彻底切断一条星路' },
  fleet:      { name: '策反', cost: 6, dur: 0, cd: 40, target: 'battle',
    desc: '策反最大的一支敌方舰队：在你的星上最多 50 艘、在别处最多 25 艘改投你方' },
};

export const TARGET_TEXT = {
  own: '你的一颗星', enemy: '敌方的星（与你相邻或你刚到过）', ownOrNeutral: '你的星或中立星（与你相邻或你刚到过）',
  battle: '你在场、有敌舰的星', visited: '你刚到过、控制度未满的星', enemyVisited: '你刚到过的敌方星',
  teleport: '从你的星拖到任意一颗星', route: '从你在场的星拖到相连的星', newRoute: '从你在场的星拖到附近的另一颗星',
};

// AI 性格：上将、皇帝难度下每个 AI 随机一种
export const PERSONALITIES = {
  defensive:  { name: '暗影', deck: ['patriotism', 'stealth', 'degrade', 'defense'] },
  offensive:  { name: '蛮力', deck: ['patriotism', 'propaganda', 'offense', 'explosion'] },
  creator:    { name: '盟约', deck: ['patriotism', 'recruits', 'fleet'] },
  converter:  { name: '信众', deck: ['propaganda', 'bribe', 'anarchy'] },
  purifier:   { name: '净化', deck: ['stealth', 'explosion', 'purge'] },
  striker:    { name: '游牧', deck: ['propaganda', 'bribe', 'teleport'] },
  politician: { name: '联盟', deck: ['propaganda', 'spy', 'stabilize', 'offense'] },
};

// 能力的数值（区间都是 [下限, 上限)）
export const ABILITY_FX = {
  recruitsOwn: [30, 40], recruitsHere: [20, 30], recruitsElse: [5, 10],
  explosionPct: [75, 90],
  bribeFree: 100, bribeContested: 65, bribeContestCtrl: 20,
  bribeVsPatriot: [15, 30], bribeWithPropaganda: [75, 100],
  anarchyVsPatriot: 20,
  teleportMax: 25, teleportPace: 0.1,
  fleetAtOwn: 50, fleetElse: 25,
  routeBoost: 4,          // 拓宽：外发每秒 +4
  routeChoke: 4,          // 干扰：外发 ÷4（最少 1）
  cardMinShips: 6,        // 防御 / 破坏：施放方不足 6 艘时不损失
};

export const DECK_POINTS = 12;                    // 卡组点数上限（成长模式下按等级给，见 GROWTH）
export const DEFAULT_DECK = ['patriotism', 'propaganda', 'defense', 'recruits'];

// ——— 成长（本机档案）———
//
// 经验每 50,000 升一级，满级 70。能力点 = 2 + ⌊(等级 − 1) / 3⌋，最多 12（31 级满）。
// 成长模式：单张卡的点数要小于能力点才能选（2 点的卡总能选），卡组总点数不超过能力点；
// 自由模式：直接 12 点，但 6 点的卡不能选，也不涨经验。
// 每局经验 = 得分 × 前期加成（1 级 ×10，21 级起 ×1，中间按 lerp(t, t², 0.5) 过渡）；不足 90 秒的对局不算。
export const GROWTH = {
  expPerLevel: 50000,
  maxLevel: 70,
  bonusMax: 10,
  bonusLevels: 20,
  pointsBase: 2,
  pointsEvery: 3,
  pointsMax: 12,
  freePoints: 12,
  freeMaxCost: 5,
  minGameSec: 90,
};

// 头衔：每 5 级换一个，共 14 个（名称暂定）
export const TITLES = [
  '见习领航员', '领航员', '星路斥候', '舰长', '分队长', '舰队长', '舰队司令',
  '星域守备', '星区总督', '星团执政', '旋臂领主', '星系霸主', '银河执政官', '群星之主',
];

export const secondsToSteps = (sec) => Math.max(1, Math.round(sec / RULES.dt));
