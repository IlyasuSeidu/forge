import { VerificationService } from './src/services/verification-service.js';
import pino from 'pino';

const logger = pino();
const verificationService = new VerificationService(logger);

async function fixStuckVerification() {
  const appRequestId = '5d9571f5-dc21-4173-954b-754bb45a22d9';
  const executionId = '78bf5f75-a864-4f11-8865-621516a8636f';

  console.log('\n========================================');
  console.log('FIXING STUCK VERIFICATION');
  console.log('========================================\n');

  console.log('App Request ID:', appRequestId);
  console.log('Execution ID:', executionId);

  try {
    console.log('\nStarting verification...');
    const result = await verificationService.startVerification(
      appRequestId,
      executionId
    );

    console.log('\nVerification completed!');
    console.log('Status:', result.status);
    if (result.errors && result.errors.length > 0) {
      console.log('Errors:', result.errors.slice(0, 10));
      if (result.errors.length > 10) {
        console.log(`... and ${result.errors.length - 10} more errors`);
      }
    }
  } catch (error) {
    console.error('Error running verification:', error);
  }

  console.log('\n========================================\n');
}

fixStuckVerification().catch(console.error);
