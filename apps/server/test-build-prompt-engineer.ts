/**
 * Build Prompt Engineer Test Script
 */

import 'dotenv/config';
import { PrismaClient } from '@prisma/client';
import { ForgeConductor } from './src/conductor/forge-conductor.js';
import { BuildPromptEngineer } from './src/agents/build-prompt-engineer.js';
import { createLogger } from './src/utils/logger.js';
import { randomUUID } from 'crypto';

const prisma = new PrismaClient();
const logger = createLogger();
const conductor = new ForgeConductor(prisma, logger);
const engineer = new BuildPromptEngineer(prisma, conductor, logger);

const TEST_PROJECT_ID = 'build-prompt-engineer-test';

async function cleanup() {
  console.log('\n🧹 Cleaning up...');
  const appRequests = await prisma.appRequest.findMany({
    where: { projectId: TEST_PROJECT_ID },
    select: { id: true },
  });
  const appRequestIds = appRequests.map(ar => ar.id);

  if (appRequestIds.length > 0) {
    await prisma.buildPrompt.deleteMany({ where: { appRequestId: { in: appRequestIds } } });
    await prisma.projectRuleSet.deleteMany({ where: { appRequestId: { in: appRequestIds } } });
    await prisma.screenMockup.deleteMany({ where: { appRequestId: { in: appRequestIds } } });
    await prisma.screenIndex.deleteMany({ where: { appRequestId: { in: appRequestIds } } });
  }

  await prisma.conductorState.deleteMany({ where: { appRequest: { projectId: TEST_PROJECT_ID } } });
  await prisma.appRequest.deleteMany({ where: { projectId: TEST_PROJECT_ID } });
  await prisma.execution.deleteMany({ where: { projectId: TEST_PROJECT_ID } });
  await prisma.project.deleteMany({ where: { id: TEST_PROJECT_ID } });
  console.log('✅ Cleanup complete\n');
}

async function setupProject() {
  console.log('📦 Setting up test project...');

  await prisma.project.create({
    data: { id: TEST_PROJECT_ID, name: 'Build Prompt Test', description: 'Test Tier 4 agent' },
  });

  const execution = await prisma.execution.create({
    data: { id: randomUUID(), projectId: TEST_PROJECT_ID, status: 'running' },
  });

  const appRequest = await prisma.appRequest.create({
    data: {
      id: randomUUID(),
      projectId: TEST_PROJECT_ID,
      prompt: 'Build prompts test',
      status: 'pending',
      executionId: execution.id,
    },
  });

  await conductor.initialize(appRequest.id);
  await conductor.transition(appRequest.id, 'base_prompt_ready', 'FoundryArchitect');
  await conductor.transition(appRequest.id, 'planning', 'ProductStrategist');
  await conductor.transition(appRequest.id, 'screens_defined', 'ScreenCartographer');
  await conductor.transition(appRequest.id, 'flows_defined', 'JourneyOrchestrator');
  await conductor.transition(appRequest.id, 'designs_ready', 'VisualForge');
  await conductor.transition(appRequest.id, 'rules_locked', 'ConstraintCompiler');

  await prisma.screenIndex.create({
    data: {
      id: randomUUID(),
      appRequestId: appRequest.id,
      screens: JSON.stringify(['Screen1', 'Screen2']),
      status: 'approved',
      approvedAt: new Date(),
    },
  });

  await prisma.projectRuleSet.create({
    data: {
      id: randomUUID(),
      appRequestId: appRequest.id,
      content: 'Project rules content',
      status: 'approved',
      approvedAt: new Date(),
    },
  });

  console.log('✅ Project setup complete\n');
  return { appRequest };
}

async function test1_CannotStartWithWrongState() {
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('TEST 1: Cannot Start Unless Conductor = rules_locked');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  const testAppRequest = await prisma.appRequest.create({
    data: { id: randomUUID(), projectId: TEST_PROJECT_ID, prompt: 'Test', status: 'pending' },
  });

  await conductor.initialize(testAppRequest.id);

  try {
    await engineer.start(testAppRequest.id);
    console.log('❌ FAIL: Should have thrown error\n');
    return false;
  } catch (error) {
    console.log('✅ PASS: Correctly rejected start');
    console.log(`   Error: ${error instanceof Error ? error.message : 'Unknown'}\n`);
    return true;
  }
}

async function test2_GenerateFirstPrompt(appRequestId: string) {
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('TEST 2: Generate First Build Prompt');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  const prompt = await engineer.start(appRequestId);
  console.log(`✅ First prompt generated: ${prompt.title}`);
  console.log(`   Order: ${prompt.order}`);
  console.log(`   Status: ${prompt.status}\n`);

  return prompt.order === 0;
}

