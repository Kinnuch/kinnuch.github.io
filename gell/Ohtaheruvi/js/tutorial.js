// 新手教程：分步引导卡片 + 界面高亮
// 有 check 的步骤在条件达成时自动前进（不用玩家自己点「下一步」）。

import * as S from './state.js';

const el = (tag, cls, text) => {
  const n = document.createElement(tag);
  if (cls) n.className = cls;
  if (text != null) n.textContent = text;
  return n;
};

const STEPS = [
  {
    title: '你的目标',
    body: '控制全图三分之二的城市即获胜。城市给你金币，金币供养军队，军队夺取更多城市——整局就在这个循环里推进。',
  },
  {
    title: '看清脚下',
    body: '点地图上任意一格，左下的「地块」面板会告诉你这格是什么地形、进入要花几点移动力、哪些兵种在这里打得更好。山地只有矮人、山怪这类山地系和会飞的能进；河流必须走浅滩或桥。',
    spot: '#tilePanel',
    check: (ui) => !!ui.inspect,
  },
  {
    title: '选中你的军团',
    body: '地图上的圆形徽章就是一支军团，里面最多能装 8 个单位；徽章上的数字是队列里最强单位的强度，右上角小圈是单位数量，头顶金冠表示有英雄同行。点它，左侧「军团队列」会列出全部单位。',
    spot: '#stackPanel',
    check: (ui) => !!ui.selectedArmy,
  },
  {
    title: '移动，以及后悔',
    body: '选中军团后，地图上会用金色描出这一回合能走到的范围，点范围内任意一格即可移动。走错了就按左上角的「撤回移动」（或 Ctrl+Z）——只要你还没打仗、没探遗迹，走多少步都能一步步退回来。',
    spot: '#undoBtn',
    check: (ui) => S.canUndo(ui.G),
  },
  {
    title: '只派一部分人出去',
    body: '队列里的单位可以单独勾选。只勾中英雄，他就能一个人跑去探遗迹，剩下的守在城里——这在前期非常重要，因为遗迹里的神器和盟友是白捡的战力。',
    spot: '#stackPanel',
  },
  {
    title: '城市与生产',
    body: '点自己的城市，右侧会铺开这座城能造的兵种卡片，每张卡上写着强度、耐久、移动、造价、每回合维护费和建造回合数。选一张就开始造，造完会自动接着造同一种。注意维护费——养不起时会从最贵的开始自动解散。',
    spot: '#cityPanel',
    check: (ui) => !!ui.selectedCity,
  },
  {
    title: '投送',
    body: '城市面板底部可以指定「投送目标」：这座城造出来的兵会自动开赴另一座城（在途 2 回合），不用你每回合手动押送。前线吃紧时，把后方几座城全部投送到前线，是这个游戏最省心的操作。',
    spot: '#cityPanel',
  },
  {
    title: '打仗之前先看胜率',
    body: '点相邻的敌军或敌城会先弹出战前预估：两边每个单位的修正后强度、各项加成的来源、以及两千次模拟算出的胜率。战斗是一对一的连续决斗，死一个换下一个，直到一方全灭——没有撤退，所以开打前一定看这张表。',
  },
  {
    title: '看看大势',
    body: '顶栏的「统计曲线」按回合画出各方的金币、城池数与部队数。你被拖开差距通常先反映在金币曲线上，比等到城丢了才发现要早得多。',
    spot: '#statsBtn',
  },
  {
    title: '结束回合',
    body: '按「结束回合」或空格。轮到 AI 时它会自动走完，然后直接回到你这里，屏幕中央会浮出回合提示。Tab 键可以在还没动过的军团之间循环，避免漏掉谁。',
    spot: '#endTurn',
  },
];

export function startTutorial(ui) {
  ui.tutorial = { idx: 0 };
  render(ui);
}

export function tutorialTick(ui) {
  const t = ui.tutorial;
  if (!t) return;
  const step = STEPS[t.idx];
  if (step && step.check && step.check(ui) && !t.satisfied) {
    t.satisfied = true;
    const card = document.getElementById('tutorCard');
    if (card) card.classList.add('done');
  }
}

function clearSpot() {
  document.querySelectorAll('.tutor-spot').forEach((n) => n.classList.remove('tutor-spot'));
}

function render(ui) {
  const t = ui.tutorial;
  document.getElementById('tutorCard')?.remove();
  clearSpot();
  if (!t) return;
  const step = STEPS[t.idx];
  if (!step) { endTutorial(ui); return; }
  t.satisfied = false;

  const card = el('div', 'tutor-card');
  card.id = 'tutorCard';
  card.appendChild(el('div', 'tutor-step', `新手教程 ${t.idx + 1} / ${STEPS.length}`));
  card.appendChild(el('h4', null, step.title));
  card.appendChild(el('p', null, step.body));

  const bar = el('div', 'tutor-bar');
  if (t.idx > 0) {
    const prev = el('button', 'mini', '上一步');
    prev.onclick = () => { t.idx--; render(ui); };
    bar.appendChild(prev);
  }
  const skip = el('button', 'mini', '跳过教程');
  skip.onclick = () => endTutorial(ui);
  bar.appendChild(skip);
  const next = el('button', 'mini gold', t.idx === STEPS.length - 1 ? '开始游戏' : '下一步');
  next.onclick = () => { t.idx++; render(ui); };
  bar.appendChild(next);
  card.appendChild(bar);

  document.body.appendChild(card);

  if (step.spot) {
    const target = document.querySelector(step.spot);
    if (target) target.classList.add('tutor-spot');
  }
}

export function endTutorial(ui) {
  ui.tutorial = null;
  document.getElementById('tutorCard')?.remove();
  clearSpot();
  try { localStorage.setItem('ohta.tutorialDone', '1'); } catch { /* 无痕模式忽略 */ }
}

export const tutorialSeen = () => {
  try { return localStorage.getItem('ohta.tutorialDone') === '1'; } catch { return false; }
};
