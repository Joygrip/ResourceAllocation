/**
 * Shared TypeScript types.
 */

// User roles matching backend
export type UserRole = 'Admin' | 'Finance' | 'PM' | 'RO' | 'Director' | 'Employee';

// Period status
export type PeriodStatus = 'open' | 'locked';

// Current user info
export interface MeResponse {
  tenant_id: string;
  object_id: string;
  email: string;
  display_name: string;
  role: UserRole;
  permissions: string[];
}

// Health response
export interface HealthResponse {
  status: string;
  version: string;
  environment: string;
}

// Period
export interface Period {
  id: string;
  tenant_id: string;
  year: number;
  month: number;
  status: PeriodStatus;
  locked_at: string | null;
  locked_by: string | null;
  lock_reason: string | null;
  created_at: string;
  updated_at: string;
}

// Problem Details error response
export interface ProblemDetail {
  type: string;
  title: string;
  status: number;
  detail?: string;
  code: string;
  errors?: Array<{
    field: string;
    message: string;
    type: string;
  }>;
}

// API Error
export class ApiError extends Error {
  status: number;
  code: string;
  detail?: string;
  errors?: ProblemDetail['errors'];

  constructor(problem: ProblemDetail) {
    super(problem.title);
    this.status = problem.status;
    this.code = problem.code;
    this.detail = problem.detail;
    this.errors = problem.errors;
  }
}

// Dev auth state
export interface DevAuthState {
  role: UserRole;
  tenantId: string;
  userId: string;
  email: string;
  displayName: string;
}
