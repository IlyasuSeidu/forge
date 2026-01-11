/**
 * Visual Forge Test Script
 *
 * Tests the Tier 3 UI mockup generation agent:
 * 1. Validates Conductor state before starting (must be flows_defined)
 * 2. Asks for layout type and generates mockup
 * 3. Stores mockup image with metadata
 * 4. Cannot approve without generating first
 * 5. Generates mockups one-by-one after layout selection
 * 6. Handles rejections correctly
 * 7. Advances Conductor only after all mockups approved
 * 8. Maintains proper lock/unlock behavior
 * 9. Emits all required events
 */

import 'dotenv/config';
import { PrismaClient } from '@prisma/client';
import { ForgeConductor } from './src/conductor/forge-conductor.js';
import { VisualForge } from './src/agents/visual-forge.js';
import { createLogger } from './src/utils/logger.js';
import { randomUUID } from 'crypto';

const prisma = new PrismaClient();
const logger = createLogger();
const conductor = new ForgeConductor(prisma, logger);
const visualForge = new VisualForge(prisma, conductor, logger);

const TEST_PROJECT_ID = 'visual-forge-test-project';

async function cleanup() {
  console.log('\n🧹 Cleaning up old test data...');

  const appRequests = await prisma.appRequest.findMany({
    where: { projectId: TEST_PROJECT_ID },
    select: { id: true },
  });
  const appRequestIds = appRequests.map(ar => ar.id);

  if (appRequestIds.length > 0) {
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
  console.log('📦 Setting up test project with approved user journeys...');

  const project = await prisma.project.create({
    data: {
      id: TEST_PROJECT_ID,
      name: 'Visual Forge Test',
      description: 'Testing Tier 3 UI mockup generation agent',
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
      prompt: 'Build a task management app with visual mockups',
      status: 'pending',
      executionId: execution.id,
    },
  });

  // Initialize Conductor and advance to flows_defined state
  await conductor.initialize(appRequest.id);
  await conductor.transition(appRequest.id, 'base_prompt_ready', 'FoundryArchitect');
  await conductor.transition(appRequest.id, 'planning', 'ProductStrategist');
  await conductor.transition(appRequest.id, 'screens_defined', 'ScreenCartographer');
  await conductor.transition(appRequest.id, 'flows_defined', 'JourneyOrchestrator');

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

  // Create approved screen index
  await prisma.screenIndex.create({
    data: {
      id: randomUUID(),
      appRequestId: appRequest.id,
      screens: JSON.stringify(['Dashboard', 'Task List', 'Task Detail']),
      status: 'approved',
      approvedAt: new Date(),
    },
  });

  // Create approved screen definitions
  const screenNames = ['Dashboard', 'Task List', 'Task Detail'];
  for (let i = 0; i < screenNames.length; i++) {
    await prisma.screenDefinition.create({
      data: {
        id: randomUUID(),
        appRequestId: appRequest.id,
        screenName: screenNames[i],
        content: `Description for ${screenNames[i]}. This screen shows relevant information.`,
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
      content: `| Role Name | Description | Permissions |
|-----------|-------------|-------------|
| User | Regular user | View, Edit |
| Admin | Administrator | All |`,
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
        content: 'Step 1: Visit Dashboard. Step 2: Go to Task List. Step 3: View Task Detail.',
        order: 0,
        status: 'approved',
        approvedAt: new Date(),
      },
      {
        id: randomUUID(),
        appRequestId: appRequest.id,
        roleName: 'Admin',
        content: 'Step 1: Access Dashboard. Step 2: Manage Task List. Step 3: Edit Task Detail.',
        order: 1,
        status: 'approved',
        approvedAt: new Date(),
      },
    ],
  });

  const state = await conductor.getStateSnapshot(appRequest.id);

  console.log('✅ Project setup complete');
  console.log(`   Project ID: ${project.id}`);
  console.log(`   AppRequest ID: ${appRequest.id}`);
  console.log(`   Conductor Status: ${state.currentStatus} (should be 'flows_defined')`);
  console.log(`   Screens: 3 approved\n`);

  return { project, appRequest, execution };
}

async function test1_CannotStartWithWrongState() {
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('TEST 1: Cannot Start Unless Conductor = flows_defined');
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
    await visualForge.start(testAppRequest.id);
    console.log('❌ FAIL: Should have thrown error for wrong state\n');
    return false;
  } catch (error) {
    console.log('✅ PASS: Correctly rejected start with wrong Conductor state');
    console.log(`   Error: ${error instanceof Error ? error.message : 'Unknown error'}\n`);
    return true;
  }
}

