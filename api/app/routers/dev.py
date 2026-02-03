"""Development-only endpoints. Disabled in production."""
from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from api.app.config import get_settings
from api.app.db.engine import get_db
from api.app.models.core import (
    User, Department, CostCenter, Project, Resource, Period, Placeholder,
    UserRole, PeriodStatus,
)
from api.app.schemas.common import MessageResponse
from api.app.auth.dependencies import get_current_user, CurrentUser

router = APIRouter(prefix="/dev", tags=["Development"])


def require_dev_mode():
    """Dependency that ensures dev mode is enabled."""
    settings = get_settings()
    if not settings.is_dev or not settings.dev_auth_bypass:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Not found",
        )


@router.get("/config", dependencies=[Depends(require_dev_mode)])
async def get_dev_config():
    """Get current dev configuration."""
    settings = get_settings()
    return {
        "env": settings.env,
        "dev_auth_bypass": settings.dev_auth_bypass,
        "database_url": settings.database_url.split("@")[-1] if "@" in settings.database_url else settings.database_url,
    }
