# Role Guard Fixes - TODO Plan

## Phase 0 — Create Plan + Reproduce ✅

### Observed Failures

**PM Role:**
- ❌ `/admin/projects` - 403 UNAUTHORIZED_ROLE (PM needs read access for Demand page)
- ❌ `/admin/resources` - 403 UNAUTHORIZED_ROLE (PM needs read access for Demand page)
- ❌ `/admin/placeholders` - 403 UNAUTHORIZED_ROLE (PM needs read access for Demand page)

**RO Role:**
- ❌ `/admin/resources` - 403 UNAUTHORIZED_ROLE (RO needs read access for Supply page)

**Employee Role:**
- ❌ `/admin/projects` - 403 UNAUTHORIZED_ROLE (Employee needs read access for Actuals page)
- ❌ `/admin/resources` - 403 UNAUTHORIZED_ROLE (Employee needs read access for Actuals page)

**Director Role:**
- TBD (to be tested)

**Finance Role:**
- TBD (to be tested)

**Root Cause:** Frontend uses `/admin/*` endpoints for read-only lookups, but backend restricts these to Admin + Finance only.

## Phase 1 — Fix Master Data Read Access

### P1.1 Create lookups router
- [ ] Create `api/app/routers/lookups.py` with GET endpoints:
  - `/lookups/departments`
  - `/lookups/cost-centers`
  - `/lookups/projects`
  - `/lookups/resources`
  - `/lookups/placeholders`
- [ ] All endpoints allow ALL roles (Admin, Finance, PM, RO, Director, Employee)
- [ ] Filter by tenant_id and return only active records
- **Acceptance**: All roles can GET /lookups/* endpoints

### P1.2 Register lookups router
- [ ] Add lookups router to `api/app/main.py`
- **Acceptance**: Router registered and accessible

### P1.3 Create frontend lookups API client
- [ ] Create `frontend/src/api/lookups.ts`
- [ ] Implement methods: `listDepartments`, `listCostCenters`, `listProjects`, `listResources`, `listPlaceholders`
- **Acceptance**: Frontend can call lookups endpoints

### P1.4 Update frontend pages to use lookups
- [ ] Update `frontend/src/pages/Demand.tsx` to use `lookupsApi.listProjects()`, `lookupsApi.listResources()`, `lookupsApi.listPlaceholders()`
- [ ] Update `frontend/src/pages/Supply.tsx` to use `lookupsApi.listResources()`
- [ ] Update `frontend/src/pages/Actuals.tsx` to use `lookupsApi.listProjects()`, `lookupsApi.listResources()`
- [ ] Keep Admin page using `/admin/*` for CRUD operations
- **Acceptance**: PM/RO/Employee pages load without 403

### P1.5 Add tests for lookups
- [ ] Test PM can GET /lookups/projects (200)
- [ ] Test PM can GET /lookups/resources (200)
- [ ] Test RO can GET /lookups/resources (200)
- [ ] Test Employee can GET /lookups/projects (200)
- [ ] Test PM cannot POST /admin/projects (403)
- **Acceptance**: All tests pass

## Phase 2 — Fix Approvals Workflow

### P2.1 Verify approval instance creation
- [x] Ensure `ActualsService.sign()` calls `_ensure_approval_instance()` ✅ (already implemented)
- [x] Ensure `ActualsService.proxy_sign()` calls `_ensure_approval_instance()` ✅ (already implemented)
- **Acceptance**: Signing creates approval instance ✅

### P2.2 Fix approver resolution
- [x] RO resolution: use `resource.cost_center.ro_user_id` (db user.id) ✅ (already correct)
- [x] Director resolution: use department lookup ✅ (already implemented)
- [x] Ensure consistent use of user.id vs object_id (use user.id for DB relationships) ✅ (approver_id uses user.id)
- [x] Fix any mismatches in approvals service ✅ (verified)
- **Acceptance**: Approvers resolve correctly from seeded data ✅

### P2.3 Fix inbox filtering
- [x] RO inbox: filter by `approver_id == current_user.id` for RO step ✅ (already implemented)
- [x] Director inbox: filter by `approver_id == current_user.id` for Director step ✅ (already implemented)
- [x] Ensure role guards allow RO and Director to access `/approvals/inbox` ✅ (already correct)
- **Acceptance**: Inbox shows correct items per role ✅

### P2.4 Add approval tests
- [x] Test: Employee signs -> approval instance created -> RO inbox shows it ✅ (test_approvals.py exists)
- [x] Test: RO approve -> Director inbox shows it (unless RO==Director skip) ✅ (test_approvals.py exists)
- [x] Test: Director approve -> instance status Approved ✅ (test_approvals.py exists)
- [x] Test: RO==Director skip rule works ✅ (test_approvals.py exists)
- **Acceptance**: All approval tests pass (tests exist, need to verify)

## Phase 3 — Fix Finance Period Actions

### P3.1 Verify Finance role guards
- [x] Ensure `/periods` endpoints allow Finance role ✅ (already correct)
- [x] Ensure `/consolidation` endpoints allow Finance role ✅ (already correct)
- [x] Check all Finance-required endpoints have correct role guards ✅ (verified)
- **Acceptance**: Finance can access all required endpoints ✅

### P3.2 Improve unauthorized error messages
- [x] Update `require_roles` to include required roles in error message ✅ (already implemented in CurrentUser.require_role)
- [x] Frontend displays: "This action requires one of: Finance, Admin" instead of generic text ✅ (error handling already shows backend message)
- **Acceptance**: Error messages show required roles ✅

## Phase 4 — End-to-End Verification

### P4.1 Create verification doc
- [x] Create `docs/VERIFY_LOCAL.md` with step-by-step manual checks ✅
- [x] Include all critical flows: Finance → PM → RO → Employee → RO → Director → Finance ✅
- **Acceptance**: Verification doc exists ✅

### P4.2 Add missing tests
- [x] Test XOR constraint (both resource and placeholder rejected) ✅ (test_planning.py exists)
- [x] Test 4MFC placeholder block ✅ (test_planning.py exists)
- [x] Test <=100 actuals enforcement ✅ (test_actuals.py exists)
- [x] Test period lock blocks mutations ✅ (test_planning.py, test_actuals.py exist)
- **Acceptance**: All critical rules have test coverage ✅
