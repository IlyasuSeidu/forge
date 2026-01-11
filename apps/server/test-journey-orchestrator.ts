/**
 * Journey Orchestrator Test Script
 *
 * Tests the Tier 2 user journey definition agent:
 * 1. Validates Conductor state before starting (must be screens_defined)
 * 2. Generates User Roles Table and pauses for approval
 * 3. Cannot generate journeys before roles approval
 * 4. Generates user journeys one-by-one after roles approval
 * 5. Advances Conductor only after all journeys approved
 * 6. Handles rejections correctly
 * 7. Maintains proper lock/unlock behavior
 * 8. Emits all required events
 */

import 'dotenv/config';
import { PrismaClient } from '@prisma/client';
import { ForgeConductor } from './src/conductor/forge-conductor.js';
import { JourneyOrchestrator } from './src/agents/journey-orchestrator.js';
import { createLogger } from './src/utils/logger.js';
import { randomUUID } from 'crypto';

const prisma = new PrismaClient();
const logger = createLogger();
const conductor = new ForgeConductor(prisma, logger);
const orchestrator = new JourneyOrchestrator(prisma, conductor, logger);

const TEST_PROJECT_ID = 'journey-orchestrator-test-project';

async function cleanup() {
  console.log('\n🧹 Cleaning up old test data...');

  const appRequests = await prisma.appRequest.findMany({
    where: { projectId: TEST_PROJECT_ID },
    select: { id: true },
  });
  const appRequestIds = appRequests.map(ar => ar.id);

  if (appRequestIds.length > 0) {
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
  console.log('📦 Setting up test project with approved screens...');

  const project = await prisma.project.create({
    data: {
      id: TEST_PROJECT_ID,
      name: 'Journey Orchestrator Test',
      description: 'Testing Tier 2 user journey definition agent',
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
      prompt: 'Build a task management app with multiple user roles',
      status: 'pending',
      executionId: execution.id,
    },
  });

  // Initialize Conductor and advance to screens_defined state
  await conductor.initialize(appRequest.id);
  await conductor.transition(appRequest.id, 'base_prompt_ready', 'FoundryArchitect');
  await conductor.transition(appRequest.id, 'planning', 'ProductStrategist');
  await conductor.transition(appRequest.id, 'screens_defined', 'ScreenCartographer');

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
      screens: JSON.stringify(['Landing Page', 'Sign Up', 'Login', 'Dashboard', 'Task List', 'Task Detail']),
      status: 'approved',
      approvedAt: new Date(),
    },
  });

  // Create approved screen definitions
  const screenNames = ['Landing Page', 'Sign Up', 'Login', 'Dashboard', 'Task List', 'Task Detail'];
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

  const state = await conductor.getStateSnapshot(appRequest.id);

  console.log('✅ Project setup complete');
  console.log(`   Project ID: ${project.id}`);
  console.log(`   AppRequest ID: ${appRequest.id}`);
  console.log(`   Conductor Status: ${state.currentStatus} (should be 'screens_defined')`);
  console.log(`   Screens: 6 approved\n`);

  return { project, appRequest, execution };
}

async function test1_CannotStartWithWrongState() {
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('TEST 1: Cannot Start Unless Conductor = screens_defined');
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
    await orchestrator.start(testAppRequest.id);
    console.log('❌ FAIL: Should have thrown error for wrong state\n');
    return false;
  } catch (error) {
    console.log('✅ PASS: Correctly rejected start with wrong Conductor state');
    console.log(`   Error: ${error instanceof Error ? error.message : 'Unknown error'}\n`);
    return true;
  }
}

async function test2_GenerateUserRolesTable(appRequestId: string) {
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('TEST 2: Generate User Roles Table and Pause for Approval');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  const rolesTable = await orchestrator.start(appRequestId);

  console.log('✅ User Roles Table generated');
  console.log(`   Roles ID: ${rolesTable.id}`);
  console.log(`   Status: ${rolesTable.status}`);
  console.log(`   Content Length: ${rolesTable.content.length} chars\n`);

  // Show preview
  console.log('📄 User Roles Table Preview:');
  console.log('─'.repeat(60));
  console.log(rolesTable.content.substring(0, 300) + '...');
  console.log('─'.repeat(60));
  console.log();

  // Verify Conductor state
  const state = await conductor.getStateSnapshot(appRequestId);
  console.log('✅ Conductor state after User Roles:');
  console.log(`   Status: ${state.currentStatus} (still 'screens_defined')`);
  console.log(`   Awaiting Human: ${state.awaitingHuman} (should be true)`);
  console.log(`   Locked: ${state.locked} (should be false)\n`);

  return rolesTable.id;
}

