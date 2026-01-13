/**
 * Execution Planner Hardened - Comprehensive Test Suite
 *
 * Tests all 10 constitutional requirements from Prompt #9.7
 */

import { PrismaClient } from '@prisma/client';
import { ForgeConductor } from './src/conductor/forge-conductor.js';
import { ExecutionPlannerHardened } from './src/agents/execution-planner-hardened.js';
import pino from 'pino';
import { randomUUID } from 'crypto';

const prisma = new PrismaClient();
const logger = pino({ level: 'silent' }); // Silent for tests
const conductor = new ForgeConductor(prisma, logger);

/**
 * Setup: Create a complete test context with hash-locked BuildPrompt
 */
async function setupTestContext(): Promise<{ appRequestId: string; buildPromptId: string }> {
  const appRequestId = randomUUID();
  const projectId = randomUUID();
  const executionId = randomUUID();
  const buildPromptId = randomUUID();

  // Create Project
  await prisma.project.create({
    data: {
      id: projectId,
      name: 'Test Project',
      description: 'Test',
    },
  });

  // Create Execution
  await prisma.execution.create({
    data: {
      id: executionId,
      projectId,
      status: 'running',
    },
  });

  // Create AppRequest
  await prisma.appRequest.create({
    data: {
      id: appRequestId,
      projectId,
      prompt: 'Test app',
      status: 'active',
      executionId,
    },
  });

  // Create approved ProjectRuleSet (hash-locked)
  await prisma.projectRuleSet.create({
    data: {
      id: randomUUID(),
      appRequestId,
      content: 'Tech stack: Express + TypeScript\nDatabase: SQLite',
      status: 'approved',
      rulesHash: 'rules123hash',
      approvedAt: new Date(),
    },
  });

  // Create approved BuildPrompt (hash-locked)
  const buildPromptContract = {
    promptId: buildPromptId,
    sequenceNumber: 0,
    title: 'Project Scaffolding',
    intent: 'Initialize project structure',
    scope: {
      filesToCreate: ['src/index.ts', 'package.json', 'tsconfig.json'],
      filesToModify: [],
      filesForbidden: ['prisma/schema.prisma', 'src/agents/**/*'],
    },
    dependencies: {
      add: ['express@^4.18.2', 'typescript@^5.0.0'],
      forbidden: [],
    },
    constraints: {
      mustFollowRulesHash: 'rules123hash',
      mustMatchScreens: [],
      mustMatchJourneys: [],
      mustMatchVisuals: [],
    },
    verificationCriteria: ['All files must compile'],
    contractHash: 'buildprompt123hash',
  };

  await prisma.buildPrompt.create({
    data: {
      id: buildPromptId,
      appRequestId,
      title: 'Project Scaffolding',
      content: '# Test prompt',
      sequenceIndex: 0,
      status: 'approved',
      contractHash: 'buildprompt123hash',
      contractJson: JSON.stringify(buildPromptContract),
      allowedCreateFiles: JSON.stringify(['src/index.ts', 'package.json', 'tsconfig.json']),
      allowedModifyFiles: JSON.stringify([]),
      forbiddenFiles: JSON.stringify(['prisma/schema.prisma', 'src/agents/**/*']),
      fullRewriteFiles: JSON.stringify([]),
      dependencyManifest: JSON.stringify({
        newDependencies: { express: '^4.18.2', typescript: '^5.0.0' },
      }),
      modificationIntent: JSON.stringify({}),
      approvedAt: new Date(),
      approvedBy: 'test-human',
    },
  });

  // Create ConductorState (build_prompts_ready)
  await prisma.conductorState.create({
    data: {
      id: randomUUID(),
      appRequestId,
      currentStatus: 'build_prompts_ready',
      locked: false,
      awaitingHuman: false,
    },
  });

  return { appRequestId, buildPromptId };
}

/**
 * Cleanup test data
 */
async function cleanup(appRequestId: string) {
  const appRequest = await prisma.appRequest.findUnique({ where: { id: appRequestId } });
  if (!appRequest) return;

  await prisma.executionPlan.deleteMany({ where: { appRequestId } });
  await prisma.buildPrompt.deleteMany({ where: { appRequestId } });
  await prisma.projectRuleSet.deleteMany({ where: { appRequestId } });
  await prisma.conductorState.deleteMany({ where: { appRequestId } });

  if (appRequest.executionId) {
    await prisma.executionEvent.deleteMany({ where: { executionId: appRequest.executionId } });
    await prisma.execution.deleteMany({ where: { id: appRequest.executionId } });
  }

  await prisma.appRequest.deleteMany({ where: { id: appRequestId } });
  await prisma.project.deleteMany({ where: { id: appRequest.projectId } });
}

