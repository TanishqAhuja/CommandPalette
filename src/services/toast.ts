/**
 * Toast service for displaying user notifications.
 * Can be implemented with any toast library (React Toastify, Sonner, etc.)
 * or a custom implementation.
 */
export interface ToastService {
  show: (message: string, duration?: number) => void;
}

/**
 * Simple toast service implementation.
 * Replace with your toast library in production (Toastify, Sonner, etc.).
 */
export class SimpleToastService implements ToastService {
  show(message: string, _duration?: number): void {
    console.log(`[Toast] ${message}`);
  }
}

/**
 * Mock toast service for testing.
 */
export class MockToastService implements ToastService {
  calls: Array<{ message: string; duration?: number }> = [];

  show(message: string, duration?: number): void {
    this.calls.push({ message, duration });
  }

  reset(): void {
    this.calls = [];
  }
}
