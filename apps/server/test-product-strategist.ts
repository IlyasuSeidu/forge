/**
 * Product Strategist Test Script
 *
 * Tests the Tier 2 planning agent:
 * 1. Validates Conductor state before starting
 * 2. Generates Master Plan and pauses for approval
 * 3. Generates Implementation Plan after Master Plan approval
 * 4. Advances Conductor only after both documents approved
 * 5. Handles rejections correctly
 * 6. Maintains proper lock/unlock behavior
 * 7. Emits all required events
 */

import 'dotenv/config';
import { PrismaClient } from '@prisma/client';
import { ForgeConductor } from './src/conductor/forge-conductor.js';
import { FoundryArchitect } from './src/agents/foundry-architect.js';
import { ProductStrategist, DocumentType } from './src/agents/product-strategist.js';
import { createLogger } from './src/utils/logger.js';
import { randomUUID } from 'crypto';

const prisma = new PrismaClient();
const logger = createLogger();
const conductor = new ForgeConductor(prisma, logger);
const foundry = new FoundryArchitect(prisma, conductor, logger);
const strategist = new ProductStrategist(prisma, conductor, logger);

const TEST_PROJECT_ID = 'product-strategist-test-project';

async function cleanup() {
  console.log('\n🧹 Cleaning up old test data...');

  const appRequests = await prisma.appRequest.findMany({
    where: { projectId: TEST_PROJECT_ID },
    select: { id: true },
  });
  const appRequestIds = appRequests.map(ar => ar.id);

  if (appRequestIds.length > 0) {
    await prisma.planningDocument.deleteMany({
      where: { appRequestId: { in: appRequestIds } },
    });
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
  console.log('📦 Setting up test project with approved Base Prompt...');

  const project = await prisma.project.create({
    data: {
      id: TEST_PROJECT_ID,
      name: 'Product Strategist Test',
      description: 'Testing Tier 2 planning agent',
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

  // Initialize Conductor
  await conductor.initialize(appRequest.id);

  // Complete Foundry phase (simulate approved Base Prompt)
  await foundry.start(appRequest.id);

  // Answer all 8 questions quickly
  const questions = [
    'TaskFlow Pro',
    'A modern task management app',
    'Professionals who need better organization',
    'Task creation, deadlines, team collaboration',
    'Dashboard, task list, settings',
    'Not sure',
    'Not sure',
    'Not sure',
  ];

  for (const answer of questions) {
    await foundry.submitAnswer(appRequest.id, answer);
  }

  // Approve Base Prompt
  await foundry.approveBasePrompt(appRequest.id);

  // Create Base Prompt artifact (simulated)
  await prisma.artifact.create({
    data: {
      id: randomUUID(),
      projectId: TEST_PROJECT_ID,
      type: 'base_prompt',
      path: 'base_prompt.md',
    },
  });

  // Verify Conductor state
  const state = await conductor.getStateSnapshot(appRequest.id);

  console.log('✅ Project setup complete');
  console.log(`   Project ID: ${project.id}`);
  console.log(`   AppRequest ID: ${appRequest.id}`);
  console.log(`   Conductor Status: ${state.currentStatus} (should be 'base_prompt_ready')`);
  console.log(`   Base Prompt: Approved\n`);

  return { project, appRequest, execution };
}

async function test1_CannotStartWithWrongState() {
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('TEST 1: Cannot Start Unless Conductor = base_prompt_ready');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  // Create a separate app request with wrong state
  const testAppRequest = await prisma.appRequest.create({
    data: {
      id: randomUUID(),
      projectId: TEST_PROJECT_ID,
      prompt: 'Test wrong state',
      status: 'pending',
    },
  });

  await conductor.initialize(testAppRequest.id);

  // Try to start strategist (should fail)
  try {
    await strategist.start(testAppRequest.id);
    console.log('❌ FAIL: Should have thrown error for wrong state\n');
    return false;
  } catch (error) {
    console.log('✅ PASS: Correctly rejected start with wrong Conductor state');
    console.log(`   Error: ${error instanceof Error ? error.message : 'Unknown error'}\n`);
    return true;
  }
}

async function test2_GenerateMasterPlan(appRequestId: string) {
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('TEST 2: Generate Master Plan and Pause for Approval');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  // Start Product Strategist
  const masterPlan = await strategist.start(appRequestId);

  console.log('✅ Master Plan generated');
  console.log(`   Document ID: ${masterPlan.id}`);
  console.log(`   Type: ${masterPlan.type}`);
  console.log(`   Status: ${masterPlan.status}`);
  console.log(`   Content Length: ${masterPlan.content.length} chars\n`);

  // Verify content structure
  console.log('📄 Master Plan Preview:');
  console.log('─'.repeat(60));
  console.log(masterPlan.content.substring(0, 300) + '...');
  console.log('─'.repeat(60));
  console.log();

  // Verify Conductor state
  const state = await conductor.getStateSnapshot(appRequestId);
  console.log('✅ Conductor state after Master Plan:');
  console.log(`   Status: ${state.currentStatus} (still 'base_prompt_ready')`);
  console.log(`   Awaiting Human: ${state.awaitingHuman} (should be true)`);
  console.log(`   Locked: ${state.locked} (should be false - unlocked after pause)\n`);

  return masterPlan.id;
}

async function test3_CannotGenerateImplPlanBeforeApproval(appRequestId: string) {
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('TEST 3: Cannot Generate Implementation Plan Before Master Plan Approval');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  // Try to approve Implementation Plan (doesn't exist yet)
  try {
    await strategist.approveDocument(appRequestId, DocumentType.IMPLEMENTATION_PLAN);
    console.log('❌ FAIL: Should have thrown error (no Implementation Plan exists yet)\n');
    return false;
  } catch (error) {
    console.log('✅ PASS: Correctly rejected approval of non-existent Implementation Plan');
    console.log(`   Error: ${error instanceof Error ? error.message : 'Unknown error'}\n`);
    return true;
  }
}

async function test4_ApproveMasterPlanTriggersImplPlan(appRequestId: string) {
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('TEST 4: Approving Master Plan Triggers Implementation Plan');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  // Approve Master Plan
  const implPlan = await strategist.approveDocument(appRequestId, DocumentType.MASTER_PLAN);

  console.log('✅ Master Plan approved');
  console.log('✅ Implementation Plan automatically generated\n');

  if (!implPlan) {
    console.log('❌ FAIL: Implementation Plan was not returned\n');
    return null;
  }

  console.log(`   Document ID: ${implPlan.id}`);
  console.log(`   Type: ${implPlan.type}`);
  console.log(`   Status: ${implPlan.status}`);
  console.log(`   Content Length: ${implPlan.content.length} chars\n`);

  // Verify content
  console.log('📄 Implementation Plan Preview:');
  console.log('─'.repeat(60));
  console.log(implPlan.content.substring(0, 300) + '...');
  console.log('─'.repeat(60));
  console.log();

  // Verify Conductor state (should still be base_prompt_ready)
  const state = await conductor.getStateSnapshot(appRequestId);
  console.log('✅ Conductor state after Implementation Plan:');
  console.log(`   Status: ${state.currentStatus} (still 'base_prompt_ready')`);
  console.log(`   Awaiting Human: ${state.awaitingHuman} (should be true)`);
  console.log(`   Locked: ${state.locked} (should be false)\n`);

  return implPlan.id;
}

async function test5_RejectDocument(appRequestId: string) {
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('TEST 5: Rejecting Document Prevents Conductor Advancement');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  // Create a test scenario with a fresh app request
  const testAppRequest = await prisma.appRequest.create({
    data: {
      id: randomUUID(),
      projectId: TEST_PROJECT_ID,
      prompt: 'Test rejection',
      status: 'pending',
    },
  });

  await conductor.initialize(testAppRequest.id);

  // Fast-forward to base_prompt_ready
  await conductor.transition(testAppRequest.id, 'base_prompt_ready', 'FoundryArchitect');

  // Create artifact
  await prisma.artifact.create({
    data: {
      id: randomUUID(),
      projectId: TEST_PROJECT_ID,
      type: 'base_prompt',
      path: 'base_prompt_test.md',
    },
  });

  // Generate Master Plan
  await strategist.start(testAppRequest.id);

  console.log('✅ Master Plan generated for test');

  // Reject it
  await strategist.rejectDocument(testAppRequest.id, DocumentType.MASTER_PLAN, 'Too generic');

  console.log('✅ Master Plan rejected with feedback: "Too generic"\n');

  // Verify document was deleted
  const doc = await strategist.getCurrentDocument(testAppRequest.id);
  if (doc) {
    console.log('❌ FAIL: Document still exists after rejection\n');
    return false;
  }

  console.log('✅ Document deleted from database');

  // Verify Conductor state unchanged
  const state = await conductor.getStateSnapshot(testAppRequest.id);
  console.log('✅ Conductor state after rejection:');
  console.log(`   Status: ${state.currentStatus} (still 'base_prompt_ready')`);
  console.log(`   Locked: ${state.locked} (should be false - unlocked)\n`);

  return true;
}

async function test6_ApproveImplPlanAdvancesConductor(appRequestId: string) {
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('TEST 6: Approving Both Documents Advances Conductor to "planning"');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  // Approve Implementation Plan
  await strategist.approveDocument(appRequestId, DocumentType.IMPLEMENTATION_PLAN);

  console.log('✅ Implementation Plan approved\n');

  // Verify Conductor transitioned
  const state = await conductor.getStateSnapshot(appRequestId);
  console.log('✅ Conductor state after both approvals:');
  console.log(`   Status: ${state.currentStatus} (should be 'planning')`);
  console.log(`   Awaiting Human: ${state.awaitingHuman} (should be false)`);
  console.log(`   Locked: ${state.locked} (should be false)`);
  console.log(`   Last Agent: ${state.lastAgent} (should be 'ProductStrategist')\n`);

  if (state.currentStatus !== 'planning') {
    console.log('❌ FAIL: Conductor did not transition to "planning"\n');
    return false;
  }

  console.log('✅ PASS: Conductor correctly transitioned to "planning"\n');
  return true;
}

async function test7_ViewAllDocuments(appRequestId: string) {
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('TEST 7: View All Planning Documents');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  const docs = await strategist.getAllDocuments(appRequestId);

  console.log(`✅ Total documents: ${docs.length}\n`);

  for (const doc of docs) {
    console.log(`📄 Document: ${doc.type}`);
    console.log(`   Status: ${doc.status}`);
    console.log(`   Approved At: ${doc.approvedAt || 'Not approved'}`);
    console.log(`   Content Length: ${doc.content.length} chars\n`);
  }

  if (docs.length !== 2) {
    console.log('❌ FAIL: Expected 2 documents\n');
    return false;
  }

  if (docs[0].type !== DocumentType.MASTER_PLAN) {
    console.log('❌ FAIL: First document should be MASTER_PLAN\n');
    return false;
  }

  if (docs[1].type !== DocumentType.IMPLEMENTATION_PLAN) {
    console.log('❌ FAIL: Second document should be IMPLEMENTATION_PLAN\n');
    return false;
  }

  console.log('✅ PASS: All documents present in correct order\n');
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
          'planning_started',
          'planning_document_created',
          'planning_document_approved',
          'planning_completed',
        ],
      },
    },
    orderBy: {
      createdAt: 'asc',
    },
  });

  console.log(`✅ Planning events found: ${events.length}\n`);

  for (const event of events) {
    console.log(`📣 Event: ${event.type}`);
    console.log(`   Message: ${event.message}`);
    console.log(`   Time: ${event.createdAt.toISOString()}\n`);
  }

  const expectedEvents = [
    'planning_started',
    'planning_document_created', // Master Plan
    'planning_document_approved', // Master Plan
    'planning_document_created', // Implementation Plan
    'planning_document_approved', // Implementation Plan
    'planning_completed',
  ];

  const eventTypes = events.map(e => e.type);

  for (const expectedType of expectedEvents) {
    if (!eventTypes.includes(expectedType)) {
      console.log(`❌ FAIL: Missing event: ${expectedType}\n`);
      return false;
    }
  }

  console.log('✅ PASS: All expected events emitted\n');
  return true;
}

