export type Toast = {
  id: string;
  message: string;
  durationMs: number;
  createdAt: number;
};

export type ToastContextValue = {
  addToast: (message: string, durationMs?: number) => void;
};
