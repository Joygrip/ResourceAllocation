/**
 * Toast notification hook using Fluent UI.
 */
import { useCallback, createContext, useContext, ReactNode } from 'react';
import {
  Toaster,
  useToastController,
  Toast,
  ToastTitle,
  ToastBody,
  ToastIntent,
  useId,
} from '@fluentui/react-components';
import { ApiError } from '../types';

interface ToastContextType {
  showSuccess: (title: string, message?: string) => void;
  showError: (title: string, message?: string) => void;
  showWarning: (title: string, message?: string) => void;
  showInfo: (title: string, message?: string) => void;
  showApiError: (error: ApiError | Error) => void;
}

const ToastContext = createContext<ToastContextType | null>(null);

export function ToastProvider({ children }: { children: ReactNode }) {
  const toasterId = useId('toaster');
  const { dispatchToast } = useToastController(toasterId);

  const codeMessages: Record<string, string> = {
    FTE_INVALID: 'FTE must be between 5 and 100 in steps of 5.',
    DEMAND_XOR: 'Demand must include either a resource or a placeholder (not both).',
    PLACEHOLDER_BLOCKED_4MFC: 'Placeholders are not allowed within the rolling 4-month forecast window.',
    ACTUALS_OVER_100: 'Total actuals exceed 100% for this resource.',
    PERIOD_LOCKED: 'Period is locked. Edits are not allowed.',
    UNAUTHORIZED_ROLE: 'You do not have permission to perform this action.',
    VALIDATION_ERROR: 'Validation error. Please check your input.',
  };

  const showToast = useCallback(
    (intent: ToastIntent, title: string, message?: string) => {
      dispatchToast(
        <Toast>
          <ToastTitle>{title}</ToastTitle>
          {message && <ToastBody>{message}</ToastBody>}
        </Toast>,
        { intent, timeout: intent === 'error' ? 8000 : 5000 }
      );
    },
    [dispatchToast]
  );

  const showSuccess = useCallback(
    (title: string, message?: string) => showToast('success', title, message),
    [showToast]
  );

  const showError = useCallback(
    (title: string, message?: string) => showToast('error', title, message),
    [showToast]
  );

  const showWarning = useCallback(
    (title: string, message?: string) => showToast('warning', title, message),
    [showToast]
  );

  const showInfo = useCallback(
    (title: string, message?: string) => showToast('info', title, message),
    [showToast]
  );

  const showApiError = useCallback(
    (error: ApiError | Error) => {
      if (error instanceof ApiError) {
        let detail = codeMessages[error.code] || error.detail || error.message;
        if (error.code === 'ACTUALS_OVER_100') {
          const total = error.extras?.total_percent;
          if (typeof total === 'number') {
            detail = `${detail} Total: ${total}%`;
          }
        }
        const title = `HTTP ${error.status} (${error.code})`;
        showError(title, detail);
      } else {
        showError('Error', error.message || 'An unexpected error occurred');
      }
    },
    [showError]
  );

  return (
    <ToastContext.Provider
      value={{ showSuccess, showError, showWarning, showInfo, showApiError }}
    >
      <Toaster toasterId={toasterId} position="top-end" />
      {children}
    </ToastContext.Provider>
  );
}

export function useToast() {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToast must be used within ToastProvider');
  }
  return context;
}
