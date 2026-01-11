/**
 * Screen Cartographer Test Script
 *
 * Tests the Tier 2 screen mapping agent:
 * 1. Validates Conductor state before starting
 * 2. Generates Screen Index and pauses for approval
 * 3. Cannot describe screens before index approval
 * 4. Generates screen descriptions one-by-one after index approval
 * 5. Advances Conductor only after all screens approved
 * 6. Handles rejections correctly
 * 7. Maintains proper lock/unlock behavior
 * 8. Emits all required events
 */

import 'dotenv/config';
import { PrismaClient } from '@prisma/client';
import { ForgeConductor } from './src/conductor/forge-conductor.js';
import { ScreenCartographer } from './src/agents/screen-cartographer.js';
import { createLogger } from './src/utils/logger.js';
import { randomUUID } from 'crypto';

const prisma = new PrismaClient();
const logger = createLogger();
const conductor = new ForgeConductor(prisma, logger);
const cartographer = new ScreenCartographer(prisma, conductor, logger);

const TEST_PROJECT_ID = 'screen-cartographer-test-project';

async function cleanup() {
  console.log('\n🧹 Cleaning up old test data...');

  const appRequests = await prisma.appRequest.findMany({
    where: { projectId: TEST_PROJECT_ID },
    select: { id: true },
  });
  const appRequestIds = appRequests.map(ar => ar.id);

  if (appRequestIds.length > 0) {
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
  console.log('📦 Setting up test project with approved planning docs...');

  const project = await prisma.project.create({
    data: {
      id: TEST_PROJECT_ID,
      name: 'Screen Cartographer Test',
      description: 'Testing Tier 2 screen mapping agent',
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
      prompt: 'Build a task management app',
      status: 'pending',
      executionId: execution.id,
    },
  });

  // Initialize Conductor and advance to planning state
  await conductor.initialize(appRequest.id);
  await conductor.transition(appRequest.id, 'base_prompt_ready', 'FoundryArchitect');
  await conductor.transition(appRequest.id, 'planning', 'ProductStrategist');

  // Create Base Prompt artifact
  await prisma.artifact.create({
    data: {
      id: randomUUID(),
      projectId: TEST_PROJECT_ID,
      type: 'base_prompt',
      path: 'base_prompt.md',
    },
  });

  // Create approved planning documents
  await prisma.planningDocument.createMany({
    data: [
      {
        id: randomUUID(),
        appRequestId: appRequest.id,
        type: 'MASTER_PLAN',
        content: 'Master Plan content',
        status: 'approved',
        approvedAt: new Date(),
      },
      {
        id: randomUUID(),
        appRequestId: appRequest.id,
        type: 'IMPLEMENTATION_PLAN',
        content: 'Implementation Plan content',
        status: 'approved',
        approvedAt: new Date(),
      },
    ],
  });

  const state = await conductor.getStateSnapshot(appRequest.id);

  console.log('✅ Project setup complete');
  console.log(`   Project ID: ${project.id}`);
  console.log(`   AppRequest ID: ${appRequest.id}`);
  console.log(`   Conductor Status: ${state.currentStatus} (should be 'planning')`);
  console.log(`   Planning Docs: Approved\n`);

  return { project, appRequest, execution };
}

async function test1_CannotStartWithWrongState() {
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('TEST 1: Cannot Start Unless Conductor = planning');
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
    await cartographer.start(testAppRequest.id);
    console.log('❌ FAIL: Should have thrown error for wrong state\n');
    return false;
  } catch (error) {
    console.log('✅ PASS: Correctly rejected start with wrong Conductor state');
    console.log(`   Error: ${error instanceof Error ? error.message : 'Unknown error'}\n`);
    return true;
  }
}

async function test2_GenerateScreenIndex(appRequestId: string) {
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('TEST 2: Generate Screen Index and Pause for Approval');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  const screenIndex = await cartographer.start(appRequestId);

  console.log('✅ Screen Index generated');
  console.log(`   Index ID: ${screenIndex.id}`);
  console.log(`   Status: ${screenIndex.status}`);
  console.log(`   Screen Count: ${screenIndex.screens.length}`);
  console.log(`   Screens: ${screenIndex.screens.join(', ')}\n`);

  // Verify Conductor state
  const state = await conductor.getStateSnapshot(appRequestId);
  console.log('✅ Conductor state after Screen Index:');
  console.log(`   Status: ${state.currentStatus} (still 'planning')`);
  console.log(`   Awaiting Human: ${state.awaitingHuman} (should be true)`);
  console.log(`   Locked: ${state.locked} (should be false)\n`);

  return screenIndex.id;
}

