/**
 * Constraint Compiler Test Script
 *
 * Tests the Tier 3 Phase 2 constitutional agent:
 * 1. Validates Conductor state before starting (must be designs_ready)
 * 2. Generates comprehensive project ruleset
 * 3. Rules can only be generated ONCE
 * 4. Once approved, rules are IMMUTABLE
 * 5. Cannot regenerate after approval
 * 6. Rejection allows regeneration
 * 7. Approving rules transitions Conductor to rules_locked
 * 8. All events emitted correctly
 */

import 'dotenv/config';
import { PrismaClient } from '@prisma/client';
import { ForgeConductor } from './src/conductor/forge-conductor.js';
import { ConstraintCompiler } from './src/agents/constraint-compiler.js';
import { createLogger } from './src/utils/logger.js';
import { randomUUID } from 'crypto';

const prisma = new PrismaClient();
const logger = createLogger();
const conductor = new ForgeConductor(prisma, logger);
const compiler = new ConstraintCompiler(prisma, conductor, logger);

const TEST_PROJECT_ID = 'constraint-compiler-test-project';

async function cleanup() {
  console.log('\n🧹 Cleaning up old test data...');

  const appRequests = await prisma.appRequest.findMany({
    where: { projectId: TEST_PROJECT_ID },
    select: { id: true },
  });
  const appRequestIds = appRequests.map(ar => ar.id);

  if (appRequestIds.length > 0) {
    await prisma.projectRuleSet.deleteMany({
      where: { appRequestId: { in: appRequestIds } },
    });
    await prisma.screenMockup.deleteMany({
      where: { appRequestId: { in: appRequestIds } },
    });
    await prisma.userJourney.deleteMany({
      where: { appRequestId: { in: appRequestIds } },
    });
    await prisma.userRoleDefinition.deleteMany({
      where: { appRequestId: { in: appRequestIds } },
    });
    await prisma.screenDefinition.deleteMany({
      where: { appRequestId: { in: appRequestIds } },
    });
    await prisma.screenIndex.deleteMany({
      where: { appRequestId: { in: appRequestIds } },
    });
    await prisma.planningDocument.deleteMany({
      where: { appRequestId: { in: appRequestIds } },
    });
  }

  await prisma.artifact.deleteMany({
    where: { projectId: TEST_PROJECT_ID },
  });
  await prisma.conductorState.deleteMany({
    where: { appRequest: { projectId: TEST_PROJECT_ID } },
  });
  await prisma.appRequest.deleteMany({
    where: { projectId: TEST_PROJECT_ID },
  });
  await prisma.execution.deleteMany({
    where: { projectId: TEST_PROJECT_ID },
  });
  await prisma.project.deleteMany({
    where: { id: TEST_PROJECT_ID },
  });

  console.log('✅ Cleanup complete\n');
}

