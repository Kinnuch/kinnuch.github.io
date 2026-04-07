// ====================================================================
// 真实恒星数据 (RA 单位:小时, Dec 单位:度) - 来自 Hipparcos 星表
// 包含夜空中视星等 < ~3.0 的主要亮星
// ====================================================================
const STARS = [
  // [name, bayer, constellation, RA(h), Dec(deg), mag, dist, spec, desc]
  ["天狼星","α CMa","大犬座",6.7525,-16.7161,-1.46,"8.6 光年","A1V","夜空中最亮的恒星，双星系统。"],
  ["老人星","α Car","船底座",6.3992,-52.6957,-0.74,"310 光年","A9II","夜空第二亮星，南天导航星。"],
  ["南门二","α Cen","半人马座",14.6600,-60.8354,-0.27,"4.37 光年","G2V","离太阳最近的恒星系统之一。"],
  ["大角星","α Boo","牧夫座",14.2610,19.1825,-0.05,"36.7 光年","K1.5III","北天最亮恒星，橙色红巨星。"],
  ["织女星","α Lyr","天琴座",18.6156,38.7837,0.03,"25 光年","A0V","夏季大三角之一，视星等零点参考。"],
  ["五车二","α Aur","御夫座",5.2782,45.9980,0.08,"42.9 光年","G3III","四合星系统，北天第三亮星。"],
  ["参宿七","β Ori","猎户座",5.2423,-8.2017,0.13,"860 光年","B8Ia","蓝白超巨星，光度达太阳12万倍。"],
  ["南河三","α CMi","小犬座",7.6550,5.2250,0.34,"11.46 光年","F5IV-V","冬季大三角之一，双星。"],
  ["水委一","α Eri","波江座",1.6286,-57.2367,0.46,"139 光年","B6Vpe","自转极快，呈扁球形。"],
  ["参宿四","α Ori","猎户座",5.9195,7.4071,0.50,"548 光年","M1-2Ia","红超巨星，未来或发生超新星爆发。"],
  ["马腹一","β Cen","半人马座",14.0637,-60.3730,0.61,"390 光年","B1III","南十字附近三合星。"],
  ["河鼓二","α Aql","天鹰座",19.8464,8.8683,0.77,"16.7 光年","A7V","牛郎星，夏季大三角之一。"],
  ["十字架二","α Cru","南十字座",12.4433,-63.0991,0.77,"321 光年","B0.5IV","南十字最亮星。"],
  ["毕宿五","α Tau","金牛座",4.5987,16.5093,0.85,"65 光年","K5III","金牛之眼，橙色巨星。"],
  ["角宿一","α Vir","室女座",13.4199,-11.1614,0.97,"250 光年","B1III-IV","室女座最亮星，蓝色双星。"],
  ["心宿二","α Sco","天蝎座",16.4901,-26.4320,1.09,"550 光年","M1.5Iab","天蝎之心，红超巨星。"],
  ["北落师门","α PsA","南鱼座",22.9608,-29.6222,1.16,"25 光年","A4V","秋季南天孤独亮星。"],
  ["天津四","α Cyg","天鹅座",20.6905,45.2803,1.25,"2615 光年","A2Ia","夏季大三角之一，蓝白超巨星。"],
  ["十字架三","β Cru","南十字座",12.7953,-59.6887,1.25,"280 光年","B0.5III","南十字第二亮星。"],
  ["轩辕十四","α Leo","狮子座",10.1395,11.9672,1.36,"79 光年","B7V","狮子之心，多重星系统。"],
  ["弧矢七","ε CMa","大犬座",6.9770,-28.9721,1.50,"430 光年","B2II","紫外辐射极强。"],
  ["十字架一","γ Cru","南十字座",12.5194,-57.1133,1.63,"88 光年","M3.5III","红巨星。"],
  ["参宿五","γ Ori","猎户座",5.4188,6.3497,1.64,"250 光年","B2III","猎户右肩，蓝巨星。"],
  ["北河三","β Gem","双子座",7.7553,28.0262,1.14,"34 光年","K0III","双子座最亮，已知有行星。"],
  ["北河二","α Gem","双子座",7.5766,31.8884,1.58,"51 光年","A1V","六合星系统。"],
  ["御夫座β","β Aur","御夫座",5.9921,44.9474,1.90,"82 光年","A1IV","食双星。"],
  ["开阳","ζ UMa","大熊座",13.3988,54.9254,2.04,"83 光年","A1V","北斗六，著名目视双星。"],
  ["天枢","α UMa","大熊座",11.0621,61.7508,1.79,"123 光年","K0III","北斗一。"],
  ["天璇","β UMa","大熊座",11.0307,56.3824,2.37,"79 光年","A1V","北斗二。"],
  ["天玑","γ UMa","大熊座",11.8972,53.6948,2.44,"83 光年","A0V","北斗三。"],
  ["天权","δ UMa","大熊座",12.2571,57.0326,3.31,"81 光年","A3V","北斗四，最暗。"],
  ["玉衡","ε UMa","大熊座",12.9005,55.9598,1.77,"82 光年","A1III","北斗五。"],
  ["摇光","η UMa","大熊座",13.7923,49.3133,1.86,"101 光年","B3V","北斗七。"],
  ["北极星","α UMi","小熊座",2.5302,89.2641,1.98,"433 光年","F7Ib","当前北天极星。"],
  ["参宿一","ζ Ori","猎户座",5.6793,-1.9426,1.77,"1260 光年","O9.5Ib","猎户腰带左星。"],
  ["参宿二","ε Ori","猎户座",5.6036,-1.2019,1.69,"1340 光年","B0Ia","猎户腰带中星。"],
  ["参宿三","δ Ori","猎户座",5.5334,-0.2991,2.23,"1200 光年","O9.5II","猎户腰带右星。"],
  ["参宿六","κ Ori","猎户座",5.7959,-9.6697,2.06,"650 光年","B0.5Ia","猎户左脚。"],
  ["天蝎座λ","λ Sco","天蝎座",17.5601,-37.1038,1.62,"570 光年","B1.5IV","天蝎尾刺。"],
  ["天蝎座θ","θ Sco","天蝎座",17.6217,-42.9978,1.86,"300 光年","F0II","天蝎尾部。"],
  ["箕宿三","ε Sgr","人马座",18.4029,-34.3846,1.85,"143 光年","B9.5III","人马座最亮。"],
  ["斗宿四","σ Sgr","人马座",18.9211,-26.2967,2.05,"228 光年","B2.5V","南斗一星。"],
  ["天棓四","β UMi","小熊座",14.8451,74.1555,2.08,"131 光年","K4III","北极二。"],
  ["土司空","β Cet","鲸鱼座",0.7265,-17.9866,2.04,"96 光年","K0III","秋季南天亮星。"],
  ["娄宿三","α Ari","白羊座",2.1196,23.4624,2.00,"66 光年","K2III","白羊座最亮。"],
  ["北落师门旁β","β PsA","南鱼座",22.5311,-32.3460,4.29,"148 光年","A1V","参考星。"],
  ["昴宿六","η Tau","金牛座",3.7914,24.1051,2.85,"444 光年","B7III","昴星团最亮。"],
  ["天大将军一","γ And","仙女座",2.0649,42.3297,2.10,"350 光年","K3IIb","美丽双星。"],
  ["壁宿二","α And","仙女座",0.1398,29.0904,2.06,"97 光年","B8IV","秋季四边形之一。"],
  ["室宿一","α Peg","飞马座",23.0793,15.2053,2.49,"133 光年","B9III","飞马大四边形。"],
  ["室宿二","β Peg","飞马座",23.0629,28.0828,2.42,"196 光年","M2.5II","红巨星。"],
  ["危宿三","γ Peg","飞马座",0.2206,15.1836,2.83,"390 光年","B2IV","飞马四边形。"],
  ["奎宿九","α And/同上","",0,0,99,"",""," "].slice(0,1)?null:null, // placeholder removed
  ["大陵五","β Per","英仙座",3.1361,40.9556,2.12,"90 光年","B8V","著名食变星。"],
  ["天船三","α Per","英仙座",3.4054,49.8612,1.79,"510 光年","F5Ib","英仙座最亮。"],
  ["卷舌四","γ Per","英仙座",3.0799,53.5064,2.93,"243 光年","G8III","双星。"],
  ["王良四","α Cas","仙后座",0.6751,56.5373,2.24,"228 光年","K0II","仙后座W形之一。"],
  ["王良一","β Cas","仙后座",0.1530,59.1498,2.27,"54 光年","F2III","仙后座W之一。"],
  ["策","γ Cas","仙后座",0.9451,60.7167,2.47,"550 光年","B0IVe","壳层星。"],
  ["阁道三","δ Cas","仙后座",1.4303,60.2353,2.68,"99 光年","A5III","食双星。"],
  ["阁道二","ε Cas","仙后座",1.9067,63.6701,3.38,"442 光年","B3III","仙后W端。"],
  ["井宿三","γ Gem","双子座",6.6285,16.3993,1.93,"105 光年","A0IV","双子座足部。"],
  ["五车五","β Tau","金牛座",5.4382,28.6075,1.65,"131 光年","B7III","金牛之角。"],
  ["五车三","ι Aur","御夫座",4.9499,33.1661,2.69,"512 光年","K3II","御夫西部。"],
  ["御夫座θ","θ Aur","御夫座",5.9953,37.2126,2.62,"166 光年","A0p","水银锰星。"],
  ["天棓三","γ Dra","天龙座",17.9434,51.4889,2.23,"154 光年","K5III","天龙之眼。"],
  ["上卫增一","η Dra","天龙座",16.4001,61.5141,2.73,"88 光年","G8III","双星。"],
  ["右枢","α Dra","天龙座",14.0732,64.3758,3.65,"303 光年","A0III","古代北极星。"],
  ["天纪二","α CrB","北冕座",15.5781,26.7147,2.22,"75 光年","A0V","北冕座之珠。"],
  ["氐宿四","β Lib","天秤座",15.2833,-9.3829,2.61,"185 光年","B8V","天秤北爪。"],
  ["氐宿一","α Lib","天秤座",14.8479,-16.0418,2.75,"77 光年","A3IV","天秤双星。"],
  ["太微右垣五","β Leo","狮子座",11.8177,14.5720,2.14,"36 光年","A3V","狮尾。"],
  ["轩辕十二","γ Leo","狮子座",10.3329,19.8415,2.28,"126 光年","K1III","双星。"],
  ["西上相","δ Leo","狮子座",11.2351,20.5237,2.56,"58 光年","A4V","狮背。"],
  ["东次相","ε Vir","室女座",13.0362,10.9591,2.83,"110 光年","G8III","室女座。"],
  ["东上相","γ Vir","室女座",12.6943,-1.4494,2.74,"38 光年","F0V","美丽双星。"],
  ["弧矢二","δ CMa","大犬座",7.1399,-26.3933,1.84,"1800 光年","F8Ia","黄超巨星。"],
  ["弧矢一","ε CMa","大犬座",6.9770,-28.9721,1.50,"430 光年","B2II","见前。"],
  ["军市一","β CMa","大犬座",6.3783,-17.9559,1.98,"500 光年","B1II/III","脉动变星。"],
  ["天社一","γ Vel","船帆座",8.1586,-47.3367,1.83,"840 光年","WC8","沃尔夫-拉叶星。"],
  ["天社三","δ Vel","船帆座",8.7450,-54.7086,1.93,"80 光年","A1V","食双星。"],
  ["海石一","ε Car","船底座",8.3752,-59.5095,1.86,"630 光年","K3III","南天亮星。"],
  ["海石二","ι Car","船底座",9.2850,-59.2754,2.21,"690 光年","A8Ib","南天亮星。"],
  ["南船五","θ Sco","天蝎座",17.6217,-42.9978,1.86,"300 光年","F0II","见前。"],
  ["天枪三","β Dra","天龙座",17.5071,52.3014,2.79,"380 光年","G2II","双星。"],
  ["天津一","γ Cyg","天鹅座",20.3705,40.2567,2.23,"1500 光年","F8Ib","天鹅胸部。"],
  ["天津九","ε Cyg","天鹅座",20.7702,33.9703,2.48,"72 光年","K0III","天鹅东翼。"],
  ["辇道增七","β Cyg","天鹅座",19.5126,27.9597,3.18,"380 光年","K3II","美丽对比双星(辇道增七)。"],
  ["天弁一","α Sct","盾牌座",18.5862,-8.2444,3.85,"199 光年","K3III","盾牌座最亮。"],
  ["河鼓三","γ Aql","天鹰座",19.7710,10.6133,2.72,"460 光年","K3II","牛郎扁担。"],
  ["河鼓一","β Aql","天鹰座",19.9219,6.4068,3.71,"45 光年","G8IV","牛郎扁担。"],
  ["瓠瓜一","α Equ","小马座",21.2638,5.2479,3.92,"186 光年","G0III","小马最亮。"],
  ["虚宿一","β Aqr","宝瓶座",21.5259,-5.5712,2.91,"540 光年","G0Ib","宝瓶肩。"],
  ["危宿一","α Aqr","宝瓶座",22.0964,-0.3199,2.95,"520 光年","G2Ib","宝瓶肩。"],
  ["土司空","β Cet","鲸鱼座",0.7265,-17.9866,2.04,"96 光年","K0III","见前。"],
  ["天囷一","α Cet","鲸鱼座",3.0379,4.0897,2.53,"249 光年","M1.5III","红巨星。"],
  ["蒭藁增二","ο Cet","鲸鱼座",2.3225,-2.9789,3.04,"299 光年","M7III","著名长周期变星米拉。"],
].filter(s => Array.isArray(s) && s.length >= 9 && typeof s[3] === 'number');

