import 'dotenv/config';
import fs from 'node:fs';
import path from 'node:path';
import express from 'express';
import { createServer as createViteServer } from 'vite';
import { createApiApp } from './server/app.ts';

const PORT = 3000;

async function startServer() {
  const app = createApiApp();

  const isProd = process.env.NODE_ENV === 'production';
  if (isProd && fs.existsSync(path.resolve('dist'))) {
    app.use(express.static(path.resolve('dist')));
    app.get('/{*splat}', (_req, res) => {
      res.sendFile(path.resolve('dist/index.html'));
    });
  } else {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Connecteo Learning server listening on http://0.0.0.0:${PORT}`);
  });
}

startServer();
