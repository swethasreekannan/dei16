from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from backend.api.routes import projects, briefs
from backend.config.settings import settings

app = FastAPI(title=settings.app_name, version="0.1.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(projects.router, prefix="/api/projects", tags=["projects"])
app.include_router(briefs.router, prefix="/api/briefs", tags=["briefs"])


@app.get("/api/health")
async def health_check():
    return {"status": "healthy", "service": settings.app_name}
