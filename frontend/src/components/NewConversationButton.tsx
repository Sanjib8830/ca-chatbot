export interface NewConversationButtonProps {
  disabled?: boolean;
  onClick: () => void | Promise<void>;
}

export function NewConversationButton({
  disabled = false,
  onClick
}: NewConversationButtonProps) {
  return (
    <button
      className="new-conversation-button"
      type="button"
      onClick={() => void onClick()}
      disabled={disabled}
    >
      New conversation
    </button>
  );
}