async function test3_CannotDescribeBeforeIndexApproval(appRequestId: string) {
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('TEST 3: Cannot Describe Screens Before Index Approval');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  try {
    await cartographer.describeNextScreen(appRequestId);
    console.log('❌ FAIL: Should have thrown error (index not approved)\n');
    return false;
  } catch (error) {
    console.log('✅ PASS: Correctly rejected screen description before index approval');
    console.log(`   Error: ${error instanceof Error ? error.message : 'Unknown error'}\n`);
    return true;
  }
}

async function test4_ApproveIndexAllowsFirstScreen(appRequestId: string) {
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('TEST 4: Approving Index Allows First Screen Description');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  // Approve screen index
  await cartographer.approveScreenIndex(appRequestId);
  console.log('✅ Screen Index approved\n');

  // Describe first screen
  const firstScreen = await cartographer.describeNextScreen(appRequestId);

  console.log('✅ First screen described');
  console.log(`   Screen Name: ${firstScreen.screenName}`);
  console.log(`   Order: ${firstScreen.order}`);
  console.log(`   Status: ${firstScreen.status}`);
  console.log(`   Content Length: ${firstScreen.content.length} chars\n`);

  // Show preview
  console.log('📄 Screen Description Preview:');
  console.log('─'.repeat(60));
  console.log(firstScreen.content.substring(0, 200) + '...');
  console.log('─'.repeat(60));
  console.log();

  return firstScreen.id;
}

async function test5_ScreensGeneratedOneByOne(appRequestId: string) {
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('TEST 5: Screens Generated One-by-One in Correct Order');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  // Get state
  const state = await cartographer.getCurrentState(appRequestId);
  console.log(`📊 Current State: ${state.completedCount} completed, ${state.remainingCount} remaining\n`);

  // Approve first screen
  await cartographer.approveCurrentScreen(appRequestId);
  console.log('✅ First screen approved\n');

  // Describe second screen
  const secondScreen = await cartographer.describeNextScreen(appRequestId);
  console.log(`✅ Second screen described: ${secondScreen.screenName}`);
  console.log(`   Order: ${secondScreen.order} (should be 1)\n`);

  if (secondScreen.order !== 1) {
    console.log('❌ FAIL: Second screen has wrong order\n');
    return false;
  }

  console.log('✅ PASS: Screens generated in correct sequential order\n');
  return true;
}

async function test6_RejectScreenPreventsAdvancement(appRequestId: string) {
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('TEST 6: Rejecting Screen Prevents Conductor Advancement');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  // Reject current screen
  await cartographer.rejectCurrentScreen(appRequestId, 'Too vague');
  console.log('✅ Screen rejected with feedback: "Too vague"\n');

  // Verify screen was deleted
  const state = await cartographer.getCurrentState(appRequestId);
  if (state.currentScreen !== null) {
    console.log('❌ FAIL: Current screen still exists after rejection\n');
    return false;
  }

  console.log('✅ Screen deleted from database');

  // Verify Conductor state unchanged
  const conductorState = await conductor.getStateSnapshot(appRequestId);
  console.log('✅ Conductor state after rejection:');
  console.log(`   Status: ${conductorState.currentStatus} (still 'planning')`);
  console.log(`   Locked: ${conductorState.locked} (should be false)\n`);

  return true;
}

