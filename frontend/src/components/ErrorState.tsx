export interface ErrorStateProps {
  message: string;
  onRetry: () => void | Promise<void>;
  isRetrying?: boolean;
}

export function ErrorState({ message, onRetry, isRetrying = false }: ErrorStateProps) {
  return (
    <div className="error-state" role="alert">
      <p>{message}</p>
      <button className="retry-button" type="button" onClick={() => void onRetry()} disabled={isRetrying}>
        {isRetrying ? 'Retrying...' : 'Try again'}
      </button>
    </div>
  );
}
