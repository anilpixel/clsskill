# Node 化 CLS / APM CLI 设计

## 背景

当前仓库处于不一致状态：

- CLS 查询仍依赖外部 Homebrew 安装的 `clscli`
- APM 查询已经迁移到仓库内的 Node CLI
- `SKILL.md` 同时混用了旧的 Go / Homebrew 分发方式和新的 Node 方式
- `SKILL.md` 与脚本帮助文本中暴露了本机绝对路径，不适合作为通用技能文档

目标是把这套能力收敛成统一的仓库内实现：CLS 和 APM 都由 Node CLI 提供能力，通过现有脚本包装执行，不再依赖外部 `clscli` 二进制。

## 目标

- 让 CLS 和 APM 都由仓库内的 Node CLI 提供能力
- 保留 `scripts/clscli-run.sh` 和 `scripts/apm-trace-run.sh` 作为统一入口
- 移除 `SKILL.md` 中对 Homebrew `clscli` 的安装要求
- 移除技能文档和脚本帮助文本中的本机绝对路径
- 让 CLS CLI 在命令形态上尽量兼容当前 Go 版使用习惯，但默认输出稳定 JSON
- 保留 CSV 和文件导出能力，满足人工查看和落盘场景

## 非目标

- 不保留 Go 版 `clscli` 的运行时依赖
- 不引入 CLS 与 APM 的单一大一统 CLI
- 不做兼容层去同时支持旧二进制和新 Node 实现
- 不优先追求人类可读表格输出；agent 可消费的 JSON 契约优先

## 总体方案

仓库内维护两个独立的 Node CLI：

- `tools/cls-query-cli`
- `tools/apm-trace-cli`

脚本层继续作为稳定入口：

- `scripts/clscli-run.sh`
- `scripts/apm-trace-run.sh`

这两个脚本负责：

- 定位 skill 根目录
- 读取本地环境文件 `.env.clscli.local`
- 在需要时自动执行 `npm install` 和 `npm run build`
- 将参数透传给对应的 Node CLI

这样对上层技能调用和 agent 提示词来说，入口不变；变化只发生在脚本内部和实际实现层。

## 目录设计

### CLS

- `tools/cls-query-cli/package.json`
- `tools/cls-query-cli/tsconfig.json`
- `tools/cls-query-cli/src/cli.ts`
- `tools/cls-query-cli/src/cli-runner.ts`
- `tools/cls-query-cli/src/config.ts`
- `tools/cls-query-cli/src/sdk-client.ts`
- `tools/cls-query-cli/src/cls-client.ts`
- `tools/cls-query-cli/src/commands/`
- `tools/cls-query-cli/src/domain/`
- `tools/cls-query-cli/src/output/`
- `tools/cls-query-cli/tests/`

### APM

沿用现有 `tools/apm-trace-cli` 结构，不与 CLS 合并。

### 脚本与文档

- `scripts/clscli-run.sh`
- `scripts/clscli-env.sh`
- `scripts/clscli-config.sh`
- `scripts/apm-trace-run.sh`
- `scripts/apm-trace-env.sh`
- `scripts/apm-trace-config.sh`
- `SKILL.md`

## CLS CLI 设计

### 命令兼容策略

CLS CLI 采用“命令名尽量兼容，输出契约按 agent 重做”的策略。

第一原则：

- 尽量保留当前 Go 版高频子命令名
- 默认输出稳定 JSON
- 保留 `--output csv` 和文件输出能力

已知必须覆盖的能力：

- `topics`
- `query`
- `context`

因为用户要求“全量替换 Go 版”，实现时还需要先盘点当前 Go 版全部子命令、参数和行为，再将其纳入 Node 版范围。盘点结果将决定是否新增其它命令，但不改变上述整体策略。

### 输出策略

默认输出：

- 稳定 JSON

额外输出模式：

- `--output csv`
- `--output <文件路径>`

JSON 输出需要满足：

- 错误可结构化处理
- 结果字段稳定，适合 agent 消费
- 不混入表格、提示语或非结构化文本

### 错误契约

CLS CLI 的错误模型与 APM CLI 保持一致：

- 参数错误：输出 JSON 错误，退出码为 `1`
- 运行时错误：输出 JSON 错误，退出码为 `1`
- `--help`：输出帮助文本，退出码为 `0`

