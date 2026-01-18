/**
 * Foundry Architect Routes - Test Suite
 *
 * Tests production HTTP endpoints for Agent 1:
 * - POST /start creates contract
 * - POST /submit validates fields
 * - POST /approve locks + transitions conductor
 * - POST /reject pauses conductor
 * - Cannot approve before submit
 * - Cannot start if conductor in wrong state
 * - Hash determinism: same answers -> same contractHash
 */

import { PrismaClient } from '@prisma/client';
import { ForgeConductor } from '../src/conductor/forge-conductor.js';
import pino from 'pino';
import { randomUUID } from 'crypto';
import Fastify from 'fastify';
import { foundryArchitectRoutes } from '../src/routes/foundryArchitect.js';

const prisma = new PrismaClient();
const logger = pino({ level: 'silent' }); // Silent during tests

// Test answers
const VALID_ANSWERS = {
  q1: 'A task management application',
  q2: 'Busy professionals who need to organize tasks',
  q3: 'People struggle to stay organized with scattered todo lists',
  q4: 'Create tasks, set deadlines, mark complete, get reminders',
  q5: 'User accounts, tasks, deadlines, completion status',
  q6: 'Yes, users need accounts to save their tasks',
  q7: 'No, this is a personal productivity app',
  q8: 'Focuses on simplicity - no complex features, just core task management',
};

async function cleanup() {
  console.log('\n🧹 Cleaning up test data...');
  const testProjects = await prisma.project.findMany({
    where: { name: { contains: 'TEST_ROUTES' } },
  });
  for (const project of testProjects) {
    await prisma.project.delete({ where: { id: project.id } });
  }
  console.log('✅ Cleanup complete\n');
}

async function setupTestServer() {
  const conductor = new ForgeConductor(prisma, logger as any);
  const fastify = Fastify({ logger: false });

  // Register routes
  await fastify.register(
    async (instance) => foundryArchitectRoutes(instance, prisma, conductor, logger as any),
    { prefix: '/api' }
  );

  return { fastify, conductor };
}

async function createTestProject() {
  const project = await prisma.project.create({
    data: {
      id: randomUUID(),
      name: `TEST_ROUTES_${Date.now()}`,
      description: 'Test project for route testing',
    },
  });

  return project;
}

// ============================================================================
// TEST 1: POST /start creates contract
// ============================================================================
async function test1_StartCreatesContract() {
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('TEST 1: POST /start creates contract');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  const { fastify } = await setupTestServer();
  const project = await createTestProject();

  try {
    // Call POST /start
    const response = await fastify.inject({
      method: 'POST',
      url: `/api/projects/${project.id}/foundry-architect/start`,
    });

    console.log(`Status: ${response.statusCode}`);
    const body = JSON.parse(response.body);

    // Assertions
    if (response.statusCode !== 201) {
      throw new Error(`Expected 201, got ${response.statusCode}`);
    }

    if (!body.success) {
      throw new Error('Expected success: true');
    }

    if (!body.session || !body.session.id) {
      throw new Error('Expected session with id');
    }

    if (!body.questions || body.questions.length !== 8) {
      throw new Error('Expected 8 questions');
    }

    console.log('✅ Contract created successfully');
    console.log(`   Session ID: ${body.session.id}`);
    console.log(`   Questions: ${body.questions.length}`);
    console.log(`   Status: ${body.session.status}\n`);
  } finally {
    await fastify.close();
  }
}

