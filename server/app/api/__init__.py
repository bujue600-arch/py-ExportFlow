"""业务路由聚合：/api 下全部路由走信封路由类（core.envelope.EnvelopeRoute）。"""

from fastapi import APIRouter

from app.core.envelope import EnvelopeRoute

api_router = APIRouter(route_class=EnvelopeRoute)

# D3: from app.api import assets; api_router.include_router(assets.router)
# D4: from app.api import jobs; api_router.include_router(jobs.router)