/**
 * TEST 1: Cannot start without approved BuildPrompt
 */
async function test1_cannotStartWithoutApprovedBuildPrompt() {
  console.log('\n🧪 TEST 1: Cannot start without approved BuildPrompt');

  const { appRequestId, buildPromptId } = await setupTestContext();

  try {
    // Change BuildPrompt status to pending
    await prisma.buildPrompt.update({
      where: { id: buildPromptId },
      data: { status: 'awaiting_approval' },
    });

    const planner = new ExecutionPlannerHardened(prisma, conductor, logger);
    await planner.start(buildPromptId);

    console.log('❌ FAILED: Should have thrown error for unapproved BuildPrompt');
    await cleanup(appRequestId);
    return false;
  } catch (error: any) {
    if (error.message.includes('CONTEXT ISOLATION VIOLATION')) {
      console.log('✅ PASSED: Correctly rejected unapproved BuildPrompt');
      await cleanup(appRequestId);
      return true;
    } else {
      console.log(`❌ FAILED: Wrong error: ${error.message}`);
      await cleanup(appRequestId);
      return false;
    }
  }
}

/**
 * TEST 2: Cannot reference non-hash-approved artifacts
 */
async function test2_cannotReferenceNonHashApproved() {
  console.log('\n🧪 TEST 2: Cannot reference non-hash-approved artifacts');

  const { appRequestId, buildPromptId } = await setupTestContext();

  try {
    // Remove contractHash from BuildPrompt
    await prisma.buildPrompt.update({
      where: { id: buildPromptId },
      data: { contractHash: null },
    });

    const planner = new ExecutionPlannerHardened(prisma, conductor, logger);
    await planner.start(buildPromptId);

    console.log('❌ FAILED: Should have rejected BuildPrompt without hash');
    await cleanup(appRequestId);
    return false;
  } catch (error: any) {
    if (error.message.includes('CONTEXT ISOLATION VIOLATION')) {
      console.log('✅ PASSED: Correctly rejected non-hash-locked BuildPrompt');
      await cleanup(appRequestId);
      return true;
    } else {
      console.log(`❌ FAILED: Wrong error: ${error.message}`);
      await cleanup(appRequestId);
      return false;
    }
  }
}

/**
 * TEST 3: Deterministic task generation
 */
async function test3_deterministicTaskGeneration() {
  console.log('\n🧪 TEST 3: Deterministic task generation');

  const { appRequestId, buildPromptId } = await setupTestContext();
  const planner = new ExecutionPlannerHardened(prisma, conductor, logger);

  try {
    // Generate first plan
    const planId1 = await planner.start(buildPromptId);
    const plan1 = await prisma.executionPlan.findUnique({ where: { id: planId1 } });

    if (!plan1 || !plan1.contractHash) {
      console.log('❌ FAILED: First plan missing contractHash');
      await cleanup(appRequestId);
      return false;
    }

    // Delete and regenerate
    await prisma.executionPlan.delete({ where: { id: planId1 } });
    await prisma.conductorState.update({
      where: { appRequestId },
      data: { currentStatus: 'build_prompts_ready', locked: false },
    });

    const planId2 = await planner.start(buildPromptId);
    const plan2 = await prisma.executionPlan.findUnique({ where: { id: planId2 } });

    if (!plan2 || !plan2.contractHash) {
      console.log('❌ FAILED: Second plan missing contractHash');
      await cleanup(appRequestId);
      return false;
    }

    // Hashes should be identical (deterministic)
    if (plan1.contractHash === plan2.contractHash) {
      console.log('✅ PASSED: Deterministic generation (same hash)');
      console.log(`   Hash: ${plan1.contractHash}`);
      await cleanup(appRequestId);
      return true;
    } else {
      console.log('❌ FAILED: Non-deterministic generation');
      console.log(`   Hash 1: ${plan1.contractHash}`);
      console.log(`   Hash 2: ${plan2.contractHash}`);
      await cleanup(appRequestId);
      return false;
    }
  } catch (error: any) {
    console.log(`❌ FAILED: ${error.message}`);
    await cleanup(appRequestId);
    return false;
  }
}

/**
 * TEST 4: Task reordering prevented
 */
