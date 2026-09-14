"""让 server/tests 能以 `pytest server/tests` 从仓库根目录运行。"""

import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))  # server/ 加入导入路径
