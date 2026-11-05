"use client";

/** Reloads the page (SYS-02, SYS-03). With `onRetry` it calls that instead (an error boundary's reset). */
export function RetryButton({ label, onRetry }: { label: string; onRetry?: () => void }) {
  return (
    <button
      type="button"
      className="btn btn-primary"
      onClick={() => (onRetry ? onRetry() : window.location.reload())}
    >
      {label}
    </button>
  );
}
