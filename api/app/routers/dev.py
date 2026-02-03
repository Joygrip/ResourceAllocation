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


@router.get("/resources-with-users", dependencies=[Depends(require_dev_mode)])
async def get_resources_with_users(
    db: Session = Depends(get_db),
    current_user: CurrentUser = Depends(get_current_user),
):
    """
    Get resources with their associated user object_id for dev login.
    Only returns resources that have a linked user.
    """
    resources = db.query(Resource).filter(
        and_(
            Resource.tenant_id == current_user.tenant_id,
            Resource.is_active == True,
            Resource.user_id.isnot(None),
        )
    ).all()
    
    result = []
    for resource in resources:
        user = db.query(User).filter(User.id == resource.user_id).first()
        if user:
            result.append({
                "resource_id": resource.id,
                "display_name": resource.display_name,
                "employee_id": resource.employee_id,
                "email": resource.email,
                "user_object_id": user.object_id,  # This is what we need for dev auth
                "user_id": user.id,
            })
    
    return result