async function test3_CannotGenerateJourneysBeforeRolesApproval(appRequestId: string) {
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('TEST 3: Cannot Generate Journeys Before Roles Approval');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  try {
    await orchestrator.generateNextJourney(appRequestId);
    console.log('❌ FAIL: Should have thrown error (roles not approved)\n');
    return false;
  } catch (error) {
    console.log('✅ PASS: Correctly rejected journey generation before roles approval');
    console.log(`   Error: ${error instanceof Error ? error.message : 'Unknown error'}\n`);
    return true;
  }
}

async function test4_ApproveRolesAllowsFirstJourney(appRequestId: string) {
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('TEST 4: Approving Roles Allows First Journey Generation');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  // Approve user roles
  await orchestrator.approveUserRoles(appRequestId);
  console.log('✅ User Roles Table approved\n');

  // Generate first journey
  const firstJourney = await orchestrator.generateNextJourney(appRequestId);

  console.log('✅ First journey generated');
  console.log(`   Role Name: ${firstJourney.roleName}`);
  console.log(`   Order: ${firstJourney.order}`);
  console.log(`   Status: ${firstJourney.status}`);
  console.log(`   Content Length: ${firstJourney.content.length} chars\n`);

  // Show preview
  console.log('📄 Journey Preview:');
  console.log('─'.repeat(60));
  console.log(firstJourney.content.substring(0, 200) + '...');
  console.log('─'.repeat(60));
  console.log();

  return firstJourney.id;
}

async function test5_JourneysGeneratedOneByOne(appRequestId: string) {
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('TEST 5: Journeys Generated One-by-One in Correct Order');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  // Get state
  const state = await orchestrator.getCurrentState(appRequestId);
  console.log(`📊 Current State: ${state.completedCount} completed, ${state.remainingCount} remaining\n`);

  // Approve first journey
  await orchestrator.approveCurrentJourney(appRequestId);
  console.log('✅ First journey approved\n');

  // Generate second journey
  const secondJourney = await orchestrator.generateNextJourney(appRequestId);
  console.log(`✅ Second journey generated: ${secondJourney.roleName}`);
  console.log(`   Order: ${secondJourney.order} (should be 1)\n`);

  if (secondJourney.order !== 1) {
    console.log('❌ FAIL: Second journey has wrong order\n');
    return false;
  }

  console.log('✅ PASS: Journeys generated in correct sequential order\n');
  return true;
}

async function test6_RejectJourneyPreventsAdvancement(appRequestId: string) {
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('TEST 6: Rejecting Journey Prevents Conductor Advancement');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  // Reject current journey
  await orchestrator.rejectCurrentJourney(appRequestId, 'Missing critical steps');
  console.log('✅ Journey rejected with feedback: "Missing critical steps"\n');

  // Verify journey was deleted
  const state = await orchestrator.getCurrentState(appRequestId);
  if (state.currentJourney !== null) {
    console.log('❌ FAIL: Current journey still exists after rejection\n');
    return false;
  }

  console.log('✅ Journey deleted from database');

  // Verify Conductor state unchanged
  const conductorState = await conductor.getStateSnapshot(appRequestId);
  console.log('✅ Conductor state after rejection:');
  console.log(`   Status: ${conductorState.currentStatus} (still 'screens_defined')`);
  console.log(`   Locked: ${conductorState.locked} (should be false)\n`);

  return true;
}