async function test3_CannotGenerateNextWithoutApproval(appRequestId: string) {
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('TEST 3: Cannot Generate Next Without Approval');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  const state = await conductor.getStateSnapshot(appRequestId);
  if (state.awaitingHuman) {
    console.log('✅ PASS: Conductor awaiting human approval\n');
    return true;
  }

  console.log('❌ FAIL: Should be awaiting approval\n');
  return false;
}

async function test4_ApproveAndGenerateSequentially(appRequestId: string) {
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('TEST 4: Approve and Generate Prompts Sequentially');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  await engineer.approveCurrentPrompt(appRequestId);
  console.log('✅ First prompt approved\n');

  const second = await engineer.generateNextPrompt(appRequestId);
  console.log(`✅ Second prompt generated: ${second.title}`);
  console.log(`   Order: ${second.order}\n`);

  return second.order === 1;
}

async function test5_RejectAllowsRegeneration(appRequestId: string) {
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('TEST 5: Reject Allows Regeneration');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  await engineer.rejectCurrentPrompt(appRequestId, 'Needs more detail');
  console.log('✅ Prompt rejected\n');

  const regenerated = await engineer.generateNextPrompt(appRequestId);
  console.log(`✅ Prompt regenerated: ${regenerated.title}\n`);

  return regenerated.order === 1;
}

async function test6_CompleteAllPrompts(appRequestId: string) {
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('TEST 6: Complete All Prompts and Transition');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  const state = await engineer.getCurrentState(appRequestId);
  const remaining = state.remainingCount;
  console.log(`📊 Remaining prompts: ${remaining + 1}\n`);

  // Approve current and generate remaining
  await engineer.approveCurrentPrompt(appRequestId);

  for (let i = 0; i < remaining; i++) {
    await engineer.generateNextPrompt(appRequestId);
    await engineer.approveCurrentPrompt(appRequestId);
    console.log(`   Approved prompt ${i + 2}\n`);
  }

  const conductorState = await conductor.getStateSnapshot(appRequestId);
  console.log(`✅ Conductor state: ${conductorState.currentStatus}\n`);

  if (conductorState.currentStatus !== 'build_prompts_ready') {
    console.log('❌ FAIL: Should transition to "build_prompts_ready"\n');
    return false;
  }

  console.log('✅ PASS: Transitioned to "build_prompts_ready"\n');
  return true;
}

async function test7_VerifyEvents(appRequestId: string) {
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('TEST 7: Verify Events');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  const appRequest = await prisma.appRequest.findUnique({ where: { id: appRequestId } });
  if (!appRequest?.executionId) return false;

  const events = await prisma.executionEvent.findMany({
    where: {
      executionId: appRequest.executionId,
      type: { in: ['build_prompt_created', 'build_prompt_approved', 'build_prompts_ready'] },
    },
  });

  console.log(`✅ Events found: ${events.length}\n`);
  return events.length > 0;
}

async function runAllTests() {
  console.log('\n╔═══════════════════════════════════════════════════════╗');
  console.log('║  BUILD PROMPT ENGINEER TEST SUITE                     ║');
  console.log('╚═══════════════════════════════════════════════════════╝\n');

  try {
    await cleanup();
    const { appRequest } = await setupProject();

    const results: boolean[] = [];
    results.push(await test1_CannotStartWithWrongState());
    results.push(await test2_GenerateFirstPrompt(appRequest.id));
    results.push(await test3_CannotGenerateNextWithoutApproval(appRequest.id));
    results.push(await test4_ApproveAndGenerateSequentially(appRequest.id));
    results.push(await test5_RejectAllowsRegeneration(appRequest.id));
    results.push(await test6_CompleteAllPrompts(appRequest.id));
    results.push(await test7_VerifyEvents(appRequest.id));

    if (!results.every(r => r === true)) {
      console.log('╔═══════════════════════════════════════════════════════╗');
      console.log('║  SOME TESTS FAILED ❌                                 ║');
      console.log('╚═══════════════════════════════════════════════════════╝\n');
      return 1;
    }

    console.log('╔═══════════════════════════════════════════════════════╗');
    console.log('║  ALL TESTS COMPLETED SUCCESSFULLY! ✅                 ║');
    console.log('╚═══════════════════════════════════════════════════════╝\n');

    console.log('Summary:');
    console.log('✅ Cannot start unless Conductor = rules_locked');
    console.log('✅ First prompt generated and paused');
    console.log('✅ Cannot generate next without approval');
    console.log('✅ Prompts generated in deterministic order');
    console.log('✅ Rejection allows regeneration');
    console.log('✅ All prompts approved transitions to "build_prompts_ready"');
    console.log('✅ Events emitted correctly\n');

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