async function test4_taskReorderingPrevented() {
  console.log('\n🧪 TEST 4: Task reordering prevented');

  const { appRequestId, buildPromptId } = await setupTestContext();
  const planner = new ExecutionPlannerHardened(prisma, conductor, logger);

  try {
    const planId = await planner.start(buildPromptId);
    const plan = await prisma.executionPlan.findUnique({ where: { id: planId } });

    if (!plan || !plan.contractJson) {
      console.log('❌ FAILED: Plan or contract not found');
      await cleanup(appRequestId);
      return false;
    }

    const contract = JSON.parse(plan.contractJson);

    // Check task order: dependencies first, then creates (alphabetical), then modifies
    const tasks = contract.tasks;

    // First task should be dependency
    if (tasks[0].type !== 'ADD_DEPENDENCY') {
      console.log('❌ FAILED: First task is not ADD_DEPENDENCY');
      await cleanup(appRequestId);
      return false;
    }

    // Remaining tasks should be creates in alphabetical order
    const createTasks = tasks.slice(1);
    for (let i = 0; i < createTasks.length - 1; i++) {
      if (createTasks[i].target > createTasks[i + 1].target) {
        console.log('❌ FAILED: Create tasks are not in alphabetical order');
        await cleanup(appRequestId);
        return false;
      }
    }

    // Task IDs should be sequential
    const expectedIds = tasks.map((_, i) => `task-${i}`);
    const actualIds = tasks.map((t: any) => t.taskId);

    if (JSON.stringify(expectedIds) === JSON.stringify(actualIds)) {
      console.log('✅ PASSED: Tasks in deterministic order');
      console.log(`   Order: Dependencies → Creates (alphabetical)`);
      await cleanup(appRequestId);
      return true;
    } else {
      console.log('❌ FAILED: Task IDs are not sequential');
      await cleanup(appRequestId);
      return false;
    }
  } catch (error: any) {
    console.log(`❌ FAILED: ${error.message}`);
    await cleanup(appRequestId);
    return false;
  }
}

/**
 * TEST 5: Task merging prevented
 */
async function test5_taskMergingPrevented() {
  console.log('\n🧪 TEST 5: Task merging prevented');

  const { appRequestId, buildPromptId } = await setupTestContext();
  const planner = new ExecutionPlannerHardened(prisma, conductor, logger);

  try {
    const planId = await planner.start(buildPromptId);
    const plan = await prisma.executionPlan.findUnique({ where: { id: planId } });

    if (!plan || !plan.contractJson) {
      console.log('❌ FAILED: Plan or contract not found');
      await cleanup(appRequestId);
      return false;
    }

    const contract = JSON.parse(plan.contractJson);

    // Each file should get its own task (no merging)
    // BuildPrompt has 3 creates + 1 dependency = 4 tasks total
    const expectedTaskCount = 4; // 1 dependency + 3 creates

    if (contract.tasks.length === expectedTaskCount) {
      console.log('✅ PASSED: No task merging (each operation is separate)');
      console.log(`   Tasks: ${contract.tasks.length}`);
      await cleanup(appRequestId);
      return true;
    } else {
      console.log('❌ FAILED: Unexpected task count (possible merging)');
      console.log(`   Expected: ${expectedTaskCount}, Got: ${contract.tasks.length}`);
      await cleanup(appRequestId);
      return false;
    }
  } catch (error: any) {
    console.log(`❌ FAILED: ${error.message}`);
    await cleanup(appRequestId);
    return false;
  }
}

/**
 * TEST 6: Parallel execution disallowed
 */
async function test6_parallelExecutionDisallowed() {
  console.log('\n🧪 TEST 6: Parallel execution disallowed');

  const { appRequestId, buildPromptId } = await setupTestContext();
  const planner = new ExecutionPlannerHardened(prisma, conductor, logger);

  try {
    const planId = await planner.start(buildPromptId);
    const plan = await prisma.executionPlan.findUnique({ where: { id: planId } });

    if (!plan || !plan.contractJson) {
      console.log('❌ FAILED: Plan or contract not found');
      await cleanup(appRequestId);
      return false;
    }

    const contract = JSON.parse(plan.contractJson);

    // Check constraints
    if (
      contract.constraints.noParallelExecution === true &&
      contract.constraints.mustFollowSequence === true &&
      contract.constraints.mustRespectFileOwnership === true
    ) {
      console.log('✅ PASSED: Parallel execution disallowed');
      console.log(`   Constraints: ${JSON.stringify(contract.constraints)}`);
      await cleanup(appRequestId);
      return true;
    } else {
      console.log('❌ FAILED: Constraints not properly set');
      await cleanup(appRequestId);
      return false;
    }
  } catch (error: any) {
    console.log(`❌ FAILED: ${error.message}`);
    await cleanup(appRequestId);
    return false;
  }
}