// 把每条记录转成对象 + 3D 单位向量
function raDecToVec(raH, decDeg) {
  const ra = raH * Math.PI / 12;          // 小时->弧度
  const dec = decDeg * Math.PI / 180;
  return [
    Math.cos(dec) * Math.cos(ra),
    Math.cos(dec) * Math.sin(ra),
    Math.sin(dec)
  ];
}
const stars = STARS.map(s => {
  const [name, bayer, cons, ra, dec, mag, dist, spec, desc] = s;
  return { name, bayer, cons, ra, dec, mag, dist, spec, desc, v: raDecToVec(ra, dec) };
});

// 生成大量背景星 (球面均匀分布) - 最多 4000 颗，按等级裁剪
const bgStars = [];
for (let i = 0; i < 4000; i++) {
  const u = Math.random() * 2 - 1;
  const t = Math.random() * Math.PI * 2;
  const r = Math.sqrt(1 - u * u);
  bgStars.push({
    v: [r * Math.cos(t), r * Math.sin(t), u],
    mag: 3 + Math.random() * 3.5,   // 3.0 ~ 6.5
    tw: Math.random() * Math.PI * 2,
  });
}

// 星座连线 - 每个星座可有多条折线 (按恒星名称引用)
const CONSTELLATIONS = {
  "大熊座(北斗)": [["天枢","天璇","天玑","天权","玉衡","开阳","摇光"]],
  "小熊座":      [["北极星","天棓四"]],
  "猎户座":      [["参宿一","参宿二","参宿三"],
                  ["参宿四","参宿五","参宿一","参宿六","参宿七","参宿三","参宿四"]],
  "天琴座":      [["织女星","河鼓二","天津四","织女星"]],
  "仙后座":      [["王良一","策","王良四","阁道三","阁道二"]],
  "南十字座":    [["十字架二","十字架三"],["十字架一","十字架二"]],
  "双子座":      [["北河二","北河三","井宿三"]],
  "大犬座":      [["天狼星","弧矢一","弧矢二","军市一","天狼星"]],
  "狮子座":      [["轩辕十四","轩辕十二","西上相","太微右垣五","轩辕十四"]],
  "金牛座":      [["毕宿五","五车五"],["毕宿五","昴宿六"]],
  "天蝎座":      [["心宿二","天蝎座λ","天蝎座θ"]],
  "仙女座":      [["壁宿二","天大将军一"]],
  "飞马/秋四边形":[["壁宿二","室宿二","室宿一","危宿三","壁宿二"]],
  "英仙座":      [["天船三","大陵五","卷舌四"]],
  "天鹅座":      [["天津四","天津一","辇道增七"],["天津九","天津一"]],
  "天鹰座":      [["河鼓三","河鼓二","河鼓一"]],
  "御夫座":      [["五车二","五车三","五车五","御夫座θ","五车二"]],
  "半人马座":    [["南门二","马腹一"]],
  "室女座":      [["角宿一","东上相","东次相"]],
  "鲸鱼座":      [["土司空","天囷一"]],
  "天龙座":      [["天棓三","上卫增一","右枢"]],
  "船帆座":      [["天社一","天社三"]],
  "船底座":      [["老人星","海石一","海石二"]],
  "牧夫座":      [["大角星","天纪二"]],
  "宝瓶座":      [["虚宿一","危宿一"]],
  "波江座":      [["水委一","土司空"]],
  "白羊座":      [["娄宿三","昴宿六"]],
  "天秤座":      [["氐宿一","氐宿四"]],
};
// 解析为线段 + 计算每个星座标签中心 (取所有点投影后的均值)
const constLines = [];
const constLabels = []; // {name, stars:[]}
for (const k in CONSTELLATIONS) {
  const allStars = new Set();
  for (const path of CONSTELLATIONS[k]) {
    const resolved = path.map(n => stars.find(s => s.name === n)).filter(Boolean);
    for (let i = 0; i < resolved.length - 1; i++) constLines.push([resolved[i], resolved[i+1]]);
    resolved.forEach(s => allStars.add(s));
  }
  if (allStars.size) constLabels.push({ name: k, stars: [...allStars] });
}

