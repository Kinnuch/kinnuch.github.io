/* ============================================================
   Barad Bith · 巴别塔
   一个用辛达语真实词典条目驱动的 roguelike 卡牌爬塔小游戏。
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
   数值分三级：基础 / 弱强化(+w) / 强强化(+w+s)。
   w、s 均为增量对象，可含 cost（通常为负，减费）。
   字段：dmg 伤害, block 护甲, heal 治疗, draw 抽牌, buffStrength 永久力量,
        energyGain 立即能量, vuln 对敌易伤(回合), weak 对敌虚弱(回合),
        startTurnBlock 每回合起始护甲(能力), drawBonus 每回合多抽(能力),
        retainBlock 护甲保留, exhaust 战斗内消耗, exileAfterUse 永久消耗品
   ------------------------------------------------------------ */
const CARD_DEFS = [
    // —— 起始牌 ——
    { form: "cam", part: "noun", kind: "attack", cost: 1, dmg: 6, name: "徒手一击", isStarter: true,
      flavorTpl: "以{w}挥出一击", w: { dmg: 2 }, s: { dmg: 3 } },
    { form: "coll", part: "noun", kind: "skill", cost: 1, block: 5, name: "裹身守御", isStarter: true,
      flavorTpl: "裹紧{w}格挡来袭", w: { block: 3 }, s: { block: 3 } },

    // —— 普通攻击 ——
    { form: "crist", part: "noun", kind: "attack", cost: 2, dmg: 10, name: "巨斧重砍",
      flavorTpl: "抡起{w}重劈", w: { dmg: 3 }, s: { dmg: 4 } },
    { form: "cû", part: "noun", kind: "attack", cost: 1, dmg: 5, draw: 1, name: "疾矢",
      flavorTpl: "以{w}速射并再取一牌", w: { dmg: 2 }, s: { draw: 1 } },
    { form: "brasta-", part: "verb", kind: "attack", cost: 2, dmg: 8, vuln: 2, name: "威压",
      flavorTpl: "如{w}般逼近，令敌易伤", w: { dmg: 2 }, s: { vuln: 1 } },
    { form: "agar", part: "noun", kind: "attack", cost: 1, dmg: 6, heal: 2, name: "饮血",
      flavorTpl: "以{w}为祭，伤敌并回血", w: { dmg: 2 }, s: { heal: 2 } },

    // —— 防御 / 护甲 ——
    { form: "castol", part: "noun", kind: "skill", cost: 1, block: 8, name: "盔甲",
      flavorTpl: "戴上{w}", w: { block: 3 }, s: { block: 3 } },
    { form: "ang", part: "noun", kind: "skill", cost: 2, block: 11, name: "钢铁之壁",
      flavorTpl: "以{w}铸壁", w: { block: 4 }, s: { block: 4 } },
    { form: "ephel", part: "noun", kind: "skill", cost: 2, block: 12, name: "环围壁垒",
      flavorTpl: "筑起{w}环墙", w: { block: 3 }, s: { block: 4 } },
    { form: "celeb", part: "noun", kind: "skill", cost: 1, block: 7, name: "白银之甲",
      flavorTpl: "以{w}护体", w: { block: 3 }, s: { cost: -1 } },
    { form: "annon", part: "noun", kind: "skill", cost: 1, block: 6, retainBlock: true, name: "闭门留甲",
      flavorTpl: "关闭{w}，护甲不散", w: { block: 3 }, s: { block: 3 } },
    { form: "fennas", part: "noun", kind: "skill", cost: 0, block: 3, name: "虚掩",
      flavorTpl: "虚掩{w}", w: { block: 2 }, s: { block: 2 } },

    // —— 增益 / 抽牌 / 能量 ——
    { form: "craban", part: "noun", kind: "skill", cost: 1, draw: 2, name: "渡鸦侦察",
      flavorTpl: "放出{w}探路", w: { cost: -1 }, s: { draw: 1 } },
    { form: "calar", part: "noun", kind: "skill", cost: 1, energyGain: 2, exhaust: true, name: "掌灯疾行",
      flavorTpl: "举起{w}，本回合能量激增（消耗）", w: { cost: -1 }, s: { draw: 1 } },
    { form: "êl", part: "noun", kind: "skill", cost: 1, block: 5, weak: 2, name: "星辉削锐",
      flavorTpl: "{w}微光令敌虚弱", w: { block: 2 }, s: { weak: 1 } },

    // —— 治疗 ——
    { form: "athelas", part: "noun", kind: "skill", cost: 1, heal: 7, name: "王叶疗愈",
      flavorTpl: "嚼服{w}", w: { heal: 3 }, s: { heal: 3 } },
    { form: "athae", part: "noun", kind: "skill", cost: 2, heal: 12, name: "灵草煎剂",
      flavorTpl: "煎煮{w}", w: { heal: 4 }, s: { heal: 4 } },
    { form: "elanor", part: "noun", kind: "skill", cost: 1, heal: 5, name: "金花之息",
      flavorTpl: "{w}绽放芬芳", w: { heal: 2 }, s: { cost: -1 } },
    { form: "estel", part: "noun", kind: "skill", cost: 1, block: 4, heal: 4, name: "希望",
      flavorTpl: "心怀{w}，御守并回血", w: { block: 2 }, s: { heal: 3 } },
    { form: "amdir", part: "noun", kind: "skill", cost: 1, heal: 5, draw: 1, name: "远见",
      flavorTpl: "凭{w}回血并再取一牌", w: { heal: 2 }, s: { draw: 1 } },
    { form: "(m)bas(t)", part: "noun", kind: "skill", cost: 1, heal: 6, exileAfterUse: true, name: "干粮",
      flavorTpl: "吃下{w}回血（用后永久消失）", w: { heal: 3 }, s: { heal: 3 } },

    // —— 能力（常驻，出牌后置于人物身下） ——
    { form: "(n)dagor", part: "noun", kind: "power", cost: 1, buffStrength: 2, name: "战意",
      flavorTpl: "投入{w}的意志，永久增力", w: { buffStrength: 1 }, s: { cost: -1 } },
    { form: "barad", part: "noun", kind: "power", cost: 2, startTurnBlock: 3, name: "高塔永固",
      flavorTpl: "化身{w}，每回合起始得护甲", w: { startTurnBlock: 2 }, s: { cost: -1 } },
    { form: "curu", part: "noun", kind: "power", cost: 2, drawBonus: 1, name: "巧智",
      flavorTpl: "习得{w}，每回合多抽牌", w: { cost: -1 }, s: { drawBonus: 1 } },

    // —— 强力消耗牌（本场战斗仅一次） ——
    { form: "(n)dag-", part: "verb", kind: "attack", cost: 2, dmg: 14, exhaust: true, name: "斩杀",
      flavorTpl: "以{w}的决意终结敌人（消耗）", w: { dmg: 3 }, s: { dmg: 4 } },
    { form: "bregollach", part: "noun", kind: "attack", cost: 1, dmg: 8, vuln: 2, exhaust: true, name: "骤火",
      flavorTpl: "唤出{w}爆燃，伤敌并易伤（消耗）", w: { dmg: 3 }, s: { vuln: 1 } },
    { form: "(m)belaith", part: "adjective", kind: "power", cost: 2, buffStrength: 3, exhaust: true, name: "威能爆发",
      flavorTpl: "化为{w}之姿，力量骤增（消耗）", w: { buffStrength: 1 }, s: { buffStrength: 2 } }
];

const STARTER_FORMS = ["cam", "coll"]; // 起始牌不进入奖励池

