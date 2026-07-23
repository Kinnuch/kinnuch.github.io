/* ============================================================
   Barad Bith · 巴别塔
   用辛达语真实词典条目驱动的 roguelike 卡牌爬塔游戏。
   卡牌 / 敌人 / 圣物均取自 dictionary.json 中的真实辛达语词条。
   学习分两阶段：初次学习（词义）→ 弱强化；篝火复习（音变/变位）→ 强强化。
   ============================================================ */

const DICT_URL = "https://kinnuch.github.io/laim/sindarin.assets/SindarinDatabase/dictionary.json";
const MASTERY_KEY = "baradBithMastery";
const MUTATION_LABELS = {
    Soft: "软音变", Plural: "复数形式", "NasalⅠ": "鼻音变Ⅰ(带 in)", "NasalⅡ": "鼻音变Ⅱ(带 an)",
    "MixedⅠ": "混合音变Ⅰ(带 e-)", "MixedⅡ": "混合音变Ⅱ(带 anin)", Liquid: "流音音变(带 egor)",
    Stop: "闭锁音变(带 o)", H: "H音变(带 ah)", DH: "DH音变(带 nedh)",
    Comparative: "比较级", Superlative: "最高级",
    Present: "现在时", Past: "过去时", Future: "将来时", Imperative: "命令式",
    Gerund: "动名词", PastParticiple: "过去分词", PresentParticiple: "现在分词", PeferctParticle: "完成分词"
};

/* ------------------------------------------------------------
   卡牌定义
   rarity: common(白) / uncommon(蓝) / rare(金)
   数值三档：基础 / 弱强化(+w) / 强强化(+w+s)，w、s 为增量（cost 可为负=减费）
   字段：dmg 伤害, hits 攻击次数, block 护甲, heal 治疗, draw 抽牌,
        buffStrength 力量, buffDex 敏捷, energyGain 能量,
        vuln 对敌易伤, weak 对敌虚弱, cleanse 清除自身减益,
        startTurnBlock/drawBonus 能力效果, retainBlock 护甲保留,
        exhaust 战斗内消耗, exileAfterUse 永久消耗
   ------------------------------------------------------------ */
const CARD_DEFS = [
    // ===== 起始牌（4 打 4 防 + 1 特色）=====
    { form: "cam", part: "noun", kind: "attack", rarity: "common", cost: 1, dmg: 6, name: "打击", isStarter: true,
      flavorTpl: "以{w}挥出一击", w: { dmg: 2 }, s: { dmg: 3 } },
    { form: "coll", part: "noun", kind: "skill", rarity: "common", cost: 1, block: 5, name: "防御", isStarter: true,
      flavorTpl: "裹紧{w}格挡", w: { block: 3 }, s: { block: 3 } },
    { form: "brasta-", part: "verb", kind: "attack", rarity: "common", cost: 2, dmg: 8, vuln: 2, name: "痛击", isStarter: true,
      flavorTpl: "如{w}般压上，令敌易伤", w: { dmg: 2 }, s: { vuln: 1 } },

    // ===== 普通（白） =====
    { form: "crist", part: "noun", kind: "attack", rarity: "common", cost: 2, dmg: 10, name: "重砍",
      flavorTpl: "抡起{w}重劈", w: { dmg: 3 }, s: { dmg: 4 } },
    { form: "cû", part: "noun", kind: "attack", rarity: "common", cost: 1, dmg: 5, draw: 1, name: "疾矢",
      flavorTpl: "以{w}速射并再取一牌", w: { dmg: 2 }, s: { draw: 1 } },
    { form: "agar", part: "noun", kind: "attack", rarity: "common", cost: 1, dmg: 4, hits: 2, name: "双击",
      flavorTpl: "以{w}为誓，连击两次", w: { dmg: 1 }, s: { dmg: 2 } },
    { form: "castol", part: "noun", kind: "skill", rarity: "common", cost: 1, block: 8, name: "盔甲",
      flavorTpl: "戴上{w}", w: { block: 3 }, s: { block: 3 } },
    { form: "fennas", part: "noun", kind: "skill", rarity: "common", cost: 0, block: 3, name: "虚掩",
      flavorTpl: "虚掩{w}", w: { block: 2 }, s: { block: 2 } },
    { form: "celeb", part: "noun", kind: "skill", rarity: "common", cost: 1, block: 7, name: "白银之甲",
      flavorTpl: "以{w}护体", w: { block: 3 }, s: { cost: -1 } },
    { form: "êl", part: "noun", kind: "skill", rarity: "common", cost: 1, block: 5, weak: 1, name: "星辉削锐",
      flavorTpl: "{w}微光令敌虚弱", w: { block: 2 }, s: { weak: 1 } },

    // ===== 罕见（蓝） =====
    { form: "ang", part: "noun", kind: "skill", rarity: "uncommon", cost: 2, block: 14, name: "钢铁之壁",
      flavorTpl: "以{w}铸壁", w: { block: 4 }, s: { block: 4 } },
    { form: "annon", part: "noun", kind: "skill", rarity: "uncommon", cost: 1, block: 6, retainBlock: true, name: "闭门留甲",
      flavorTpl: "关闭{w}，护甲不散", w: { block: 3 }, s: { block: 3 } },
    { form: "ephel", part: "noun", kind: "skill", rarity: "uncommon", cost: 2, block: 10, buffDex: 1, name: "环围壁垒",
      flavorTpl: "筑起{w}，此后护甲更厚", w: { block: 3 }, s: { buffDex: 1 } },
    { form: "craban", part: "noun", kind: "skill", rarity: "uncommon", cost: 1, draw: 2, name: "渡鸦侦察",
      flavorTpl: "放出{w}探路", w: { cost: -1 }, s: { draw: 1 } },
    { form: "calar", part: "noun", kind: "skill", rarity: "uncommon", cost: 1, energyGain: 2, exhaust: true, name: "掌灯疾行",
      flavorTpl: "举起{w}，能量激增（消耗）", w: { cost: -1 }, s: { draw: 1 } },
    { form: "(n)dagor", part: "noun", kind: "power", rarity: "uncommon", cost: 1, buffStrength: 2, name: "战意", innate: true,
      flavorTpl: "投入{w}的意志，永久增力", w: { buffStrength: 1 }, s: { cost: -1 } },
    { form: "estel", part: "noun", kind: "skill", rarity: "uncommon", cost: 1, block: 5, draw: 1, name: "振奋",
      flavorTpl: "心怀{w}，御守并再取一牌", w: { block: 3 }, s: { draw: 1 } },
    { form: "amdir", part: "noun", kind: "skill", rarity: "uncommon", cost: 1, weak: 2, draw: 1, name: "料敌",
      flavorTpl: "凭{w}预判，削弱敌人并抽牌", w: { weak: 1 }, s: { draw: 1 } },
    { form: "elanor", part: "noun", kind: "skill", rarity: "uncommon", cost: 1, buffDex: 2, name: "金花柔韧",
      flavorTpl: "{w}绽放，此后护甲更厚", w: { buffDex: 1 }, s: { cost: -1 } },
    { form: "(m)bas(t)", part: "noun", kind: "skill", rarity: "uncommon", cost: 1, block: 10, exhaust: true, retain: true, name: "囤粮固守",
      flavorTpl: "备好{w}，稳守一回合（保留·消耗）", w: { block: 4 }, s: { block: 4 } },
    { form: "athae", part: "adjective", kind: "skill", rarity: "uncommon", cost: 1, block: 4, cleanse: true, name: "净化",
      flavorTpl: "{w}之力，清除自身所有减益", w: { block: 3 }, s: { cost: -1 } },
    { form: "bregollach", part: "noun", kind: "attack", rarity: "uncommon", cost: 1, dmg: 12, vuln: 2, exhaust: true, ethereal: true, name: "骤火",
      flavorTpl: "唤出{w}爆燃，转瞬即逝（虚无·消耗）", w: { dmg: 3 }, s: { vuln: 1 } },

    // ===== 稀有（金） =====
    { form: "(n)dag-", part: "verb", kind: "attack", rarity: "rare", cost: 2, dmg: 16, exhaust: true, name: "斩杀",
      flavorTpl: "以{w}的决意终结敌人（消耗）", w: { dmg: 4 }, s: { dmg: 5 } },
    { form: "barad", part: "noun", kind: "power", rarity: "rare", cost: 2, startTurnBlock: 4, name: "高塔永固",
      flavorTpl: "化身{w}，每回合起始得护甲", w: { startTurnBlock: 2 }, s: { cost: -1 } },
    { form: "curu", part: "noun", kind: "power", rarity: "rare", cost: 2, drawBonus: 1, name: "巧智",
      flavorTpl: "习得{w}，每回合多抽牌", w: { cost: -1 }, s: { drawBonus: 1 } },
    { form: "(m)belaith", part: "adjective", kind: "power", rarity: "rare", cost: 2, buffStrength: 3, exhaust: true, name: "威能爆发",
      flavorTpl: "化为{w}之姿，力量骤增（消耗）", w: { buffStrength: 1 }, s: { buffStrength: 2 } },
    // 全牌池中唯一带回血的卡，设为稀有并消耗
    { form: "athelas", part: "noun", kind: "skill", rarity: "rare", cost: 1, heal: 10, exhaust: true, name: "王叶疗愈",
      flavorTpl: "嚼服{w}，恢复生命（消耗）", w: { heal: 4 }, s: { heal: 4 } }
];

const STARTER_FORMS = ["cam", "coll", "brasta-"];
const RARITY_META = {
    common:   { label: "普通", cls: "rar-common", gem: "◇" },
    uncommon: { label: "罕见", cls: "rar-uncommon", gem: "◆" },
    rare:     { label: "稀有", cls: "rar-rare", gem: "★" }
};

// ---------- 敌人（意图混入各种减益） ----------
const ENEMY_DEFS = {
    /* pattern 中的每一项可以是单个动作，也可以是动作数组（复合意图：一次同时做两件事）
       growth = 每次行动后自身永久获得的力量：小怪 0~1，精英 2，首领 3 */
    draug:    { form: "draug", part: "noun", art: "wolf", color: "#7a6a58", hp: 44, growth: 0,
                pattern: [{ t: "attack", v: 14 },
                          [{ t: "attack", v: 9 }, { t: "weak", v: 2 }],
                          { t: "attack", v: 11 }] },
    auth:     { form: "auth", part: "noun", art: "wraith", color: "#7f8fb0", hp: 40, growth: 0,
                pattern: [[{ t: "attack", v: 8 }, { t: "defend", v: 6 }],
                          { t: "frail", v: 2 },
                          { t: "attack", v: 15 }] },
    esgal:    { form: "esgal", part: "noun", art: "wraith", color: "#8098ab", hp: 46, growth: 0,
                pattern: [[{ t: "defend", v: 9 }, { t: "attack", v: 8 }],
                          { t: "attack", v: 17 },
                          [{ t: "frail", v: 2 }, { t: "attack", v: 7 }]] },
    duath:    { form: "dúath", part: "noun", art: "wraith", color: "#8a76ad", hp: 58, growth: 0,
                pattern: [{ t: "attack", v: 14 },
                          [{ t: "attack", v: 10 }, { t: "vuln", v: 2 }],
                          [{ t: "buff", v: 2 }, { t: "defend", v: 6 }]] },
    fern:     { form: "fern", part: "adjective", art: "undead", color: "#9aa39a", hp: 56, growth: 0,
                revive: 0.35,   // 「已死的」：首次被击倒后以 35% 生命爬起
                pattern: [{ t: "attack", v: 15 },
                          [{ t: "poison", v: 4 }, { t: "heal", v: 8 }],
                          { t: "attack", v: 15 }] },
    edlon:    { form: "edlon", part: "noun", art: "cloaked", color: "#8b96a8", hp: 54, growth: 0,
                pattern: [[{ t: "attack", v: 10 }, { t: "vuln", v: 2 }],
                          { t: "attack", v: 18 },
                          [{ t: "weak", v: 2 }, { t: "defend", v: 8 }]] },
    ndur:     { form: "(n)dûr", part: "adjective", art: "demon", color: "#d15a52", hp: 62, elite: true, growth: 1,
                enrage: 3,      // 「阴郁的」恶魔：首次半血时暴怒，力量 +3
                pattern: [{ t: "attack", v: 12 },
                          [{ t: "defend", v: 9 }, { t: "attack", v: 7 }],
                          [{ t: "attack", v: 9 }, { t: "weak", v: 2 }],
                          { t: "attack", v: 14 }] },
    daedelos: { form: "(n)daedelos", part: "noun", art: "eye", color: "#a874d8", hp: 64, elite: true, growth: 1,
                thorns: 3,      // 巨眼的凝视：每次被攻击命中，攻击者反受 3 点伤害
                pattern: [[{ t: "vuln", v: 2 }, { t: "attack", v: 10 }],
                          { t: "attack", v: 15 },
                          [{ t: "frail", v: 2 }, { t: "attack", v: 9 }],
                          { t: "attack", v: 15 }] },
    // —— 首领（每局随机一位，塔顶迎战）——
    bauglir:  { form: "(m)bauglir", part: "noun", art: "demon", color: "#c94a3d", hp: 118, boss: true, growth: 1,
                // 暴君（包格力尔）：奴役他者为己而战——周期性召唤被奴役的幽魂
                summon: { k: "auth", hp: 0.4, dmg: 0.5, maxAlive: 3 },
                pattern: [{ t: "attack", v: 12 },
                          { t: "summon" },
                          [{ t: "frail", v: 2 }, { t: "attack", v: 8 }],
                          { t: "doom" },
                          [{ t: "attack", v: 10 }, { t: "weak", v: 2 }],
                          { t: "summon" },
                          { t: "attack", v: 16 },
                          [{ t: "defend", v: 12 }, { t: "attack", v: 9 }]] },
    dagnir:   { form: "(n)dagnir", part: "noun", art: "reaper", color: "#4fae8a", hp: 132, boss: true, growth: 1,
                // 克星：中毒流。半血蜕变：净化自身、力量+2、行动更凶残、成长翻倍
                phase2: { at: 0.5, strength: 1, growth: 2,
                    pattern: [[{ t: "poison", v: 4 }, { t: "attack", v: 9 }],
                              { t: "attack", v: 14 },
                              [{ t: "poison", v: 3 }, { t: "vuln", v: 2 }],
                              { t: "attack", v: 16 }] },
                pattern: [[{ t: "poison", v: 3 }, { t: "attack", v: 8 }],
                          { t: "attack", v: 12 },
                          [{ t: "vuln", v: 2 }, { t: "attack", v: 9 }],
                          { t: "doom" },
                          [{ t: "poison", v: 3 }, { t: "defend", v: 10 }],
                          { t: "attack", v: 15 }] },
    amarth:   { form: "amarth", part: "noun", art: "darklord", color: "#7d6bb8", hp: 150, boss: true, growth: 2,
                // 命运：无法逃避的终焉——第 10 回合后每回合降下毁灭一击
                countdown: 10, executeV: 45,
                // 首领：每回合稳定成长，再加两次「命运」尖峰，拖得越久越致命
                pattern: [{ t: "attack", v: 10 },
                          [{ t: "attack", v: 7 }, { t: "vuln", v: 2 }],
                          { t: "attack", v: 9 },
                          { t: "doom" },
                          [{ t: "frail", v: 2 }, { t: "attack", v: 9 }],
                          { t: "attack", v: 13 },
                          [{ t: "poison", v: 6 }, { t: "defend", v: 12 }],
                          { t: "attack", v: 15 }] }
};

/* ------------------------------------------------------------
   遭遇战组合：前两场为削弱的单只小怪，之后逐步出现多只小怪的组合。
   hp/dmg 为倍率，用于把小怪降到适合成群出现的强度。
   ------------------------------------------------------------ */
const ENCOUNTERS = {
    // 前两场：单只、完整血量（不再削弱，需造成实际战损）
    early: [
        [{ k: "draug" }],
        [{ k: "auth" }]
    ],
    // 中段：完整单怪，或两只削弱小怪（群战总血量略高于单怪，但每只更脆）
    mid: [
        [{ k: "draug" }],
        [{ k: "auth" }],
        [{ k: "esgal" }],
        [{ k: "draug", hp: 0.75, dmg: 0.55 }, { k: "auth", hp: 0.75, dmg: 0.55 }],
        [{ k: "auth", hp: 0.72, dmg: 0.55 }, { k: "auth", hp: 0.72, dmg: 0.55 }]
    ],
    // 后段：强单怪，或多只小怪组合
    late: [
        [{ k: "duath" }],
        [{ k: "fern" }],
        [{ k: "edlon" }],
        [{ k: "draug", hp: 0.85, dmg: 0.6 }, { k: "draug", hp: 0.85, dmg: 0.6 }],
        [{ k: "esgal", hp: 0.8, dmg: 0.58 }, { k: "auth", hp: 0.8, dmg: 0.58 }],
        [{ k: "auth", hp: 0.68, dmg: 0.45 }, { k: "auth", hp: 0.68, dmg: 0.45 }, { k: "draug", hp: 0.68, dmg: 0.45 }],
        [{ k: "edlon", hp: 0.85, dmg: 0.6 }, { k: "auth", hp: 0.6, dmg: 0.5 }]
    ],
    elite: [
        [{ k: "ndur" }],
        [{ k: "daedelos" }],
        [{ k: "ndur", hp: 0.85, dmg: 0.72 }, { k: "auth", hp: 0.6, dmg: 0.5 }]
    ],
    boss: [[{ k: "amarth" }], [{ k: "bauglir" }], [{ k: "dagnir" }]]
};

/* ------------------------------------------------------------
   圣物：全部取自词典中的真实辛达语词条
   effect 为效果键，v 为数值；tier 仅用于稀有度着色
   ------------------------------------------------------------ */
