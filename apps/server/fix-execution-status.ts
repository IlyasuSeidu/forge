import 'dotenv/config';
import { prisma } from './src/lib/prisma.js';

/**
 * Fix execution status for self-healed verifications
 * This updates executions that have verification_passed_after_repair events
 * to mark them as "completed" instead of "failed"
 */
async function fixExecutionStatus() {
  console.log('Finding executions with successful self-healing...\n');

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
          projectId: true
        }
      }
    }
  });

  console.log(`Found ${selfHealedEvents.length} self-healed execution(s)`);

  for (const event of selfHealedEvents) {
    const execution = event.execution;

    console.log(`\nExecution ${execution.id.slice(0, 8)}:`);
    console.log(`  Current status: ${execution.status}`);
    console.log(`  Project: ${execution.projectId.slice(0, 8)}`);

    if (execution.status !== 'completed') {
      // Update execution status to completed
      await prisma.execution.update({
        where: { id: execution.id },
        data: {
          status: 'completed',
          finishedAt: new Date()
        }
      });

      // Update associated appRequest if it exists
      const appRequest = await prisma.appRequest.findFirst({
        where: { executionId: execution.id }
      });

      if (appRequest && appRequest.status !== 'completed') {
        await prisma.appRequest.update({
          where: { id: appRequest.id },
          data: {
            status: 'completed'
          }
        });
        console.log(`  ✓ Updated AppRequest to "completed"`);
      }

      console.log(`  ✓ Updated Execution to "completed"`);
    } else {
      console.log(`  ⊙ Already marked as completed`);
    }
  }

  console.log('\n✅ Done! All self-healed executions have been updated.');
}

fixExecutionStatus()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
