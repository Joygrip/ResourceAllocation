# Resource Allocation Scheduler

Azure Functions Timer project for sending periodic notifications.

## Overview

This scheduler calls the API notification endpoints on a schedule:
- **PM_RO**: 1st of month - Remind PM and RO to complete planning
- **Finance**: 10th of month - Remind Finance to review
- **Employee**: 20th of month - Remind employees to enter actuals  
- **RO_Director**: 25th of month - Remind approvers to complete approvals

## Local Development

1. Install Azure Functions Core Tools
2. Start the API: `uvicorn api.app.main:app --reload`
3. Start the scheduler: `func start`

## Configuration

Set these environment variables in `local.settings.json` or Azure portal:

- `API_BASE_URL`: API endpoint URL
- `DEV_AUTH_BYPASS`: Set to "true" for dev mode
- `DEV_TENANT`: Dev tenant ID when bypass enabled
- `DEV_ROLE`: Dev role when bypass enabled

## Production

In production:
1. Deploy to Azure Functions (Consumption or Premium plan)
2. Configure managed identity
3. Grant the managed identity access to the API
4. Remove DEV_AUTH_BYPASS settings

## Manual Trigger

Use the HTTP trigger endpoint for testing:
```bash
curl -X POST "http://localhost:7071/api/trigger?phase=PM_RO&year=2026&month=2"
```