/**
 * TEST 7: File ownership respected
 */
async function test7_fileOwnershipRespected() {
  console.log('\n🧪 TEST 7: File ownership respected');

  const { appRequestId, buildPromptId } = await setupTestContext();
  const planner = new ExecutionPlannerHardened(prisma, conductor, logger);

  try {
    const planId = await planner.start(buildPromptId);
    const plan = await prisma.executionPlan.findUnique({ where: { id: planId } });

    if (!plan || !plan.contractJson) {
      console.log('❌ FAILED: Plan or contract not found');
      await cleanup(appRequestId);
      return false;
    }

    const contract = JSON.parse(plan.contractJson);
    const buildPrompt = await prisma.buildPrompt.findUnique({ where: { id: buildPromptId } });
    const buildPromptContract = JSON.parse(buildPrompt!.contractJson!);

    // All task targets should be within BuildPrompt scope
    const allowedFiles = new Set([
      ...buildPromptContract.scope.filesToCreate,
      ...buildPromptContract.scope.filesToModify,
      'package.json', // dependency task
    ]);

    const allTasksValid = contract.tasks.every((task: any) => allowedFiles.has(task.target));

    if (allTasksValid) {
      console.log('✅ PASSED: All tasks respect file ownership');
      await cleanup(appRequestId);
      return true;
    } else {
      console.log('❌ FAILED: Some tasks reference files outside scope');
      await cleanup(appRequestId);
      return false;
    }
  } catch (error: any) {
    console.log(`❌ FAILED: ${error.message}`);
    await cleanup(appRequestId);
    return false;
  }
}

/**
 * TEST 8: Dependency duplication blocked
 */
async function test8_dependencyDuplicationBlocked() {
  console.log('\n🧪 TEST 8: Dependency duplication blocked');

  const { appRequestId, buildPromptId } = await setupTestContext();
  const planner = new ExecutionPlannerHardened(prisma, conductor, logger);

  try {
    const planId = await planner.start(buildPromptId);
    const plan = await prisma.executionPlan.findUnique({ where: { id: planId } });

    if (!plan || !plan.contractJson) {
      console.log('❌ FAILED: Plan or contract not found');
      await cleanup(appRequestId);
      return false;
    }

    const contract = JSON.parse(plan.contractJson);

    // Check that dependency task only appears once
    const dependencyTasks = contract.tasks.filter((t: any) => t.type === 'ADD_DEPENDENCY');

    if (dependencyTasks.length === 1) {
      console.log('✅ PASSED: Dependencies not duplicated');
      console.log(`   Dependency tasks: ${dependencyTasks.length}`);
      await cleanup(appRequestId);
      return true;
    } else {
      console.log('❌ FAILED: Multiple dependency tasks found');
      await cleanup(appRequestId);
      return false;
    }
  } catch (error: any) {
    console.log(`❌ FAILED: ${error.message}`);
    await cleanup(appRequestId);
    return false;
  }
}

/**
 * TEST 9: Hash immutability after approval
 */
async function test9_hashImmutabilityAfterApproval() {
  console.log('\n🧪 TEST 9: Hash immutability after approval');

  const { appRequestId, buildPromptId } = await setupTestContext();
  const planner = new ExecutionPlannerHardened(prisma, conductor, logger);

  try {
    // Generate plan
    const planId = await planner.start(buildPromptId);
    const beforeApproval = await prisma.executionPlan.findUnique({ where: { id: planId } });

    if (!beforeApproval || !beforeApproval.contractHash) {
      console.log('❌ FAILED: Plan or hash missing before approval');
      await cleanup(appRequestId);
      return false;
    }

    const hashBefore = beforeApproval.contractHash;

    // Approve
    await planner.approve(planId, 'test-human');

    const afterApproval = await prisma.executionPlan.findUnique({ where: { id: planId } });

    if (!afterApproval || !afterApproval.contractHash) {
      console.log('❌ FAILED: Plan or hash missing after approval');
      await cleanup(appRequestId);
      return false;
    }

    const hashAfter = afterApproval.contractHash;

    // Hash should be identical (immutable)
    if (hashBefore === hashAfter && afterApproval.status === 'approved') {
      console.log('✅ PASSED: Hash immutable after approval');
      console.log(`   Hash: ${hashAfter}`);
      console.log(`   Status: ${afterApproval.status}`);
      await cleanup(appRequestId);
      return true;
    } else {
      console.log('❌ FAILED: Hash changed or status incorrect');
      await cleanup(appRequestId);
      return false;
    }
  } catch (error: any) {
    console.log(`❌ FAILED: ${error.message}`);
    await cleanup(appRequestId);
    return false;
  }
}

