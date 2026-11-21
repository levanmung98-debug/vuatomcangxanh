import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import fs from 'fs';
import path from 'path';

function getContractsDbPath() {
  const dir = path.resolve(process.cwd(), 'tmp');
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  return path.join(dir, 'contracts_db.json');
}

function getBackupContractsDbPath() {
  const dir = path.resolve(process.cwd(), 'public');
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  return path.join(dir, 'contracts_db.json');
}

function loadContractsDb(): Record<string, any> {
  try {
    const file = getContractsDbPath();
    if (fs.existsSync(file)) {
      const data = JSON.parse(fs.readFileSync(file, 'utf-8'));
      if (data && Object.keys(data).length > 0) return data;
    }
    const backupFile = getBackupContractsDbPath();
    if (fs.existsSync(backupFile)) {
      return JSON.parse(fs.readFileSync(backupFile, 'utf-8'));
    }
  } catch (e) {}
  return {};
}

function saveContractsDb(data: Record<string, any>) {
  try {
    const file = getContractsDbPath();
    const str = JSON.stringify(data, null, 2);
    fs.writeFileSync(file, str, 'utf-8');
    try {
      const backupFile = getBackupContractsDbPath();
      fs.writeFileSync(backupFile, str, 'utf-8');
    } catch (e2) {}
  } catch (e) {}
}

function autoCleanContracts(db: Record<string, any>) {
  // Permanent retention: Contracts are never automatically deleted after 30 days
  return db;
}

function getTraderProfilePath() {
  const dir = path.resolve(process.cwd(), 'tmp');
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  return path.join(dir, 'trader_profile.json');
}

function loadTraderProfile(): Record<string, any> | null {
  try {
    const file = getTraderProfilePath();
    if (fs.existsSync(file)) {
      return JSON.parse(fs.readFileSync(file, 'utf-8'));
    }
  } catch (e) {}
  return null;
}

function saveTraderProfile(data: Record<string, any>) {
  try {
    const file = getTraderProfilePath();
    fs.writeFileSync(file, JSON.stringify(data, null, 2), 'utf-8');
  } catch (e) {}
}

