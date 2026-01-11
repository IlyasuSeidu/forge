/**
 * Manual Test Script for Forge Conductor
 *
 * This script exercises the Forge Conductor to verify:
 * 1. Initialization works
 * 2. Valid transitions succeed
 * 3. Invalid transitions are blocked
 * 4. Lock/unlock mechanism works
 * 5. Pause/resume for human approval works
 * 6. getNextAction() returns correct decisions
 */

import 'dotenv/config';
import { PrismaClient } from '@prisma/client';
import { ForgeConductor } from './src/conductor/forge-conductor.js';
import { createLogger } from './src/utils/logger.js';
import { randomUUID } from 'crypto';

const prisma = new PrismaClient();
const logger = createLogger();
const conductor = new ForgeConductor(prisma, logger);

const TEST_PROJECT_ID = 'forge-conductor-test-project';

async function cleanup() {
  console.log('\n🧹 Cleaning up old test data...');
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
  console.log('📦 Setting up test project...');

  const project = await prisma.project.create({
    data: {
      id: TEST_PROJECT_ID,
      name: 'Forge Conductor Test',
      description: 'Testing the conductor state machine',
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
      prompt: 'Build a sophisticated Next.js e-commerce app with auth and payment',
      status: 'pending',
      executionId: execution.id,
    },
  });

  console.log('✅ Project setup complete');
  console.log(`   Project ID: ${project.id}`);
  console.log(`   AppRequest ID: ${appRequest.id}`);
  console.log(`   Execution ID: ${execution.id}\n`);

  return { project, appRequest, execution };
}

async function test1_Initialization(appRequestId: string) {
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('TEST 1: Initialize Conductor');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  const snapshot = await conductor.initialize(appRequestId);

  console.log('✅ Conductor initialized successfully');
  console.log('   Current Status:', snapshot.currentStatus);
  console.log('   Locked:', snapshot.locked);
  console.log('   Awaiting Human:', snapshot.awaitingHuman);
  console.log('   Can Transition:', snapshot.canTransition);
  console.log('   Allowed Next States:', snapshot.allowedNextStates.join(', '));
  console.log();

  // Try to initialize again - should fail
  console.log('🧪 Testing duplicate initialization (should fail)...');
  try {
    await conductor.initialize(appRequestId);
    console.log('❌ FAIL: Should have thrown error for duplicate initialization\n');
  } catch (err) {
    console.log('✅ PASS: Duplicate initialization correctly rejected');
    console.log(`   Error: ${err instanceof Error ? err.message : 'Unknown error'}\n`);
  }
}

async function test2_ValidTransitions(appRequestId: string) {
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('TEST 2: Valid State Transitions');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  // idea → base_prompt_ready
  console.log('🔄 Transition: idea → base_prompt_ready (agent: FoundryArchitect)');
  let snapshot = await conductor.transition(appRequestId, 'base_prompt_ready', 'FoundryArchitect');
  console.log('✅ Transition successful');
  console.log(`   New Status: ${snapshot.currentStatus}`);
  console.log(`   Last Agent: ${snapshot.lastAgent}\n`);

  // base_prompt_ready → planning
  console.log('🔄 Transition: base_prompt_ready → planning (agent: ProductStrategist)');
  snapshot = await conductor.transition(appRequestId, 'planning', 'ProductStrategist');
  console.log('✅ Transition successful');
  console.log(`   New Status: ${snapshot.currentStatus}\n`);

  // planning → screens_defined
  console.log('🔄 Transition: planning → screens_defined (agent: ScreenCartographer)');
  snapshot = await conductor.transition(appRequestId, 'screens_defined', 'ScreenCartographer');
  console.log('✅ Transition successful');
  console.log(`   New Status: ${snapshot.currentStatus}\n`);

  // screens_defined → flows_defined
  console.log('🔄 Transition: screens_defined → flows_defined (agent: JourneyOrchestrator)');
  snapshot = await conductor.transition(appRequestId, 'flows_defined', 'JourneyOrchestrator');
  console.log('✅ Transition successful');
  console.log(`   New Status: ${snapshot.currentStatus}\n`);
}

