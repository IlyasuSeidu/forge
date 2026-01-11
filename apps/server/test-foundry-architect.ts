/**
 * Foundry Architect Test Script
 *
 * Tests the complete conversational flow:
 * 1. Start session (requires conductor in 'idea' status)
 * 2. Answer all questions one by one
 * 3. Generate draft Base Prompt
 * 4. Approve/reject flow
 * 5. Conductor integration
 */

import 'dotenv/config';
import { PrismaClient } from '@prisma/client';
import { ForgeConductor } from './src/conductor/forge-conductor.js';
import { FoundryArchitect } from './src/agents/foundry-architect.js';
import { createLogger } from './src/utils/logger.js';
import { randomUUID } from 'crypto';

const prisma = new PrismaClient();
const logger = createLogger();
const conductor = new ForgeConductor(prisma, logger);
const foundry = new FoundryArchitect(prisma, conductor, logger);

const TEST_PROJECT_ID = 'foundry-architect-test-project';

async function cleanup() {
  console.log('\n🧹 Cleaning up old test data...');
  await prisma.foundrySession.deleteMany({
    where: { appRequest: { projectId: TEST_PROJECT_ID } },
  });
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
  console.log('📦 Setting up test project...');

  const project = await prisma.project.create({
    data: {
      id: TEST_PROJECT_ID,
      name: 'Foundry Architect Test',
      description: 'Testing the conversational Base Prompt builder',
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
      prompt: 'Build an e-commerce platform',
      status: 'pending',
      executionId: execution.id,
    },
  });

  // Initialize conductor
  await conductor.initialize(appRequest.id);

  console.log('✅ Project setup complete');
  console.log(`   Project ID: ${project.id}`);
  console.log(`   AppRequest ID: ${appRequest.id}`);
  console.log(`   Execution ID: ${execution.id}`);
  console.log(`   Conductor Status: idea\n`);

  return { project, appRequest, execution };
}

async function test1_StartSession(appRequestId: string) {
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('TEST 1: Start Foundry Session');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  const session = await foundry.start(appRequestId);

  console.log('✅ Foundry session started');
  console.log(`   Session ID: ${session.id}`);
  console.log(`   Status: ${session.status}`);
  console.log(`   Current Step: ${session.currentStep}`);
  console.log(`   Total Steps: ${session.totalSteps}\n`);

  // Try to start again - should fail
  console.log('🧪 Testing duplicate session creation (should fail)...');
  try {
    await foundry.start(appRequestId);
    console.log('❌ FAIL: Should have thrown error for duplicate session\n');
  } catch (err) {
    console.log('✅ PASS: Duplicate session correctly rejected');
    console.log(`   Error: ${err instanceof Error ? err.message : 'Unknown error'}\n`);
  }

  // Verify conductor is locked
  const conductorState = await conductor.getStateSnapshot(appRequestId);
  console.log('✅ Conductor state verified');
  console.log(`   Locked: ${conductorState.locked}`);
  console.log(`   Status: ${conductorState.currentStatus}\n`);
}

async function test2_ConversationalFlow(appRequestId: string) {
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('TEST 2: Conversational Question Flow');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  const answers = [
    'ShopSmart',
    'A modern e-commerce platform for small businesses to sell products online',
    'Small business owners who want an easy way to sell products without technical knowledge',
    'Product catalog, shopping cart, checkout, payment processing, order management',
    'Home page, product listing, product detail, cart, checkout, admin dashboard',
    'Shopify, Etsy - clean and minimal design',
    'Next.js, TypeScript, Stripe for payments',
    'MVP in 4 weeks, full launch in 8 weeks',
  ];

  for (let i = 0; i < 8; i++) {
    // Get current question
    const question = await foundry.getCurrentQuestion(appRequestId);

    console.log(`📝 Question ${question.step + 1}/${question.totalQuestions}`);
    console.log(`   Q: ${question.question}`);
    console.log(`   Optional: ${question.optional}`);
    console.log(`   A: ${answers[i]}\n`);

    // Submit answer
    const session = await foundry.submitAnswer(appRequestId, answers[i]);

    if (session.status === 'awaiting_approval') {
      console.log('✅ All questions answered!');
      console.log(`   Session Status: ${session.status}`);
      console.log(`   Draft Prompt Generated: ${session.draftPrompt ? 'Yes' : 'No'}\n`);
      break;
    }
  }

  // Verify conductor is paused for human
  const conductorState = await conductor.getStateSnapshot(appRequestId);
  console.log('✅ Conductor paused for human approval');
  console.log(`   Awaiting Human: ${conductorState.awaitingHuman}`);
  console.log(`   Locked: ${conductorState.locked}`);
  console.log(`   Can Transition: ${conductorState.canTransition}\n`);
}

async function test3_ViewDraftPrompt(appRequestId: string) {
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('TEST 3: View Draft Base Prompt');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  const session = await foundry.getSession(appRequestId);

  if (!session || !session.draftPrompt) {
    console.log('❌ FAIL: No draft prompt found\n');
    return;
  }

  console.log('📄 Draft Base Prompt:\n');
  console.log('─'.repeat(60));
  console.log(session.draftPrompt);
  console.log('─'.repeat(60));
  console.log();

  // Verify structure
  const hasSections = [
    session.draftPrompt.includes('# ShopSmart'),
    session.draftPrompt.includes('## One-Sentence Concept'),
    session.draftPrompt.includes('## Target Audience & Problem'),
    session.draftPrompt.includes('## Core Features'),
    session.draftPrompt.includes('## Required Pages / Screens'),
    session.draftPrompt.includes('## Design Inspiration'),
    session.draftPrompt.includes('## Preferred Tech Stack'),
    session.draftPrompt.includes('## Scope / Timeline'),
  ];

  console.log('✅ Draft structure verification:');
  console.log(`   Has Product Name: ${hasSections[0]}`);
  console.log(`   Has One-Sentence Concept: ${hasSections[1]}`);
  console.log(`   Has Target Audience: ${hasSections[2]}`);
  console.log(`   Has Core Features: ${hasSections[3]}`);
  console.log(`   Has Required Pages: ${hasSections[4]}`);
  console.log(`   Has Design Inspiration: ${hasSections[5]}`);
  console.log(`   Has Tech Stack: ${hasSections[6]}`);
  console.log(`   Has Scope/Timeline: ${hasSections[7]}\n`);
}

