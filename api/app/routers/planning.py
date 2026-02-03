"""Planning endpoints - Demand and Supply lines."""
from typing import Optional, Dict, Any
from fastapi import APIRouter, Depends, Query, HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy import and_, func

from api.app.db.engine import get_db
from api.app.auth.dependencies import get_current_user, require_roles, CurrentUser
from api.app.models.core import UserRole, Period, CostCenter, Resource, Placeholder, Project
from api.app.schemas.planning import (
    DemandLineCreate, DemandLineUpdate, DemandLineResponse,
    SupplyLineCreate, SupplyLineUpdate, SupplyLineResponse,
)
from api.app.services.planning import DemandService, SupplyService
from api.app.models.planning import DemandLine, SupplyLine

router = APIRouter(tags=["Planning"])

# ============== DEMAND LINES ==============

@router.get("/demand-lines", response_model=list[DemandLineResponse])
async def list_demand_lines(
    period_id: Optional[str] = Query(None, description="Filter by period ID"),
    year: Optional[int] = Query(None, description="Filter by year (deprecated, use period_id)"),
    month: Optional[int] = Query(None, ge=1, le=12, description="Filter by month (deprecated, use period_id)"),
    resource_id: Optional[str] = Query(None, description="Filter by resource ID (for employees to see their own)"),
    db: Session = Depends(get_db),
    current_user: CurrentUser = Depends(require_roles(
        UserRole.ADMIN, UserRole.FINANCE, UserRole.PM, UserRole.RO, UserRole.DIRECTOR, UserRole.EMPLOYEE
    )),
):
    """
    List demand lines. Filtered by tenant.
    
    Prefer period_id over year/month for filtering.
    
    For employees: Only shows demand lines for their own resource.
    For other roles: Shows all demand lines (filtered by resource_id if provided).
    
    Accessible to: Admin, Finance (read-only), PM, RO (read-only), Director (read-only), Employee (own resource only)
    """
    # For employees, get their resource and filter to only their demand lines
    employee_resource_id = None
    if current_user.role == UserRole.EMPLOYEE:
        from api.app.models.core import User, Resource
        user = db.query(User).filter(
            and_(
                User.tenant_id == current_user.tenant_id,
                User.object_id == current_user.object_id,
            )
        ).first()
        if user:
            resource = db.query(Resource).filter(
                and_(
                    Resource.tenant_id == current_user.tenant_id,
                    Resource.user_id == user.id,
                )
            ).first()
            if resource:
                employee_resource_id = resource.id
    
    service = DemandService(db, current_user)
    if period_id:
        # Filter by period_id
        from api.app.models.core import Period
        period = db.query(Period).filter(
            and_(
                Period.id == period_id,
                Period.tenant_id == current_user.tenant_id,
            )
        ).first()
        if period:
            lines = service.get_all(period.year, period.month)
            # Debug logging
            import logging
            logger = logging.getLogger(__name__)
            logger.info(f"Demand lines query: period_id={period_id}, year={period.year}, month={period.month}, tenant={current_user.tenant_id}, found {len(lines)} lines")
        else:
            lines = []
            import logging
            logger = logging.getLogger(__name__)
            logger.warning(f"Period not found: period_id={period_id}, tenant={current_user.tenant_id}")
    else:
        lines = service.get_all(year, month)
    
    # Filter by resource_id if provided or if employee
    if employee_resource_id:
        lines = [line for line in lines if line.resource_id == employee_resource_id]
    elif resource_id:
        lines = [line for line in lines if line.resource_id == resource_id]
    
    # Enrich with names
    result = []
    for line in lines:
        resp = DemandLineResponse(
            id=line.id,
            tenant_id=line.tenant_id,
            period_id=line.period_id,
            project_id=line.project_id,
            resource_id=line.resource_id,
            placeholder_id=line.placeholder_id,
            year=line.year,
            month=line.month,
            fte_percent=line.fte_percent,
            created_by=line.created_by,
            created_at=line.created_at,
            updated_at=line.updated_at,
            project_name=line.project.name if line.project else None,
            resource_name=line.resource.display_name if line.resource else None,
            placeholder_name=line.placeholder.name if line.placeholder else None,
        )
        result.append(resp)
    
    return result