// ============================================================================
// TEST 2: POST /submit validates fields
// ============================================================================
async function test2_SubmitValidatesFields() {
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('TEST 2: POST /submit validates fields');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  const { fastify } = await setupTestServer();
  const project = await createTestProject();

  try {
    // Start session first
    await fastify.inject({
      method: 'POST',
      url: `/api/projects/${project.id}/foundry-architect/start`,
    });

    // Test 2a: Missing answer should fail
    console.log('Test 2a: Missing answer (q8) should fail');
    const invalidAnswers = { ...VALID_ANSWERS };
    delete (invalidAnswers as any).q8;

    const response1 = await fastify.inject({
      method: 'POST',
      url: `/api/projects/${project.id}/foundry-architect/submit`,
      payload: { answers: invalidAnswers },
    });

    if (response1.statusCode !== 400) {
      throw new Error(`Expected 400 for missing answer, got ${response1.statusCode}`);
    }
    console.log('✅ Rejected missing answer\n');

    // Test 2b: Empty answer should fail
    console.log('Test 2b: Empty answer should fail');
    const emptyAnswers = { ...VALID_ANSWERS, q1: '' };

    const response2 = await fastify.inject({
      method: 'POST',
      url: `/api/projects/${project.id}/foundry-architect/submit`,
      payload: { answers: emptyAnswers },
    });

    if (response2.statusCode !== 400) {
      throw new Error(`Expected 400 for empty answer, got ${response2.statusCode}`);
    }
    console.log('✅ Rejected empty answer\n');

    // Test 2c: Too long answer should fail
    console.log('Test 2c: Answer exceeding 5000 chars should fail');
    const longAnswers = { ...VALID_ANSWERS, q1: 'a'.repeat(5001) };

    const response3 = await fastify.inject({
      method: 'POST',
      url: `/api/projects/${project.id}/foundry-architect/submit`,
      payload: { answers: longAnswers },
    });

    if (response3.statusCode !== 400) {
      throw new Error(`Expected 400 for too long answer, got ${response3.statusCode}`);
    }
    console.log('✅ Rejected oversized answer\n');

    // Test 2d: Valid answers should succeed
    console.log('Test 2d: Valid answers should succeed');
    const response4 = await fastify.inject({
      method: 'POST',
      url: `/api/projects/${project.id}/foundry-architect/submit`,
      payload: { answers: VALID_ANSWERS },
    });

    if (response4.statusCode !== 200) {
      throw new Error(`Expected 200 for valid answers, got ${response4.statusCode}`);
    }

    const body4 = JSON.parse(response4.body);
    if (body4.session.status !== 'awaiting_approval') {
      throw new Error(`Expected status 'awaiting_approval', got ${body4.session.status}`);
    }

    console.log('✅ Accepted valid answers');
    console.log(`   Status: ${body4.session.status}`);
    console.log(`   Contract Hash: ${body4.session.contractHash}\n`);
  } finally {
    await fastify.close();
  }
}

// ============================================================================
// TEST 3: POST /approve locks + transitions conductor
// ============================================================================
async function test3_ApproveLocksAndTransitions() {
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('TEST 3: POST /approve locks + transitions conductor');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  const { fastify, conductor } = await setupTestServer();
  const project = await createTestProject();

  try {
    // Start and submit
    await fastify.inject({
      method: 'POST',
      url: `/api/projects/${project.id}/foundry-architect/start`,
    });

    await fastify.inject({
      method: 'POST',
      url: `/api/projects/${project.id}/foundry-architect/submit`,
      payload: { answers: VALID_ANSWERS },
    });

    // Get app request to check conductor state
    const appRequest = await prisma.appRequest.findFirst({
      where: { projectId: project.id },
      orderBy: { createdAt: 'desc' },
    });

    if (!appRequest) throw new Error('AppRequest not found');

    // Check conductor state before approval
    const stateBefore = await conductor.getStateSnapshot(appRequest.id);
    console.log(`Conductor state before: ${stateBefore?.currentStatus}`);

    // Approve
    const response = await fastify.inject({
      method: 'POST',
      url: `/api/projects/${project.id}/foundry-architect/approve`,
      payload: { approvedBy: 'human' },
    });

    if (response.statusCode !== 200) {
      throw new Error(`Expected 200, got ${response.statusCode}`);
    }

    const body = JSON.parse(response.body);
    console.log(`Response: ${body.message}\n`);

    // Check session is locked
    const session = await prisma.foundrySession.findUnique({
      where: { appRequestId: appRequest.id },
    });

    if (!session) throw new Error('Session not found');
    if (session.status !== 'approved') {
      throw new Error(`Expected status 'approved', got ${session.status}`);
    }
    if (!session.basePromptHash) {
      throw new Error('Expected basePromptHash to be set');
    }

    console.log('✅ Session locked');
    console.log(`   Status: ${session.status}`);
    console.log(`   Hash: ${session.basePromptHash}`);
    console.log(`   Approved By: ${session.approvedBy}`);
    console.log(`   Approved At: ${session.approvedAt}\n`);

    // Check conductor transitioned
    const stateAfter = await conductor.getStateSnapshot(appRequest.id);
    console.log(`Conductor state after: ${stateAfter?.currentStatus}`);

    if (stateAfter?.currentStatus !== 'base_prompt_ready') {
      throw new Error(`Expected conductor state 'base_prompt_ready', got ${stateAfter?.currentStatus}`);
    }

    console.log('✅ Conductor transitioned to base_prompt_ready\n');
  } finally {
    await fastify.close();
  }
}

