# 明日方舟基建机制 Agent Skill

独立的后勤技能资料与机制核验工具，按 [Agent Skills 规范](https://agentskills.io/specification) 打包。当前固定国服 GameData v078 / 78.4.0，收录432名干员、763个buff定义、929条阶段技能、760条独立槽最高阶段技能及82条术语。数据收录、软件规则实现和真实游戏证据分别说明。

## 2026-10-25 本机解包与后勤数据更新

通过 ArknightsUnpacker 0.1.10 只读提取本机 PC 的 78.4.0 数据，与固定 GameData `fe7d8d05edc36cf5678a24bfe9e84e891f6cf7ad`、工具箱全部929条技能阶段及相关PRTS页面交叉核对。432名干员、929条阶段和数值机制未增加；旅骨说明采用当前“副产品”措辞。PC未命名的5个回收根字段由同版本固定公开镜像补足，分别保留两侧版本和SHA-256。可重跑入口与完整证据见 [本机数据更新说明](skills/arknights-riic-mechanics/references/unpacker-data.md) 和 [解包来源清单](skills/arknights-riic-mechanics/references/unpacker-source-manifest.json)。保留下述已合入Mower规则，不把本轮数据核对称为所有上游或平台均已验证。

## 2026-10-25 Mower 兼容核查与本地修正

本次同步计算器627文件的修复前审查范围及原25项与新增7项的统一来源分类。普通调度机制更新固定到Mower alpha `f19abfa3a53489d018c6eabd115b6cb68afcdc66`，交付前增量核验至 [alpha 0c321af](https://github.com/ArkMowers/arknights-mower/commit/0c321af26b61184bf058d4c6fcdc7a3ecf841604)（7次提交、58文件）。用户已明确批准以原生普通调度为主要依据，共同错误一并修复，并登记相对内置演算的本地差异；既有个人心情、理想跑单等特殊模型继续保留。安全条件语法、值运算及Unicode按Python3.12/Unicode15参考验证。详细范围见 [兼容说明](skills/arknights-riic-mechanics/references/mower-plan-compatibility.md) 和 [覆盖说明](skills/arknights-riic-mechanics/references/coverage.md)。文件级阅读覆盖不代表所有输入、分支或真实设备循环等价。

最终长测补齐了切表后的物理宿舍恢复：槽位在固定主位与Free床位间变化时，实际驻员继续按宿舍恢复，避免把保留驻员的恢复率误记为0。此修正统一单项及批量心情导数，不扩大床位准入、不删除未来任务、不调整模拟时钟或旧测试预算。

协调任务按原生范围保留替班依赖、相关房间及有效候补顺序；实际相关规则或观测变化可恢复原任务，空副表激活及无关条件位不会单独触发重试。普通回班按原生caller执行，已接纳或保留的任务可在成员低于上限时续行；正常恢复规划中的显式回满约束、个人上限和具体位置证明例外仍保留。新增可选预测模式维持原生默认关闭的边界，本地连续物理积分不代表启用该模式。对应计算器更新见 [PR26](https://github.com/Panda-Panta/R.I.I.C-Calculator/pull/26)，当前验证与交付状态以该PR及计算器计划为准。

GameData继续使用v078固定快照，本次不更新干员资料。最终来源检查于2026-10-25 11:18:58 UTC取得全部五类结果，GameData、工具箱、PRTS及旧Mower固定范围整体stale；此前工具箱连接失败的unknown记录保留；不能把规则说明同步、离线包校验或这一固定Mower范围的检查称为整个数据包最新，也不宣称各agent平台已实际导入。

## 发布或导入前

先从仓库根目录运行：

```text
node skills/arknights-riic-mechanics/scripts/validate.mjs
node skills/arknights-riic-mechanics/scripts/check-freshness.mjs --output freshness-check.json
```

需要 Node.js 20+。第二条命令联网核对 GameData master、工具箱当前map及5份基建资源、三名新干员、回收站、承曦格雷伊和歌蕾蒂娅的六个PRTS页面修订，以及Mower回收来源与新版计划固定源码。只有 `current`、退出码0才代表这次范围的最新检查完成。`stale`返回2，需要先同步和验证；`unknown`返回3，记录网络/API失败而不宣称最新。它只读取来源，安装由用户或当前agent按授权执行。证书环境需要时可在 Node 24.6+ 加 `--use-system-ca`，保持TLS校验。

离线查询可以使用固定快照，但不会确认远程资料最新。每次发布或导入重新运行检查，不复用旧检查时间。详细范围及边界见 [freshness.md](skills/arknights-riic-mechanics/references/freshness.md)。

## 导入

复制整个 `skills/arknights-riic-mechanics/` 文件夹，保留 `SKILL.md`、`references/`、`scripts/` 及 `agents/` 的相对结构。安装目录中技能文件夹仍应命名为 `arknights-riic-mechanics`。覆盖已有技能前保存原目录，避免覆盖其他自定义技能。

|Agent|官方支持的项目目录|调用/发现|
|---|---|---|
|[Codex](https://learn.chatgpt.com/docs/build-skills)|`.agents/skills/arknights-riic-mechanics/`|CLI/IDE 中按 `$arknights-riic-mechanics` 或 `/skills` 选择；支持技能的 ChatGPT 桌面界面用 `@` 选择；新会话确认发现，可选 `agents/openai.yaml` 提供界面说明|
|[Claude Code](https://code.claude.com/docs/en/skills)|`.claude/skills/arknights-riic-mechanics/`|加载后按 `/arknights-riic-mechanics` 调用；项目技能和账户/云端技能的加载范围分别验收|
|[GitHub Copilot](https://docs.github.com/en/copilot/concepts/agents/about-agent-skills)|`.github/skills/arknights-riic-mechanics/`，也支持 `.agents/skills/` 或 `.claude/skills/`|确认当前产品支持Agent Skills并能发现该项目技能|
|其他支持Agent Skills的agent|该产品文档规定的技能目录|保持原始文件夹结构，核对发现、资源读取和脚本权限|

表中位置按2026-10-12官方文档核对。格式与文件完整性已验证，不表示以上每个平台都实际安装运行过；不同产品的发现、账户权限、缓存刷新和脚本许可需要分别确认。没有脚本执行环境时直接查 [catalog.decoded.json](skills/arknights-riic-mechanics/references/catalog.decoded.json)，再核对原始catalog阶段与terms条件。

## 离线查询

```text
node skills/arknights-riic-mechanics/scripts/query.mjs 旅骨 --phase 0 --level 1 --room RECYCLE
node skills/arknights-riic-mechanics/scripts/query.mjs 克莱门莎 --phase 2 --level 1 --room MEETING
```

查询逐槽选择最高已解锁版本，不计算实际心情、联动或收益。HTML检索的数据、样式与逻辑全部内嵌，可在浏览器离线打开。

## 维护和来源

技能入口为 [SKILL.md](skills/arknights-riic-mechanics/SKILL.md)，数据及来源哈希在 [gamedata-source-manifest.json](skills/arknights-riic-mechanics/references/gamedata-source-manifest.json) 和 [logistics-update-manifest.json](skills/arknights-riic-mechanics/references/logistics-update-manifest.json)。工具箱交叉核验覆盖全部432人929条阶段；PRTS固定本次8条技能及回收站说明；Mower回收站、待办收取与14 QR契约保留原来源；PR10新版计划、共享绑组、宿舍隔离、产物切换及本轮无人机/疲劳边界另固定来源，见[mower-plan-source-manifest.json](skills/arknights-riic-mechanics/references/mower-plan-source-manifest.json)。本轮规则复用PR10并做有据的局部补充，不声明整个调度器与最新版等价。

更新资料或规则后，执行阶段和联动核验，更新相应说明，运行 `node skills/arknights-riic-mechanics/scripts/validate.mjs --write-manifest` 重建包清单，再运行无参数验证和联网检查。清单检测文件损坏及遗漏，并非数字签名。发布前保留真实测试结果和明确未实现/未实测项。

## 2026-10-14固定规则更新

离线包的frontmatter、引用与逐文件哈希已核验。联网时效整体为stale：工具箱map及character资源、原回收站的两个整体Mower源码文件已推进；初验时GameData、六个PRTS页面和本轮计划源码匹配。保留固定快照及差异，不自动替换未经机制审查的数据，也不宣称所有agent平台实际导入或真实游戏实验。

最新PR10头固定0630aa399ab77adac2b9ff032da7d65b42f4afc9；慢进度活动观测增量经相关回归和8组完整模拟报告不变对照核验，原生来源哈希及规则数据保持同一固定范围。

交付前再查：Mower alpha推进至d52ab17，计划/配置/操作表/QR六项仍匹配，base_schedule.py推进，故新版计划检查也为stale；GameData和六个PRTS页面仍匹配。完整版本、差异与哈希见来源清单的deliveryObservation。保持已验收固定范围，不将离线包完整性声明为整套最新上游对齐。