@router.get("/demand-lines/{demand_id}", response_model=DemandLineResponse)
async def get_demand_line(
    demand_id: str,
    db: Session = Depends(get_db),
    current_user: CurrentUser = Depends(require_roles(
        UserRole.ADMIN, UserRole.FINANCE, UserRole.PM, UserRole.RO, UserRole.DIRECTOR
    )),
):
    """Get a specific demand line."""
    service = DemandService(db, current_user)
    line = service.get_by_id(demand_id)
    if not line:
        from fastapi import HTTPException
        raise HTTPException(status_code=404, detail={"code": "NOT_FOUND", "message": "Demand line not found"})
    
    return DemandLineResponse(
        id=line.id,
        tenant_id=line.tenant_id,
        period_id=line.period_id,
        project_id=line.project_id,
        resource_id=line.resource_id,
        placeholder_id=line.placeholder_id,
        year=line.year,
        month=line.month,
        fte_percent=line.fte_percent,
        created_by=line.created_by,
        created_at=line.created_at,
        updated_at=line.updated_at,
        project_name=line.project.name if line.project else None,
        resource_name=line.resource.display_name if line.resource else None,
        placeholder_name=line.placeholder.name if line.placeholder else None,
    )


@router.post("/demand-lines", response_model=DemandLineResponse)
async def create_demand_line(
    data: DemandLineCreate,
    db: Session = Depends(get_db),
    current_user: CurrentUser = Depends(require_roles(UserRole.PM, UserRole.FINANCE)),
):
    """
    Create a new demand line.
    
    Rules:
    - Must specify either resource_id OR placeholder_id (XOR)
    - FTE must be 5-100 in steps of 5
    - Period must be open
    
    Accessible to: PM, Finance
    """
    service = DemandService(db, current_user)
    line = service.create(
        project_id=data.project_id,
        period_id=data.period_id,
        fte_percent=data.fte_percent,
        resource_id=data.resource_id,
        placeholder_id=data.placeholder_id,
        year=data.year,
        month=data.month,
    )
    
    return DemandLineResponse(
        id=line.id,
        tenant_id=line.tenant_id,
        period_id=line.period_id,
        project_id=line.project_id,
        resource_id=line.resource_id,
        placeholder_id=line.placeholder_id,
        year=line.year,
        month=line.month,
        fte_percent=line.fte_percent,
        created_by=line.created_by,
        created_at=line.created_at,
        updated_at=line.updated_at,
        project_name=line.project.name if line.project else None,
        resource_name=line.resource.display_name if line.resource else None,
        placeholder_name=line.placeholder.name if line.placeholder else None,
    )


@router.patch("/demand-lines/{demand_id}", response_model=DemandLineResponse)
async def update_demand_line(
    demand_id: str,
    data: DemandLineUpdate,
    db: Session = Depends(get_db),
    current_user: CurrentUser = Depends(require_roles(UserRole.PM, UserRole.FINANCE)),
):
    """
    Update a demand line's FTE.
    
    Accessible to: PM, Finance
    """
    service = DemandService(db, current_user)
    line = service.update(demand_id, data.fte_percent)
    
    return DemandLineResponse(
        id=line.id,
        tenant_id=line.tenant_id,
        period_id=line.period_id,
        project_id=line.project_id,
        resource_id=line.resource_id,
        placeholder_id=line.placeholder_id,
        year=line.year,
        month=line.month,
        fte_percent=line.fte_percent,
        created_by=line.created_by,
        created_at=line.created_at,
        updated_at=line.updated_at,
        project_name=line.project.name if line.project else None,
        resource_name=line.resource.display_name if line.resource else None,
        placeholder_name=line.placeholder.name if line.placeholder else None,
    )


