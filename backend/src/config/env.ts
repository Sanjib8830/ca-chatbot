import { existsSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import dotenv from 'dotenv';

const moduleDirectory = dirname(fileURLToPath(import.meta.url));
const sourceBackendRoot = resolve(moduleDirectory, '../..');
const backendRoot = existsSync(resolve(sourceBackendRoot, 'package.json'))
  ? sourceBackendRoot
  : resolve(moduleDirectory, '../../..');
dotenv.config({ path: resolve(backendRoot, '.env') });

export const TARGET_MODEL = 'gemma-4-26b-a4b-it';
export const DEFAULT_MESSAGE_LENGTH_LIMIT = 2000;
export const DEFAULT_REQUEST_TIMEOUT_MS = 15000;
export const DEFAULT_PORT = 3001;

export interface RuntimeConfig {
  googleApiKey?: string;
  model: string;
  messageLengthLimit: number;
  requestTimeoutMs: number;
  port: number;
  staticDir?: string;
}

function positiveInteger(value: string | undefined, fallback: number): number {
  if (!value) {
    return fallback;
  }

  const parsed = Number.parseInt(value, 10);
  return Number.isSafeInteger(parsed) && parsed > 0 ? parsed : fallback;
}

export function loadRuntimeConfig(env: NodeJS.ProcessEnv = process.env): RuntimeConfig {
  const googleApiKey = env.GOOGLE_API_KEY?.trim() || undefined;
  const model = env.GEMMA_MODEL?.trim() || TARGET_MODEL;

  return {
    googleApiKey,
    model,
    messageLengthLimit: positiveInteger(env.MESSAGE_LENGTH_LIMIT, DEFAULT_MESSAGE_LENGTH_LIMIT),
    requestTimeoutMs: positiveInteger(env.REQUEST_TIMEOUT_MS, DEFAULT_REQUEST_TIMEOUT_MS),
    port: positiveInteger(env.PORT, DEFAULT_PORT),
    staticDir: env.STATIC_DIR?.trim() || undefined
  };
}

export function safeRuntimeConfigSummary(config: RuntimeConfig): {
  providerConfigured: boolean;
  modelConfigured: boolean;
  messageLengthLimit: number;
  requestTimeoutMs: number;
} {
  return {
    providerConfigured: Boolean(config.googleApiKey),
    modelConfigured: Boolean(config.model),
    messageLengthLimit: config.messageLengthLimit,
    requestTimeoutMs: config.requestTimeoutMs
  };
}
