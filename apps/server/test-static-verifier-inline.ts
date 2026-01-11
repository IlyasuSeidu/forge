import { StaticVerifier } from './src/services/static-verifier.js';
import pino from 'pino';

const logger = pino({ level: 'info' });
const verifier = new StaticVerifier(logger);

async function test() {
  const result = await verifier.verify('/tmp/forge-workspaces/5e985b19-dcab-4a57-9c66-6c13671decd9');

  console.log('Passed:', result.passed);
  console.log('Errors:', result.errors);
}

test();
