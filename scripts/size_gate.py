"""源码体量门禁（size gate）v1.0.

用法:
    python scripts/size_gate.py          # 人类可读报告
    python scripts/size_gate.py --json   # 供 CI/产物消费

规则（阈值调整必须在 .rules/RULES-collab.md 登记版本）:
    1) 单文件: 有效行数（剔除空行与行注释）不得超过 FILE_RULES 中该后缀的上限;
    2) 目录预算: 每个预算目录下的有效行数总和不得超过 DIR_BUDGETS;
    3) 所有代码文件必须落在某个预算目录内（否则记「未纳入预算」违规）。

任何一条违规 -> 退出码 1，CI 失败。
"""

from __future__ import annotations

import argparse
import json
import sys
from collections.abc import Iterator
from dataclasses import asdict, dataclass
from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parents[1]

# --- 规则配置 ------------------------------------------------------------
FILE_RULES: dict[str, int] = {
    ".py": 300,
    ".ts": 300,
    ".tsx": 300,
}
DIR_BUDGETS: dict[str, int] = {
    "server": 2000,
    "apps/web/src": 4500,
    "scripts": 600,
    "tests": 800,
}
EXCLUDED_DIRS = {
    "node_modules", ".venv", "venv", "__pycache__",
    ".pytest_cache", ".ruff_cache", "dist", "build", ".git", "exports",
}
COMMENT_PREFIXES: dict[str, str] = {
    ".py": "#",
    ".ts": "//",
    ".tsx": "//",
}


@dataclass
class Violation:
    rule: str    # file_limit | dir_budget | unbudgeted
    target: str  # 文件或目录（相对仓库根）
    detail: str  # 人话描述


def count_effective_lines(path: Path) -> int:
    """统计有效行数: 剔除空行与整行注释（行注释以外的注释形态按普通行计）."""
    suffix = path.suffix
    prefix = COMMENT_PREFIXES.get(suffix)
    count = 0
    for raw in path.read_text(encoding="utf-8", errors="replace").splitlines():
        stripped = raw.strip()
        if not stripped:
            continue
        if prefix and stripped.startswith(prefix):
            continue
        count += 1
    return count


def iter_code_files(root: Path) -> Iterator[Path]:
    """遍历纳入统计的代码文件: 剪掉排除目录, 只保留 FILE_RULES 声明的后缀."""
    for path in sorted(root.rglob("*")):
        if not path.is_file() or path.suffix not in FILE_RULES:
            continue
        rel_parts = path.relative_to(root).parts
        if any(part in EXCLUDED_DIRS for part in rel_parts):
            continue
        yield path


def budget_of(rel_posix: str, dir_budgets: dict[str, int]) -> str | None:
    """返回文件所属预算目录（取最长前缀匹配）; 不属于任何预算返回 None."""
    matched: str | None = None
    for budget_dir in dir_budgets:
        is_under = rel_posix == budget_dir or rel_posix.startswith(budget_dir + "/")
        if is_under and (matched is None or len(budget_dir) > len(matched)):
            matched = budget_dir
    return matched


def check(
    root: Path,
    *,
    file_rules: dict[str, int] = FILE_RULES,
    dir_budgets: dict[str, int] = DIR_BUDGETS,
) -> tuple[list[Violation], dict[str, int]]:
    """执行检查, 返回 (违规列表, 各预算目录行数统计)."""
    violations: list[Violation] = []
    usage: dict[str, int] = {d: 0 for d in dir_budgets}

    for path in iter_code_files(root):
        rel_posix = path.relative_to(root).as_posix()
        lines = count_effective_lines(path)

        budget = budget_of(rel_posix, dir_budgets)
        if budget is None:
            violations.append(Violation(
                rule="unbudgeted",
                target=rel_posix,
                detail="未纳入任何预算目录, 请在 scripts/size_gate.py 的 DIR_BUDGETS 登记",
            ))
        else:
            usage[budget] += lines

        limit = file_rules.get(path.suffix)
        if limit is not None and lines > limit:
            violations.append(Violation(
                rule="file_limit",
                target=rel_posix,
                detail=f"{lines} 行 > 单文件上限 {limit} 行",
            ))

    for budget_dir, budget in dir_budgets.items():
        if usage[budget_dir] > budget:
            violations.append(Violation(
                rule="dir_budget",
                target=budget_dir,
                detail=f"合计 {usage[budget_dir]} 行 > 目录预算 {budget} 行",
            ))
    return violations, usage


def render_report(violations: list[Violation], usage: dict[str, int]) -> str:
    lines = ["== 源码体量门禁 v1.0 =="]
    for budget_dir, used in sorted(usage.items()):
        budget = DIR_BUDGETS[budget_dir]
        pct = used / budget * 100 if budget else 0
        lines.append(f"  {budget_dir:<18} {used:>6} / {budget:<6} {pct:5.1f}%")
    if violations:
        lines.append(f"违规 {len(violations)} 项:")
        for v in violations:
            lines.append(f"  [{v.rule}] {v.target}: {v.detail}")
        lines.append("结果: 未通过 ✗")
    else:
        lines.append("违规 0 项")
        lines.append("结果: 通过 ✓")
    return "\n".join(lines)


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(description="源码体量门禁")
    parser.add_argument("--json", action="store_true", help="输出 JSON")
    parser.add_argument("--root", default=str(REPO_ROOT), help="仓库根目录")
    args = parser.parse_args(argv)

    root = Path(args.root).resolve()
    violations, usage = check(root)

    if args.json:
        payload = {
            "passed": not violations,
            "violations": [asdict(v) for v in violations],
            "usage": usage,
        }
        print(json.dumps(payload, ensure_ascii=False, indent=2))
    else:
        print(render_report(violations, usage))
    return 1 if violations else 0


if __name__ == "__main__":
    sys.exit(main())
