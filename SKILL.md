---
name: clscli
description: 当需要查询、筛选、统计或排查腾讯云 CLS 日志、腾讯云 APM 调用链时使用。
---

# CLS / APM 查询技能

仓库内有两个独立的 Node 命令行工具：

- CLS 查询工具：`tools/cls-query-cli`
- APM 调用链工具：`tools/apm-trace-cli`

默认通过 `./scripts/clscli-run.sh` 和 `./scripts/apm-trace-run.sh` 执行。

## 目录约定

以下路径都以 skill 根目录为基准：

- skill 根目录：`.`
- 本地凭证文件：`.env.clscli.local`
- 凭证示例文件：`.env.clscli.local.example`
- CLS 查询入口脚本：`./scripts/clscli-run.sh`
- CLS 配置脚本：`./scripts/clscli-config.sh`
- CLS 环境校验脚本：`./scripts/clscli-env.sh`
- APM 查询入口脚本：`./scripts/apm-trace-run.sh`
- APM 配置脚本：`./scripts/apm-trace-config.sh`
- APM 环境校验脚本：`./scripts/apm-trace-env.sh`
- CLS 工具目录：`tools/cls-query-cli`
- APM 工具目录：`tools/apm-trace-cli`

## 准备

1. 确认本机已安装 Node.js。
2. 准备腾讯云 CLS 凭证和地域信息：
   https://cloud.tencent.com/document/api/614/56474

如果要查询 APM 调用链，还需要：

- `TENCENTCLOUD_APM_INSTANCE_ID`
- 可选 `TENCENTCLOUD_APM_BUSINESS_NAME`

## 自然语言配置

如果用户没有配置凭证，或者明确说了下面这类话：

- `帮我配置 clscli`
- `配置腾讯云 CLS 凭证`
- `设置 clscli 的 SecretId 和 SecretKey`

agent 应该按下面流程执行：

1. 向用户索要 `SecretId` 和 `SecretKey`，可选再问 `region`
2. 执行：
   ```bash
   ./scripts/clscli-config.sh \
     --secret-id "<SecretId>" \
     --secret-key "<SecretKey>" \
     --region "<region>"
   ```
3. 告知用户已写入本地配置文件，不要回显密钥明文

如果用户已经给过凭证，也可以直接帮用户写入本地文件，不要求用户自己 `export` 环境变量。

如果用户说下面这类话：

- `帮我配置 APM 调用链查询`
- `配置 APM InstanceId`
- `设置 APM 查询的实例 ID`

agent 应该按下面流程执行：

1. 索要 `InstanceId`，如缺少凭证或 region，再索要 `SecretId`、`SecretKey`、`region`
2. 执行：
   ```bash
   ./scripts/apm-trace-config.sh \
     --instance-id "<InstanceId>" \
     --business-name "<BusinessName>" \
     --region "<region>" \
     --secret-id "<SecretId>" \
     --secret-key "<SecretKey>"
   ```
3. 告知用户已写入本地配置文件，不要回显密钥明文

## 配置校验

执行下面命令可以检查本地配置是否可用：

```bash
./scripts/clscli-env.sh --check
```

执行下面命令可以检查 APM 调用链查询配置是否可用：

```bash
./scripts/apm-trace-env.sh --check
```

## 使用约定

- 默认不要直接要求用户手动 `export` 环境变量
- 默认通过 `./scripts/clscli-run.sh` 执行 CLS 查询工具
- 默认通过 `./scripts/apm-trace-run.sh` 执行 APM 调用链工具
- 如果本地配置文件不存在或缺字段，应优先进入“自然语言配置”流程
- 如果不知道日志 topic，先列出 topic，再继续查询

## 用法

### 列出日志主题

先列出 topic，确定 `--region` 与 topic ID。

```bash
./scripts/clscli-run.sh \
  topics --region <region> [--topic-name name] [--logset-name name] [--logset-id id] [--limit 20] [--offset 0]
```

示例：

```bash
./scripts/clscli-run.sh topics --region ap-shanghai --limit 20
```

| 参数              | 必填 | 说明                            |
| ----------------- | ---- | ------------------------------- |
| `--region`        | 是   | CLS 地域，例如 `ap-guangzhou`   |
| `--topic-name`    | 否   | 按 topic 名模糊过滤             |
| `--logset-name`   | 否   | 按日志集名模糊过滤              |
| `--logset-id`     | 否   | 按日志集 ID 过滤                |
| `--limit`         | 否   | 单页大小，默认 20，最大 100     |
| `--offset`        | 否   | 分页偏移量，默认 0              |

