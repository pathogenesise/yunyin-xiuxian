# 转世灵根可感知性 + 人物页历世记录 —— 设计文档

**日期**: 2026-09-14
**状态**: 已批准
**关联问题**: 用户反馈"转世往生后灵根似乎没有重置"（实为感知缺失——灵根确实每次转世重掷，但界面从不展示）

## 背景

### 调查结论（代码实证）

1. **灵根每次转世都重掷**（`src/core/reincarnation.ts:221` → `src/stores/player.ts:458` `linggen.value = newLinggen`），但：
   - `ReincarnationView`（`src/stores/ui.ts:37`）**没有任何灵根字段**——玩家转世全程看不到新灵根。
   - 资质地板（`aptitudeFloorNow` = max(次数×5, 宿慧/12)）使资质在第 12 世起恒为 100，品阶差异感进一步淡化。
2. **修仙录已有"历世履历"**（`src/views/LegacyView.vue:97-109`），逐世展示境界/寿数/命题/宿慧，**但不含灵根**。
3. `LifeRecord`（`src/data/samsara.ts:123`）无灵根字段——历世数据想展示灵根也无源可依。

### 目标

- 让"转世=灵根重生"成为玩家**可感知、有仪式感**的事件。
- 让历世履历**带上灵根**，人物页即可回望每世的牌面。

## 范围

### 交付 1：转世灵根可感知性

- **数据层**：
  - `ReincarnationView` 新增 `nextLinggen: LinggenProfile`。
  - `prepareReincarnation`（`reincarnation.ts:87`）rolls 一次灵根存入 `view.nextLinggen`。**只生成对象，不改任何 store 状态**（符合该函数头部"只算不改"的红线——本轮仍然只算不改，roll 一个对象并不落账）。
  - `confirmReincarnation`（`reincarnation.ts:152`，第 221 行）改为 `player.rebirth(view.nextLinggen)`，**不再自行 roll**。
- **UI**：
  - `ReincarnationDialog.vue` 第二程"轮回"屏"择一先天之姿"上方插入新灵根卡：品阶名 + 五行元素徽记（复用人物页 `ELEMENTS[...].char/color` 圆徽风格）+ 资质 + `×growthMult`，配"来世之躯，云泥之别"类文案。
  - confirm 后追加 toast 播报新灵根品阶（复用 `ui.toast` `rare` 通道）。

### 交付 2：人物页"历世"区块（+ 修仙录受益）

- **数据层**：`LifeRecord` 新增可选 `linggen?: { gradeName: string; roots: SpiritRoot[] }`。
  - 落点：`confirmReincarnation` 的 `recordLife`（第 173 行）**早于** `rebirth`（第 221 行）——快照的是**本世**灵根（第 N 世用过的灵根），语义正确。
  - 老存档无此字段，可选字段兜底。
- **UI**：
  - `CharacterView.vue` 顶部灵根卡之后内嵌"历世"卡：最近 5 世，每世一行 `第N世 · 灵根徽记 · 境界 · 命题结局 · 宿慧+N`，超出显示"余者见修仙录"。
  - `LegacyView.vue` 历世履历每行补灵根徽记（老记录无灵根字段时留空不崩）。

### 测试（TDD）

1. prepare 产出 `view.nextLinggen` 为合法 `LinggenProfile`，且不动任何 store 状态。
2. confirm 后 `player.linggen` 与 `view.nextLinggen` 为同一对象引用（所见即所得，杜绝二次 roll）。
3. `recordLife` 快照到 `LifeRecord.linggen` 与本世灵根一致。
4. 老存档无 `linggen` 字段时展示兜底不崩。

### 范围外（YAGNI）

- 不补转世灵根重掷界面（Phase 32.2 已有 decision 否决；本项目只做"可感知性"，不做"可决策性"）。
- 不改资质地板 / growthMult 任何数值。
- 不改动既有否决：不相干系统不触碰。

## 关键设计约束

### 所见即所得（WYSIWYG）是硬约束

`prepareReincarnation` 与 `confirmReincarnation` 分处两步。若预览 roll 一个、落账再 roll 一个，玩家会看到"预览天灵根、实拿杂灵根"。因此：

- 灵根**只在 prepare 时 roll 一次**，存 view。
- confirm **用 view 中已存那份**，绝不二次 roll。

### 存档兼容

`LifeRecord.linggen` 为可选字段，旧存档缺省时：

- CharacterView / LegacyView 用可选链兜底，不展示灵根徽记但不崩。
- 品阶文案有"历世已开展"时正常展示其余既有字段。

## 架构落点

| 层 | 文件 | 改动 |
|----|------|------|
| 类型 | `src/data/samsara.ts` | `LifeRecord` + `linggen?` 字段 |
| 类型 | `src/stores/ui.ts` | `ReincarnationView` + `nextLinggen` |
| 逻辑 | `src/core/reincarnation.ts` | prepare 中 roll 并存 view；confirm 改用 view 副本、recordLife 快照本世灵根 |
| UI | `src/components/character/ReincarnationDialog.vue` | 第二程插新灵根卡；confirm 加 toast |
| UI | `src/views/CharacterView.vue` | 顶部内嵌"历世"卡 |
| UI | `src/views/LegacyView.vue` | 历世履历每行补灵根徽记 |
| 测试 | `src/core/*.spec.ts` | prepare/confirm WYSIWYG、recordLife 快照、兜底 |

## 错误处理

- view 为空（刷新后重登等）：`confirmReincarnation` 已有 `if (!view) return` 保护，不新增路径。
- `view.nextLinggen` 由 prepare 写入、confirm 只从 view 取，缺失即违反 WYSIWYG 不变量 ⇒ **不做二次 roll 兜底**（二次 roll 会静默破坏"预览＝实得"契约）。若缺失，视为不变量违例；普通路径下 prepare 必先行。

## 成功标准

- 转世第二程可看到"来世灵根"，确认后 toast 播报。
- 人物页/修仙录可回望每世灵根徽记。
- 上述 4 条测试全绿；`npm test` 无回归。
