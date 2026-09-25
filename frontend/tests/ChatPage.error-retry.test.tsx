import { afterEach, describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ChatPage } from '../src/pages/ChatPage';
import { chatApi } from '../src/services/chatApi';

afterEach(() => {
  vi.restoreAllMocks();
});

describe('ChatPage error recovery', () => {
  it('keeps the failed question and retries it without re-entry', async () => {
    const user = userEvent.setup();
    vi.spyOn(chatApi, 'createConversation').mockResolvedValue({ conversationId: 'conversation-1' });
    const submitQuestion = vi.spyOn(chatApi, 'submitQuestion').mockResolvedValue({
      responseAttemptId: 'attempt-1',
      userMessageId: 'user-1',
      state: 'pending'
    });
    vi.spyOn(chatApi, 'getAttempt')
      .mockResolvedValueOnce({
        responseAttemptId: 'attempt-1',
        state: 'failed',
        error: 'The assistant took too long to respond. Please try again.'
      })
      .mockResolvedValueOnce({
        responseAttemptId: 'attempt-1',
        state: 'completed',
        assistantMessageId: 'assistant-1',
        content: 'Recovered answer.'
      });
    const retryAttempt = vi.spyOn(chatApi, 'retryAttempt').mockResolvedValue({
      responseAttemptId: 'attempt-1',
      userMessageId: 'user-1',
      state: 'pending'
    });
    render(<ChatPage />);

    const question = 'Please recover this question.';
    await user.type(await screen.findByLabelText('Your question'), question);
    await user.click(screen.getByRole('button', { name: 'Send' }));

    expect(await screen.findByRole('alert')).toHaveTextContent('The assistant took too long to respond. Please try again.');
    expect(screen.getAllByText(question)).toHaveLength(1);

    await user.click(screen.getByRole('button', { name: 'Try again' }));

    expect(await screen.findByText('Recovered answer.')).toBeInTheDocument();
    expect(screen.getAllByText(question)).toHaveLength(1);
    expect(submitQuestion).toHaveBeenCalledTimes(1);
    expect(retryAttempt).toHaveBeenCalledWith('conversation-1', 'attempt-1');
  });
});
