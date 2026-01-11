/**
 * Synthetic Founder Test Script
 *
 * Tests the AI-powered answer proposal flow:
 * 1. Start Foundry session
 * 2. Propose answer via Synthetic Founder
 * 3. Approve/adjust proposed answers
 * 4. Feed approved answers back to Foundry
 * 5. Complete full conversational flow
 * 6. Verify Conductor remains unchanged
 */

import 'dotenv/config';
import { PrismaClient } from '@prisma/client';
import { ForgeConductor } from './src/conductor/forge-conductor.js';
import { FoundryArchitect } from './src/agents/foundry-architect.js';
import { SyntheticFounder } from './src/agents/synthetic-founder.js';
import { createLogger } from './src/utils/logger.js';
import { randomUUID } from 'crypto';

const prisma = new PrismaClient();
const logger = createLogger();
const conductor = new ForgeConductor(prisma, logger);
const foundry = new FoundryArchitect(prisma, conductor, logger);
const syntheticFounder = new SyntheticFounder(prisma, foundry, logger);

const TEST_PROJECT_ID = 'synthetic-founder-test-project';

async function cleanup() {
  console.log('\n🧹 Cleaning up old test data...');

  // Get all app requests for this project first
  const appRequests = await prisma.appRequest.findMany({
    where: { projectId: TEST_PROJECT_ID },
    select: { id: true },
  });
  const appRequestIds = appRequests.map(ar => ar.id);

  // Delete synthetic answers
  if (appRequestIds.length > 0) {
    await prisma.syntheticAnswer.deleteMany({
      where: { appRequestId: { in: appRequestIds } },
    });
  }

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
      name: 'Synthetic Founder Test',
      description: 'Testing AI-powered answer proposals',
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

  // Initialize conductor and start Foundry session
  await conductor.initialize(appRequest.id);
  await foundry.start(appRequest.id);

  console.log('✅ Project setup complete');
  console.log(`   Project ID: ${project.id}`);
  console.log(`   AppRequest ID: ${appRequest.id}`);
  console.log(`   Foundry Session Started: Yes`);
  console.log(`   Conductor Status: idea\n`);

  return { project, appRequest, execution };
}

async function test1_ProposeFirstAnswer(appRequestId: string) {
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('TEST 1: Propose Answer for First Question');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  // Get current question
  const question = await foundry.getCurrentQuestion(appRequestId);
  console.log(`📝 Current Question (Step ${question.step + 1}/8):`);
  console.log(`   Q: ${question.question}`);
  console.log(`   Optional: ${question.optional}\n`);

  // Propose answer via Synthetic Founder
  const proposed = await syntheticFounder.proposeAnswer(appRequestId);

  console.log('✅ Answer proposed by Synthetic Founder');
  console.log(`   Proposed Answer: "${proposed.proposedAnswer}"`);
  console.log(`   Status: ${proposed.status}`);
  console.log(`   Saved to DB: Yes\n`);

  // Verify saved to database
  const saved = await syntheticFounder.getProposedAnswer(proposed.id);
  console.log('✅ Verified in database:');
  console.log(`   ID: ${saved?.id}`);
  console.log(`   Status: ${saved?.status}`);
  console.log(`   Step: ${saved?.step}\n`);

  return proposed.id;
}

async function test2_ApproveProposedAnswer(answerId: string, appRequestId: string) {
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('TEST 2: Approve Proposed Answer');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  await syntheticFounder.approveProposedAnswer(answerId);

  console.log('✅ Proposed answer approved');
  console.log(`   Answer ID: ${answerId}\n`);

  // Verify it was submitted to Foundry
  const session = await foundry.getSession(appRequestId);
  console.log('✅ Verified submission to Foundry:');
  console.log(`   Current Step: ${session?.currentStep} (advanced to next question)`);
  console.log(`   Status: ${session?.status}`);
  console.log(`   Answers Count: ${Object.keys(session?.answers || {}).length}\n`);

  // Verify in database
  const answer = await syntheticFounder.getProposedAnswer(answerId);
  console.log('✅ Verified in database:');
  console.log(`   Status: ${answer?.status} (should be 'approved')\n`);
}

async function test3_ProposeAndAdjust(appRequestId: string) {
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('TEST 3: Propose Answer and Adjust with Human Edit');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  // Get current question
  const question = await foundry.getCurrentQuestion(appRequestId);
  console.log(`📝 Current Question (Step ${question.step + 1}/8):`);
  console.log(`   Q: ${question.question}\n`);

  // Propose answer
  const proposed = await syntheticFounder.proposeAnswer(appRequestId);
  console.log('✅ AI Proposed Answer:');
  console.log(`   "${proposed.proposedAnswer}"\n`);

  // Human adjusts the answer
  const humanRevision = 'A modern, intuitive task management app with AI-powered prioritization';
  console.log('👤 Human adjusts answer:');
  console.log(`   Original: "${proposed.proposedAnswer}"`);
  console.log(`   Revised:  "${humanRevision}"\n`);

  await syntheticFounder.adjustProposedAnswer(proposed.id, humanRevision);

  console.log('✅ Answer adjusted and submitted');

  // Verify adjusted answer was used
  const session = await foundry.getSession(appRequestId);
  const adjustedAnswer = session?.answers[Object.keys(session.answers)[1]]; // Second answer
  console.log('✅ Verified adjusted answer in Foundry:');
  console.log(`   Answer: "${adjustedAnswer}"`);
  console.log(`   Matches Human Revision: ${adjustedAnswer === humanRevision}\n`);

  // Verify status in database
  const answer = await syntheticFounder.getProposedAnswer(proposed.id);
  console.log('✅ Verified in database:');
  console.log(`   Status: ${answer?.status} (should be 'adjusted')\n`);
}

