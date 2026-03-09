import app from './src/app.js';
import { config } from './src/config/env.js';

app.listen(config.port, () => {
  console.log(`Resume builder server listening on port ${config.port}`);
});