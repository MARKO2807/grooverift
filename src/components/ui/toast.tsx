"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

// Toast (components §4.9): one at a time, role="status", 2 s without an action and 5 s with one,
// never closes while focused or hovered, never the only home of information.
type Toast = { id: number; text: string; action?: { label: string; onPress: () => void } };

const ToastContext = createContext<{
  show: (text: string, action?: Toast["action"]) => void;
} | null>(null);

export const TOAST_MS = 2000;
export const TOAST_ACTION_MS = 5000;

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toast, setToast] = useState<Toast | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const box = useRef<HTMLDivElement>(null);

  const clear = useCallback(() => {
    if (timer.current) clearTimeout(timer.current);
    timer.current = null;
  }, []);

  // While the pointer or the focus is inside the toast, the time starts again (WCAG 2.2.1).
  const held = () => {
    const el = box.current;
    return Boolean(el && (el.matches(":hover") || el.contains(document.activeElement)));
  };

  const show = useCallback(
    (text: string, action?: Toast["action"]) => {
      const t: Toast = { id: Date.now(), text, action };
      setToast(t);
      clear();
      const ms = t.action ? TOAST_ACTION_MS : TOAST_MS;
      const tick = () => {
        if (held()) {
          timer.current = setTimeout(tick, ms);
          return;
        }
        setToast((cur) => (cur?.id === t.id ? null : cur));
      };
      timer.current = setTimeout(tick, ms);
    },
    [clear],
  );

  useEffect(() => clear, [clear]);
  const value = useMemo(() => ({ show }), [show]);

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div className="toast-region" role="status" aria-live="polite">
        {toast ? (
          <div className="toast" ref={box}>
            <span>{toast.text}</span>
            {toast.action ? (
              <button
                type="button"
                className="link"
                onClick={() => {
                  toast.action?.onPress();
                  setToast(null);
                  clear();
                }}
              >
                {toast.action.label}
              </button>
            ) : null}
          </div>
        ) : null}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error("useToast needs a ToastProvider");
  return ctx;
}
