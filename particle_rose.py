# -*- coding: utf-8 -*-
"""
粒子玫瑰花束 · Particle Rose Bouquet
-----------------------------------
十四朵由数学参数曲面生成的玫瑰，扎成一束；
一层层波纹从花顶不断流过粒子云，像海浪淌过花瓣。

依赖:  pip install numpy matplotlib

交互:
    左键拖拽 —— 手动旋转（拖拽时自动旋转暂停，松手后从当前角度继续）
    滚轮     —— 缩放
    空格     —— 暂停 / 恢复自动旋转
    ← →     —— 自转减速 / 加速
    ↑ ↓     —— 波浪减速 / 加速
    W        —— 关闭 / 开启波浪
    R        —— 重置视角
    S        —— 保存 rose.png

帧率:
    顶部 QUALITY 一档换一档。本机实测（含 matplotlib 绘制开销）：
        fast     448px / 10 万粒子  ≈ 49 fps
        balanced 560px / 15 万粒子  ≈ 29 fps
        pretty   720px / 22 万粒子  ≈ 20 fps
    窗口里右上角有实时 fps。

实现要点（为什么帧率能上去）:
    1) 不用 mplot3d。它每帧重建 Path3DCollection 还要做深度排序，上万粒子就跌到个位数。
       这里自己算：旋转 → 透视除法 → np.bincount 按亮度把粒子累加进 RGB 缓冲。
       加法混合天然与顺序无关，深度排序整个省掉了。
    2) 缓冲边长 == 窗口边长，且直接喂 uint8。尺寸对不上时 imshow 每帧要重采样，
       实测那一步就吃掉 25ms，比整个渲染还贵。
    3) 辉光走降采样 → 低分辨率模糊 → 双线性放大，全分辨率上只留两趟加法。
"""

import time

import numpy as np
import matplotlib
import matplotlib.pyplot as plt
from matplotlib.animation import FuncAnimation
from matplotlib.colors import LinearSegmentedColormap

matplotlib.rcParams["font.sans-serif"] = [
    "Microsoft YaHei", "PingFang SC", "Noto Sans CJK SC", "SimHei", "DejaVu Sans",
]
matplotlib.rcParams["axes.unicode_minus"] = False

# ======================================================================
# 参数区
# ======================================================================
# 画质档位：直接决定帧率。RES 同时是窗口边长（必须能被 BLOOM_BLOCK 整除）
QUALITY = "balanced"                    # "fast" | "balanced" | "pretty"
RES, DENSITY = {"fast":     (448, 0.55),
                "balanced": (560, 0.85),
                "pretty":   (720, 1.25)}[QUALITY]

N_BLOOM     = 8200       # 每朵花的粒子数（会再乘 DENSITY）
EXPOSURE    = 0.40       # 曝光：加法缓冲 → 屏幕亮度的映射强度
BLOOM_MIX   = 0.55       # 辉光强度
BLOOM_BLOCK = 8          # 辉光降采样倍率
BLOOM_BLUR  = 4          # 辉光模糊次数（次数少了会看出方块）

ROT_SPEED   = 0.32       # 自动旋转（度/帧）
WAVE_SPEED  = 1.0        # 波浪整体速度倍率
WAVE_AMP    = 0.58       # 波浪对亮度的调制幅度
WAVE_DISP   = 0.022      # 波浪对位置的推动量（相对花半径约 2%，不破坏形状）

CAM_DIST    = 9.0
FOCAL       = 2.9
VIEW_HALF   = 1.32       # 投影平面半宽，越小越"推近"

SEED        = 20260816

# 花色：从花心到花瓣尖
PALETTES = {
    "crimson":   ["#2a0008", "#6e0417", "#b30f33", "#e33a63", "#ff8fb1", "#ffd9e2"],
    "blush":     ["#3a0d1c", "#7d1e3a", "#c8446b", "#f176a0", "#ffb3cb", "#fff0f4"],
    "champagne": ["#3a2411", "#7a4a1f", "#c08a4a", "#e8bd85", "#ffe3bf", "#fff7ec"],
    "burgundy":  ["#1a0006", "#4a0210", "#8b0a24", "#c02244", "#e86a8e", "#ffc2d4"],
}
CMAPS = {k: LinearSegmentedColormap.from_list(k, v) for k, v in PALETTES.items()}
LEAF_CMAP = LinearSegmentedColormap.from_list("leaf", ["#0b2b16", "#1c5c30", "#4a9a52", "#8fcf78"])

