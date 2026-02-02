# Resource Allocation App - Repair & Modernization Plan

## Phase 0 — Localhost Repair (P0) ✅

### P0.1 Fix backend run/import path issues ✅
- [x] Ensure `uvicorn api.app.main:app --reload` works from repo root
- [x] Update README with correct commands for Windows PowerShell and bash
- [x] Add note about PYTHONPATH if needed
- **Acceptance**: API starts cleanly without ModuleNotFoundError

### P0.2 Make dev auth bypass work end-to-end ✅
- [x] Backend: verify `DEV_AUTH_BYPASS=true` reads from `.env` correctly
- [x] Frontend: verify `VITE_DEV_AUTH_BYPASS=true` works without MSAL
- [x] Ensure headers `X-Dev-Role`, `X-Dev-Tenant` are sent consistently
- [x] Provide `api/.env.example` and `frontend/.env.local.example` with correct keys
- **Acceptance**: `/me` returns role/tenant; UI shows role-aware nav

### P0.3 Fix "Failed to fetch" root causes ✅
- [x] Frontend API client uses correct base URL from `VITE_API_BASE_URL`
- [x] Backend CORS configured for `http://localhost:5173` (Vite default)
- [x] CORS allows headers: Authorization, Content-Type, X-Dev-Role, X-Dev-Tenant
- [x] No HTTPS/HTTP mismatch
- **Acceptance**: Finance period actions work without network errors

### P0.4 Fix dependency traps (pyodbc) ✅
- [x] Split requirements: `requirements.txt` (SQLite) vs `requirements.azure.txt` (pyodbc)
- [x] Update README install instructions
- **Acceptance**: `pip install -r api/requirements.txt` succeeds on Windows

## Phase 1 — Error Handling + Diagnostics (P1) ✅

### P1.1 Improve frontend API client error handling ✅
- [x] On fetch exceptions: show "Cannot reach API" with guidance
- [x] On HTTP non-2xx: parse and display status code + Problem Details `code`/`detail`
- [x] Never show generic "Failed to fetch"
- [x] Add/verify global toast system
- **Acceptance**: All errors show actionable messages with status codes

### P1.2 Standardize server-side Problem Details ✅
- [x] Backend validation errors use consistent Problem Details format
- [x] Stable error codes (FTE_INVALID, DEMAND_XOR, PERIOD_LOCKED, etc.)
- [x] Endpoints return meaningful 400/401/403/409
- **Acceptance**: UI toasts display these messages properly

## Phase 2 — Repo Hygiene (P2) ✅

### P2.1 Remove committed build/runtime artifacts ✅
- [x] Remove `frontend/dist/` from git if tracked
- [x] Remove `api/dev.db` from git if tracked
- [x] Remove `frontend/.env.local` from git if tracked
- [x] Verify `.gitignore` covers all artifacts
- [x] Update docs: "copy .env.example -> .env locally"
- **Acceptance**: `git status` shows no build artifacts; `.gitignore` is comprehensive

## Phase 3 — Enterprise Frontend Refresh (P3)

### P3.1 Implement/upgrade AppShell
- [x] Standardize `AppShell.tsx` with left nav (icons + labels)
- [x] Add top bar with user/tenant and current period selector
- [x] Use Fluent UI theme tokens (light enterprise look)
- [x] Add responsive behavior (nav collapses on mobile)
- **Acceptance**: Clean, modern AppShell with consistent styling

### P3.2 Dashboard modernization
- [x] Role-aware cards: pending actions, current period status
- [x] Finance publish status (if available)
- [x] Use Cards + MessageBars + skeleton loading
- **Acceptance**: Dashboard shows relevant info per role with proper loading states

### P3.3 Planning pages (Demand/Supply) UX improvements
- [x] Demand: enforce XOR in UI (resource vs placeholder mutually exclusive)
- [x] Strong FTE input component (5..100 step 5) with validation
- [x] Supply: similar FTE input; clear per-month context
- [x] Read-only mode for Admin/Finance: disable controls, show banner
- **Acceptance**: Planning pages are intuitive with clear validation feedback

### P3.4 Actuals page UX improvements
- [x] Show monthly total and remaining percent prominently
- [x] Highlight rows contributing to over-100 error based on API payload
- [x] Proxy-sign UX (RO): explicit reason field, confirmation
- **Acceptance**: Actuals page clearly shows totals and errors

### P3.5 Approvals page UX improvements
- [x] Inbox grouping (awaiting my approval)
- [x] Approve/reject dialog with comment
- [x] Show step type (RO / Director) and status clearly
- **Acceptance**: Approvals page is easy to navigate and action

### P3.6 Consolidation/Periods UX improvements
- [x] Period actions: confirm dialogs, toasts, refresh
- [x] Publish action: confirm + success UI
- [x] Finance experience "ops-friendly" (status banners, timestamps)
- **Acceptance**: Finance workflows are clear and reliable

## Phase 4 — Verification (P4)

### P4.1 Add/adjust minimal regression tests (backend)
- [x] Tests cover: period lock blocks edits, unlock requires reason
- [x] Tests cover: demand XOR, placeholder 4MFC block
- [x] Tests cover: actuals <=100 with precise payload
- [x] Run `pytest` after each backend change
- **Acceptance**: All critical paths have test coverage

### P4.2 Update README with "Local Run" section
- [x] Exact commands for Windows PowerShell and bash
- [x] Backend run from repo root
- [x] Frontend env setup
- [x] How to enable dev bypass
- [x] Manual verification checklist for all roles
- **Acceptance**: README enables new developers to run locally successfully