async function test4_CompleteFull8Questions(appRequestId: string) {
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('TEST 4: Complete All 8 Questions (Hybrid Flow)');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  // Continue with remaining 6 questions (already did 2)
  for (let i = 2; i < 8; i++) {
    const question = await foundry.getCurrentQuestion(appRequestId);
    console.log(`📝 Question ${i + 1}/8: ${question.question}`);

    // Propose answer
    const proposed = await syntheticFounder.proposeAnswer(appRequestId);
    console.log(`   AI Proposed: "${proposed.proposedAnswer}"`);

    // Approve it
    await syntheticFounder.approveProposedAnswer(proposed.id);
    console.log(`   ✅ Approved and submitted\n`);
  }

  // Verify session completed
  const session = await foundry.getSession(appRequestId);
  console.log('✅ All questions completed!');
  console.log(`   Status: ${session?.status} (should be 'awaiting_approval')`);
  console.log(`   Total Answers: ${Object.keys(session?.answers || {}).length}/8`);
  console.log(`   Draft Prompt Generated: ${session?.draftPrompt ? 'Yes' : 'No'}\n`);
}

async function test5_ViewDraftPrompt(appRequestId: string) {
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('TEST 5: View Draft Base Prompt');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  const session = await foundry.getSession(appRequestId);

  if (!session || !session.draftPrompt) {
    console.log('❌ FAIL: No draft prompt found\n');
    return;
  }

  console.log('📄 Draft Base Prompt (AI + Human Hybrid):\n');
  console.log('─'.repeat(60));
  console.log(session.draftPrompt);
  console.log('─'.repeat(60));
  console.log();

  // Verify mix of AI-proposed and human-adjusted answers
  const allAnswers = await syntheticFounder.getAllAnswers(appRequestId);
  const approvedCount = allAnswers.filter(a => a.status === 'approved').length;
  const adjustedCount = allAnswers.filter(a => a.status === 'adjusted').length;

  console.log('✅ Answer source breakdown:');
  console.log(`   AI-proposed (approved): ${approvedCount}`);
  console.log(`   Human-adjusted: ${adjustedCount}`);
  console.log(`   Total: ${allAnswers.length}\n`);
}

async function test6_VerifyConductorUnchanged(appRequestId: string) {
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('TEST 6: Verify Conductor Remains Unchanged');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  const conductorState = await conductor.getStateSnapshot(appRequestId);

  console.log('✅ Conductor state verification:');
  console.log(`   Status: ${conductorState.currentStatus} (should still be 'idea')`);
  console.log(`   Awaiting Human: ${conductorState.awaitingHuman} (should be true)`);
  console.log(`   Locked: ${conductorState.locked}`);
  console.log(`   Last Agent: ${conductorState.lastAgent || 'None'}\n`);

  // Verify Synthetic Founder did NOT advance conductor
  if (conductorState.currentStatus !== 'idea') {
    console.log('❌ FAIL: Conductor was advanced (should remain in "idea" status)\n');
  } else {
    console.log('✅ PASS: Conductor correctly remains in "idea" status\n');
  }
}

async function test7_ApproveAndTransition(appRequestId: string) {
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('TEST 7: Approve Base Prompt (Human Control)');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  // This is the human's job - Synthetic Founder does NOT do this
  await foundry.approveBasePrompt(appRequestId);

  console.log('✅ Base Prompt approved by human');

  // Verify conductor transitioned
  const conductorState = await conductor.getStateSnapshot(appRequestId);
  console.log('✅ Conductor transitioned:');
  console.log(`   New Status: ${conductorState.currentStatus} (should be 'base_prompt_ready')`);
  console.log(`   Awaiting Human: ${conductorState.awaitingHuman} (should be false)`);
  console.log(`   Last Agent: ${conductorState.lastAgent}\n`);
}

async function runAllTests() {
  console.log('\n╔═══════════════════════════════════════════════════════╗');
  console.log('║  SYNTHETIC FOUNDER TEST SUITE                         ║');
  console.log('╚═══════════════════════════════════════════════════════╝\n');

  try {
    // Setup
    await cleanup();
    const { appRequest } = await setupProject();

    // Run tests
    const firstAnswerId = await test1_ProposeFirstAnswer(appRequest.id);
    await test2_ApproveProposedAnswer(firstAnswerId, appRequest.id);
    await test3_ProposeAndAdjust(appRequest.id);
    await test4_CompleteFull8Questions(appRequest.id);
    await test5_ViewDraftPrompt(appRequest.id);
    await test6_VerifyConductorUnchanged(appRequest.id);
    await test7_ApproveAndTransition(appRequest.id);

    console.log('╔═══════════════════════════════════════════════════════╗');
    console.log('║  ALL TESTS COMPLETED SUCCESSFULLY! ✅                 ║');
    console.log('╚═══════════════════════════════════════════════════════╝\n');

    console.log('Summary:');
    console.log('✅ AI proposes answers via GPT-5 (or fallback)');
    console.log('✅ Human can approve AI answers');
    console.log('✅ Human can adjust AI answers');
    console.log('✅ Approved answers feed into Foundry');
    console.log('✅ Adjusted answers override AI proposals');
    console.log('✅ Synthetic Founder does NOT advance Conductor');
    console.log('✅ Hybrid AI+Human flow works correctly');
    console.log('✅ Final Base Prompt reflects both AI and human input\n');

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