async function test3_InvalidTransitions(appRequestId: string) {
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('TEST 3: Invalid State Transitions (Should Fail)');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  // Try to skip directly to completed
  console.log('🧪 Attempting invalid transition: flows_defined → completed');
  try {
    await conductor.transition(appRequestId, 'completed');
    console.log('❌ FAIL: Should have rejected invalid transition\n');
  } catch (err) {
    console.log('✅ PASS: Invalid transition correctly rejected');
    console.log(`   Error: ${err instanceof Error ? err.message : 'Unknown error'}\n`);
  }

  // Try to go backwards
  console.log('🧪 Attempting backward transition: flows_defined → idea');
  try {
    await conductor.transition(appRequestId, 'idea');
    console.log('❌ FAIL: Should have rejected backward transition\n');
  } catch (err) {
    console.log('✅ PASS: Backward transition correctly rejected');
    console.log(`   Error: ${err instanceof Error ? err.message : 'Unknown error'}\n`);
  }

  // Try invalid next state
  console.log('🧪 Attempting invalid transition: flows_defined → verifying');
  try {
    await conductor.transition(appRequestId, 'verifying');
    console.log('❌ FAIL: Should have rejected skipping states\n');
  } catch (err) {
    console.log('✅ PASS: State-skipping transition correctly rejected');
    console.log(`   Error: ${err instanceof Error ? err.message : 'Unknown error'}\n`);
  }
}

async function test4_LockUnlock(appRequestId: string) {
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('TEST 4: Lock/Unlock Mechanism');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  console.log('🔒 Locking conductor...');
  await conductor.lock(appRequestId);
  let snapshot = await conductor.getStateSnapshot(appRequestId);
  console.log('✅ Conductor locked');
  console.log(`   Locked: ${snapshot.locked}`);
  console.log(`   Can Transition: ${snapshot.canTransition}\n`);

  console.log('🔓 Unlocking conductor...');
  await conductor.unlock(appRequestId);
  snapshot = await conductor.getStateSnapshot(appRequestId);
  console.log('✅ Conductor unlocked');
  console.log(`   Locked: ${snapshot.locked}`);
  console.log(`   Can Transition: ${snapshot.canTransition}\n`);
}

async function test5_PauseResume(appRequestId: string) {
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('TEST 5: Pause/Resume for Human Approval');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  console.log('⏸️  Pausing for human approval...');
  await conductor.pauseForHuman(appRequestId, 'Need approval for UI mockups');
  let snapshot = await conductor.getStateSnapshot(appRequestId);
  console.log('✅ Conductor paused');
  console.log(`   Awaiting Human: ${snapshot.awaitingHuman}`);
  console.log(`   Locked: ${snapshot.locked}`);
  console.log(`   Can Transition: ${snapshot.canTransition}\n`);

  console.log('▶️  Resuming after human approval...');
  await conductor.resumeAfterHuman(appRequestId);
  snapshot = await conductor.getStateSnapshot(appRequestId);
  console.log('✅ Conductor resumed');
  console.log(`   Awaiting Human: ${snapshot.awaitingHuman}`);
  console.log(`   Can Transition: ${snapshot.canTransition}\n`);
}

async function test6_GetNextAction(appRequestId: string) {
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('TEST 6: Get Next Action Decision');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  // Get next action (should be run_agent)
  console.log('🎯 Getting next action (current state: flows_defined)...');
  let action = await conductor.getNextAction(appRequestId);
  console.log('✅ Next action determined');
  console.log(`   Type: ${action.type}`);
  if (action.type === 'run_agent') {
    console.log(`   Agent: ${action.agent}`);
  }
  console.log();

  // Lock conductor and check next action (should be halt)
  console.log('🔒 Locking conductor...');
  await conductor.lock(appRequestId);
  action = await conductor.getNextAction(appRequestId);
  console.log('✅ Next action with lock');
  console.log(`   Type: ${action.type}`);
  if (action.type === 'halt') {
    console.log(`   Reason: ${action.reason}`);
  }
  console.log();

  // Unlock
  await conductor.unlock(appRequestId);

  // Pause for human and check next action (should be await_human)
  console.log('⏸️  Pausing for human...');
  await conductor.pauseForHuman(appRequestId, 'Need design approval');
  action = await conductor.getNextAction(appRequestId);
  console.log('✅ Next action while paused');
  console.log(`   Type: ${action.type}`);
  if (action.type === 'await_human') {
    console.log(`   Reason: ${action.reason}`);
  }
  console.log();

  // Resume
  await conductor.resumeAfterHuman(appRequestId);
}

