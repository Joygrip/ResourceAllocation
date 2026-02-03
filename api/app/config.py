"""Application configuration."""
from functools import lru_cache
from pathlib import Path
from pydantic_settings import BaseSettings
from pydantic import ConfigDict


class Settings(BaseSettings):
    """Application settings loaded from environment."""
    
    # Environment
    env: str = "dev"
    
    # Dev bypass (NEVER enable in production)
    dev_auth_bypass: bool = False
    
    # Azure AD
    azure_tenant_allowlist: str = ""
    api_app_client_id: str = ""
    api_app_id_uri: str = ""
    
    # Database
    database_url: str = "sqlite:///./dev.db"
    
    # Notifications
    notify_mode: str = "stub"
    
    # Azure Application Insights
    appinsights_connection_string: str = ""
    
    
    @property
    def is_dev(self) -> bool:
        return self.env == "dev"
    
    @property
    def tenant_allowlist(self) -> list[str]:
        if not self.azure_tenant_allowlist:
            return []
        return [t.strip() for t in self.azure_tenant_allowlist.split(",") if t.strip()]
    
    model_config = ConfigDict(
        # Look for .env in repo root (where uvicorn is run from)
        # Also check api/.env as fallback
        env_file=[".env", "api/.env"],
        env_file_encoding="utf-8-sig",
        extra="ignore",  # Ignore extra fields from .env that don't match Settings
    )


@lru_cache()
def get_settings() -> Settings:
    return Settings()