rng = np.random.default_rng(SEED)


def dens(n):
    """按画质档位缩放粒子数。"""
    return max(1, int(n * DENSITY))


# ======================================================================
# 几何生成
# ======================================================================
def rose_bloom(n, theta_max, seed, r_pow=0.55, jitter=0.011):
    """Paul Nylander 玫瑰参数曲面上的粒子采样（局部坐标：底 z≈0，顶 z≈0.9，半径≈1）。

        x(θ) = 1 - ½(5/4·(1 - (3.6θ mod 2π)/π)² - ¼)²   花瓣边缘褶皱
        φ(θ) = π/2·e^(-θ/8π)                             由内向外张开
        y(r,φ) = 1.95653 r²(1.27689r - 1)² sin φ         花瓣外卷
    """
    g = np.random.default_rng(seed)
    r = g.random(n) ** r_pow
    theta = g.random(n) * theta_max

    x = 1 - 0.5 * ((5 / 4) * (1 - np.mod(3.6 * theta, 2 * np.pi) / np.pi) ** 2 - 0.25) ** 2
    phi = (np.pi / 2) * np.exp(-theta / (8 * np.pi))
    y = 1.95653 * r**2 * (1.27689 * r - 1) ** 2 * np.sin(phi)

    R = x * (r * np.sin(phi) + y * np.cos(phi))
    pts = np.stack([R * np.cos(theta), R * np.sin(theta),
                    x * (r * np.cos(phi) - y * np.sin(phi))], axis=1)
    pts += g.normal(0, jitter, pts.shape)

    # 上色参数：融合"离花心多远"与"张开了多少"，取幂压暗，免得花瓣全烧成白
    t = np.clip(0.50 * r + 0.42 * (theta / theta_max), 0, 1) ** 1.6
    return pts, t


def rot_z(a):
    c, s = np.cos(a), np.sin(a)
    return np.array([[c, -s, 0], [s, c, 0], [0, 0, 1]])


def rot_x(a):
    c, s = np.cos(a), np.sin(a)
    return np.array([[1, 0, 0], [0, c, -s], [0, s, c]])


def tube(p0, p1, p2, n, r0, r1, seed):
    """二次贝塞尔曲线外包一层圆管粒子 —— 用来长花茎。"""
    g = np.random.default_rng(seed)
    t = g.random(n)[:, None]
    c = (1 - t) ** 2 * p0 + 2 * (1 - t) * t * p1 + t**2 * p2
    tan = 2 * (1 - t) * (p1 - p0) + 2 * t * (p2 - p1)
    tan /= np.linalg.norm(tan, axis=1, keepdims=True) + 1e-9

    up = np.array([0.0, 0.0, 1.0])
    u = np.cross(tan, up)
    bad = np.linalg.norm(u, axis=1) < 1e-3
    u[bad] = np.cross(tan[bad], np.array([1.0, 0.0, 0.0]))
    u /= np.linalg.norm(u, axis=1, keepdims=True) + 1e-9
    v = np.cross(tan, u)

    rad = (r0 + (r1 - r0) * t[:, 0]) * np.sqrt(g.random(n))
    a = g.random(n) * 2 * np.pi
    return c + u * (rad * np.cos(a))[:, None] + v * (rad * np.sin(a))[:, None], t[:, 0]


def leaf(n, seed, length=0.9, width=0.30):
    g = np.random.default_rng(seed)
    u, v = g.random(n), g.random(n) * 2 - 1
    half = width * np.sin(np.pi * u**0.75) * (1 - 0.25 * u)
    pts = np.stack([length * u, half * v, -0.30 * u**2 - 1.1 * (half * v) ** 2], axis=1)
    pts += g.normal(0, 0.008, pts.shape)
    return pts, 1 - np.abs(v) * 0.7


# ----------------------------------------------------------------------
# 装配花束
# ----------------------------------------------------------------------
GATHER = np.array([0.0, 0.0, -3.30])       # 手握处：所有花茎汇聚点

