import dns from 'node:dns';
try {
  dns.setServers(['8.8.8.8', '1.1.1.1']);
} catch (err) {
  console.warn('Failed to set custom DNS servers, using system default:', err.message);
}

import app from './src/app.js';
import { config } from './src/config/env.js';

app.listen(config.port, () => {
  console.log(`Resume builder server listening on port ${config.port}`);
});