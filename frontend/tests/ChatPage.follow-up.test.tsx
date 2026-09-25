import { afterEach, describe, expect, it, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ChatPage } from '../src/pages/ChatPage';
import { chatApi } from '../src/services/chatApi';

afterEach(() => {
  vi.restoreAllMocks();
});

describe('ChatPage conversation context', () => {
  it('appends a follow-up exchange after the earlier messages', async () => {
    const user = userEvent.setup();
    vi.spyOn(chatApi, 'createConversation').mockResolvedValue({ conversationId: 'conversation-1' });
    vi.spyOn(chatApi, 'submitQuestion')
      .mockResolvedValueOnce({ responseAttemptId: 'attempt-1', userMessageId: 'user-1', state: 'pending' })
      .mockResolvedValueOnce({ responseAttemptId: 'attempt-2', userMessageId: 'user-2', state: 'pending' });
    vi.spyOn(chatApi, 'getAttempt')
      .mockResolvedValueOnce({ responseAttemptId: 'attempt-1', state: 'completed', assistantMessageId: 'assistant-1', content: 'Start here.' })
      .mockResolvedValueOnce({ responseAttemptId: 'attempt-2', state: 'completed', assistantMessageId: 'assistant-2', content: 'Then continue.' });
    render(<ChatPage />);

    const composer = await screen.findByLabelText('Your question');
    await user.type(composer, 'What is the first step?');
    await user.click(screen.getByRole('button', { name: 'Send' }));
    expect(await screen.findByText('Start here.')).toBeInTheDocument();

    await user.type(screen.getByLabelText('Your question'), 'What comes next?');
    await user.click(screen.getByRole('button', { name: 'Send' }));
    expect(await screen.findByText('Then continue.')).toBeInTheDocument();

    const messages = screen.getAllByRole('article');
    expect(messages.map((message) => message.textContent)).toEqual([
      expect.stringContaining('What is the first step?'),
      expect.stringContaining('Start here.'),
      expect.stringContaining('What comes next?'),
      expect.stringContaining('Then continue.')
    ]);
  });

  it('clears the active history when starting a new conversation', async () => {
    const user = userEvent.setup();
    vi.spyOn(chatApi, 'createConversation')
      .mockResolvedValueOnce({ conversationId: 'conversation-1' })
      .mockResolvedValueOnce({ conversationId: 'conversation-2' });
    vi.spyOn(chatApi, 'submitQuestion').mockResolvedValue({
      responseAttemptId: 'attempt-1',
      userMessageId: 'user-1',
      state: 'pending'
    });
    vi.spyOn(chatApi, 'getAttempt').mockResolvedValue({
      responseAttemptId: 'attempt-1',
      state: 'completed',
      assistantMessageId: 'assistant-1',
      content: 'An earlier answer.'
    });
    render(<ChatPage />);

    await user.type(await screen.findByLabelText('Your question'), 'Keep this in the old thread.');
    await user.click(screen.getByRole('button', { name: 'Send' }));
    expect(await screen.findByText('An earlier answer.')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'New conversation' }));
    await waitFor(() => expect(screen.queryByText('Keep this in the old thread.')).not.toBeInTheDocument());
    expect(screen.getByText('Start with a question. The conversation will take shape here.')).toBeInTheDocument();
  });
});