@router.delete("/demand-lines/{demand_id}")
async def delete_demand_line(
    demand_id: str,
    db: Session = Depends(get_db),
    current_user: CurrentUser = Depends(require_roles(UserRole.PM, UserRole.FINANCE)),
):
    """
    Delete a demand line.
    
    Accessible to: PM, Finance
    """
    service = DemandService(db, current_user)
    service.delete(demand_id)
    return {"message": "Demand line deleted"}


# ============== SUPPLY LINES ==============

@router.get("/supply-lines", response_model=list[SupplyLineResponse])
async def list_supply_lines(
    period_id: Optional[str] = Query(None, description="Filter by period ID"),
    year: Optional[int] = Query(None, description="Filter by year (deprecated, use period_id)"),
    month: Optional[int] = Query(None, ge=1, le=12, description="Filter by month (deprecated, use period_id)"),
    resource_id: Optional[str] = Query(None, description="Filter by resource ID (for employees to see their own)"),
    db: Session = Depends(get_db),
    current_user: CurrentUser = Depends(require_roles(
        UserRole.ADMIN, UserRole.FINANCE, UserRole.PM, UserRole.RO, UserRole.DIRECTOR, UserRole.EMPLOYEE
    )),
):
    """
    List supply lines. Filtered by tenant.
    
    Prefer period_id over year/month for filtering.
    
    For employees: Only shows supply lines for their own resource.
    For other roles: Shows all supply lines (filtered by resource_id if provided).
    
    Accessible to: Admin, Finance (read-only), PM (read-only), RO, Director (read-only), Employee (own resource only)
    """
    # For employees, get their resource and filter to only their supply lines
    employee_resource_id = None
    if current_user.role == UserRole.EMPLOYEE:
        from api.app.models.core import User, Resource
        user = db.query(User).filter(
            and_(
                User.tenant_id == current_user.tenant_id,
                User.object_id == current_user.object_id,
            )
        ).first()
        if user:
            resource = db.query(Resource).filter(
                and_(
                    Resource.tenant_id == current_user.tenant_id,
                    Resource.user_id == user.id,
                )
            ).first()
            if resource:
                employee_resource_id = resource.id
    
    service = SupplyService(db, current_user)
    if period_id:
        # Filter by period_id
        from api.app.models.core import Period
        period = db.query(Period).filter(
            and_(
                Period.id == period_id,
                Period.tenant_id == current_user.tenant_id,
            )
        ).first()
        if period:
            lines = service.get_all(period.year, period.month)
        else:
            lines = []
    else:
        lines = service.get_all(year, month)
    
    # Filter by resource_id if provided or if employee
    if employee_resource_id:
        lines = [line for line in lines if line.resource_id == employee_resource_id]
    elif resource_id:
        lines = [line for line in lines if line.resource_id == resource_id]
    
    result = []
    for line in lines:
        resp = SupplyLineResponse(
            id=line.id,
            tenant_id=line.tenant_id,
            period_id=line.period_id,
            resource_id=line.resource_id,
            year=line.year,
            month=line.month,
            fte_percent=line.fte_percent,
            created_by=line.created_by,
            created_at=line.created_at,
            updated_at=line.updated_at,
            resource_name=line.resource.display_name if line.resource else None,
        )
        result.append(resp)
    
    return result


@router.get("/supply-lines/{supply_id}", response_model=SupplyLineResponse)
async def get_supply_line(
    supply_id: str,
    db: Session = Depends(get_db),
    current_user: CurrentUser = Depends(require_roles(
        UserRole.ADMIN, UserRole.FINANCE, UserRole.PM, UserRole.RO, UserRole.DIRECTOR
    )),
):
    """Get a specific supply line."""
    service = SupplyService(db, current_user)
    line = service.get_by_id(supply_id)
    if not line:
        from fastapi import HTTPException
        raise HTTPException(status_code=404, detail={"code": "NOT_FOUND", "message": "Supply line not found"})
    
    return SupplyLineResponse(
        id=line.id,
        tenant_id=line.tenant_id,
        period_id=line.period_id,
        resource_id=line.resource_id,
        year=line.year,
        month=line.month,
        fte_percent=line.fte_percent,
        created_by=line.created_by,
        created_at=line.created_at,
        updated_at=line.updated_at,
        resource_name=line.resource.display_name if line.resource else None,
    )


