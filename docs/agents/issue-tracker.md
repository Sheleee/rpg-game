# Issue tracker: 本地 Markdown

Issues 和 PRD 以 markdown 文件形式存放在 `.scratch/` 目录下。

## 约定

- 每个功能一个目录：`.scratch/<功能名>/`
- PRD 为 `.scratch/<功能名>/spec.md`
- 实现 issues 为 `.scratch/<功能名>/issues/<序号>-<slug>.md`，从 `01` 开始编号
- 分类状态记录在每个 issue 文件顶部的 `Status:` 行
- 对话历史追加到文件底部的 `## Comments` 标题下

## 当 skill 说"发布到 issue tracker"时

在 `.scratch/<功能名>/` 下创建新文件（如目录不存在则创建）。

## 当 skill 说"获取相关 ticket"时

读取引用路径的文件。用户通常会直接传递路径或 issue 编号。

## 寻路操作

- **Map**：`.scratch/<任务名>/map.md` — 笔记 / 已有决策 / 未知信息
- **Child ticket**：`.scratch/<任务名>/issues/序号-<slug>.md`，从 `01` 开始编号
- **阻塞关系**：文件顶部的 `Blocked by: 序号, 序号` 行
- **前沿任务**：扫描未完成、未阻塞、未认领的文件；按编号优先
- **认领**：设置 `Status: claimed`，在开始工作前保存
- **完成**：在 `## Answer` 下追加答案，设置 `Status: resolved`，更新 map 的 Decisions-so-far
