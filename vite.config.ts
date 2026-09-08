import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import fs from 'fs';
import path from 'path';

function getContractsDbPath() {
  const dir = path.resolve(process.cwd(), 'tmp');
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  return path.join(dir, 'contracts_db.json');
}

function loadContractsDb(): Record<string, any> {
  try {
    const file = getContractsDbPath();
    if (fs.existsSync(file)) {
      return JSON.parse(fs.readFileSync(file, 'utf-8'));
    }
  } catch (e) {}
  return {};
}

function saveContractsDb(data: Record<string, any>) {
  try {
    const file = getContractsDbPath();
    fs.writeFileSync(file, JSON.stringify(data, null, 2), 'utf-8');
  } catch (e) {}
}

function autoCleanContracts(db: Record<string, any>) {
  const now = Date.now();
  const thirtyDaysMs = 30 * 24 * 60 * 60 * 1000;
  let changed = false;
  for (const id of Object.keys(db)) {
    const c = db[id];
    if (!c) continue;
    const isWeighed = c.weighed === true || c.status === 'COMPLETED';
    if (isWeighed) {
      const dateStr = c.weighedAt || c.completedAt || c.weighingDate;
      if (dateStr) {
        const time = new Date(dateStr).getTime();
        if (!isNaN(time) && (now - time) > thirtyDaysMs) {
          delete db[id];
          changed = true;
        }
      }
    }
  }
  if (changed) saveContractsDb(db);
  return db;
}

const contractsApiPlugin = {
  name: 'contracts-api-server',
  configureServer(server: any) {
    server.middlewares.use((req: any, res: any, next: any) => {
      const url = req.url || '';
      if (!url.startsWith('/api/contracts')) {
        return next();
      }

      const parsedUrl = new URL(url, 'http://localhost:3000');
      const pathname = parsedUrl.pathname;
      const method = req.method;

      res.setHeader('Content-Type', 'application/json');
      res.setHeader('Access-Control-Allow-Origin', '*');
      res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
      res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

      if (method === 'OPTIONS') {
        res.statusCode = 204;
        return res.end();
      }

      const db = autoCleanContracts(loadContractsDb());

      // GET /api/contracts/poll?since=12345
      if (method === 'GET' && pathname === '/api/contracts/poll') {
        const since = Number(parsedUrl.searchParams.get('since') || 0);
        const changed = Object.values(db).filter((c: any) => c && (c._updatedAt || 0) > since);
        res.statusCode = 200;
        return res.end(JSON.stringify({ contracts: changed, serverTime: Date.now() }));
      }

      // GET /api/contracts/:id
      const idMatch = pathname.match(/^\/api\/contracts\/([^/]+)$/);
      if (method === 'GET' && idMatch) {
        const contractId = decodeURIComponent(idMatch[1]);
        const contract = db[contractId];
        if (contract) {
          res.statusCode = 200;
          return res.end(JSON.stringify(contract));
        } else {
          res.statusCode = 404;
          return res.end(JSON.stringify({ error: 'Contract not found' }));
        }
      }

      // GET /api/contracts (List all)
      if (method === 'GET' && (pathname === '/api/contracts' || pathname === '/api/contracts/')) {
        res.statusCode = 200;
        return res.end(JSON.stringify({ contracts: Object.values(db), serverTime: Date.now() }));
      }

      // DELETE /api/contracts/:id
      if (method === 'DELETE' && idMatch) {
        const contractId = decodeURIComponent(idMatch[1]);
        if (db[contractId]) {
          delete db[contractId];
          saveContractsDb(db);
        }
        res.statusCode = 200;
        return res.end(JSON.stringify({ success: true, deletedId: contractId }));
      }

      // POST or PUT /api/contracts
      if (method === 'POST' || method === 'PUT') {
        let body = '';
        req.on('data', (chunk: any) => { body += chunk; });
        req.on('end', () => {
          try {
            const data = JSON.parse(body || '{}');
            if (data && data.id) {
              const now = Date.now();
              data._updatedAt = now;
              db[data.id] = data;
              saveContractsDb(db);
              res.statusCode = 200;
              return res.end(JSON.stringify({ success: true, contract: data }));
            } else {
              res.statusCode = 400;
              return res.end(JSON.stringify({ error: 'Missing contract id' }));
            }
          } catch (err: any) {
            res.statusCode = 400;
            return res.end(JSON.stringify({ error: 'Invalid JSON', details: err.message }));
          }
        });
        return;
      }

      next();
    });
  }
};

export default defineConfig({
  plugins: [react(), contractsApiPlugin],
  server: {
    port: 3000,
    host: '0.0.0.0',
  },
  preview: {
    port: 3000,
    host: '0.0.0.0',
  },
  build: {
    outDir: 'dist',
  },
});