@router.post("/supply-lines", response_model=SupplyLineResponse)
async def create_supply_line(
    data: SupplyLineCreate,
    db: Session = Depends(get_db),
    current_user: CurrentUser = Depends(require_roles(UserRole.RO, UserRole.FINANCE)),
):
    """
    Create a new supply line.
    
    Rules:
    - FTE must be 5-100 in steps of 5
    - Period must be open
    - One supply line per resource per month
    
    Accessible to: RO, Finance
    """
    service = SupplyService(db, current_user)
    line = service.create(
        resource_id=data.resource_id,
        period_id=data.period_id,
        fte_percent=data.fte_percent,
        year=data.year,
        month=data.month,
    )
    
    return SupplyLineResponse(
        id=line.id,
        tenant_id=line.tenant_id,
        period_id=line.period_id,
        resource_id=line.resource_id,
        year=line.year,
        month=line.month,
        fte_percent=line.fte_percent,
        created_by=line.created_by,
        created_at=line.created_at,
        updated_at=line.updated_at,
        resource_name=line.resource.display_name if line.resource else None,
    )


@router.patch("/supply-lines/{supply_id}", response_model=SupplyLineResponse)
async def update_supply_line(
    supply_id: str,
    data: SupplyLineUpdate,
    db: Session = Depends(get_db),
    current_user: CurrentUser = Depends(require_roles(UserRole.RO, UserRole.FINANCE)),
):
    """
    Update a supply line's FTE.
    
    Accessible to: RO, Finance
    """
    service = SupplyService(db, current_user)
    line = service.update(supply_id, data.fte_percent)
    
    return SupplyLineResponse(
        id=line.id,
        tenant_id=line.tenant_id,
        period_id=line.period_id,
        resource_id=line.resource_id,
        year=line.year,
        month=line.month,
        fte_percent=line.fte_percent,
        created_by=line.created_by,
        created_at=line.created_at,
        updated_at=line.updated_at,
        resource_name=line.resource.display_name if line.resource else None,
    )


@router.delete("/supply-lines/{supply_id}")
async def delete_supply_line(
    supply_id: str,
    db: Session = Depends(get_db),
    current_user: CurrentUser = Depends(require_roles(UserRole.RO, UserRole.FINANCE)),
):
    """
    Delete a supply line.
    
    Accessible to: RO, Finance
    """
    service = SupplyService(db, current_user)
    service.delete(supply_id)
    return {"message": "Supply line deleted"}


# ============== PLANNING INSIGHTS ==============

