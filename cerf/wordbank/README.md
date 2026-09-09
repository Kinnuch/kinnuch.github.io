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
data/dict.json          离线词典：19,870 词 + 52,061 短语（5.5 MB，gzip 后 2.5 MB）
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

手抄的词表常把同义词挤在一行，所以**全英文的行会按标点再拆一次**：

```
target. goal. aim                 -> 三个词
cross， a cross                    -> 两条，全角逗号也算分隔符
attractive charming. fascinating  -> 四个词（见下）
because of. due to. owing to      -> 三个短语，各自保持完整
as ... as                         -> 语法框架，原样保留，不拆
```

拆出来的片段里，**全部由实词组成的**（`attractive charming`）判为漏了标点，再按空格
拆开；只要含一个虚词（`because of` 的 `of`、`a cross` 的 `a`）就当作短语保持完整。这条
判断只对「已经被标点拆过的行」生效，所以单独成行的 `bachelor's degree`、`the West Lake`
不会被误拆。

**带空格的斜杠**是并列项分隔符，会拆成多条；不带空格的（`so/such ... that`）留给词典
自己展开，那里能拿两种读法去比对数据：

```
shelves / shelf                  -> 两个词
all kinds of / all sorts of      -> 两个短语
be covered by / with             -> be covered by + be covered with
```

最后一条是特例：如果某一段只有一个虚词（`with`），说明变的是短语末尾的介词，于是拿
前一段替换尾词重建，而不是生成一个孤零零的 `with` 词条。

编号可以和词分处两行（`1.` 一行、`bacteria` 下一行），中间夹的页码行（`第2页`）会被丢弃。

## 词典

`data/dict.json` 由 [kajweb/dict](https://github.com/kajweb/dict) 的 14 本考试词书
合并去重而来（小学、初中、高中、四级、六级、考研、专四、专八、雅思、托福、GRE、
SAT、BEC、GMAT），保留词形、音标、词性释义和一条最短的例句。19,870 个词条中
19,616 个有音标、16,625 个有例句。这 14 本同时作为可直接导入的内置词书，按考频顺序排列。

**短语单独建索引**（52,061 条，取自词书的 `phrase` 字段）。这一步不是可选的：词书的
词头几乎全是单词，`give up`、`in spite of`、`put up with` 一个都不在里面，没有短语索引
的话粘一列短语进来会全部查不到释义。索引用的键和查询走同一套规范化，所以存成
`as ... as` 的条目也能被丢掉省略号的查询命中。

查短语的顺序：

1. 斜杠展开 —— `not so/as ... as` 拆成 `not so ... as` 和 `not as ... as` 分别试
2. 精确匹配
3. 改写：去掉 `sth` / `sb` 占位符，再逐个剥掉开头的 `the` / `a` / `be` / `to` ——
   `be busy with sth` → `busy with`，`be the same as` → `the same as` → `same as`
4. 首词或尾词还原原形（`gave up` → `give up`）、连字符与空格互换
5. 「只多一个词」的近似匹配（`be used to` → `be used to something`），要求至少三个词，
   否则 `in the` 会去匹配 `in the end`
6. 取开头的二/三词前缀当短语 —— `look up new words` → `look up`，
   `refer to dictionary` → `refer to`。动词短语加宾语时，值得背的是那个动词短语
7. 退回中心词（`belong to` → `belong`，`a little` → `little`）。语法框架不走这一步，
   否则 `as ... as` 会变成 `as` 的释义

第 3 步之后的任何一步命中，来源都会写进词条的笔记（`释义取自「…」`），因为借来的
释义不该被当成精确释义背下去。

`tools/phrase-supplement.json` 是**人工审定的补充表**，只在词书语料没有该条目时才加入。
存在的理由很具体：语料里有 `instead of`、`as well as`、`rather than`，却偏偏没有
`due to`、`according to`、`owing to`。没有补充表的话 `due to` 会退回单词 `due`
（到期的），意思正好反了 —— 背错比背不到更糟。

首次需要查词时才下载，之后由 Service Worker 永久缓存 —— 只花一次流量。

## 数据

全部存在浏览器的 IndexedDB 里，不上传任何服务器。设置页可导出 JSON 备份
（含词库、进度、每日记录、设置）和 CSV。恢复备份时按「学得更远的那份」合并。

## 开发

```sh
node tools/build-dict.js <解压后的词书目录> data/dict.json   # 重建词典
node tools/make-icons.js icons                              # 重画图标
node tools/serve.mjs                                        # 本地静态服务器 :8765
node tools/smoke-lookup.mjs                                 # 查词与词形还原（不需服务器）
node tools/smoke-import.mjs                                 # 真实词表解析 + 查词（不需服务器）
npm i puppeteer-core && node tools/smoke.mjs                # 浏览器端到端（28 项）
node tools/smoke-books.mjs                                  # 内置词书导入（10 项）
```

前两个是纯 Node 的，直接读 `data/dict.json`，跑得很快：`smoke-lookup.mjs` 覆盖单词、
短语、词形还原、近似匹配的护栏和「借来的释义必须带来源标注」；`smoke-import.mjs` 拿
`tools/fixtures/` 下两份真实的、格式很乱的手抄词表跑完整的解析 + 查词，断言覆盖率不低于
98%（目前两份都是 100%）。第二份专门覆盖编号单独占行、中间夹页码行、以及斜杠并列。

后两个需要先 `node tools/serve.mjs`。`smoke.mjs` 走完冷启动、粘贴导入、词典补全、
学习一轮、词库搜索、统计、深色模式、刷新留存，以及**断网后完全离线可用**（离线查
单词和短语各一次）；`smoke-books.mjs` 覆盖内置词书的下载、分段导入与重复检测。
两者都断言零控制台错误。Chrome 路径可用环境变量 `CHROME` 覆盖。
