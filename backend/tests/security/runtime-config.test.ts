import { describe, expect, it } from 'vitest';
import { loadRuntimeConfig, safeRuntimeConfigSummary } from '../../src/config/env.js';
import { createLlmService } from '../../src/services/llmService.js';

const secret = 'AIza-test-secret-value';

describe('runtime configuration security', () => {
  it('keeps provider credentials out of safe configuration summaries', () => {
    const config = loadRuntimeConfig({
      GOOGLE_API_KEY: secret,
      GEMMA_MODEL: 'gemma-4-26b-a4b-it',
      MESSAGE_LENGTH_LIMIT: '1200',
      REQUEST_TIMEOUT_MS: '9000'
    });
    const summary = safeRuntimeConfigSummary(config);

    expect(summary).toEqual({
      providerConfigured: true,
      modelConfigured: true,
      messageLengthLimit: 1200,
      requestTimeoutMs: 9000
    });
    expect(JSON.stringify(summary)).not.toContain(secret);
  });

  it('returns a safe failure when the provider credential is absent', async () => {
    const config = loadRuntimeConfig({});
    const service = createLlmService(config);

    const result = await service.generateResponse([{ role: 'user', content: 'Hello' }]);

    expect(result).toEqual({
      ok: false,
      failure: {
        code: 'configuration',
        message: 'The assistant is not configured yet. Please try again later.'
      }
    });
    expect(JSON.stringify(result)).not.toContain('GOOGLE_API_KEY');
    expect(JSON.stringify(result)).not.toContain('gemma-4-26b-a4b-it');
  });
});