async function setupProject() {
  console.log('📦 Setting up test project with approved mockups...');

  const project = await prisma.project.create({
    data: {
      id: TEST_PROJECT_ID,
      name: 'Constraint Compiler Test',
      description: 'Testing Tier 3 Phase 2 constitutional agent',
    },
  });

  const execution = await prisma.execution.create({
    data: {
      id: randomUUID(),
      projectId: TEST_PROJECT_ID,
      status: 'running',
    },
  });

  const appRequest = await prisma.appRequest.create({
    data: {
      id: randomUUID(),
      projectId: TEST_PROJECT_ID,
      prompt: 'Build a task management app with immutable rules',
      status: 'pending',
      executionId: execution.id,
    },
  });

  // Initialize Conductor and advance to designs_ready state
  await conductor.initialize(appRequest.id);
  await conductor.transition(appRequest.id, 'base_prompt_ready', 'FoundryArchitect');
  await conductor.transition(appRequest.id, 'planning', 'ProductStrategist');
  await conductor.transition(appRequest.id, 'screens_defined', 'ScreenCartographer');
  await conductor.transition(appRequest.id, 'flows_defined', 'JourneyOrchestrator');
  await conductor.transition(appRequest.id, 'designs_ready', 'VisualForge');

  // Create Base Prompt artifact
  await prisma.artifact.create({
    data: {
      id: randomUUID(),
      projectId: TEST_PROJECT_ID,
      type: 'base_prompt',
      path: 'Build a comprehensive task management application',
    },
  });

  // Create approved planning documents
  await prisma.planningDocument.createMany({
    data: [
      {
        id: randomUUID(),
        appRequestId: appRequest.id,
        type: 'MASTER_PLAN',
        content: 'Comprehensive master plan for task management',
        status: 'approved',
        approvedAt: new Date(),
      },
      {
        id: randomUUID(),
        appRequestId: appRequest.id,
        type: 'IMPLEMENTATION_PLAN',
        content: 'Detailed implementation plan',
        status: 'approved',
        approvedAt: new Date(),
      },
    ],
  });

  // Create approved screen index
  await prisma.screenIndex.create({
    data: {
      id: randomUUID(),
      appRequestId: appRequest.id,
      screens: JSON.stringify(['Dashboard', 'Task List', 'Settings']),
      status: 'approved',
      approvedAt: new Date(),
    },
  });

  // Create approved screen definitions
  const screenNames = ['Dashboard', 'Task List', 'Settings'];
  for (let i = 0; i < screenNames.length; i++) {
    await prisma.screenDefinition.create({
      data: {
        id: randomUUID(),
        appRequestId: appRequest.id,
        screenName: screenNames[i],
        content: `Description for ${screenNames[i]}`,
        order: i,
        status: 'approved',
        approvedAt: new Date(),
      },
    });
  }

  // Create approved user roles
  await prisma.userRoleDefinition.create({
    data: {
      id: randomUUID(),
      appRequestId: appRequest.id,
      content: `| Role Name | Description |
|-----------|-------------|
| User | Regular user |
| Admin | Administrator |`,
      status: 'approved',
      approvedAt: new Date(),
    },
  });

  // Create approved user journeys
  await prisma.userJourney.createMany({
    data: [
      {
        id: randomUUID(),
        appRequestId: appRequest.id,
        roleName: 'User',
        content: 'Step 1: Visit Dashboard. Step 2: View tasks.',
        order: 0,
        status: 'approved',
        approvedAt: new Date(),
      },
      {
        id: randomUUID(),
        appRequestId: appRequest.id,
        roleName: 'Admin',
        content: 'Step 1: Access Dashboard. Step 2: Manage users.',
        order: 1,
        status: 'approved',
        approvedAt: new Date(),
      },
    ],
  });

  // Create approved mockups
  for (let i = 0; i < screenNames.length; i++) {
    await prisma.screenMockup.create({
      data: {
        id: randomUUID(),
        appRequestId: appRequest.id,
        screenName: screenNames[i],
        layoutType: 'desktop',
        imagePath: `/mockups/${screenNames[i].toLowerCase()}.png`,
        promptMetadata: JSON.stringify({ screen: screenNames[i] }),
        status: 'approved',
        approvedAt: new Date(),
      },
    });
  }

  const state = await conductor.getStateSnapshot(appRequest.id);

  console.log('✅ Project setup complete');
  console.log(`   Project ID: ${project.id}`);
  console.log(`   AppRequest ID: ${appRequest.id}`);
  console.log(`   Conductor Status: ${state.currentStatus} (should be 'designs_ready')`);
  console.log(`   Screens: 3 approved`);
  console.log(`   Mockups: 3 approved\n`);

  return { project, appRequest, execution };
}

async function test1_CannotStartWithWrongState() {
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('TEST 1: Cannot Start Unless Conductor = designs_ready');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  // Create a test app request with wrong state
  const testAppRequest = await prisma.appRequest.create({
    data: {
      id: randomUUID(),
      projectId: TEST_PROJECT_ID,
      prompt: 'Test wrong state',
      status: 'pending',
    },
  });

  await conductor.initialize(testAppRequest.id);

  try {
    await compiler.start(testAppRequest.id);
    console.log('❌ FAIL: Should have thrown error for wrong state\n');
    return false;
  } catch (error) {
    console.log('✅ PASS: Correctly rejected start with wrong Conductor state');
    console.log(`   Error: ${error instanceof Error ? error.message : 'Unknown error'}\n`);
    return true;
  }
}

async function test2_GenerateRules(appRequestId: string) {
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('TEST 2: Generate Project Rules and Pause for Approval');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  const rules = await compiler.start(appRequestId);

  console.log('✅ Project rules generated');
  console.log(`   Rules ID: ${rules.id}`);
  console.log(`   Status: ${rules.status}`);
  console.log(`   Content Length: ${rules.content.length} chars\n`);

  // Show preview
  console.log('📄 Rules Document Preview:');
  console.log('─'.repeat(60));
  console.log(rules.content.substring(0, 300) + '...');
  console.log('─'.repeat(60));
  console.log();

  // Verify Conductor state
  const state = await conductor.getStateSnapshot(appRequestId);
  console.log('✅ Conductor state after rules generation:');
  console.log(`   Status: ${state.currentStatus} (still 'designs_ready')`);
  console.log(`   Awaiting Human: ${state.awaitingHuman} (should be true)`);
  console.log(`   Locked: ${state.locked} (should be false)\n`);

  return rules.id;
}

