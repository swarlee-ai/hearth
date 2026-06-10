# La Cucina — Meal Planner & Recipe Tracker

A self-hosted meal planning application for households that cook. Import recipes from any URL, organize them into collections, build weekly meal plans with AI assistance, generate smart shopping lists, and track your pantry — all in a single Docker Compose stack.

---

## Features

### Recipe Management
- **URL import** — paste any recipe URL and the scraper extracts title, ingredients, instructions, cook time, and servings automatically (supports 300+ sites via `recipe-scrapers`)
- **Manual entry** — create recipes from scratch with a full-featured form
- **Serving scaler** — adjust servings and all ingredient quantities scale in real time
- **Tagging & filtering** — filter by cuisine, dietary preference, cook time, difficulty, and custom tags
- **Collections** — organize recipes into named lists (e.g. "Quick Weeknight Dinners", "Kid Favorites")
- **Favorites** — star recipes for quick access

### Meal Planning
- **Weekly calendar** — drag-and-drop meals into breakfast / lunch / dinner slots for each day
- **AI meal plan generation** — describe your week's needs and the AI generates a full plan using your existing recipe library and pantry contents
- **Week navigation** — plan as many weeks ahead as you want

### Shopping List
- **Auto-generated from your meal plan** — ingredients are aggregated, deduplicated, and grouped by grocery category
- **Pantry-aware** — items already in your pantry are flagged and subtracted automatically
- **Manual add/remove** — add one-off items or delete anything from the list
- **Check-off as you shop** — progress bar tracks completion by category
- **Copy to clipboard** — export the full list as plain text

### Pantry Tracker
- Track what you have on hand with name, quantity, and unit
- "What can I make?" — matches pantry contents against your recipe library and scores each recipe by ingredient coverage
- Shopping list integration — pantry items are subtracted from generated shopping lists

### AI Chat Assistant
- Streaming chat interface backed by OpenAI
- Full context of your recipe library, pantry, and family preferences
- Suggested prompts when starting a new conversation

### Nutrition
- Per-recipe macro estimates (calories, protein, carbs, fat, fiber) via AI
- Weekly macro summary on the planner view

### Guided Cooking Mode
- Step-by-step walkthrough launched from any recipe
- Per-step countdown timers parsed automatically from instruction text

---

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | React 18, TypeScript, Vite, Tailwind CSS, shadcn/ui |
| Routing | React Router v6 |
| State / Data fetching | TanStack Query v5, Zustand |
| Animations | Framer Motion |
| Backend | FastAPI, Python 3.12 |
| ORM / Migrations | SQLAlchemy 2 (async), Alembic |
| Database | PostgreSQL 15 |
| Cache / Sessions | Redis 7 |
| AI | OpenAI API (GPT-4o by default) |
| Recipe scraping | `recipe-scrapers` (300+ sites) |
| Container | Docker Compose |

---

## Getting Started

### Prerequisites

