"""
Azure Functions Timer - Notification Scheduler

This function triggers on a schedule and calls the API notification endpoints.
In production, it would use managed identity for authentication.
In dev mode, it uses DEV_AUTH_BYPASS headers.
"""
import os
import logging
import requests
from datetime import datetime
import azure.functions as func

app = func.FunctionApp()


def get_api_headers():
    """Get headers for API calls - dev bypass or future managed identity."""
    if os.environ.get("DEV_AUTH_BYPASS", "false").lower() == "true":
        return {
            "X-Dev-Role": os.environ.get("DEV_ROLE", "Admin"),
            "X-Dev-Tenant": os.environ.get("DEV_TENANT", "dev-tenant-001"),
        }
    
    # TODO: Implement managed identity token acquisition for production
    # from azure.identity import DefaultAzureCredential
    # credential = DefaultAzureCredential()
    # token = credential.get_token("api://your-api-scope/.default")
    # return {"Authorization": f"Bearer {token.token}"}
    
    return {}


def call_notification_api(phase: str, year: int, month: int):
    """Call the notification run endpoint."""
    base_url = os.environ.get("API_BASE_URL", "http://localhost:8000")
    url = f"{base_url}/notifications/run"
    
    params = {
        "phase": phase,
        "year": year,
        "month": month,
    }
    
    headers = get_api_headers()
    
    try:
        response = requests.post(url, params=params, headers=headers, timeout=30)
        response.raise_for_status()
        return response.json()
    except requests.exceptions.RequestException as e:
        logging.error(f"Failed to call notification API: {e}")
        raise


# Timer trigger: Run at 8:00 AM on the 1st of each month
@app.timer_trigger(schedule="0 0 8 1 * *", arg_name="mytimer", run_on_startup=False)
def notification_pm_ro(mytimer: func.TimerRequest) -> None:
    """
    Monthly trigger for PM and RO planning reminders.
    
    Runs on the 1st of each month at 8:00 AM.
    """
    now = datetime.utcnow()
    logging.info(f"PM_RO notification timer triggered at {now}")
    
    try:
        result = call_notification_api("PM_RO", now.year, now.month)
        logging.info(f"PM_RO notifications result: {result}")
    except Exception as e:
        logging.error(f"PM_RO notifications failed: {e}")


# Timer trigger: Run at 8:00 AM on the 10th of each month
@app.timer_trigger(schedule="0 0 8 10 * *", arg_name="mytimer", run_on_startup=False)
def notification_finance(mytimer: func.TimerRequest) -> None:
    """
    Monthly trigger for Finance review reminders.
    
    Runs on the 10th of each month at 8:00 AM.
    """
    now = datetime.utcnow()
    logging.info(f"Finance notification timer triggered at {now}")
    
    try:
        result = call_notification_api("Finance", now.year, now.month)
        logging.info(f"Finance notifications result: {result}")
    except Exception as e:
        logging.error(f"Finance notifications failed: {e}")


# Timer trigger: Run at 8:00 AM on the 20th of each month
@app.timer_trigger(schedule="0 0 8 20 * *", arg_name="mytimer", run_on_startup=False)
def notification_employee(mytimer: func.TimerRequest) -> None:
    """
    Monthly trigger for Employee actuals entry reminders.
    
    Runs on the 20th of each month at 8:00 AM.
    """
    now = datetime.utcnow()
    logging.info(f"Employee notification timer triggered at {now}")
    
    try:
        result = call_notification_api("Employee", now.year, now.month)
        logging.info(f"Employee notifications result: {result}")
    except Exception as e:
        logging.error(f"Employee notifications failed: {e}")


# Timer trigger: Run at 8:00 AM on the 25th of each month
@app.timer_trigger(schedule="0 0 8 25 * *", arg_name="mytimer", run_on_startup=False)
def notification_ro_director(mytimer: func.TimerRequest) -> None:
    """
    Monthly trigger for RO and Director approval reminders.
    
    Runs on the 25th of each month at 8:00 AM.
    """
    now = datetime.utcnow()
    logging.info(f"RO_Director notification timer triggered at {now}")
    
    try:
        result = call_notification_api("RO_Director", now.year, now.month)
        logging.info(f"RO_Director notifications result: {result}")
    except Exception as e:
        logging.error(f"RO_Director notifications failed: {e}")


# HTTP trigger for manual testing
@app.route(route="trigger", methods=["POST"])
def manual_trigger(req: func.HttpRequest) -> func.HttpResponse:
    """
    HTTP endpoint for manually triggering notifications.
    
    Query params:
    - phase: PM_RO, Finance, Employee, RO_Director
    - year: Year (optional, defaults to current)
    - month: Month (optional, defaults to current)
    """
    now = datetime.utcnow()
    
    phase = req.params.get("phase", "PM_RO")
    year = int(req.params.get("year", now.year))
    month = int(req.params.get("month", now.month))
    
    logging.info(f"Manual trigger: phase={phase}, year={year}, month={month}")
    
    try:
        result = call_notification_api(phase, year, month)
        return func.HttpResponse(
            body=str(result),
            status_code=200,
            mimetype="application/json"
        )
    except Exception as e:
        return func.HttpResponse(
            body=f"Error: {str(e)}",
            status_code=500
        )
