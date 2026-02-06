/**
 * Toast service for displaying user notifications.
 * Can be implemented with any toast library (React Toastify, Sonner, etc.)
 * or a custom implementation.
 */
export interface ToastAdapter {
  show: (message: string, durationMs?: number) => void;
}

export function createToastAdapter(
  addToast: (message: string, durationMs?: number) => void,
): ToastAdapter {
  return {
    show: addToast,
  };
}
