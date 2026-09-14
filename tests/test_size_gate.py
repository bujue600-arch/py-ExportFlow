"""体量门禁自身的测试: 用临时目录构造最小违规场景, 锁定门禁行为."""

from __future__ import annotations

import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1] / "scripts"))

import size_gate


def write(path: Path, content: str) -> Path:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(content, encoding="utf-8")
    return path


def test_合规文件_无违规(tmp_path: Path) -> None:
    write(tmp_path / "server" / "ok.py", "x = 1\n")
    violations, _ = size_gate.check(
        tmp_path, file_rules={".py": 10}, dir_budgets={"server": 10},
    )
    assert violations == []


def test_单文件超限_记违规(tmp_path: Path) -> None:
    write(tmp_path / "server" / "big.py", "\n".join(f"v{i} = {i}" for i in range(5)))
    violations, _ = size_gate.check(
        tmp_path, file_rules={".py": 3}, dir_budgets={"server": 100},
    )
    assert [(v.rule, v.target) for v in violations] == [("file_limit", "server/big.py")]


def test_目录超预算_记违规(tmp_path: Path) -> None:
    write(tmp_path / "server" / "a.py", "1\n2\n")
    write(tmp_path / "server" / "b.py", "3\n4\n")
    violations, usage = size_gate.check(
        tmp_path, file_rules={".py": 10}, dir_budgets={"server": 3},
    )
    assert violations[0].rule == "dir_budget"
    assert usage["server"] == 4


def test_排除目录_不统计(tmp_path: Path) -> None:
    write(tmp_path / "server" / "node_modules" / "huge.py", "x" * 10 + "\n" * 100)
    violations, usage = size_gate.check(
        tmp_path, file_rules={".py": 5}, dir_budgets={"server": 5},
    )
    assert violations == []
    assert usage["server"] == 0


def test_预算外文件_记违规(tmp_path: Path) -> None:
    write(tmp_path / "server" / "in.py", "x = 1\n")
    write(tmp_path / "other" / "out.ts", "const a = 1\n")
    violations, _ = size_gate.check(
        tmp_path, file_rules={".py": 10, ".ts": 10}, dir_budgets={"server": 10},
    )
    assert [(v.rule, v.target) for v in violations] == [("unbudgeted", "other/out.ts")]


def test_有效行数_剔除空行与行注释() -> None:
    import tempfile

    with tempfile.NamedTemporaryFile(suffix=".py", delete=False, mode="w", encoding="utf-8") as f:
        f.write("# 注释行\n\ncode = 1\n\n\nother = 2  # 行尾注释仍计入\n")
        path = Path(f.name)
    assert size_gate.count_effective_lines(path) == 2