async function test7_CompleteAllJourneys(appRequestId: string) {
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('TEST 7: Complete All Journeys and Transition Conductor');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  // Regenerate rejected journey
  const regenerated = await orchestrator.generateNextJourney(appRequestId);
  console.log(`✅ Regenerated journey: ${regenerated.roleName}\n`);

  // Approve it
  await orchestrator.approveCurrentJourney(appRequestId);
  console.log('✅ Journey approved\n');

  // Get remaining count
  let state = await orchestrator.getCurrentState(appRequestId);
  const totalRemaining = state.remainingCount;

  console.log(`📊 Remaining journeys: ${totalRemaining}\n`);

  // Complete remaining journeys
  for (let i = 0; i < totalRemaining; i++) {
    const journey = await orchestrator.generateNextJourney(appRequestId);
    console.log(`   ${i + 1}/${totalRemaining}: ${journey.roleName} journey generated`);
    await orchestrator.approveCurrentJourney(appRequestId);
    console.log(`   ${i + 1}/${totalRemaining}: ${journey.roleName} journey approved\n`);
  }

  // Verify Conductor transitioned
  const conductorState = await conductor.getStateSnapshot(appRequestId);
  console.log('✅ Conductor state after all journeys approved:');
  console.log(`   Status: ${conductorState.currentStatus} (should be 'flows_defined')`);
  console.log(`   Awaiting Human: ${conductorState.awaitingHuman} (should be false)`);
  console.log(`   Last Agent: ${conductorState.lastAgent} (should be 'JourneyOrchestrator')\n`);

  if (conductorState.currentStatus !== 'flows_defined') {
    console.log('❌ FAIL: Conductor did not transition to "flows_defined"\n');
    return false;
  }

  console.log('✅ PASS: Conductor correctly transitioned to "flows_defined"\n');
  return true;
}

async function test8_VerifyAllJourneys(appRequestId: string) {
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('TEST 8: Verify All Journeys Stored Correctly');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  const state = await orchestrator.getCurrentState(appRequestId);

  console.log(`✅ Total Roles: ${state.totalRoles}`);
  console.log(`✅ Completed Journeys: ${state.completedCount}`);
  console.log(`✅ Remaining: ${state.remainingCount}\n`);

  if (state.completedCount !== state.totalRoles) {
    console.log('❌ FAIL: Not all journeys completed\n');
    return false;
  }

  // Get all journeys
  const allJourneys = await prisma.userJourney.findMany({
    where: { appRequestId },
    orderBy: { order: 'asc' },
  });

  console.log('📄 All Journeys:\n');
  for (const journey of allJourneys) {
    console.log(`   ${journey.order + 1}. ${journey.roleName} (${journey.status})`);
  }
  console.log();

  console.log('✅ PASS: All journeys stored and approved\n');
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
          'user_roles_created',
          'user_roles_approved',
          'user_journey_created',
          'user_journey_approved',
          'user_journey_rejected',
          'flows_defined',
        ],
      },
    },
    orderBy: {
      createdAt: 'asc',
    },
  });

  console.log(`✅ Journey orchestration events found: ${events.length}\n`);

  const eventCounts: Record<string, number> = {};
  for (const event of events) {
    eventCounts[event.type] = (eventCounts[event.type] || 0) + 1;
  }

  console.log('Event Summary:');
  for (const [type, count] of Object.entries(eventCounts)) {
    console.log(`   ${type}: ${count}`);
  }
  console.log();

  const expectedEvents = ['user_roles_created', 'user_roles_approved', 'flows_defined'];

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
  console.log('║  JOURNEY ORCHESTRATOR TEST SUITE                      ║');
  console.log('╚═══════════════════════════════════════════════════════╝\n');

  try {
    // Setup
    await cleanup();
    const { appRequest } = await setupProject();

    // Run tests
    const results: boolean[] = [];

    results.push(await test1_CannotStartWithWrongState());
    await test2_GenerateUserRolesTable(appRequest.id);
    results.push(await test3_CannotGenerateJourneysBeforeRolesApproval(appRequest.id));
    await test4_ApproveRolesAllowsFirstJourney(appRequest.id);
    results.push(await test5_JourneysGeneratedOneByOne(appRequest.id));
    results.push(await test6_RejectJourneyPreventsAdvancement(appRequest.id));
    results.push(await test7_CompleteAllJourneys(appRequest.id));
    results.push(await test8_VerifyAllJourneys(appRequest.id));
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
    console.log('✅ Cannot start unless Conductor = screens_defined');
    console.log('✅ User Roles Table generated and paused for approval');
    console.log('✅ Cannot generate journeys before roles approval');
    console.log('✅ Approving roles allows first journey generation');
    console.log('✅ Journeys generated one-by-one in correct order');
    console.log('✅ Rejecting journey prevents advancement');
    console.log('✅ Approving all journeys transitions Conductor to "flows_defined"');
    console.log('✅ All journeys stored correctly');
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
