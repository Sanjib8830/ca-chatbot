import { afterEach, describe, expect, it, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ChatPage } from '../src/pages/ChatPage';
import { chatApi } from '../src/services/chatApi';

afterEach(() => {
  vi.restoreAllMocks();
});

function mockConversationStart() {
  return vi.spyOn(chatApi, 'createConversation').mockResolvedValue({
    conversationId: 'conversation-1'
  });
}

describe('ChatPage question flow', () => {
  it('rejects empty input without submitting a request', async () => {
    const user = userEvent.setup();
    mockConversationStart();
    const submitQuestion = vi.spyOn(chatApi, 'submitQuestion');
    render(<ChatPage />);

    const composer = await screen.findByLabelText('Your question');
    await user.click(screen.getByRole('button', { name: 'Send' }));

    expect(screen.getByText('Enter a question before sending it.')).toBeInTheDocument();
    expect(submitQuestion).not.toHaveBeenCalled();
    expect(composer).toHaveValue('');
  });

  it('shows the submitted question once and renders the assistant response', async () => {
    const user = userEvent.setup();
    mockConversationStart();
    vi.spyOn(chatApi, 'submitQuestion').mockResolvedValue({
      responseAttemptId: 'attempt-1',
      userMessageId: 'user-1',
      state: 'pending'
    });
    vi.spyOn(chatApi, 'getAttempt').mockResolvedValue({
      responseAttemptId: 'attempt-1',
      state: 'completed',
      assistantMessageId: 'assistant-1',
      content: 'A useful answer.'
    });
    render(<ChatPage />);

    await user.type(await screen.findByLabelText('Your question'), 'What should I focus on?');
    await user.click(screen.getByRole('button', { name: 'Send' }));

    expect(await screen.findByText('What should I focus on?')).toBeInTheDocument();
    expect(await screen.findByText('A useful answer.')).toBeInTheDocument();
    expect(screen.getAllByText('What should I focus on?')).toHaveLength(1);
  });

  it('disables duplicate submission while an attempt is pending', async () => {
    const user = userEvent.setup();
    mockConversationStart();
    const submitQuestion = vi.spyOn(chatApi, 'submitQuestion').mockResolvedValue({
      responseAttemptId: 'attempt-1',
      userMessageId: 'user-1',
      state: 'pending'
    });
    const getAttempt = vi.spyOn(chatApi, 'getAttempt')
      .mockResolvedValueOnce({ responseAttemptId: 'attempt-1', state: 'pending' })
      .mockResolvedValue({
        responseAttemptId: 'attempt-1',
        state: 'completed',
        assistantMessageId: 'assistant-1',
        content: 'Done.'
      });
    render(<ChatPage />);

    const composer = await screen.findByLabelText('Your question');
    await user.type(composer, 'Keep this exactly once.');
    await user.click(screen.getByRole('button', { name: 'Send' }));

    await waitFor(() => expect(screen.getByRole('button', { name: 'Send' })).toBeDisabled());
    expect(submitQuestion).toHaveBeenCalledTimes(1);
    expect(getAttempt).toHaveBeenCalled();
  });
});