### 依赖选择

CLS 查询能力基于腾讯云官方 Node SDK 实现，不再依赖外部 `clscli` 二进制。

Node SDK 负责：

- 请求签名
- 腾讯云 API 调用
- 鉴权与基础错误传递

CLI 负责：

- 参数解析
- 时间范围转换
- 输出格式转换
- 分页与聚合
- JSON 错误模型

## APM CLI 设计

APM CLI 继续沿用当前仓库内的 Node 实现，不改变外部命令契约：

- `search`
- `get`
- `instances`
- `raw`

本轮只做两类收口：

- 与 CLS 保持一致的脚本包装和环境读取方式
- 文档与技能层移除绝对路径和 Homebrew 叙述

## 配置设计

共享本地配置文件：

- `.env.clscli.local`

CLS 需要：

- `TENCENTCLOUD_SECRET_ID`
- `TENCENTCLOUD_SECRET_KEY`
- 可选 `TENCENTCLOUD_REGION`

APM 需要：

- `TENCENTCLOUD_SECRET_ID`
- `TENCENTCLOUD_SECRET_KEY`
- `TENCENTCLOUD_REGION`
- 可选 `TENCENTCLOUD_APM_INSTANCE_ID`
- 可选 `TENCENTCLOUD_APM_BUSINESS_NAME`

配置脚本只负责写入和校验，不暴露具体开发机绝对路径。

## `SKILL.md` 调整

`SKILL.md` 需要做结构性修正：

- 删除 `metadata.requires.bin: clscli`
- 删除 Homebrew `clscli` 安装章节
- 把“安装”改成“仓库内脚本会自动安装和构建对应 Node CLI”
- 把所有绝对路径改成相对 skill 根目录的相对路径
- 明确区分 CLS 和 APM 是两个独立 Node CLI
- 更新自然语言配置和故障排查流程，使其与 Node 化后的脚本入口一致

## 迁移策略

### CLS

`scripts/clscli-run.sh` 保留不变，但内部从：

- `exec clscli "$@"`

迁移为：

- `exec node tools/cls-query-cli/dist/cli.js "$@"`

并在运行前自动安装依赖和构建。

### APM

`scripts/apm-trace-run.sh` 保持现状，仅继续对齐帮助文案和文档表述。

### 文档

一旦 CLS Node CLI 可用，文档中不再提及：

- `brew tap`
- `brew install`
- 外部 `clscli` 二进制
- 本机绝对路径

## 测试策略

### CLS Node CLI

- 参数解析测试
- 时间范围解析测试
- 过滤器构造测试
- JSON 错误契约测试
- CSV / 文件导出测试
- `topics` / `query` / `context` 命令测试
- 包装脚本测试

### APM 现有 CLI

- 保持现有测试
- 在文档和脚本变更后补充必要的回归测试

### 脚本层

重点覆盖：

- 自动安装与构建逻辑
- 环境文件读取
- 帮助命令不被包装成 JSON 错误
- 只读辅助模式不依赖无关前置条件

## 风险与取舍

### 风险

- Go 版 `clscli` 的完整命令面目前还未盘点，需要先读取源码确认全量替换范围
- CLS 官方 Node SDK 的返回结构可能和 Go 版现有输出不一致，需要在 CLI 层做稳定化
- 自动 `npm install` / `npm run build` 依赖网络环境，离线环境首次执行可能失败

### 取舍

- 不追求保留 Go 版逐字段输出兼容，优先保证新的稳定 JSON 契约
- 不在本轮继续保留 Homebrew 作为后备分发方式
- 不把 CLS 和 APM 合并成一个复杂 CLI，保持两个工具边界清晰

## 成功标准

以下条件同时满足，视为本设计完成：

- CLS 与 APM 都由仓库内 Node CLI 提供能力
- `scripts/clscli-run.sh` 与 `scripts/apm-trace-run.sh` 都可直接作为稳定入口使用
- `SKILL.md` 中不再要求安装 Homebrew `clscli`
- `SKILL.md` 和脚本帮助文案中不再暴露本机绝对路径
- CLS Node CLI 能完整覆盖当前 Go 版 `clscli` 的实际能力范围
- 默认 JSON 输出可被 agent 稳定消费
