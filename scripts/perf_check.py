"""查询性能验证：对 server/exportflow.db 的三种典型查询计时（B-D6）。

用法：
1. 先生成数据：cd server && python -m app.seed --count 10000 --db exportflow.db --profile demo
2. 仓库根目录运行：python scripts/perf_check.py

每种查询跑 20 次取平均；平均超过 50ms 时打印 EXPLAIN QUERY PLAN 并给出
索引建议（只提示，不直接改模型）。
"""

from __future__ import annotations

import sqlite3
import time
from pathlib import Path

DB_PATH = Path(__file__).resolve().parents[1] / "server" / "exportflow.db"
RUNS = 20
SLOW_MS = 50.0

QUERIES = {
    "无条件分页": (
        "SELECT * FROM asset ORDER BY created_at DESC LIMIT 20 OFFSET 0"
    ),
    "asset_type 过滤": (
        "SELECT * FROM asset WHERE asset_type = 'image' "
        "ORDER BY created_at DESC LIMIT 20 OFFSET 0"
    ),
    "keyword 模糊": (
        "SELECT * FROM asset WHERE lower(title) LIKE '%漫剧%' LIMIT 20"
    ),
}

INDEX_HINTS = {
    "无条件分页": "建议：CREATE INDEX ix_asset_created_at ON asset(created_at DESC)",
    "asset_type 过滤": (
        "建议：CREATE INDEX ix_asset_type_created ON asset(asset_type, created_at DESC)"
    ),
    "keyword 模糊": "建议：前导通配 LIKE 走不了普通索引；数据量大时考虑 FTS5 全文索引",
}


def time_query(conn: sqlite3.Connection, sql: str) -> float:
    samples: list[float] = []
    for _ in range(RUNS):
        started = time.perf_counter()
        conn.execute(sql).fetchall()
        samples.append((time.perf_counter() - started) * 1000)
    return sum(samples) / len(samples)


def main() -> None:
    if not DB_PATH.is_file():
        raise SystemExit(f"数据库不存在：{DB_PATH}（先跑 seed 生成数据）")
    conn = sqlite3.connect(DB_PATH)
    try:
        total = conn.execute("SELECT COUNT(*) FROM asset").fetchone()[0]
        print(f"数据量: {total} 条 | 每种查询跑 {RUNS} 次取平均 | 慢查询阈值 {SLOW_MS:.0f}ms")
        for name, sql in QUERIES.items():
            avg_ms = time_query(conn, sql)
            print(f"  {name}: {avg_ms:.2f} ms")
            if avg_ms > SLOW_MS:
                plan = conn.execute(f"EXPLAIN QUERY PLAN {sql}").fetchall()
                print("    EXPLAIN QUERY PLAN:")
                for row in plan:
                    print(f"      {row}")
                print(f"    {INDEX_HINTS[name]}")
    finally:
        conn.close()


if __name__ == "__main__":
    main()