- [Docker Desktop](https://www.docker.com/products/docker-desktop/) (or Docker + Docker Compose v2)
- An [OpenAI API key](https://platform.openai.com/api-keys) (for AI features — the app works without one, but meal plan generation, chat, and nutrition estimates will be disabled)

### 1. Clone the repo

```bash
git clone https://github.com/swarlee-ai/la-cucina.git
cd la-cucina
```

### 2. Configure environment

```bash
cp .env.example .env
```

Open `.env` and set at minimum:

```env
SECRET_KEY=your-random-secret-key-here
OPENAI_API_KEY=sk-...
```

All other values work as-is for local development. The database and Redis containers use the credentials in this file.

### 3. Start the stack

```bash
docker compose up -d
```

This builds the frontend (Vite → nginx), starts the backend (FastAPI + Uvicorn), PostgreSQL, and Redis. Database migrations run automatically on startup.

### 4. Open the app

Navigate to **http://localhost:3000** and complete the one-time onboarding wizard (household size, dietary preferences, cuisine likes, meal schedule).

---

## Configuration

All configuration is via environment variables. Copy `.env.example` to `.env` and edit.

| Variable | Default | Description |
|---|---|---|
| `POSTGRES_USER` | `mealplanner` | PostgreSQL username |
| `POSTGRES_PASSWORD` | `mealplanner` | PostgreSQL password — change in production |
| `POSTGRES_DB` | `mealplanner` | Database name |
| `DATABASE_URL` | *(derived)* | Full async SQLAlchemy connection string |
| `REDIS_URL` | `redis://redis:6379/0` | Redis connection string |
| `SECRET_KEY` | `dev-secret-key` | App secret — **change in production** |
| `ENVIRONMENT` | `development` | Set to `production` to disable debug features |
| `OPENAI_API_KEY` | — | Required for AI meal plan generation, chat, and nutrition estimates |

---

## Development Setup

For local development with hot-reload on both frontend and backend, use the override file:

```bash
docker compose -f docker-compose.yml -f docker-compose.override.yml up
```

- **Frontend** hot-reloads at `http://localhost:5173` via Vite dev server
- **Backend** hot-reloads at `http://localhost:8000` via Uvicorn `--reload`
- **PostgreSQL** is exposed on `localhost:5432`
- **Redis** is exposed on `localhost:6379`

### Running backend directly (without Docker)

```bash
cd backend
python -m venv .venv
source .venv/bin/activate   # Windows: .venv\Scripts\activate
pip install -r requirements.txt

# Set env vars (or use a .env file)
export DATABASE_URL=postgresql+asyncpg://mealplanner:mealplanner@localhost:5432/mealplanner
export REDIS_URL=redis://localhost:6379/0
export SECRET_KEY=dev-secret-key
export OPENAI_API_KEY=sk-...

alembic upgrade head
uvicorn app.main:app --reload --port 8000
```

### Running frontend directly (without Docker)

```bash
cd frontend
npm install
npm run dev
```

Frontend dev server proxies `/api` to `http://localhost:8000` via Vite config.

---

## Project Structure

```
la-cucina/
├── docker-compose.yml          # Production stack definition
├── docker-compose.override.yml # Dev overrides (hot reload, exposed ports)
├── .env.example                # Environment variable template
│
├── frontend/
│   ├── Dockerfile              # Multi-stage: Vite build → nginx
│   ├── Dockerfile.dev          # Dev server (Vite)
│   ├── nginx.conf              # SPA routing config
│   ├── src/
│   │   ├── api/                # TanStack Query hooks (one file per domain)
│   │   ├── components/
│   │   │   ├── layout/         # AppShell, Sidebar, BottomNav
│   │   │   ├── planner/        # WeeklyCalendar, AIGenerateDialog
│   │   │   ├── recipes/        # RecipeCard, FilterPanel, ImportDialog, CookingMode
│   │   │   ├── nutrition/      # NutritionCard, MacroBar, WeeklyNutritionSummary
│   │   │   └── ui/             # shadcn/ui primitives
│   │   ├── pages/              # One file per route
│   │   ├── store/              # Zustand stores (planner week state)
│   │   ├── types/              # TypeScript interfaces
│   │   └── lib/                # Utilities, constants, date helpers
│   └── tailwind.config.ts
│
└── backend/
    ├── Dockerfile
    ├── requirements.txt
    ├── alembic/
    │   └── versions/           # Database migration scripts
    └── app/
        ├── main.py             # FastAPI app, CORS, lifespan
        ├── config.py           # Pydantic settings
        ├── database.py         # Async SQLAlchemy engine + session
        ├── dependencies.py     # FastAPI dependency injection
        ├── models/             # SQLAlchemy ORM models
        ├── schemas/            # Pydantic request/response schemas
        ├── routers/            # FastAPI route handlers
        └── services/           # Business logic (AI, scraping, aggregation)
```

---

## API Reference

The backend exposes a REST API at `/api`. Interactive docs are available at `http://localhost:8000/docs` when the backend is running.

| Router | Prefix | Description |
|---|---|---|
| Settings | `/api/settings` | Household profile, meal schedule, dietary prefs |
| Recipes | `/api/recipes` | CRUD, URL import, tag management, favorites |
| Collections | `/api/collections` | Named recipe lists |
| Trusted Sites | `/api/trusted-sites` | Allowlist for recipe URL scraping |
| Meal Plans | `/api/meal-plans` | Weekly plans, entries, AI generation (SSE) |
| Shopping | `/api/shopping` | Shopping list generation and item management |
| Pantry | `/api/pantry` | Pantry item CRUD and recipe suggestions |
| Nutrition | `/api/nutrition` | Per-recipe and weekly macro estimates |
| Chat | `/api/chat` | SSE streaming AI chat |

---

## Rebuilding After Code Changes

The production stack builds the frontend as static assets inside the Docker image. After any frontend change:

```bash
docker compose build frontend
docker compose up -d frontend
```

Then hard-refresh your browser (`Ctrl+Shift+R` / `Cmd+Shift+R`) to bypass the cached assets.

Backend changes only require a container restart:

```bash
docker compose restart backend
```

---

## License

MIT
