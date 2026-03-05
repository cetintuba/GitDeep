from pydantic_settings import BaseSettings, SettingsConfigDict
from typing import Optional

class Settings(BaseSettings):
    PROJECT_NAME: str = "GitDeep Archaeology API"
    GITHUB_PAT: Optional[str] = None
    GEMINI_API_KEY: Optional[str] = None
    SECRET_KEY: str = "super_secret_temporary_key_for_jwt_tokens"
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60 * 24 * 7 # 7 days

    model_config = SettingsConfigDict(env_file=".env")

settings = Settings()