const RELIC_DEFS = [
    // —— 资源 / 经济 ——
    { form: "aran", part: "noun", icon: "👑", name: "王者之息", effect: "energyMax", v: 1, rarity: "rare", desc: "每场战斗初始能量 +1" },
    { form: "arnad", part: "noun", icon: "🪙", name: "王土岁贡", effect: "goldBonus", v: 5, rarity: "common", desc: "每次离开房间额外获得 5 金币" },
    { form: "aglareb", part: "adjective", icon: "🏆", name: "荣光之证", effect: "goldOnCombat", v: 12, rarity: "common", desc: "每次战斗胜利额外获得 12 金币" },
    { form: "(n)danwedh", part: "noun", icon: "💰", name: "赎金契约", effect: "shopDiscount", v: 0, rarity: "common", desc: "商店内所有价格 -20%" },
    { form: "advir", part: "noun", icon: "🎁", name: "传家宝", effect: "maxHpUp", v: 8, rarity: "common", desc: "获得时最大生命 +8（并立即回复）" },
    { form: "amon", part: "noun", icon: "⛰", name: "磐石之丘", effect: "maxHpUp", v: 14, rarity: "common", desc: "获得时最大生命 +14（并立即回复）" },
    { form: "ann", part: "noun", icon: "🎀", name: "馈赠", effect: "gainCard", v: 0, rarity: "common", desc: "获得时，随机获得一张罕见卡" },

    // —— 战斗开局 ——
    { form: "amloth", part: "noun", icon: "🪖", name: "盔顶羽饰", effect: "startBlock", v: 6, rarity: "uncommon", desc: "每场战斗开始时获得 6 点护甲" },
    { form: "aglar", part: "noun", icon: "✨", name: "荣耀之辉", effect: "startStrength", v: 1, rarity: "uncommon", desc: "每场战斗开始时力量 +1" },
    { form: "alwed", part: "adjective", icon: "🍃", name: "幸运之风", effect: "startDex", v: 1, rarity: "uncommon", desc: "每场战斗开始时敏捷 +1" },
    { form: "anwar", part: "noun", icon: "😨", name: "威慑", effect: "startWeakEnemies", v: 1, rarity: "uncommon", desc: "每场战斗开始时，所有敌人虚弱 1 回合" },
    { form: "(n)dael", part: "noun", icon: "💀", name: "恐怖之相", effect: "startVulnEnemies", v: 1, rarity: "uncommon", desc: "每场战斗开始时，所有敌人易伤 1 回合" },
    { form: "aduial", part: "noun", icon: "🌆", name: "暮光", effect: "firstTurnDraw", v: 2, rarity: "uncommon", desc: "每场战斗第一回合额外抽 2 张牌" },
    { form: "amrûn", part: "noun", icon: "🌅", name: "日出", effect: "firstTurnEnergy", v: 1, rarity: "uncommon", desc: "每场战斗第一回合额外获得 1 点能量" },

    // —— 回合循环 ——
    { form: "(m)bâr", part: "noun", icon: "🏠", name: "家宅护佑", effect: "turnBlock", v: 3, rarity: "uncommon", desc: "每回合开始时获得 3 点护甲" },
    { form: "adu", part: "adjective", icon: "📚", name: "双份", effect: "drawBonus", v: 1, rarity: "rare", desc: "每回合额外多抽 1 张牌" },
    { form: "albeth", part: "noun", icon: "🍀", name: "吉兆之言", effect: "firstCardFree", v: 0, rarity: "rare", desc: "每回合打出的第一张牌费用为 0" },
    { form: "arphen", part: "noun", icon: "🛡", name: "骑士誓约", effect: "firstSkillFree", v: 0, rarity: "rare", desc: "每回合打出的第一张技能牌费用为 0" },
    { form: "aeglos", part: "noun", icon: "❄", name: "冰锥", effect: "exhaustEnergy", v: 1, rarity: "uncommon", desc: "每打出一张消耗牌，回复 1 点能量" },

    // —— 攻防加成 ——
    { form: "acharn", part: "noun", icon: "⚔", name: "复仇", effect: "attackBonus", v: 2, rarity: "uncommon", desc: "攻击牌额外造成 2 点伤害" },
    { form: "aeg", part: "adjective", icon: "🗡", name: "锋锐", effect: "firstAttackBonus", v: 4, rarity: "uncommon", desc: "每回合第一张攻击牌额外造成 4 点伤害" },
    { form: "angren", part: "adjective", icon: "⛓", name: "钢铁之质", effect: "blockBonus", v: 2, rarity: "uncommon", desc: "技能牌额外提供 2 点护甲" },
    { form: "(n)dagnir", part: "noun", icon: "☠", name: "克星", effect: "vulnBonus", v: 3, rarity: "uncommon", desc: "对易伤状态的敌人额外造成 3 点伤害" },

    // —— 生存 / 抗性 ——
    { form: "bereth", part: "noun", icon: "💠", name: "女王庇佑", effect: "healAfterCombat", v: 6, rarity: "common", desc: "每次战斗胜利后恢复 6 点生命" },
    { form: "aer", part: "adjective", icon: "🕊", name: "神圣", effect: "healAfterElite", v: 14, rarity: "uncommon", desc: "精英战与首领战胜利后额外恢复 14 点生命" },
    { form: "alfirin", part: "noun", icon: "🌸", name: "永生花", effect: "healOnKill", v: 3, rarity: "uncommon", desc: "每击倒一个敌人回复 3 点生命" },
    { form: "(m)bardh", part: "noun", icon: "🏕", name: "归乡", effect: "restBonus", v: 15, rarity: "common", desc: "篝火处歇息额外回复 15% 最大生命" },
    { form: "andreth", part: "noun", icon: "⏳", name: "坚忍", effect: "debuffResist", v: 1, rarity: "uncommon", desc: "敌人施加给你的减益减少 1 回合" },
    { form: "achad", part: "noun", icon: "🪨", name: "岩岭", effect: "poisonResist", v: 0, rarity: "common", desc: "你受到的中毒伤害减半" },
    { form: "arod", part: "adjective", icon: "🔰", name: "高贵", effect: "artifact", v: 1, rarity: "rare", desc: "每场战斗免疫第一次施加给你的减益" },

    // —— 学习辅助（本作特色）——
    { form: "andaith", part: "noun", icon: "📖", name: "长音标记", effect: "learnSafety", v: 0, rarity: "rare", desc: "初次学习答错时，也能获得弱强化" },
    { form: "aderthad", part: "noun", icon: "🔗", name: "重聚", effect: "reviewThree", v: 1, rarity: "uncommon", desc: "篝火复习可自选 3 张卡牌" },
    { form: "athgen", part: "adjective", icon: "👁", name: "洞察", effect: "quizEasier", v: 0, rarity: "uncommon", desc: "词义测验少一个干扰选项" },
    { form: "athrabeth", part: "noun", icon: "💬", name: "辩谈", effect: "quizGold", v: 10, rarity: "common", desc: "每答对一次测验额外获得 10 金币" }
];

// ---------- 圣物效果查询 ----------
function hasRelic(effect) { return !!(run && run.relics && run.relics.some(r => r.effect === effect)); }
function relicSum(effect) {
    if (!run || !run.relics) return 0;
    return run.relics.reduce((s, r) => s + (r.effect === effect ? (r.v || 0) : 0), 0);
}
// 统一的获得圣物入口（处理拾取时立即生效的效果）
function gainRelic(relic) {
    if (!relic || run.relics.some(r => r.form === relic.form)) return;
    run.relics.push(relic);
    if (relic.effect === "maxHpUp") {
        run.maxHp += relic.v;
        run.hp = Math.min(run.maxHp, run.hp + relic.v);
    } else if (relic.effect === "gainCard") {
        const pool = CARD_DEFS.filter(c => c.rarity === "uncommon" && !STARTER_FORMS.includes(c.form));
        if (pool.length) run.deck.push(makeCardInstance(pick(pool)));
    }
}

// ============================================================
// 全局状态
// ============================================================
let WORD_INDEX = {};
let ALL_TERMS = [];
let SIDE_TERMS = [];
let mastery = loadMastery();
let run = null;
const app = document.getElementById("app");
const overlay = document.getElementById("overlay");

/* ------------------------------------------------------------
   键盘快捷键
   1/2/3…：从左到右打出第 N 张手牌（指向性卡牌打向当前选中的敌人）
   ← →   ：切换当前选中的敌人目标
   E     ：结束回合    D：牌堆信息    Esc：关闭弹窗
   ------------------------------------------------------------ */
function currentTargetEid() {
    const c = run && run.combat;
    if (!c) return null;
    const alive = c.enemies.filter(e => e.hp > 0);
    if (!alive.length) return null;
    if (!alive.some(e => e.eid === c.targetId)) c.targetId = alive[0].eid;
    return c.targetId;
}
function cycleTarget(dir) {
    const c = run && run.combat;
    if (!c) return;
    const alive = c.enemies.filter(e => e.hp > 0);
    if (alive.length < 2) return;
    const i = Math.max(0, alive.findIndex(e => e.eid === c.targetId));
    c.targetId = alive[(i + dir + alive.length) % alive.length].eid;
    renderCombat();
}
function initHotkeys() {
    document.addEventListener("keydown", (e) => {
        // 输入框内不拦截（音变填空题）
        const tag = (e.target && e.target.tagName || "").toLowerCase();
        if (tag === "input" || tag === "textarea") return;
        const modalOpen = !overlay.classList.contains("hidden");
        if (e.key === "Escape") { if (modalOpen) closeModal(); return; }
        const k = e.key.toLowerCase();
        if (k === "d") { e.preventDefault(); if (modalOpen) closeModal(); else if (run) openPileViewer(); return; }
        if (modalOpen || !run || !run.combat) return;
        if (k === "e") { e.preventDefault(); endPlayerTurn(); return; }
        if (e.key === "ArrowLeft") { e.preventDefault(); cycleTarget(-1); return; }
        if (e.key === "ArrowRight") { e.preventDefault(); cycleTarget(1); return; }
        if (/^[1-9]$/.test(e.key)) {
            e.preventDefault();
            const idx = Number(e.key) - 1;
            const card = run.combat.player.hand[idx];
            if (!card) return;
            if (needsTarget(card)) {
                const el = document.querySelector(`#handArea .card[data-uid="${card.uid}"]`);
                if (el) startAiming(el, card.uid, "click");   // 拉出箭头，点中怪物才释放
            } else playCard(card.uid);
        }
    });
}

document.addEventListener("DOMContentLoaded", () => {
    initTooltips();
    initHotkeys();
    fetch(DICT_URL)
        .then(r => r.json())
        .then(data => { buildIndex(data); renderTitle(); })
        .catch(err => { app.innerHTML = `<div class="loading">词典加载失败，请检查网络连接。<br>${err}</div>`; });
});

function buildIndex(data) {
    data.forEach(e => {
        const key = e.dict_form + "|" + e.part;
        if (!WORD_INDEX[key]) WORD_INDEX[key] = e;
        if (!WORD_INDEX[e.dict_form]) WORD_INDEX[e.dict_form] = e;
    });
    const seen = new Set();
    const collect = (list) => list.forEach(d => {
        const key = d.form + "|" + d.part;
        if (seen.has(key)) return;
        const entry = getEntry(d.form, d.part);
        if (entry) { seen.add(key); ALL_TERMS.push({ form: d.form, part: d.part, entry }); }
    });
    collect(CARD_DEFS); collect(Object.values(ENEMY_DEFS)); collect(RELIC_DEFS);
    // 卡牌词汇只能通过「初次学习 / 复习」解锁释义；
    // 商店、奇遇、宝藏的随机测验改用敌人与圣物的词汇，避免顺带泄露卡面词义
    const cardForms = new Set(CARD_DEFS.map(c => c.form + "|" + c.part));
    SIDE_TERMS = ALL_TERMS.filter(t => !cardForms.has(t.form + "|" + t.part));
}
// 随机测验用词池（不含卡牌词）
function randomSideTerm() { return pick(SIDE_TERMS.length ? SIDE_TERMS : ALL_TERMS); }
function getEntry(form, part) { return WORD_INDEX[form + "|" + part] || WORD_INDEX[form] || null; }
function shortDef(entry) {
    if (!entry) return "（未知词义）";
    let s = (entry.definition || entry.english || "").split(/[；;]/)[0].trim();
    if (!s) s = (entry.english || "").split(",")[0].trim();
    return s || "（未知词义）";
}
/* 重置全部学习记录：词义、星级一并清空；当前对局中卡牌的强化等级同步归零 */
function resetMastery() {
    if (!confirm("确定清空全部学习记录？词义与星级都会清除，此操作不可恢复。")) return;
    for (const k in mastery) delete mastery[k];
    saveMastery();
    if (run) {
        run.deck.forEach(c => { c.tier = 0; });
        if (run.combat) {
            const piles = run.combat.player;
            [piles.hand, piles.deck, piles.discard, piles.exile].forEach(pile => pile.forEach(c => { c.tier = 0; }));
        }
    }
    closeModal();
    openGlossary();   // 重新打开手册，立即看到已清空的状态
}

function escapeHtml(s) {
    return String(s).replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
}
function pick(arr) { return arr[Math.floor(Math.random() * arr.length)]; }
function shuffle(arr) {
    for (let i = arr.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [arr[i], arr[j]] = [arr[j], arr[i]]; }
    return arr;
}

// ============================================================
// 掌握度持久化
// ============================================================
function loadMastery() { try { return JSON.parse(localStorage.getItem(MASTERY_KEY)) || {}; } catch (e) { return {}; } }
function saveMastery() { localStorage.setItem(MASTERY_KEY, JSON.stringify(mastery)); }
function markMastery(form, part, correct) {
    const key = form + "|" + part;
    if (!mastery[key]) mastery[key] = { attempts: 0, correct: 0 };
    mastery[key].attempts++;
    if (correct) mastery[key].correct++;
    saveMastery();
}
function isEverMastered(form, part) { const m = mastery[form + "|" + part]; return !!(m && m.correct > 0); }
/* 星级（跨局学习进度）：1★ 弱强化过 / 2★ 强强化过 / 3★ 通过首领的最终测验
   只有「初次学习 / 篝火复习 / 最终测验」能加星；商店、奇遇等随机测验只解锁词义，不加星 */
function wordStars(form, part) { const m = mastery[form + "|" + part]; return (m && m.stars) || 0; }
function setWordStars(form, part, n) {
    const key = form + "|" + part;
    if (!mastery[key]) mastery[key] = { attempts: 0, correct: 0 };
    if ((mastery[key].stars || 0) < n) { mastery[key].stars = n; saveMastery(); }
}
function starBadge(n) { return n >= 3 ? "★★★" : n >= 2 ? "★★" : n >= 1 ? "★" : "☆"; }

// ============================================================
// 卡牌实例与数值
// ============================================================
function findCardDef(form) { return CARD_DEFS.find(c => c.form === form); }
function cardDef(card) { return findCardDef(card.form); }
function makeCardInstance(def) {
    return {
        uid: Math.random().toString(36).slice(2),
        form: def.form, part: def.part, kind: def.kind, name: def.name, rarity: def.rarity,
        exhaust: !!def.exhaust, exileAfterUse: !!def.exileAfterUse,
        innate: !!def.innate, retain: !!def.retain, ethereal: !!def.ethereal,
        // 局外成长：生词手册里 1★ 的词进场即弱强化，2★/3★ 即强强化
        tier: wordStars(def.form, def.part) >= 2 ? 2 : wordStars(def.form, def.part) >= 1 ? 1 : 0
    };
}
function eff(card) {
    const d = cardDef(card) || {};
    const t = card.tier || 0;
    const add = (f) => (d[f] || 0) + (t >= 1 && d.w && d.w[f] ? d.w[f] : 0) + (t >= 2 && d.s && d.s[f] ? d.s[f] : 0);
    const cost = Math.max(0, (d.cost || 0) + (t >= 1 && d.w && d.w.cost ? d.w.cost : 0) + (t >= 2 && d.s && d.s.cost ? d.s.cost : 0));
    return {
        cost, dmg: add("dmg"), hits: d.hits || 1, block: add("block"), heal: add("heal"), draw: add("draw"),
        buffStrength: add("buffStrength"), buffDex: add("buffDex"), energyGain: add("energyGain"),
        vuln: add("vuln"), weak: add("weak"), cleanse: !!d.cleanse,
        startTurnBlock: add("startTurnBlock"), drawBonus: add("drawBonus"),
        retainBlock: !!d.retainBlock, exhaust: !!d.exhaust, exileAfterUse: !!d.exileAfterUse
    };
}
function previewCard(def, tier) {
    return { form: def.form, part: def.part, kind: def.kind, name: def.name, rarity: def.rarity,
             exhaust: !!def.exhaust, exileAfterUse: !!def.exileAfterUse,
             innate: !!def.innate, retain: !!def.retain, ethereal: !!def.ethereal, tier: tier || 0 };
}

// StS 式关键词：固有（起手必有）/ 保留（回合结束不弃）/ 虚无（回合结束仍在手则消耗）
const KEYWORD_META = {
    innate:   { label: "固有", tip: "固有：每场战斗的起手牌中必定包含这张牌。" },
    retain:   { label: "保留", tip: "保留：回合结束时这张牌不会被弃掉，留在手上。" },
    ethereal: { label: "虚无", tip: "虚无：若回合结束时它仍在手中，则被消耗（本场战斗不再出现）。" }
};
function keywordBadges(card) {
    return Object.keys(KEYWORD_META).filter(k => card[k])
        .map(k => `<span class="kw-badge kw-${k}" data-tip="${KEYWORD_META[k].tip}">${KEYWORD_META[k].label}</span>`)
        .join("");
}
function meaningRevealed(card) { return isEverMastered(card.form, card.part); }
// 触屏设备（手机/平板）：点击出牌；桌面：拖拽出牌
function isTouchMode() {
    if (window.FORCE_TOUCH !== undefined) return !!window.FORCE_TOUCH;
    return (window.matchMedia && window.matchMedia("(pointer: coarse)").matches) || "ontouchstart" in window;
}
// 需要指定敌人目标的卡：造成伤害或施加敌方减益
function needsTarget(card) {
    const e = eff(card);
    return e.dmg > 0 || e.vuln > 0 || e.weak > 0;
}
function kindLabel(kind) { return { attack: "⚔ 攻击", skill: "🛡 技能", power: "💠 能力" }[kind] || kind; }

function effectPartsFromEff(e) {
    const parts = [];
    if (e.dmg) parts.push(e.hits > 1 ? `造成 ${e.dmg} 点伤害 ×${e.hits}` : `造成 ${e.dmg} 点伤害`);
    if (e.block) parts.push(`获得 ${e.block} 点护甲`);
    if (e.heal) parts.push(`恢复 ${e.heal} 点生命`);
    if (e.draw) parts.push(`抽 ${e.draw} 张牌`);
    if (e.buffStrength) parts.push(`力量 +${e.buffStrength}`);
    if (e.buffDex) parts.push(`敏捷 +${e.buffDex}`);
    if (e.energyGain) parts.push(`获得 ${e.energyGain} 点能量`);
    if (e.vuln) parts.push(`敌方易伤 ${e.vuln} 回合`);
    if (e.weak) parts.push(`敌方虚弱 ${e.weak} 回合`);
    if (e.cleanse) parts.push(`清除自身所有减益`);
    if (e.startTurnBlock) parts.push(`每回合开始获得 ${e.startTurnBlock} 护甲`);
    if (e.drawBonus) parts.push(`每回合多抽 ${e.drawBonus} 张牌`);
    if (e.retainBlock) parts.push(`护甲保留至下回合`);
    return parts;
}
function tierBadge(tier) {
    if (tier >= 2) return `<span class="tier-badge t2" data-tip="强强化：已通过篝火复习">＋＋</span>`;
    if (tier >= 1) return `<span class="tier-badge t1" data-tip="弱强化：已通过初次学习">＋</span>`;
    return "";
}

// ============================================================
// 标题页
// ============================================================
function renderTitle() {
    const total = ALL_TERMS.length;
    const done = ALL_TERMS.filter(t => isEverMastered(t.form, t.part)).length;
    app.innerHTML = `
        <div style="text-align:center;padding:20px 0;">
            <img class="tengwar-img" src="TitleSindarin1.png" alt="Mae govannen, randir. Se barad adabannen o phith Edhellen.">
            <p class="title-latin">Mae govannen, randir. Se barad adabannen o phith Edhellen.<br>你好，旅人。这座塔由辛达语的词汇筑成。</p>
            <p class="title-credit">腾格瓦转写由 <a href="https://www.tecendil.com/" target="_blank" rel="noopener">tecendil.com</a> 生成</p>
            <div class="stat" style="margin:18px auto;display:inline-flex;">📖 累计学习进度：${done} / ${total} 词已掌握</div>
            <div class="btn-row">
                <button class="primary-btn" onclick="startRun()">开始攀登 · Iesta!</button>
                <button class="secondary-btn" onclick="openGlossary()">生词手册</button>
            </div>
            <div class="title-help">
                <b>玩法说明：</b><br>
                · 地图分岔，<b>自行规划路线</b>：只能沿连线走到上一层相邻的房间，选错路就走不回来。<br>
                · 战斗中：<b>攻击牌需拖到右侧怪物身上</b>出牌，技能/能力牌点击即用。<br>
                · 卡牌分 <span class="rar-dot rar-common"></span>普通 / <span class="rar-dot rar-uncommon"></span>罕见 / <span class="rar-dot rar-rare"></span>稀有 三档。<br>
                · 关键词：<span class="kw-badge kw-innate">固有</span>起手必有 ·
                  <span class="kw-badge kw-retain">保留</span>回合结束不弃 ·
                  <span class="kw-badge kw-ethereal">虚无</span>留在手上则消散 ·
                  🔥消耗 打出后本场不再出现。<br>
                · 减益：易伤（受伤+50%）、虚弱（攻击-25%）、脆弱（护甲-25%）、中毒（每回合掉血）。<br>
                · <b>初次学习</b>——每次选取奖励卡后，随机抽牌组一张考<b>词义</b>，答对得<b>弱强化</b>。<br>
                · <b>复习</b>——篝火处自选两张已弱强化的牌，考<b>音变/复数（名词）或时态（动词）</b>，答对升<b>强强化</b>。<br>
                · 词汇掌握记录跨局永久保存；死亡只重置本局牌组。
            </div>
        </div>`;
}
function openGlossary() {
    const cardWords = new Set(CARD_DEFS.map(c => c.form + "|" + c.part));
    const rows = ALL_TERMS.slice().sort((a, b) => a.form.localeCompare(b.form)).map(t => {
        const ok = isEverMastered(t.form, t.part);
        const isCard = cardWords.has(t.form + "|" + t.part);
        // 卡牌词：三级星（弱强化★ / 强强化★★ / 最终测验★★★）；其他词只标记是否学过
        const mark = isCard ? `<span class="m star-${wordStars(t.form, t.part)}">${starBadge(wordStars(t.form, t.part))}</span>`
                            : `<span class="m">${ok ? "✓" : "·"}</span>`;
        return `<div class="deck-chip"><span class="w">${escapeHtml(t.form)}</span> <span style="color:#7f8c8d;">(${t.part})</span> — ${escapeHtml(ok ? shortDef(t.entry) : "？？？")} ${mark}</div>`;
    }).join("");
    showModal(`
        <h3>📖 辛达语生词手册</h3>
        <p class="modal-hint">卡牌词的星级：★ 弱强化 · ★★ 强强化 · ★★★ 通过首领的最终测验（下局起该卡带星入场）。其余词汇学会后以 ✓ 标记。</p>
        <div class="deck-list">${rows}</div>
        <div class="btn-row">
            <button class="secondary-btn" onclick="closeModal()">关闭</button>
            <button class="secondary-btn" onclick="resetMastery()">重置学习记录</button>
        </div>`);
}