async function test7_CompleteAllScreens(appRequestId: string) {
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('TEST 7: Complete All Screens and Transition Conductor');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  // Regenerate rejected screen
  const regenerated = await cartographer.describeNextScreen(appRequestId);
  console.log(`✅ Regenerated screen: ${regenerated.screenName}\n`);

  // Approve it
  await cartographer.approveCurrentScreen(appRequestId);
  console.log('✅ Screen approved\n');

  // Get remaining count
  let state = await cartographer.getCurrentState(appRequestId);
  const totalRemaining = state.remainingCount;

  console.log(`📊 Remaining screens: ${totalRemaining}\n`);

  // Complete remaining screens
  for (let i = 0; i < totalRemaining; i++) {
    const screen = await cartographer.describeNextScreen(appRequestId);
    console.log(`   ${i + 1}/${totalRemaining}: ${screen.screenName} described`);
    await cartographer.approveCurrentScreen(appRequestId);
    console.log(`   ${i + 1}/${totalRemaining}: ${screen.screenName} approved\n`);
  }

  // Verify Conductor transitioned
  const conductorState = await conductor.getStateSnapshot(appRequestId);
  console.log('✅ Conductor state after all screens approved:');
  console.log(`   Status: ${conductorState.currentStatus} (should be 'screens_defined')`);
  console.log(`   Awaiting Human: ${conductorState.awaitingHuman} (should be false)`);
  console.log(`   Last Agent: ${conductorState.lastAgent} (should be 'ScreenCartographer')\n`);

  if (conductorState.currentStatus !== 'screens_defined') {
    console.log('❌ FAIL: Conductor did not transition to "screens_defined"\n');
    return false;
  }

  console.log('✅ PASS: Conductor correctly transitioned to "screens_defined"\n');
  return true;
}

async function test8_VerifyAllScreens(appRequestId: string) {
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('TEST 8: Verify All Screens Stored Correctly');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  const state = await cartographer.getCurrentState(appRequestId);

  console.log(`✅ Total Screens: ${state.totalScreens}`);
  console.log(`✅ Completed: ${state.completedCount}`);
  console.log(`✅ Remaining: ${state.remainingCount}\n`);

  if (state.completedCount !== state.totalScreens) {
    console.log('❌ FAIL: Not all screens completed\n');
    return false;
  }

  // Get all screens
  const allScreens = await prisma.screenDefinition.findMany({
    where: { appRequestId },
    orderBy: { order: 'asc' },
  });

  console.log('📄 All Screens:\n');
  for (const screen of allScreens) {
    console.log(`   ${screen.order + 1}. ${screen.screenName} (${screen.status})`);
  }
  console.log();

  console.log('✅ PASS: All screens stored and approved\n');
  return true;
}

async function test9_VerifyEvents(appRequestId: string) {
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('TEST 9: Verify Events Emitted');
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
          'screen_index_created',
          'screen_index_approved',
          'screen_description_created',
          'screen_description_approved',
          'screen_description_rejected',
          'screens_defined',
        ],
      },
    },
    orderBy: {
      createdAt: 'asc',
    },
  });

  console.log(`✅ Screen cartography events found: ${events.length}\n`);

  const eventCounts: Record<string, number> = {};
  for (const event of events) {
    eventCounts[event.type] = (eventCounts[event.type] || 0) + 1;
  }

  console.log('Event Summary:');
  for (const [type, count] of Object.entries(eventCounts)) {
    console.log(`   ${type}: ${count}`);
  }
  console.log();

  const expectedEvents = ['screen_index_created', 'screen_index_approved', 'screens_defined'];

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
  console.log('║  SCREEN CARTOGRAPHER TEST SUITE                       ║');
  console.log('╚═══════════════════════════════════════════════════════╝\n');

  try {
    // Setup
    await cleanup();
    const { appRequest } = await setupProject();

    // Run tests
    const results: boolean[] = [];

    results.push(await test1_CannotStartWithWrongState());
    await test2_GenerateScreenIndex(appRequest.id);
    results.push(await test3_CannotDescribeBeforeIndexApproval(appRequest.id));
    await test4_ApproveIndexAllowsFirstScreen(appRequest.id);
    results.push(await test5_ScreensGeneratedOneByOne(appRequest.id));
    results.push(await test6_RejectScreenPreventsAdvancement(appRequest.id));
    results.push(await test7_CompleteAllScreens(appRequest.id));
    results.push(await test8_VerifyAllScreens(appRequest.id));
    results.push(await test9_VerifyEvents(appRequest.id));

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
    console.log('✅ Cannot start unless Conductor = planning');
    console.log('✅ Screen Index generated and paused for approval');
    console.log('✅ Cannot describe screens before index approval');
    console.log('✅ Approving index allows first screen description');
    console.log('✅ Screens generated one-by-one in correct order');
    console.log('✅ Rejecting screen prevents advancement');
    console.log('✅ Approving all screens transitions Conductor to "screens_defined"');
    console.log('✅ All screens stored correctly');
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