// UI 状态
let level = 2;
let showConst = false;
let showCoord = true;
const LEVEL_MAG = { 1: 1.8, 2: 2.6, 3: 3.5, 4: 5.0, 5: 6.5 };
const LEVEL_BG  = { 1: 200, 2: 600, 3: 1200, 4: 2200, 5: 4000 };
const LEVEL_LABEL_MAG = { 1: 1.5, 2: 2.0, 3: 2.5, 4: 3.0, 5: 4.0 };

document.getElementById('level').addEventListener('input', e => {
  level = +e.target.value;
  document.getElementById('lvVal').textContent = level;
});
document.getElementById('chkConst').addEventListener('change', e => showConst = e.target.checked);
document.getElementById('chkCoord').addEventListener('change', e => {
  showCoord = e.target.checked;
  document.getElementById('coordBox').style.display = showCoord ? 'block' : 'none';
});

// ====================================================================
// 渲染
// ====================================================================
const canvas = document.getElementById('sky');
const ctx = canvas.getContext('2d');
let W, H, CX, CY, R;
function resize() {
  W = canvas.width = window.innerWidth;
  H = canvas.height = window.innerHeight;
  CX = W / 2; CY = H / 2;
  R = Math.min(W, H) * 0.45;
}
resize();
window.addEventListener('resize', resize);