输出列：`Region`、`TopicId`、`TopicName`、`LogsetId`、`CreateTime`、`StorageType`

### 查询日志

```bash
./scripts/clscli-run.sh \
  query -q "[查询条件] | [SQL 语句]" --region <region> -t <TopicId> --last 1h
```

示例：

- 时间：`--last 1h`、`--last 30m`，或者 `--from` / `--to`（Unix 毫秒）
- 多 topic：`--topics <id1>,<id2>` 或重复传多个 `-t <id>`
- 自动翻页并限制总量：`--max 5000`
- 输出：`--output=json`、`--output=csv`、`-o result.json`

| 参数              | 必填                                | 说明                                                                |
| ----------------- | ----------------------------------- | ------------------------------------------------------------------- |
| `--region`        | 是                                  | CLS 地域，例如 `ap-guangzhou`                                       |
| `-q` / `--query`  | 是                                  | 查询条件或 SQL，例如 `level:ERROR` 或 `* \| select count(*) as cnt` |
| `-t` / `--topic`  | `-t` / `--topics` 二选一            | 单个日志 topic ID                                                   |
| `--topics`        | `-t` / `--topics` 二选一            | 逗号分隔的 topic ID，最多 50 个                                     |
| `--last`          | `--last` / `--from` / `--to` 三选一 | 相对时间范围，例如 `1h`、`30m`、`24h`                               |
| `--from` / `--to` | `--last` / `--from` / `--to` 三选一 | 开始 / 结束时间（Unix 毫秒）                                        |
| `--limit`         | 否                                  | 单次请求日志数，默认 100，最大 1000                                 |
| `--max`           | 否                                  | 自动翻页时的最大日志总量；不传时只请求一页                          |
| `--output` / `-o` | 否                                  | 输出为 `json`、`csv` 或文件路径                                     |
| `--sort`          | 否                                  | 排序方式，`asc` 或 `desc`，默认 `desc`                              |

### 查询上下文日志

围绕一条具体日志取上下文。

```bash
./scripts/clscli-run.sh \
  context <PkgId> <PkgLogId> --region <region> -t <TopicId> --btime <SearchLog.Results[].Time>
```

| 参数              | 必填 | 类型    | 说明                                                | 示例                   |
| ----------------- | ---- | ------- | --------------------------------------------------- | ---------------------- |
| `--region`        | 是   | String  | CLS 地域                                            | `ap-guangzhou`         |
| `-t` / `--topic`  | 是   | String  | 日志 topic ID                                       | -                      |
| `--btime`         | 是   | String  | 日志基准时间，优先传 `SearchLog Results[].Time` 的 Unix 毫秒时间戳 | `1776416550035`        |
| `PkgId`           | 是   | String  | 日志包 ID，即 `SearchLog Results[].PkgId`           | `528C1318606EFEB8-1A7` |
| `PkgLogId`        | 是   | Integer | 日志在包内的索引，即 `SearchLog Results[].PkgLogId` | `65536`                |

## APM 调用链查询

### 查询调用链列表

```bash
./scripts/apm-trace-run.sh \
  search --source apm --instance-id <InstanceId> --trace-id <traceId> --last 15m
```

常用参数：

| 参数                | 必填                                  | 说明                                                                           |
| ------------------- | ------------------------------------- | ------------------------------------------------------------------------------ |
| `--source`          | 否                                    | 数据源，`apm` 或 `otel`，默认 `apm`                                            |
| `--instance-id`     | 否                                    | 显式指定 APM 实例 ID；不传时会先读本地配置，若当前地域下只有一个实例则自动选中 |
| `--trace-id`        | 否                                    | 按 traceId 过滤                                                                |
| `--service`         | 否                                    | 按服务名过滤                                                                   |
| `--span-id`         | 否                                    | 按 spanId 过滤                                                                 |
| `--operation`       | 否                                    | 按操作名过滤                                                                   |
| `--filter`          | 否                                    | 附加过滤器，格式 `key:type:value`，可重复传                                    |
| `--last`            | `--last` / `--start` / `--end` 三选一 | 相对时间窗口，例如 `15m`                                                       |
| `--start` / `--end` | `--last` / `--start` / `--end` 三选一 | 绝对时间，支持秒级时间戳或 ISO 时间                                            |
| `--limit`           | 否                                    | 单页大小                                                                       |
| `--offset`          | 否                                    | 分页偏移量                                                                     |

输出为稳定 JSON，适合 agent 直接消费。

`--filter` 的透传规则：

