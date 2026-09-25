import { afterEach, describe, expect, it } from 'vitest';
import type { Server } from 'node:http';
import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createServer } from '../../src/api/server.js';
import type { RuntimeConfig } from '../../src/config/env.js';

const servers: Server[] = [];
const directories: string[] = [];

const config: RuntimeConfig = {
  model: 'gemma-4-26b-a4b-it',
  messageLengthLimit: 2000,
  requestTimeoutMs: 1000,
  port: 0
};

afterEach(async () => {
  await Promise.all(servers.splice(0).map(
    (server) => new Promise<void>((resolve, reject) => server.close((error) => error ? reject(error) : resolve()))
  ));
  await Promise.all(directories.splice(0).map((directory) => rm(directory, { recursive: true, force: true })));
});

describe('production static asset serving', () => {
  it('serves compiled files and falls back to the React entrypoint for client routes', async () => {
    const staticDir = await mkdtemp(join(tmpdir(), 'ca-chatbot-static-'));
    directories.push(staticDir);
    await writeFile(join(staticDir, 'index.html'), '<main>Ca Chatbot</main>');
    await writeFile(join(staticDir, 'app.js'), 'console.log("ready");');

    const server = createServer({ config: { ...config, staticDir } });
    servers.push(server);
    await new Promise<void>((resolve) => server.listen(0, resolve));
    const address = server.address();
    if (!address || typeof address === 'string') {
      throw new Error('Test server did not expose an address.');
    }
    const baseUrl = `http://127.0.0.1:${address.port}`;

    const assetResponse = await fetch(`${baseUrl}/app.js`);
    const routeResponse = await fetch(`${baseUrl}/conversation/history`);
    const missingAsset = await fetch(`${baseUrl}/missing.js`);

    expect(await assetResponse.text()).toBe('console.log("ready");');
    expect(routeResponse.headers.get('content-type')).toContain('text/html');
    expect(await routeResponse.text()).toBe('<main>Ca Chatbot</main>');
    expect(missingAsset.status).toBe(404);
  });
});