// 旋转矩阵: 用 yaw(绕Y) 与 pitch(绕X)
let yaw = 0, pitch = 0, zoom = 1;

function rotate(v) {
  let [x, y, z] = v;
  // yaw 绕 z 轴 (天极)
  let cy = Math.cos(yaw), sy = Math.sin(yaw);
  let x1 = x * cy - y * sy;
  let y1 = x * sy + y * cy;
  let z1 = z;
  // pitch 绕 x 轴
  let cp = Math.cos(pitch), sp = Math.sin(pitch);
  let y2 = y1 * cp - z1 * sp;
  let z2 = y1 * sp + z1 * cp;
  return [x1, y2, z2];
}

function project(v) {
  const [x, y, z] = rotate(v);
  // y 是深度（朝外）, 投影到 (x,z) 屏幕平面
  if (y < -0.05) return null; // 球后面
  const k = R * zoom;
  return { sx: CX + x * k, sy: CY - z * k, depth: y };
}

let dragging = false, lastX = 0, lastY = 0, moving = false, moveTimer = 0;
let dragDist = 0, downX = 0, downY = 0;
let mouseX = 0, mouseY = 0;

canvas.addEventListener('mousedown', (e) => {
  dragging = true; lastX = e.clientX; lastY = e.clientY;
  downX = e.clientX; downY = e.clientY; dragDist = 0;
});
window.addEventListener('mouseup', () => dragging = false);
window.addEventListener('mousemove', (e) => {
  mouseX = e.clientX; mouseY = e.clientY;
  if (!dragging) return;
  const dx = e.clientX - lastX, dy = e.clientY - lastY;
  lastX = e.clientX; lastY = e.clientY;
  dragDist += Math.abs(dx) + Math.abs(dy);
  // 顺着鼠标方向：拖右天空跟着右移
  yaw -= dx * 0.005;
  pitch -= dy * 0.005;
  pitch = Math.max(-Math.PI/2, Math.min(Math.PI/2, pitch));
  moving = true;
  clearTimeout(moveTimer);
  moveTimer = setTimeout(() => moving = false, 250);
});

