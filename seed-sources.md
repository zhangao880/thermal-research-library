# 首轮精选论文检索与核验记录

检索日期：2026-10-30

## 数据来源

- **Crossref REST API**：核对 DOI、题名、作者、年份、期刊/会议、引用数和部分摘要。
- **Europe PMC REST API**：补充医院、隔离病房和热回收相关的全文标识、作者和摘要。
- **Semantic Scholar Graph API**：补充摘要、开放获取状态、许可和论文页面链接。

没有使用百科、新闻稿、营销页面或搜索结果摘要作为主要文献证据。

## 检索主线

```text
("medical device" OR wearable OR implantable OR hospital OR healthcare)
AND
(thermal management OR cooling OR heat dissipation)
AND
(waste heat OR heat recovery OR heat pump OR thermoelectric OR phase change material)
```

分别检索了以下主题：

- medical device thermal management
- interventional and implantable medical device thermal safety
- wearable medical thermal management / wearable thermoelectric generator
- phase change material wearable thermal management
- hospital isolation room HVAC heat recovery
- hospital exhaust air heat recovery heat pump
- hospital operating theatre net zero energy
- hospital energy conservation and low-temperature waste heat

## 入库标准

1. 有可核对的 DOI 或稳定论文页面。
2. 至少满足一项：直接研究医疗设备热管理、直接研究医院余热利用、提供可迁移的低品位余热方法。
3. 优先保留原始实验、现场案例、系统仿真和高质量综述。
4. 对只有题录、没有取得摘要的论文，状态标为“已核验”，不据此填写具体结果。
5. 会议论文和不开放获取论文可以保留，但降低阅读优先级。

## 首批 14 篇

| 年份 | 论文 | 期刊/会议 | DOI | 状态 |
|---:|---|---|---|---|
| 2024 | Energy conservation of HVAC systems in isolation rooms using heat pipe heat exchangers | Heliyon | `10.1016/j.heliyon.2024.e24288` | 已摘要 |
| 2025 | Towards NetZero for hospital operating theatres | Journal of the Royal Society Interface | `10.1098/rsif.2025.0048` | 已摘要 |
| 2025 | Cost-optimal dimensioning of combined run-around heat recovery and exhaust air heat pump systems in a Nordic hospital | Journal of Building Engineering | `10.1016/j.jobe.2025.112619` | 已核验 |
| 2026 | Real-World Performance of Heat Recovery Chillers with Exhaust Air Coils in an All-Electric Medical Building | 2026 ASHRAE Winter Conference | `10.63044/w26raf09` | 已核验 |
| 2021 | Thermal management of an interventional medical device with double layer encapsulation | Experimental Heat Transfer | `10.1080/08916152.2021.1946208` | 已摘要 |
| 2024 | Thermally Conductive Polymer Composites with Hexagonal Boron Nitride for Medical Device Thermal Management | IMAPSource Proceedings | `10.4071/001c.94686` | 已摘要 |
| 2019 | Adaptive Thermal Management of Implantable Device | IEEE Sensors Journal | `10.1109/JSEN.2018.2879427` | 已摘要 |
| 2016 | Wearable thermoelectric generators for human body heat harvesting | Applied Energy | `10.1016/j.apenergy.2016.08.150` | 已核验 |
| 2024 | A comprehensive review of phase change material-based wearable devices for personal thermal management | Applied Thermal Engineering | `10.1016/j.applthermaleng.2024.124416` | 已核验 |
| 2023 | An overview of commercialization and marketization of thermoelectric generators for low-temperature waste heat recovery | iScience | `10.1016/j.isci.2023.107874` | 已摘要 |
| 2026 | Energy Conservation and Emission Reduction in Central Sterile Supply Department Under High-Quality Development of Public Hospitals | Journal of Healthcare Leadership | `10.2147/JHL.S588532` | 已摘要 |
| 2026 | Reclassifying hospital energy demand toward industry-like requirements for hygienic and resilient indoor environments | Scientific Reports | `10.1038/s41598-025-33606-2` | 已摘要 |
| 2023 | 19th-century thermosiphon ventilation and its potential for heat recovery in buildings today | iScience | `10.1016/j.isci.2023.108765` | 已摘要 |
| 2004 | Thermal management of a medical device using thermoelectric coolers | IEEE SEMI-THERM | `10.1109/STHERM.2004.1291312` | 已核验 |

## 开放获取优先阅读

以下论文在检索时显示了较明确的开放获取或机构全文线索，但最终许可以 DOI/期刊页面为准：

- `10.1016/j.heliyon.2024.e24288`：CC BY-NC，PMC10826649。
- `10.1098/rsif.2025.0048`：CC BY，PMC12419882。
- `10.1016/j.isci.2023.107874`：CC BY，PMC10583114。
- `10.2147/JHL.S588532`：CC BY-NC，PMC12933237。
- `10.1038/s41598-025-33606-2`：CC BY-NC-ND，PMC12855836。
- `10.1016/j.isci.2023.108765`：CC BY-NC-ND，PMC10793179。

## 优先级建议

1. 先读介入医疗器械双层封装论文，学习热源、组织模拟体模、温升和 43 ℃安全阈值。
2. 再读隔离病房热管换热论文，建立医院热回收实验的最小模型。
3. 然后读北欧医院排风热泵和手术室净零论文，理解真实系统边界与经济性。
4. 最后把 TEG、PCM 和可穿戴人体余热作为技术备选，不要绕过“医疗安全与净收益”直接追求发电量。

## 尚待补全

- `10.1016/j.jobe.2025.112619`、`10.63044/w26raf09` 等论文尚未取得可读摘要或全文，不能引用具体性能数字。
- 下一轮应优先补充中国医院气候、电价、医疗建筑规范和中文核心文献。
- 当前数据库只保存题录和摘要级结论；只有完成全文精读后，才能把状态改为“已精读”。
