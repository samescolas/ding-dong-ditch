interface ToastData {
  id: number;
  message: string;
  type: "success" | "error" | "info";
  exiting?: boolean;
}

interface ToastProps {
  toast: ToastData;
  onDismiss: () => void;
}

const icons: Record<string, string> = {
  success: "M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z",
  error: "M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z",
  info: "M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z",
};

export default function Toast({ toast, onDismiss }: ToastProps) {
  return (
    <div className={`toast toast--${toast.type}${toast.exiting ? " toast--exiting" : ""}`} role="alert">
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d={icons[toast.type]} />
      </svg>
      <span>{toast.message}</span>
      <button className="toast__dismiss" onClick={onDismiss} aria-label="Dismiss notification">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M18 6L6 18M6 6l12 12" />
        </svg>
      </button>
      <div className="toast__progress" />
    </div>
  );
}
