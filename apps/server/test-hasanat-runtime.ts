import { RuntimeVerifier } from './src/services/runtime-verifier.js';
import pino from 'pino';

const logger = pino({ level: 'info' });
const verifier = new RuntimeVerifier(logger);

async function testHasanat() {
  console.log('\n========================================');
  console.log('TESTING HASANAT APP WITH RUNTIME VERIFICATION');
  console.log('========================================\n');

  const workspacePath = '/tmp/forge-workspaces/4c72569e-d73e-4322-8273-aad1a50fcbf5';

  console.log('Workspace:', workspacePath);
  console.log('\nThis app had 3 static verification errors:');
  console.log('  1. Missing ID: btn-add-task');
  console.log('  2. Missing ID: motivational-quote');
  console.log('  3. Missing ID: today-date');
  console.log('\nLets see what runtime verification finds...\n');

  const result = await verifier.verify(workspacePath);

  console.log('========================================');
  console.log('RESULT:', result.passed ? 'PASSED' : 'FAILED');
  console.log('========================================');
  console.log('Errors found:', result.errors.length);

  if (result.errors.length > 0) {
    console.log('\nRuntime errors:');
    result.errors.slice(0, 10).forEach((err, i) => {
      console.log(`\n${i + 1}. ${err}`);
    });

    if (result.errors.length > 10) {
      console.log(`\n... and ${result.errors.length - 10} more errors`);
    }
  }

  console.log('\n========================================\n');
}

testHasanat().catch(console.error);
