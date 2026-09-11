from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    # In production, override these via environment variables / a .env file.
    # Never commit a real SECRET_KEY.
    secret_key: str = "dev-only-secret-change-me"
    algorithm: str = "HS256"
    acess_token_expire_minutes: int = 15
    refresh_token_expire_days: int = 7
    otp_expire_minutes: int = 5

    database_url: str = "sqlite:///./chat_app.db"

    class config:
        env_file = ".env"


settings = Settings()

