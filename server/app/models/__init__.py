"""表模型注册：init_db/create_all 依赖此处导入。B 的 asset.py 落地后同样在此登记。"""

from app.models.export_job import ExportJob  # noqa: F401
from app.models.asset import Asset  # noqa: F401