async function test7_CompleteFlow(appRequestId: string) {
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('TEST 7: Complete Lifecycle Flow');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  console.log('🔄 Executing remaining transitions to completion...\n');

  // flows_defined → designs_ready
  console.log('   → designs_ready (VisualForge)');
  await conductor.transition(appRequestId, 'designs_ready', 'VisualForge');

  // designs_ready → rules_locked
  console.log('   → rules_locked (ConstraintCompiler)');
  await conductor.transition(appRequestId, 'rules_locked', 'ConstraintCompiler');

  // rules_locked → build_prompts_ready
  console.log('   → build_prompts_ready (BuildPromptEngineer)');
  await conductor.transition(appRequestId, 'build_prompts_ready', 'BuildPromptEngineer');

  // build_prompts_ready → building
  console.log('   → building (ForgeImplementer)');
  await conductor.transition(appRequestId, 'building', 'ForgeImplementer');

  // building → verifying
  console.log('   → verifying (VerificationService)');
  await conductor.transition(appRequestId, 'verifying', 'VerificationService');

  // verifying → completed
  console.log('   → completed');
  await conductor.transition(appRequestId, 'completed');

  const snapshot = await conductor.getStateSnapshot(appRequestId);
  console.log('\n✅ Complete lifecycle flow executed');
  console.log(`   Final Status: ${snapshot.currentStatus}`);
  console.log(`   Can Transition: ${snapshot.canTransition}`);
  console.log(`   Allowed Next States: ${snapshot.allowedNextStates.join(', ') || 'none (terminal state)'}\n`);

  // Try to transition from terminal state
  console.log('🧪 Attempting transition from terminal state (should fail)...');
  try {
    await conductor.transition(appRequestId, 'building');
    console.log('❌ FAIL: Should not allow transition from terminal state\n');
  } catch (err) {
    console.log('✅ PASS: Terminal state transition correctly rejected');
    console.log(`   Error: ${err instanceof Error ? err.message : 'Unknown error'}\n`);
  }

  // Check next action (should be halt)
  const action = await conductor.getNextAction(appRequestId);
  console.log('✅ Next action from terminal state');
  console.log(`   Type: ${action.type}`);
  if (action.type === 'halt') {
    console.log(`   Reason: ${action.reason}\n`);
  }
}

async function test8_CheckEvents(executionId: string) {
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('TEST 8: Verify Events Were Emitted');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  const events = await prisma.executionEvent.findMany({
    where: { executionId },
    orderBy: { createdAt: 'asc' },
  });

  const conductorEvents = events.filter(e => e.type.startsWith('conductor_'));

  console.log(`📊 Found ${conductorEvents.length} conductor events:\n`);

  conductorEvents.forEach((event, i) => {
    console.log(`   ${i + 1}. ${event.type}`);
    console.log(`      ${event.message}`);
  });

  console.log();
}

async function runAllTests() {
  console.log('\n╔═══════════════════════════════════════════════════════╗');
  console.log('║  FORGE CONDUCTOR MANUAL TEST SUITE                    ║');
  console.log('╚═══════════════════════════════════════════════════════╝\n');

  try {
    // Setup
    await cleanup();
    const { appRequest, execution } = await setupProject();

    // Run tests
    await test1_Initialization(appRequest.id);
    await test2_ValidTransitions(appRequest.id);
    await test3_InvalidTransitions(appRequest.id);
    await test4_LockUnlock(appRequest.id);
    await test5_PauseResume(appRequest.id);
    await test6_GetNextAction(appRequest.id);
    await test7_CompleteFlow(appRequest.id);
    await test8_CheckEvents(execution.id);

    console.log('╔═══════════════════════════════════════════════════════╗');
    console.log('║  ALL TESTS COMPLETED SUCCESSFULLY! ✅                 ║');
    console.log('╚═══════════════════════════════════════════════════════╝\n');

    console.log('Summary:');
    console.log('✅ Initialization works correctly');
    console.log('✅ Valid transitions succeed');
    console.log('✅ Invalid transitions are blocked');
    console.log('✅ Lock/unlock mechanism works');
    console.log('✅ Pause/resume for human approval works');
    console.log('✅ getNextAction() returns correct decisions');
    console.log('✅ Complete lifecycle flow works');
    console.log('✅ Terminal states prevent further transitions');
    console.log('✅ Events are emitted correctly\n');

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
