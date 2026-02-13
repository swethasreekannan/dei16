from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    # Supabase
    supabase_url: str = ""
    supabase_anon_key: str = ""
    supabase_service_role_key: str = ""

    # Anthropic
    anthropic_api_key: str = ""

    # Firecrawl
    firecrawl_api_key: str = ""

    # Redis
    redis_url: str = "redis://localhost:6379/0"

    # App
    app_name: str = "Marketing Delivery Engine"
    debug: bool = True
    cors_origins: list[str] = ["http://localhost:3000"]

    model_config = {"env_file": ".env", "env_file_encoding": "utf-8"}


settings = Settings()
