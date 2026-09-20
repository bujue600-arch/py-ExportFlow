"""业务路由聚合：/api 下全部路由走信封路由类（core.envelope.EnvelopeRoute）。"""

from fastapi import APIRouter

from app.api.events import router as events_router
from app.api.jobs import router as jobs_router
from app.core.envelope import EnvelopeRoute

api_router = APIRouter(route_class=EnvelopeRoute)  # 直接挂在本路由器上的路由走信封；子路由器需各自声明（见 jobs.py 注释）
api_router.include_router(jobs_router)
api_router.include_router(events_router)
