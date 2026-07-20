/* ============================================================
   Barad Bith · 语塔爬塔录
   一个用辛达语真实词典条目驱动的 roguelike 卡牌爬塔小游戏。
   卡牌 / 敌人 / 圣物均取自 dictionary.json 中的真实辛达语词条，
   通过获取卡牌、篝火钻研、宝箱与事件中的小测验来"掌握"词汇。
   ============================================================ */

const DICT_URL = "https://kinnuch.github.io/laim/sindarin.assets/SindarinDatabase/dictionary.json";
const MASTERY_KEY = "baradBithMastery";
const MUTATION_LABELS = {
    Soft: "软音变", Plural: "复数形式", "NasalⅠ": "鼻音变Ⅰ(带 in)", "NasalⅡ": "鼻音变Ⅱ(带 an)",
    "MixedⅠ": "混合音变Ⅰ(带 e-)", "MixedⅡ": "混合音变Ⅱ(带 anin)", Liquid: "流音音变(带 egor)",
    Stop: "闭锁音变(带 o)", H: "H音变(带 ah)", DH: "DH音变(带 nedh)",
    Present: "现在时", Past: "过去时", Future: "将来时", Imperative: "命令式",
    Gerund: "动名词", PastParticiple: "过去分词", PresentParticiple: "现在分词", PeferctParticle: "完成分词"
};

// ---------- 卡牌定义（不含起始牌 cam / coll） ----------
const CARD_DEFS = [
    { form: "crist", part: "noun", kind: "attack", cost: 2, dmg: 9, name: "重劈", flavorTpl: "挥动{w}劈砍敌人" },
    { form: "agar", part: "noun", kind: "attack", cost: 1, dmg: 5, heal: 3, name: "饮血打击", flavorTpl: "以{w}为祭，造成伤害并回复少量生命" },
    { form: "(n)dagor", part: "noun", kind: "skill", cost: 1, buffStrength: 2, name: "临战怒吼", flavorTpl: "投入{w}的意志，本场战斗中攻击力永久+2" },
    { form: "cû", part: "noun", kind: "attack", cost: 1, dmg: 5, draw: 1, name: "引弓速射", flavorTpl: "以{w}速射，造成伤害并抽1张牌" },
    { form: "craban", part: "noun", kind: "skill", cost: 1, draw: 2, name: "渡鸦侦察", flavorTpl: "放出{w}探路，额外抽2张牌" },
    { form: "castol", part: "noun", kind: "skill", cost: 1, block: 8, name: "戴盔防御", flavorTpl: "戴上{w}，获得护甲" },
    { form: "ephel", part: "noun", kind: "skill", cost: 2, block: 12, name: "环围壁垒", flavorTpl: "筑起{w}，获得大量护甲" },
    { form: "celeb", part: "noun", kind: "skill", cost: 1, block: 7, name: "白银之甲", flavorTpl: "以{w}护体，获得护甲" },
    { form: "ang", part: "noun", kind: "skill", cost: 2, block: 11, name: "钢铁之壁", flavorTpl: "以{w}铸壁，获得大量护甲" },
    { form: "annon", part: "noun", kind: "skill", cost: 1, block: 5, retainBlock: true, name: "闭锁石门", flavorTpl: "关闭{w}，获得的护甲可保留到下回合" },
    { form: "fennas", part: "noun", kind: "skill", cost: 0, block: 3, name: "虚掩之门", flavorTpl: "虚掩{w}，0费获得少量护甲" },
    { form: "barad", part: "noun", kind: "power", cost: 2, startTurnBlock: 3, name: "高塔永固", flavorTpl: "化身{w}，此后每回合开始时获得3点护甲" },
    { form: "curu", part: "noun", kind: "power", cost: 1, drawBonus: 1, name: "工艺之智", flavorTpl: "习得{w}，此后每回合额外多抽1张牌" },
    { form: "athelas", part: "noun", kind: "skill", cost: 1, heal: 8, name: "王叶疗愈", flavorTpl: "嚼服{w}，恢复生命值" },
    { form: "athae", part: "noun", kind: "skill", cost: 2, heal: 14, name: "灵草煎剂", flavorTpl: "煎煮{w}，恢复大量生命值" },
    { form: "estel", part: "noun", kind: "skill", cost: 1, block: 4, heal: 4, name: "信任与希望", flavorTpl: "心怀{w}，获得护甲并恢复少量生命" },
    { form: "amdir", part: "noun", kind: "skill", cost: 2, heal: 6, draw: 1, name: "理性之望", flavorTpl: "凭借{w}，恢复生命并抽1张牌" },
    { form: "êl", part: "noun", kind: "skill", cost: 1, block: 5, weakenEnemy: 3, name: "星辉映照", flavorTpl: "{w}微光照耀，获得护甲并削弱敌方下次攻击" },
    { form: "elanor", part: "noun", kind: "skill", cost: 1, heal: 5, name: "金花之息", flavorTpl: "{w}绽放芬芳，恢复生命值" },
    { form: "calar", part: "noun", kind: "skill", cost: 0, energyGain: 1, name: "掌灯引路", flavorTpl: "提起{w}，0费获得1点能量" },
    { form: "brasta-", part: "verb", kind: "attack", cost: 2, dmg: 13, name: "昂首耸立", flavorTpl: "以{w}之势威压攻击，造成大量伤害" },
    { form: "(m)bas(t)", part: "noun", kind: "skill", cost: 1, heal: 6, exileAfterUse: true, name: "一块干粮", flavorTpl: "吃下{w}，恢复生命值（用后本局消失）" },
    { form: "cam", part: "noun", kind: "attack", cost: 1, dmg: 6, name: "徒手一击", flavorTpl: "以{w}出手，造成伤害", isStarter: true },
    { form: "coll", part: "noun", kind: "skill", cost: 1, block: 6, name: "裹紧披风", flavorTpl: "裹紧{w}，获得护甲", isStarter: true }
];