/**
 * TEST 10: Full audit trail emission
 */
async function test10_fullAuditTrailEmission() {
  console.log('\n🧪 TEST 10: Full audit trail emission');

  const { appRequestId, buildPromptId } = await setupTestContext();
  const planner = new ExecutionPlannerHardened(prisma, conductor, logger);

  try {
    // Get execution ID
    const appRequest = await prisma.appRequest.findUnique({ where: { id: appRequestId } });
    if (!appRequest?.executionId) {
      console.log('❌ FAILED: No execution ID found');
      await cleanup(appRequestId);
      return false;
    }

    const executionId = appRequest.executionId;

    // Count events before
    const eventsBefore = await prisma.executionEvent.count({
      where: { executionId },
    });

    // Generate plan (should emit events)
    const planId = await planner.start(buildPromptId);

    // Count events after
    const eventsAfter = await prisma.executionEvent.count({
      where: { executionId },
    });

    // Approve (should emit more events)
    await planner.approve(planId, 'test-human');

    const eventsAfterApproval = await prisma.executionEvent.count({
      where: { executionId },
    });

    // Check that events were emitted
    const eventsFromGeneration = eventsAfter - eventsBefore;
    const eventsFromApproval = eventsAfterApproval - eventsAfter;

    if (eventsFromGeneration >= 1 && eventsFromApproval >= 1) {
      console.log('✅ PASSED: Full audit trail emission');
      console.log(`   Events from generation: ${eventsFromGeneration}`);
      console.log(`   Events from approval: ${eventsFromApproval}`);
      console.log(`   Total events: ${eventsAfterApproval}`);
      await cleanup(appRequestId);
      return true;
    } else {
      console.log('❌ FAILED: Insufficient event emission');
      console.log(`   Events from generation: ${eventsFromGeneration}`);
      console.log(`   Events from approval: ${eventsFromApproval}`);
      await cleanup(appRequestId);
      return false;
    }
  } catch (error: any) {
    console.log(`❌ FAILED: ${error.message}`);
    await cleanup(appRequestId);
    return false;
  }
}

/**
 * Run all tests
 */
async function runAllTests() {
  console.log('\n' + '='.repeat(80));
  console.log('EXECUTION PLANNER HARDENED - COMPREHENSIVE TEST SUITE');
  console.log('Testing all 10 constitutional requirements');
  console.log('='.repeat(80));

  const results = {
    test1: await test1_cannotStartWithoutApprovedBuildPrompt(),
    test2: await test2_cannotReferenceNonHashApproved(),
    test3: await test3_deterministicTaskGeneration(),
    test4: await test4_taskReorderingPrevented(),
    test5: await test5_taskMergingPrevented(),
    test6: await test6_parallelExecutionDisallowed(),
    test7: await test7_fileOwnershipRespected(),
    test8: await test8_dependencyDuplicationBlocked(),
    test9: await test9_hashImmutabilityAfterApproval(),
    test10: await test10_fullAuditTrailEmission(),
  };

  console.log('\n' + '='.repeat(80));
  console.log('TEST RESULTS SUMMARY');
  console.log('='.repeat(80));

  const passed = Object.values(results).filter((r) => r === true).length;
  const total = Object.values(results).length;

  Object.entries(results).forEach(([test, result], index) => {
    const status = result ? '✅ PASS' : '❌ FAIL';
    console.log(`${status} - Test ${index + 1}: ${test}`);
  });

  console.log('\n' + '-'.repeat(80));
  console.log(`FINAL SCORE: ${passed}/${total} tests passed`);
  console.log('='.repeat(80));

  if (passed === total) {
    console.log('\n🎉 ALL TESTS PASSED! Constitutional requirements validated.');
  } else {
    console.log(`\n⚠️  ${total - passed} test(s) failed. Review output above.`);
  }

  await prisma.$disconnect();
  process.exit(passed === total ? 0 : 1);
}

// Run tests
runAllTests().catch((error) => {
  console.error('Fatal error:', error);
  prisma.$disconnect();
  process.exit(1);
});
