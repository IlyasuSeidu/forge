import { StaticVerifier } from '/tmp/ralph/forge/apps/server/src/services/static-verifier.js';
import pino from 'pino';

const logger = pino();
const verifier = new StaticVerifier(logger);

async function test() {
  console.log('\n========================================');
  console.log('TESTING STATIC VERIFICATION ENGINE');
  console.log('========================================\n');

  // Test broken app
  console.log('TEST 1: Broken app (should FAIL)');
  console.log('Location: /tmp/test-verification');
  const result1 = await verifier.verify('/tmp/test-verification');
  console.log(`Passed: ${result1.passed}`);
  console.log(`Errors found: ${result1.errors.length}`);
  if (result1.errors.length > 0) {
    console.log('\nErrors:');
    result1.errors.forEach((err, i) => console.log(`${i + 1}. ${err}`));
  }

  console.log('\n----------------------------------------\n');

  // Test good app
  console.log('TEST 2: Good app (should PASS)');
  console.log('Location: /tmp/forge-workspaces/86c2b7b7-67f3-4517-9640-348c1a5cdee1');
  const result2 = await verifier.verify('/tmp/forge-workspaces/86c2b7b7-67f3-4517-9640-348c1a5cdee1');
  console.log(`Passed: ${result2.passed}`);
  console.log(`Errors found: ${result2.errors.length}`);
  if (result2.errors.length > 0) {
    console.log('\nErrors:');
    result2.errors.forEach((err, i) => console.log(`${i + 1}. ${err}`));
  }

  console.log('\n========================================\n');
}

test().catch(console.error);
