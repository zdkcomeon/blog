---
title: 接口超时后，怎样重试才不会重复创建任务？
description: 以报表导出为例，用幂等键和 PostgreSQL 唯一约束处理响应丢失、并发提交和参数冲突。
date: 2026-11-19
category:
- 实践笔记
tag:
- HTTP
- PostgreSQL
- 接口设计
---

用户点了一次导出。服务端已经把任务写进数据库，客户端却在收到响应前超时了。如果重试也直接写入，系统可能生成两份同样的报表。

给这类接口加上幂等保障，客户端就能用同一次提交的标识找回任务。HTTP 规范建议，客户端应在知道请求具备幂等语义，或能确认原请求未生效时，才自动重试这类写请求。 [RFC 9110 §9.2.2](https://www.rfc-editor.org/rfc/rfc9110.html#section-9.2.2)

## 给每次提交一个键

用户发起导出时，客户端生成一个随机 UUID，放进 `Idempotency-Key` 请求头。网络超时后，用原来的键和参数重发。用户主动发起另一笔导出时，即使选了同一个月，也要生成新键。

```http
POST /export-jobs
Content-Type: application/json
Idempotency-Key: 0c5b8065-7fcc-4e68-925a-aa4730170daf

{"reportType":"sales","reportMonth":"202610"}
```

首次受理和参数一致的重试都返回 `202 Accepted`，响应体里的 `jobId` 是同一个十进制字符串，例如 `{"jobId":"928473645092813824"}`。任务进度通过 `GET /export-jobs/{jobId}` 查询。

## 用唯一约束处理并发

如果先查再写，两个同时到达的请求可能都查不到任务。以 PostgreSQL 为例，给 `export_job` 表加上 `UNIQUE (account_id, request_key)`，两列均设为 `NOT NULL`。`account_id` 取自服务端确认的登录账号，`request_key` 取自校验后的请求头。同一个账号用同一个键提交多次，只有一条记录能成功写入。

```sql
INSERT INTO export_job (id, account_id, request_key, report_type, report_month, status)
VALUES ($1, $2, $3, $4, $5, 'PENDING')
ON CONFLICT (account_id, request_key) DO NOTHING
RETURNING id;
```

如果 `RETURNING` 得到任务 ID，事务提交后再返回受理结果。如果没有返回记录，就另发一条 `SELECT`，从刚才尝试写入的数据库主库读原任务。在 PostgreSQL 默认的 `READ COMMITTED` 隔离级别下，下一条语句会取得新的快照，可以读到并发请求刚提交的任务。 [PostgreSQL 事务隔离文档](https://www.postgresql.org/docs/current/transaction-iso.html#XACT-READ-COMMITTED)

```sql
SELECT id, report_type, report_month
FROM export_job
WHERE account_id = $1 AND request_key = $2;
```

比较原记录和本次请求中已经校验过的报表类型与月份。参数相同时返回原任务 ID，参数不同时返回 `409 Conflict`。如果接口还支持文件格式或导出范围，也要比较这些会影响报表结果的字段。

## 约定重试窗口

任务记录至少要保留到承诺的重试窗口结束。比如接口允许在 24 小时内以原键重试，就要在这段时间内保留任务 ID、键和用于比较的参数。客户端也应在窗口内限制重试次数，给两次尝试之间留出间隔。

这里的唯一约束管的是任务创建。后台如果也会重跑导出，写文件等操作需要按任务 ID 做自己的去重。

## 验证四种情况

同时检查接口返回值和任务表的行数，才能确认重试确实只对应一条任务。

| 场景 | 应看到的结果 |
| --- | --- |
| 第一次已提交，响应在途中丢失 | 同键重试拿到原任务 ID，累计新增一条任务 |
| 同账号、同键、同参数并发提交 | 两个成功响应返回同一个任务 ID，累计新增一条任务 |
| 同一个键换成另一个月份 | 返回 `409 Conflict`，任务数保持为一条 |
| 第一次写入后事务回滚 | 后续同键请求可以正常创建任务，累计新增一条任务 |