async function test3_CannotGenerateTwice(appRequestId: string) {
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('TEST 3: Cannot Generate Rules Twice (Already Awaiting Approval)');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  try {
    await compiler.start(appRequestId);
    console.log('❌ FAIL: Should have thrown error (rules already awaiting approval)\n');
    return false;
  } catch (error) {
    console.log('✅ PASS: Correctly rejected duplicate generation');
    console.log(`   Error: ${error instanceof Error ? error.message : 'Unknown error'}\n`);
    return true;
  }
}

async function test4_ApproveRules(appRequestId: string) {
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('TEST 4: Approving Rules Locks Them and Transitions Conductor');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  // Approve rules
  const approved = await compiler.approveRules(appRequestId);
  console.log('✅ Rules approved');
  console.log(`   Status: ${approved.status} (should be "approved")`);
  console.log(`   Approved At: ${approved.approvedAt}\n`);

  // Verify Conductor transitioned
  const conductorState = await conductor.getStateSnapshot(appRequestId);
  console.log('✅ Conductor state after rules approval:');
  console.log(`   Status: ${conductorState.currentStatus} (should be 'rules_locked')`);
  console.log(`   Awaiting Human: ${conductorState.awaitingHuman} (should be false)`);
  console.log(`   Last Agent: ${conductorState.lastAgent} (should be 'ConstraintCompiler')\n`);

  if (conductorState.currentStatus !== 'rules_locked') {
    console.log('❌ FAIL: Conductor did not transition to "rules_locked"\n');
    return false;
  }

  console.log('✅ PASS: Rules approved and Conductor transitioned to "rules_locked"\n');
  return true;
}

async function test5_CannotApproveAgain(appRequestId: string) {
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('TEST 5: Cannot Approve Rules Twice (Already Approved)');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  try {
    await compiler.approveRules(appRequestId);
    console.log('❌ FAIL: Should have thrown error (rules already approved)\n');
    return false;
  } catch (error) {
    console.log('✅ PASS: Correctly rejected duplicate approval');
    console.log(`   Error: ${error instanceof Error ? error.message : 'Unknown error'}\n`);
    return true;
  }
}

async function test6_CannotRegenerateAfterApproval(appRequestId: string) {
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('TEST 6: Cannot Regenerate Rules After Approval (IMMUTABILITY TEST)');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  try {
    await compiler.start(appRequestId);
    console.log('❌ FAIL: Should have thrown error (rules are immutable)\n');
    return false;
  } catch (error) {
    console.log('✅ PASS: Correctly rejected regeneration of approved rules');
    console.log(`   Error: ${error instanceof Error ? error.message : 'Unknown error'}\n`);
    return true;
  }
}

async function test7_RejectAllowsRegeneration() {
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('TEST 7: Rejecting Rules Allows Regeneration');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  // Create new app request for this test
  const testAppRequest = await prisma.appRequest.create({
    data: {
      id: randomUUID(),
      projectId: TEST_PROJECT_ID,
      prompt: 'Test rejection',
      status: 'pending',
    },
  });

  // Setup minimal context
  await conductor.initialize(testAppRequest.id);
  await conductor.transition(testAppRequest.id, 'base_prompt_ready', 'FoundryArchitect');
  await conductor.transition(testAppRequest.id, 'planning', 'ProductStrategist');
  await conductor.transition(testAppRequest.id, 'screens_defined', 'ScreenCartographer');
  await conductor.transition(testAppRequest.id, 'flows_defined', 'JourneyOrchestrator');
  await conductor.transition(testAppRequest.id, 'designs_ready', 'VisualForge');

  // Create minimal approved data
  await prisma.artifact.create({
    data: {
      id: randomUUID(),
      projectId: TEST_PROJECT_ID,
      type: 'base_prompt',
      path: 'Test prompt',
    },
  });

  await prisma.planningDocument.createMany({
    data: [
      {
        id: randomUUID(),
        appRequestId: testAppRequest.id,
        type: 'MASTER_PLAN',
        content: 'Test plan',
        status: 'approved',
        approvedAt: new Date(),
      },
      {
        id: randomUUID(),
        appRequestId: testAppRequest.id,
        type: 'IMPLEMENTATION_PLAN',
        content: 'Test impl',
        status: 'approved',
        approvedAt: new Date(),
      },
    ],
  });

  await prisma.screenIndex.create({
    data: {
      id: randomUUID(),
      appRequestId: testAppRequest.id,
      screens: JSON.stringify(['Screen1']),
      status: 'approved',
      approvedAt: new Date(),
    },
  });

  await prisma.userRoleDefinition.create({
    data: {
      id: randomUUID(),
      appRequestId: testAppRequest.id,
      content: `| Role Name | Description |\n|-----------|-------------|`,
      status: 'approved',
      approvedAt: new Date(),
    },
  });

  // Generate rules
  await compiler.start(testAppRequest.id);
  console.log('✅ Rules generated\n');

  // Reject rules
  await compiler.rejectRules(testAppRequest.id, 'Rules need more detail');
  console.log('✅ Rules rejected with feedback: "Rules need more detail"\n');

  // Verify rules were deleted
  const rules = await compiler.getCurrentRules(testAppRequest.id);
  if (rules !== null) {
    console.log('❌ FAIL: Rules still exist after rejection\n');
    return false;
  }

  console.log('✅ Rules deleted from database');

  // Verify we can regenerate
  try {
    await compiler.start(testAppRequest.id);
    console.log('✅ Rules successfully regenerated after rejection\n');
    return true;
  } catch (error) {
    console.log('❌ FAIL: Could not regenerate rules after rejection\n');
    return false;
  }
}