// ============================================================
// 地图：杀戮尖塔式分岔路线图
// ============================================================
const MAP_ROWS = 12;   // 0..10 为普通层，11 为 boss
const MAP_SLOTS = 6;
const MAP_PATHS = 6;

// 各房间类型的主色（地图节点描边 / 可走连线 / 高亮统一使用）
const NODE_COLORS = {
    combat: "#b0764a", elite: "#c0392b", rest: "#e67e22", shop: "#16a085",
    event: "#9b59b6", treasure: "#c9a227", boss: "#8e44ad"
};
const ROOM_META = {
    combat:   { icon: "⚔", name: "遭遇战", desc: "普通敌人，胜利可选一张卡。", cls: "r-combat" },
    elite:    { icon: "☠", name: "精英战", desc: "强敌，额外掉落圣物。", cls: "r-elite" },
    rest:     { icon: "🏕", name: "篝火", desc: "回血，或复习升级卡牌。", cls: "r-rest" },
    shop:     { icon: "🛒", name: "商店", desc: "购买圣物、移除卡牌。", cls: "r-shop" },
    event:    { icon: "❓", name: "奇遇", desc: "词义考验，答对有奖励。", cls: "r-event" },
    treasure: { icon: "💎", name: "宝藏", desc: "解谜开箱。", cls: "r-treasure" },
    boss:     { icon: "🐉", name: "塔顶", desc: "本局首领在此等候。", cls: "r-boss" }
};

const SHOP_COUNT = 3;      // 全图商店总数
const REST_MIN = 3, REST_MAX = 5, REST_SPREAD = 2; // 每条路线的篝火数约束

// 只生成节点与连线（不含房间类型）
function buildMapSkeleton() {
    const nodes = {};
    const id = (r, s) => r + "-" + s;
    const ensure = (r, s) => {
        if (!nodes[id(r, s)]) nodes[id(r, s)] = { id: id(r, s), row: r, slot: s, next: [], visited: false, type: null };
        return nodes[id(r, s)];
    };
    const firstSlots = shuffle([...Array(MAP_SLOTS).keys()]);
    for (let p = 0; p < MAP_PATHS; p++) {
        let s = p < 2 ? firstSlots[p] : Math.floor(Math.random() * MAP_SLOTS);
        ensure(0, s);
        for (let r = 0; r < MAP_ROWS - 2; r++) {
            const cand = [s - 1, s, s + 1].filter(x => x >= 0 && x < MAP_SLOTS);
            const s2 = cand[Math.floor(Math.random() * cand.length)];
            ensure(r + 1, s2);
            const from = nodes[id(r, s)];
            if (!from.next.includes(id(r + 1, s2))) from.next.push(id(r + 1, s2));
            s = s2;
        }
    }
    const boss = ensure(MAP_ROWS - 1, Math.floor(MAP_SLOTS / 2));
    boss.type = "boss";
    Object.values(nodes).forEach(n => { if (n.row === MAP_ROWS - 2 && !n.next.length) n.next.push(boss.id); });
    return { nodes, startIds: Object.values(nodes).filter(n => n.row === 0).map(n => n.id) };
}

// 分配房间类型：整排篝火保证各路线篝火数一致，商店固定 3 个且楼层分散
function assignTypes(m) {
    const nodes = Object.values(m.nodes);
    const rowsOf = (r) => nodes.filter(n => n.row === r);
    const TREASURE_ROW = 4, PRE_BOSS = MAP_ROWS - 2;

    // 1) 整排篝火：boss 前一排 + 两排中途（彼此至少隔 3 层），使每条路线篝火数基本相同
    const restCandidates = [2, 3, 5, 6, 7, 8];
    let restRows = [];
    for (let tries = 0; tries < 60 && restRows.length < 2; tries++) {
        const a = pick(restCandidates), b = pick(restCandidates);
        if (Math.abs(a - b) >= 3) restRows = [a, b];
    }
    if (restRows.length < 2) restRows = [3, 7];
    const fullRestRows = new Set([...restRows, PRE_BOSS]);

    // 2) 基础类型
    nodes.forEach(n => {
        if (n.type === "boss") return;
        if (n.row === 0) n.type = "combat";
        else if (n.row === 1) n.type = Math.random() < 0.7 ? "combat" : "event";
        else if (n.row === TREASURE_ROW) n.type = "treasure";
        else if (fullRestRows.has(n.row)) n.type = "rest";
        else {
            const roll = Math.random();
            if (n.row >= 5 && roll < 0.20) n.type = "elite";
            else if (roll < 0.50) n.type = "event";
            else n.type = "combat";
        }
    });

    // 3) 少量散落篝火制造差异（不超过 2 个，且不在整排篝火/宝藏层）
    const scatterPool = nodes.filter(n => n.type === "combat" && n.row >= 2 && n.row < PRE_BOSS && !fullRestRows.has(n.row));
    shuffle(scatterPool).slice(0, Math.floor(Math.random() * 3)).forEach(n => { n.type = "rest"; });

    // 4) 商店：全图恰好 3 个，落在互不相邻的不同楼层，楼层方差尽量大
    const shopRows = [];
    const eligibleRows = shuffle([...Array(MAP_ROWS - 2).keys()].filter(r =>
        r >= 2 && r !== TREASURE_ROW && !fullRestRows.has(r)));
    for (const r of eligibleRows) {
        if (shopRows.length >= SHOP_COUNT) break;
        if (shopRows.every(x => Math.abs(x - r) >= 2)) shopRows.push(r);
    }
    while (shopRows.length < SHOP_COUNT && eligibleRows.length) {
        const r = eligibleRows.find(x => !shopRows.includes(x));
        if (r === undefined) break;
        shopRows.push(r);
    }
    shopRows.forEach(r => {
        const cand = rowsOf(r).filter(n => n.type !== "boss");
        if (cand.length) pick(cand).type = "shop";
    });
}

// 沿 DAG 做 DP，求每条路线的篝火数区间
function restRange(m) {
    const memo = {};
    const walk = (id) => {
        if (memo[id]) return memo[id];
        const n = m.nodes[id];
        const self = n.type === "rest" ? 1 : 0;
        if (!n.next.length) return memo[id] = { min: self, max: self };
        let mn = Infinity, mx = -Infinity;
        n.next.forEach(x => { const r = walk(x); mn = Math.min(mn, r.min); mx = Math.max(mx, r.max); });
        return memo[id] = { min: self + mn, max: self + mx };
    };
    let min = Infinity, max = -Infinity;
    m.startIds.forEach(id => { const r = walk(id); min = Math.min(min, r.min); max = Math.max(max, r.max); });
    return { min, max };
}

function validateMap(m) {
    const shops = Object.values(m.nodes).filter(n => n.type === "shop").length;
    if (shops !== SHOP_COUNT) return false;
    const r = restRange(m);
    return r.min >= REST_MIN && r.max <= REST_MAX && (r.max - r.min) <= REST_SPREAD;
}

function generateMap() {
    let last = null;
    for (let attempt = 0; attempt < 60; attempt++) {
        const m = buildMapSkeleton();
        assignTypes(m);
        last = m;
        if (validateMap(m)) return m;
    }
    return last; // 极少数情况下退回最后一次结果
}

function mapSvg() {
    const m = run.map;
    const colW = 62, rowH = 58, padX = 30, padY = 28;
    const W = padX * 2 + (MAP_SLOTS - 1) * colW;
    const H = padY * 2 + (MAP_ROWS - 1) * rowH;
    const X = (s) => padX + s * colW;
    const Y = (r) => padY + (MAP_ROWS - 1 - r) * rowH; // 底部为第 1 层
    const avail = new Set(run.available || []);

    let edges = "";
    Object.values(m.nodes).forEach(n => {
        n.next.forEach(nid => {
            const t = m.nodes[nid];
            if (!t) return;
            const walked = n.visited && t.visited;
            const open = n.id === run.currentNodeId && avail.has(nid);
            // 可走连线染成目标节点的类型色
            edges += `<line x1="${X(n.slot)}" y1="${Y(n.row)}" x2="${X(t.slot)}" y2="${Y(t.row)}"
                class="map-edge ${walked ? "walked" : ""} ${open ? "open" : ""}" style="--nc:${NODE_COLORS[t.type] || "#b9a888"}" />`;
        });
    });
    let circles = "";
    Object.values(m.nodes).forEach(n => {
        const meta = ROOM_META[n.type];
        const isAvail = avail.has(n.id);
        const isCur = n.id === run.currentNodeId;
        const cls = ["map-node", meta.cls, n.visited ? "visited" : "", isAvail ? "avail" : "", isCur ? "current" : ""].join(" ");
        const click = isAvail ? `onclick="chooseMapNode('${n.id}')"` : "";
        const tip = `${meta.name}（第 ${n.row + 1} 层）：${meta.desc}`;
        circles += `<g class="${cls}" ${click} style="--nc:${NODE_COLORS[n.type] || "#b9a888"}" data-tip="${escapeHtml(tip)}">
            <circle cx="${X(n.slot)}" cy="${Y(n.row)}" r="${n.type === "boss" ? 20 : 15}"/>
            <text x="${X(n.slot)}" y="${Y(n.row)}" text-anchor="middle" dominant-baseline="central">${meta.icon}</text>
        </g>`;
    });
    return `<svg class="map-svg" viewBox="0 0 ${W} ${H}" width="${W}" height="${H}" role="img" aria-label="塔层地图">${edges}${circles}</svg>`;
}

function renderMap() {
    const depth = run.currentNodeId ? run.map.nodes[run.currentNodeId].row + 1 : 0;
    app.innerHTML = `
        ${topBarHtml()}
        <div class="map-head">
            <h2 class="map-title">塔层地图</h2>
            <p class="map-sub">${run.currentNodeId ? `当前位于第 ${depth} 层，` : "从底层任选一处入口，"}点击<b>发亮的节点</b>继续攀登。路线一旦选定无法回头。</p>
        </div>
        <div class="map-scroll">${mapSvg()}</div>
        <div class="map-legend">
            ${Object.entries(ROOM_META).map(([k, v]) => `<span class="legend-item"><span class="legend-ic ${v.cls}">${v.icon}</span>${v.name}</span>`).join("")}
        </div>`;
    const sc = document.querySelector(".map-scroll");
    if (sc) sc.scrollTop = sc.scrollHeight; // 视角落在底部（当前进度）
}

function chooseMapNode(nid) {
    const node = run.map.nodes[nid];
    if (!node || !(run.available || []).includes(nid)) return;
    run.pendingNodeId = nid;
    enterRoom(node.type);
}

// 房间结束后回到地图（替代原来的「下一层」）
function completeRoom() {
    run.combat = null;
    const node = run.map.nodes[run.pendingNodeId];
    if (node) {
        node.visited = true;
        run.currentNodeId = node.id;
        run.available = node.next.slice();
    }
    run.pendingNodeId = null;
    if (node && node.type === "boss") { renderVictory(); return; }
    if (!run.available || !run.available.length) { renderVictory(); return; }
    renderMap();
}

function enterRoom(type) {
    if (type === "combat") startCombat(pickEncounter());
    else if (type === "elite") startCombat(pick(ENCOUNTERS.elite));
    else if (type === "boss") startCombat([{ k: run.bossKey }]);
    else if (type === "rest") renderRest();
    else if (type === "shop") renderShop();
    else if (type === "event") renderEvent();
    else if (type === "treasure") renderTreasure();
}
// 前两场普通战斗必为削弱单怪，之后按楼层深度升级为组合怪
function pickEncounter() {
    const n = run.normalCombats || 0;
    const row = run.map.nodes[run.pendingNodeId] ? run.map.nodes[run.pendingNodeId].row : 0;
    if (n < 2) return ENCOUNTERS.early[n % ENCOUNTERS.early.length];
    return pick(row <= 6 ? ENCOUNTERS.mid : ENCOUNTERS.late);
}
function leaveRoomBonus() { run.gold += relicSum("goldBonus"); }

// ============================================================
// 开局
// ============================================================
function startRun() {
    const deck = [];
    for (let i = 0; i < 4; i++) deck.push(makeCardInstance(findCardDef("cam")));
    for (let i = 0; i < 4; i++) deck.push(makeCardInstance(findCardDef("coll")));
    deck.push(makeCardInstance(findCardDef("brasta-")));
    run = {
        hp: 75, maxHp: 75, gold: 20, deck, relics: [], combat: null,
        map: generateMap(), currentNodeId: null, pendingNodeId: null, available: [],
        bossKey: pick(Object.keys(ENEMY_DEFS).filter(k => ENEMY_DEFS[k].boss)),
        energyMaxBase: 3
    };
    run.available = run.map.startIds.slice();
    renderMap();
}

// ============================================================
// 顶栏
// ============================================================
function relicStripHtml() {
    if (!run.relics.length) return "";
    const chips = run.relics.map(r =>
        `<span class="relic-chip rr-${r.rarity}" data-tip="${escapeHtml(RARITY_META[r.rarity].label + "圣物 · " + r.name + "：" + r.desc)}"><span class="relic-ic">${r.icon}</span><span class="relic-w">${escapeHtml(r.form)}</span></span>`).join("");
    return `<div class="relic-strip"><span class="relic-label">圣物</span>${chips}</div>`;
}
// 顶栏的本局首领预览：让玩家提前知道塔顶是谁
function bossPreviewHtml() {
    const def = ENEMY_DEFS[run.bossKey];
    if (!def) return "";
    const gloss = shortDef(getEntry(def.form, def.part));
    const tip = `本层首领：${def.form}（${gloss}） · ${def.hp} 生命 · 成长 +${def.growth}`;
    return `<span class="boss-preview" data-tip="${escapeHtml(tip)}">
        <span class="boss-mini">${enemyArt(def)}</span>
        <span class="boss-name">${escapeHtml(def.form)}</span>
    </span>`;
}
function topBarHtml() {
    const c = run.combat;
    const depth = run.currentNodeId ? run.map.nodes[run.currentNodeId].row + 1 : 0;
    const pileBtn = c
        ? `<button class="utility-btn" onclick="openPileViewer()">📚 牌堆 抽${c.player.deck.length}/弃${c.player.discard.length}/耗${c.player.exile.length}</button>`
        : `<button class="utility-btn" onclick="openPileViewer()">📚 牌组 (${run.deck.length})</button>`;
    return `
        ${relicStripHtml()}
        <div class="status-bar">
            <button class="utility-btn danger" onclick="askQuit()" data-tip="放弃本局，回到开始界面（词汇星级会保留）">⏻ 退出</button>
            <span class="stat hp">❤ ${run.hp}/${run.maxHp}</span>
            <span class="stat coin">🪙 ${run.gold}</span>
            <span class="stat floor">🗼 第 ${depth} / ${MAP_ROWS} 层</span>
            ${bossPreviewHtml()}
            ${pileBtn}
        </div>`;
}
function pileCardChip(card) {
    const label = meaningRevealed(card) ? `${card.form}（${card.name}）` : `${card.form}（${kindLabel(card.kind)}）`;
    return `<div class="deck-chip clickable ${RARITY_META[card.rarity].cls}" onclick="openCardDetail('${card.form}','${card.tier}')"
                 data-tip="点击查看详情与强化对比"><span class="w">${escapeHtml(label)}</span> ${tierBadge(card.tier)}</div>`;
}

// ---------- 卡牌详情：基础 → 弱强化 → 强强化 的对比 ----------
// 独立于战斗状态的卡面渲染（牌堆/详情弹窗中使用）
function staticCardHtml(def, tier, extraCls) {
    const e = eff(previewCard(def, tier));
    const rar = RARITY_META[def.rarity];
    const kw = keywordBadges(def);
    const revealed = isEverMastered(def.form, def.part);
    return `
        <div class="card k-${def.kind} ${rar.cls} tier-${tier} ${def.exhaust ? "card-exhaust" : ""} ${extraCls || ""}" style="width:158px;cursor:default;">
            <div class="card-cost">${e.cost}</div>
            ${tierBadge(tier)}
            <div class="card-rarity">${rar.gem}</div>
            <div class="card-word">${def.form}</div>
            <div class="card-part">${revealed ? `${def.part} · ${def.name}` : `${def.part} · ${kindLabel(def.kind)}`}</div>
            <div class="card-effect">${effectPartsFromEff(e).join("；")}</div>
            ${kw ? `<div class="card-keywords">${kw}</div>` : ""}
            ${def.exhaust ? `<div class="card-exhaust-hint">🔥 消耗</div>` : ""}
        </div>`;
}

function openCardDetail(form, curTier) {
    const def = findCardDef(form);
    if (!def) return;
    const cur = Number(curTier) || 0;
    const revealed = isEverMastered(def.form, def.part);
    const entry = getEntry(def.form, def.part);
    const labels = ["基础", "弱强化", "强强化"];
    const cols = [0, 1, 2].map(t => `
        <div class="chain-col ${t === cur ? "is-current" : ""}">
            ${staticCardHtml(def, t)}
            <div class="chain-label">${labels[t]}${t === cur ? "（当前）" : ""}</div>
        </div>`).join(`<div class="chain-arrow">➜</div>`);
    const kwHelp = Object.keys(KEYWORD_META).filter(k => def[k])
        .map(k => `<li><b>${KEYWORD_META[k].label}</b>：${KEYWORD_META[k].tip.replace(/^[^：]*：/, "")}</li>`).join("");
    showModal(`
        <h3 style="margin-top:0;">${escapeHtml(def.form)} <span style="font-size:13px;color:#7f8c8d;">(${def.part} · ${RARITY_META[def.rarity].label})</span></h3>
        <p class="modal-hint" style="margin-bottom:12px;">
            ${revealed ? `词义：<b>${escapeHtml(shortDef(entry))}</b>　名称：${escapeHtml(def.name)}`
                       : `词义尚未掌握——在初次学习中答对即可解锁释义。`}
        </p>
        <div class="upgrade-chain">${cols}</div>
        <div class="detail-notes">
            <p><b>升级途径：</b>战斗后的<b>初次学习</b>（词义题）答对 → 弱强化；篝火处的<b>复习</b>（音变/时态题）答对 → 强强化。</p>
            ${kwHelp ? `<ul class="kw-help">${kwHelp}</ul>` : ""}
            ${def.exhaust ? `<p>🔥 <b>消耗</b>：打出后本场战斗不再出现。</p>` : ""}
            ${def.exileAfterUse ? `<p>♻ <b>消耗品</b>：使用后从牌组中永久移除。</p>` : ""}
        </div>
        <div class="btn-row"><button class="secondary-btn" onclick="closeModal()">关闭</button></div>
    `);
}
function pileSection(title, cards) {
    return `<h3 style="margin-bottom:8px;">${title}（${cards.length}）</h3>` +
        (cards.length ? `<div class="deck-list">${cards.map(pileCardChip).join("")}</div>` : `<p style="color:#7f8c8d;font-size:13px;">（空）</p>`);
}
function openPileViewer() {
    const c = run.combat;
    const body = c
        ? pileSection("抽牌堆 · Deck", c.player.deck) + pileSection("弃牌堆 · Discard", c.player.discard) + pileSection("消耗堆 · Exile", c.player.exile)
        : pileSection("整体牌组 · Deck", run.deck);
    showModal(`<h3 style="margin-top:0;">📚 牌堆总览</h3>
        <p class="modal-hint">${c ? "手牌见战斗界面；抽牌堆顺序已打乱。" : "当前不在战斗中，显示整局牌组。"}</p>
        ${body}<div class="btn-row"><button class="secondary-btn" onclick="closeModal()">关闭</button></div>`);
}

// ============================================================
// 状态（buff / debuff）系统
// ============================================================
function newStatuses() { return { vuln: 0, weak: 0, frail: 0, poison: 0 }; }
const STATUS_META = {
    vuln:   { icon: "☠", cls: "s-vuln",  name: "易伤", tip: "受到攻击伤害 +50%" },
    weak:   { icon: "🩸", cls: "s-weak",  name: "虚弱", tip: "造成攻击伤害 -25%" },
    frail:  { icon: "🥀", cls: "s-frail", name: "脆弱", tip: "获得的护甲 -25%" },
    poison: { icon: "☣", cls: "s-poison", name: "中毒", tip: "每回合开始按层数损失生命，然后层数 -1" }
};
function statusPills(entity) {
    const out = [];
    if (entity.strength) out.push(`<span class="status-pill s-str" data-tip="力量：攻击伤害 +${entity.strength}">💪 ${entity.strength}</span>`);
    if (entity.dexterity) out.push(`<span class="status-pill s-dex" data-tip="敏捷：获得护甲 +${entity.dexterity}">🍃 ${entity.dexterity}</span>`);
    Object.keys(STATUS_META).forEach(k => {
        const v = entity.statuses[k];
        if (v > 0) {
            const m = STATUS_META[k];
            out.push(`<span class="status-pill ${m.cls}" data-tip="${m.name}：${m.tip}（剩 ${v}）">${m.icon} ${v}</span>`);
        }
    });
    return out.join("");
}
function tickStatuses(entity) {
    ["vuln", "weak", "frail"].forEach(k => { if (entity.statuses[k] > 0) entity.statuses[k]--; });
}
function outgoingDamage(attacker, base) {
    let v = base + (attacker.strength || 0);
    if (attacker.statuses.weak > 0) v = Math.floor(v * 0.75);
    return Math.max(0, v);
}
function incomingDamage(defender, dmg) {
    return defender.statuses.vuln > 0 ? Math.floor(dmg * 1.5) : dmg;
}
function computeBlockGain(entity, base) {
    let v = base + (entity.dexterity || 0);
    if (entity.statuses.frail > 0) v = Math.floor(v * 0.75);
    return Math.max(0, v);
}