@router.get("/insights")
async def get_planning_insights(
    period_id: str = Query(..., description="Period ID"),
    db: Session = Depends(get_db),
    current_user: CurrentUser = Depends(require_roles(
        UserRole.ADMIN, UserRole.FINANCE, UserRole.PM, UserRole.RO
    )),
):
    """
    Get planning insights for a period: demand vs supply gaps by cost center.
    
    Shows:
    - Total demand, supply, and gap percentages
    - Gaps by cost center
    - Orphan demand (placeholders, inactive resources)
    
    Accessible to: Admin, Finance, PM, RO
    """
    # Verify period exists
    period = db.query(Period).filter(
        and_(
            Period.id == period_id,
            Period.tenant_id == current_user.tenant_id,
        )
    ).first()
    
    if not period:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail={"code": "NOT_FOUND", "message": "Period not found"}
        )
    
    # Get all demand lines for this period
    demands = db.query(DemandLine).filter(
        and_(
            DemandLine.tenant_id == current_user.tenant_id,
            DemandLine.period_id == period_id,
        )
    ).all()
    
    # Get all supply lines for this period
    supplies = db.query(SupplyLine).filter(
        and_(
            SupplyLine.tenant_id == current_user.tenant_id,
            SupplyLine.period_id == period_id,
        )
    ).all()
    
    # Aggregate by cost center
    demand_by_cc: Dict[str, Dict[str, Any]] = {}
    supply_by_cc: Dict[str, Dict[str, Any]] = {}
    
    total_demand = 0
    total_supply = 0
    
    # Process demand lines
    for d in demands:
        total_demand += d.fte_percent
        
        if d.resource_id:
            resource = db.query(Resource).filter(Resource.id == d.resource_id).first()
            if resource and resource.cost_center_id:
                cc_id = resource.cost_center_id
                if cc_id not in demand_by_cc:
                    cost_center = db.query(CostCenter).filter(CostCenter.id == cc_id).first()
                    demand_by_cc[cc_id] = {
                        "cost_center_id": cc_id,
                        "cost_center_name": cost_center.name if cost_center else "Unknown",
                        "demand_total": 0,
                        "supply_total": 0,
                    }
                demand_by_cc[cc_id]["demand_total"] += d.fte_percent
    
    # Process supply lines
    for s in supplies:
        total_supply += s.fte_percent
        
        resource = db.query(Resource).filter(Resource.id == s.resource_id).first()
        if resource and resource.cost_center_id:
            cc_id = resource.cost_center_id
            if cc_id not in supply_by_cc:
                cost_center = db.query(CostCenter).filter(CostCenter.id == cc_id).first()
                supply_by_cc[cc_id] = {
                    "cost_center_id": cc_id,
                    "cost_center_name": cost_center.name if cost_center else "Unknown",
                    "demand_total": 0,
                    "supply_total": 0,
                }
            supply_by_cc[cc_id]["supply_total"] += s.fte_percent
    
    # Merge and calculate gaps
    all_cc_ids = set(demand_by_cc.keys()) | set(supply_by_cc.keys())
    by_cost_center = []
    
    for cc_id in all_cc_ids:
        cc_data = demand_by_cc.get(cc_id, supply_by_cc.get(cc_id, {}))
        if not cc_data:
            continue
        
        demand_total = cc_data.get("demand_total", 0)
        supply_total = cc_data.get("supply_total", 0)
        gap = supply_total - demand_total
        
        by_cost_center.append({
            "cost_center_id": cc_id,
            "cost_center_name": cc_data.get("cost_center_name", "Unknown"),
            "demand_total": demand_total,
            "supply_total": supply_total,
            "gap": gap,
        })
    
    # Find orphan demand (placeholders or inactive resources)
    orphan_demands = []
    for d in demands:
        if d.placeholder_id:
            placeholder = db.query(Placeholder).filter(Placeholder.id == d.placeholder_id).first()
            project = db.query(Project).filter(Project.id == d.project_id).first()
            orphan_demands.append({
                "demand_line_id": d.id,
                "project_name": project.name if project else "Unknown",
                "resource_or_placeholder": placeholder.name if placeholder else "Unknown",
                "fte_percent": d.fte_percent,
                "reason": "Placeholder (TBD)",
            })
        elif d.resource_id:
            resource = db.query(Resource).filter(Resource.id == d.resource_id).first()
            if resource and (not resource.is_active or resource.is_placeholder):
                project = db.query(Project).filter(Project.id == d.project_id).first()
                orphan_demands.append({
                    "demand_line_id": d.id,
                    "project_name": project.name if project else "Unknown",
                    "resource_or_placeholder": resource.display_name if resource else "Unknown",
                    "fte_percent": d.fte_percent,
                    "reason": "Inactive resource" if not resource.is_active else "Placeholder resource",
                })
    
    return {
        "period": {
            "id": period.id,
            "year": period.year,
            "month": period.month,
            "status": period.status.value if hasattr(period.status, 'value') else str(period.status),
        },
        "by_cost_center": sorted(by_cost_center, key=lambda x: x["cost_center_name"]),
        "orphan_demand": orphan_demands,
        "stats": {
            "total_demand": total_demand,
            "total_supply": total_supply,
            "total_gap": total_supply - total_demand,
            "gaps_count": len([x for x in by_cost_center if x["gap"] != 0]),
            "orphans_count": len(orphan_demands),
        }
    }