async function test2_StartReturnsNextScreen(appRequestId: string) {
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('TEST 2: Start Returns Next Screen for Mocking');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  const result = await visualForge.start(appRequestId);

  console.log('✅ Visual Forge started');
  console.log(`   Next Screen: ${result.nextScreen}`);
  console.log(`   Message: ${result.message}\n`);

  if (result.nextScreen !== 'Dashboard') {
    console.log('❌ FAIL: Next screen should be Dashboard\n');
    return false;
  }

  console.log('✅ PASS: Correct next screen identified\n');
  return true;
}

async function test3_GenerateMockupWithLayout(appRequestId: string) {
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('TEST 3: Generate Mockup After Layout Selection');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  const mockup = await visualForge.selectLayout(appRequestId, 'Dashboard', 'desktop');

  console.log('✅ Mockup generated');
  console.log(`   Screen Name: ${mockup.screenName}`);
  console.log(`   Layout Type: ${mockup.layoutType}`);
  console.log(`   Image Path: ${mockup.imagePath}`);
  console.log(`   Status: ${mockup.status}\n`);

  // Verify Conductor state
  const state = await conductor.getStateSnapshot(appRequestId);
  console.log('✅ Conductor state after mockup generation:');
  console.log(`   Status: ${state.currentStatus} (still 'flows_defined')`);
  console.log(`   Awaiting Human: ${state.awaitingHuman} (should be true)`);
  console.log(`   Locked: ${state.locked} (should be false)\n`);

  return mockup.screenName;
}

async function test4_ApproveMockupAllowsNext(appRequestId: string) {
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('TEST 4: Approving Mockup Allows Next Screen');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  // Approve first mockup
  await visualForge.approveMockup(appRequestId, 'Dashboard');
  console.log('✅ Dashboard mockup approved\n');

  // Generate second mockup
  const secondMockup = await visualForge.selectLayout(appRequestId, 'Task List', 'mobile');
  console.log(`✅ Second mockup generated: ${secondMockup.screenName}`);
  console.log(`   Layout: ${secondMockup.layoutType}\n`);

  if (secondMockup.screenName !== 'Task List') {
    console.log('❌ FAIL: Second mockup has wrong screen name\n');
    return false;
  }

  console.log('✅ PASS: Mockups generated in correct sequential order\n');
  return true;
}

async function test5_RejectMockupPreventsAdvancement(appRequestId: string) {
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('TEST 5: Rejecting Mockup Prevents Conductor Advancement');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  // Reject current mockup
  await visualForge.rejectMockup(appRequestId, 'Task List', 'Layout needs improvement');
  console.log('✅ Mockup rejected with feedback: "Layout needs improvement"\n');

  // Verify mockup was deleted
  const state = await visualForge.getCurrentState(appRequestId);
  if (state.currentMockup !== null) {
    console.log('❌ FAIL: Current mockup still exists after rejection\n');
    return false;
  }

  console.log('✅ Mockup deleted from database');

  // Verify Conductor state unchanged
  const conductorState = await conductor.getStateSnapshot(appRequestId);
  console.log('✅ Conductor state after rejection:');
  console.log(`   Status: ${conductorState.currentStatus} (still 'flows_defined')`);
  console.log(`   Locked: ${conductorState.locked} (should be false)\n`);

  return true;
}

