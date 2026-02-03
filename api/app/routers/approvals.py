"""Approvals endpoints."""
from typing import Optional
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from pydantic import BaseModel

from api.app.db.engine import get_db
from api.app.auth.dependencies import get_current_user, require_roles, CurrentUser
from api.app.models.core import UserRole
from api.app.services.approvals import ApprovalsService

router = APIRouter(prefix="/approvals", tags=["Approvals"])


class ApprovalStepResponse(BaseModel):
    id: str
    step_order: int
    step_name: str
    approver_id: Optional[str]
    status: str
    actioned_at: Optional[str]
    actioned_by: Optional[str]
    comment: Optional[str]


class ApprovalInstanceResponse(BaseModel):
    id: str
    tenant_id: str
    subject_type: str
    subject_id: str
    status: str
    steps: list[ApprovalStepResponse]
    created_by: str
    created_at: str
    # Enriched fields for actuals
    resource_name: Optional[str] = None
    resource_id: Optional[str] = None
    project_name: Optional[str] = None
    project_id: Optional[str] = None
    period_label: Optional[str] = None  # e.g., "February 2026"


class ActionRequest(BaseModel):
    comment: Optional[str] = None

class ProxyApproveRequest(BaseModel):
    comment: str  # Required for proxy approval


def _to_response(instance, db: Optional[Session] = None) -> ApprovalInstanceResponse:
    """Convert approval instance to response, enriching with resource/project info for actuals."""
    resource_name = None
    resource_id = None
    project_name = None
    project_id = None
    period_label = None
    
    # Enrich with actuals information if subject_type is "actuals"
    if instance.subject_type == "actuals" and db:
        from api.app.models.actuals import ActualLine
        from api.app.models.core import Resource, Project, Period
        from sqlalchemy import and_
        
        try:
            actual = db.query(ActualLine).filter(
                and_(
                    ActualLine.id == instance.subject_id,
                    ActualLine.tenant_id == instance.tenant_id
                )
            ).first()
            
            if not actual:
                # Log if actual line not found
                import logging
                logger = logging.getLogger(__name__)
                logger.warning(f"Actual line not found for approval {instance.id}, subject_id: {instance.subject_id}, tenant: {instance.tenant_id}")
            
            if actual:
                resource_id = actual.resource_id
                project_id = actual.project_id
                
                # Get resource name
                resource = db.query(Resource).filter(
                    and_(
                        Resource.id == actual.resource_id,
                        Resource.tenant_id == instance.tenant_id
                    )
                ).first()
                if resource:
                    resource_name = resource.display_name
                
                # Get project name
                project = db.query(Project).filter(
                    and_(
                        Project.id == actual.project_id,
                        Project.tenant_id == instance.tenant_id
                    )
                ).first()
                if project:
                    project_name = project.name
                
                # Get period label
                period = db.query(Period).filter(
                    and_(
                        Period.id == actual.period_id,
                        Period.tenant_id == instance.tenant_id
                    )
                ).first()
                if period:
                    month_names = ['January', 'February', 'March', 'April', 'May', 'June',
                                  'July', 'August', 'September', 'October', 'November', 'December']
                    period_label = f"{month_names[period.month - 1]} {period.year}"
        except Exception as e:
            # Log error but don't fail the request
            import logging
            logger = logging.getLogger(__name__)
            logger.warning(f"Failed to enrich approval instance {instance.id}: {e}", exc_info=True)
    
    return ApprovalInstanceResponse(
        id=instance.id,
        tenant_id=instance.tenant_id,
        subject_type=instance.subject_type,
        subject_id=instance.subject_id,
        status=instance.status.value,
        steps=[
            ApprovalStepResponse(
                id=s.id,
                step_order=s.step_order,
                step_name=s.step_name,
                approver_id=s.approver_id,
                status=s.status.value,
                actioned_at=str(s.actioned_at) if s.actioned_at else None,
                actioned_by=s.actioned_by,
                comment=s.comment,
            )
            for s in sorted(instance.steps, key=lambda x: x.step_order)
        ],
        created_by=instance.created_by,
        created_at=str(instance.created_at),
        resource_name=resource_name,
        resource_id=resource_id,
        project_name=project_name,
        project_id=project_id,
        period_label=period_label,
    )


@router.get("/inbox", response_model=list[ApprovalInstanceResponse])
async def get_inbox(
    db: Session = Depends(get_db),
    current_user: CurrentUser = Depends(require_roles(
        UserRole.RO, UserRole.DIRECTOR
    )),
):
    """
    Get approval instances awaiting current user's action.
    
    Accessible to: RO, Director
    """
    service = ApprovalsService(db, current_user)
    instances = service.get_inbox()
    return [_to_response(i, db) for i in instances]


@router.get("/{instance_id}", response_model=ApprovalInstanceResponse)
async def get_approval(
    instance_id: str,
    db: Session = Depends(get_db),
    current_user: CurrentUser = Depends(require_roles(
        UserRole.RO, UserRole.DIRECTOR
    )),
):
    """Get a specific approval instance."""
    service = ApprovalsService(db, current_user)
    instance = service.get_by_id(instance_id)
    if not instance:
        from fastapi import HTTPException
        raise HTTPException(status_code=404, detail={"code": "NOT_FOUND", "message": "Approval not found"})
    return _to_response(instance, db)


@router.post("/{instance_id}/steps/{step_id}/approve", response_model=ApprovalInstanceResponse)
async def approve_step(
    instance_id: str,
    step_id: str,
    data: ActionRequest,
    db: Session = Depends(get_db),
    current_user: CurrentUser = Depends(require_roles(
        UserRole.RO, UserRole.DIRECTOR
    )),
):
    """
    Approve a step.
    
    Accessible to: RO, Director
    """
    service = ApprovalsService(db, current_user)
    instance = service.approve_step(instance_id, step_id, data.comment)
    return _to_response(instance, db)


@router.post("/{instance_id}/steps/{step_id}/reject", response_model=ApprovalInstanceResponse)
async def reject_step(
    instance_id: str,
    step_id: str,
    data: ActionRequest,
    db: Session = Depends(get_db),
    current_user: CurrentUser = Depends(require_roles(
        UserRole.RO, UserRole.DIRECTOR
    )),
):
    """
    Reject a step.
    
    Accessible to: RO, Director
    """
    service = ApprovalsService(db, current_user)
    instance = service.reject_step(instance_id, step_id, data.comment)
    return _to_response(instance, db)


@router.post("/{instance_id}/steps/{step_id}/proxy-approve", response_model=ApprovalInstanceResponse)
async def proxy_approve_director_step(
    instance_id: str,
    step_id: str,
    data: ProxyApproveRequest,
    db: Session = Depends(get_db),
    current_user: CurrentUser = Depends(require_roles(UserRole.RO)),
):
    """
    Allow RO to proxy-approve Director step with explanation.
    
    This allows RO to approve on behalf of Director when Director is unavailable.
    Explanation is required.
    
    Accessible to: RO only
    """
    service = ApprovalsService(db, current_user)
    instance = service.proxy_approve_director_step(instance_id, step_id, data.comment)
    return _to_response(instance, db)
