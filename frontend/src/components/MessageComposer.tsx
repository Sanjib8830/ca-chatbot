import { useState, type FormEvent } from 'react';

export interface MessageComposerProps {
  disabled?: boolean;
  maxLength: number;
  externalError?: string;
  onSubmit: (content: string) => Promise<boolean>;
}

export function MessageComposer({
  disabled = false,
  maxLength,
  externalError,
  onSubmit
}: MessageComposerProps) {
  const [draft, setDraft] = useState('');
  const [localError, setLocalError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const error = localError || externalError;
  const inputDisabled = disabled || isSubmitting;

  async function handleSubmit(event: FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();
    const normalizedDraft = draft.trim();

    if (!normalizedDraft) {
      setLocalError('Enter a question before sending it.');
      return;
    }

    if (normalizedDraft.length > maxLength) {
      setLocalError(`Keep your question to ${maxLength} characters or fewer.`);
      return;
    }

    setLocalError('');
    setIsSubmitting(true);
    try {
      const accepted = await onSubmit(draft);
      if (accepted) {
        setDraft('');
      }
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <form className="composer" onSubmit={(event) => void handleSubmit(event)} noValidate>
      <label className="composer-label" htmlFor="message-input">
        Your question
      </label>
      <div className="composer-row">
        <textarea
          id="message-input"
          name="message"
          value={draft}
          onChange={(event) => {
            setDraft(event.target.value);
            if (localError) {
              setLocalError('');
            }
          }}
          placeholder="Ask something worth thinking about..."
          maxLength={maxLength + 1}
          disabled={inputDisabled}
          aria-invalid={Boolean(error)}
          aria-describedby="composer-help composer-error"
          rows={2}
        />
        <button className="send-button" type="submit" disabled={inputDisabled}>
          {isSubmitting ? 'Sending...' : 'Send'}
        </button>
      </div>
      <div className="composer-footer">
        <span id="composer-help">{maxLength} character limit</span>
        <span id="composer-error" className="composer-error" role={error ? 'alert' : undefined}>
          {error}
        </span>
      </div>
    </form>
  );
}
