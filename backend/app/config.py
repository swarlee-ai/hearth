from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    database_url: str = "postgresql+asyncpg://mealplanner:mealplanner@db:5432/mealplanner"
    redis_url: str = "redis://redis:6379/0"
    secret_key: str = "dev-secret-key"
    environment: str = "development"

    class Config:
        env_file = ".env"


settings = Settings()