// ============================================================
// 战斗
// ============================================================
function startCombat(encounter) {
    const energyMax = run.energyMaxBase + relicSum("energyMax");
    const enemies = encounter.map((spec, i) => {
        const def = ENEMY_DEFS[spec.k];
        const hp = Math.max(1, Math.round(def.hp * (spec.hp || 1)));
        return {
            eid: "e" + i, def, entry: getEntry(def.form, def.part),
            hp, maxHp: hp, dmgMul: spec.dmg || 1,
            block: 0, strength: 0, dexterity: 0, statuses: newStatuses(),
            patternIdx: 0, nextAction: def.pattern[0]
        };
    });
    if (!enemies.some(e => e.def.boss || e.def.elite)) run.normalCombats = (run.normalCombats || 0) + 1;
    run.combat = {
        enemies, targetId: enemies[0].eid,
        player: {
            energy: energyMax + relicSum("firstTurnEnergy"), energyMax,
            block: 0, strength: relicSum("startStrength"), dexterity: relicSum("startDex"),
            statuses: newStatuses(),
            keepBlockNextTurn: false, drawBonus: relicSum("drawBonus"), startTurnBlock: relicSum("turnBlock"),
            firstCardFreeUsed: false, firstSkillFreeUsed: false, firstAttackUsed: false,
            artifactLeft: relicSum("artifact"),
            powers: [], deck: shuffle(run.deck.slice()), hand: [], discard: [], exile: []
        },
        turn: 1, log: [], fx: [], dealAnim: true
    };
    // 圣物：开局效果
    const p0 = run.combat.player;
    const sb = relicSum("startBlock");
    if (sb) p0.block += computeBlockGain(p0, sb);
    const sw = relicSum("startWeakEnemies"), sv = relicSum("startVulnEnemies");
    run.combat.enemies.forEach(en => {
        if (sw) en.statuses.weak += sw;
        if (sv) en.statuses.vuln += sv;
    });
    drawHand(true); // 起手：固有牌必进手（含圣物提供的额外抽牌）
    renderCombat();
    spawnTurnBanner(1);
}
const HAND_LIMIT = 10;
function drawHand(openingHand) {
    const p = run.combat.player;
    let n = 5 + p.drawBonus + (openingHand ? relicSum("firstTurnDraw") : 0);
    if (openingHand) {
        // 固有牌直接进起手牌，并占用抽牌数
        const innate = p.deck.filter(c => c.innate);
        innate.forEach(c => {
            p.deck.splice(p.deck.indexOf(c), 1);
            if (p.hand.length < HAND_LIMIT) p.hand.push(c);
        });
        n -= innate.length;
    }
    for (let i = 0; i < n; i++) drawOne();
}
function drawOne() {
    const p = run.combat.player;
    if (p.hand.length >= HAND_LIMIT) return;
    if (p.deck.length === 0) {
        if (p.discard.length === 0) return;
        addLog("牌堆已空，洗入弃牌堆。", "info");
        p.deck = shuffle(p.discard.splice(0));
    }
    p.hand.push(p.deck.pop());
}
function addLog(text, cls) {
    run.combat.log.unshift({ text, cls: cls || "info" });
    if (run.combat.log.length > 30) run.combat.log.pop();
}
// 动画事件队列：渲染后统一播放
function queueFx(target, kind, text, color) { run.combat.fx.push({ target, kind, text, color }); }

// ---------- 角色图形 ----------
function playerArt() {
    return `<svg viewBox="0 0 120 150" class="fighter-svg" aria-hidden="true">
        <line x1="90" y1="24" x2="90" y2="140" stroke="#8a6d3b" stroke-width="4" stroke-linecap="round"/>
        <circle cx="90" cy="20" r="6" fill="#d9a066"/>
        <path d="M60 44 L36 140 L84 140 Z" fill="#3f6d8c"/>
        <path d="M60 44 L50 140 L70 140 Z" fill="#5aa0e6" opacity=".55"/>
        <path d="M44 46 Q60 10 76 46 Q60 34 44 46 Z" fill="#34495e"/>
        <ellipse cx="60" cy="46" rx="8.5" ry="10" fill="#141c28"/>
        <circle cx="57" cy="46" r="1.6" fill="#8fd0ff"/><circle cx="63" cy="46" r="1.6" fill="#8fd0ff"/>
    </svg>`;
}
function enemyArt(def) {
    const col = def.color;
    // 玩家在左、敌人在右：有明确朝向的造型需要水平翻转，让头朝向玩家
    const DIRECTIONAL = { wolf: true };
    const S = (inner) => `<svg viewBox="0 0 120 150" class="fighter-svg${DIRECTIONAL[def.art] ? " face-left" : ""}" style="color:${col}" aria-hidden="true">${inner}</svg>`;
    switch (def.art) {
        case "wolf":
            return S(`<path d="M18 96 q-14 2 -12 20 q10 -8 16 -10 z" fill="currentColor"/>
                <ellipse cx="62" cy="98" rx="40" ry="20" fill="currentColor"/>
                <rect x="34" y="112" width="7" height="26" rx="2" fill="currentColor"/>
                <rect x="52" y="114" width="7" height="24" rx="2" fill="currentColor"/>
                <rect x="74" y="114" width="7" height="24" rx="2" fill="currentColor"/>
                <path d="M92 80 l22 -8 -7 17 10 6 -20 11 -14 -8 z" fill="currentColor"/>
                <polygon points="98,72 103,58 108,74" fill="currentColor"/>
                <circle cx="106" cy="84" r="2.4" fill="#ffd54a"/>`);
        case "wraith":
            return S(`<path d="M60 26 C34 26 30 58 34 96 q6 -12 12 0 q6 -12 12 0 q6 -12 12 0 q6 -12 12 0 q6 -14 4 -34 C88 42 84 26 60 26 Z" fill="currentColor" opacity=".92"/>
                <circle cx="50" cy="60" r="4" fill="#eaf4ff"/><circle cx="70" cy="60" r="4" fill="#eaf4ff"/>
                <circle cx="50" cy="60" r="1.8" fill="#1b2a3a"/><circle cx="70" cy="60" r="1.8" fill="#1b2a3a"/>`);
        case "undead":
            return S(`<ellipse cx="60" cy="54" rx="24" ry="26" fill="currentColor"/>
                <ellipse cx="50" cy="52" rx="6" ry="8" fill="#20261f"/><ellipse cx="70" cy="52" rx="6" ry="8" fill="#20261f"/>
                <polygon points="60,62 56,72 64,72" fill="#20261f"/>
                <rect x="46" y="76" width="28" height="5" rx="2" fill="currentColor"/>
                <g stroke="currentColor" stroke-width="5" stroke-linecap="round">
                  <line x1="60" y1="84" x2="60" y2="128"/><line x1="44" y1="94" x2="76" y2="94"/>
                  <line x1="42" y1="106" x2="78" y2="106"/><line x1="44" y1="118" x2="76" y2="118"/></g>`);
        case "cloaked":
            return S(`<path d="M60 40 L30 140 L90 140 Z" fill="currentColor"/>
                <path d="M42 44 Q60 8 78 44 Q60 30 42 44 Z" fill="currentColor"/>
                <ellipse cx="60" cy="48" rx="10" ry="12" fill="#10141b"/>
                <circle cx="55" cy="48" r="2" fill="#ff5a5a"/><circle cx="65" cy="48" r="2" fill="#ff5a5a"/>`);
        case "demon":
            return S(`<polygon points="38,30 30,8 50,26" fill="currentColor"/><polygon points="82,30 90,8 70,26" fill="currentColor"/>
                <path d="M18 70 L46 84 L30 108 Z" fill="currentColor" opacity=".8"/><path d="M102 70 L74 84 L90 108 Z" fill="currentColor" opacity=".8"/>
                <path d="M60 34 L38 138 L82 138 Z" fill="currentColor"/>
                <circle cx="60" cy="44" r="15" fill="currentColor"/>
                <circle cx="54" cy="44" r="3" fill="#ffd23f"/><circle cx="66" cy="44" r="3" fill="#ffd23f"/>
                <path d="M52 52 Q60 58 68 52" stroke="#1a0d0d" stroke-width="2.5" fill="none"/>`);
        case "eye":
            return S(`<g stroke="currentColor" stroke-width="5" stroke-linecap="round">
                  <line x1="60" y1="40" x2="60" y2="14"/><line x1="60" y1="112" x2="60" y2="138"/>
                  <line x1="32" y1="76" x2="8" y2="70"/><line x1="88" y1="76" x2="112" y2="70"/>
                  <line x1="40" y1="52" x2="22" y2="34"/><line x1="80" y1="52" x2="98" y2="34"/>
                  <line x1="40" y1="100" x2="22" y2="118"/><line x1="80" y1="100" x2="98" y2="118"/></g>
                <ellipse cx="60" cy="76" rx="34" ry="22" fill="currentColor"/>
                <ellipse cx="60" cy="76" rx="30" ry="18" fill="#f4ecff"/>
                <circle cx="60" cy="76" r="12" fill="currentColor"/><circle cx="60" cy="76" r="6" fill="#160b1f"/>`);
        case "reaper":
            return S(`<path d="M22 18 L30 12 L96 128 L88 134 Z" fill="#8a8f96"/>
                <path d="M30 12 q26 -6 34 16 q-20 -12 -34 -16 z" fill="#d7dde4"/>
                <path d="M60 38 L30 140 L90 140 Z" fill="currentColor"/>
                <path d="M60 38 L44 140 L76 140 Z" fill="#000" opacity=".18"/>
                <path d="M42 42 Q60 6 78 42 Q60 28 42 42 Z" fill="currentColor"/>
                <ellipse cx="60" cy="46" rx="11" ry="13" fill="#0d1512"/>
                <circle cx="55" cy="46" r="2.6" fill="#8bffd0"/><circle cx="65" cy="46" r="2.6" fill="#8bffd0"/>`);
        case "darklord":
            return S(`<polygon points="40,26 34,4 52,22" fill="currentColor"/><polygon points="80,26 86,4 68,22" fill="currentColor"/>
                <path d="M60 30 L24 140 L96 140 Z" fill="currentColor"/>
                <path d="M60 30 L40 140 L80 140 Z" fill="#000" opacity=".22"/>
                <circle cx="60" cy="40" r="17" fill="currentColor"/>
                <path d="M60 24 L52 34 L60 32 L68 34 Z" fill="#c9a227"/>
                <circle cx="53" cy="42" r="3.2" fill="#ff3b3b"/><circle cx="67" cy="42" r="3.2" fill="#ff3b3b"/>`);
        default: return S(`<circle cx="60" cy="70" r="34" fill="currentColor"/>`);
    }
}
function hpBarHtml(cur, max) {
    return `<div class="hpbar"><div class="hpbar-fill" style="width:${Math.max(0, cur / max * 100)}%"></div><span class="hpbar-text">${Math.max(0, cur)} / ${max}</span></div>`;
}
function blockBadgeHtml(b) { return b > 0 ? `<div class="block-badge" data-tip="护甲：抵挡伤害，回合结束清空">🛡 ${b}</div>` : ""; }
function powersRowHtml(p) {
    if (!p.powers.length) return `<div class="powers-row"></div>`;
    return `<div class="powers-row">${p.powers.map(pw =>
        `<span class="power-chip" data-tip="${escapeHtml(pw.desc)}"><span class="pw-ic">${pw.icon}</span><span class="pw-w">${escapeHtml(pw.form)}</span></span>`).join("")}</div>`;
}
// 复合意图：一次行动可包含多个动作，逐个渲染
// 复合意图的展示顺序与结算顺序一致：攻击在前、减益在后
function intentOrder(a) { return ["vuln", "weak", "frail", "poison"].includes(a.t) ? 1 : 0; }
function describeIntent(a, en) {
    if (!a) return `<span class="intent-unknown">？</span>`;
    if (Array.isArray(a)) return a.slice().sort((x, y) => intentOrder(x) - intentOrder(y)).map(x => describeIntent(x, en)).join("");
    if (a.t === "attack") {
        const p = run.combat.player;
        const base = outgoingDamage(en, Math.round(a.v * (en.dmgMul || 1)));
        const v = incomingDamage(p, base);   // 计入玩家易伤 → 显示的就是真实将受的伤害
        const amped = v > base;
        return `<span class="intent atk ${amped ? "amped" : ""}" data-tip="${amped ? "你处于易伤状态，此次攻击被增幅 ×1.5" : "敌人将发动攻击"}">⚔ ${v}</span>`;
    }
    if (a.t === "defend") return `<span class="intent def" data-tip="敌人将获得护甲">🛡 ${a.v}</span>`;
    if (a.t === "buff") return `<span class="intent buff" data-tip="敌人将提升力量">💪 蓄力</span>`;
    if (a.t === "heal") return `<span class="intent heal" data-tip="敌人将恢复生命">✚ 回复</span>`;
    if (a.t === "vuln") return `<span class="intent debuff" data-tip="敌人将使你易伤：受伤 +50%">☠ 易伤</span>`;
    if (a.t === "weak") return `<span class="intent debuff" data-tip="敌人将使你虚弱：攻击 -25%">🩸 虚弱</span>`;
    if (a.t === "frail") return `<span class="intent debuff" data-tip="敌人将使你脆弱：护甲 -25%">🥀 脆弱</span>`;
    if (a.t === "poison") return `<span class="intent poison" data-tip="敌人将使你中毒：每回合流失生命">☣ 中毒</span>`;
    if (a.t === "doom") return `<span class="intent doom" data-tip="命运：力量永久 +4">⏳ 命运</span>`;
    if (a.t === "summon") return `<span class="intent buff" data-tip="召唤被奴役的仆从助战">🜏 召唤</span>`;
    return `<span class="intent-unknown">？</span>`;
}
/* 卡面数值实时预览：
   - 伤害计入 力量/虚弱/圣物加成/每回合首攻加成
   - 护甲计入 敏捷/脆弱/圣物技能加成
   - 指定 targetEnemy 时再计入其易伤（×1.5）与克星加成——即松手瞬间的真实结算值 */
function previewDamage(card, targetEnemy) {
    const e = eff(card);
    if (!e.dmg) return null;
    const p = run.combat.player;
    let bonus = relicSum("attackBonus");
    if (!p.firstAttackUsed) bonus += relicSum("firstAttackBonus");
    if (targetEnemy && targetEnemy.statuses.vuln > 0) bonus += relicSum("vulnBonus");
    let per = outgoingDamage(p, e.dmg + bonus);
    if (targetEnemy) per = incomingDamage(targetEnemy, per);
    return per;
}
function previewBlock(card) {
    const e = eff(card);
    if (!e.block) return null;
    return computeBlockGain(run.combat.player, e.block + (card.kind === "skill" ? relicSum("blockBonus") : 0));
}
// 生成战斗中的效果行：数值高于基础值标绿、低于标红
function combatEffectLine(card, targetEnemy) {
    const e = eff(card);
    const parts = [];
    if (e.dmg) {
        const v = previewDamage(card, targetEnemy);
        const cls = v > e.dmg ? "num-up" : v < e.dmg ? "num-down" : "";
        parts.push(`造成 <span class="${cls}">${v}</span> 点伤害${e.hits > 1 ? ` ×${e.hits}` : ""}`);
    }
    if (e.block) {
        const v = previewBlock(card);
        const cls = v > e.block ? "num-up" : v < e.block ? "num-down" : "";
        parts.push(`获得 <span class="${cls}">${v}</span> 点护甲`);
    }
    // 其余条目沿用静态描述
    const rest = effectPartsFromEff(e).filter(t => !/^造成 |^获得 \d+ 点护甲/.test(t) &&
        !(e.dmg && t.startsWith("造成")) && !(e.block && t.startsWith("获得 " + e.block + " 点护甲")));
    return parts.concat(rest).join("；");
}

function cardHtml(card, idx) {
    const e = eff(card);
    const p = run.combat.player;
    const affordable = e.cost <= p.energy;
    const revealed = meaningRevealed(card);
    const rar = RARITY_META[card.rarity];
    const targeted = needsTarget(card);
    const kw = keywordBadges(card);
    const multi = run.combat.enemies.filter(x => x.hp > 0).length > 1;
    const touch = isTouchMode();
    // 触屏：一律点击出牌（指向性卡需先点选敌人）；桌面：攻击拖向敌人、其余拖到战斗区
    const clickAttr = touch ? `onclick="tapPlayCard('${card.uid}')"` : "";
    const dragCls = !touch && affordable ? (targeted ? "can-drag" : "can-stagedrag") : "";
    const hint = targeted
        ? (touch ? `<div class="card-target-hint">🎯 ${multi ? "先点选敌人，再点此牌" : "点击出牌"}</div>`
                 : `<div class="card-target-hint">🎯 拖到${multi ? "指定" : ""}怪物出牌</div>`)
        : (touch ? "" : `<div class="card-target-hint stage-hint">↥ 拖到战斗区打出</div>`);
    const rainbow = wordStars(card.form, card.part) >= 3 ? "final-star" : "";
    return `
        <div class="card k-${card.kind} ${rar.cls} tier-${card.tier} ${rainbow} ${affordable ? "" : "unaffordable"} ${targeted ? "card-attack card-target" : ""} ${dragCls} ${card.exhaust ? "card-exhaust" : ""}"
             style="--i:${idx}" data-uid="${card.uid}" ${clickAttr}>
            <div class="card-cost">${e.cost}</div>
            ${idx < 9 ? `<div class="card-hotkey" data-tip="按数字键 ${idx + 1} 打出">${idx + 1}</div>` : ""}
            ${tierBadge(card.tier)}
            <div class="card-rarity" data-tip="${rar.label}卡">${rar.gem}</div>
            <div class="card-word">${card.form}</div>
            <div class="card-part">${revealed ? `${card.part} · ${card.name}` : `${card.part} · ${kindLabel(card.kind)}`}</div>
            <div class="card-effect">${combatEffectLine(card, null)}</div>
            ${kw ? `<div class="card-keywords">${kw}</div>` : ""}
            ${hint}
            ${card.exhaust ? `<div class="card-exhaust-hint" data-tip="消耗：打出后本场战斗不再出现">🔥 消耗</div>` : ""}
            <div class="card-meaning">${revealed ? shortDef(getEntry(card.form, card.part)) : "？？？（词义未掌握）"}</div>
        </div>`;
}

/* 触屏点击出牌：多敌人时必须先点选目标 */
function tapPlayCard(uid) {
    const c = run.combat;
    if (!c) return;
    const card = c.player.hand.find(x => x.uid === uid);
    if (!card) return;
    const alive = c.enemies.filter(x => x.hp > 0);
    if (needsTarget(card) && alive.length > 1 && !c.targetChosen) {
        addLog("多个敌人：请先点击要攻击的敌人，再点卡牌。", "info");
        renderCombat();
        return;
    }
    playCard(uid, needsTarget(card) ? currentTargetEid() : undefined);
}
/* 点击敌人 = 选定目标（触屏必须；桌面同样可用来配合键盘） */
function selectTarget(eid) {
    const c = run.combat;
    if (!c) return;
    const en = c.enemies.find(x => x.eid === eid);
    if (!en || en.hp <= 0) return;
    c.targetId = eid;
    c.targetChosen = true;
    renderCombat();
}