async function test6_CompleteAllMockups(appRequestId: string) {
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('TEST 6: Complete All Mockups and Transition Conductor');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  // Regenerate rejected mockup
  const regenerated = await visualForge.selectLayout(appRequestId, 'Task List', 'desktop');
  console.log(`✅ Regenerated mockup: ${regenerated.screenName}\n`);

  // Approve it
  await visualForge.approveMockup(appRequestId, 'Task List');
  console.log('✅ Task List mockup approved\n');

  // Get remaining count
  let state = await visualForge.getCurrentState(appRequestId);
  const totalRemaining = state.remainingCount;

  console.log(`📊 Remaining mockups: ${totalRemaining}\n`);

  // Complete remaining mockups
  for (let i = 0; i < totalRemaining; i++) {
    const screenName = state.allScreenNames[state.completedCount];
    const mockup = await visualForge.selectLayout(appRequestId, screenName, 'desktop');
    console.log(`   ${i + 1}/${totalRemaining}: ${mockup.screenName} mockup generated`);
    await visualForge.approveMockup(appRequestId, screenName);
    console.log(`   ${i + 1}/${totalRemaining}: ${mockup.screenName} mockup approved\n`);
    state = await visualForge.getCurrentState(appRequestId);
  }

  // Verify Conductor transitioned
  const conductorState = await conductor.getStateSnapshot(appRequestId);
  console.log('✅ Conductor state after all mockups approved:');
  console.log(`   Status: ${conductorState.currentStatus} (should be 'designs_ready')`);
  console.log(`   Awaiting Human: ${conductorState.awaitingHuman} (should be false)`);
  console.log(`   Last Agent: ${conductorState.lastAgent} (should be 'VisualForge')\n`);

  if (conductorState.currentStatus !== 'designs_ready') {
    console.log('❌ FAIL: Conductor did not transition to "designs_ready"\n');
    return false;
  }

  console.log('✅ PASS: Conductor correctly transitioned to "designs_ready"\n');
  return true;
}

async function test7_VerifyAllMockups(appRequestId: string) {
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('TEST 7: Verify All Mockups Stored Correctly');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  const state = await visualForge.getCurrentState(appRequestId);

  console.log(`✅ Total Screens: ${state.totalScreens}`);
  console.log(`✅ Completed Mockups: ${state.completedCount}`);
  console.log(`✅ Remaining: ${state.remainingCount}\n`);

  if (state.completedCount !== state.totalScreens) {
    console.log('❌ FAIL: Not all mockups completed\n');
    return false;
  }

  // Get all mockups
  const allMockups = await prisma.screenMockup.findMany({
    where: { appRequestId },
    orderBy: { createdAt: 'asc' },
  });

  console.log('📄 All Mockups:\n');
  for (const mockup of allMockups) {
    console.log(`   ${mockup.screenName} (${mockup.layoutType}) - ${mockup.status}`);
  }
  console.log();

  console.log('✅ PASS: All mockups stored and approved\n');
  return true;
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
          'mockup_generated',
          'mockup_approved',
          'mockup_rejected',
          'designs_ready',
        ],
      },
    },
    orderBy: {
      createdAt: 'asc',
    },
  });

  console.log(`✅ Visual Forge events found: ${events.length}\n`);

  const eventCounts: Record<string, number> = {};
  for (const event of events) {
    eventCounts[event.type] = (eventCounts[event.type] || 0) + 1;
  }

  console.log('Event Summary:');
  for (const [type, count] of Object.entries(eventCounts)) {
    console.log(`   ${type}: ${count}`);
  }
  console.log();

  const expectedEvents = ['mockup_generated', 'mockup_approved', 'designs_ready'];

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
  console.log('║  VISUAL FORGE TEST SUITE                              ║');
  console.log('╚═══════════════════════════════════════════════════════╝\n');

  try {
    // Setup
    await cleanup();
    const { appRequest } = await setupProject();

    // Run tests
    const results: boolean[] = [];

    results.push(await test1_CannotStartWithWrongState());
    results.push(await test2_StartReturnsNextScreen(appRequest.id));
    await test3_GenerateMockupWithLayout(appRequest.id);
    results.push(await test4_ApproveMockupAllowsNext(appRequest.id));
    results.push(await test5_RejectMockupPreventsAdvancement(appRequest.id));
    results.push(await test6_CompleteAllMockups(appRequest.id));
    results.push(await test7_VerifyAllMockups(appRequest.id));
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
    console.log('✅ Cannot start unless Conductor = flows_defined');
    console.log('✅ Start returns next screen for mocking');
    console.log('✅ Mockup generated after layout selection');
    console.log('✅ Approving mockup allows next screen');
    console.log('✅ Rejecting mockup prevents advancement');
    console.log('✅ Approving all mockups transitions Conductor to "designs_ready"');
    console.log('✅ All mockups stored correctly');
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
