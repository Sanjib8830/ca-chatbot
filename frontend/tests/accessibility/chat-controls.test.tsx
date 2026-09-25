import { afterEach, describe, expect, it, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ChatPage } from '../../src/pages/ChatPage';
import { chatApi } from '../../src/services/chatApi';

afterEach(() => {
  vi.restoreAllMocks();
});

describe('chat control accessibility', () => {
  it('exposes labeled controls that can be operated from the keyboard', async () => {
    const user = userEvent.setup();
    const createConversation = vi.spyOn(chatApi, 'createConversation')
      .mockResolvedValueOnce({ conversationId: 'conversation-1' })
      .mockResolvedValueOnce({ conversationId: 'conversation-2' });
    const submitQuestion = vi.spyOn(chatApi, 'submitQuestion').mockResolvedValue({
      responseAttemptId: 'attempt-1',
      userMessageId: 'user-1',
      assistantMessageId: 'assistant-1',
      state: 'completed',
      content: 'A keyboard-friendly answer.'
    });
    render(<ChatPage />);

    const composer = await screen.findByRole('textbox', { name: 'Your question' });
    const sendButton = screen.getByRole('button', { name: 'Send' });
    const newConversationButton = screen.getByRole('button', { name: 'New conversation' });

    expect(composer).toHaveAttribute('aria-describedby', 'composer-help composer-error');
    composer.focus();
    await user.type(composer, 'A keyboard question.');
    await user.tab();
    expect(sendButton).toHaveFocus();
    await user.keyboard('{Enter}');
    await waitFor(() => expect(submitQuestion).toHaveBeenCalledTimes(1));

    newConversationButton.focus();
    expect(newConversationButton).toHaveFocus();
    await user.keyboard('{Enter}');
    await waitFor(() => expect(createConversation).toHaveBeenCalledTimes(2));
  });

  it('exposes the retry action as a focused, labeled alert control', async () => {
    const user = userEvent.setup();
    vi.spyOn(chatApi, 'createConversation').mockResolvedValue({ conversationId: 'conversation-1' });
    vi.spyOn(chatApi, 'submitQuestion').mockResolvedValue({
      responseAttemptId: 'attempt-1',
      userMessageId: 'user-1',
      state: 'pending'
    });
    vi.spyOn(chatApi, 'getAttempt').mockResolvedValue({
      responseAttemptId: 'attempt-1',
      state: 'failed',
      error: 'Please try again.'
    });
    render(<ChatPage />);

    await user.type(await screen.findByRole('textbox', { name: 'Your question' }), 'Retry this.');
    await user.click(screen.getByRole('button', { name: 'Send' }));

    const alert = await screen.findByRole('alert');
    const retryButton = screen.getByRole('button', { name: 'Try again' });
    expect(alert).toHaveTextContent('Please try again.');
    retryButton.focus();
    expect(retryButton).toHaveFocus();
  });
});