const contractsApiPlugin = {
  name: 'contracts-api-server',
  configureServer(server: any) {
    server.middlewares.use((req: any, res: any, next: any) => {
      const url = req.url || '';

      // Handler for /api/trader-profile
      if (url.startsWith('/api/trader-profile')) {
        const method = req.method;
        res.setHeader('Content-Type', 'application/json');
        res.setHeader('Access-Control-Allow-Origin', '*');
        res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
        res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

        if (method === 'OPTIONS') {
          res.statusCode = 204;
          return res.end();
        }

        if (method === 'GET') {
          const profile = loadTraderProfile();
          res.statusCode = 200;
          return res.end(JSON.stringify({ success: true, profile }));
        }

        if (method === 'POST' || method === 'PUT') {
          let body = '';
          req.on('data', (chunk: any) => { body += chunk; });
          req.on('end', () => {
            try {
              const data = JSON.parse(body || '{}');
              data._updatedAt = Date.now();
              saveTraderProfile(data);
              res.statusCode = 200;
              return res.end(JSON.stringify({ success: true, profile: data }));
            } catch (err: any) {
              res.statusCode = 400;
              return res.end(JSON.stringify({ error: 'Invalid JSON', details: err.message }));
            }
          });
          return;
        }
      }

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

      const getDeletedContractsPath = () => {
        const dir = path.resolve(process.cwd(), 'tmp');
        if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
        return path.join(dir, 'deleted_contracts.json');
      };
      const loadDeletedIds = (): Record<string, number> => {
        try {
          const f = getDeletedContractsPath();
          if (fs.existsSync(f)) return JSON.parse(fs.readFileSync(f, 'utf-8')) || {};
        } catch (e) {}
        return {};
      };
      const saveDeletedIds = (map: Record<string, number>) => {
        try {
          fs.writeFileSync(getDeletedContractsPath(), JSON.stringify(map), 'utf-8');
        } catch (e) {}
      };

      const db = autoCleanContracts(loadContractsDb());
      const deletedMap = loadDeletedIds();

      // Helper to deduplicate contracts stored under both raw id and normalized cleanId
      const uniqueContracts = (list: any[]) => {
        const map = new Map<string, any>();
        for (const item of list) {
          if (item && item.id) {
            const prev = map.get(item.id);
            if (!prev || (item._updatedAt || 0) >= (prev._updatedAt || 0)) {
              map.set(item.id, item);
            }
          }
        }
        return Array.from(map.values());
      };

      // GET /api/contracts/poll?since=12345
      if (method === 'GET' && pathname === '/api/contracts/poll') {
        const since = Number(parsedUrl.searchParams.get('since') || 0);
        const changed = uniqueContracts(Object.values(db)).filter((c: any) => c && (c._updatedAt || 0) > since);
        const deletedIds = Object.entries(deletedMap)
          .filter(([, ts]) => Number(ts || 0) > since)
          .map(([k]) => k);
        res.statusCode = 200;
        return res.end(JSON.stringify({ contracts: changed, deletedIds, serverTime: Date.now() }));
      }

      // GET /api/contracts/:id
      const idMatch = pathname.match(/^\/api\/contracts\/([^/]+)$/);
      if (method === 'GET' && idMatch) {
        const rawId = decodeURIComponent(idMatch[1]).trim();
        const cleanId = rawId.replace(/Đ/g, 'D').toUpperCase();
        const digitsOnly = rawId.replace(/[^0-9]/g, '');

        let contract = db[rawId] || 
                       db[cleanId] || 
                       db[rawId.replace(/D/g, 'Đ')] ||
                       db['HDTCX-' + rawId] ||
                       db['HDTCX-' + cleanId];

        if (!contract) {
          const list = uniqueContracts(Object.values(db));
          contract = list.find((c: any) => {
            if (!c || !c.id) return false;
            const cId = String(c.id).replace(/Đ/g, 'D').trim().toUpperCase();
            if (cId === cleanId) return true;
            if (cId.replace(/[^0-9A-Z]/g, '') === cleanId.replace(/[^0-9A-Z]/g, '')) return true;
            if (digitsOnly && digitsOnly.length >= 6 && String(c.id).includes(digitsOnly)) return true;
            if (c.farmerId === rawId || c.pondId === rawId) return true;
            return false;
          });
        }

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
        return res.end(JSON.stringify({ contracts: uniqueContracts(Object.values(db)), serverTime: Date.now() }));
      }

      // DELETE /api/contracts/:id (Matches contract ID, cleanId, farmerId, or pondId)
      if (method === 'DELETE' && idMatch) {
        const contractId = decodeURIComponent(idMatch[1]).trim();
        const cleanId = contractId.replace(/Đ/g, 'D').toUpperCase();
        const now = Date.now();
        const removedIds = new Set<string>([contractId, cleanId]);

        for (const [k, val] of Object.entries(db)) {
          const vId = val && val.id ? String(val.id) : '';
          const vCleanId = vId.replace(/Đ/g, 'D').toUpperCase();
          if (
            k === contractId ||
            k === cleanId ||
            vId === contractId ||
            vCleanId === cleanId ||
            (val && (val.farmerId === contractId || val.pondId === contractId))
          ) {
            if (vId) removedIds.add(vId);
            if (vCleanId) removedIds.add(vCleanId);
            removedIds.add(k);
            delete db[k];
          }
        }
        removedIds.forEach((rid) => {
          deletedMap[rid] = now;
        });
        saveContractsDb(db);
        saveDeletedIds(deletedMap);
        res.statusCode = 200;
        return res.end(JSON.stringify({ success: true, deletedId: contractId, removedIds: Array.from(removedIds) }));
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
              const cleanId = String(data.id).replace(/Đ/g, 'D').toUpperCase();
              db[data.id] = data;
              db[cleanId] = data;
              if (deletedMap[data.id]) delete deletedMap[data.id];
              if (deletedMap[cleanId]) delete deletedMap[cleanId];
              saveDeletedIds(deletedMap);
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
  },
  configurePreviewServer(server: any) {
    (this as any).configureServer(server);
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
