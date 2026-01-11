import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function checkVerification() {
  const appRequestId = '5d9571f5-dc21-4173-954b-754bb45a22d9';

  console.log('\n========================================');
  console.log('CHECKING VERIFICATION STATUS');
  console.log('========================================\n');

  // Get app request
  const appRequest = await prisma.appRequest.findUnique({
    where: { id: appRequestId }
  });

  console.log('App Request:', {
    id: appRequest?.id,
    status: appRequest?.status,
    executionId: appRequest?.executionId,
    errorReason: appRequest?.errorReason,
    updatedAt: appRequest?.updatedAt
  });

  // Get execution
  const execution = await prisma.execution.findUnique({
    where: { id: appRequest?.executionId || '' }
  });

  console.log('\nExecution:', {
    id: execution?.id,
    status: execution?.status,
    startedAt: execution?.startedAt,
    finishedAt: execution?.finishedAt
  });

  // Get verifications
  const verifications = await prisma.verification.findMany({
    where: { appRequestId },
    orderBy: { createdAt: 'desc' }
  });

  console.log('\nVerifications found:', verifications.length);
  verifications.forEach((v, i) => {
    console.log(`\nVerification ${i + 1}:`, {
      id: v.id,
      status: v.status,
      attempt: v.attempt,
      errorCount: v.errors ? JSON.parse(v.errors).length : 0,
      createdAt: v.createdAt
    });

    if (v.errors) {
      const errors = JSON.parse(v.errors);
      console.log('Errors:', errors.slice(0, 5));
      if (errors.length > 5) {
        console.log(`... and ${errors.length - 5} more errors`);
      }
    }
  });

  // Get execution events
  const events = await prisma.executionEvent.findMany({
    where: { executionId: appRequest?.executionId || '' },
    orderBy: { createdAt: 'desc' },
    take: 10
  });

  console.log('\n\nRecent Execution Events:');
  events.forEach((e, i) => {
    console.log(`${i + 1}. [${e.type}] ${e.message} (${e.createdAt})`);
  });

  console.log('\n========================================\n');

  await prisma.$disconnect();
}

checkVerification().catch(console.error);
