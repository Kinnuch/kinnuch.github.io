# Wordbank · 单词本

离线背英语单词的 PWA。零依赖、零构建：`index.html` + 5 个 ES module + 一份词典 JSON，
静态托管即可运行。安卓 Chrome「添加到主屏幕」后是独立图标、全屏、断网可用。

线上地址：<https://kinnuch.github.io/cerf/wordbank/>

## 目录

```
index.html              外壳；标签页、学习会话、底部弹层的容器
manifest.webmanifest    PWA 清单（standalone、图标、快捷方式）
sw.js                   Service Worker：外壳缓存 + 词典按需缓存
css/app.css             全部样式，含深浅色主题
js/store.js             IndexedDB 封装（words / meta / days 三个 store）
js/srs.js               间隔重复调度器
js/dict.js              离线词典的加载、查词、词形还原
js/parse.js             导入解析（自由文本 / CSV / 两行一组 / 纯词表）
js/app.js               界面与学习会话引擎
data/dict.json          离线词典：19,870 词 + 52,011 短语（5.5 MB，gzip 后 2.5 MB）
tools/                  构建与测试脚本，不参与运行
```

## 复习算法

核心是 SM-2，但有两处按中文背单词 App 的实际手感做了改动：

1. **前五次成功复习走固定阶梯 1 / 2 / 4 / 7 / 15 天**，之后才交给每个词自己的
   熟练度系数（ease，1.3–2.8）递增。原始 SM-2 第二次就跳到 6 天，对昨天刚认识的
   词太粗。间隔会按词做 ±12% 的确定性抖动，避免一次导入 500 词后同一天全部到期。
2. **只有三档评价**（不认识 / 模糊 / 认识，对应 q = 0 / 3 / 5）。选择题和拼写题
   自动判分；答对后仍可点「其实有点模糊」降级。

答错则熟练度系数 −0.2、次数归零、当场重新排进本轮队列（隔 4~6 张卡再出现）。
复习间隔超过「掌握阈值」（默认 60 天）的词标记为已掌握。

**抽查**是例外：从学过的词里随机抽 20 个，答对**不**拉长间隔（提前答对不构成
新证据），答错照常算遗忘。所以抽查多少次都不会打乱排期。

## 出题

按熟练度轮换：认词义（英→中四选一）、选单词（中→英四选一）、拼写（给释义和
首字母）、例句填空、听音辨义（Web Speech API）。生词第一次出现是展示卡，不是考题。
选项的干扰项优先从用户自己的词库里取 —— 从两万词词典里随机取的干扰项等于送分。

## 导入

`js/parse.js` 按内容识别列，不绑定任何一个导出方。下面这些都能直接粘：

```
abandon                        纯词表，自动查词典补释义
abandon  vt. 放弃，抛弃         空格 / Tab
abandon,vt. 放弃                CSV，有没有表头都行
单词,音标,释义                  扇贝 / 欧路 式表头
1. abandon —— 放弃              带编号、破折号
give up 放弃                    词组
abandon \n vt. 放弃             两行一组
```

纯词表里的变形词会做词形还原后再查（`carrying` → `carry`，`wolves` → `wolf`，
`went` → `go`），补上的释义会在词条里注明取自哪个原形。文件导入支持 UTF-8 与 GBK。

## 词典

`data/dict.json` 由 [kajweb/dict](https://github.com/kajweb/dict) 的 14 本考试词书
合并去重而来（小学、初中、高中、四级、六级、考研、专四、专八、雅思、托福、GRE、
SAT、BEC、GMAT），保留词形、音标、词性释义和一条最短的例句。19,870 个词条中
19,616 个有音标、16,625 个有例句。这 14 本同时作为可直接导入的内置词书，按考频顺序排列。

**短语单独建索引**（52,011 条，取自词书的 `phrase` 字段）。这一步不是可选的：词书的
词头几乎全是单词，`give up`、`in spite of`、`put up with` 一个都不在里面，没有短语索引
的话粘一列短语进来会全部查不到释义。查短语时先精确匹配，再试首/尾词的原形
（`gave up` → `give up`）、连字符与空格互换，最后才允许「只多一个词」的近似匹配
（`be used to` → `be used to something`），且要求至少三个词，否则 `in the` 会去匹配
`in the end`。近似匹配来源会写进词条的笔记里。

首次需要查词时才下载，之后由 Service Worker 永久缓存 —— 只花一次流量。

## 数据

全部存在浏览器的 IndexedDB 里，不上传任何服务器。设置页可导出 JSON 备份
（含词库、进度、每日记录、设置）和 CSV。恢复备份时按「学得更远的那份」合并。

## 开发

```sh
node tools/build-dict.js <解压后的词书目录> data/dict.json   # 重建词典
node tools/make-icons.js icons                              # 重画图标
node tools/serve.mjs                                        # 本地静态服务器 :8765
npm i puppeteer-core && node tools/smoke.mjs                # 端到端冒烟测试（24 项）
node tools/smoke-books.mjs                                  # 内置词书导入测试（8 项）
```

两个测试都需要 `tools/serve.mjs` 先跑起来。`smoke.mjs` 会走完冷启动、粘贴导入、
词典补全、学习一轮、词库搜索、统计、深色模式、刷新留存，以及**断网后完全离线可用**
（含离线查词）；`smoke-books.mjs` 覆盖内置词书的下载、分段导入与重复检测。
两者都断言零控制台错误。Chrome 路径可用环境变量 `CHROME` 覆盖。
