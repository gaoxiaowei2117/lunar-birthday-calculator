# 农历 · 阳历生日重合计算器

一个可由 Codex 长期维护的原生 HTML / CSS / JavaScript 前端工程。输入阳历出生日期，只核对出生后每隔 19 年（19、38、57、76、95、114 岁）的两个生日是否同一天，支持筛选与 CSV 导出。

## 来源与交付状态

本次无法访问此前 ChatGPT 沙盒中的 `/mnt/data/lunar_birthday_calculator.html`；引用对话未返回 HTML 附件。本工程依据用户提供的功能清单重新实现，**不是原文件的逐行迁移**，也未声称保留原视觉设计。默认生日仍是 `1988-09-18`。若找回原文件，请先放入 `work/original/`，对比再迁移，勿覆盖已验证的计算逻辑。

## 直接使用：无需安装任何开发工具

1. 解压项目，保留文件夹内的结构。
2. 双击项目根目录的 `index.html`，使用支持中国农历 `Intl` 的浏览器打开。
3. 输入阳历出生日期和最大年龄，点击「开始计算」。
4. 勾选「只看同一天」可筛选；CSV 导出与当前筛选一致，包含 UTF-8 BOM，便于 Excel 识别中文。

页面运行不依赖 Python、Node.js、CDN、接口、网络字体或第三方包。不发送、存储或上传生日。普通脚本可通过 `file://` 加载，避免 ES 模块在本地文件协议下的限制。

压缩包也附带 `dist/lunar_birthday_calculator.html`，它将样式、脚本及说明内嵌，可单独复制到另一台电脑离线打开。它是生成文件，修改后须重新构建；源文件是根目录 `index.html` 与 `src/`。

## 在 Codex Desktop 中打开

1. 将压缩包解压到一个长期保存的位置，例如 `Documents/Projects/lunar-birthday-calculator`。
2. 在 Codex Desktop 的项目区域添加/打开本地项目，选择 **包含 `package.json`、`README.md`、`AGENTS.md` 的 `lunar-birthday-calculator` 文件夹**；不要选择压缩包或只选择 HTML 文件。
3. 如果项目已存在，在项目菜单中选择 Edit project / 编辑项目，然后 Add folder / 添加文件夹，把该目录设为主目录（Make primary）。不同版本的按钮措辞可能不同。
4. 在该项目下开始一个新聊天，例如：“请阅读 README.md 和 AGENTS.md，运行现有测试，再改善手机端表格。”

官方项目说明：<https://learn.chatgpt.com/docs/projects>（核对于 2026-10-14）。主目录用于新聊天的工作目录、Git 操作以及自动发现 `AGENTS.md`。将源文件保存到项目，不要仅依赖聊天历史。

## 项目结构

```text
lunar-birthday-calculator/
├── index.html                   # 页面结构，可直接离线打开
├── src/
│   ├── calendar.js               # 日期验证、农历转换、年度索引、生日分析
│   ├── csv.js                    # CSV 编码和转义
│   ├── app.js                    # 页面交互、渲染与导出
│   └── styles.css                # 响应式样式
├── tests/
│   ├── build.test.cjs            # 离线资源与单文件构建检查
│   ├── calendar.test.cjs         # 独立历法对照及生日边界测试
│   ├── interval.test.cjs         # 19 年检查点、分类与缺失日期测试
│   ├── csv.test.cjs              # CSV 筛选和转义测试
│   └── fixtures/hko-samples.json # 5,628 个独立 HKO 样本及来源
├── scripts/
│   ├── serve.cjs                 # 仅监听本机的开发预览
│   ├── build.cjs                 # 生成单文件离线版
│   └── import-hko-fixtures.cjs   # 从下载好的 HKO 表重建样本
├── docs/accuracy.md              # 日期范围、实测结果与已知差异
├── AGENTS.md                     # Codex 开发约定
├── package.json                 # 开发命令，无第三方依赖
├── .editorconfig
├── .gitignore
└── dist/lunar_birthday_calculator.html # 压缩包附带的离线版，Git 忽略
```

## 开发

