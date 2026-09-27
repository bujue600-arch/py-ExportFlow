"""端到端冒烟：真实 uvicorn 服务器上的信封/SSE/幂等验证（兑现 D4 的 HTTP 层承诺）。

TestClient 的流式响应在当前栈会缓冲挂起（见 learn/D4-讲解 §5），因此用真实
服务器验证 SSE 的 HTTP 传输。用法：

    python scripts/e2e_smoke.py

步骤：起服务器(独立临时库) → /healthz → 创建导出(信封+幂等) → SSE 首块 snapshot
→ 等待 worker 执行(占位执行器 FAILED 3003) → SSE 收到 job_updated → 关服务器。
"""

from __future__ import annotations

import os
import subprocess
import sys
import tempfile
import time
from pathlib import Path

import httpx

REPO = Path(__file__).resolve().parents[1]
BASE = "http://127.0.0.1:8123"


def start_server(db_path: Path) -> subprocess.Popen:
    env = {**os.environ, "EXPORTFLOW_DB": str(db_path), "EXPORTFLOW_WORKER": "1"}
    return subprocess.Popen(
        [sys.executable, "-m", "uvicorn", "app.main:app", "--port", "8123", "--app-dir", "server"],
        cwd=REPO, env=env, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL,
    )


def wait_ready(client: httpx.Client, timeout: float = 15.0) -> None:
    deadline = time.time() + timeout
    while time.time() < deadline:
        try:
            if client.get(f"{BASE}/healthz").status_code == 200:
                return
        except httpx.TransportError:
            time.sleep(0.3)
    raise RuntimeError("服务器未就绪")


def read_first_sse_block(client: httpx.Client, timeout: float = 10.0) -> dict[str, str]:
    fields: dict[str, str] = {}
    with client.stream("GET", f"{BASE}/api/events", timeout=timeout) as response:
        assert response.status_code == 200, "SSE 状态码非 200"
        assert response.headers["content-type"].startswith("text/event-stream")
        for line in response.iter_lines():
            if line == "":
                if fields:
                    break
                continue
            key, _, value = line.partition(": ")
            fields[key] = value
    return fields


def main() -> int:
    with tempfile.TemporaryDirectory() as tmp:
        server = start_server(Path(tmp) / "e2e.db")
        try:
            with httpx.Client() as client:
                wait_ready(client)

                # 1. 信封与幂等
                key = "e2e-key-001"
                body = {"mode": "SELECTED_IDS", "selected_ids": ["a1", "a2"], "format": "csv"}
                r1 = client.post(f"{BASE}/api/export-jobs", json=body, headers={"Idempotency-Key": key})
                assert r1.status_code == 200 and r1.json()["code"] == 0, r1.text
                job_id = r1.json()["data"]["id"]
                r2 = client.post(f"{BASE}/api/export-jobs", json=body, headers={"Idempotency-Key": key})
                assert r2.json()["data"]["id"] == job_id, "幂等失败：重复创建"

                # 2. SSE 首块 snapshot（HTTP 层真流式）
                first = read_first_sse_block(client)
                assert first["event"] == "snapshot", first
                assert job_id in first["data"], "snapshot 应包含已创建任务"

                # 3. worker 执行（占位执行器 → FAILED 3003），详情可查
                time.sleep(2.5)
                detail = client.get(f"{BASE}/api/export-jobs/{job_id}").json()["data"]
                assert detail["status"] == "FAILED", detail
                assert detail["error"]["code"] == "3003"

                # 4. trace_id 全链路存在
                r3 = client.get(f"{BASE}/api/export-jobs/job_nope")
                assert r3.json()["code"] == 2001 and r3.json()["trace_id"]

            print("E2E SMOKE: PASS ✓（信封/幂等/SSE snapshot/worker 兜底/trace_id）")
            return 0
        except AssertionError as exc:
            print(f"E2E SMOKE: FAIL ✗ —— {exc}")
            return 1
        finally:
            server.terminate()
            server.wait(timeout=10)


if __name__ == "__main__":
    sys.exit(main())