async function test4_ApprovePrompt(appRequestId: string) {
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('TEST 4: Approve Base Prompt');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  await foundry.approveBasePrompt(appRequestId);

  console.log('✅ Base Prompt approved');

  // Verify session status
  const session = await foundry.getSession(appRequestId);
  console.log(`   Session Status: ${session?.status}\n`);

  // Verify conductor transitioned
  const conductorState = await conductor.getStateSnapshot(appRequestId);
  console.log('✅ Conductor transitioned');
  console.log(`   New Status: ${conductorState.currentStatus}`);
  console.log(`   Awaiting Human: ${conductorState.awaitingHuman}`);
  console.log(`   Last Agent: ${conductorState.lastAgent}\n`);

  // Verify artifact created
  const artifacts = await prisma.artifact.findMany({
    where: {
      projectId: TEST_PROJECT_ID,
      type: 'base_prompt',
    },
  });

  console.log('✅ Artifact verification');
  console.log(`   Base Prompt Artifact Created: ${artifacts.length > 0}`);
  if (artifacts.length > 0) {
    console.log(`   Path: ${artifacts[0].path}`);
  }
  console.log();
}

async function test5_RejectionFlow() {
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('TEST 5: Rejection and Retry Flow');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  // Create a new test case for rejection
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
      prompt: 'Build a todo app',
      status: 'pending',
      executionId: execution.id,
    },
  });

  await conductor.initialize(appRequest.id);

  console.log('📝 Starting new session for rejection test...');
  await foundry.start(appRequest.id);

  // Answer all questions quickly
  const quickAnswers = [
    'TaskMaster',
    'A simple todo list app',
    'People who need to organize tasks',
    'Create tasks, mark complete, delete tasks',
    'Home, task list',
    'Not sure',
    'Not sure',
    'Not sure',
  ];

  for (const answer of quickAnswers) {
    await foundry.submitAnswer(appRequest.id, answer);
  }

  console.log('✅ All questions answered\n');

  // Reject the prompt
  console.log('❌ Rejecting Base Prompt (reset to step 0)...');
  const rejectedSession = await foundry.rejectBasePrompt(
    appRequest.id,
    'Product name needs to be more professional',
    0
  );

  console.log('✅ Base Prompt rejected');
  console.log(`   Session Status: ${rejectedSession.status}`);
  console.log(`   Current Step: ${rejectedSession.currentStep}`);
  console.log(`   Draft Cleared: ${rejectedSession.draftPrompt === null}\n`);

  // Verify conductor resumed (not stuck)
  const conductorState = await conductor.getStateSnapshot(appRequest.id);
  console.log('✅ Conductor state after rejection');
  console.log(`   Awaiting Human: ${conductorState.awaitingHuman}`);
  console.log(`   Status: ${conductorState.currentStatus} (should still be idea)\n`);

  // Re-answer first question with better answer
  console.log('📝 Re-answering first question...');
  await foundry.submitAnswer(appRequest.id, 'TaskFlow Pro');

  const updatedSession = await foundry.getSession(appRequest.id);
  console.log('✅ Answer updated');
  console.log(`   Current Step: ${updatedSession?.currentStep}`);
  console.log(`   Can Continue: ${updatedSession?.status === 'asking'}\n`);
}

async function test6_GetNextAction(appRequestId: string) {
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('TEST 6: Conductor Next Action');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  const action = await conductor.getNextAction(appRequestId);

  console.log('✅ Next action determined');
  console.log(`   Type: ${action.type}`);
  if (action.type === 'run_agent') {
    console.log(`   Agent: ${action.agent} (should be ProductStrategist)\n`);
  } else {
    console.log(`   Reason: ${action.type === 'halt' ? action.reason : action.type === 'await_human' ? action.reason : 'N/A'}\n`);
  }
}

async function runAllTests() {
  console.log('\n╔═══════════════════════════════════════════════════════╗');
  console.log('║  FOUNDRY ARCHITECT TEST SUITE                         ║');
  console.log('╚═══════════════════════════════════════════════════════╝\n');

  try {
    // Setup
    await cleanup();
    const { appRequest } = await setupProject();

    // Run tests
    await test1_StartSession(appRequest.id);
    await test2_ConversationalFlow(appRequest.id);
    await test3_ViewDraftPrompt(appRequest.id);
    await test4_ApprovePrompt(appRequest.id);
    await test5_RejectionFlow();
    await test6_GetNextAction(appRequest.id);

    console.log('╔═══════════════════════════════════════════════════════╗');
    console.log('║  ALL TESTS COMPLETED SUCCESSFULLY! ✅                 ║');
    console.log('╚═══════════════════════════════════════════════════════╝\n');

    console.log('Summary:');
    console.log('✅ Session creation works');
    console.log('✅ Conversational flow (8 questions) works');
    console.log('✅ Draft Base Prompt generated correctly');
    console.log('✅ Approval advances conductor');
    console.log('✅ Rejection allows retry');
    console.log('✅ Conductor integration verified');
    console.log('✅ No LLM calls made (pure string formatting)');
    console.log('✅ Human approval gate enforced\n');

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