// 屏幕坐标 -> 天球 RA/Dec (鼠标悬停)
function unproject(mx, my) {
  const k = R * zoom;
  const x = (mx - CX) / k;
  const z = -(my - CY) / k;
  const s = x * x + z * z;
  if (s > 1) return null;
  const y = Math.sqrt(1 - s);
  // 逆旋转：先 -pitch 绕 X，再 -yaw 绕 Z
  const cp = Math.cos(-pitch), sp = Math.sin(-pitch);
  const y1 = y * cp - z * sp;
  const z1 = y * sp + z * cp;
  const cy = Math.cos(-yaw), sy = Math.sin(-yaw);
  const x2 = x * cy - y1 * sy;
  const y2 = x * sy + y1 * cy;
  // (x2,y2,z1) -> RA/Dec
  const dec = Math.asin(z1) * 180 / Math.PI;
  let ra = Math.atan2(y2, x2) * 12 / Math.PI;
  if (ra < 0) ra += 24;
  return { ra, dec };
}

canvas.addEventListener('wheel', (e) => {
  e.preventDefault();
  zoom *= e.deltaY < 0 ? 1.12 : 0.89;
  zoom = Math.max(0.5, Math.min(6, zoom));
}, { passive: false });

// 点击 - 选中最近恒星
let selected = null;
canvas.addEventListener('click', (e) => {
  if (dragDist > 5) return; // 拖动后不触发选择
  const mx = e.clientX, my = e.clientY;
  const magLimit = LEVEL_MAG[level];
  let best = null, bestD = 18 * 18;
  for (const s of stars) {
    if (s.mag > magLimit) continue;
    const p = project(s.v);
    if (!p) continue;
    const d = (p.sx - mx) ** 2 + (p.sy - my) ** 2;
    if (d < bestD) { bestD = d; best = s; }
  }
  if (best) {
    selected = best;
    showInfo(best);
  }
});

