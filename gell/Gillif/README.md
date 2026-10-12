# Gillíf · 星路争霸

抢星星的网页即时战略。你从一颗母星起家，沿星路调兵、夺取控制度、蚕食对手，直到一统星系。
玩法规则参考 Tasharen Entertainment 2013 年的 *Starlink*；代码与美术全部原创，仓库里没有任何二进制素材。

纯前端，无构建步骤、无框架；联机使用本地随附的 PeerJS。需通过 HTTP 访问（ES Module 不能走 `file://`）。

## 目录

```
index.html            入口（大厅 + 对局）
css/gillif.css        样式；大厅跟随站点明暗主题，对局固定深色
js/                   rng 随机 · galaxy 星系生成 · rules 规则常量 · state 建局 · sim 规则内核
                      core 共用局面操作 · effects 持续效果 · abilities 能力
                      ai 逐星 AI 与放牌 · render Canvas 绘制 · input 指针输入（多指）
                      profile 档案与成长 · tutorial 新手教程 · main 大厅/主循环/HUD/结算
design/               00-规则规格与里程碑.md（全部规则数值、后续里程碑的数据、架构）
test/smoke.js         无头规则测试
test/browser.html     浏览器端测试（迷雾、暗幕 / 间谍网、点选）
```

## 测试

```sh
node test/smoke.js                         # 规则内核（星系、异常天体、难度、得分、足迹、17 张能力、AI 放牌、成长结算、
                                           #   同屏指令、脚本代玩一遍教程、确定性重放、全 AI 对局不变量）
python -m http.server 8765                 # 在仓库根目录起服务，然后：
chrome --headless=new --virtual-time-budget=4000 --dump-dom \
  "http://127.0.0.1:8765/gell/Gillif/?auto=1&seed=7&nohint=1&selftest=1" | grep -o "<title>[^<]*"
                                           # 输入链路自检，期望 SELFTEST drag-ok tap-ok ping-ok foreign-ok tip-ok fog-ok
                                           #   ability-ok feed-ok teleport-ok deny-ok
chrome --headless=new --virtual-time-budget=8000 --dump-dom \
  "http://127.0.0.1:8765/gell/Gillif/test/browser.html" | grep -o "<title>[^<]*"
                                           # 浏览器端测试，期望 BROWSERTEST PASS 11
```

同一条 chrome 命令换成下面几个地址，是其余几套页面自检（期望的标题写在后面）：

| 地址 | 期望标题 |
|---|---|
| `?auto=1&hotseat=2&seed=7&nohint=1&selftest=1` | `HOTSEAT multi-ok foreign-ok reveal-ok nocards-ok` |
| `?tutorial=1&nohint=1&selftest=1` | `TUTORIAL home-ok guide-ok drag-ok capture-ok grow-ok pause-ok` |
| `?selftest=lobby` | `LOBBY level-ok unlock-ok pick-ok limit-ok free-ok hotseat-ok start-ok fogpref-ok` |
| `?auto=1&seed=7&ff=200&nohint=1&selftest=xp` | `XPTEST end-ok xp-ok(…) level-ok` |

大厅与结算的自检会改本机档案，做完会恢复原样。

## 开发参数（URL）

| 参数 | 作用 |
|---|---|
| `auto=1` | 跳过大厅直接开局 |
| `seed=N` | 星图编号 |
| `galaxy=类型` | small / medium / large / defensible / desolate / imploded |
| `challenge=难度` | beginner / easy / normal / hard / nightmare |
| `fog=0` | 关闭战争迷雾 |
| `ai=N` | 对手数（1 至星系上限减一） |
| `time=分钟` | 时限，0 为不限 |
| `spectate=1` | 全 AI 观战 |
| `hotseat=N` | 同屏 N 人（配合 `ai=M` 再加 M 个 AI） |
| `tutorial=1` | 直接进新手教程（不用 `auto=1`） |
| `autopilot=1` | AI 代玩，视角仍是玩家（截图看迷雾用） |
| `speed=K` | 推演倍速 |
| `ff=秒` | 开局先快进 |
| `nohint=1` | 不显示操作提示 |
| `selftest=1` / `lobby` / `xp` | 页面自检，结果写进页面标题（见上） |
| `perf=1` | 量 180 帧绘制耗时，结果写进页面标题 |

`--dump-dom` 模式下浏览器不跑动画帧：页面里的推演和绘制都不前进，靠帧循环的检查要么手动推进（像 `test/browser.html`），要么用 `--screenshot` 模式。

调试句柄：对局中 `window.gillif = { G, step, R, ui, arm, cast, profile, tutorial, session }`——`arm('defense')` 选卡瞄准，`cast(card, src, dst)` 直接下能力指令。


## M5 联机与组队

大厅展开「多人联机」，房主选配置、加入规则，用当前星系/难度/时限建房；把 `gillif-xxxxxx` 房号给朋友。新玩家先观战，再选势力；房主点击「开始 / 继续对局」。同色队友共用势力、卡组和冷却，卡组取房主自由模式保存的配置（上限 12 点），联机不计经验。

支持 2–6 方、2v2、3v3、2v2v2；队伍共用势力，每队有按人数分配的母星。房间最多 6 个连接（包括观战者）。加入规则：自由、合作（所有玩家同一方）、死斗（不同方）。只由房主模拟；每 100 毫秒发送完整快照，PeerJS binary serializer 自动分片重组。中途加入包含驻军、控制度、航线、在途船、能力和冷却。最后一位控制某势力的玩家离线后 AI 接手。

PeerJS 使用公网信令服务发现房号，数据走 WebRTC；跨网络的连接仍取决于双方网络条件。房主退出/断线时客户端停止，不自动迁移房主。房主切到后台可能因浏览器节流而降低推演速度。聊天为纯文本；客户端身份由连接绑定，操作须经房主授权。

```sh
node test/network.js  # 联机房间与组队 46 项
```

`test/network-browser.html` 通过本地信令替身建立真实 RTCDataChannel，验证传输、中途加入和断线（8 项）；`test/network-ui.html` 用两份游戏页面验证建房/加入/选队/开局/聊天/返回大厅（7 项）。两页需以真实时间运行浏览器，虚拟计时会提前触发 WebRTC 超时。`test/network-public.html` 使用实际 PeerJS 和公网信令验证四方/六方开局与超过 100 KB 的大快照（10 项）；`test/network-ui.html?public=1` 用实际公网信令测试完整页面流程。跨设备 NAT 仍需不同网络设备试玩确认。

PeerJS 来自本仓库既有游戏的 vendor 文件；[项目](https://github.com/peers/peerjs)，许可证见 `js/PEERJS-LICENSE.txt`。


### 联机故障修复（2026-10-12）

原先选择 JSON serializer，PeerJS 在 16,300 字节处拒绝发送；默认四方局开局快照约 17 KB，因而会出现房号可注册但加入者接收不到局面。现改为自动分片的 binary serializer；旧的本地信令替身没有实现 JSON 大小限制，所以新增实际 PeerJS 公网回归覆盖这个缺口。

现在支持完整房号或末尾六位，自动处理大小写和首尾空格；连接界面显示注册/发现房间/建立直连/接收局面的不同阶段，超时会指出阶段。浏览器入口和网络模块加版本参数避免沿用旧缓存。单个加入者的协商失败不会关闭整个房间；选队失败的普通提示也不会将客户端错误暂停。
