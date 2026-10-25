# 发布与导入前检查来源

技能包是固定离线快照。发布或导入前执行联网检查，确认 GameData、明日方舟工具箱、相关 PRTS 页面及 Mower alpha 当前状态。日后仍可离线查询，但离线校验不会把快照标为最新。

从技能目录执行：

```text
node scripts/validate.mjs
node scripts/check-freshness.mjs --output freshness-check.json
```

两条命令均需要 Node.js 20 或更新版本；查询 `scripts/query.mjs` 只使用内置模块，无需安装依赖。系统使用企业证书且 Node 24.6+ 支持时，可使用 `node --use-system-ca scripts/check-freshness.mjs --output freshness-check.json`。保留 TLS 校验。 配置了代理环境变量且Node版本支持时，可加 `--use-env-proxy`；本次Node 24.15.0已实际验证与 `--use-system-ca` 合用。先用 `node --help` 核对支持，不把该选项当作全部Node 20版本均可用。

本机 PC 数据更新还须按 [unpacker-data.md](unpacker-data.md) 重新提取并比对。`check-freshness.mjs` 只联网检查下列公开来源，不扫描本机游戏、不验证当前安装是否为服务器最新版，也不把旧的本机提取记录自动刷新为当前。

## 检查范围

|来源|当前检查|固定证据|
|---|---|---|
|GameData|查询 GitHub `master` 当前提交；提交变化时比较五份相关原文件哈希|`gamedata-source-manifest.json` 的 commit、sourceVersion 和 sources|
|工具箱|读取 `check.json` 和对应map；比较五份基建/干员/术语资源位置及SHA-256|`logistics-update-manifest.json.toolbox` 的版本、map和resources|
|PRTS|查询本次三名新干员与回收站的当前页面revision|`logistics-update-manifest.json.prts` 与 `prtsRecycle` 的固定修订及响应哈希|
|Mower回收/QR|查询 `alpha` 当前提交；提交变化时比较此次回收站/收取/QR相关文件SHA-256|`logistics-update-manifest.json.mowerRecycle` 的提交、范围与文件清单|
|Mower新版计划|独立核对组绑定与高级设置schema/执行片段，保留各固定来源；整体文件变化与后来审查的实际实现范围分别读取|`mower-plan-source-manifest.json` 的提交、范围与文件清单；PR26增量见 `fullCodeParityAudit20261025`|
|PRTS联动边界|额外核对承曦格雷伊和歌蕾蒂娅页面revision|`mower-plan-source-manifest.json.prts` 的固定修订与响应哈希|

PRTS页面修订改变可能只涉及战斗资料，Mower新提交也可能不涉及回收站。脚本保留观察到的差异；相关文件未变可以报告这一范围仍一致，页面修订变化仍需人工复核。它不下载任意页面指令，不改资料，不更新技能或执行安装。

## 结果和完成标准

- `current`、退出码0：五组来源全部完成，相关内容或固定修订一致。报告带实际检查时间、观察到的版本/提交和当前包SHA-256。
- `stale`、退出码2：相关资料或页面修订已变。先审阅差异、重新同步数据和规则，再做阶段/联动回归及打包验证；完整验证前保留原快照和明确版本。
- `unknown`、退出码3：某来源无法连接、API限制或响应不可解释。保留失败来源及错误；可离线核对当前包，不宣称最新来源已经确认。
- 退出码1：本地包格式、引用或哈希损坏，先修复打包问题。

导入动作应在这次 `current` 检查后进行；不要长期复用旧检查作为未来导入的凭据。脚本输出会列明PRTS核对范围，仅覆盖本次列出的六个页面，不意味着全站全部后勤页面都重新校验。源数据收录、可执行算法和真实游戏/agent运行依然是三个独立证据层。

2026-10-14历史固定规则更新保留了已有离线快照：工具箱map及character资源推进，其他四份列出资源哈希相同；原Mower回收固定来源的两个整体文件也已推进，故整体状态为stale。GameData、六个PRTS页面和新版计划固定来源仍匹配。保留这些差异，不以本次规则/PR核验宣称整个快照最新，也不自动替换未经机制审查的数据。

2026-10-25本次数据更新初次检查观察到Mower alpha `0c321af26b61184bf058d4c6fcdc7a3ecf841604`，与旧回收及计划整体文件pin仍有差异。并发主线的PR26随后已合入本包，保留其调度、恢复与本地公式修正；`fullCodeParityAudit20261025` 记录了固定 `94a49b4`、`f19abfa` 增量及观察至 `0c321af` 的范围、差异和验证边界。本次78.4.0数据变更叠加这些已合入规则，不以提取结果宣称进一步移植Mower。旧宽文件范围仍可报告 `stale`；这本身不等于PR26实现未合入，也不能把有限源码/AST/Worker证据扩大成全原生或游戏等价。各来源的实际联网状态以本轮完整检查输出为准，未全部确认前不把整个skill来源集合称为 `current`。

## 离线使用

`scripts/validate.mjs` 验证 frontmatter、相对引用、内部版本一致性、术语依赖及包文件哈希；包中含本机提取证据时，还验证它与当前公开快照的版本、提交、源文件摘要和收录计数一致。它不重新读取原AB或解包工具。`scripts/query.mjs`、两个catalog与HTML检索均可离线使用；HTML的数据、样式和逻辑全部内嵌，无外部脚本、图片或网络请求依赖。

本技能遵循 [Agent Skills 规范](https://agentskills.io/specification)，目录结构与UTF-8文档可移植。各agent是否发现技能、允许脚本、支持图片或刷新索引，按其产品版本与权限分别验收；格式检查不等于所有平台都已实际导入。

2026-10-14历史交付前再查：Mower alpha已推进至d52ab17c022b4fcc05fc613cd71bb4bdce9d0b7e，计划/配置/操作表/QR六项仍与固定哈希相同，base_schedule.py发生变化，故新版计划检查也为stale。完整观察见mower-plan-source-manifest.json的deliveryObservation；本轮保留验证过的PR/规则范围，不自动移植新源码。