// ---------- 敌人定义（art=图形原型, color=主色） ----------
const ENEMY_DEFS = {
    draug:    { form: "draug", part: "noun", art: "wolf", color: "#7a6a58", hp: 44,
                pattern: [{ t: "attack", v: 10 }, { t: "attack", v: 7 }] },
    auth:     { form: "auth", part: "noun", art: "wraith", color: "#7f8fb0", hp: 40,
                pattern: [{ t: "attack", v: 7 }, { t: "defend", v: 6 }, { t: "attack", v: 11 }] },
    esgal:    { form: "esgal", part: "noun", art: "wraith", color: "#5a6b7a", hp: 46,
                pattern: [{ t: "defend", v: 8 }, { t: "attack", v: 13 }] },
    duath:    { form: "dúath", part: "noun", art: "wraith", color: "#5a4a72", hp: 58,
                pattern: [{ t: "attack", v: 10 }, { t: "attack", v: 10 }, { t: "buff", v: 3 }] },
    fern:     { form: "fern", part: "adjective", art: "undead", color: "#9aa39a", hp: 56,
                pattern: [{ t: "attack", v: 11 }, { t: "heal", v: 10 }, { t: "attack", v: 11 }] },
    edlon:    { form: "edlon", part: "noun", art: "cloaked", color: "#586170", hp: 54,
                pattern: [{ t: "attack", v: 9 }, { t: "frighten" }, { t: "attack", v: 14 }] },
    ndur:     { form: "(n)dûr", part: "adjective", art: "demon", color: "#8a3030", hp: 88, elite: true,
                pattern: [{ t: "attack", v: 16 }, { t: "defend", v: 10 }, { t: "attack", v: 18 }] },
    daedelos: { form: "(n)daedelos", part: "noun", art: "eye", color: "#6d3a86", hp: 92, elite: true,
                pattern: [{ t: "frighten" }, { t: "attack", v: 15 }, { t: "attack", v: 15 }] },
    amarth:   { form: "amarth", part: "noun", art: "darklord", color: "#3a2f52", hp: 150, boss: true,
                pattern: [{ t: "attack", v: 15 }, { t: "attack", v: 11 }, { t: "doom" }, { t: "attack", v: 20 }] }
};

// ---------- 圣物定义（常驻，顶栏显示） ----------
const RELIC_DEFS = [
    { form: "aran", part: "noun", icon: "👑", name: "王者之息", effect: "energyMax", desc: "每场战斗初始能量 +1" },
    { form: "bereth", part: "noun", icon: "💠", name: "女王庇佑", effect: "healAfterCombat", desc: "每次战斗胜利后恢复 5 点生命" },
    { form: "arnad", part: "noun", icon: "🪙", name: "王土岁贡", effect: "goldBonus", desc: "每次离开房间额外获得 5 金币" },
    { form: "albeth", part: "noun", icon: "🍀", name: "吉兆之言", effect: "firstCardFree", desc: "每回合打出的第一张牌费用为 0" }
];

// ---------- 楼层规划：每层两个房间二选一，第10层为首领 ----------
const FLOOR_PLAN = [
    ["combat", "event"],
    ["combat", "rest"],
    ["rest", "combat"],
    ["elite", "combat"],
    ["shop", "event"],
    ["combat", "treasure"],
    ["rest", "elite"],
    ["combat", "shop"],
    ["treasure", "rest"],
    ["boss"]
];
const EASY_POOL = ["draug", "auth", "esgal"];
const MID_POOL = ["duath", "fern", "edlon"];
const ELITE_POOL = ["ndur", "daedelos"];

// ============================================================
// 全局状态
// ============================================================
let WORD_INDEX = {};
let ALL_TERMS = [];
let mastery = loadMastery();
let run = null;
const app = document.getElementById("app");
const overlay = document.getElementById("overlay");

