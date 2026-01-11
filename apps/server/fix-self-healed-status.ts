import 'dotenv/config';
import { prisma } from './src/lib/prisma.js';

/**
 * Fix status for self-healed app requests
 * Updates AppRequests and Executions that have verification_passed_after_repair events
 * but still show as failed or verification_failed
 */
async function fixSelfHealedStatus() {
  console.log('Finding self-healed executions with incorrect status...\n');

  // Find all executions with verification_passed_after_repair event
  const selfHealedEvents = await prisma.executionEvent.findMany({
    where: {
      type: 'verification_passed_after_repair'
    },
    select: {
      executionId: true,
      execution: {
        select: {
          id: true,
          status: true,
          projectId: true,
          appRequestId: true
        }
      }
    }
  });

  console.log(`Found ${selfHealedEvents.length} self-healed execution(s)\n`);

  let updatedCount = 0;

  for (const event of selfHealedEvents) {
    const execution = event.execution;

    console.log(`Execution ${execution.id.slice(0, 8)}:`);
    console.log(`  Current status: ${execution.status}`);

    // Update execution if not completed
    if (execution.status !== 'completed') {
      await prisma.execution.update({
        where: { id: execution.id },
        data: {
          status: 'completed',
          finishedAt: new Date()
        }
      });
      console.log(`  ✓ Updated Execution to "completed"`);
      updatedCount++;
    }

    // Update associated appRequest if it exists
    if (execution.appRequestId) {
      const appRequest = await prisma.appRequest.findUnique({
        where: { id: execution.appRequestId }
      });

      if (appRequest) {
        console.log(`  AppRequest status: ${appRequest.status}`);

        if (appRequest.status !== 'completed') {
          await prisma.appRequest.update({
            where: { id: appRequest.id },
            data: {
              status: 'completed',
              errorReason: null
            }
          });
          console.log(`  ✓ Updated AppRequest to "completed"`);
          updatedCount++;
        }
      }
    }

    // Update associated verification
    const verification = await prisma.verification.findFirst({
      where: { executionId: execution.id },
      orderBy: { createdAt: 'desc' }
    });

    if (verification && verification.status !== 'passed') {
      await prisma.verification.update({
        where: { id: verification.id },
        data: {
          status: 'passed',
          errors: null
        }
      });
      console.log(`  ✓ Updated Verification to "passed"`);
      updatedCount++;
    }

    console.log();
  }

  if (updatedCount > 0) {
    console.log(`✅ Done! Updated ${updatedCount} record(s).`);
  } else {
    console.log('✅ All self-healed executions already have correct status.');
  }
}

fixSelfHealedStatus()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