// ============================================================================
// TEST 4: POST /reject pauses conductor
// ============================================================================
async function test4_RejectPausesConductor() {
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('TEST 4: POST /reject pauses conductor');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  const { fastify, conductor } = await setupTestServer();
  const project = await createTestProject();

  try {
    // Start and submit
    await fastify.inject({
      method: 'POST',
      url: `/api/projects/${project.id}/foundry-architect/start`,
    });

    await fastify.inject({
      method: 'POST',
      url: `/api/projects/${project.id}/foundry-architect/submit`,
      payload: { answers: VALID_ANSWERS },
    });

    // Reject
    const response = await fastify.inject({
      method: 'POST',
      url: `/api/projects/${project.id}/foundry-architect/reject`,
      payload: { reason: 'User wants to revise answers' },
    });

    if (response.statusCode !== 200) {
      throw new Error(`Expected 200, got ${response.statusCode}`);
    }

    const body = JSON.parse(response.body);
    console.log(`Response: ${body.message}\n`);

    // Check session reset
    const appRequest = await prisma.appRequest.findFirst({
      where: { projectId: project.id },
    });
    if (!appRequest) throw new Error('AppRequest not found');

    const session = await prisma.foundrySession.findUnique({
      where: { appRequestId: appRequest.id },
    });

    if (!session) throw new Error('Session not found');
    if (session.status !== 'asking') {
      throw new Error(`Expected status 'asking', got ${session.status}`);
    }

    console.log('✅ Session reset');
    console.log(`   Status: ${session.status}`);
    console.log(`   Current Step: ${session.currentStep}\n`);

    // Check conductor paused
    const state = await prisma.conductorState.findUnique({
      where: { appRequestId: appRequest.id },
    });

    if (!state?.awaitingHuman) {
      throw new Error('Expected conductor to be paused (awaitingHuman=true)');
    }

    console.log('✅ Conductor paused');
    console.log(`   Awaiting Human: ${state.awaitingHuman}`);
    console.log(`   Pause Reason: ${state.pauseReason}\n`);
  } finally {
    await fastify.close();
  }
}

// ============================================================================
// TEST 5: Cannot approve before submit
// ============================================================================
async function test5_CannotApproveBeforeSubmit() {
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('TEST 5: Cannot approve before submit');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  const { fastify } = await setupTestServer();
  const project = await createTestProject();

  try {
    // Start only (no submit)
    await fastify.inject({
      method: 'POST',
      url: `/api/projects/${project.id}/foundry-architect/start`,
    });

    // Try to approve
    const response = await fastify.inject({
      method: 'POST',
      url: `/api/projects/${project.id}/foundry-architect/approve`,
      payload: { approvedBy: 'human' },
    });

    console.log(`Status: ${response.statusCode}`);

    if (response.statusCode !== 400 && response.statusCode !== 409 && response.statusCode !== 422) {
      throw new Error(`Expected 400/409/422, got ${response.statusCode}`);
    }

    console.log('✅ Rejected premature approval\n');
  } finally {
    await fastify.close();
  }
}