- `--filter` 会直接透传到腾讯云 APM 云 API 的 `Filters` 数组
- 每个 `--filter` 都会被拆成一个对象：`{ Key, Type, Value }`
- `key` 必须直接填写腾讯云 APM API 认可的过滤维度名，不会在 CLI 里做字段名翻译
- `type` 按腾讯云官方文档使用 `=`、`!=`、`in`
- `in` 需要把多个值放进同一个过滤器的 `value`，并用英文逗号连接

常见过滤维度示例：

- `service.name`
- `operationName`
- `traceID`
- `spanID`

示例：

```bash
./scripts/apm-trace-run.sh \
  search --source apm --instance-id <InstanceId> --last 15m \
  --filter 'service.name:=:prod_muyan-springboot' \
  --filter 'operationName:=:POST /muyan/api/product/parent/product/list'
```

```bash
./scripts/apm-trace-run.sh \
  search --source apm --instance-id <InstanceId> --last 15m \
  --filter 'http.status_code:!=:200'
```

```bash
./scripts/apm-trace-run.sh \
  search --source apm --instance-id <InstanceId> --last 15m \
  --filter 'traceID:in:trace-a,trace-b,trace-c'
```

如果 agent 不确定过滤维度名，优先：

1. 先用高层参数 `--trace-id`、`--service`、`--span-id`、`--operation`
2. 再参考腾讯云 APM API 文档里 `Filter` 的 `Key/Type/Value` 定义
3. 仍然拿不准时，改用 `raw` 直接构造 `Filters`

### 获取单条调用链

```bash
./scripts/apm-trace-run.sh \
  get --source apm --instance-id <InstanceId> --trace-id <traceId> --last 15m
```

该命令会自动分页抓取同一条 trace 的 span，并返回：

- `traceId`
- `spanCount`
- `rootSpanIds`
- `spans`
- `tree`

### 透传原生请求

```bash
./scripts/apm-trace-run.sh \
  raw --source apm --request-json '{"StartTime":1710000000,"EndTime":1710000600}'
```

如果需要完整控制 `Filters`、`OrderBy` 等字段，优先使用 `raw`。

### 列出当前可见的 APM 实例

```bash
./scripts/apm-trace-run.sh instances
```

该命令只依赖：

- `TENCENTCLOUD_SECRET_ID`
- `TENCENTCLOUD_SECRET_KEY`
- `TENCENTCLOUD_REGION`

输出为稳定 JSON，适合 agent 先取实例列表，再决定后续查询时传哪个 `--instance-id`。

## CQL 查询语法

支持两种语法：

- **CQL**：CLS 自带查询语法，适合日志检索，推荐使用
- **Lucene**：限制较多，不推荐优先使用

| 语法              | 说明                                        |
| ----------------- | ------------------------------------------- |
| `key:value`       | 字段包含匹配，例如 `level:ERROR`            |
| `value`           | 全文搜索，例如 `ERROR`                      |
| `AND`             | 逻辑与，例如 `level:ERROR AND pid:1234`     |
| `OR`              | 逻辑或，例如 `level:ERROR OR level:WARNING` |
| `NOT`             | 逻辑非，例如 `level:ERROR AND NOT pid:1234` |
| `()`              | 分组控制优先级                              |
| `"..."` / `'...'` | 短语匹配                                    |
| `*`               | 通配符，不能做前缀通配                      |
| `> >= < <= =`     | 数值范围比较                                |
| `\`               | 转义特殊字符                                |
| `key:*`           | 字段存在                                    |
| `key:""`          | 文本字段存在但为空                          |

## SQL 分析语法

支持：

- `SELECT`
- `AS`
- `GROUP BY`
- `ORDER BY`
- `LIMIT`
- `WHERE`
- `HAVING`
- 嵌套子查询
- CLS 支持的各类 SQL 函数

## 失败处理

### 缺少本地配置

如果脚本报出下面这类错误：

```bash
未找到本地配置文件
本地配置缺少字段
```

不要让用户自己设置 shell 环境变量，直接进入“自然语言配置”流程。

如果 APM 脚本报出这类错误：

```bash
缺少环境变量：TENCENTCLOUD_APM_INSTANCE_ID
本地配置缺少字段：TENCENTCLOUD_APM_INSTANCE_ID
```

先尝试：

```bash
./scripts/apm-trace-run.sh instances
```

如果只有一个实例，可以直接把它写入本地配置；如果有多个实例，选择一个后再进入 APM 配置流程。

### 地域不确定

优先先跑 topic 列表：

```bash
./scripts/clscli-run.sh topics --region ap-shanghai --limit 20
```

### 仍然没有结果

优先按下面顺序排查：

1. region 是否正确
2. topic 是否存在
3. 时间范围是否正确
4. 查询条件是否过窄