# (环半径, 数量, 高度, 外倾角, 缩放, 起始方位, 配色)
RINGS = [
    (0.00, 1, 1.42, 0.00, 0.66, 0.0, ["crimson"]),
    (1.02, 5, 1.02, 0.40, 0.62, 0.3, ["blush", "crimson", "burgundy", "blush", "crimson"]),
    (1.78, 8, 0.34, 0.76, 0.57, 0.0, ["crimson", "champagne", "burgundy", "blush",
                                      "crimson", "blush", "champagne", "burgundy"]),
]

pos_list, col_list, wgt_list, dir_list = [], [], [], []


def add(pts, rgb, weight, out_dir):
    pos_list.append(np.ascontiguousarray(pts, dtype=np.float32))
    col_list.append(np.ascontiguousarray(rgb, dtype=np.float32))
    wgt_list.append(np.full(len(pts), weight, dtype=np.float32))
    dir_list.append(np.ascontiguousarray(out_dir, dtype=np.float32))


bloom_id = 0
for ring_r, count, z, tilt, scale, phase, pal in RINGS:
    for k in range(count):
        bloom_id += 1
        az = phase + 2 * np.pi * k / count + rng.normal(0, 0.05)
        sc = scale * (1 + rng.normal(0, 0.05))
        theta_max = rng.uniform(10, 14) * np.pi          # 每朵花瓣数略有不同
        pts, t = rose_bloom(dens(N_BLOOM), theta_max, SEED + bloom_id * 17)

        # 局部 → 世界：缩放 → 外倾 → 转向 → 平移
        M = rot_z(az) @ rot_x(tilt + rng.normal(0, 0.04))
        center = np.array([ring_r * np.cos(az), ring_r * np.sin(az), z + rng.normal(0, 0.05)])
        world = pts * sc @ M.T + center

        cmap = CMAPS[pal[k % len(pal)]]
        add(world, cmap(t)[:, :3], 1.00, world - center)   # 波浪沿"离花心向外"推

        # 花茎：从花底弯向手握处
        base = np.array([0, 0, -0.02]) * sc @ M.T + center
        ctrl = np.array([base[0] * 0.45, base[1] * 0.45, (base[2] + GATHER[2]) * 0.5 - 0.25])
        st, tt = tube(base, ctrl, GATHER, dens(1000), 0.030, 0.020, SEED + 900 + bloom_id)
        add(st, LEAF_CMAP(0.22 + 0.5 * tt)[:, :3], 0.34, np.zeros_like(st))

# 外圈绿叶
for k in range(9):
    az = 2 * np.pi * k / 9 + 0.2
    lp, lt = leaf(dens(1600), SEED + 300 + k, length=rng.uniform(0.85, 1.15))
    M = rot_z(az) @ rot_x(rng.uniform(1.05, 1.35))
    world = lp @ M.T + np.array([2.02 * np.cos(az), 2.02 * np.sin(az), rng.uniform(-0.55, 0.05)])
    add(world, LEAF_CMAP(0.18 + 0.65 * lt)[:, :3], 0.40, np.zeros_like(world))

# 满天星：一簇簇细碎的小白花，填在玫瑰之间
cl_n = 46
cl_az = rng.random(cl_n) * 2 * np.pi
cl_rr = 0.5 + rng.random(cl_n) ** 0.6 * 1.9
cl_c = np.stack([cl_rr * np.cos(cl_az), cl_rr * np.sin(cl_az),
                 rng.uniform(0.5, 2.15, cl_n) - 0.35 * cl_rr], axis=1)
fill = cl_c[:, None, :] + rng.normal(0, 0.075, (cl_n, dens(60), 3))
fill = fill.reshape(-1, 3)
add(fill, np.tile(np.array([1.0, 0.94, 0.86]), (len(fill), 1)), 0.50, np.zeros_like(fill))

# 包装纸：从手握处向上外张的锥面，用角向余弦做出折痕明暗
n_wrap = dens(26000)
wa = rng.random(n_wrap) * 2 * np.pi
wt = rng.random(n_wrap) ** 0.75
scallop = np.cos(5.5 * wa)                  # 同一条余弦同时决定折面明暗与荷叶边高低
wr = 0.14 + wt * (1.42 + 0.14 * scallop)
wz = GATHER[2] + 0.15 + wt * (2.45 + 0.32 * scallop)      # 只包到花朵下方，不跟花瓣抢画面
wrap = np.stack([wr * np.cos(wa), wr * np.sin(wa), wz], axis=1)
wrap += rng.normal(0, 0.012, wrap.shape)
fold = 0.30 + 0.70 * np.abs(scallop) ** 1.6
wrap_rgb = np.outer(fold * (0.30 + 0.70 * wt), np.array([1.0, 0.70, 0.62]))
add(wrap, wrap_rgb, 0.78, np.zeros_like(wrap))