/* 特色机制标签（显示在敌人名下方，悬停有说明） */
function mechChipsHtml(en) {
    const d = en.def, c = run.combat;
    const chips = [];
    if (d.countdown) {
        const left = Math.max(0, d.countdown - c.turn + 1);
        chips.push(left > 0
            ? `<span class="mech-chip m-doom" data-tip="终焉倒数：${d.countdown} 回合后，每回合降下 ${d.executeV} 点毁灭一击">⏳ 终焉 ${left}</span>`
            : `<span class="mech-chip m-doom hot" data-tip="终焉已至：每回合毁灭一击 ${d.executeV}">⏳ 终焉！</span>`);
    }
    if (d.summon) chips.push(`<span class="mech-chip" data-tip="奴役：周期性召唤被奴役的仆从（战场至多 ${d.summon.maxAlive} 个敌人）">🜏 奴役</span>`);
    if (d.phase2) chips.push(en.phased
        ? `<span class="mech-chip hot" data-tip="已蜕变：减益尽除、力量提升、成长加快">🐍 已蜕变</span>`
        : `<span class="mech-chip" data-tip="蜕变：生命降至一半时净化自身并进入第二形态">🐍 蜕变</span>`);
    if (d.enrage) chips.push(en.enraged
        ? `<span class="mech-chip hot" data-tip="已激怒：力量 +${d.enrage}">💢 已激怒</span>`
        : `<span class="mech-chip" data-tip="激怒：生命降至一半时力量 +${d.enrage}">💢 激怒</span>`);
    if (d.thorns) chips.push(`<span class="mech-chip" data-tip="荆棘：每次被攻击牌命中，攻击者反受 ${d.thorns} 点伤害">🌵 荆棘 ${d.thorns}</span>`);
    if (d.revive && !en.reviveUsed) chips.push(`<span class="mech-chip" data-tip="不死：首次被击倒后以 ${Math.round(d.revive * 100)}% 生命复活">⚰ 不死</span>`);
    return chips.join("");
}

function enemyFighterHtml(en, many) {
    return `
        <div class="fighter fighter-enemy ${many ? "compact" : ""} ${en.hp <= 0 ? "dead" : ""} ${many && en.hp > 0 && en.eid === run.combat.targetId && run.combat.targetChosen ? "kb-target" : ""}" id="side-${en.eid}" data-eid="${en.eid}" onclick="selectTarget('${en.eid}')">
            <div class="intent-bubble">${en.hp > 0 ? describeIntent(en.nextAction, en) : ""}</div>
            <div class="fighter-figure" id="fig-${en.eid}">
                ${blockBadgeHtml(en.block)}${enemyArt(en.def)}
                ${en.def.elite ? `<div class="rank-tag elite">精英</div>` : ""}
                ${en.def.boss ? `<div class="rank-tag boss">首领</div>` : ""}
            </div>
            <div class="fighter-name enemy">${en.def.form}</div>
            ${hpBarHtml(en.hp, en.maxHp)}
            <div class="status-icons">${statusPills(en)}</div>
            <div class="fighter-sub">
                <div class="fighter-gloss">${escapeHtml(shortDef(en.entry))}</div>
                <div class="mech-row">
                    ${enemyGrowth(en) ? `<span class="growth-tag" data-tip="成长：每次行动后力量永久 +${enemyGrowth(en)}，拖得越久越强">📈 +${enemyGrowth(en)}</span>` : ""}
                    ${mechChipsHtml(en)}
                </div>
            </div>
        </div>`;
}

function renderCombat() {
    const c = run.combat, p = c.player;
    if (c.targetChosen) {
        const t = c.enemies.find(x => x.eid === c.targetId);
        if (!t || t.hp <= 0) c.targetChosen = false;
    }
    const alive = c.enemies.filter(e => e.hp > 0);
    const many = c.enemies.length > 1;
    const hand = p.hand.map((card, i) => cardHtml(card, i)).join("") || "<p style='color:#7f8c8d;'>（手牌已空）</p>";
    app.innerHTML = `
        ${topBarHtml()}
        <div class="combat-top">
            <span class="turn-chip">回合 ${c.turn}</span>
            <span class="energy-orb" data-tip="能量：打出卡牌的资源，每回合回满">⚡ ${p.energy}/${p.energyMax}</span>
            ${many ? `<span class="turn-chip" data-tip="需击败全部敌人才算胜利">👹 剩余 ${alive.length}/${c.enemies.length}</span>` : ""}
            <span class="hotkey-hint" data-tip="1~9 出牌 · ←→ 切换目标 · E 结束回合 · D 牌堆">⌨ 快捷键</span>
            <button class="primary-btn end-turn" onclick="endPlayerTurn()">结束回合 <kbd>E</kbd></button>
        </div>
        <div class="battle-stage">
            <div class="fighter fighter-player" id="playerSide">
                <div class="intent-bubble" aria-hidden="true"></div>
                <div class="fighter-figure" id="playerFig">${blockBadgeHtml(p.block)}${playerArt()}</div>
                <div class="fighter-name">你 · Randir</div>
                ${hpBarHtml(run.hp, run.maxHp)}
                <div class="status-icons">${statusPills(p)}</div>
                <div class="fighter-sub">${powersRowHtml(p)}</div>
            </div>
            <div class="stage-vs">⚔</div>
            <div class="enemy-group ${many ? "multi" : ""}">
                ${c.enemies.map(e => enemyFighterHtml(e, many)).join("")}
            </div>
        </div>
        <div class="hand ${c.dealAnim ? "dealing" : ""}" id="handArea">${hand}</div>
        <div class="log">${c.log.map(l => `<div class="log-${l.cls}">${l.text}</div>`).join("")}</div>`;
    c.dealAnim = false;
    if (!aimState) clearAim();
    attachDragHandlers();
    flushFx();
}