开发需要 Node.js 22 或更高，且包含中国农历所需的完整 ICU 数据。**不需要 `npm install`**；没有第三方依赖或锁文件。

```sh
npm run dev       # 本机 http://127.0.0.1:4173；Ctrl+C 停止
npm run check     # JavaScript 语法检查
npm test          # 测试，包括独立来源日期对照
npm run build     # 重新生成 dist 中的单文件版本
```

修改后刷新网页。预览服务仅暴露指定的页面、脚本、样式和说明，不开放 `.git`。可通过 `PORT` 环境变量改变端口。

## 计算口径与准确性

- 可输入的公历范围是 **1900-01-01～2200-12-31**；0～120 岁，默认 120 岁；不列出生年，只列范围内的 19 年倍数年龄。超过 2200 年明确截断，不默默补算。
- 只对每个 19 年检查点的阳历生日进行真实农历转换；月、日和闰月标记全部相同才显示“同一天”，否则为“不是同一天”。
- 农历闰月生日在无对应闰月的年份不自动改为普通月；农历三十不自动改为二十九。
- 2 月 29 日在非闰年显示缺失，不自动改为 2 月 28 日或 3 月 1 日；保留该年记录。
- 页面与 CSV 不展示逐年列表或相差天数。若该年不存在 2 月 29 日，显示“无法比较”，不归入“不是同一天”。
- “年龄”是公历年份差；19 年决定检查哪些年份，不能直接假定这些年份一定重合。最大年龄小于 19 时，列表为空。
- 转换依赖浏览器内置 `Intl.DateTimeFormat` 的中国历法。使用中国民用日期，每天取北京时间中午对应的 UTC 时间，并显式指定中国时区；不受电脑设置为温哥华或其他时区影响。不同浏览器/ICU 版本可能有不同的历算结果。

**验证不等于全范围保证。** 本次在 Node 22.23.2 / ICU 78.3 下对照 16 个年份的 5,628 个日期，5,598 个一致，30 个存在已知差异（2057-09-28～2057-10-27）。1900 年及 2101～2200 年无权威表对照；其他年份未全量验证。结果包含 2101 年之后的日期时，页面显示单独提示，表格与 CSV 在相应检查点标注未验证。页面先检查 7 个参考日期，检查失败时停止计算；通过也不证明所有日期准确。测试通过表示功能及已知差异均按约定处理，不表示历法没有差异。详见 [验证报告](docs/accuracy.md)。

## 初始化 Git

下载压缩包**不含 `.git`**。如果你从压缩包开始，在本地初始化；若通过 GitHub 克隆项目，则直接使用已有仓库。在解压后的工程根目录运行：

```sh
git init -b main
git status
git add .
git commit -m "Initial offline lunar birthday calculator"
```

如果 Git 提示缺少身份，在此仓库设置你自己的名字和邮箱（不必改全局设置），再重新提交。每次修改建议先新建分支：

```sh
git switch -c improve-mobile-table
npm run check
npm test
npm run build
git diff
git add .
git commit -m "Improve mobile birthday table"
```

`dist/` 已在 `.gitignore` 中，因为可从源码再生成。需要发布时运行构建并单独上传生成文件。连接远程仓库或部署可在后续明确指定目的地后进行。

## 开发约定

保持零运行时网络依赖和 `file://` 能力；计算与页面交互分离，日期逻辑写在 `calendar.js`。使用 UTF-8、两空格缩进、LF；变更历法逻辑时添加独立来源的回归样本并更新验证报告。界面修改检查键盘操作、手机宽度及错误状态。详见 `AGENTS.md`。

## GitHub Pages 发布

本项目无需服务器和构建步骤，可直接发布根目录。仓库 Settings → Pages 中选择 Deploy from a branch，分支 main、目录 / (root)，保存。根目录的 .nojekyll 让平台直接提供静态文件。index.html 使用相对资源路径，可部署在仓库名子目录下。

修改后运行 npm run check、npm test、npm run build，提交并推送 main，GitHub Pages 将更新网站。dist/ 是便携离线版本，不是此发布方式的入口。