# 缎带 + 蝴蝶结
n_rib, n_bow = dens(2600), dens(1800)
rt = rng.random(n_rib)
ra = rt * 7.5 * np.pi
rz = GATHER[2] + 0.30 + rt * 0.55
ribbon = np.stack([(0.30 + 0.05 * rt) * np.cos(ra), (0.30 + 0.05 * rt) * np.sin(ra), rz], axis=1)
ribbon += rng.normal(0, 0.012, ribbon.shape)
bt = rng.random(n_bow) * 2 * np.pi
bw = 0.42 * np.abs(np.sin(2 * bt)) * (0.55 + 0.45 * rng.random(n_bow))
bow = np.stack([bw * np.cos(bt), rng.normal(0, 0.022, n_bow),
                GATHER[2] + 0.62 + bw * np.sin(bt) * 0.85], axis=1)
band = np.concatenate([ribbon, bow])
add(band, np.tile(np.array([1.0, 0.84, 0.52]), (len(band), 1)), 0.62, np.zeros_like(band))

# 空气尘埃
n_dust = dens(2200)
da = rng.random(n_dust) * 2 * np.pi
dr = 0.6 + rng.random(n_dust) ** 0.5 * 3.4
dust = np.stack([dr * np.cos(da), dr * np.sin(da), rng.uniform(-3.4, 2.6, n_dust)], axis=1)
add(dust, np.tile(np.array([1.0, 0.88, 0.92]), (len(dust), 1)), 0.22, np.zeros_like(dust))

POS = np.concatenate(pos_list)
POS[:, 2] += 0.55                       # 把整束的重心挪到画面中央
COL = np.concatenate(col_list)
COL_C = np.ascontiguousarray(COL.T)     # 转置成 3×N，让逐通道乘法走连续内存
BASE_W = np.concatenate(wgt_list)
DISP_DIR = np.concatenate(dir_list)
DISP_DIR /= np.linalg.norm(DISP_DIR, axis=1, keepdims=True) + 1e-6
N = len(POS)
del pos_list, col_list, wgt_list, dir_list

# 亚像素抖动：固定给每颗粒子一点偏移，避免整齐落格产生的摩尔纹
JITTER = rng.normal(0, 0.45, (N, 2)).astype(np.float32)

# ----------------------------------------------------------------------
# 波浪：三列不同方向 / 波长 / 速度的行波叠加
#   相位只由粒子的静止坐标决定 → 波在花上"流过"，而花本身不变形
# ----------------------------------------------------------------------
K1 = np.array([0.0, 0.0, -3.80], dtype=np.float32)     # 自上而下
K2 = np.array([2.00, 1.30, -1.40], dtype=np.float32)   # 斜向掠过
RHO = np.hypot(POS[:, 0], POS[:, 1]).astype(np.float32)

# 波长取得比单朵花略短，浪才会"从花瓣上淌过去"，而不是整朵一起明灭
PH1 = (POS @ K1).astype(np.float32)
PH2 = (POS @ K2).astype(np.float32)
PH3 = (3.20 * RHO).astype(np.float32) + rng.normal(0, 0.25, N).astype(np.float32)
OMG = np.float32(2.15), np.float32(1.45), np.float32(1.85)