// 播放本次操作累积的动画（浮动数字 / 震动 / 突进）
function flushFx() {
    const c = run.combat;
    if (!c || !c.fx.length) return;
    const fx = c.fx.splice(0);
    if (window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    fx.forEach((f, i) => {
        const fig = document.getElementById(f.target === "player" ? "playerFig" : "fig-" + f.target);
        if (!fig) return;
        setTimeout(() => {
            const el = document.createElement("div");
            el.className = "float-num fx-" + f.kind;
            el.textContent = f.text;
            fig.appendChild(el);
            setTimeout(() => el.remove(), 900);
            if (f.kind === "damage") {
                fig.classList.remove("shake"); void fig.offsetWidth; fig.classList.add("shake");
                setTimeout(() => fig.classList.remove("shake"), 400);
            }
            if (f.kind === "lunge") {
                const side = f.target === "player" ? "lunge-right" : "lunge-left";
                fig.classList.add(side);
                setTimeout(() => fig.classList.remove(side), 350);
            }
            if (f.kind === "death") spawnDeathFx(fig, f.color);
        }, i * 120);
    });
}

/* 回合开始横幅：屏幕中央显示第几回合，随后渐隐 */
function spawnTurnBanner(turn) {
    if (window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const el = document.createElement("div");
    el.className = "turn-banner";
    el.textContent = `回合 ${turn}`;
    document.body.appendChild(el);
    setTimeout(() => el.remove(), 1300);
}

/* 出牌提示：屏幕中央短暂显示打出的卡牌名，随后渐隐 */
function spawnCardToast(card) {
    if (window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const el = document.createElement("div");
    el.className = "card-toast k-" + card.kind;
    const revealed = meaningRevealed(card);
    el.innerHTML = `<span class="ct-word">${escapeHtml(card.form)}</span>` +
        (revealed ? `<span class="ct-name">${escapeHtml(card.name)}</span>` : "");
    document.body.appendChild(el);
    setTimeout(() => el.remove(), 1000);
}

/* 强化成功：升级动画（金环爆发 + 上升粒子 + 星级标记） */
function playUpgradeFx(card, tier) {
    if (window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const el = document.createElement("div");
    el.className = "upgrade-fx";
    const label = tier >= 2 ? "强强化" : "弱强化";
    let sparks = "";
    for (let i = 0; i < 14; i++) {
        const ang = (i / 14) * Math.PI * 2;
        const d = 60 + Math.random() * 40;
        sparks += `<i style="--dx:${(Math.cos(ang) * d).toFixed(0)}px;--dy:${(Math.sin(ang) * d - 20).toFixed(0)}px;animation-delay:${Math.round(Math.random() * 150)}ms"></i>`;
    }
    el.innerHTML = `
        <div class="ufx-ring"></div>${sparks}
        <div class="ufx-word">${escapeHtml(card.form)}</div>
        <div class="ufx-label ${tier >= 2 ? "t2" : "t1"}">⬆ ${label} ${tier >= 2 ? "＋＋" : "＋"}</div>`;
    document.body.appendChild(el);
    setTimeout(() => el.remove(), 1500);
}

// 阵亡：角色化作粒子消散
function spawnDeathFx(fig, color) {
    const col = color || "#c0392b";
    const rect = fig.getBoundingClientRect();
    const layer = document.createElement("div");
    layer.className = "death-burst";
    layer.style.left = (rect.left + rect.width / 2) + "px";
    layer.style.top = (rect.top + rect.height * 0.45) + "px";
    for (let i = 0; i < 26; i++) {
        const p = document.createElement("i");
        const ang = Math.random() * Math.PI * 2;
        const dist = 34 + Math.random() * 78;
        const size = 3 + Math.random() * 5;
        p.style.setProperty("--dx", (Math.cos(ang) * dist).toFixed(1) + "px");
        p.style.setProperty("--dy", (Math.sin(ang) * dist - 34).toFixed(1) + "px");
        p.style.animationDelay = Math.round(Math.random() * 200) + "ms";
        p.style.width = p.style.height = size.toFixed(1) + "px";
        p.style.background = i % 4 === 0 ? "#fff6d5" : col;
        p.style.color = col;
        layer.appendChild(p);
    }
    document.body.appendChild(layer);
    setTimeout(() => layer.remove(), 1400);
    // 图形本体升腾、模糊、淡出
    const svg = fig.querySelector(".fighter-svg");
    if (svg) svg.classList.add("dying");
    const host = fig.closest(".fighter");
    if (host) {
        host.classList.add("just-died");           // 消散期间先不套用灰化样式
        setTimeout(() => host.classList.remove("just-died"), 900);
    }
}

function attachDragHandlers() {
    const handArea = document.getElementById("handArea");
    if (!handArea || isTouchMode()) return;   // 触屏走点击流程
    const targets = aimTargets();
    if (targets.length) {
        handArea.querySelectorAll(".card-target.can-drag[data-uid]").forEach(el => {
            el.addEventListener("pointerdown", (ev) => startCardDrag(ev, el, targets));
        });
    }
    // 非指向性卡：拖到战斗区任意位置释放（不画箭头）
    const stage = document.querySelector(".battle-stage");
    if (stage) {
        handArea.querySelectorAll(".can-stagedrag[data-uid]").forEach(el => {
            el.addEventListener("pointerdown", (ev) => startStageDrag(ev, el, stage));
        });
    }
}

/* 非指向性卡的拖拽：卡牌跟随鼠标，松手落在战斗区内即打出 */
function startStageDrag(ev, cardEl, stage) {
    ev.preventDefault();
    const uid = cardEl.dataset.uid;
    const rect = cardEl.getBoundingClientRect();
    const ghost = cardEl.cloneNode(true);
    ghost.classList.add("card-ghost");
    ghost.style.width = rect.width + "px";
    ghost.style.left = rect.left + "px";
    ghost.style.top = rect.top + "px";
    document.body.appendChild(ghost);
    cardEl.classList.add("dragging");
    hideTip();
    const offX = ev.clientX - rect.left, offY = ev.clientY - rect.top;
    const overStage = (x, y) => {
        const r = stage.getBoundingClientRect();
        return x >= r.left && x <= r.right && y >= r.top && y <= r.bottom;
    };
    function onMove(e) {
        ghost.style.left = (e.clientX - offX) + "px";
        ghost.style.top = (e.clientY - offY) + "px";
        stage.classList.toggle("stage-drop-ok", overStage(e.clientX, e.clientY));
    }
    function onUp(e) {
        document.removeEventListener("pointermove", onMove);
        stage.classList.remove("stage-drop-ok");
        ghost.remove();
        if (overStage(e.clientX, e.clientY)) playCard(uid);
        else cardEl.classList.remove("dragging");
    }
    document.addEventListener("pointermove", onMove);
    document.addEventListener("pointerup", onUp, { once: true });
}
/* ------------------------------------------------------------
   瞄准箭头：从卡牌沿一条曲线指向鼠标，只有落在敌人身上才算有效目标
   两种进入方式：拖拽（按住卡牌）与键盘（按数字键后用鼠标点选）
   ------------------------------------------------------------ */
let aimState = null;

function aimTargets() {
    if (!run.combat) return [];
    return run.combat.enemies.filter(e => e.hp > 0)
        .map(e => ({ eid: e.eid, el: document.getElementById("side-" + e.eid) }))
        .filter(t => t.el);
}
function ensureAimLayer() {
    let svg = document.getElementById("aimLayer");
    if (!svg) {
        svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
        svg.id = "aimLayer";
        svg.setAttribute("class", "aim-layer");
        svg.innerHTML = `<path class="aim-path"/><polygon class="aim-head"/>`;
        document.body.appendChild(svg);
    }
    svg.setAttribute("width", window.innerWidth);
    svg.setAttribute("height", window.innerHeight);
    svg.setAttribute("viewBox", `0 0 ${window.innerWidth} ${window.innerHeight}`);
    return svg;
}
function drawAim(from, to, valid) {
    const svg = ensureAimLayer();
    svg.classList.add("active");
    svg.classList.toggle("valid", !!valid);
    // 二次贝塞尔：控制点抬高，形成一条自然的弧线
    const cx = (from.x + to.x) / 2;
    const cy = Math.min(from.y, to.y) - Math.max(60, Math.abs(to.x - from.x) * 0.32);
    svg.querySelector(".aim-path").setAttribute("d", `M ${from.x} ${from.y} Q ${cx} ${cy} ${to.x} ${to.y}`);
    // 箭头方向取曲线末端切线
    const tx = to.x - cx, ty = to.y - cy;
    const len = Math.hypot(tx, ty) || 1;
    const ux = tx / len, uy = ty / len, s = 13;
    const p1 = `${to.x},${to.y}`;
    const p2 = `${to.x - ux * s - uy * s * 0.6},${to.y - uy * s + ux * s * 0.6}`;
    const p3 = `${to.x - ux * s + uy * s * 0.6},${to.y - uy * s - ux * s * 0.6}`;
    svg.querySelector(".aim-head").setAttribute("points", `${p1} ${p2} ${p3}`);
}
function clearAim() {
    const svg = document.getElementById("aimLayer");
    if (svg) svg.classList.remove("active", "valid");
    if (aimState) {
        aimState.targets.forEach(t => t.el.classList.remove("drop-active"));
        if (aimState.ghost) aimState.ghost.remove();
        if (aimState.cardEl) aimState.cardEl.classList.remove("dragging", "aiming");
        document.removeEventListener("pointermove", aimState.onMove);
        document.removeEventListener("pointerup", aimState.onUp);
        document.removeEventListener("keydown", aimState.onKey, true);
    }
    aimState = null;
}
function aimHitTest(x, y) {
    if (!aimState) return null;
    return aimState.targets.find(t => {
        const r = t.el.getBoundingClientRect();
        return x >= r.left && x <= r.right && y >= r.top && y <= r.bottom;
    });
}
function aimUpdate(x, y) {
    if (!aimState) return;
    const hit = aimHitTest(x, y);
    aimState.targets.forEach(t => t.el.classList.toggle("drop-active", !!hit && t.eid === hit.eid));
    if (aimState.ghost) {
        aimState.ghost.style.left = (x - aimState.offX) + "px";
        aimState.ghost.style.top = (y - aimState.offY) + "px";
    }
    drawAim(aimState.origin, { x, y }, !!hit);
    // 悬停目标变化时，实时更新卡面数值（易伤乘算等 → 松手即这一数值）
    const hitEid = hit ? hit.eid : null;
    if (hitEid !== aimState.lastHitEid) {
        aimState.lastHitEid = hitEid;
        const card = run.combat.player.hand.find(c => c.uid === aimState.uid);
        if (card) {
            const enemy = hitEid ? run.combat.enemies.find(e => e.eid === hitEid) : null;
            const html = combatEffectLine(card, enemy);
            [aimState.cardEl, aimState.ghost].forEach(el => {
                if (!el) return;
                const eff = el.querySelector(".card-effect");
                if (eff) eff.innerHTML = html;
            });
        }
    }
}

// mode: "drag"（按住不放）或 "click"（键盘触发，移动后点击确认）
function startAiming(cardEl, uid, mode, ev) {
    const targets = aimTargets();
    if (!targets.length) return;
    clearAim();
    hideTip();
    const rect = cardEl.getBoundingClientRect();
    const origin = { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 };
    let ghost = null, offX = 0, offY = 0;
    if (mode === "drag") {
        ghost = cardEl.cloneNode(true);
        ghost.classList.add("card-ghost");
        ghost.style.width = rect.width + "px";
        ghost.style.left = rect.left + "px";
        ghost.style.top = rect.top + "px";
        document.body.appendChild(ghost);
        cardEl.classList.add("dragging");
        offX = ev.clientX - rect.left; offY = ev.clientY - rect.top;
    } else {
        cardEl.classList.add("aiming");
    }
    const onMove = (e) => aimUpdate(e.clientX, e.clientY);
    const onUp = (e) => {
        if (mode === "drag") {
            const hit = aimHitTest(e.clientX, e.clientY);
            clearAim();
            if (hit) playCard(uid, hit.eid);
        }
    };
    const onClick = (e) => {
        if (mode !== "click") return;
        const hit = aimHitTest(e.clientX, e.clientY);
        document.removeEventListener("pointerdown", onClick, true);
        clearAim();
        if (hit) playCard(uid, hit.eid);   // 不在怪物身上则视为取消
    };
    const onKey = (e) => { if (e.key === "Escape") { document.removeEventListener("pointerdown", onClick, true); clearAim(); } };

    aimState = { targets, origin, ghost, offX, offY, cardEl, onMove, onUp, onKey, mode, uid, lastHitEid: undefined };
    document.addEventListener("pointermove", onMove);
    if (mode === "drag") document.addEventListener("pointerup", onUp, { once: true });
    else document.addEventListener("pointerdown", onClick, true);
    document.addEventListener("keydown", onKey, true);

    const start = mode === "drag" ? { x: ev.clientX, y: ev.clientY } : origin;
    aimUpdate(start.x, start.y);
}

function startCardDrag(ev, cardEl, targets) {
    ev.preventDefault();
    startAiming(cardEl, cardEl.dataset.uid, "drag", ev);
}

// 消耗牌的溶解特效：在重新渲染前抓取卡牌位置，生成一个原地消散的副本
function spawnDissolve(uid) {
    if (window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const el = document.querySelector(`.card[data-uid="${uid}"]`);
    if (!el) return;
    const r = el.getBoundingClientRect();
    const ghost = el.cloneNode(true);
    ghost.classList.add("card-dissolve");
    ghost.classList.remove("dragging");
    ghost.style.left = r.left + "px";
    ghost.style.top = r.top + "px";
    ghost.style.width = r.width + "px";
    ghost.style.height = r.height + "px";
    const spark = document.createElement("div");
    spark.className = "dissolve-spark";
    ghost.appendChild(spark);
    document.body.appendChild(ghost);
    setTimeout(() => ghost.remove(), 700);
}

function playCard(uid, targetEid) {
    const c = run.combat, p = c.player;
    const idx = p.hand.findIndex(x => x.uid === uid);
    if (idx === -1) return;
    const card = p.hand[idx];
    const e = eff(card);
    const alive = c.enemies.filter(x => x.hp > 0);
    if (!alive.length) return;
    // 指向性卡牌必须有目标；未指定时退回第一个存活敌人
    let en = alive.find(x => x.eid === targetEid) || alive[0];
    if (needsTarget(card) && !targetEid && alive.length > 1) return;
    let cost = e.cost;
    const firstFree = hasRelic("firstCardFree") && !p.firstCardFreeUsed;
    const firstSkillFree = !firstFree && hasRelic("firstSkillFree") && card.kind === "skill" && !p.firstSkillFreeUsed;
    if (firstFree || firstSkillFree) cost = 0;
    if (cost > p.energy) return;
    p.energy -= cost;
    if (firstFree) p.firstCardFreeUsed = true;
    if (firstSkillFree) p.firstSkillFreeUsed = true;
    spawnCardToast(card);

    if (e.dmg) {
        queueFx("player", "lunge", "");
        // 圣物：攻击加成 / 每回合首次攻击 / 针对易伤目标
        let bonus = relicSum("attackBonus");
        if (!p.firstAttackUsed) { bonus += relicSum("firstAttackBonus"); p.firstAttackUsed = true; }
        for (let i = 0; i < e.hits; i++) {
            if (en.hp <= 0) break;
            const vulnBonus = en.statuses.vuln > 0 ? relicSum("vulnBonus") : 0;
            const dealt = damageEnemy(en, outgoingDamage(p, e.dmg + bonus + vulnBonus));
            queueFx(en.eid, "damage", "-" + dealt);
            if (en.hp <= 0 && !en.deathFx) { en.deathFx = true; queueFx(en.eid, "death", "", en.def.color); }
            // 荆棘（daedelos）：攻击者反受伤害
            if (en.def.thorns && en.hp > 0) {
                let tdmg = en.def.thorns;
                if (p.block > 0) { const ab = Math.min(p.block, tdmg); p.block -= ab; tdmg -= ab; }
                if (tdmg > 0) { run.hp -= tdmg; queueFx("player", "damage", "-" + tdmg); }
                if (run.hp <= 0) { renderCombat(); setTimeout(renderDefeat, 1000); return; }
            }
            if (en.hp <= 0 && relicSum("healOnKill")) {
                run.hp = Math.min(run.maxHp, run.hp + relicSum("healOnKill"));
                queueFx("player", "heal", "+" + relicSum("healOnKill"));
            }
        }
    }
    if (e.block) {
        const g = computeBlockGain(p, e.block + (card.kind === "skill" ? relicSum("blockBonus") : 0));
        p.block += g; queueFx("player", "block", "+" + g);
        if (e.retainBlock) p.keepBlockNextTurn = true;
    }
    if (e.heal) { run.hp = Math.min(run.maxHp, run.hp + e.heal); queueFx("player", "heal", "+" + e.heal); }
    if (e.draw) for (let i = 0; i < e.draw; i++) drawOne();
    if (e.buffStrength) { p.strength += e.buffStrength; queueFx("player", "buff", "力量+" + e.buffStrength); }
    if (e.buffDex) { p.dexterity += e.buffDex; queueFx("player", "buff", "敏捷+" + e.buffDex); }
    if (e.energyGain) p.energy += e.energyGain;
    if (e.vuln) { en.statuses.vuln += e.vuln; queueFx(en.eid, "debuff", "易伤+" + e.vuln); }
    if (e.weak) { en.statuses.weak += e.weak; queueFx(en.eid, "debuff", "虚弱+" + e.weak); }
    if (e.cleanse) { p.statuses = newStatuses(); queueFx("player", "buff", "净化"); }
    if (e.startTurnBlock) p.startTurnBlock += e.startTurnBlock;
    if (e.drawBonus) p.drawBonus += e.drawBonus;

    addLog(`你使用了 <b>${card.form}</b>${meaningRevealed(card) ? "（" + card.name + "）" : ""}。`, "good");

    const consumed = card.exhaust || card.exileAfterUse;
    if (consumed) {
        spawnDissolve(card.uid); // 必须在重新渲染前抓取位置
        if (relicSum("exhaustEnergy")) p.energy += relicSum("exhaustEnergy");
    }

    p.hand.splice(idx, 1);
    if (card.kind === "power") {
        p.powers.push({ form: card.form, icon: powerIcon(card), desc: powerDesc(card, e) });
        if (card.exhaust) p.exile.push(card);
    } else if (card.exileAfterUse) {
        p.exile.push(card);
        run.deck = run.deck.filter(x => x.uid !== card.uid);
    } else if (card.exhaust) p.exile.push(card);
    else p.discard.push(card);

    if (en.hp <= 0) addLog(`<b>${en.def.form}</b> 被击倒。`, "good");
    if (c.enemies.every(x => x.hp <= 0)) { renderCombat(); setTimeout(winCombat, 450); return; }
    renderCombat();
}
function powerIcon(card) {
    return { barad: "🗼", curu: "📖", "(m)belaith": "🔥", "(n)dagor": "💪" }[card.form] || "💠";
}
function powerDesc(card, e) {
    const parts = [];
    if (e.buffStrength) parts.push(`力量 +${e.buffStrength}`);
    if (e.buffDex) parts.push(`敏捷 +${e.buffDex}`);
    if (e.startTurnBlock) parts.push(`每回合起始 +${e.startTurnBlock} 护甲`);
    if (e.drawBonus) parts.push(`每回合多抽 ${e.drawBonus} 张牌`);
    return `${meaningRevealed(card) ? card.name : "能力"}：${parts.join("，") || "常驻效果"}`;
}
function damageEnemy(en, amount) {
    let dmg = incomingDamage(en, amount);
    if (en.block > 0) { const a = Math.min(en.block, dmg); en.block -= a; dmg -= a; }
    applyEnemyLoss(en, dmg);
    return dmg;
}
/* 敌人失去生命的统一入口（攻击与中毒都走这里）：结算复活/激怒/蜕变 */
function applyEnemyLoss(en, dmg) {
    en.hp = Math.max(0, en.hp - dmg);
    const d = en.def;
    // 不死（fern）：首次被击倒后爬起
    if (en.hp <= 0 && d.revive && !en.reviveUsed) {
        en.reviveUsed = true;
        en.hp = Math.max(1, Math.round(en.maxHp * d.revive));
        queueFx(en.eid, "heal", "复活 " + en.hp);
        addLog(`<b>${d.form}</b> 的尸体再度爬了起来……`, "bad");
    }
    // 激怒（ndur）：首次半血，力量激增
    if (d.enrage && !en.enraged && en.hp > 0 && en.hp <= en.maxHp / 2) {
        en.enraged = true;
        en.strength += d.enrage;
        queueFx(en.eid, "buff", "激怒 力量+" + d.enrage);
        addLog(`<b>${d.form}</b> 被激怒了！力量 +${d.enrage}。`, "bad");
    }
    // 蜕变（dagnir）：半血进入第二形态
    if (d.phase2 && !en.phased && en.hp > 0 && en.hp <= en.maxHp * d.phase2.at) {
        en.phased = true;
        en.statuses = newStatuses();            // 净化自身减益
        en.strength += d.phase2.strength;
        en.patternIdx = 0;
        en.nextAction = d.phase2.pattern[0];
        queueFx(en.eid, "buff", "蜕变");
        addLog(`<b>${d.form}</b> 撕裂旧躯蜕变了——减益尽除，力量 +${d.phase2.strength}，成长加快！`, "bad");
    }
}
// 当前生效的行动表 / 成长（蜕变后切换）
function enemyPattern(en) { return en.phased && en.def.phase2 ? en.def.phase2.pattern : en.def.pattern; }
function enemyGrowth(en) { return en.phased && en.def.phase2 ? en.def.phase2.growth : (en.def.growth || 0); }

function endPlayerTurn() {
    const c = run.combat, p = c.player;
    // 手牌结算：保留→留在手上；虚无→消耗；其余→弃牌堆
    const keep = [], toExile = [], toDiscard = [];
    p.hand.forEach(card => {
        if (card.ethereal) toExile.push(card);
        else if (card.retain) keep.push(card);
        else toDiscard.push(card);
    });
    if (toExile.length) {
        toExile.forEach(card => addLog(`<b>${card.form}</b> 因「虚无」而消散。`, "info"));
        queueFx("player", "debuff", "虚无消散");
    }
    p.hand = keep;
    p.discard.push(...toDiscard);
    p.exile.push(...toExile);
    p.freshDebuffs = { vuln: 0, weak: 0, frail: 0 };   // 记录本敌方回合新施加的减益

    // 敌方回合：每只存活敌人先结算中毒，再依次行动
    for (const en of c.enemies) {
        if (en.hp <= 0) continue;
        if (en.statuses.poison > 0) {
            const pdmg = en.statuses.poison;
            queueFx(en.eid, "poison", "-" + pdmg);
            en.statuses.poison--;
            applyEnemyLoss(en, pdmg);
            if (en.hp <= 0) {
                if (!en.deathFx) { en.deathFx = true; queueFx(en.eid, "death", "", en.def.color); }
                addLog(`<b>${en.def.form}</b> 中毒身亡。`, "good");
                continue;
            }
        }
        enemyAct(en);
        tickStatuses(en);
        if (run.hp <= 0) { queueFx("player", "death", "", "#4a90e2"); renderCombat(); setTimeout(renderDefeat, 1000); return; }
    }
    // 玩家减益在敌方全部行动完毕后才递减——保证意图上显示的增幅数字与实际结算一致；
    // 本回合新施加的层数不递减（否则刚上的 2 层立刻变 1 层）
    ["vuln", "weak", "frail"].forEach(k => {
        if (p.statuses[k] > (p.freshDebuffs[k] || 0)) p.statuses[k]--;
    });
    if (c.enemies.every(x => x.hp <= 0)) { renderCombat(); setTimeout(winCombat, 450); return; }

    // 玩家新回合
    c.turn++;
    p.block = p.keepBlockNextTurn ? p.block : 0;
    p.keepBlockNextTurn = false;
    if (p.startTurnBlock) p.block += computeBlockGain(p, p.startTurnBlock);
    if (p.statuses.poison > 0) {
        const dmg = hasRelic("poisonResist") ? Math.ceil(p.statuses.poison / 2) : p.statuses.poison;
        run.hp = Math.max(0, run.hp - dmg);
        queueFx("player", "poison", "-" + dmg);
        p.statuses.poison--;
        if (run.hp <= 0) { queueFx("player", "death", "", "#4a90e2"); renderCombat(); setTimeout(renderDefeat, 1000); return; }
    }
    p.energy = p.energyMax;
    p.firstCardFreeUsed = false;
    p.firstSkillFreeUsed = false;
    p.firstAttackUsed = false;
    // 命运（amarth）：倒数耗尽后，行动固定为终焉毁灭一击
    c.enemies.forEach(en => {
        if (en.hp > 0 && en.def.countdown && c.turn > en.def.countdown) {
            en.nextAction = { t: "attack", v: en.def.executeV };
        }
    });
    c.dealAnim = true;
    drawHand();
    renderCombat();
    spawnTurnBanner(c.turn);
    if (c.pendingFinalQuiz) { c.pendingFinalQuiz = false; startFinalQuiz(); }
}

/* ------------------------------------------------------------
   最终测验（首领的「命运」回合触发）：
   从牌组抽两个词——一道词义题（弱强化级）+ 一道音变/变位题（强强化级）。
   全对 → 首领虚弱 1 回合；错一道 → 失去 5 生命；错两道 → 自身获得脆弱/虚弱/易伤各 1。
   答对不会强化卡牌；但答对音变题且该词已 ★★ 时，升为 ★★★（生词手册三星，卡面彩虹）。
   ------------------------------------------------------------ */
/* 首领在最终测验时的台词。sd 为辛达语（由用户撰写后填入），为空时只显示中文。
   intro=开场 / win=玩家全对 / fail=玩家有答错 */
const BOSS_QUOTES = {
    amarth: {   // 命运
        intro: { sd: "Daro, amroth. Pedo i phith gîn n'amarth.", zh: "站住，攀塔者。在命运面前，说出你学到的言语。" },
        win:   { sd: "...ipi i amarth ú-ava i phith lîn.", zh: "……连命运也无法否认你的言语。" },
        fail:  { sd: "I lam gîn gweria im. Se i amarth gîn.", zh: "你的舌头背叛了你。这就是你的命运。" }
    },
    bauglir: {  // 暴君
        intro: { sd: "Ogdo, farannen. Lhassa annin Edhellen iaedad uin gobem gîn.", zh: "跪下，虫豸。让我听听你那可笑的精灵语。" },
        win:   { sd: "Ego! Fíreb bertha peded i phith hain!", zh: "什么？！区区凡人竟能说出这样的话——" },
        fail:  { sd: "Ai! Sui abgennen, gwí vûl 'lavrol.", zh: "哈！果然只是牙牙学语的奴隶。" }
    },
    dagnir: {   // 克星
        intro: { sd: "Ilpheth athae, egor 'loew. Cilo!", zh: "每一个词都是解药，或是毒药。选吧。" },
        win:   { sd: "...I phith lîn glennin ah arethgern. Delu dhae.", zh: "……你的言语纯净无毒。可恨。" },
        fail:  { sd: "Ai! I thloew raethannen i lang gîn. I phith gîn dýgair ah i lû gîn estent.", zh: "毒已入喉。词不达意，命不久矣。" }
    }
};
function bossQuoteHtml(q) {
    if (!q) return "";
    return `<blockquote class="boss-quote">${q.sd ? `<span class="bq-sd">${escapeHtml(q.sd)}</span>` : ""}<span class="bq-zh">${escapeHtml(q.zh)}</span></blockquote>`;
}

function startFinalQuiz() {
    const c = run.combat;
    if (!c || !run.deck.length) return;
    const pool = shuffle(run.deck.slice());
    const wordA = pool[0];
    const wordB = pool.find(x => x.form !== wordA.form) || wordA;
    let wrong = 0;
    const bossEn = c.enemies.find(e => e.def.boss);
    const quotes = BOSS_QUOTES[run.bossKey] || null;
    showModal(`<h3>⚖ 首领的最终测验</h3>
        ${quotes ? bossQuoteHtml(quotes.intro) : ""}
        <p class="modal-hint">接下来是两道试炼：词义与变形。<br>
        全对：首领虚弱 2 回合 · 错一道：-5 生命 · 全错：陷入脆弱+虚弱+易伤各 2 回合</p>
        <div class="btn-row"><button class="primary-btn" onclick="closeModal();__finalQuizStep()">迎接试炼</button></div>`);
    window.__finalQuiz = { wordA, wordB, wrong, step: 0, quotes };
}
function __finalQuizStep() {
    const q = window.__finalQuiz;
    if (!q) return;
    if (q.step === 0) {
        q.step = 1;
        quizTranslation(q.wordA.form, q.wordA.part, (ok) => {
            if (!ok) q.wrong++;
            __finalQuizStep();
        });
    } else if (q.step === 1) {
        q.step = 2;
        quizMutationOrFallback(q.wordB.form, q.wordB.part, (ok) => {
            if (!ok) q.wrong++;
            else if (wordStars(q.wordB.form, q.wordB.part) >= 2) setWordStars(q.wordB.form, q.wordB.part, 3);
            __finalQuizResolve();
        });
    }
}
function __finalQuizResolve() {
    const q = window.__finalQuiz;
    window.__finalQuiz = null;
    const c = run.combat;
    if (!c) return;
    let text, quote = null;
    if (q.wrong === 0) {
        c.enemies.forEach(en => { if (en.def.boss && en.hp > 0) en.statuses.weak += 2; });
        text = "两道试炼全部通过！首领虚弱 2 回合。";
        quote = q.quotes && q.quotes.win;
    } else if (q.wrong === 1) {
        run.hp = Math.max(1, run.hp - 5);
        queueFx("player", "damage", "-5");
        text = "你答错了一道，命运之力灼伤了你（-5 生命）。";
        quote = q.quotes && q.quotes.fail;
    } else {
        const p = c.player;
        p.statuses.frail += 2; p.statuses.weak += 2; p.statuses.vuln += 2;
        queueFx("player", "debuff", "脆弱+虚弱+易伤");
        text = "两道全错——脆弱、虚弱、易伤各 2 回合。";
        quote = q.quotes && q.quotes.fail;
    }
    addLog(text, q.wrong === 0 ? "good" : "bad");
    showModal(`<h3>试炼结果</h3>${bossQuoteHtml(quote)}<p>${text}</p>
        <div class="btn-row"><button class="primary-btn" onclick="closeModal();renderCombat();">继续战斗</button></div>`);
}

// 执行一次敌人行动：意图可能是复合的（数组），逐个结算，最后按成长值涨力量
function enemyAct(en) {
    let acts = Array.isArray(en.nextAction) ? en.nextAction : [en.nextAction];
    // 攻击先结算、减益后施加：否则刚上的易伤会立刻增幅本次攻击，与意图显示的数字不符
    acts = acts.slice().sort((x, y) => intentOrder(x) - intentOrder(y));
    for (const act of acts) {
        enemyDoAction(en, act);
        if (run.hp <= 0) break; // 玩家已阵亡，停止后续动作
    }
    const g = enemyGrowth(en);
    if (g) {
        en.strength += g;
        queueFx(en.eid, "buff", "成长 +" + g);
    }
    const pat = enemyPattern(en);
    en.patternIdx = (en.patternIdx + 1) % pat.length;
    en.nextAction = pat[en.patternIdx];
}

function enemyDoAction(en, a) {
    const c = run.combat, p = c.player;
    const nm = en.def.form;
    if (a.t === "attack") {
        queueFx(en.eid, "lunge", "");
        const base = Math.round(a.v * (en.dmgMul || 1));
        let remain = incomingDamage(p, outgoingDamage(en, base));
        if (p.block > 0) { const ab = Math.min(p.block, remain); p.block -= ab; remain -= ab; }
        run.hp -= remain;
        queueFx("player", "damage", "-" + remain);
        addLog(`${nm} 攻击，你受到 ${remain} 点伤害。`, "bad");
    } else if (a.t === "defend") {
        const g = computeBlockGain(en, a.v); en.block += g;
        queueFx(en.eid, "block", "+" + g);
        addLog(`${nm} 获得 ${g} 点护甲。`, "info");
    } else if (a.t === "buff") {
        en.strength += a.v; queueFx(en.eid, "buff", "力量+" + a.v);
        addLog(`${nm} 蓄力，力量 +${a.v}。`, "bad");
    } else if (a.t === "heal") {
        en.hp = Math.min(en.maxHp, en.hp + a.v); queueFx(en.eid, "heal", "+" + a.v);
        addLog(`${nm} 恢复 ${a.v} 点生命。`, "bad");
    } else if (a.t === "vuln" || a.t === "weak" || a.t === "frail" || a.t === "poison") {
        const m = STATUS_META[a.t];
        // 圣物：高贵（免疫本场首次减益）→ 坚忍（减益时长 -1）
        if (p.artifactLeft > 0) {
            p.artifactLeft--;
            queueFx("player", "buff", "免疫 " + m.name);
            addLog(`圣物挡下了 ${nm} 施加的${m.name}。`, "good");
        } else {
            const amount = Math.max(1, a.v - (a.t === "poison" ? 0 : relicSum("debuffResist")));
            p.statuses[a.t] += amount;
            if (p.freshDebuffs && a.t !== "poison") p.freshDebuffs[a.t] = (p.freshDebuffs[a.t] || 0) + amount;
            queueFx("player", "debuff", m.name + "+" + amount);
            addLog(`${nm} 使你${m.name} ${amount} ${a.t === "poison" ? "层" : "回合"}。`, "bad");
        }
    } else if (a.t === "doom") {
        en.strength += 4; queueFx(en.eid, "buff", "命运 力量+4");
        addLog(`${nm} 的命运之力使力量永久 +4……`, "bad");
        if (en.def.boss) run.combat.pendingFinalQuiz = true;   // 最终测验：命运回合触发
    } else if (a.t === "summon") {
        // 暴君：召唤被奴役的仆从；战场已满则改为格挡
        const spec = en.def.summon;
        const alive = c.enemies.filter(x => x.hp > 0).length;
        if (spec && alive < spec.maxAlive) {
            const def = ENEMY_DEFS[spec.k];
            const hp = Math.max(1, Math.round(def.hp * spec.hp));
            c.eidSeq = (c.eidSeq || 100) + 1;
            c.enemies.push({
                eid: "s" + c.eidSeq, def, entry: getEntry(def.form, def.part),
                hp, maxHp: hp, dmgMul: spec.dmg,
                block: 0, strength: 0, dexterity: 0, statuses: newStatuses(),
                patternIdx: 0, nextAction: def.pattern[0]
            });
            queueFx(en.eid, "buff", "召唤");
            addLog(`${nm} 咆哮着召唤出被奴役的 <b>${def.form}</b>！`, "bad");
        } else {
            const g = computeBlockGain(en, 10); en.block += g;
            queueFx(en.eid, "block", "+" + g);
            addLog(`${nm} 无处可召，转而竖起壁垒（护甲 +${g}）。`, "info");
        }
    }
}

function winCombat() {
    const c = run.combat;
    if (!c) return;
    const isBoss = c.enemies.some(e => e.def.boss);
    const isElite = c.enemies.some(e => e.def.elite);
    // 圣物：战后恢复
    const heal = relicSum("healAfterCombat") + ((isElite || isBoss) ? relicSum("healAfterElite") : 0);
    if (heal) run.hp = Math.min(run.maxHp, run.hp + heal);
    const gold = (isBoss ? 80 : isElite ? 45 : 20 + Math.floor(Math.random() * 10) + (c.enemies.length - 1) * 8)
        + relicSum("goldOnCombat");
    run.gold += gold;
    leaveRoomBonus();
    // 首领同样给一次取卡（必出金卡），取完由 completeRoom 判定为通关
    const tier = isBoss ? "boss" : isElite ? "elite" : "normal";
    offerCardReward((isElite || isBoss) ? pickRelicReward() : null, gold, tier);
}
/* 圣物稀有度：基础 70/25/5，并带保底机制——
   连续没开出蓝/金时其概率累积上升，开出后清零 */
const RELIC_DROP_BASE = { common: 0.70, uncommon: 0.25, rare: 0.05 };
const RELIC_PITY_STEP = { uncommon: 0.08, rare: 0.04 };
function rollRelicRarity() {
    if (!run.relicPity) run.relicPity = { uncommon: 0, rare: 0 };
    const p = run.relicPity;
    let rare = RELIC_DROP_BASE.rare + RELIC_PITY_STEP.rare * p.rare;
    let uncommon = RELIC_DROP_BASE.uncommon + RELIC_PITY_STEP.uncommon * p.uncommon;
    rare = Math.min(rare, 0.5);
    uncommon = Math.min(uncommon, 0.75 - rare);
    const r = Math.random();
    if (r < rare) { p.rare = 0; p.uncommon = 0; return "rare"; }
    if (r < rare + uncommon) { p.uncommon = 0; p.rare++; return "uncommon"; }
    p.uncommon++; p.rare++;
    return "common";
}
function pickRelicReward() {
    const owned = new Set(run.relics.map(r => r.form));
    const pool = RELIC_DEFS.filter(r => !owned.has(r.form));
    if (!pool.length) return null;
    const want = rollRelicRarity();
    // 目标稀有度已拿完时，向下再向上回退
    const order = want === "rare" ? ["rare", "uncommon", "common"]
                : want === "uncommon" ? ["uncommon", "common", "rare"]
                : ["common", "uncommon", "rare"];
    for (const r of order) {
        const cand = pool.filter(x => x.rarity === r);
        if (cand.length) return pick(cand);
    }
    return pick(pool);
}

// ============================================================
// 奖励：按稀有度权重取 3 张 → 选一张 → 随机初次学习
// ============================================================
// 掉落稀有度：小怪 70/25/5，精英 20/60/20，首领必出金卡
const DROP_TABLE = {
    normal: { common: 0.70, uncommon: 0.25, rare: 0.05 },
    elite:  { common: 0.20, uncommon: 0.60, rare: 0.20 },
    boss:   { common: 0.00, uncommon: 0.00, rare: 1.00 }
};
function rollRarity(tier) {
    const t = DROP_TABLE[tier] || DROP_TABLE.normal;
    const r = Math.random();
    if (r < t.rare) return "rare";
    if (r < t.rare + t.uncommon) return "uncommon";
    return "common";
}
function rewardPicks(n, tier) {
    const pool = CARD_DEFS.filter(c => !STARTER_FORMS.includes(c.form));
    const picks = [];
    let guard = 0;
    while (picks.length < n && guard++ < 300) {
        const rar = rollRarity(tier);
        const cand = pool.filter(c => c.rarity === rar && !picks.includes(c));
        if (!cand.length) {
            // 该稀有度已抽完，退而取任意未选过的卡
            const rest = pool.filter(c => !picks.includes(c));
            if (!rest.length) break;
            picks.push(pick(rest));
            continue;
        }
        picks.push(pick(cand));
    }
    return picks;
}
function offerCardReward(relicReward, goldEarned, tier) {
    run.combat = null;
    const picks = rewardPicks(3, tier || "normal");
    const cardsHtml = picks.map((def, i) => {
        const e = eff(previewCard(def, 0));
        const rar = RARITY_META[def.rarity];
        return `<div class="card k-${def.kind} ${rar.cls} ${def.exhaust ? "card-exhaust" : ""}" style="width:172px;--i:${i}"
             onclick="chooseReward(${i})" oncontextmenu="event.preventDefault();openCardDetail('${def.form}','0');return false;"
             data-tip="左键选取 · 右键查看强化预览">
            <div class="card-cost">${e.cost}</div>
            <div class="card-rarity" data-tip="${rar.label}卡">${rar.gem}</div>
            <div class="card-word">${def.form}</div>
            <div class="card-part">${isEverMastered(def.form, def.part) ? `${def.part} · ${def.name}` : `${def.part} · ${kindLabel(def.kind)}`}</div>
            <div class="card-effect">${effectPartsFromEff(e).join("；")}</div>
            ${def.exhaust ? `<div class="card-exhaust-hint">🔥 消耗</div>` : ""}
            <div class="card-meaning">${isEverMastered(def.form, def.part) ? shortDef(getEntry(def.form, def.part)) : "？？？（词义未掌握）"}</div>
        </div>`;
    }).join("");
    app.innerHTML = `
        ${topBarHtml()}
        <h2 style="margin-top:0;">${tier === "boss" ? "击败首领！" : "战斗胜利！"}获得 ${goldEarned} 金币</h2>
        ${tier === "boss" ? `<p style="color:#c9a227;font-weight:700;">首领必定掉落<b>稀有</b>卡牌。</p>` : ""}
        ${relicReward ? `<p>精英战利品：圣物 <b>${relicReward.form}</b>（${relicReward.name}）。</p>` : ""}
        <p style="color:#7f8c8d;">选择一张卡牌加入牌组。选定后会随机抽取牌组中的一张牌进行<b>初次学习（词义）</b>，答对即得<b>弱强化</b>。</p>
        <div class="hand dealing">${cardsHtml}</div>
        <div class="btn-row"><button class="secondary-btn" onclick="skipReward()">跳过取卡</button></div>`;
    run.pendingReward = { picks, relicReward };
}
function chooseReward(i) {
    const { picks, relicReward } = run.pendingReward;
    if (relicReward) gainRelic(relicReward);
    run.deck.push(makeCardInstance(picks[i]));
    run.pendingReward = null;
    runInitialLearning(() => completeRoom());
}
function skipReward() {
    const { relicReward } = run.pendingReward || {};
    if (relicReward) gainRelic(relicReward);
    run.pendingReward = null;
    runInitialLearning(() => completeRoom());
}
function runInitialLearning(done) {
    if (!run.deck.length) { done(); return; }
    // 优先抽还没学过的牌，其次是还没弱强化的，避免反复考同一张
    const unlearned = run.deck.filter(c => !isEverMastered(c.form, c.part));
    const unUpgraded = run.deck.filter(c => c.tier === 0);
    const poolA = unlearned.length ? unlearned : (unUpgraded.length ? unUpgraded : run.deck);
    // 同时避开上一次刚考过的词（按词形而非卡牌实例，牌组里同词多张也不重复）
    const poolB = poolA.filter(c => c.form !== run.lastLearnForm);
    const card = pick(poolB.length ? poolB : poolA);
    run.lastLearnForm = card.form;
    window.__initLearn = { card, done };
    showModal(`<h3>初次学习</h3>
        <p class="modal-hint">命运从你的牌组中抽出了一张牌，考察它的词义：</p>
        <div class="btn-row"><button class="primary-btn" onclick="closeModal();__startInitialQuiz()">开始考察</button></div>`);
}
function __startInitialQuiz() {
    const { card, done } = window.__initLearn;
    quizTranslation(card.form, card.part, (correct) => {
        // 圣物「长音标记」：答错也保底给弱强化
        const rescued = !correct && hasRelic("learnSafety");
        if (correct || rescued) {
            if (card.tier < 1) card.tier = 1;
            setWordStars(card.form, card.part, 1);
            playUpgradeFx(card, 1);
        }
        window.__afterInit = done;
        const msg = correct ? `答对了！<b>${card.form}</b> 获得<b>弱强化</b>。`
            : rescued ? `答错了，但圣物「长音标记」挽回了这次学习——<b>${card.form}</b> 仍获得<b>弱强化</b>。`
            : `答错了，<b>${card.form}</b> 未获得强化，可在篝火复习时重新学习。`;
        showModal(`<h3>初次学习结果</h3><p>${msg}</p>
            <div class="btn-row"><button class="primary-btn" onclick="closeModal();window.__afterInit()">继续</button></div>`);
    });
}

// ============================================================
// 篝火
// ============================================================
function renderRest() {
    app.innerHTML = `
        ${topBarHtml()}
        <h2 style="margin-top:0;">🏕 篝火 · Echadnor</h2>
        <p style="color:#7f8c8d;">在火光旁二选一：安心歇息，或复习已弱强化的卡牌以获得强强化。</p>
        <div class="choice-medallions">
            <button class="medallion r-rest" onclick="restHeal()">
                <span class="medallion-icon">🛌</span><span class="medallion-name">歇息</span>
                <span class="medallion-desc">恢复 ${30 + relicSum("restBonus")}% 最大生命（${restHealAmount()} 点）。</span>
            </button>
            <div class="medallion-or">或</div>
            <button class="medallion r-event" onclick="startReview()">
                <span class="medallion-icon">📚</span><span class="medallion-name">复习</span>
                <span class="medallion-desc">自选两张已弱强化的牌，考音变/时态，答对升为强强化。</span>
            </button>
        </div>`;
}
function restHeal() {
    run.hp = Math.min(run.maxHp, run.hp + restHealAmount());
    leaveRoomBonus();
    completeRoom();
}
function startReview() {
    const eligible = run.deck.filter(c => c.tier === 1);
    if (eligible.length === 0) {
        const picks = shuffle(run.deck.slice()).slice(0, Math.min(2, run.deck.length));
        window.__reviewPicks = picks;
        showModal(`<h3>暂无可复习的卡牌</h3>
            <p class="modal-hint">你还没有处于「弱强化」状态的卡牌。将改为随机抽取 ${picks.length} 张牌进行<b>初次学习（词义）</b>。</p>
            <div class="btn-row"><button class="primary-btn" onclick="closeModal();__reviewFallback()">开始</button></div>`);
        return;
    }
    run.reviewSel = [];
    renderReviewSelect(eligible);
}
function __reviewFallback() {
    runQuizSequence(window.__reviewPicks || [], "translation",
        (card, ok) => { if (ok) { if (card.tier < 1) card.tier = 1; setWordStars(card.form, card.part, 1); playUpgradeFx(card, 1); } },
        () => { leaveRoomBonus(); completeRoom(); });
}
function renderReviewSelect(eligible) {
    const cards = eligible.map((c, i) => {
        const e = eff(c);
        const rar = RARITY_META[c.rarity];
        return `<div class="card k-${c.kind} ${rar.cls} tier-${c.tier} ${run.reviewSel.includes(c.uid) ? "review-selected" : ""}"
             style="width:150px;--i:${i}" onclick="toggleReview('${c.uid}')">
            <div class="card-cost">${e.cost}</div>${tierBadge(c.tier)}
            <div class="card-rarity">${rar.gem}</div>
            <div class="card-word">${c.form}</div>
            <div class="card-part">${c.part} · ${meaningRevealed(c) ? c.name : kindLabel(c.kind)}</div>
            <div class="card-effect">${effectPartsFromEff(e).join("；")}</div>
        </div>`;
    }).join("");
    app.innerHTML = `
        ${topBarHtml()}
        <h2 style="margin-top:0;">📚 复习 · 自选两张</h2>
        <p style="color:#7f8c8d;">名词考复数/音变，动词考时态，形容词考比较级。已选 ${run.reviewSel.length}/${reviewLimit()}。</p>
        <div class="hand">${cards}</div>
        <div class="btn-row">
            <button class="primary-btn" ${run.reviewSel.length ? "" : "disabled"} onclick="confirmReview()">开始复习（${run.reviewSel.length}）</button>
            <button class="secondary-btn" onclick="restHeal()">放弃复习并歇息</button>
        </div>`;
}
function reviewLimit() { return 2 + relicSum("reviewThree"); }
function toggleReview(uid) {
    const i = run.reviewSel.indexOf(uid);
    if (i >= 0) run.reviewSel.splice(i, 1);
    else if (run.reviewSel.length < reviewLimit()) run.reviewSel.push(uid);
    renderReviewSelect(run.deck.filter(c => c.tier === 1));
}
function confirmReview() {
    const cards = run.reviewSel.map(uid => run.deck.find(c => c.uid === uid)).filter(Boolean);
    runQuizSequence(cards, "mutation", (card, ok) => { if (ok) { card.tier = 2; setWordStars(card.form, card.part, 2); playUpgradeFx(card, 2); } },
        () => { leaveRoomBonus(); completeRoom(); });
}
function runQuizSequence(cards, mode, onEach, done) {
    let i = 0;
    (function next() {
        if (i >= cards.length) { done(); return; }
        const card = cards[i++];
        const cb = (ok) => { onEach(card, ok); next(); };
        if (mode === "mutation") quizMutationOrFallback(card.form, card.part, cb);
        else quizTranslation(card.form, card.part, cb);
    })();
}

// ============================================================
// 商店 / 奇遇 / 宝藏
// ============================================================
function renderShop() {
    const owned = new Set(run.relics.map(r => r.form));
    run.shopRemoveUsed = false; // 每家商店的移除服务重新开放一次
    run.shopStock = shuffle(RELIC_DEFS.filter(r => !owned.has(r.form)).slice()).slice(0, 3)
        .map(r => ({ relic: r, price: rollRelicPrice(r.rarity), discounted: false }));
    renderShopView();
}
// 圣物标价：白均价 ~53，蓝 ~79（×1.5），金 ~106（×2）
const RELIC_PRICE_RANGE = { common: [45, 60], uncommon: [68, 90], rare: [92, 120] };
function rollRelicPrice(rarity) {
    const [lo, hi] = RELIC_PRICE_RANGE[rarity] || RELIC_PRICE_RANGE.common;
    return lo + Math.floor(Math.random() * (hi - lo + 1));
}
const REMOVE_PRICE = 40;
function relicPrice(base) { return hasRelic("shopDiscount") ? Math.round(base * 0.8) : base; }
function shopRemovePrice() { return relicPrice(REMOVE_PRICE); }
function restHealAmount() { return Math.round(run.maxHp * (0.3 + relicSum("restBonus") / 100)); }
function renderShopView() {
    const items = run.shopStock.map((item, i) => `
        <div class="shop-item">
            <div class="shop-ic">${item.relic.icon}</div>
            <div class="shop-name">${item.relic.form} · ${item.relic.name}
                <span class="rar-dot rar-${item.relic.rarity}" data-tip="${RARITY_META[item.relic.rarity].label}圣物"></span></div>
            <div class="shop-desc">${item.relic.desc}</div>
            <p class="shop-price">🪙 ${relicPrice(item.price)}${item.discounted || hasRelic("shopDiscount") ? "（已折扣）" : ""}</p>
            <div class="btn-row">
                ${!item.discounted ? `<button class="secondary-btn" onclick="shopQuizDiscount(${i})">答题享 8 折</button>` : ""}
                <button class="primary-btn" onclick="buyRelic(${i})">购买</button>
            </div>
        </div>`).join("") || "<p style='color:#7f8c8d;'>圣物已售罄。</p>";
    app.innerHTML = `
        ${topBarHtml()}
        <h2 style="margin-top:0;">🛒 矮人商店 · cadhad</h2>
        <p style="color:#7f8c8d;">一位 cadhad（矮人）商人贩售圣物，也提供牌组精简。</p>
        <div class="shop-grid">${items}</div>
        <div class="panel" style="box-shadow:none;border:1px dashed #dfe4ea;margin-top:16px;">
            <h3 style="margin-top:0;">移除一张卡牌 · 🪙${REMOVE_PRICE}</h3>
            <p style="color:#7f8c8d;font-size:13px;">
                ${run.shopRemoveUsed ? "本次已使用过移除服务，每家商店限一次。" : "精简牌组，让核心卡更易抽到。每家商店限购一次。"}
            </p>
            <button class="secondary-btn" ${run.deck.length && !run.shopRemoveUsed ? "" : "disabled"} onclick="openRemoveCard()">
                ${run.shopRemoveUsed ? "已售罄" : "选择要移除的卡牌"}
            </button>
        </div>
        <div class="btn-row"><button class="primary-btn" onclick="leaveShop()">离开商店</button></div>`;
}
function shopQuizDiscount(i) {
    const t = randomSideTerm();
    quizTranslation(t.form, t.part, (ok) => {
        if (ok) { run.shopStock[i].price = Math.round(run.shopStock[i].price * 0.8); run.shopStock[i].discounted = true; }
        renderShopView();
    });
}
function buyRelic(i) {
    const item = run.shopStock[i];
    const price = relicPrice(item.price);
    if (run.gold < price) { alert("金币不足！"); return; }
    run.gold -= price; gainRelic(item.relic); run.shopStock.splice(i, 1);
    renderShopView();
}
function openRemoveCard() {
    if (run.shopRemoveUsed) return;
    const cards = run.deck.map((c, i) => {
        const e = eff(c), rar = RARITY_META[c.rarity];
        return `<div class="card k-${c.kind} ${rar.cls} tier-${c.tier}" style="width:150px;--i:${i}" onclick="removeCard(${i})">
            <div class="card-cost">${e.cost}</div>${tierBadge(c.tier)}
            <div class="card-rarity">${rar.gem}</div>
            <div class="card-word">${c.form}</div>
            <div class="card-part">${c.part} · ${meaningRevealed(c) ? c.name : kindLabel(c.kind)}</div>
        </div>`;
    }).join("");
    showModal(`<h3>选择要移除的卡牌</h3><div class="hand">${cards}</div>
        <div class="btn-row"><button class="secondary-btn" onclick="closeModal()">取消</button></div>`);
}
function removeCard(i) {
    if (run.shopRemoveUsed) { closeModal(); return; }
    const price = shopRemovePrice();
    if (run.gold < price) { alert("金币不足！"); closeModal(); return; }
    run.gold -= price;
    run.deck.splice(i, 1);
    run.shopRemoveUsed = true; // 每家商店限一次
    closeModal();
    renderShopView();
}
function leaveShop() { leaveRoomBonus(); completeRoom(); }

/* ============================================================
   奇遇事件（参考《杀戮尖塔》的事件结构：以生命/金币换取卡牌、强化、圣物，
   并保留欺骗性与代价型选项）
   每个事件：{ id, title, icon, text, options: [{ label, hint, run() }] }
   option.run() 返回结算文案；返回 false 表示自行接管后续流程（如测验）
   ============================================================ */
const EVENT_DEFS = [
    {
        id: "bard", icon: "🎻", title: "游吟诗人 · Pethron",
        text: "一位游吟诗人拦住去路，说要考考你的辛达语。答得上来便有赏。",
        options: [
            { label: "接受考验", hint: "答对 +25 金币；答错 -5 生命", run: () => { evQuizGamble(); return false; } },
            { label: "礼貌离开", hint: "无事发生", run: () => "你颔首致意，绕行而去。" }
        ]
    },
    {
        id: "stone", icon: "🗡", title: "石中之剑 · Megil mi 'ond",
        text: "一柄刻着卢恩铭文的剑深插在岩石中。拔出它似乎要付出代价。",
        options: [
            { label: "拔出剑（-8 生命）", hint: "获得一张稀有卡", disabled: () => run.hp <= 8,
              run: () => { run.hp -= 8; const c = grantCard("rare"); return `岩石割破了你的手掌（-8 生命），但你得到了 <b>${c}</b>。`; } },
            { label: "在剑前祈祷", hint: "获得一件圣物", run: () => {
                const r = pickRelicReward();
                if (!r) return "你静默祈祷，但已无圣物可赐予。";
                gainRelic(r); return `你屈膝祈祷，获得圣物 <b>${r.form}</b>（${r.name}）。`; } },
            { label: "转身离开", hint: "无事发生", run: () => "你没有碰那柄剑。" }
        ]
    },
    {
        id: "tea", icon: "🍵", title: "学者茶会 · Athrabeth",
        text: "几位学者围坐论道，邀你共饮。那杯茶闻起来又苦又烈。",
        options: [
            { label: "饮下苦茶（-10 生命）", hint: "从牌组中移除一张卡", disabled: () => run.hp <= 10 || !run.deck.length,
              run: () => { run.hp -= 10; evRemoveCard(); return false; } },
            { label: "只是旁听", hint: "随机一张牌获得弱强化", run: () => {
                const c = evUpgradeRandom(1);
                return c ? `你在旁听中有所领悟，<b>${c}</b> 获得弱强化。` : "你听了一会儿，并无收获。"; } },
            { label: "告辞", hint: "无事发生", run: () => "你婉拒了邀请。" }
        ]
    },
    {
        id: "wisp", icon: "🔮", title: "迷光 · Gwath",
        text: "一团幽蓝的光在林间飘荡，似乎想引你去往某处。",
        options: [
            { label: "跟随光芒", hint: "两张随机牌获得弱强化", run: () => {
                const a = evUpgradeRandom(2);
                return a ? `迷光散作字符没入你的牌组：<b>${a}</b> 获得弱强化。` : "光芒消散了。"; } },
            { label: "伸手捕捉（-6 生命）", hint: "获得一件圣物", disabled: () => run.hp <= 6,
              run: () => { run.hp -= 6; const r = pickRelicReward();
                if (!r) return "光灼伤了你的手（-6 生命），却什么也没留下。";
                gainRelic(r); return `光灼伤了你的手（-6 生命），凝成圣物 <b>${r.form}</b>（${r.name}）。`; } },
            { label: "不予理会", hint: "无事发生", run: () => "你目送它飘远。" }
        ]
    },
    {
        id: "shrine", icon: "⛲", title: "碑前泉水 · Eithel",
        text: "一眼清泉自古碑下涌出，碑文写着「饮者得息，贪者失之」。",
        options: [
            { label: "掬水而饮", hint: "回复 25% 最大生命", run: () => {
                const h = Math.round(run.maxHp * 0.25); run.hp = Math.min(run.maxHp, run.hp + h);
                return `泉水清冽，你恢复了 ${h} 点生命。`; } },
            { label: "汲满水囊（-30 金币）", hint: "最大生命 +8", disabled: () => run.gold < 30,
              run: () => { run.gold -= 30; run.maxHp += 8; run.hp += 8;
                return "你用金币换来一囊清泉，最大生命 +8。"; } },
            { label: "离开", hint: "无事发生", run: () => "你没有饮水。" }
        ]
    },
    {
        id: "peddler", icon: "🧺", title: "路边小贩 · Bachor",
        text: "一个兜帽小贩神秘兮兮地摊开布包，说这是「远古的护符」。",
        options: [
            { label: "买下护符（-70 金币）", hint: "……看起来很可疑", disabled: () => run.gold < 70,
              run: () => {
                run.gold -= 70;
                if (Math.random() < 0.4) { const r = pickRelicReward();
                    if (r) { gainRelic(r); return `居然是真的！获得圣物 <b>${r.form}</b>（${r.name}）。`; } }
                return "你付了钱，转身时小贩已不见踪影——那不过是块普通石头。"; } },
            { label: "讨价还价（-25 金币）", hint: "换一张罕见卡", disabled: () => run.gold < 25,
              run: () => { run.gold -= 25; const c = grantCard("uncommon");
                return `你砍了价，换来一张 <b>${c}</b>。`; } },
            { label: "识破并离开", hint: "无事发生", run: () => "你冷冷看了他一眼，走开了。" }
        ]
    },
    {
        id: "altar", icon: "🕯", title: "献祭石台 · Sarn Aer",
        text: "石台上残留着焦痕。似乎可以献出些什么，换取力量。",
        options: [
            { label: "献出一张牌", hint: "移除一张牌并获得 60 金币", disabled: () => run.deck.length <= 4,
              run: () => { evRemoveCard(60); return false; } },
            { label: "献出鲜血（-12 生命）", hint: "随机一张牌获得强强化", disabled: () => run.hp <= 12,
              run: () => { run.hp -= 12; const c = evUpgradeRandom(1, 2);
                return c ? `石台吸走了你的血（-12 生命），<b>${c}</b> 被强强化。` : "石台毫无反应。"; } },
            { label: "不献祭", hint: "无事发生", run: () => "你退开了。" }
        ]
    },
    {
        id: "library", icon: "📜", title: "废弃书库 · Partham",
        text: "书架倾颓，残卷散落一地。翻找也许有所得，但灰尘呛人。",
        options: [
            { label: "仔细翻找（-5 生命）", hint: "获得两张随机罕见卡", disabled: () => run.hp <= 5,
              run: () => { run.hp -= 5; const a = grantCard("uncommon"), b = grantCard("uncommon");
                return `你在尘土中翻出了 <b>${a}</b> 与 <b>${b}</b>（-5 生命）。`; } },
            { label: "抄写一段", hint: "答对测验则两张牌获得弱强化", run: () => { evStudyGamble(); return false; } },
            { label: "关门离开", hint: "无事发生", run: () => "你合上门，尘埃落定。" }
        ]
    },
    {
        id: "bloodaltar", icon: "🩸", title: "殷红的祭坛 · Iagad garan",
        text: "石台上的凹槽泛着暗红。低语在你耳边响起：「献出一张牌，便予你生机。」你无法预知它会给你什么。",
        lowHpOnly: true,
        options: [
            { label: "献祭一张卡牌", hint: "结果未知……", disabled: () => !run.deck.length,
              run: () => { evSacrificeCard(); return false; } },
            { label: "退开", hint: "无事发生", run: () => "你压下了心中的低语，退了出去。" }
        ]
    }
];

// —— 事件辅助 ——
function grantCard(rarity) {
    const pool = CARD_DEFS.filter(c => !STARTER_FORMS.includes(c.form) && c.rarity === rarity);
    const def = pick(pool.length ? pool : CARD_DEFS.filter(c => !STARTER_FORMS.includes(c.form)));
    run.deck.push(makeCardInstance(def));
    return def.form;
}
// 随机升级 n 张牌；toTier 指定目标等级（默认升 1 级）
function evUpgradeRandom(n, toTier) {
    const cand = run.deck.filter(c => c.tier < (toTier || 2));
    if (!cand.length) return null;
    const picked = shuffle(cand.slice()).slice(0, n);
    picked.forEach(c => { c.tier = toTier ? toTier : Math.min(2, c.tier + 1); });
    return picked.map(c => c.form).join("、");
}
function evRemoveCard(goldReward) {
    const cards = run.deck.map((c, i) => {
        const e = eff(c), rar = RARITY_META[c.rarity];
        return `<div class="card k-${c.kind} ${rar.cls} tier-${c.tier}" style="width:140px;--i:${i}" onclick="evDoRemove(${i},${goldReward || 0})">
            <div class="card-cost">${e.cost}</div>${tierBadge(c.tier)}
            <div class="card-rarity">${rar.gem}</div>
            <div class="card-word">${c.form}</div>
            <div class="card-part">${c.part} · ${meaningRevealed(c) ? c.name : kindLabel(c.kind)}</div>
        </div>`;
    }).join("");
    showModal(`<h3>选择要移除的卡牌</h3><div class="hand">${cards}</div>`);
}
function evDoRemove(i, goldReward) {
    const form = run.deck[i] ? run.deck[i].form : "";
    run.deck.splice(i, 1);
    if (goldReward) run.gold += goldReward;
    closeModal();
    eventResult(`<b>${form}</b> 已从牌组中移除${goldReward ? `，并获得 ${goldReward} 金币` : ""}。`);
}
/* 献祭：玩家事先不知道回报——按稀有度回复 5 / 15 / 一半最大生命 */
function evSacrificeCard() {
    const cards = run.deck.map((c, i) => {
        const e = eff(c), rar = RARITY_META[c.rarity];
        return `<div class="card k-${c.kind} ${rar.cls} tier-${c.tier}" style="width:140px;--i:${i}" onclick="evDoSacrifice(${i})">
            <div class="card-cost">${e.cost}</div>${tierBadge(c.tier)}
            <div class="card-rarity">${rar.gem}</div>
            <div class="card-word">${c.form}</div>
            <div class="card-part">${c.part} · ${meaningRevealed(c) ? c.name : kindLabel(c.kind)}</div>
        </div>`;
    }).join("");
    showModal(`<h3>选择要献祭的卡牌</h3>
        <p class="modal-hint">祭坛沉默着，没有透露任何交换的条件。</p>
        <div class="hand">${cards}</div>`);
}
function evDoSacrifice(i) {
    const card = run.deck[i];
    if (!card) return;
    run.deck.splice(i, 1);
    const healMap = { common: 5, uncommon: 15, rare: Math.round(run.maxHp / 2) };
    const heal = healMap[card.rarity] || 5;
    run.hp = Math.min(run.maxHp, run.hp + heal);
    closeModal();
    eventResult(`祭坛吞没了 <b>${card.form}</b>（${RARITY_META[card.rarity].label}），一股暖流涌入——恢复 ${heal} 点生命。`);
}

function evQuizGamble() {
    const t = randomSideTerm();
    quizTranslation(t.form, t.part, (okAns) => {
        if (okAns) { run.gold += 25; eventResult("回答正确！获得 25 金币。"); }
        else { run.hp = Math.max(1, run.hp - 5); eventResult("回答错误，损失 5 点生命。"); }
    });
}
function evStudyGamble() {
    const t = randomSideTerm();
    quizTranslation(t.form, t.part, (okAns) => {
        if (okAns) {
            const c = evUpgradeRandom(2);
            eventResult(c ? `抄写有成，<b>${c}</b> 获得弱强化。` : "抄写有成，但牌组已无可强化的牌。");
        } else eventResult("字迹潦草难辨，你一无所获。");
    });
}
function eventResult(text) {
    leaveRoomBonus();
    showModal(`<h3>奇遇结果</h3><p>${text}</p>
        <div class="btn-row"><button class="primary-btn" onclick="closeModal();completeRoom();">继续</button></div>`);
}

// 血量低于 35% 时，献祭事件加入候选并有一半概率优先出现
function renderEvent() {
    const lowHp = run.hp <= Math.round(run.maxHp * 0.35);
    const normalPool = EVENT_DEFS.filter(e => !e.lowHpOnly);
    const ev = (lowHp && Math.random() < 0.5) ? EVENT_DEFS.find(e => e.id === "bloodaltar") : pick(normalPool);
    run.currentEvent = ev;
    const opts = ev.options.map((o, i) => {
        const dis = o.disabled && o.disabled();
        return `<button class="event-option ${dis ? "disabled" : ""}" ${dis ? "disabled" : `onclick="chooseEventOption(${i})"`}>
            <span class="ev-label">${o.label}</span>
            <span class="ev-hint">${o.hint}</span>
        </button>`;
    }).join("");
    app.innerHTML = `
        ${topBarHtml()}
        <h2 style="margin-top:0;">${ev.icon} 奇遇 · Berthas</h2>
        <div class="event-card">
            <h3 class="event-title">${ev.title}</h3>
            <p class="event-text">${ev.text}</p>
            <div class="event-options">${opts}</div>
        </div>`;
}
function chooseEventOption(i) {
    const ev = run.currentEvent;
    if (!ev) return;
    const res = ev.options[i].run();
    if (res === false) return; // 该选项自行接管后续（测验 / 选牌）
    eventResult(res);
}
function renderTreasure() {
    const t = randomSideTerm();
    app.innerHTML = `
        ${topBarHtml()}
        <h2 style="margin-top:0;">💎 宝藏 · Mîr</h2>
        <p style="color:#7f8c8d;">箱上刻着一个辛达语谜题，答对可开启完整宝藏。</p>
        <div class="btn-row"><button class="primary-btn" onclick="doTreasure('${t.form}','${t.part}')">解谜开箱</button></div>`;
}
function doTreasure(form, part) {
    quizTranslation(form, part, (ok) => {
        let text;
        if (ok) {
            const relic = pickRelicReward(); run.gold += 40;
            text = relic ? (gainRelic(relic), `解谜成功！获得${RARITY_META[relic.rarity].label}圣物 <b>${relic.form}</b>（${relic.name}）与 40 金币。`) : `解谜成功！获得 40 金币。`;
        } else { run.gold += 15; text = `解谜失败，宝箱只弹出一半——获得 15 金币。`; }
        leaveRoomBonus();
        showModal(`<h3>宝藏结果</h3><p>${text}</p><div class="btn-row"><button class="primary-btn" onclick="closeModal();completeRoom();">继续</button></div>`);
    });
}

// ============================================================
// 测验
// ============================================================
function quizTranslation(form, part, callback) {
    const correctDef = shortDef(getEntry(form, part));
    const pool = ALL_TERMS.filter(t => !(t.form === form && t.part === part)).map(t => shortDef(t.entry)).filter(d => d !== correctDef);
    // 圣物「洞察」减少一个干扰项
    const distractors = shuffle(Array.from(new Set(pool))).slice(0, hasRelic("quizEasier") ? 2 : 3);
    const options = shuffle([{ text: correctDef, correct: true }, ...distractors.map(d => ({ text: d, correct: false }))]);
    showModal(`<h3>词义测验</h3>
        <p class="modal-hint">下面哪一项是它的意思？（词性：${part}）</p>
        <div class="modal-word">${form}</div>
        ${options.map((o, i) => `<button class="option-btn" onclick="answerTranslation(${i})">${escapeHtml(o.text)}</button>`).join("")}
        <div id="quiz-result"></div>`);
    window.__quizPending = { form, part, callback };
    window.__quizOptions = options;
}
function answerTranslation(i) {
    const options = window.__quizOptions;
    const resultEl = document.getElementById("quiz-result");
    if (!options || !resultEl) return; // 弹窗已关闭时的迟到点击
    const chosen = options[i];
    document.querySelectorAll(".option-btn").forEach((btn, idx) => {
        btn.onclick = null;
        if (options[idx].correct) btn.classList.add("right");
        else if (idx === i) btn.classList.add("wrong");
    });
    resultEl.innerHTML =
        `<p style="margin-top:10px;font-weight:600;color:${chosen.correct ? "#27ae60" : "#c0392b"};">${chosen.correct ? "✔ 回答正确！" : "✘ 回答错误。"}</p>
         <div class="btn-row"><button class="primary-btn" onclick="finishQuiz(${chosen.correct})">继续</button></div>`;
}
function finishQuiz(correct) {
    const { form, part, callback } = window.__quizPending;
    markMastery(form, part, correct);
    if (correct && run) run.gold += relicSum("quizGold"); // 圣物「辩谈」
    closeModal();
    callback(correct);
}
function quizMutationOrFallback(form, part, callback) {
    const entry = getEntry(form, part);
    const morph = ((entry && entry.morphology) || []).filter(m => m.form && m.form.trim());
    if (!morph.length) { quizTranslation(form, part, callback); return; }
    quizMutation(form, part, callback);
}
function quizMutation(form, part, callback) {
    const entry = getEntry(form, part);
    const morph = entry.morphology.filter(m => m.form && m.form.trim());
    const item = pick(morph);
    const label = MUTATION_LABELS[item.type] || item.type;
    const chars = ["á","é","í","ó","ú","ý","â","ê","î","ô","û","ŷ","ñ"];
    showModal(`<h3>复习测验 · 音变 / 变位</h3>
        <p class="modal-hint">请写出 <b>${form}</b>（${part}）的「${label}」形式：</p>
        <div class="modal-word">${form}</div>
        <input type="text" id="mutationInput" placeholder="在此输入答案">
        <div class="char-row">${chars.map(c => `<button type="button" class="char-btn" onclick="insertChar('${c}')">${c}</button>`).join("")}</div>
        <div class="btn-row"><button class="primary-btn" onclick="answerMutation()">提交答案</button></div>
        <div id="quiz-result"></div>`);
    window.__mutationPending = { form, part, correctForm: item.form, callback };
    setTimeout(() => { const el = document.getElementById("mutationInput"); if (el) el.focus(); }, 50);
}
function insertChar(c) {
    const el = document.getElementById("mutationInput");
    if (!el) return;
    const s = el.selectionStart || el.value.length, e = el.selectionEnd || el.value.length;
    el.value = el.value.slice(0, s) + c + el.value.slice(e);
    el.focus(); el.selectionStart = el.selectionEnd = s + 1;
}
// 词典里的形式可能写作 "brasta/brasta(o)-" 这样：斜杠分隔多个变体、括号表示可选部分、
// 结尾的连字符只是词条标记。这里把所有等价写法都展开为可接受答案。
function normalizeAnswer(x) { return String(x).trim().toLowerCase().replace(/\s+/g, ""); }
function expandMutationForms(correctForm) {
    const out = new Set();
    const add = (x) => { const v = normalizeAnswer(x); if (v) out.add(v); };
    [correctForm, ...correctForm.split("/")].forEach(alt => {
        const t = alt.trim();
        [t, t.replace(/-+$/, "")].forEach(v => {
            add(v);                             // 原样
            add(v.replace(/\(([^)]*)\)/g, "$1"));  // 括号内容保留：brasta(o) → brastao
            add(v.replace(/\([^)]*\)/g, ""));      // 括号内容省略：brasta(o) → brasta
        });
    });
    return out;
}
function answerMutation() {
    if (!window.__mutationPending) return;
    const { correctForm } = window.__mutationPending;
    const el = document.getElementById("mutationInput");
    const resultEl = document.getElementById("quiz-result");
    if (!el || !resultEl) return;
    const val = normalizeAnswer(el.value || "");
    const correct = expandMutationForms(correctForm).has(val);
    resultEl.innerHTML =
        `<p style="margin-top:10px;font-weight:600;color:${correct ? "#27ae60" : "#c0392b"};">
            ${correct ? "✔ 回答正确！" : `✘ 回答错误。正确形式：<i>${escapeHtml(correctForm)}</i>`}</p>
         <div class="btn-row"><button class="primary-btn" onclick="finishMutationQuiz(${correct})">继续</button></div>`;
    el.disabled = true;
}
function finishMutationQuiz(correct) {
    const { form, part, callback } = window.__mutationPending;
    markMastery(form, part, correct);
    if (correct && run) run.gold += relicSum("quizGold"); // 圣物「辩谈」
    closeModal();
    callback(correct);
}

// ============================================================
// 悬浮提示 / 弹窗 / 结局 / 主题
// ============================================================
let tipEl = null, tipHost = null;
function initTooltips() {
    if (tipEl) return;
    tipEl = document.createElement("div");
    tipEl.className = "hover-tip hidden";
    document.body.appendChild(tipEl);
    document.addEventListener("pointerover", (e) => {
        const t = e.target.closest && e.target.closest("[data-tip]");
        if (!t) return;
        tipHost = t;
        tipEl.textContent = t.getAttribute("data-tip");
        tipEl.classList.remove("hidden");
        moveTip(e);
    });
    document.addEventListener("pointerdown", hideTip, true);
    document.addEventListener("pointermove", moveTip);
    document.addEventListener("pointerout", (e) => {
        const t = e.target.closest && e.target.closest("[data-tip]");
        if (t) hideTip();
    });
}
function moveTip(e) {
    if (!tipEl || tipEl.classList.contains("hidden")) return;
    // 界面重绘后原宿主已从 DOM 移除，pointerout 不会触发，这里兜底隐藏
    if (tipHost && !tipHost.isConnected) { hideTip(); return; }
    const pad = 14;
    let x = e.clientX + pad, y = e.clientY + pad;
    if (x + tipEl.offsetWidth > window.innerWidth - 8) x = e.clientX - tipEl.offsetWidth - pad;
    if (y + tipEl.offsetHeight > window.innerHeight - 8) y = e.clientY - tipEl.offsetHeight - pad;
    tipEl.style.left = x + "px"; tipEl.style.top = y + "px";
}
function hideTip() { tipHost = null; if (tipEl) tipEl.classList.add("hidden"); }

function showModal(html) { overlay.innerHTML = `<div class="modal">${html}</div>`; overlay.classList.remove("hidden"); }
function closeModal() { overlay.classList.add("hidden"); overlay.innerHTML = ""; hideTip(); }

function askQuit() {
    showModal(`<h3>退出本局？</h3>
        <p class="modal-hint">本局进度不会保存（生词手册的星级与词义记录会保留）。</p>
        <div class="btn-row">
            <button class="primary-btn" onclick="confirmQuit()">确认退出</button>
            <button class="secondary-btn" onclick="closeModal()">继续游戏</button>
        </div>`);
}
function confirmQuit() {
    clearAim();
    run = null;
    closeModal();
    renderTitle();
}

function renderDefeat() {
    const depth = run.currentNodeId ? run.map.nodes[run.currentNodeId].row + 1 : 1;
    run.combat = null;
    app.innerHTML = `<div style="text-align:center;padding:30px 0;">
            <h2>你倒在了第 ${depth} 层……</h2>
            <p style="color:#7f8c8d;">I varad rêth eno. 塔仍矗立，词汇的记忆已然留下。</p>
            <div class="btn-row">
                <button class="primary-btn" onclick="startRun()">再次挑战</button>
                <button class="secondary-btn" onclick="renderTitle()">返回标题</button>
            </div></div>`;
}
function renderVictory() {
    run.combat = null;
    app.innerHTML = `<div style="text-align:center;padding:30px 0;">
            <h2>🎉 你登上了塔顶！</h2>
            <p style="color:#7f8c8d;">I amarth orthornen. 你战胜了命运本身。</p>
            <p>本次攀登积累了 ${run.gold} 金币，掌握词汇已计入生词手册。</p>
            <div class="btn-row">
                <button class="primary-btn" onclick="startRun()">再次攀登</button>
                <button class="secondary-btn" onclick="renderTitle()">返回标题</button>
            </div></div>`;
}
function toggleTheme() {
    const html = document.documentElement, btn = document.getElementById("theme-toggle");
    const next = html.getAttribute("data-theme") === "dark" ? "light" : "dark";
    html.setAttribute("data-theme", next);
    btn.textContent = next === "dark" ? "☀ 模式" : "☾ 模式";
    localStorage.setItem("theme", next);
}
(function () {
    const btn = document.getElementById("theme-toggle");
    if (btn && document.documentElement.getAttribute("data-theme") === "dark") btn.textContent = "☀ 模式";
})();