// ---------- 敌人定义 ----------
const ENEMY_DEFS = {
    draug:    { form: "draug", part: "noun", name: "draug", hp: 26, pattern: [{ t: "attack", v: 11 }, { t: "attack", v: 7 }] },
    auth:     { form: "auth", part: "noun", name: "auth", hp: 23, pattern: [{ t: "attack", v: 6 }, { t: "defend", v: 6 }, { t: "attack", v: 10 }] },
    esgal:    { form: "esgal", part: "noun", name: "esgal", hp: 30, pattern: [{ t: "defend", v: 8 }, { t: "attack", v: 14 }] },
    duath:    { form: "dúath", part: "noun", name: "dúath", hp: 42, pattern: [{ t: "attack", v: 9 }, { t: "attack", v: 9 }, { t: "buff", v: 3 }] },
    fern:     { form: "fern", part: "adjective", name: "fern", hp: 38, pattern: [{ t: "attack", v: 9 }, { t: "heal", v: 10 }, { t: "attack", v: 9 }] },
    edlon:    { form: "edlon", part: "noun", name: "edlon", hp: 34, pattern: [{ t: "attack", v: 7 }, { t: "curse" }, { t: "attack", v: 12 }] },
    ndur:     { form: "(n)dûr", part: "adjective", name: "(n)dûr", hp: 58, elite: true, pattern: [{ t: "attack", v: 16 }, { t: "attack", v: 10 }, { t: "attack", v: 18 } ] },
    daedelos: { form: "(n)daedelos", part: "noun", name: "(n)daedelos", hp: 62, elite: true, pattern: [{ t: "vulnerable" }, { t: "attack", v: 15 }, { t: "attack", v: 15 }] },
    amarth:   { form: "amarth", part: "noun", name: "amarth", hp: 130, boss: true, pattern: [{ t: "attack", v: 16 }, { t: "attack", v: 12 }, { t: "doom" }, { t: "attack", v: 22 }] }
};

// ---------- 圣物定义 ----------
const RELIC_DEFS = [
    { form: "aran", part: "noun", name: "王者之息", effect: "energyMax", desc: "每场战斗中，你的初始能量+1" },
    { form: "bereth", part: "noun", name: "女王庇佑", effect: "healAfterCombat", desc: "每次战斗胜利后，恢复5点生命值" },
    { form: "arnad", part: "noun", name: "王土岁贡", effect: "goldBonus", desc: "每次离开一个房间时，额外获得5枚金币" },
    { form: "albeth", part: "noun", name: "吉兆之言", effect: "firstCardFree", desc: "每场战斗中，本回合打出的第一张卡牌费用为0" }
];

const STARTER_FORMS = ["cam", "coll"]; // 起始牌不进入奖励池

// ---------- 楼层规划：每层给出两个房间供二选一，第10层为首领 ----------
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
let WORD_INDEX = {}; // key: form|part -> dictionary entry
let ALL_TERMS = [];  // 去重后的 {form, part, entry} 列表，供测验取词
let mastery = loadMastery();

let run = null; // 当前游戏局的状态对象
const app = document.getElementById("app");
const overlay = document.getElementById("overlay");

// ============================================================
// 初始化：加载词典
// ============================================================
document.addEventListener("DOMContentLoaded", () => {
    fetch(DICT_URL)
        .then(r => r.json())
        .then(data => {
            buildIndex(data);
            renderTitle();
        })
        .catch(err => {
            app.innerHTML = `<div class="loading">词典加载失败，请检查网络连接。<br>${err}</div>`;
        });
});