function showInfo(s) {
  document.getElementById('starName').textContent = s.name;
  document.getElementById('bayer').textContent = s.bayer || '—';
  document.getElementById('constellation').textContent = s.cons || '—';
  document.getElementById('magnitude').textContent = s.mag;
  document.getElementById('distance').textContent = s.dist;
  document.getElementById('spectral').textContent = s.spec;
  document.getElementById('radec').textContent =
    `RA ${s.ra.toFixed(2)}h / Dec ${s.dec.toFixed(2)}°`;
  document.getElementById('xyz').textContent =
    `(${s.v[0].toFixed(2)}, ${s.v[1].toFixed(2)}, ${s.v[2].toFixed(2)})`;
  document.getElementById('desc').textContent = s.desc;
  document.getElementById('info').classList.add('show');
}
document.getElementById('closeBtn').addEventListener('click', () => {
  document.getElementById('info').classList.remove('show');
  selected = null;
});

// ====================================================================
// 渲染循环
// ====================================================================
function magToRadius(mag) {
  // 视星等越小越亮
  return Math.max(0.6, 4.5 - mag * 0.65) * Math.sqrt(zoom);
}
function magToAlpha(mag) {
  return Math.max(0.25, Math.min(1, 1.2 - mag * 0.13));
}

function draw(t) {
  ctx.clearRect(0, 0, W, H);

  // 天球边界圆 (淡)
  ctx.beginPath();
  ctx.arc(CX, CY, R * zoom, 0, Math.PI * 2);
  ctx.strokeStyle = 'rgba(60, 90, 160, 0.15)';
  ctx.lineWidth = 1;
  ctx.stroke();

  // 背景星 (按等级裁剪)
  const bgCount = LEVEL_BG[level];
  for (let i = 0; i < bgCount; i++) {
    const s = bgStars[i];
    const p = project(s.v);
    if (!p) continue;
    const r = magToRadius(s.mag) * 0.5;
    const tw = 0.6 + 0.4 * Math.sin(t * 0.002 + s.tw);
    ctx.globalAlpha = magToAlpha(s.mag) * tw;
    ctx.fillStyle = '#cfd8ff';
    ctx.beginPath();
    ctx.arc(p.sx, p.sy, r, 0, Math.PI * 2);
    ctx.fill();
  }

  // 星座连线 + 标签
  if (showConst) {
    ctx.globalAlpha = 0.5;
    ctx.strokeStyle = '#5577cc';
    ctx.lineWidth = 1;
    ctx.beginPath();
    for (const [a, b] of constLines) {
      const pa = project(a.v), pb = project(b.v);
      if (!pa || !pb) continue;
      ctx.moveTo(pa.sx, pa.sy);
      ctx.lineTo(pb.sx, pb.sy);
    }
    ctx.stroke();

    // 星座名标签 (取所有可见星的屏幕中心 + 向下偏移)
    ctx.globalAlpha = 0.85;
    ctx.font = '11px "Microsoft YaHei", sans-serif';
    ctx.fillStyle = '#88bbff';
    ctx.textAlign = 'center';
    ctx.shadowColor = '#000';
    ctx.shadowBlur = 4;
    for (const c of constLabels) {
      let sx = 0, sy = 0, n = 0, maxY = -Infinity;
      for (const s of c.stars) {
        const p = project(s.v);
        if (!p) continue;
        sx += p.sx; sy += p.sy; n++;
        if (p.sy > maxY) maxY = p.sy;
      }
      if (n < 1) continue;
      ctx.fillText(c.name, sx / n, maxY + 16);
    }
    ctx.shadowBlur = 0;
    ctx.textAlign = 'start';
  }

  // 命名亮星 (按等级裁剪)
  const magLimit = LEVEL_MAG[level];
  for (const s of stars) {
    if (s.mag > magLimit) continue;
    const p = project(s.v);
    if (!p) continue;
    const r = magToRadius(s.mag);
    ctx.globalAlpha = magToAlpha(s.mag);

    // 光晕
    const grad = ctx.createRadialGradient(p.sx, p.sy, 0, p.sx, p.sy, r * 4);
    grad.addColorStop(0, 'rgba(255,255,255,0.9)');
    grad.addColorStop(0.3, 'rgba(200,220,255,0.4)');
    grad.addColorStop(1, 'rgba(150,180,255,0)');
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.arc(p.sx, p.sy, r * 4, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = '#fff';
    ctx.beginPath();
    ctx.arc(p.sx, p.sy, r, 0, Math.PI * 2);
    ctx.fill();

    // 选中高亮
    if (selected === s) {
      ctx.globalAlpha = 1;
      ctx.strokeStyle = '#ffeb3b';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(p.sx, p.sy, r + 6, 0, Math.PI * 2);
      ctx.stroke();
    }
  }

  // 标签 - 仅在不旋转时绘制（动态显隐）
  if (!moving) {
    ctx.globalAlpha = 1;
    ctx.font = '12px "Microsoft YaHei", sans-serif';
    ctx.fillStyle = '#aac8ff';
    ctx.shadowColor = '#000';
    ctx.shadowBlur = 4;
    const labelLimit = LEVEL_LABEL_MAG[level];
    for (const s of stars) {
      if (s.mag > labelLimit && selected !== s) continue;
      const p = project(s.v);
      if (!p) continue;
      ctx.fillText(s.name, p.sx + 8, p.sy + 4);
    }
    ctx.shadowBlur = 0;
  }

  // 鼠标位置天球坐标
  if (showCoord) {
    const c = unproject(mouseX, mouseY);
    const box = document.getElementById('coordBox');
    if (c) {
      const h = Math.floor(c.ra);
      const m = Math.floor((c.ra - h) * 60);
      const sign = c.dec >= 0 ? '+' : '-';
      const ad = Math.abs(c.dec);
      const dd = Math.floor(ad);
      const dm = Math.floor((ad - dd) * 60);
      box.textContent = `RA ${h}h${m}m  Dec ${sign}${dd}°${dm}′`;
    } else {
      box.textContent = 'RA — / Dec —';
    }
  }

  ctx.globalAlpha = 1;
  requestAnimationFrame(draw);
}
requestAnimationFrame(draw);