# ======================================================================
# 渲染器：投影 → 加法累加 → 辉光 → 色调映射
# ======================================================================
RES -= RES % BLOOM_BLOCK          # 分辨率需能被辉光降采样倍率整除
HALF = RES * 0.5
SCALE_PX = HALF / VIEW_HALF
BR, BS = RES // BLOOM_BLOCK, BLOOM_BLOCK
img = np.zeros((RES, RES, 3), dtype=np.float32)
out = np.zeros((RES, RES, 3), dtype=np.float32)          # 复用输出缓冲，免得每帧新分配 4MB
frame = np.zeros((RES, RES, 3), dtype=np.uint8)
scratch = np.zeros((RES // BLOOM_BLOCK, BLOOM_BLOCK,
                    RES // BLOOM_BLOCK, BLOOM_BLOCK, 3), dtype=np.float32)

# 辉光双线性放大用的插值系数（块内偏移 → 与相邻块的混合比例）
_a = ((np.arange(BS) + 0.5) / BS).astype(np.float32)
ROW_A, ROW_B = (1 - _a).reshape(1, BS, 1, 1), _a.reshape(1, BS, 1, 1)
COL_A, COL_B = (1 - _a).reshape(1, 1, 1, BS, 1), _a.reshape(1, 1, 1, BS, 1)


def render(yaw, pitch, zoom, t):
    # --- 波浪场（三列行波叠加，输出 [-1,1]） ---
    t = np.float32(t)                     # 保持全程 float32，别让 python float 把数组升成 float64
    if state["wave"]:
        w = (0.46 * np.sin(PH1 - OMG[0] * t) +
             0.32 * np.sin(PH2 - OMG[1] * t) +
             0.24 * np.sin(PH3 - OMG[2] * t))
        p = POS + DISP_DIR * (WAVE_DISP * w)[:, None]
        # 亮度最低只压到 0.42 —— 波谷仍看得见轮廓，浪只是流过，不会把花吃掉
        weight = BASE_W * np.clip(1.0 + WAVE_AMP * w, 0.42, None)
    else:
        p = POS
        weight = BASE_W

    # --- 旋转：先绕 Z 自转，再绕屏幕水平轴俯仰 ---
    cy, sy = np.cos(yaw), np.sin(yaw)
    cp, sp = np.cos(pitch), np.sin(pitch)
    px = p[:, 0] * cy - p[:, 1] * sy
    py = p[:, 0] * sy + p[:, 1] * cy
    pz = p[:, 2]
    depth = CAM_DIST + py * cp - pz * sp
    up = py * sp + pz * cp

    # --- 透视投影 + 距离衰减 ---
    np.maximum(depth, 0.35, out=depth)
    s = (FOCAL * zoom * SCALE_PX) / depth
    ix = px * s + HALF + JITTER[:, 0]
    iy = HALF - up * s + JITTER[:, 1]

    # 出界的粒子不做布尔筛选（那要复制好几个大数组），而是钳进边界后把权重清零
    inside = (ix >= 0) & (ix < RES) & (iy >= 0) & (iy < RES)
    np.clip(ix, 0, RES - 1, out=ix)
    np.clip(iy, 0, RES - 1, out=iy)
    idx = iy.astype(np.int32) * RES + ix.astype(np.int32)
    wv = weight * inside * (CAM_DIST / depth) ** 2

    # --- 加法混合：无需深度排序，天生就是"光在叠加" ---
    n_px = RES * RES
    for c in range(3):
        img[:, :, c] = np.bincount(idx, weights=wv * COL_C[c], minlength=n_px).reshape(RES, RES)

    # --- 辉光：降采样 → 反复三抽头模糊 → 双线性放大加回 ---
    # 直接用 np.repeat 方块放大会在花周围留下肉眼可见的格子，
    # 所以沿两个轴各做一次线性插值；插值在低分辨率上完成，几乎不花时间。
    small = img.reshape(BR, BS, BR, BS, 3).sum(axis=(1, 3))
    for _ in range(BLOOM_BLUR):
        small = (small + np.roll(small, 1, 0) + np.roll(small, -1, 0)) * (1 / 3)
        small = (small + np.roll(small, 1, 1) + np.roll(small, -1, 1)) * (1 / 3)
    small *= BLOOM_MIX / (BS * BS)

    rows = small[:, None, :, :] * ROW_A + np.roll(small, -1, 0)[:, None, :, :] * ROW_B
    diff = np.roll(rows, -1, 2) - rows       # 写成 a + (b-a)·t，省掉一整趟全分辨率乘法
    view = img.reshape(BR, BS, BR, BS, 3)
    view += rows[:, :, :, None, :]
    np.multiply(diff[:, :, :, None, :], COL_B, out=scratch)
    view += scratch

    # --- 色调映射：x/(1+x) 饱和曲线，比 1-exp(-x) 快一倍，高光自然烧成暖白 ---
    np.multiply(img, EXPOSURE, out=img)
    np.add(img, 1.0, out=out)
    np.divide(img, out, out=out)

    # 自己转成 uint8 交给 imshow：float + 缩放会让 matplotlib 每帧重采样，代价比整个渲染还大
    np.multiply(out, 255.0, out=out)
    np.copyto(frame, out, casting="unsafe")
    return frame


# ======================================================================
# 画布与交互
# ======================================================================
# 窗口尺寸严格等于渲染缓冲尺寸：1:1 贴图能走 imshow 的快路径，省下每帧约 25ms 的重采样
DPI = 100
fig = plt.figure(figsize=(RES / DPI, RES / DPI), dpi=DPI, facecolor="#05060a")
try:
    fig.canvas.manager.set_window_title("Particle Rose Bouquet · 粒子玫瑰花束")
except Exception:
    pass
ax = fig.add_axes([0, 0, 1, 1])
ax.set_facecolor("#05060a")
ax.set_axis_off()

state = {"yaw": -0.9, "pitch": 0.26, "zoom": 1.0, "auto": True, "wave": True,
         "speed": ROT_SPEED, "wspeed": WAVE_SPEED, "drag": None, "t": 0.0,
         "frame": 0, "tick": time.perf_counter()}

im = ax.imshow(render(state["yaw"], state["pitch"], state["zoom"], 0.0),
               interpolation="nearest", origin="upper")

# 这些文字不能带 animated=True —— 那个标记会让它们被普通 draw 跳过，直接消失
cap = fig.text(0.5, 0.035, "a bouquet, computed", ha="center", color="#ff9ebb",
               fontsize=14, alpha=0.6, family="serif", style="italic")
fig.text(0.5, 0.010, "拖拽旋转 · 滚轮缩放 · 空格暂停 · ←→ 转速 · ↑↓ 浪速 · W 波浪 · R 重置 · S 截图",
         ha="center", color="#5d6478", fontsize=8)
hud = fig.text(0.985, 0.978, "", ha="right", va="top", color="#48506a",
               fontsize=8, family="monospace")


def on_press(e):
    if e.button == 1 and e.x is not None:
        state["drag"] = (e.x, e.y)


def on_release(e):
    state["drag"] = None


def on_motion(e):
    if state["drag"] is None or e.x is None:
        return
    x0, y0 = state["drag"]
    state["yaw"] += (e.x - x0) * 0.008
    state["pitch"] = float(np.clip(state["pitch"] + (e.y - y0) * 0.006, -1.35, 1.35))
    state["drag"] = (e.x, e.y)


def on_scroll(e):
    state["zoom"] = float(np.clip(state["zoom"] * (1.12 if e.step > 0 else 1 / 1.12), 0.35, 4.0))


def on_key(e):
    k = (e.key or "").lower()
    if k == " ":
        state["auto"] = not state["auto"]
    elif k == "right":
        state["speed"] = min(state["speed"] + 0.08, 3.0)
    elif k == "left":
        state["speed"] = max(state["speed"] - 0.08, 0.0)
    elif k == "up":
        state["wspeed"] = min(state["wspeed"] + 0.15, 4.0)
    elif k == "down":
        state["wspeed"] = max(state["wspeed"] - 0.15, 0.0)
    elif k == "w":
        state["wave"] = not state["wave"]
    elif k == "r":
        state.update(yaw=-0.9, pitch=0.26, zoom=1.0)
    elif k == "s":
        plt.imsave("rose.png", np.asarray(im.get_array()))
        cap.set_text("已保存 rose.png")


for ev, fn in [("button_press_event", on_press), ("button_release_event", on_release),
               ("motion_notify_event", on_motion), ("scroll_event", on_scroll),
               ("key_press_event", on_key)]:
    fig.canvas.mpl_connect(ev, fn)


def update(_):
    state["frame"] += 1
    state["t"] += 0.033 * state["wspeed"]
    if state["auto"] and state["drag"] is None:
        state["yaw"] += np.deg2rad(state["speed"])

    im.set_data(render(state["yaw"], state["pitch"], state["zoom"], state["t"]))

    if state["frame"] % 15 == 0:
        now = time.perf_counter()
        hud.set_text(f"{15 / (now - state['tick']):.0f} fps · {N/1000:.0f}k particles · {QUALITY}")
        state["tick"] = now
    return im, hud, cap


# blit=False：贴图本来就覆盖整个画布，开 blit 省不下什么，
# 反而会因为 fig.text 的 .axes 是 None 让 _blit_draw 抛异常、动画卡在第一帧。
anim = FuncAnimation(fig, update, interval=1, blit=False, cache_frame_data=False)

if __name__ == "__main__":
    plt.show()
