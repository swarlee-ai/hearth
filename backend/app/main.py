import subprocess
from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.routers import settings, recipes, trusted_sites, meal_plans, shopping, nutrition, pantry, chat, collections


@asynccontextmanager
async def lifespan(app: FastAPI):
    subprocess.run(["alembic", "upgrade", "head"], check=True)
    yield


app = FastAPI(title="Meal Planner API", version="1.0.0", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://localhost:3000", "http://frontend"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(settings.router)
app.include_router(recipes.router)
app.include_router(trusted_sites.router)
app.include_router(meal_plans.router)
app.include_router(shopping.router)
app.include_router(nutrition.router)
app.include_router(pantry.router)
app.include_router(chat.router)
app.include_router(collections.router)


@app.get("/api/health")
async def health():
    return {"status": "ok"}
