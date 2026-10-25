# 从本机 PC 数据更新后勤快照

此流程适用于 ArknightsUnpacker 已校准的 PC 表结构。提取本机当前安装与核对公网最新是两项检查；只有本机文件写入时间不能证明版本或新增干员。

## 提取和比对

1. 在计算器仓库根目录，使用外部 ArknightsUnpacker 已安装依赖的 Python 环境执行提取入口。它调用生产 `load_local_tables` 和 `normalize_table`，请求 `building_data`、`character_table`、`gamedata_const`、`item_table`、`data_version` 五表，只读游戏；输出须为全新目录且不在游戏或Unpacker目录内，保留工具历史库、设置和已有导出。

   `<unpacker-python> -X utf8 -B scripts/extract-unpacker-riic.py --unpacker-root <unpacker-checkout> --game-root <pc-installation> --output <new-export-root>`

   此脚本位于计算器仓库，不在独立skill内；它引用外部解码器，不把私有工具源码复制进发布包。
2. 保存返回的完整性、缺表和诊断结果、游戏数据/资源版本，以及工具提交、版本、schema和相关源码摘要。保留实际选用的初始/热更AB与索引摘要；版本来自 `data_version`，不从mtime或角色编号推断。
3. 用该工具生产的 `arknights_unpacker.gamedata.normalize.normalize_table` 归一化已校准枚举，保存原始解码表与归一化表的SHA-256。遇到未映射枚举、未知字段或缺表，先记录具体缺口并停止依赖该字段的生成。
4. 固定公开GameData提交，下载同版本的五份完整文件并记录URL和SHA-256；逐项比较本项目消费的可获得干员身份、每槽全部解锁阶段、技能已知字段、术语、物品名称及可解码设施参数。使用计算器仓库的 `scripts/unpacker-riic-evidence.mjs`，依次传入归一化PC目录、镜像目录、提取收据、归一化收据、原始sources.json、镜像提交和输出JSON路径。版本、阶段、条件或数值差异都需要解释，不能用移除字段或改期望值的方法消除差异。
5. 使用完整固定镜像作为规范生成输入，同时让 `scripts/sync-riic-catalog.mjs` 接收本次提取目录并生成 [unpacker-source-manifest.json](unpacker-source-manifest.json)。该收据分别记录本机AB/工具/解码表摘要和公开镜像Git提交；两种来源标识保持各自含义。生成器、解码器及原始游戏资源不是独立skill的附件，重提取需要另备相应环境。
   `node scripts/sync-riic-catalog.mjs <verified-source-dir> <staging-dir> <unpacker-export-root>` 的最后一项启用本机证据核对；提取根目录须保留 `normalized-tables/`、`raw-tables/`、`raw-inputs/` 及两份收据的原结构。生成器在写暂存结果前重新检查输入摘要，不复用一份手填“已通过”的旧报告。
6. 依 [freshness.md](freshness.md) 更新工具箱、PRTS与适用Mower来源证据；审阅阶段/联动差异后再应用暂存数据，重建包清单并执行离线校验、查询和受影响数值回归。没有新技能或数值变化时，保留既有算法并更新已核实的来源、文本和回归证据。

## PC building 未知字段

本次工具版本尚不能给下面五个根字段建立可信PC映射：

- `recycleData`
- `recycleRoomConsts`
- `recycleRoomInputItemDatas`
- `recycleRoomOutputPoolDatas`
- `recycleRoomOutputPoolContentDatas`

保留这些未知槽的原始证据。回收站完整设施数据取固定公开GameData，不能从PC未知槽猜字段名或声称两侧已逐字段一致。若未来schema支持它们，先补实际映射和独立比对，再缩小此边界。

## 当前固定记录与判据

本次实际提取为 `78.4.0 / Change:126729 on 2026/10/22`，资源版本 `26-10-22-13-56-52-86025105`；工具0.1.10、提交 `70cf856d90e7252a0fa8de0fc679c7adf75dcd01`、schema `161d5e229916d7193364983396076556fbeaa549`。精确文件摘要、公开提交及覆盖计数以来源收据为准。432名干员/929条阶段未增加，旅骨的措辞更新没有改变相对+90%加工副产品概率；基础10%时仍为19%，不是100%。

离线包验证只能确认已打包证据自洽与未变。原AB已重新读取、服务器最新状态、所有技能执行覆盖、游戏随机结果及各agent平台实际导入，分别需要相应实证。