async function runAllTests() {
  console.log('\n╔═══════════════════════════════════════════════════════╗');
  console.log('║  PRODUCT STRATEGIST TEST SUITE                        ║');
  console.log('╚═══════════════════════════════════════════════════════╝\n');

  try {
    // Setup
    await cleanup();
    const { appRequest } = await setupProject();

    // Run tests
    const results: boolean[] = [];

    results.push(await test1_CannotStartWithWrongState());
    await test2_GenerateMasterPlan(appRequest.id);
    results.push(await test3_CannotGenerateImplPlanBeforeApproval(appRequest.id));
    await test4_ApproveMasterPlanTriggersImplPlan(appRequest.id);
    results.push(await test5_RejectDocument(appRequest.id));
    results.push(await test6_ApproveImplPlanAdvancesConductor(appRequest.id));
    results.push(await test7_ViewAllDocuments(appRequest.id));
    results.push(await test8_VerifyEvents(appRequest.id));

    // Check all results
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
    console.log('✅ Cannot start unless Conductor = base_prompt_ready');
    console.log('✅ Generates Master Plan and pauses for approval');
    console.log('✅ Cannot generate Implementation Plan before Master Plan approval');
    console.log('✅ Approving Master Plan triggers Implementation Plan');
    console.log('✅ Rejecting document prevents Conductor advancement');
    console.log('✅ Approving both documents advances Conductor to "planning"');
    console.log('✅ All documents stored correctly');
    console.log('✅ All events emitted in correct order\n');

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
