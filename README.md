# Resource Allocation App (MatKat 2.0)

Multi-tenant resource allocation and planning system built with FastAPI and React.

## Features

- **Multi-tenant architecture** with tenant isolation
- **Role-based access control** (Admin, Finance, PM, RO, Director, Employee)
- **Planning**: Demand and Supply management with 4-month forecast window
- **Actuals**: Time tracking with ≤100% enforcement per resource
- **Approvals**: RO → Director workflow with automatic skip when RO=Director
- **Consolidation**: Finance dashboard with gap analysis and snapshot publishing
- **Notifications**: Scheduled reminders (Azure Functions stub)

## TODO

- [x] Diagnose localhost breakages (API base URL, CORS, error parsing)
      - Acceptance: `/healthz` and `/me` respond; frontend shows real errors
- [x] Slice 0: `/me` + dev auth bypass + seed + periods list
      - Acceptance: `/me` shows tenantId and role; periods list loads in UI
- [x] Period control + lock guard + audit
      - Acceptance: Finance can open/lock/unlock with reason; locks block edits
- [x] Planning (Demand/Supply) with rules + role gating
      - Acceptance: XOR enforced, 4MFC placeholder rule, FTE step/range
- [ ] Actuals with <=100 enforcement + sign/proxy sign
      - Acceptance: saves blocked at >100 with offending IDs + total
- [ ] Approvals: RO to Director with skip rule + inboxes
      - Acceptance: sign -> RO approve -> Director approve; skip if RO=Director
- [ ] Consolidation + publish snapshot + snapshot reads
      - Acceptance: publish creates immutable snapshot; reads from snapshot
- [ ] Notifications: cadence preview/run + holiday shift + scheduler stub
      - Acceptance: preview/run endpoints and holiday shift logic
- [ ] Clean up AI comments and remove committed artifacts
      - Acceptance: no dev.db/.env/node_modules tracked; README verify steps

## Tech Stack

### Backend
- FastAPI (Python 3.11+)
- SQLAlchemy 2.x + Alembic
- SQLite (dev) / Azure SQL (production)
- pytest for testing

### Frontend
- React 18 + TypeScript
- Vite
- Fluent UI v9
- MSAL React (Azure AD authentication)

### Scheduler
- Azure Functions (Python)
- Timer triggers for notifications

## Quick Start

### Prerequisites
- Python 3.11+
- Node.js 18+
- Git

### Backend Setup

```bash
# Create virtual environment
python -m venv venv
venv\Scripts\activate  # Windows
# source venv/bin/activate  # Linux/Mac

# Install dependencies
cd api
pip install -r requirements.txt

# Set up environment
cp env.example.txt .env
# Edit .env with your settings

# Run migrations
alembic upgrade head

# Run tests
pytest

# Start server
uvicorn api.app.main:app --reload
```

### Frontend Setup

```bash
cd frontend

# Install dependencies
npm install

# Set up environment
cp env.example.txt .env.local
# Edit .env.local with your settings

# Start dev server
npm run dev
```

### Development Mode

The app supports dev auth bypass for local development:

1. Set `DEV_AUTH_BYPASS=true` in both backend and frontend `.env` files
2. Use the dev login panel in the frontend to switch roles
3. Backend accepts `X-Dev-Role` and `X-Dev-Tenant` headers

## Project Structure

```
ResourceAllocation/
├── api/                 # FastAPI backend
│   ├── app/
│   │   ├── models/      # SQLAlchemy models
│   │   ├── routers/     # API endpoints
│   │   ├── services/    # Business logic
│   │   └── schemas/     # Pydantic schemas
│   ├── alembic/         # Database migrations
│   └── tests/           # pytest tests
├── frontend/            # React frontend
│   └── src/
│       ├── pages/       # Page components
│       ├── components/  # Reusable components
│       └── api/         # API client
└── scheduler/           # Azure Functions
```

## Testing

```bash
# Backend tests
cd api
pytest -v

# All 77 tests should pass
```

## API Documentation

Once the backend is running:
- Swagger UI: http://localhost:8000/docs
- Health check: http://localhost:8000/healthz

## Environment Variables

See `api/env.example.txt` and `frontend/env.example.txt` for required environment variables.

## License

Proprietary - Internal use only