// ============================================================
// 初始化
// ============================================================
document.addEventListener("DOMContentLoaded", () => {
    initTooltips();
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
    collect(CARD_DEFS);
    collect(Object.values(ENEMY_DEFS));
    collect(RELIC_DEFS);
}

function getEntry(form, part) { return WORD_INDEX[form + "|" + part] || WORD_INDEX[form] || null; }

function shortDef(entry) {
    if (!entry) return "（未知词义）";
    let s = (entry.definition || entry.english || "").split(/[；;]/)[0].trim();
    if (!s) s = (entry.english || "").split(",")[0].trim();
    return s || "（未知词义）";
}

function escapeHtml(s) {
    return String(s).replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
}

// ============================================================
// 掌握度持久化（跨局的词汇学习记录，独立于本局卡牌强化等级）
// ============================================================
function loadMastery() {
    try { return JSON.parse(localStorage.getItem(MASTERY_KEY)) || {}; }
    catch (e) { return {}; }
}
function saveMastery() { localStorage.setItem(MASTERY_KEY, JSON.stringify(mastery)); }
function markMastery(form, part, correct) {
    const key = form + "|" + part;
    if (!mastery[key]) mastery[key] = { attempts: 0, correct: 0 };
    mastery[key].attempts++;
    if (correct) mastery[key].correct++;
    saveMastery();
}
function isEverMastered(form, part) {
    const m = mastery[form + "|" + part];
    return !!(m && m.correct > 0);
}

// ============================================================
// 卡牌实例与数值计算
// ============================================================
function findCardDef(form) { return CARD_DEFS.find(c => c.form === form); }
function cardDef(card) { return findCardDef(card.form); }

function makeCardInstance(def) {
    return {
        uid: Math.random().toString(36).slice(2),
        form: def.form, part: def.part, kind: def.kind, name: def.name,
        flavorTpl: def.flavorTpl, exhaust: !!def.exhaust, exileAfterUse: !!def.exileAfterUse,
        tier: 0 // 0 基础 / 1 弱强化 / 2 强强化
    };
}

// 计算某张卡在其当前强化等级下的有效数值
function eff(card) {
    const d = cardDef(card) || {};
    const t = card.tier || 0;
    const add = (f) => (d[f] || 0)
        + (t >= 1 && d.w && d.w[f] ? d.w[f] : 0)
        + (t >= 2 && d.s && d.s[f] ? d.s[f] : 0);
    const cost = Math.max(0, (d.cost || 0)
        + (t >= 1 && d.w && d.w.cost ? d.w.cost : 0)
        + (t >= 2 && d.s && d.s.cost ? d.s.cost : 0));
    return {
        cost,
        dmg: add("dmg"), block: add("block"), heal: add("heal"), draw: add("draw"),
        buffStrength: add("buffStrength"), energyGain: add("energyGain"),
        vuln: add("vuln"), weak: add("weak"),
        startTurnBlock: add("startTurnBlock"), drawBonus: add("drawBonus"),
        retainBlock: !!d.retainBlock, exhaust: !!d.exhaust, exileAfterUse: !!d.exileAfterUse
    };
}

// 用一个 def + 指定 tier 生成一个仅用于展示的伪卡
function previewCard(def, tier) {
    return { form: def.form, part: def.part, kind: def.kind, name: def.name,
             exhaust: !!def.exhaust, exileAfterUse: !!def.exileAfterUse, tier: tier || 0 };
}

function meaningRevealed(card) { return isEverMastered(card.form, card.part); }
function kindLabel(kind) { return { attack: "⚔ 攻击", skill: "🛡 技能", power: "💠 能力" }[kind] || kind; }

function effectPartsFromEff(e) {
    const parts = [];
    if (e.dmg) parts.push(`造成 ${e.dmg} 点伤害`);
    if (e.block) parts.push(`获得 ${e.block} 点护甲`);
    if (e.heal) parts.push(`恢复 ${e.heal} 点生命`);
    if (e.draw) parts.push(`抽 ${e.draw} 张牌`);
    if (e.buffStrength) parts.push(`力量 +${e.buffStrength}（本场永久）`);
    if (e.energyGain) parts.push(`获得 ${e.energyGain} 点能量`);
    if (e.vuln) parts.push(`使敌人易伤 ${e.vuln} 回合（受伤 +50%）`);
    if (e.weak) parts.push(`使敌人虚弱 ${e.weak} 回合（攻击 -25%）`);
    if (e.startTurnBlock) parts.push(`此后每回合开始获得 ${e.startTurnBlock} 护甲`);
    if (e.drawBonus) parts.push(`此后每回合多抽 ${e.drawBonus} 张牌`);
    if (e.retainBlock) parts.push(`护甲可保留至下回合`);
    return parts;
}

function tierBadge(tier) {
    if (tier >= 2) return `<span class="tier-badge t2" title="强强化">＋＋</span>`;
    if (tier >= 1) return `<span class="tier-badge t1" title="弱强化">＋</span>`;
    return "";
}

// ============================================================
// 标题页
// ============================================================
function renderTitle() {
    const total = ALL_TERMS.length;
    const mastered = ALL_TERMS.filter(t => isEverMastered(t.form, t.part)).length;
    app.innerHTML = `
        <div style="text-align:center;padding:20px 0;">
            <img class="tengwar-img" src="TitleSindarin1.png" alt="Mae govannen, randir. Se barad adabannen o phith Edhellen.">
            <p class="title-latin">Mae govannen, randir. Se barad adabannen o phith Edhellen.<br>你好，旅人。这座塔由辛达语的词汇筑成。</p>
            <p class="title-credit">腾格瓦转写由 <a href="https://www.tecendil.com/" target="_blank" rel="noopener">tecendil.com</a> 生成</p>
            <div class="stat" style="margin:18px auto;display:inline-flex;">📖 累计学习进度：${mastered} / ${total} 词已掌握</div>
            <div class="btn-row">
                <button class="primary-btn" onclick="startRun()">开始攀登 · Iestad</button>
                <button class="secondary-btn" onclick="openGlossary()">生词手册</button>
            </div>
            <div class="title-help">
                <b>玩法说明：</b><br>
                · 每层塔在地图上二选一：战斗 / 精英 / 篝火 / 商店 / 奇遇 / 宝藏，塔顶迎战 boss。<br>
                · 战斗中：<b>攻击牌需拖到右侧怪物身上</b>出牌，技能/能力牌点击即用。<br>
                · <b>初次学习</b>——每次选取奖励卡后，会随机抽取牌组里一张牌考察<b>词义</b>；答对该牌获得<b>弱强化</b>（数值小幅提升）。<br>
                · <b>复习</b>——篝火处自选两张已弱强化的牌，考察<b>音变/复数（名词）或时态（动词）</b>；答对升级为<b>强强化</b>（减费或大幅增强）。<br>
                · 词汇的掌握记录跨局永久保存；死亡只重置本局牌组。
            </div>
        </div>
    `;
}

function openGlossary() {
    const rows = ALL_TERMS.slice().sort((a, b) => a.form.localeCompare(b.form)).map(t => {
        const done = isEverMastered(t.form, t.part);
        const meaning = done ? shortDef(t.entry) : "？？？";
        return `<div class="deck-chip"><span class="w">${escapeHtml(t.form)}</span> <span style="color:#7f8c8d;">(${t.part})</span> — ${escapeHtml(meaning)} <span class="m">${done ? "★" : "☆"}</span></div>`;
    }).join("");
    showModal(`
        <h3>📖 辛达语生词手册</h3>
        <p class="modal-hint">记录你在塔中遇到过的所有词汇，掌握（★）后显示释义。</p>
        <div class="deck-list">${rows}</div>
        <div class="btn-row">
            <button class="secondary-btn" onclick="closeModal()">关闭</button>
            <button class="secondary-btn" onclick="if(confirm('确定清空全部学习记录？此操作不可恢复。')){mastery={};saveMastery();closeModal();}">重置学习记录</button>
        </div>
    `);
}

// ============================================================
// 开局
// ============================================================
function startRun() {
    const startDeck = [];
    for (let i = 0; i < 5; i++) startDeck.push(makeCardInstance(findCardDef("cam")));
    for (let i = 0; i < 4; i++) startDeck.push(makeCardInstance(findCardDef("coll")));
    startDeck.push(makeCardInstance(findCardDef("athelas")));
    run = {
        floor: 0, hp: 75, maxHp: 75, gold: 20,
        deck: startDeck, relics: [], combat: null,
        path: [], energyMaxBase: 3
    };
    goToNextFloor();
}

// ============================================================
// 楼层地图
// ============================================================
const ROOM_META = {
    combat:   { icon: "⚔️", name: "遭遇战", desc: "一只普通的塔中生物。", cls: "r-combat" },
    elite:    { icon: "☠️", name: "精英战", desc: "强敌，胜利后获得圣物。", cls: "r-elite" },
    rest:     { icon: "🏕️", name: "篝火", desc: "歇息回血，或复习升级卡牌。", cls: "r-rest" },
    shop:     { icon: "🛒", name: "商店", desc: "cadhad 矮人贩售圣物与精简。", cls: "r-shop" },
    event:    { icon: "❓", name: "奇遇", desc: "一次词义考验，答对有奖励。", cls: "r-event" },
    treasure: { icon: "💎", name: "宝藏", desc: "解开辛达语谜题开启宝箱。", cls: "r-treasure" },
    boss:     { icon: "🐉", name: "塔顶 · amarth", desc: "命运与终局在此等候。", cls: "r-boss" }
};

function goToNextFloor() {
    run.combat = null;
    run.floor++;
    if (run.floor > FLOOR_PLAN.length) { renderVictory(); return; }
    const options = FLOOR_PLAN[run.floor - 1];
    if (options.length === 1) { run.path[run.floor - 1] = options[0]; enterRoom(options[0]); return; }
    renderMap(options);
}

function towerRailHtml() {
    // 竖向塔层进度：已过层显示所选图标，当前层高亮，未来层锁定
    const dots = [];
    for (let f = FLOOR_PLAN.length; f >= 1; f--) {
        let cls = "floor-dot", inner = f;
        if (f < run.floor) { cls += " done"; const t = run.path[f - 1]; inner = t ? ROOM_META[t].icon : "·"; }
        else if (f === run.floor) { cls += " current"; }
        else { cls += " locked"; inner = "🔒"; }
        dots.push(`<div class="${cls}" title="第 ${f} 层">${inner}</div>`);
    }
    return `<div class="floor-rail">${dots.join("")}</div>`;
}

function renderMap(options) {
    const medallions = options.map((t) => {
        const m = ROOM_META[t];
        return `<button class="medallion ${m.cls}" onclick="enterRoom('${t}')">
            <span class="medallion-icon">${m.icon}</span>
            <span class="medallion-name">${m.name}</span>
            <span class="medallion-desc">${m.desc}</span>
        </button>`;
    }).join(`<div class="medallion-or">或</div>`);
    app.innerHTML = `
        ${topBarHtml()}
        <div class="tower-map">
            ${towerRailHtml()}
            <div class="tower-choice">
                <h2 class="map-title">第 ${run.floor} 层 · 选择前路</h2>
                <div class="choice-medallions">${medallions}</div>
            </div>
        </div>
    `;
}

function enterRoom(type) {
    run.path[run.floor - 1] = type;
    if (type === "combat") startCombat(pick(run.floor <= 5 ? EASY_POOL : EASY_POOL.concat(MID_POOL)));
    else if (type === "elite") startCombat(pick(ELITE_POOL), true);
    else if (type === "boss") startCombat("amarth", false, true);
    else if (type === "rest") renderRest();
    else if (type === "shop") renderShop();
    else if (type === "event") renderEvent();
    else if (type === "treasure") renderTreasure();
}
function pick(arr) { return arr[Math.floor(Math.random() * arr.length)]; }
function leaveRoomBonus() { if (run.relics.some(r => r.effect === "goldBonus")) run.gold += 5; }

// ============================================================
// 顶栏：圣物（常驻）+ 资源 + 牌堆按钮
// ============================================================
function relicStripHtml() {
    if (!run.relics.length) return "";
    const chips = run.relics.map(r =>
        `<span class="relic-chip" data-tip="${escapeHtml(r.name + "：" + r.desc)}">
            <span class="relic-ic">${r.icon || "💠"}</span><span class="relic-w">${escapeHtml(r.form)}</span>
        </span>`).join("");
    return `<div class="relic-strip"><span class="relic-label">圣物</span>${chips}</div>`;
}

function topBarHtml() {
    const c = run.combat;
    const pileBtn = c
        ? `<button class="utility-btn" onclick="openPileViewer()">📚 牌堆 抽${c.player.deck.length}/弃${c.player.discard.length}/耗${c.player.exile.length}</button>`
        : `<button class="utility-btn" onclick="openPileViewer()">📚 牌组 (${run.deck.length})</button>`;
    return `
        ${relicStripHtml()}
        <div class="status-bar">
            <span class="stat hp">❤ ${run.hp}/${run.maxHp}</span>
            <span class="stat coin">🪙 ${run.gold}</span>
            <span class="stat floor">🗼 第 ${run.floor} / ${FLOOR_PLAN.length} 层</span>
            ${pileBtn}
        </div>
    `;
}

// ---------- 牌堆查看 ----------
function pileCardChip(card) {
    const label = meaningRevealed(card) ? `${card.form}（${card.name}）` : `${card.form}（${kindLabel(card.kind)}）`;
    return `<div class="deck-chip"><span class="w">${escapeHtml(label)}</span> ${tierBadge(card.tier)}</div>`;
}
function pileSection(title, cards) {
    const body = cards.length ? `<div class="deck-list">${cards.map(pileCardChip).join("")}</div>`
        : `<p style="color:#7f8c8d;font-size:13px;">（空）</p>`;
    return `<h3 style="margin-bottom:8px;">${title}（${cards.length}）</h3>${body}`;
}
function openPileViewer() {
    const c = run.combat;
    let body;
    if (c) {
        body = pileSection("抽牌堆 · Deck", c.player.deck)
             + pileSection("弃牌堆 · Discard", c.player.discard)
             + pileSection("消耗堆 · Exile", c.player.exile);
    } else {
        body = pileSection("整体牌组 · Deck", run.deck);
    }
    showModal(`
        <h3 style="margin-top:0;">📚 牌堆总览</h3>
        <p class="modal-hint">${c ? "手牌见战斗界面；抽牌堆顺序已打乱，仅供查看构成。" : "当前不在战斗中，显示整局牌组。"}</p>
        ${body}
        <div class="btn-row"><button class="secondary-btn" onclick="closeModal()">关闭</button></div>
    `);
}

// ============================================================
// 战斗
// ============================================================
function startCombat(enemyKey, isElite, isBoss) {
    const def = ENEMY_DEFS[enemyKey];
    const entry = getEntry(def.form, def.part);
    const energyMax = run.energyMaxBase + (run.relics.some(r => r.effect === "energyMax") ? 1 : 0);
    run.combat = {
        enemyKey, def, entry,
        enemyHp: def.hp, enemyMaxHp: def.hp, enemyBlock: 0, enemyStrength: 0,
        enemyVuln: 0, enemyWeak: 0,
        enemyPatternIdx: 0, enemyNextAction: def.pattern[0],
        player: {
            energy: energyMax, energyMax,
            block: 0, strength: 0, vuln: 0,
            keepBlockNextTurn: false, drawBonus: 0, startTurnBlock: 0, firstCardFreeUsed: false,
            powers: [],
            deck: shuffle(run.deck.map(c => c)), hand: [], discard: [], exile: []
        },
        turn: 1, log: []
    };
    drawHand();
    renderCombat();
}

function shuffle(arr) {
    for (let i = arr.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr;
}
function drawHand() {
    const p = run.combat.player;
    const n = 5 + p.drawBonus;
    for (let i = 0; i < n; i++) drawOne();
}
function drawOne() {
    const p = run.combat.player;
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

// ---------- 角色图形（内联 SVG，离线可用，深浅主题通用） ----------
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
    const col = def.color || "#5b2c6f";
    const S = (inner) => `<svg viewBox="0 0 120 150" class="fighter-svg" style="color:${col}" aria-hidden="true">${inner}</svg>`;
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
                  <line x1="60" y1="84" x2="60" y2="128"/>
                  <line x1="44" y1="94" x2="76" y2="94"/><line x1="42" y1="106" x2="78" y2="106"/><line x1="44" y1="118" x2="76" y2="118"/>
                </g>`);
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
        case "darklord":
            return S(`<polygon points="40,26 34,4 52,22" fill="currentColor"/><polygon points="80,26 86,4 68,22" fill="currentColor"/>
                <path d="M60 30 L24 140 L96 140 Z" fill="currentColor"/>
                <path d="M60 30 L40 140 L80 140 Z" fill="#000" opacity=".22"/>
                <circle cx="60" cy="40" r="17" fill="currentColor"/>
                <path d="M60 24 L52 34 L60 32 L68 34 Z" fill="#c9a227"/>
                <circle cx="53" cy="42" r="3.2" fill="#ff3b3b"/><circle cx="67" cy="42" r="3.2" fill="#ff3b3b"/>`);
        default:
            return S(`<circle cx="60" cy="70" r="34" fill="currentColor"/>`);
    }
}

function hpBarHtml(cur, max) {
    const pct = Math.max(0, cur / max * 100);
    return `<div class="hpbar"><div class="hpbar-fill" style="width:${pct}%"></div><span class="hpbar-text">${Math.max(0, cur)} / ${max}</span></div>`;
}
function blockBadgeHtml(block) { return block > 0 ? `<div class="block-badge">🛡 ${block}</div>` : ""; }

function playerStatusHtml(p) {
    const pills = [];
    if (p.strength) pills.push(`<span class="status-pill s-str" data-tip="力量：攻击伤害额外 +${p.strength}">💪 ${p.strength}</span>`);
    if (p.vuln) pills.push(`<span class="status-pill s-vuln" data-tip="易伤：受到伤害 +50%，剩 ${p.vuln} 回合">☠ ${p.vuln}</span>`);
    return pills.join("");
}
function enemyStatusHtml(c) {
    const pills = [];
    if (c.enemyStrength) pills.push(`<span class="status-pill s-str" data-tip="力量：攻击 +${c.enemyStrength}">💪 ${c.enemyStrength}</span>`);
    if (c.enemyVuln) pills.push(`<span class="status-pill s-vuln" data-tip="易伤：受伤 +50%，剩 ${c.enemyVuln} 回合">☠ ${c.enemyVuln}</span>`);
    if (c.enemyWeak) pills.push(`<span class="status-pill s-weak" data-tip="虚弱：攻击 -25%，剩 ${c.enemyWeak} 回合">🩸 ${c.enemyWeak}</span>`);
    return pills.join("");
}

function powersRowHtml(p) {
    if (!p.powers.length) return `<div class="powers-row"></div>`;
    const chips = p.powers.map(pw =>
        `<span class="power-chip" data-tip="${escapeHtml(pw.desc)}"><span class="pw-ic">${pw.icon}</span><span class="pw-w">${escapeHtml(pw.form)}</span></span>`
    ).join("");
    return `<div class="powers-row">${chips}</div>`;
}

function describeIntent(action, c) {
    if (!action) return `<span class="intent-unknown">？</span>`;
    if (action.t === "attack") {
        let v = action.v + (c.enemyStrength || 0);
        if (c.enemyWeak > 0) v = Math.floor(v * 0.75);
        return `<span class="intent atk">⚔ ${v}</span>`;
    }
    if (action.t === "defend") return `<span class="intent def">🛡 ${action.v}</span>`;
    if (action.t === "buff") return `<span class="intent buff">💪 蓄力</span>`;
    if (action.t === "heal") return `<span class="intent heal">✚ 回复</span>`;
    if (action.t === "frighten") return `<span class="intent debuff">☠ 恐吓</span>`;
    if (action.t === "doom") return `<span class="intent doom">⏳ 命运</span>`;
    return `<span class="intent-unknown">？</span>`;
}

function cardHtml(card) {
    const e = eff(card);
    const affordable = e.cost <= run.combat.player.energy;
    const revealed = meaningRevealed(card);
    const meaning = revealed ? shortDef(getEntry(card.form, card.part)) : "？？？（词义未掌握）";
    const typeLine = revealed ? `${card.part} · ${card.name}` : `${card.part} · ${kindLabel(card.kind)}`;
    const isAttack = card.kind === "attack";
    const clickAttr = isAttack ? "" : `onclick="playCard('${card.uid}')"`;
    const dragAttrs = isAttack && affordable ? `data-uid="${card.uid}"` : "";
    const hint = isAttack ? `<div class="card-target-hint">🎯 拖到怪物出牌</div>` : "";
    const exhaustHint = card.exhaust ? `<div class="card-exhaust-hint">🔥 消耗</div>` : "";
    return `
        <div class="card k-${card.kind} ${affordable ? "" : "unaffordable"} ${isAttack ? "card-attack" : ""} ${card.exhaust ? "card-exhaust" : ""} tier-${card.tier}" ${clickAttr} ${dragAttrs}>
            <div class="card-cost">${e.cost}</div>
            ${tierBadge(card.tier)}
            <div class="card-word">${card.form}</div>
            <div class="card-part">${typeLine}</div>
            <div class="card-effect">${effectPartsFromEff(e).join("；")}</div>
            ${hint}${exhaustHint}
            <div class="card-meaning">${meaning}</div>
        </div>
    `;
}

function renderCombat() {
    const c = run.combat, p = c.player;
    const handHtml = p.hand.map(cardHtml).join("") || "<p style='color:#7f8c8d;'>（手牌已空）</p>";
    app.innerHTML = `
        ${topBarHtml()}
        <div class="combat-top">
            <span class="turn-chip">回合 ${c.turn}</span>
            <span class="energy-orb" data-tip="能量：打出卡牌的资源，每回合回满">⚡ ${p.energy}/${p.energyMax}</span>
            <button class="primary-btn end-turn" onclick="endPlayerTurn()">结束回合 ▸</button>
        </div>
        <div class="battle-stage">
            <div class="fighter fighter-player">
                <div class="fighter-figure">
                    ${blockBadgeHtml(p.block)}
                    ${playerArt()}
                </div>
                <div class="fighter-name">你 · randir</div>
                ${hpBarHtml(run.hp, run.maxHp)}
                <div class="status-icons">${playerStatusHtml(p)}</div>
                ${powersRowHtml(p)}
            </div>
            <div class="stage-vs">⚔</div>
            <div class="fighter fighter-enemy" id="enemySide">
                <div class="intent-bubble">${describeIntent(c.enemyNextAction, c)}</div>
                <div class="fighter-figure">
                    ${blockBadgeHtml(c.enemyBlock)}
                    ${enemyArt(c.def)}
                    ${c.def.elite ? `<div class="rank-tag elite">精英</div>` : ""}
                    ${c.def.boss ? `<div class="rank-tag boss">首领</div>` : ""}
                </div>
                <div class="fighter-name enemy">${c.def.name}</div>
                <div class="fighter-gloss">${escapeHtml(shortDef(c.entry))}</div>
                ${hpBarHtml(c.enemyHp, c.enemyMaxHp)}
                <div class="status-icons">${enemyStatusHtml(c)}</div>
            </div>
        </div>
        <div class="hand" id="handArea">${handHtml}</div>
        <div class="log">${c.log.map(l => `<div class="log-${l.cls}">${l.text}</div>`).join("")}</div>
    `;
    attachDragHandlers();

}

// ---------- 悬浮提示：用事件委托，一次绑定即可覆盖所有界面上的 [data-tip] ----------
let tipEl = null;
function initTooltips() {
    if (tipEl) return;
    tipEl = document.createElement("div");
    tipEl.className = "hover-tip hidden";
    document.body.appendChild(tipEl);
    document.addEventListener("pointerover", (e) => {
        const t = e.target.closest && e.target.closest("[data-tip]");
        if (!t) return;
        tipEl.textContent = t.getAttribute("data-tip");
        tipEl.classList.remove("hidden");
        moveTip(e);
    });
    document.addEventListener("pointermove", moveTip);
    document.addEventListener("pointerout", (e) => {
        const t = e.target.closest && e.target.closest("[data-tip]");
        if (t) hideTip();
    });
}
function moveTip(e) {
    if (!tipEl || tipEl.classList.contains("hidden")) return;
    const pad = 14;
    let x = e.clientX + pad, y = e.clientY + pad;
    const w = tipEl.offsetWidth, h = tipEl.offsetHeight;
    if (x + w > window.innerWidth - 8) x = e.clientX - w - pad;
    if (y + h > window.innerHeight - 8) y = e.clientY - h - pad;
    tipEl.style.left = x + "px"; tipEl.style.top = y + "px";
}
function hideTip() { if (tipEl) tipEl.classList.add("hidden"); }

// ---------- 拖拽出牌（攻击牌拖到怪物身上） ----------
function attachDragHandlers() {
    const handArea = document.getElementById("handArea");
    const enemySide = document.getElementById("enemySide");
    if (!handArea || !enemySide) return;
    handArea.querySelectorAll(".card-attack[data-uid]").forEach(cardEl => {
        cardEl.addEventListener("pointerdown", (ev) => startCardDrag(ev, cardEl, enemySide));
    });
}
function startCardDrag(ev, cardEl, target) {
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
    const over = (x, y) => { const r = target.getBoundingClientRect(); return x >= r.left && x <= r.right && y >= r.top && y <= r.bottom; };
    function onMove(e) {
        ghost.style.left = (e.clientX - offX) + "px";
        ghost.style.top = (e.clientY - offY) + "px";
        target.classList.toggle("drop-active", over(e.clientX, e.clientY));
    }
    function onUp(e) {
        document.removeEventListener("pointermove", onMove);
        document.removeEventListener("pointerup", onUp);
        target.classList.remove("drop-active");
        ghost.remove();
        if (over(e.clientX, e.clientY)) playCard(uid);
        else cardEl.classList.remove("dragging");
    }
    document.addEventListener("pointermove", onMove);
    document.addEventListener("pointerup", onUp);
}

function playCard(uid) {
    const c = run.combat, p = c.player;
    const idx = p.hand.findIndex(x => x.uid === uid);
    if (idx === -1) return;
    const card = p.hand[idx];
    const e = eff(card);
    let cost = e.cost;
    const firstFree = run.relics.some(r => r.effect === "firstCardFree") && !p.firstCardFreeUsed;
    if (firstFree) cost = 0;
    if (cost > p.energy) return;
    p.energy -= cost;
    if (firstFree) p.firstCardFreeUsed = true;

    if (e.dmg) dealDamageToEnemy(e.dmg + (p.strength || 0));
    if (e.block) { p.block += e.block; if (e.retainBlock) p.keepBlockNextTurn = true; }
    if (e.heal) run.hp = Math.min(run.maxHp, run.hp + e.heal);
    if (e.draw) for (let i = 0; i < e.draw; i++) drawOne();
    if (e.buffStrength) p.strength += e.buffStrength;
    if (e.energyGain) p.energy += e.energyGain;
    if (e.vuln) c.enemyVuln += e.vuln;
    if (e.weak) c.enemyWeak += e.weak;
    if (e.startTurnBlock) p.startTurnBlock += e.startTurnBlock;
    if (e.drawBonus) p.drawBonus += e.drawBonus;

    addLog(`你使用了 <b>${card.form}</b>${meaningRevealed(card) ? "（" + card.name + "）" : ""}。`, "good");

    p.hand.splice(idx, 1);
    if (card.kind === "power") {
        p.powers.push({ form: card.form, icon: powerIcon(card), name: card.name, desc: powerDesc(card, e) });
        if (card.exhaust) p.exile.push(card);
    } else if (card.exileAfterUse) {
        p.exile.push(card);
        run.deck = run.deck.filter(x => x.uid !== card.uid);
    } else if (card.exhaust) {
        p.exile.push(card);
    } else {
        p.discard.push(card);
    }

    if (c.enemyHp <= 0) { winCombat(); return; }
    renderCombat();
}

function powerIcon(card) {
    if (card.form === "barad") return "🗼";
    if (card.form === "curu") return "📖";
    if (card.form === "(m)belaith") return "🔥";
    return "💪";
}
function powerDesc(card, e) {
    const parts = [];
    if (e.buffStrength) parts.push(`力量 +${e.buffStrength}`);
    if (e.startTurnBlock) parts.push(`每回合起始 +${e.startTurnBlock} 护甲`);
    if (e.drawBonus) parts.push(`每回合多抽 ${e.drawBonus} 张牌`);
    const label = meaningRevealed(card) ? card.name : "能力";
    return `${label}：${parts.join("，") || "常驻效果"}`;
}

function dealDamageToEnemy(amount) {
    const c = run.combat;
    let dmg = amount;
    if (c.enemyVuln > 0) dmg = Math.floor(dmg * 1.5);
    if (c.enemyBlock > 0) { const a = Math.min(c.enemyBlock, dmg); c.enemyBlock -= a; dmg -= a; }
    c.enemyHp = Math.max(0, c.enemyHp - dmg);
}

function endPlayerTurn() {
    const c = run.combat, p = c.player;
    p.discard.push(...p.hand.splice(0));
    enemyAct();
    if (run.hp <= 0) { renderDefeat(); return; }
    if (c.enemyHp <= 0) { winCombat(); return; }
    // 新回合
    c.turn++;
    p.block = p.keepBlockNextTurn ? p.block : 0;
    p.keepBlockNextTurn = false;
    if (p.startTurnBlock) p.block += p.startTurnBlock;
    if (p.vuln > 0) p.vuln--;
    p.energy = p.energyMax;
    p.firstCardFreeUsed = false;
    drawHand();
    renderCombat();
}

function enemyAct() {
    const c = run.combat, p = c.player;
    const a = c.enemyNextAction;
    if (a.t === "attack") {
        let val = a.v + (c.enemyStrength || 0);
        if (c.enemyWeak > 0) val = Math.floor(val * 0.75);
        if (p.vuln > 0) val = Math.floor(val * 1.5);
        let remain = val;
        if (p.block > 0) { const ab = Math.min(p.block, remain); p.block -= ab; remain -= ab; }
        run.hp -= remain;
        addLog(`${c.def.name} 攻击，你受到 ${remain} 点伤害。`, "bad");
    } else if (a.t === "defend") {
        c.enemyBlock += a.v; addLog(`${c.def.name} 获得 ${a.v} 点护甲。`, "info");
    } else if (a.t === "buff") {
        c.enemyStrength += a.v; addLog(`${c.def.name} 蓄力，力量 +${a.v}。`, "bad");
    } else if (a.t === "heal") {
        c.enemyHp = Math.min(c.enemyMaxHp, c.enemyHp + a.v); addLog(`${c.def.name} 恢复 ${a.v} 点生命。`, "bad");
    } else if (a.t === "frighten") {
        p.vuln += 2; addLog(`${c.def.name} 令你陷入易伤！`, "bad");
    } else if (a.t === "doom") {
        c.enemyStrength += 3; addLog(`${c.def.name} 的命运之力使力量永久 +3……`, "bad");
    }
    // 敌方减益回合结算
    if (c.enemyVuln > 0) c.enemyVuln--;
    if (c.enemyWeak > 0) c.enemyWeak--;
    c.enemyPatternIdx = (c.enemyPatternIdx + 1) % c.def.pattern.length;
    c.enemyNextAction = c.def.pattern[c.enemyPatternIdx];
}

function winCombat() {
    const c = run.combat;
    addLog(`你击败了 ${c.def.name}！`, "good");
    if (run.relics.some(r => r.effect === "healAfterCombat")) run.hp = Math.min(run.maxHp, run.hp + 5);
    const gold = c.def.boss ? 80 : c.def.elite ? 45 : 20 + Math.floor(Math.random() * 10);
    run.gold += gold;
    leaveRoomBonus();
    if (c.def.boss) { renderVictory(); return; }
    const relicReward = c.def.elite ? pickRelicReward() : null;
    offerCardReward(relicReward, gold);
}

function pickRelicReward() {
    const owned = new Set(run.relics.map(r => r.form));
    const pool = RELIC_DEFS.filter(r => !owned.has(r.form));
    return pool.length ? pool[Math.floor(Math.random() * pool.length)] : null;
}

// ============================================================
// 战斗奖励：选卡 → 随机初次学习（弱强化）
// ============================================================
function offerCardReward(relicReward, goldEarned) {
    run.combat = null; // 战斗已结束：牌堆按钮应显示整体牌组而非上一场的抽/弃堆
    const pool = CARD_DEFS.filter(c => !STARTER_FORMS.includes(c.form));
    const picks = shuffle(pool.slice()).slice(0, 3);
    const cardsHtml = picks.map((def, i) => {
        const e = eff(previewCard(def, 0));
        const exhaustHint = def.exhaust ? `<div class="card-exhaust-hint">🔥 消耗</div>` : "";
        return `<div class="card k-${def.kind} ${def.exhaust ? "card-exhaust" : ""}" style="width:172px;" onclick="chooseReward(${i})">
            <div class="card-cost">${e.cost}</div>
            <div class="card-word">${def.form}</div>
            <div class="card-part">${def.part} · ${kindLabel(def.kind)}</div>
            <div class="card-effect">${effectPartsFromEff(e).join("；")}</div>
            ${exhaustHint}
            <div class="card-meaning">？？？（词义未掌握）</div>
        </div>`;
    }).join("");
    app.innerHTML = `
        ${topBarHtml()}
        <h2 style="margin-top:0;">战斗胜利！获得 ${goldEarned} 金币</h2>
        ${relicReward ? `<p>精英战利品：圣物 <b>${relicReward.form}</b>（${relicReward.name}）。</p>` : ""}
        <p style="color:#7f8c8d;">选择一张卡牌加入牌组。选定后会随机抽取牌组里的一张牌进行<b>初次学习（词义）</b>：答对该牌获得<b>弱强化</b>。</p>
        <div class="hand">${cardsHtml}</div>
        <div class="btn-row"><button class="secondary-btn" onclick="skipReward()">跳过取卡</button></div>
    `;
    run.pendingReward = { picks, relicReward };
}

function chooseReward(i) {
    const { picks, relicReward } = run.pendingReward;
    if (relicReward) run.relics.push(relicReward);
    run.deck.push(makeCardInstance(picks[i]));
    run.pendingReward = null;
    runInitialLearning(() => goToNextFloor());
}
function skipReward() {
    const { relicReward } = run.pendingReward || {};
    if (relicReward) run.relics.push(relicReward);
    run.pendingReward = null;
    runInitialLearning(() => goToNextFloor());
}

// 随机抽一张牌考察词义，答对→弱强化（tier 至少 1）
function runInitialLearning(done) {
    if (!run.deck.length) { done(); return; }
    const card = run.deck[Math.floor(Math.random() * run.deck.length)];
    showModal(`
        <h3>初次学习</h3>
        <p class="modal-hint">命运从你的牌组中抽出了一张牌，考察它的词义：</p>
        <div class="btn-row"><button class="primary-btn" onclick="closeModal();__startInitialQuiz()">开始考察</button></div>
    `);
    window.__initLearn = { card, done };
}
function __startInitialQuiz() {
    const { card, done } = window.__initLearn;
    quizTranslation(card.form, card.part, (correct) => {
        if (correct && card.tier < 1) card.tier = 1;
        window.__afterInit = done;
        showModal(`
            <h3>初次学习结果</h3>
            <p>${correct ? `答对了！<b>${card.form}</b> 获得<b>弱强化</b>。` : `答错了，<b>${card.form}</b> 未获得强化，可在篝火复习时重新学习。`}</p>
            <div class="btn-row"><button class="primary-btn" onclick="closeModal();window.__afterInit()">继续</button></div>
        `);
    });
}

// ============================================================
// 篝火：歇息 / 复习（强强化）
// ============================================================
function renderRest() {
    app.innerHTML = `
        ${topBarHtml()}
        <h2 style="margin-top:0;">🏕️ 篝火 · Naur</h2>
        <p style="color:#7f8c8d;">在火光旁二选一：安心歇息，或复习已弱强化的卡牌以获得强强化。</p>
        <div class="choice-medallions">
            <button class="medallion r-rest" onclick="restHeal()">
                <span class="medallion-icon">🛌</span>
                <span class="medallion-name">歇息</span>
                <span class="medallion-desc">恢复 30% 最大生命（${Math.round(run.maxHp * 0.3)} 点）。</span>
            </button>
            <div class="medallion-or">或</div>
            <button class="medallion r-event" onclick="startReview()">
                <span class="medallion-icon">📚</span>
                <span class="medallion-name">复习</span>
                <span class="medallion-desc">自选两张已弱强化的牌，考音变/时态，答对升为强强化。</span>
            </button>
        </div>
    `;
}
function restHeal() {
    run.hp = Math.min(run.maxHp, run.hp + Math.round(run.maxHp * 0.3));
    leaveRoomBonus();
    goToNextFloor();
}

// 复习入口
function startReview() {
    const eligible = run.deck.filter(c => c.tier === 1);
    if (eligible.length === 0) {
        // 没有可复习的牌 → 提示并随机抽两张进行初次学习（弱强化）
        const picks = shuffle(run.deck.slice()).slice(0, Math.min(2, run.deck.length));
        showModal(`
            <h3>暂无可复习的卡牌</h3>
            <p class="modal-hint">你还没有处于「弱强化」状态的卡牌。将改为随机抽取 ${picks.length} 张牌进行<b>初次学习（词义）</b>。</p>
            <div class="btn-row"><button class="primary-btn" onclick="closeModal();__reviewFallback()">开始</button></div>
        `);
        window.__reviewPicks = picks;
        return;
    }
    run.reviewSel = [];
    renderReviewSelect(eligible);
}
function __reviewFallback() {
    const picks = window.__reviewPicks || [];
    runQuizSequence(picks, "translation", (card, correct) => { if (correct && card.tier < 1) card.tier = 1; },
        () => { leaveRoomBonus(); goToNextFloor(); });
}

function renderReviewSelect(eligible) {
    const cards = eligible.map(c => {
        const selected = run.reviewSel.includes(c.uid);
        const e = eff(c);
        const name = meaningRevealed(c) ? c.name : kindLabel(c.kind);
        return `<div class="card k-${c.kind} tier-${c.tier} ${selected ? "review-selected" : ""}" style="width:150px;" onclick="toggleReview('${c.uid}')">
            <div class="card-cost">${e.cost}</div>
            ${tierBadge(c.tier)}
            <div class="card-word">${c.form}</div>
            <div class="card-part">${c.part} · ${name}</div>
            <div class="card-effect">${effectPartsFromEff(e).join("；")}</div>
        </div>`;
    }).join("");
    app.innerHTML = `
        ${topBarHtml()}
        <h2 style="margin-top:0;">📚 复习 · 自选两张</h2>
        <p style="color:#7f8c8d;">选中最多两张（名词考复数/音变，动词考时态，形容词考比较级等）。已选 ${run.reviewSel.length}/2。</p>
        <div class="hand">${cards}</div>
        <div class="btn-row">
            <button class="primary-btn" ${run.reviewSel.length ? "" : "disabled"} onclick="confirmReview()">开始复习（${run.reviewSel.length}）</button>
            <button class="secondary-btn" onclick="restHeal()">放弃复习并歇息</button>
        </div>
    `;
}
function toggleReview(uid) {
    const i = run.reviewSel.indexOf(uid);
    if (i >= 0) run.reviewSel.splice(i, 1);
    else if (run.reviewSel.length < 2) run.reviewSel.push(uid);
    renderReviewSelect(run.deck.filter(c => c.tier === 1));
}
function confirmReview() {
    const cards = run.reviewSel.map(uid => run.deck.find(c => c.uid === uid)).filter(Boolean);
    runQuizSequence(cards, "mutation", (card, correct) => { if (correct) card.tier = 2; },
        () => { leaveRoomBonus(); goToNextFloor(); });
}

// 顺序执行一组测验
function runQuizSequence(cards, mode, onEach, done) {
    let i = 0;
    function next() {
        if (i >= cards.length) { done(); return; }
        const card = cards[i++];
        const cb = (correct) => { onEach(card, correct); next(); };
        if (mode === "mutation") quizMutationOrFallback(card.form, card.part, cb);
        else quizTranslation(card.form, card.part, cb);
    }
    next();
}

// ============================================================
// 商店
// ============================================================
function renderShop() {
    const owned = new Set(run.relics.map(r => r.form));
    const stock = shuffle(RELIC_DEFS.filter(r => !owned.has(r.form)).slice()).slice(0, 2);
    run.shopStock = stock.map(r => ({ relic: r, price: 60 + Math.floor(Math.random() * 30), discounted: false }));
    renderShopView();
}
function renderShopView() {
    const items = run.shopStock.map((item, i) => `
        <div class="shop-item">
            <div class="shop-ic">${item.relic.icon || "💠"}</div>
            <div class="shop-name">${item.relic.form} · ${item.relic.name}</div>
            <div class="shop-desc">${item.relic.desc}</div>
            <p class="shop-price">🪙 ${item.price}${item.discounted ? "（已折扣）" : ""}</p>
            <div class="btn-row">
                ${!item.discounted ? `<button class="secondary-btn" onclick="shopQuizDiscount(${i})">答题享 8 折</button>` : ""}
                <button class="primary-btn" onclick="buyRelic(${i})">购买</button>
            </div>
        </div>
    `).join("") || "<p style='color:#7f8c8d;'>圣物已售罄。</p>";
    app.innerHTML = `
        ${topBarHtml()}
        <h2 style="margin-top:0;">🛒 矮人商店 · cadhad</h2>
        <p style="color:#7f8c8d;">一位 cadhad（矮人）商人在此贩售圣物，也提供牌组精简。</p>
        <div class="shop-grid">${items}</div>
        <div class="panel" style="box-shadow:none;border:1px dashed var(--line,#dfe4ea);margin-top:16px;">
            <h3 style="margin-top:0;">移除一张卡牌 · 🪙40</h3>
            <p style="color:#7f8c8d;font-size:13px;">精简牌组，让核心卡更易抽到。</p>
            <button class="secondary-btn" ${run.deck.length ? "" : "disabled"} onclick="openRemoveCard()">选择要移除的卡牌</button>
        </div>
        <div class="btn-row"><button class="primary-btn" onclick="leaveShop()">离开商店</button></div>
    `;
}
function shopQuizDiscount(i) {
    const term = randomTerm();
    quizTranslation(term.form, term.part, (correct) => {
        if (correct) { run.shopStock[i].price = Math.round(run.shopStock[i].price * 0.8); run.shopStock[i].discounted = true; }
        renderShopView();
    });
}
function buyRelic(i) {
    const item = run.shopStock[i];
    if (run.gold < item.price) { alert("金币不足！"); return; }
    run.gold -= item.price; run.relics.push(item.relic); run.shopStock.splice(i, 1);
    renderShopView();
}
function openRemoveCard() {
    const cards = run.deck.map((c, i) => {
        const e = eff(c);
        const name = meaningRevealed(c) ? c.name : kindLabel(c.kind);
        return `<div class="card k-${c.kind} tier-${c.tier}" style="width:150px;" onclick="removeCard(${i})">
            <div class="card-cost">${e.cost}</div>${tierBadge(c.tier)}
            <div class="card-word">${c.form}</div>
            <div class="card-part">${c.part} · ${name}</div>
        </div>`;
    }).join("");
    showModal(`<h3>选择要移除的卡牌</h3><div class="hand">${cards}</div><div class="btn-row"><button class="secondary-btn" onclick="closeModal()">取消</button></div>`);
}
function removeCard(i) {
    if (run.gold < 40) { alert("金币不足！"); closeModal(); return; }
    run.gold -= 40; run.deck.splice(i, 1); closeModal(); renderShopView();
}
function leaveShop() { leaveRoomBonus(); goToNextFloor(); }

// ============================================================
// 奇遇 / 宝藏
// ============================================================
function renderEvent() {
    const term = randomTerm();
    app.innerHTML = `
        ${topBarHtml()}
        <h2 style="margin-top:0;">❓ 奇遇 · Aphadad</h2>
        <p style="color:#7f8c8d;">一位游吟诗人考验你的辛达语——答对得金币与治疗，答错略有损失。</p>
        <div class="btn-row"><button class="primary-btn" onclick="doEvent('${term.form}','${term.part}')">接受考验</button></div>
    `;
}
function doEvent(form, part) {
    quizTranslation(form, part, (correct) => {
        let text;
        if (correct) { run.gold += 15; run.hp = Math.min(run.maxHp, run.hp + 5); text = "回答正确！获得 15 金币与 5 点生命。"; }
        else { run.hp = Math.max(1, run.hp - 5); text = "回答错误，损失 5 点生命。"; }
        leaveRoomBonus();
        showModal(`<h3>奇遇结果</h3><p>${text}</p><div class="btn-row"><button class="primary-btn" onclick="closeModal();goToNextFloor();">继续</button></div>`);
    });
}
function renderTreasure() {
    const term = randomTerm();
    app.innerHTML = `
        ${topBarHtml()}
        <h2 style="margin-top:0;">💎 宝藏 · Aur</h2>
        <p style="color:#7f8c8d;">箱上刻着一个辛达语谜题，答对可开启完整宝藏。</p>
        <div class="btn-row"><button class="primary-btn" onclick="doTreasure('${term.form}','${term.part}')">解谜开箱</button></div>
    `;
}
function doTreasure(form, part) {
    quizTranslation(form, part, (correct) => {
        let text;
        if (correct) {
            const relic = pickRelicReward(); run.gold += 40;
            if (relic) { run.relics.push(relic); text = `解谜成功！获得圣物 <b>${relic.form}</b>（${relic.name}）与 40 金币。`; }
            else text = `解谜成功！获得 40 金币。`;
        } else { run.gold += 15; text = `解谜失败，宝箱只弹出一半——获得 15 金币。`; }
        leaveRoomBonus();
        showModal(`<h3>宝藏结果</h3><p>${text}</p><div class="btn-row"><button class="primary-btn" onclick="closeModal();goToNextFloor();">继续</button></div>`);
    });
}
function randomTerm() { return ALL_TERMS[Math.floor(Math.random() * ALL_TERMS.length)]; }

// ============================================================
// 测验：词义选择
// ============================================================
function quizTranslation(form, part, callback) {
    const entry = getEntry(form, part);
    const correctDef = shortDef(entry);
    const pool = ALL_TERMS.filter(t => !(t.form === form && t.part === part)).map(t => shortDef(t.entry)).filter(d => d !== correctDef);
    const distractors = shuffle(Array.from(new Set(pool))).slice(0, 3);
    const options = shuffle([{ text: correctDef, correct: true }, ...distractors.map(d => ({ text: d, correct: false }))]);
    const optHtml = options.map((o, i) => `<button class="option-btn" onclick="answerTranslation(${i})">${escapeHtml(o.text)}</button>`).join("");
    showModal(`
        <h3>词义测验</h3>
        <p class="modal-hint">下面哪一项是它的意思？（词性：${part}）</p>
        <div class="modal-word">${form}</div>
        ${optHtml}
        <div id="quiz-result"></div>
    `);
    window.__quizPending = { form, part, callback };
    window.__quizOptions = options;
}
function answerTranslation(i) {
    const options = window.__quizOptions;
    const chosen = options[i];
    document.querySelectorAll(".option-btn").forEach((btn, idx) => {
        btn.onclick = null;
        if (options[idx].correct) btn.classList.add("right");
        else if (idx === i) btn.classList.add("wrong");
    });
    document.getElementById("quiz-result").innerHTML = `
        <p style="margin-top:10px;font-weight:600;color:${chosen.correct ? "#27ae60" : "#c0392b"};">${chosen.correct ? "✔ 回答正确！" : "✘ 回答错误。"}</p>
        <div class="btn-row"><button class="primary-btn" onclick="finishQuiz(${chosen.correct})">继续</button></div>
    `;
}
function finishQuiz(correct) {
    const { form, part, callback } = window.__quizPending;
    markMastery(form, part, correct);
    closeModal();
    callback(correct);
}

// ============================================================
// 测验：音变 / 变位填空（名词复数音变、动词时态、形容词级别）
// ============================================================
function quizMutationOrFallback(form, part, callback) {
    const entry = getEntry(form, part);
    const morph = (entry && entry.morphology || []).filter(m => m.form && m.form.trim());
    if (morph.length === 0) { quizTranslation(form, part, callback); return; }
    quizMutation(form, part, callback);
}
function quizMutation(form, part, callback) {
    const entry = getEntry(form, part);
    const morph = (entry.morphology || []).filter(m => m.form && m.form.trim());
    const item = morph[Math.floor(Math.random() * morph.length)];
    const label = MUTATION_LABELS[item.type] || item.type;
    const chars = ["á","é","í","ó","ú","ý","â","ê","î","ô","û","ŷ","ñ"];
    showModal(`
        <h3>复习测验 · 音变 / 变位</h3>
        <p class="modal-hint">请写出 <b>${form}</b>（${part}）的「${label}」形式：</p>
        <div class="modal-word">${form}</div>
        <input type="text" id="mutationInput" placeholder="在此输入答案">
        <div class="char-row">${chars.map(c => `<button type="button" class="char-btn" onclick="insertChar('${c}')">${c}</button>`).join("")}</div>
        <div class="btn-row"><button class="primary-btn" onclick="answerMutation()">提交答案</button></div>
        <div id="quiz-result"></div>
    `);
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
function answerMutation() {
    const { correctForm } = window.__mutationPending;
    const el = document.getElementById("mutationInput");
    const userVal = (el.value || "").trim().toLowerCase();
    const alts = correctForm.split("/").map(s => s.trim().toLowerCase());
    const correct = alts.includes(userVal);
    document.getElementById("quiz-result").innerHTML = `
        <p style="margin-top:10px;font-weight:600;color:${correct ? "#27ae60" : "#c0392b"};">
            ${correct ? "✔ 回答正确！" : `✘ 回答错误。正确形式：<i>${escapeHtml(correctForm)}</i>`}
        </p>
        <div class="btn-row"><button class="primary-btn" onclick="finishMutationQuiz(${correct})">继续</button></div>
    `;
    el.disabled = true;
}
function finishMutationQuiz(correct) {
    const { form, part, callback } = window.__mutationPending;
    markMastery(form, part, correct);
    closeModal();
    callback(correct);
}

// ============================================================
// 弹窗 / 结局 / 主题
// ============================================================
function showModal(html) { overlay.innerHTML = `<div class="modal">${html}</div>`; overlay.classList.remove("hidden"); }
function closeModal() { overlay.classList.add("hidden"); overlay.innerHTML = ""; hideTip(); }

function renderDefeat() {
    run.combat = null;
    app.innerHTML = `
        <div style="text-align:center;padding:30px 0;">
            <h2>你倒在了第 ${run.floor} 层……</h2>
            <p style="color:#7f8c8d;">I-varad dartha. 塔仍矗立，词汇的记忆已然留下。</p>
            <div class="btn-row">
                <button class="primary-btn" onclick="startRun()">再次挑战</button>
                <button class="secondary-btn" onclick="renderTitle()">返回标题</button>
            </div>
        </div>`;
}
function renderVictory() {
    run.combat = null;
    app.innerHTML = `
        <div style="text-align:center;padding:30px 0;">
            <h2>🎉 你登上了塔顶！</h2>
            <p style="color:#7f8c8d;">Aphadon i-amarth. 你战胜了命运本身。</p>
            <p>本次攀登积累了 ${run.gold} 金币，掌握词汇已计入生词手册。</p>
            <div class="btn-row">
                <button class="primary-btn" onclick="startRun()">再次攀登</button>
                <button class="secondary-btn" onclick="renderTitle()">返回标题</button>
            </div>
        </div>`;
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
