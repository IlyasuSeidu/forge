import { StaticVerifier } from './src/services/static-verifier.js';
import { PrismaClient } from '@prisma/client';
import pino from 'pino';
import crypto from 'crypto';

const logger = pino();
const verifier = new StaticVerifier(logger);
const prisma = new PrismaClient({
  datasources: {
    db: {
      url: 'file:/private/tmp/ralph/forge/prisma/forge.db'
    }
  }
});

async function manualVerify() {
  const appRequestId = '5d9571f5-dc21-4173-954b-754bb45a22d9';
  const executionId = '78bf5f75-a864-4f11-8865-621516a8636f';
  const projectId = '4c72569e-d73e-4322-8273-aad1a50fcbf5';
  const workspacePath = `/tmp/forge-workspaces/${projectId}`;

  console.log('\n========================================');
  console.log('MANUAL VERIFICATION');
  console.log('========================================\n');

  console.log('Running static verification on:', workspacePath);

  const result = await verifier.verify(workspacePath);

  console.log('\nVerification result:');
  console.log('Passed:', result.passed);
  console.log('Errors:', result.errors.length);

  if (result.errors.length > 0) {
    console.log('\nFirst 10 errors:');
    result.errors.slice(0, 10).forEach((err, i) => console.log(`${i + 1}. ${err}`));
    if (result.errors.length > 10) {
      console.log(`... and ${result.errors.length - 10} more`);
    }
  }

  // Create verification record
  console.log('\nCreating verification record...');
  const verification = await prisma.verification.create({
    data: {
      id: crypto.randomUUID(),
      appRequestId,
      executionId,
      status: result.passed ? 'passed' : 'failed',
      errors: result.errors.length > 0 ? JSON.stringify(result.errors) : null,
      attempt: 1,
    }
  });

  console.log('Verification record created:', verification.id);

  // Update app request status
  const newStatus = result.passed ? 'completed' : 'verification_failed';
  console.log('\nUpdating app request status to:', newStatus);

  await prisma.appRequest.update({
    where: { id: appRequestId },
    data: {
      status: newStatus,
      errorReason: result.passed ? null : `Verification failed: ${result.errors.length} error(s) found`
    }
  });

  console.log('App request updated!');

  // Create execution event
  await prisma.executionEvent.create({
    data: {
      id: crypto.randomUUID(),
      executionId,
      type: result.passed ? 'verification_passed' : 'verification_failed',
      message: result.passed
        ? 'Verification completed successfully - all checks passed'
        : `Verification failed with ${result.errors.length} error(s)`
    }
  });

  console.log('\n========================================\n');

  await prisma.$disconnect();
}

manualVerify().catch(console.error);
