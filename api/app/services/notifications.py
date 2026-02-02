"""Notifications service - sending reminders and tracking."""
import uuid
from datetime import datetime, date
from dateutil.relativedelta import relativedelta
from typing import Optional, List, Dict, Any
from sqlalchemy.orm import Session
from sqlalchemy import and_

from api.app.models.core import Period, User, Holiday
from api.app.models.notifications import NotificationLog, NotificationPhase, NotificationStatus
from api.app.auth.dependencies import CurrentUser
from api.app.services.audit import log_audit
from api.app.config import get_settings


class NotificationsService:
    """Service for notification operations."""
    
    def __init__(self, db: Session, current_user: Optional[CurrentUser] = None):
        self.db = db
        self.current_user = current_user
        self.settings = get_settings()
    
    def calculate_deadline(self, year: int, month: int, base_day: int = 5) -> date:
        """
        Calculate the notification deadline, rolling forward if it falls on a holiday.
        
        Args:
            year: Target year
            month: Target month  
            base_day: Base deadline day of month (default: 5th)
        
        Returns:
            date: Adjusted deadline date
        """
        # Start with base deadline
        deadline = date(year, month, base_day)
        
        # Get tenant ID for holiday lookup
        tenant_id = self.current_user.tenant_id if self.current_user else None
        
        if not tenant_id:
            return deadline
        
        # Get holidays for this month
        holidays = self.db.query(Holiday).filter(
            and_(
                Holiday.tenant_id == tenant_id,
                Holiday.date >= deadline,
                Holiday.date <= date(year, month, 28),  # Don't roll past month end
            )
        ).all()
        
        holiday_dates = {h.date for h in holidays}
        
        # Roll forward while deadline is a holiday or weekend
        max_rolls = 10  # Safety limit
        rolls = 0
        while rolls < max_rolls:
            # Check if weekend (5=Saturday, 6=Sunday)
            if deadline.weekday() >= 5:
                deadline = deadline + relativedelta(days=1)
                rolls += 1
                continue
            
            # Check if holiday
            if deadline in holiday_dates:
                deadline = deadline + relativedelta(days=1)
                rolls += 1
                continue
            
            # Neither weekend nor holiday
            break
        
        return deadline
    
    def get_preview(self, phase: NotificationPhase, year: int, month: int) -> Dict[str, Any]:
        """
        Get a preview of what notifications would be sent.
        
        Returns list of recipients without actually sending.
        """
        tenant_id = self.current_user.tenant_id if self.current_user else "unknown"
        
        recipients = self._get_recipients_for_phase(phase)
        deadline = self.calculate_deadline(year, month)
        
        return {
            "phase": phase.value,
            "year": year,
            "month": month,
            "deadline": str(deadline),
            "recipients_count": len(recipients),
            "recipients": [
                {
                    "user_id": r.id,
                    "email": r.email,
                    "display_name": r.display_name,
                    "role": r.role,
                }
                for r in recipients
            ],
            "message_template": self._get_message_template(phase, year, month, deadline),
        }
    
    def run_notifications(self, phase: NotificationPhase, year: int, month: int) -> Dict[str, Any]:
        """
        Run notifications for a phase (stub - records but doesn't actually send).
        
        Uses run_id for idempotency - same run won't duplicate notifications.
        """
        tenant_id = self.current_user.tenant_id if self.current_user else "unknown"
        run_id = str(uuid.uuid4())
        
        # Check if already run for this phase/period
        existing = self.db.query(NotificationLog).filter(
            and_(
                NotificationLog.tenant_id == tenant_id,
                NotificationLog.phase == phase,
                NotificationLog.year == year,
                NotificationLog.month == month,
            )
        ).first()
        
        if existing:
            return {
                "status": "already_run",
                "message": "Notifications already sent for this phase and period",
                "existing_run_id": existing.run_id,
            }
        
        recipients = self._get_recipients_for_phase(phase)
        deadline = self.calculate_deadline(year, month)
        message_template = self._get_message_template(phase, year, month, deadline)
        
        notifications_created = []
        
        for recipient in recipients:
            log = NotificationLog(
                tenant_id=tenant_id,
                phase=phase,
                year=year,
                month=month,
                recipient_user_id=recipient.id,
                recipient_email=recipient.email,
                status=NotificationStatus.SENT if self.settings.notify_mode == "stub" else NotificationStatus.PENDING,
                message=message_template,
                run_id=run_id,
                sent_at=datetime.utcnow() if self.settings.notify_mode == "stub" else None,
            )
            self.db.add(log)
            notifications_created.append({
                "recipient_email": recipient.email,
                "status": log.status.value,
            })
        
        self.db.commit()
        
        if self.current_user:
            log_audit(
                self.db, self.current_user,
                action="run_notifications",
                entity_type="NotificationLog",
                entity_id=run_id,
                new_values={
                    "phase": phase.value,
                    "year": year,
                    "month": month,
                    "recipients_count": len(recipients),
                }
            )
        
        return {
            "status": "success",
            "run_id": run_id,
            "phase": phase.value,
            "year": year,
            "month": month,
            "notifications_count": len(notifications_created),
            "notifications": notifications_created,
            "mode": self.settings.notify_mode,
        }
    
    def _get_recipients_for_phase(self, phase: NotificationPhase) -> List[User]:
        """Get users who should receive notifications for a phase."""
        tenant_id = self.current_user.tenant_id if self.current_user else None
        
        if not tenant_id:
            return []
        
        role_map = {
            NotificationPhase.PM_RO: ["PM", "RO"],
            NotificationPhase.FINANCE: ["Finance"],
            NotificationPhase.EMPLOYEE: ["Employee"],
            NotificationPhase.RO_DIRECTOR: ["RO", "Director"],
        }
        
        roles = role_map.get(phase, [])
        
        return self.db.query(User).filter(
            and_(
                User.tenant_id == tenant_id,
                User.role.in_(roles),
                User.is_active == True,
            )
        ).all()
    
    def _get_message_template(self, phase: NotificationPhase, year: int, month: int, deadline: date) -> str:
        """Get the message template for a notification phase."""
        templates = {
            NotificationPhase.PM_RO: f"Reminder: Please complete demand and supply planning for {month:02d}/{year} by {deadline}.",
            NotificationPhase.FINANCE: f"Reminder: Planning data for {month:02d}/{year} is ready for review. Please consolidate by {deadline}.",
            NotificationPhase.EMPLOYEE: f"Reminder: Please enter your actuals for {month:02d}/{year} by {deadline}.",
            NotificationPhase.RO_DIRECTOR: f"Reminder: Actuals for {month:02d}/{year} are awaiting your approval. Please review by {deadline}.",
        }
        return templates.get(phase, "Notification reminder.")
    
    def get_logs(self, phase: Optional[NotificationPhase] = None, year: Optional[int] = None, month: Optional[int] = None) -> List[NotificationLog]:
        """Get notification logs with optional filters."""
        tenant_id = self.current_user.tenant_id if self.current_user else None
        
        query = self.db.query(NotificationLog).filter(
            NotificationLog.tenant_id == tenant_id
        )
        
        if phase:
            query = query.filter(NotificationLog.phase == phase)
        if year:
            query = query.filter(NotificationLog.year == year)
        if month:
            query = query.filter(NotificationLog.month == month)
        
        return query.order_by(NotificationLog.created_at.desc()).all()
