import { createReadStream } from 'node:fs';
import { stat } from 'node:fs/promises';
import { basename, extname, resolve, sep } from 'node:path';
import { createServer as createNodeServer, type IncomingMessage, type ServerResponse } from 'node:http';
import type { RuntimeConfig } from '../config/env.js';
import { loadRuntimeConfig } from '../config/env.js';
import { handleConversationRoutes } from './conversations.js';
import { ConversationService } from '../services/conversationService.js';
import { createLlmService, type LlmService } from '../services/llmService.js';

export interface ServerOptions {
  config?: RuntimeConfig;
  conversationService?: ConversationService;
  llmService?: LlmService;
}

function sendJson(response: ServerResponse, statusCode: number, payload: Record<string, unknown>): void {
  response.statusCode = statusCode;
  response.setHeader('Content-Type', 'application/json; charset=utf-8');
  response.end(JSON.stringify(payload));
}

function applyCorsHeaders(response: ServerResponse): void {
  response.setHeader('Access-Control-Allow-Origin', 'http://localhost:5173');
  response.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  response.setHeader('Access-Control-Allow-Headers', 'Content-Type');
}

const contentTypes: Record<string, string> = {
  '.css': 'text/css; charset=utf-8',
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.map': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.woff2': 'font/woff2'
};

async function serveStaticFile(
  request: IncomingMessage,
  response: ServerResponse,
  pathname: string,
  staticDir: string | undefined
): Promise<boolean> {
  if (!staticDir || (request.method !== 'GET' && request.method !== 'HEAD')) {
    return false;
  }

  let decodedPath: string;
  try {
    decodedPath = decodeURIComponent(pathname);
  } catch {
    sendJson(response, 400, { error: 'Invalid request path.' });
    return true;
  }

  const root = resolve(staticDir);
  const candidate = resolve(root, `.${decodedPath}`);
  const fallback = resolve(root, 'index.html');
  const requestedFile = extname(candidate) ? candidate : fallback;

  if (requestedFile !== root && !requestedFile.startsWith(`${root}${sep}`)) {
    sendJson(response, 403, { error: 'Forbidden.' });
    return true;
  }

  try {
    const file = await stat(requestedFile);
    if (!file.isFile()) {
      return false;
    }

    response.statusCode = 200;
    response.setHeader('Content-Type', contentTypes[extname(requestedFile)] ?? 'application/octet-stream');
    response.setHeader('Cache-Control', basename(requestedFile) === 'index.html'
      ? 'no-cache'
      : 'public, max-age=31536000, immutable');

    if (request.method === 'HEAD') {
      response.end();
      return true;
    }

    createReadStream(requestedFile).pipe(response);
    return true;
  } catch {
    if (extname(candidate)) {
      return false;
    }

    try {
      const fallbackFile = await stat(fallback);
      if (!fallbackFile.isFile()) {
        return false;
      }
      response.statusCode = 200;
      response.setHeader('Content-Type', contentTypes['.html']);
      response.setHeader('Cache-Control', 'no-cache');
      if (request.method === 'HEAD') {
        response.end();
      } else {
        createReadStream(fallback).pipe(response);
      }
      return true;
    } catch {
      return false;
    }
  }
}

export function createServer(options: ServerOptions = {}) {
  const config = options.config ?? loadRuntimeConfig();
  const service = options.conversationService ?? new ConversationService({
    config,
    llmService: options.llmService ?? createLlmService(config)
  });

  return createNodeServer(async (request: IncomingMessage, response: ServerResponse) => {
    applyCorsHeaders(response);

    if (request.method === 'OPTIONS') {
      response.statusCode = 204;
      response.end();
      return;
    }

    try {
      const url = new URL(request.url ?? '/', 'http://localhost');
      if (url.pathname.startsWith('/api/')) {
        const handled = await handleConversationRoutes(request, response, service, url.pathname);
        if (handled) {
          return;
        }
      }

      if (await serveStaticFile(request, response, url.pathname, config.staticDir)) {
        return;
      }

      sendJson(response, 404, { error: 'Route not found.' });
    } catch {
      if (!response.writableEnded) {
        sendJson(response, 500, { error: 'Something went wrong while handling the request.' });
      }
    }
  });
}

export function startServer(options: ServerOptions = {}): ReturnType<typeof createNodeServer> {
  const config = options.config ?? loadRuntimeConfig();
  const server = createServer({ ...options, config });
  server.listen(config.port);
  return server;
}