function buildIndex(data) {
    data.forEach(e => {
        const key = e.dict_form + "|" + e.part;
        if (!WORD_INDEX[key]) WORD_INDEX[key] = e;
        const looseKey = e.dict_form;
        if (!WORD_INDEX[looseKey]) WORD_INDEX[looseKey] = e;
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

function getEntry(form, part) {
    return WORD_INDEX[form + "|" + part] || WORD_INDEX[form] || null;
}

function shortDef(entry) {
    if (!entry) return "（未知词义）";
    let s = entry.definition || entry.english || "";
    s = s.split(/[；;]/)[0].trim();
    if (!s) s = (entry.english || "").split(",")[0].trim();
    return s || "（未知词义）";
}

// ============================================================
// 掌握度持久化
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
// 标题页
// ============================================================
function renderTitle() {
    const total = ALL_TERMS.length;
    const mastered = ALL_TERMS.filter(t => isEverMastered(t.form, t.part)).length;
    app.innerHTML = `
        <div style="text-align:center;padding:20px 0;">
            <p style="font-size:15px;color:#7f8c8d;">Mae govannen, adan. I varad bith i-ngovannech ceni.<br>你好，旅人。这是一座用辛达语词汇筑成的塔。</p>
            <div class="stat" style="margin:18px auto;display:inline-flex;">📖 累计学习进度：${mastered} / ${total} 词已掌握</div>
            <div class="btn-row">
                <button class="primary-btn" onclick="startRun()">开始攀登 · Iestad</button>
                <button class="secondary-btn" onclick="openGlossary()">生词手册</button>
            </div>
            <div style="margin-top:22px;font-size:13px;color:#7f8c8d;line-height:1.7;text-align:left;max-width:640px;margin-left:auto;margin-right:auto;">
                <b>玩法说明：</b><br>
                · 每层塔可在两个房间中二选一：战斗、精英战、篝火、商店、事件或宝藏。<br>
                · 战斗胜利后可获得一张新卡——卡牌本体就是一个真实的辛达语词条。<br>
                · 抽到新卡、打开宝藏、参与事件时都会触发一次小测验（词义选择或音变填空）；<br>
                &nbsp;&nbsp;答对即可<b>掌握</b>该词，卡牌效果增强、中文释义永久解锁显示。<br>
                · 未掌握的词，效果会打折且释义显示为"？？？"——去篝火处"钻研辞典"可以重新挑战。<br>
                · 死亡后本局的牌组会重置，但词汇的掌握记录会永久保留。
            </div>
        </div>
    `;
}

function openGlossary() {
    const rows = ALL_TERMS.slice().sort((a, b) => a.form.localeCompare(b.form)).map(t => {
        const m = mastery[t.form + "|" + t.part];
        const mastered = m && m.correct > 0;
        const meaning = mastered ? shortDef(t.entry) : "？？？";
        const star = mastered ? "★" : "☆";
        return `<div class="deck-chip"><span class="w">${escapeHtml(t.form)}</span> <span style="color:#7f8c8d;">(${t.part})</span> — ${escapeHtml(meaning)} <span class="m">${star}</span></div>`;
    }).join("");
    showModal(`
        <h3>📖 辛达语生词手册</h3>
        <p class="modal-hint">本手册记录你在塔中遇到过的所有词汇。掌握（★）后才会显示释义。</p>
        <div class="deck-list">${rows}</div>
        <div class="btn-row">
            <button class="secondary-btn" onclick="closeModal()">关闭</button>
            <button class="secondary-btn" onclick="if(confirm('确定要清空全部学习记录吗？此操作不可恢复。')){mastery={};saveMastery();closeModal();}">重置学习记录</button>
        </div>
    `);
}

function escapeHtml(s) {
    return String(s).replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
}

// ============================================================
// 新的一局
// ============================================================
function startRun() {
    const startDeck = [];
    for (let i = 0; i < 5; i++) startDeck.push(makeCardInstance(findCardDef("cam")));
    for (let i = 0; i < 4; i++) startDeck.push(makeCardInstance(findCardDef("coll")));
    startDeck.push(makeCardInstance(findCardDef("athelas")));

    run = {
        floor: 0,
        hp: 60, maxHp: 60,
        gold: 20,
        deck: startDeck,
        relics: [],
        wordsLearnedThisRun: new Set(),
        energyMaxBase: 3
    };
    goToNextFloor();
}

function findCardDef(form) { return CARD_DEFS.find(c => c.form === form); }

function makeCardInstance(def) {
    return {
        uid: Math.random().toString(36).slice(2),
        form: def.form, part: def.part, kind: def.kind, name: def.name,
        baseCost: def.cost, dmg: def.dmg || 0, block: def.block || 0, heal: def.heal || 0,
        draw: def.draw || 0, buffStrength: def.buffStrength || 0, energyGain: def.energyGain || 0,
        weakenEnemy: def.weakenEnemy || 0, retainBlock: !!def.retainBlock,
        startTurnBlock: def.startTurnBlock || 0, drawBonus: def.drawBonus || 0,
        exileAfterUse: !!def.exileAfterUse, flavorTpl: def.flavorTpl, isStarter: !!def.isStarter,
        mastered: isEverMastered(def.form, def.part)
    };
}

function cardCost(card) { return Math.max(0, card.baseCost - (card.mastered ? 1 : 0)); }
function cardVal(card, field) {
    const base = card[field] || 0;
    if (!base) return 0;
    return card.mastered ? base + 2 : base;
}
function cardEntry(card) { return getEntry(card.form, card.part); }
function cardFlavor(card) {
    return card.flavorTpl.replace("{w}", card.form);
}

// ============================================================
// 楼层地图
// ============================================================
function goToNextFloor() {
    run.floor++;
    if (run.floor > FLOOR_PLAN.length) { renderVictory(); return; }
    const options = FLOOR_PLAN[run.floor - 1];
    if (options.length === 1) { enterRoom(options[0]); return; }
    renderMap(options);
}

function roomMeta(type) {
    return {
        combat:   { icon: "⚔️", name: "遭遇战", desc: "遇上一只普通的塔中生物。" },
        elite:    { icon: "💀", name: "精英战", desc: "强大的敌人，胜利后有圣物奖励。" },
        rest:     { icon: "🔥", name: "篝火", desc: "歇息回复生命，或钻研辞典掌握词汇。" },
        shop:     { icon: "🏪", name: "矮人商店", desc: "cadhad 商人贩售圣物与卡牌精简服务。" },
        event:    { icon: "📜", name: "奇遇", desc: "一次辛达语小测验，答对有奖励。" },
        treasure: { icon: "🎁", name: "宝藏", desc: "解开辛达语谜题，开启宝箱。" },
        boss:     { icon: "👑", name: "塔顶：amarth", desc: "命运与终局，'doom' 在此等候。" }
    }[type];
}

function renderMap(options) {
    const cards = options.map((t, i) => {
        const m = roomMeta(t);
        return `<div class="room-card" onclick="enterRoom('${t}')">
            <div class="room-icon">${m.icon}</div>
            <div class="room-name">${m.name}</div>
            <div class="room-desc">${m.desc}</div>
        </div>`;
    }).join("");
    app.innerHTML = `
        ${statusBarHtml()}
        <h2 style="margin-top:0;">第 ${run.floor} 层 · 选择前路</h2>
        <div class="room-grid">${cards}</div>
    `;
}

function statusBarHtml() {
    const relicHtml = run.relics.length
        ? `<div class="relic-row">${run.relics.map(r => `<span class="relic"><span class="w">${r.form}</span> ${r.name}</span>`).join("")}</div>`
        : "";
    return `
        <div class="status-bar">
            <span class="stat hp">❤ ${run.hp}/${run.maxHp}</span>
            <span class="stat coin">🪙 ${run.gold}</span>
            <span class="stat floor">🗼 第 ${run.floor} 层 / ${FLOOR_PLAN.length}</span>
        </div>
        ${relicHtml}
    `;
}

function enterRoom(type) {
    if (type === "combat") startCombat(pick(EASY_POOL_forFloor()));
    else if (type === "elite") startCombat(pick(ELITE_POOL), true);
    else if (type === "boss") startCombat("amarth", false, true);
    else if (type === "rest") renderRest();
    else if (type === "shop") renderShop();
    else if (type === "event") renderEvent();
    else if (type === "treasure") renderTreasure();
}

function EASY_POOL_forFloor() {
    return run.floor <= 5 ? EASY_POOL : EASY_POOL.concat(MID_POOL);
}
function pick(arr) { return arr[Math.floor(Math.random() * arr.length)]; }

function leaveRoomBonus() {
    if (run.relics.some(r => r.effect === "goldBonus")) run.gold += 5;
}

// ============================================================
// 战斗系统
// ============================================================
function startCombat(enemyKey, isElite, isBoss) {
    const def = ENEMY_DEFS[enemyKey];
    const entry = getEntry(def.form, def.part);
    const energyMax = run.energyMaxBase + (run.relics.some(r => r.effect === "energyMax") ? 1 : 0);
    run.combat = {
        enemyKey, def, entry,
        enemyHp: def.hp, enemyMaxHp: def.hp, enemyBlock: 0, enemyStrength: 0,
        enemyPatternIdx: 0, enemyDoomStacks: 0, enemyNextAction: def.pattern[0],
        player: {
            energy: energyMax, energyMax,
            block: 0, strength: 0, keepBlockNextTurn: false,
            drawBonus: 0, startTurnBlock: 0, firstCardFreeUsed: false,
            vulnerable: 0,
            deck: shuffle(run.deck.slice()), hand: [], discard: [], exile: []
        },
        turn: 1,
        log: []
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
    const c = run.combat, p = c.player;
    const drawCount = 5 + p.drawBonus;
    for (let i = 0; i < drawCount; i++) drawOne();
}
function drawOne() {
    const p = run.combat.player;
    if (p.deck.length === 0) {
        if (p.discard.length === 0) return;
        addLog("牌堆已空，洗入弃牌堆重新抽取。", "info");
        p.deck = shuffle(p.discard.splice(0));
    }
    p.hand.push(p.deck.pop());
}

function addLog(text, cls) {
    run.combat.log.unshift({ text, cls: cls || "info" });
    if (run.combat.log.length > 30) run.combat.log.pop();
}

function renderCombat() {
    const c = run.combat, p = c.player;
    const enemyIntentText = describeIntent(c.enemyNextAction, c);
    const handHtml = p.hand.map(card => cardHtml(card)).join("") || "<p style='color:#7f8c8d;'>（手牌已空）</p>";
    app.innerHTML = `
        ${statusBarHtml()}
        <div class="foe-box">
            ${c.def.elite ? "<div style='color:#c0392b;font-weight:700;font-size:12px;'>⚠ 精英</div>" : ""}
            ${c.def.boss ? "<div style='color:#c0392b;font-weight:700;font-size:12px;'>👑 首领</div>" : ""}
            <div class="foe-name">${c.def.name}</div>
            <div class="foe-gloss">${c.def.hp === c.enemyMaxHp ? "" : ""}HP ${c.enemyHp}/${c.enemyMaxHp}${c.enemyBlock ? " · 护甲 " + c.enemyBlock : ""}${c.enemyStrength ? " · 力量 +" + c.enemyStrength : ""}</div>
            <div class="bar-outer" style="max-width:320px;margin:8px auto 0;"><div class="bar-inner foe" style="width:${Math.max(0, c.enemyHp / c.enemyMaxHp * 100)}%;"></div></div>
            <div class="foe-intent">${enemyIntentText}</div>
        </div>
        <div class="status-bar" style="justify-content:center;">
            <span class="stat energy">⚡ ${p.energy}/${p.energyMax}</span>
            <span class="stat block">🛡 ${p.block}</span>
            ${p.strength ? `<span class="stat">💪 力量 +${p.strength}</span>` : ""}
            ${p.vulnerable ? `<span class="stat" style="color:#c0392b;">☠ 易伤</span>` : ""}
        </div>
        <div class="hand">${handHtml}</div>
        <div class="btn-row">
            <button class="primary-btn" onclick="endPlayerTurn()">结束回合</button>
        </div>
        <div class="log">${c.log.map(l => `<div class="log-${l.cls}">${l.text}</div>`).join("")}</div>
    `;
}

function describeIntent(action, c) {
    if (!action) return "？";
    const str = c.enemyStrength || 0;
    if (action.t === "attack") return `⚔ 攻击 ${action.v + str}`;
    if (action.t === "defend") return `🛡 防御 ${action.v}`;
    if (action.t === "buff") return `💪 蓄力 +${action.v}`;
    if (action.t === "heal") return `✚ 回复 ${action.v}`;
    if (action.t === "curse") return `🌀 诅咒`;
    if (action.t === "vulnerable") return `☠ 施加易伤`;
    if (action.t === "doom") return `⏳ 命运降临（力量永久+3 并攻击）`;
    return "？";
}

function cardHtml(card) {
    const cost = cardCost(card);
    const affordable = cost <= run.combat.player.energy;
    const entry = cardEntry(card);
    const meaning = card.mastered ? shortDef(entry) : "？？？（未掌握）";
    const effectParts = [];
    if (cardVal(card, "dmg")) effectParts.push(`造成 ${cardVal(card, "dmg")} 点伤害`);
    if (cardVal(card, "block")) effectParts.push(`获得 ${cardVal(card, "block")} 点护甲`);
    if (cardVal(card, "heal")) effectParts.push(`恢复 ${cardVal(card, "heal")} 点生命`);
    if (card.draw) effectParts.push(`抽 ${card.draw} 张牌`);
    if (card.buffStrength) effectParts.push(`力量 +${card.buffStrength}（永久）`);
    if (card.energyGain) effectParts.push(`获得 ${card.energyGain} 点能量`);
    if (card.weakenEnemy) effectParts.push(`敌方下次攻击 -${card.weakenEnemy}`);
    if (card.startTurnBlock) effectParts.push(`此后每回合开始获得 ${card.startTurnBlock} 护甲`);
    if (card.drawBonus) effectParts.push(`此后每回合多抽 ${card.drawBonus} 张牌`);
    if (card.retainBlock) effectParts.push(`护甲可保留至下回合`);
    return `
        <div class="card ${card.mastered ? "mastered" : ""} ${affordable ? "" : "unaffordable"}" onclick="playCard('${card.uid}')">
            <div class="card-cost">${cost}</div>
            <div class="card-word">${card.form}</div>
            <div class="card-part">${card.part} · ${card.name}</div>
            <div class="card-effect">${effectParts.join("；")}</div>
            <div class="card-meaning">${meaning}</div>
        </div>
    `;
}

function playCard(uid) {
    const c = run.combat, p = c.player;
    const idx = p.hand.findIndex(x => x.uid === uid);
    if (idx === -1) return;
    const card = p.hand[idx];
    let cost = cardCost(card);
    const firstCardFree = run.relics.some(r => r.effect === "firstCardFree") && !p.firstCardFreeUsed;
    if (firstCardFree) cost = 0;
    if (cost > p.energy) return;
    p.energy -= cost;
    if (firstCardFree) p.firstCardFreeUsed = true;

    // 结算效果
    const dmg = cardVal(card, "dmg");
    if (dmg) dealDamageToEnemy(dmg + (p.strength || 0));
    const block = cardVal(card, "block");
    if (block) { p.block += block; if (card.retainBlock) p.keepBlockNextTurn = true; }
    const heal = cardVal(card, "heal");
    if (heal) { run.hp = Math.min(run.maxHp, run.hp + heal); }
    if (card.draw) for (let i = 0; i < card.draw; i++) drawOne();
    if (card.buffStrength) p.strength += card.buffStrength;
    if (card.energyGain) p.energy += card.energyGain;
    if (card.weakenEnemy) c.pendingWeaken = (c.pendingWeaken || 0) + card.weakenEnemy;
    if (card.startTurnBlock) p.startTurnBlock += card.startTurnBlock;
    if (card.drawBonus) p.drawBonus += card.drawBonus;

    addLog(`你使用了 <b>${card.form}</b>（${card.name}）。`, "good");

    // 移除手牌
    p.hand.splice(idx, 1);
    if (card.kind === "power") {
        // power 卡不进入弃牌堆，效果已永久生效
    } else if (card.exileAfterUse) {
        p.exile.push(card);
        // 同时从整局牌组中移除（这张具体实例）
        run.deck = run.deck.filter(x => x.uid !== card.uid);
    } else {
        p.discard.push(card);
    }

    if (c.enemyHp <= 0) { winCombat(); return; }
    renderCombat();
}

function dealDamageToEnemy(amount) {
    const c = run.combat;
    let dmg = amount;
    if (c.enemyBlock > 0) {
        const absorbed = Math.min(c.enemyBlock, dmg);
        c.enemyBlock -= absorbed; dmg -= absorbed;
    }
    c.enemyHp = Math.max(0, c.enemyHp - dmg);
}

function endPlayerTurn() {
    const c = run.combat, p = c.player;
    // 弃掉剩余手牌
    p.discard.push(...p.hand.splice(0));
    enemyAct();
    if (run.hp <= 0) { renderDefeat(); return; }
    if (c.enemyHp <= 0) { winCombat(); return; }

    // 新回合
    c.turn++;
    p.block = p.keepBlockNextTurn ? p.block : 0;
    p.keepBlockNextTurn = false;
    if (p.startTurnBlock) p.block += p.startTurnBlock;
    if (p.vulnerable > 0) p.vulnerable--;
    p.energy = p.energyMax;
    p.firstCardFreeUsed = false;
    drawHand();
    renderCombat();
}

function enemyAct() {
    const c = run.combat, p = c.player;
    const action = c.enemyNextAction;
    if (action.t === "attack") {
        let val = action.v + (c.enemyStrength || 0);
        if (c.pendingWeaken) { val = Math.max(0, val - c.pendingWeaken); c.pendingWeaken = 0; }
        if (p.vulnerable > 0) val = Math.round(val * 1.5);
        let remain = val;
        if (p.block > 0) { const absorbed = Math.min(p.block, remain); p.block -= absorbed; remain -= absorbed; }
        run.hp -= remain;
        addLog(`${c.def.name} 发起攻击，你受到 ${remain} 点伤害。`, "bad");
    } else if (action.t === "defend") {
        c.enemyBlock += action.v;
        addLog(`${c.def.name} 获得了 ${action.v} 点护甲。`, "info");
    } else if (action.t === "buff") {
        c.enemyStrength += action.v;
        addLog(`${c.def.name} 蓄力，力量提升了 ${action.v}。`, "bad");
    } else if (action.t === "heal") {
        c.enemyHp = Math.min(c.enemyMaxHp, c.enemyHp + action.v);
        addLog(`${c.def.name} 恢复了 ${action.v} 点生命。`, "bad");
    } else if (action.t === "curse") {
        addLog(`${c.def.name} 向你的牌组中混入了一丝混乱的低语……`, "bad");
    } else if (action.t === "vulnerable") {
        p.vulnerable = 2;
        addLog(`${c.def.name} 令你陷入易伤状态，下次受到的伤害将提高！`, "bad");
    } else if (action.t === "doom") {
        c.enemyStrength += 3;
        addLog(`${c.def.name} 的命运之力永久增强了 3 点力量……`, "bad");
    }
    c.enemyPatternIdx = (c.enemyPatternIdx + 1) % c.def.pattern.length;
    c.enemyNextAction = c.def.pattern[c.enemyPatternIdx];
}

function winCombat() {
    const c = run.combat;
    addLog(`你击败了 ${c.def.name}！`, "good");
    run.wordsLearnedThisRun.add(c.def.form + "|" + c.def.part);
    // 战后圣物治疗
    if (run.relics.some(r => r.effect === "healAfterCombat")) run.hp = Math.min(run.maxHp, run.hp + 5);
    const gold = c.def.boss ? 80 : c.def.elite ? 45 : 20 + Math.floor(Math.random() * 10);
    run.gold += gold;
    leaveRoomBonus();

    // 把本场用过的卡收回真实牌组（去掉已用尽的消耗品）
    run.deck = run.deck.filter(cd => !c.player.exile.some(ex => ex.uid === cd.uid));

    if (c.def.boss) { renderVictory(); return; }

    const relicReward = c.def.elite ? pickRelicReward() : null;
    offerCardReward(relicReward, gold);
}

function pickRelicReward() {
    const owned = new Set(run.relics.map(r => r.form));
    const pool = RELIC_DEFS.filter(r => !owned.has(r.form));
    if (pool.length === 0) return null;
    return pool[Math.floor(Math.random() * pool.length)];
}

function offerCardReward(relicReward, goldEarned) {
    const pool = CARD_DEFS.filter(c => !STARTER_FORMS.includes(c.form));
    const picks = shuffle(pool.slice()).slice(0, 3);
    const cardsHtml = picks.map((def, i) => {
        const entry = getEntry(def.form, def.part);
        return `<div class="card" style="width:170px;" onclick="chooseReward(${i})">
            <div class="card-cost">${def.cost}</div>
            <div class="card-word">${def.form}</div>
            <div class="card-part">${def.part} · ${def.name}</div>
            <div class="card-effect">${def.flavorTpl.replace("{w}", def.form)}</div>
            <div class="card-meaning">？？？（选择后测验揭晓）</div>
        </div>`;
    }).join("");
    app.innerHTML = `
        ${statusBarHtml()}
        <h2 style="margin-top:0;">战斗胜利！获得 ${goldEarned} 金币</h2>
        ${relicReward ? `<p>作为精英战利品，你还获得了圣物 <b>${relicReward.form}</b>（${relicReward.name}）。</p>` : ""}
        <p style="color:#7f8c8d;">选择一张卡牌加入牌组。选中后会触发一次词义测验：答对将<b>掌握</b>该词，卡牌费用-1、数值增强，并永久解锁释义。</p>
        <div class="hand">${cardsHtml}</div>
        <div class="btn-row"><button class="secondary-btn" onclick="skipReward()">跳过奖励</button></div>
    `;
    run.pendingReward = { picks, relicReward };
}

function chooseReward(i) {
    const { picks, relicReward } = run.pendingReward;
    const def = picks[i];
    if (relicReward) run.relics.push(relicReward);
    quizTranslation(def.form, def.part, (correct) => {
        const card = makeCardInstance(def);
        card.mastered = correct || card.mastered;
        run.deck.push(card);
        run.pendingReward = null;
        goToNextFloor();
    });
}

function skipReward() {
    const { relicReward } = run.pendingReward || {};
    if (relicReward) run.relics.push(relicReward);
    run.pendingReward = null;
    goToNextFloor();
}

// ============================================================
// 篝火
// ============================================================
function renderRest() {
    const unmastered = run.deck.filter(c => !c.mastered);
    app.innerHTML = `
        ${statusBarHtml()}
        <h2 style="margin-top:0;">🔥 篝火 · Naur</h2>
        <p style="color:#7f8c8d;">在温暖的火光中，你可以二选一：安心歇息，或钻研辞典掌握一个尚未掌握的词。</p>
        <div class="room-grid">
            <div class="room-card" onclick="restHeal()">
                <div class="room-icon">🛌</div>
                <div class="room-name">歇息</div>
                <div class="room-desc">恢复 30% 最大生命值（${Math.round(run.maxHp * 0.3)} 点）。</div>
            </div>
            <div class="room-card" onclick="${unmastered.length ? "restStudy()" : ""}" style="${unmastered.length ? "" : "opacity:.4;cursor:not-allowed;"}">
                <div class="room-icon">📚</div>
                <div class="room-name">钻研辞典</div>
                <div class="room-desc">${unmastered.length ? "挑战一次音变测验，成功即可掌握一张未掌握的卡牌。" : "牌组中已无未掌握的词。"}</div>
            </div>
        </div>
    `;
}
function restHeal() {
    run.hp = Math.min(run.maxHp, run.hp + Math.round(run.maxHp * 0.3));
    leaveRoomBonus();
    goToNextFloor();
}
function restStudy() {
    const unmastered = run.deck.filter(c => !c.mastered);
    const card = unmastered[Math.floor(Math.random() * unmastered.length)];
    quizMutation(card.form, card.part, (correct) => {
        if (correct) {
            run.deck.filter(c => c.form === card.form && c.part === card.part).forEach(c => c.mastered = true);
        }
        leaveRoomBonus();
        goToNextFloor();
    });
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
        <div class="room-card" style="cursor:default;">
            <div class="room-icon">💠</div>
            <div class="room-name">${item.relic.form} · ${item.relic.name}</div>
            <div class="room-desc">${item.relic.desc}</div>
            <p style="font-weight:700;margin:8px 0 4px;">价格：🪙${item.price}${item.discounted ? "（已享测验折扣）" : ""}</p>
            <div class="btn-row">
                ${!item.discounted ? `<button class="secondary-btn" onclick="shopQuizDiscount(${i})">辞典挑战享8折</button>` : ""}
                <button class="primary-btn" onclick="buyRelic(${i})">购买</button>
            </div>
        </div>
    `).join("");
    const removable = run.deck.length > 0;
    app.innerHTML = `
        ${statusBarHtml()}
        <h2 style="margin-top:0;">🏪 矮人商店 · cadhad</h2>
        <p style="color:#7f8c8d;">一位 cadhad（矮人）商人在此摆摊，出售圣物，也提供卡牌精简服务。</p>
        <div class="room-grid">${items}</div>
        <div class="panel" style="box-shadow:none;border:1px dashed #dfe4ea;margin-top:16px;">
            <h3 style="margin-top:0;">移除一张卡牌 · 🪙40</h3>
            <p style="color:#7f8c8d;font-size:13px;">精简牌组，让强力卡更容易被抽到。</p>
            <button class="secondary-btn" ${removable ? "" : "disabled"} onclick="openRemoveCard()">选择要移除的卡牌</button>
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
    run.gold -= item.price;
    run.relics.push(item.relic);
    run.shopStock.splice(i, 1);
    renderShopView();
}
function openRemoveCard() {
    const cardsHtml = run.deck.map((c, i) => `
        <div class="card" style="width:150px;" onclick="removeCard(${i})">
            <div class="card-cost">${cardCost(c)}</div>
            <div class="card-word">${c.form}</div>
            <div class="card-part">${c.part} · ${c.name}</div>
        </div>
    `).join("");
    showModal(`
        <h3>选择要移除的卡牌</h3>
        <div class="hand">${cardsHtml}</div>
        <div class="btn-row"><button class="secondary-btn" onclick="closeModal()">取消</button></div>
    `);
}
function removeCard(i) {
    if (run.gold < 40) { alert("金币不足！"); closeModal(); return; }
    run.gold -= 40;
    run.deck.splice(i, 1);
    closeModal();
    renderShopView();
}
function leaveShop() { leaveRoomBonus(); goToNextFloor(); }

// ============================================================
// 事件
// ============================================================
function renderEvent() {
    const term = randomTerm();
    app.innerHTML = `
        ${statusBarHtml()}
        <h2 style="margin-top:0;">📜 奇遇 · Aphadad</h2>
        <p style="color:#7f8c8d;">一位游吟诗人考验你的辛达语——回答正确可获得金币与治疗，答错会有小损失。</p>
        <div class="btn-row"><button class="primary-btn" onclick="doEvent('${term.form}','${term.part}')">接受考验</button></div>
    `;
}
function doEvent(form, part) {
    quizTranslation(form, part, (correct) => {
        if (correct) { run.gold += 15; run.hp = Math.min(run.maxHp, run.hp + 5); addEventNote("回答正确！获得 15 金币与 5 点生命恢复。"); }
        else { run.hp = Math.max(1, run.hp - 5); addEventNote("回答错误，损失了 5 点生命。"); }
        leaveRoomBonus();
    });
}
function addEventNote(text) {
    // 事件结算后短暂展示提示再进入下一层
    showModal(`<h3>奇遇结果</h3><p>${text}</p><div class="btn-row"><button class="primary-btn" onclick="closeModal();goToNextFloor();">继续</button></div>`);
}

// ============================================================
// 宝藏
// ============================================================
function renderTreasure() {
    const term = randomTerm();
    app.innerHTML = `
        ${statusBarHtml()}
        <h2 style="margin-top:0;">🎁 宝藏 · Aur</h2>
        <p style="color:#7f8c8d;">箱子上刻着一个辛达语单词的谜题，答对可开启完整宝藏。</p>
        <div class="btn-row"><button class="primary-btn" onclick="doTreasure('${term.form}','${term.part}')">解谜开箱</button></div>
    `;
}
function doTreasure(form, part) {
    quizTranslation(form, part, (correct) => {
        let text;
        if (correct) {
            const relic = pickRelicReward();
            const gold = 40;
            run.gold += gold;
            if (relic) { run.relics.push(relic); text = `解谜成功！获得圣物 <b>${relic.form}</b>（${relic.name}）与 ${gold} 金币。`; }
            else text = `解谜成功！获得 ${gold} 金币。`;
        } else {
            const gold = 15;
            run.gold += gold;
            text = `解谜失败，宝箱只弹出了一半——获得 ${gold} 金币。`;
        }
        leaveRoomBonus();
        showModal(`<h3>宝藏结果</h3><p>${text}</p><div class="btn-row"><button class="primary-btn" onclick="closeModal();goToNextFloor();">继续</button></div>`);
    });
}

function randomTerm() { return ALL_TERMS[Math.floor(Math.random() * ALL_TERMS.length)]; }

// ============================================================
// 测验：词义选择题
// ============================================================
function quizTranslation(form, part, callback) {
    const entry = getEntry(form, part);
    const correctDef = shortDef(entry);
    const distractorPool = ALL_TERMS
        .filter(t => !(t.form === form && t.part === part))
        .map(t => shortDef(t.entry))
        .filter(d => d !== correctDef);
    const distractors = shuffle(Array.from(new Set(distractorPool))).slice(0, 3);
    const options = shuffle([{ text: correctDef, correct: true }, ...distractors.map(d => ({ text: d, correct: false }))]);

    const optHtml = options.map((o, i) => `<button class="option-btn" id="opt-${i}" onclick="answerTranslation(${i})">${escapeHtml(o.text)}</button>`).join("");
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
// 测验：音变 / 变位填空题
// ============================================================
function quizMutation(form, part, callback) {
    const entry = getEntry(form, part);
    const morph = (entry.morphology || []).filter(m => m.form && m.form.trim());
    if (morph.length === 0) { callback(false); return; }
    const item = morph[Math.floor(Math.random() * morph.length)];
    const label = MUTATION_LABELS[item.type] || item.type;
    const specialChars = ["á","é","í","ó","ú","ý","â","ê","î","ô","û","ŷ","ñ"];
    showModal(`
        <h3>音变 / 变位测验</h3>
        <p class="modal-hint">请写出 <b>${form}</b>（${part}）的「${label}」形式：</p>
        <div class="modal-word">${form}</div>
        <input type="text" id="mutationInput" placeholder="在此输入答案">
        <div class="char-row">${specialChars.map(c => `<button type="button" class="char-btn" onclick="insertChar('${c}')">${c}</button>`).join("")}</div>
        <div class="btn-row"><button class="primary-btn" onclick="answerMutation()">提交答案</button></div>
        <div id="quiz-result"></div>
    `);
    window.__mutationPending = { form, part, correctForm: item.form, callback, label };
    setTimeout(() => { const el = document.getElementById("mutationInput"); if (el) el.focus(); }, 50);
}
function insertChar(c) {
    const el = document.getElementById("mutationInput");
    if (!el) return;
    const start = el.selectionStart || el.value.length;
    const end = el.selectionEnd || el.value.length;
    el.value = el.value.slice(0, start) + c + el.value.slice(end);
    el.focus();
    el.selectionStart = el.selectionEnd = start + 1;
}
function answerMutation() {
    const { form, part, correctForm, callback } = window.__mutationPending;
    const el = document.getElementById("mutationInput");
    const userVal = (el.value || "").trim().toLowerCase();
    const alts = correctForm.split("/").map(s => s.trim().toLowerCase());
    const correct = alts.includes(userVal);
    document.getElementById("quiz-result").innerHTML = `
        <p style="margin-top:10px;font-weight:600;color:${correct ? "#27ae60" : "#c0392b"};">
            ${correct ? "✔ 回答正确！" : `✘ 回答错误。正确形式为：<i>${escapeHtml(correctForm)}</i>`}
        </p>
        <div class="btn-row"><button class="primary-btn" onclick="finishMutationQuiz(${correct})">继续</button></div>
    `;
    document.getElementById("mutationInput").disabled = true;
    window.__mutationPending.callback = callback; // keep
    window.__mutationPending.correct = correct;
}
function finishMutationQuiz(correct) {
    const { form, part, callback } = window.__mutationPending;
    markMastery(form, part, correct);
    closeModal();
    callback(correct);
}

// ============================================================
// 通用弹窗
// ============================================================
function showModal(innerHtml) {
    overlay.innerHTML = `<div class="modal">${innerHtml}</div>`;
    overlay.classList.remove("hidden");
}
function closeModal() {
    overlay.classList.add("hidden");
    overlay.innerHTML = "";
}

// ============================================================
// 结局
// ============================================================
function renderDefeat() {
    app.innerHTML = `
        <div style="text-align:center;padding:30px 0;">
            <h2>你倒在了第 ${run.floor} 层……</h2>
            <p style="color:#7f8c8d;">i-vith dhannen. 塔仍在，词汇的记忆已经留下。</p>
            <p>本局学习进度已计入你的生词手册（前往手册查看 ★ 掌握情况）。</p>
            <div class="btn-row">
                <button class="primary-btn" onclick="startRun()">再次挑战</button>
                <button class="secondary-btn" onclick="renderTitle()">返回标题</button>
            </div>
        </div>
    `;
}
function renderVictory() {
    app.innerHTML = `
        <div style="text-align:center;padding:30px 0;">
            <h2>🎉 你登上了塔顶！</h2>
            <p style="color:#7f8c8d;">Aphadon i-amarth. 你战胜了命运本身。</p>
            <p>本次攀登共积累了 ${run.gold} 金币，掌握词汇会在生词手册中持续累积。</p>
            <div class="btn-row">
                <button class="primary-btn" onclick="startRun()">再次攀登</button>
                <button class="secondary-btn" onclick="renderTitle()">返回标题</button>
            </div>
        </div>
    `;
}

// ============================================================
// 主题切换
// ============================================================
function toggleTheme() {
    const html = document.documentElement;
    const btn = document.getElementById("theme-toggle");
    const cur = html.getAttribute("data-theme");
    const next = cur === "dark" ? "light" : "dark";
    html.setAttribute("data-theme", next);
    btn.textContent = next === "dark" ? "☀ 模式" : "☾ 模式";
    localStorage.setItem("theme", next);
}
(function () {
    const btn = document.getElementById("theme-toggle");
    if (document.documentElement.getAttribute("data-theme") === "dark") btn.textContent = "☀ 模式";
})();