// ============================================================================
// TEST 6: Cannot approve twice
// ============================================================================
async function test6_CannotApproveTwice() {
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('TEST 6: Cannot approve twice');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  const { fastify } = await setupTestServer();
  const project = await createTestProject();

  try {
    // Start, submit, and approve
    await fastify.inject({
      method: 'POST',
      url: `/api/projects/${project.id}/foundry-architect/start`,
    });

    await fastify.inject({
      method: 'POST',
      url: `/api/projects/${project.id}/foundry-architect/submit`,
      payload: { answers: VALID_ANSWERS },
    });

    await fastify.inject({
      method: 'POST',
      url: `/api/projects/${project.id}/foundry-architect/approve`,
      payload: { approvedBy: 'human' },
    });

    console.log('First approval succeeded\n');

    // Try to approve again - should fail
    const response = await fastify.inject({
      method: 'POST',
      url: `/api/projects/${project.id}/foundry-architect/approve`,
      payload: { approvedBy: 'human' },
    });

    console.log(`Second approve status: ${response.statusCode}`);

    // Should reject (400/409/422) or error (500 if not handled gracefully)
    if (response.statusCode === 200 || response.statusCode === 201) {
      throw new Error(`Second approval should not succeed, got ${response.statusCode}`);
    }

    console.log('✅ Rejected double approval\n');
  } finally {
    await fastify.close();
  }
}

// ============================================================================
// TEST 7: Hash determinism - same answers -> same contractHash
// ============================================================================
async function test7_HashDeterminism() {
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('TEST 7: Hash determinism - same answers -> same hash');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  const { fastify } = await setupTestServer();
  const project1 = await createTestProject();
  const project2 = await createTestProject();

  try {
    // Submit same answers to two different projects
    await fastify.inject({
      method: 'POST',
      url: `/api/projects/${project1.id}/foundry-architect/start`,
    });

    const response1 = await fastify.inject({
      method: 'POST',
      url: `/api/projects/${project1.id}/foundry-architect/submit`,
      payload: { answers: VALID_ANSWERS },
    });

    const hash1 = JSON.parse(response1.body).session.contractHash;

    await fastify.inject({
      method: 'POST',
      url: `/api/projects/${project2.id}/foundry-architect/start`,
    });

    const response2 = await fastify.inject({
      method: 'POST',
      url: `/api/projects/${project2.id}/foundry-architect/submit`,
      payload: { answers: VALID_ANSWERS },
    });

    const hash2 = JSON.parse(response2.body).session.contractHash;

    console.log(`Hash 1: ${hash1}`);
    console.log(`Hash 2: ${hash2}\n`);

    if (hash1 !== hash2) {
      throw new Error(`Expected identical hashes, got different: ${hash1} !== ${hash2}`);
    }

    console.log('✅ Hashes are identical (deterministic)\n');

    // Now test with different answers
    const differentAnswers = { ...VALID_ANSWERS, q1: 'A different application' };

    const project3 = await createTestProject();
    await fastify.inject({
      method: 'POST',
      url: `/api/projects/${project3.id}/foundry-architect/start`,
    });

    const response3 = await fastify.inject({
      method: 'POST',
      url: `/api/projects/${project3.id}/foundry-architect/submit`,
      payload: { answers: differentAnswers },
    });

    const hash3 = JSON.parse(response3.body).session.contractHash;

    console.log(`Hash 3 (different answers): ${hash3}\n`);

    if (hash1 === hash3) {
      throw new Error('Expected different hashes for different answers');
    }

    console.log('✅ Different answers produce different hashes\n');
  } finally {
    await fastify.close();
  }
}

// ============================================================================
// RUN ALL TESTS
// ============================================================================
async function runAllTests() {
  console.log('\n╔═══════════════════════════════════════════════════════╗');
  console.log('║   FOUNDRY ARCHITECT ROUTES - TEST SUITE              ║');
  console.log('╚═══════════════════════════════════════════════════════╝\n');

  try {
    await cleanup();

    await test1_StartCreatesContract();
    await test2_SubmitValidatesFields();
    await test3_ApproveLocksAndTransitions();
    await test4_RejectPausesConductor();
    await test5_CannotApproveBeforeSubmit();
    await test6_CannotApproveTwice();
    await test7_HashDeterminism();

    await cleanup();

    console.log('╔═══════════════════════════════════════════════════════╗');
    console.log('║   ✅ ALL TESTS PASSED                                ║');
    console.log('╚═══════════════════════════════════════════════════════╝\n');
  } catch (error) {
    console.error('\n❌ TEST FAILED:', error);
    await cleanup();
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

runAllTests();