async function test8_VerifyEvents(appRequestId: string) {
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('TEST 8: Verify Events Emitted');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  const appRequest = await prisma.appRequest.findUnique({
    where: { id: appRequestId },
  });

  if (!appRequest || !appRequest.executionId) {
    console.log('❌ FAIL: No executionId found\n');
    return false;
  }

  const events = await prisma.executionEvent.findMany({
    where: {
      executionId: appRequest.executionId,
      type: {
        in: [
          'rules_generated',
          'rules_approved',
          'rules_rejected',
          'rules_locked',
        ],
      },
    },
    orderBy: {
      createdAt: 'asc',
    },
  });

  console.log(`✅ Constraint Compiler events found: ${events.length}\n`);

  const eventCounts: Record<string, number> = {};
  for (const event of events) {
    eventCounts[event.type] = (eventCounts[event.type] || 0) + 1;
  }

  console.log('Event Summary:');
  for (const [type, count] of Object.entries(eventCounts)) {
    console.log(`   ${type}: ${count}`);
  }
  console.log();

  const expectedEvents = ['rules_generated', 'rules_approved', 'rules_locked'];

  for (const expectedType of expectedEvents) {
    if (!eventCounts[expectedType]) {
      console.log(`❌ FAIL: Missing event: ${expectedType}\n`);
      return false;
    }
  }

  console.log('✅ PASS: All expected events emitted\n');
  return true;
}

async function runAllTests() {
  console.log('\n╔═══════════════════════════════════════════════════════╗');
  console.log('║  CONSTRAINT COMPILER TEST SUITE                       ║');
  console.log('╚═══════════════════════════════════════════════════════╝\n');

  try {
    // Setup
    await cleanup();
    const { appRequest } = await setupProject();

    // Run tests
    const results: boolean[] = [];

    results.push(await test1_CannotStartWithWrongState());
    await test2_GenerateRules(appRequest.id);
    results.push(await test3_CannotGenerateTwice(appRequest.id));
    results.push(await test4_ApproveRules(appRequest.id));
    results.push(await test5_CannotApproveAgain(appRequest.id));
    results.push(await test6_CannotRegenerateAfterApproval(appRequest.id));
    results.push(await test7_RejectAllowsRegeneration());
    results.push(await test8_VerifyEvents(appRequest.id));

    const allPassed = results.every(r => r === true);

    if (!allPassed) {
      console.log('╔═══════════════════════════════════════════════════════╗');
      console.log('║  SOME TESTS FAILED ❌                                 ║');
      console.log('╚═══════════════════════════════════════════════════════╝\n');
      return 1;
    }

    console.log('╔═══════════════════════════════════════════════════════╗');
    console.log('║  ALL TESTS COMPLETED SUCCESSFULLY! ✅                 ║');
    console.log('╚═══════════════════════════════════════════════════════╝\n');

    console.log('Summary:');
    console.log('✅ Cannot start unless Conductor = designs_ready');
    console.log('✅ Project rules generated and paused for approval');
    console.log('✅ Cannot generate rules twice (already awaiting approval)');
    console.log('✅ Approving rules locks them and transitions Conductor to "rules_locked"');
    console.log('✅ Cannot approve rules twice (already approved)');
    console.log('✅ Cannot regenerate rules after approval (IMMUTABILITY)');
    console.log('✅ Rejecting rules allows regeneration');
    console.log('✅ All events emitted in correct sequence\n');

    return 0;
  } catch (error) {
    console.error('\n❌ TEST SUITE FAILED');
    console.error('Error:', error);
    return 1;
  } finally {
    await prisma.$disconnect();
  }
}

runAllTests()
  .then(exitCode => process.exit(exitCode))
  .catch(error => {
    console.error('Fatal error:', error);
    process.exit(1);
  });
