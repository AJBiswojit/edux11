from fastapi import APIRouter

from app.api.v1 import admin, ai, auth, faculty, parent, platform, student

api_router = APIRouter()
api_router.include_router(auth.router)
api_router.include_router(platform.router)
api_router.include_router(student.router)
api_router.include_router(faculty.router)
api_router.include_router(admin.router)
api_router.include_router(parent.router)
api_router.include_router(ai.router)
