# 明日方舟基建机制 Agent Skill

独立的后勤技能资料与机制核验工具，按 [Agent Skills 规范](https://agentskills.io/specification) 打包。当前固定国服 GameData v078 / 78.0.0，收录432名干员、763个buff定义、929条阶段技能、760条独立槽最高阶段技能及82条术语。数据收录、软件规则实现和真实游戏证据分别说明。

## 发布或导入前

先从仓库根目录运行：

```text
node skills/arknights-riic-mechanics/scripts/validate.mjs
node skills/arknights-riic-mechanics/scripts/check-freshness.mjs --output freshness-check.json
```

需要 Node.js 20+。第二条命令联网核对 GameData master、工具箱当前map及5份基建资源、3名新干员/回收站的PRTS页面修订和本次Mower alpha相关源码。只有 `current`、退出码0才代表这次范围的最新检查完成。`stale`返回2，需要先同步和验证；`unknown`返回3，记录网络/API失败而不宣称最新。它只读取来源，安装由用户或当前agent按授权执行。证书环境需要时可在 Node 24.6+ 加 `--use-system-ca`，保持TLS校验。

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

技能入口为 [SKILL.md](skills/arknights-riic-mechanics/SKILL.md)，数据及来源哈希在 [gamedata-source-manifest.json](skills/arknights-riic-mechanics/references/gamedata-source-manifest.json) 和 [logistics-update-manifest.json](skills/arknights-riic-mechanics/references/logistics-update-manifest.json)。工具箱交叉核验覆盖全部432人929条阶段；PRTS固定本次8条技能及回收站说明；Mower只固定相关回收站、待办收取和14 QR契约，其他既有调度保留原来源。

更新资料或规则后，执行阶段和联动核验，更新相应说明，运行 `node skills/arknights-riic-mechanics/scripts/validate.mjs --write-manifest` 重建包清单，再运行无参数验证和联网检查。清单检测文件损坏及遗漏，并非数字签名。发布前保留真实测试结果和明确未实现/未实测项。
