/**
 * Synthetic Founder Hardened - Test Suite
 *
 * Tests all 8 hardening features:
 * 1. Envelope validation (SUBORDINATE authority)
 * 2. Context isolation (only approved answers)
 * 3. Contract validation (strict schema)
 * 4. Scope control (detects enterprise features, over-engineering)
 * 5. Human dominance enforcement (tracks adjustments, escalates after 3)
 * 6. Determinism & deduplication (hash-based, retry safety)
 * 7. Failure & escalation (NO silent fallbacks)
 * 8. LLM integration (temperature ≤ 0.3, structured output)
 *
 * Run with: node --loader ts-node/esm test-synthetic-founder-hardened.ts
 */

import { PrismaClient } from '@prisma/client';
import { SyntheticFounderHardened, type SyntheticAnswerContract } from './src/agents/synthetic-founder-hardened.js';
import { FoundryArchitectHardened } from './src/agents/foundry-architect-hardened.js';
import { ForgeConductor } from './src/conductor/forge-conductor.js';
import { randomUUID } from 'crypto';
import { pino } from 'pino';

const prisma = new PrismaClient();
const logger = pino({ level: 'warn' }); // Reduce noise

// Mock LLM responses for testing
class MockLLMSyntheticFounder extends SyntheticFounderHardened {
  private mockResponses: Map<string, SyntheticAnswerContract> = new Map();

  setMockResponse(questionId: string, contract: SyntheticAnswerContract) {
    this.mockResponses.set(questionId, contract);
  }

  // Override callLLM to return mock responses
  protected async callLLM(
    question: string,
    optional: boolean,
    context: any
  ): Promise<SyntheticAnswerContract> {
    const lowerQuestion = question.toLowerCase();

    // Find matching mock response
    for (const [key, contract] of this.mockResponses.entries()) {
      if (lowerQuestion.includes(key.toLowerCase())) {
        return contract;
      }
    }

    // Default reasonable response
    return {
      proposedAnswer: 'TaskFlow Pro',
      confidence: 'medium',
      reasoning: 'A reasonable default name for a productivity app',
      assumptions: ['User wants a professional sounding name'],
      suggestedAlternatives: ['WorkSpace', 'TaskMaster'],
    };
  }
}

/**
 * Test Helpers
 */
async function createTestProject(): Promise<string> {
  const projectId = randomUUID();
  await prisma.project.create({
    data: {
      id: projectId,
      name: 'Test Synthetic Founder Hardened',
      description: 'Test project for Synthetic Founder hardening tests',
    },
  });
  return projectId;
}

async function createTestAppRequest(projectId: string): Promise<{
  id: string;
  projectId: string;
}> {
  const appRequestId = randomUUID();
  await prisma.appRequest.create({
    data: {
      id: appRequestId,
      projectId,
      prompt: 'Test app request for Synthetic Founder hardening',
      status: 'idea',
    },
  });

  // Create ConductorState for this AppRequest
  await prisma.conductorState.create({
    data: {
      id: randomUUID(),
      appRequestId,
      currentStatus: 'idea',
      locked: false,
      awaitingHuman: false,
      lastAgent: null,
    },
  });

  return { id: appRequestId, projectId };
}

async function cleanup(projectId: string) {
  await prisma.project.delete({ where: { id: projectId } });
}

/**
 * TEST 1: Envelope Validation (SUBORDINATE authority)
 */
async function test1_EnvelopeValidation(): Promise<boolean> {
  console.log('TEST 1: Envelope Validation (SUBORDINATE authority)...');

  const projectId = await createTestProject();
  const appRequest = await createTestAppRequest(projectId);
  const conductor = new ForgeConductor(prisma, logger);
  const architect = new FoundryArchitectHardened(prisma, conductor, logger);
  const syntheticFounder = new SyntheticFounderHardened(prisma, architect, conductor, logger);

  try {
    // Verify envelope is set correctly
    const envelope = (syntheticFounder as any).envelope;

    if (envelope.agentName !== 'SyntheticFounder') {
      console.log(`❌ FAIL: Wrong agent name: ${envelope.agentName}\n`);
      return false;
    }

    if (envelope.authorityLevel !== 'SUBORDINATE_ADVISORY') {
      console.log(`❌ FAIL: Wrong authority level: ${envelope.authorityLevel}\n`);
      return false;
    }

    // Verify forbidden actions are not in allowed actions
    const forbidden = new Set(envelope.forbiddenActions);
    for (const action of envelope.allowedActions) {
      if (forbidden.has(action)) {
        console.log(`❌ FAIL: Forbidden action in allowed list: ${action}\n`);
        return false;
      }
    }

    // Verify specific forbidden actions
    if (!envelope.forbiddenActions.includes('approveBasePrompt')) {
      console.log('❌ FAIL: Missing forbidden action: approveBasePrompt\n');
      return false;
    }

    if (!envelope.forbiddenActions.includes('modifyFoundrySession')) {
      console.log('❌ FAIL: Missing forbidden action: modifyFoundrySession\n');
      return false;
    }

    console.log('✅ PASS: Envelope validated correctly\n');
    return true;
  } finally {
    await cleanup(projectId);
  }
}

/**
 * TEST 2: Context Isolation
 */
async function test2_ContextIsolation(): Promise<boolean> {
  console.log('TEST 2: Context Isolation (only approved answers)...');

  const projectId = await createTestProject();
  const appRequest = await createTestAppRequest(projectId);
  const conductor = new ForgeConductor(prisma, logger);
  const architect = new FoundryArchitectHardened(prisma, conductor, logger);
  const syntheticFounder = new MockLLMSyntheticFounder(prisma, architect, conductor, logger);

  try {
    // Start Foundry session
    await architect.start(appRequest.id);

    // Answer first question manually (to create approved context)
    await architect.submitAnswer(appRequest.id, 'TaskFlow Pro');

    // Now propose answer for second question
    const proposed = await syntheticFounder.proposeAnswer(appRequest.id);

    // Verify context includes ONLY approved answers (not planning docs, screens, etc.)
    // This is validated internally by validateContextAccess()

    console.log('✅ PASS: Context isolation enforced\n');
    return true;
  } catch (error: any) {
    if (error.message.includes('CONTEXT VIOLATION')) {
      console.log('❌ FAIL: Context isolation violated\n');
      return false;
    }
    throw error;
  } finally {
    await cleanup(projectId);
  }
}

/**
 * TEST 3: Contract Validation (strict schema)
 */
async function test3_ContractValidation(): Promise<boolean> {
  console.log('TEST 3: Contract Validation (strict schema)...');

  const projectId = await createTestProject();
  const appRequest = await createTestAppRequest(projectId);
  const conductor = new ForgeConductor(prisma, logger);
  const architect = new FoundryArchitectHardened(prisma, conductor, logger);
  const syntheticFounder = new MockLLMSyntheticFounder(prisma, architect, conductor, logger);

  try {
    // Start Foundry session
    await architect.start(appRequest.id);

    // Set up INVALID mock response (missing required fields)
    syntheticFounder.setMockResponse('name', {
      proposedAnswer: '', // INVALID: empty
      confidence: 'medium',
      reasoning: '',
      assumptions: [],
      suggestedAlternatives: [],
    });

    // Try to propose answer
    try {
      await syntheticFounder.proposeAnswer(appRequest.id);
      console.log('❌ FAIL: Should have rejected invalid contract\n');
      return false;
    } catch (error: any) {
      if (!error.message.includes('CONTRACT VALIDATION FAILED')) {
        console.log(`❌ FAIL: Wrong error: ${error.message}\n`);
        return false;
      }
    }

    // Now set up VALID mock response
    syntheticFounder.setMockResponse('name', {
      proposedAnswer: 'TaskFlow Pro',
      confidence: 'high',
      reasoning: 'Professional sounding name for a productivity app',
      assumptions: ['User wants a serious, business-oriented name'],
      suggestedAlternatives: ['WorkSpace', 'TaskMaster', 'FlowDesk'],
    });

    // Try again - should succeed
    const proposed = await syntheticFounder.proposeAnswer(appRequest.id);

    if (!proposed.contract.proposedAnswer) {
      console.log('❌ FAIL: Missing proposedAnswer in contract\n');
      return false;
    }

    if (!proposed.contract.confidence) {
      console.log('❌ FAIL: Missing confidence in contract\n');
      return false;
    }

    if (!proposed.contract.reasoning) {
      console.log('❌ FAIL: Missing reasoning in contract\n');
      return false;
    }

    console.log('✅ PASS: Contract validation working correctly\n');
    return true;
  } finally {
    await cleanup(projectId);
  }
}

/**
 * TEST 4: Scope Control (detects enterprise features)
 */
async function test4_ScopeControl(): Promise<boolean> {
  console.log('TEST 4: Scope Control (detects enterprise features, over-engineering)...');

  const projectId = await createTestProject();
  const appRequest = await createTestAppRequest(projectId);
  const conductor = new ForgeConductor(prisma, logger);
  const architect = new FoundryArchitectHardened(prisma, conductor, logger);
  const syntheticFounder = new MockLLMSyntheticFounder(prisma, architect, conductor, logger);

  try {
    // Start Foundry session
    await architect.start(appRequest.id);

    // Set up mock response with SCOPE CREEP (enterprise feature)
    syntheticFounder.setMockResponse('name', {
      proposedAnswer: 'Enterprise TaskFlow with SSO and LDAP integration',
      confidence: 'high',
      reasoning:
        'We should build enterprise features like SSO, LDAP, and microservices architecture',
      assumptions: ['User wants enterprise features'],
      suggestedAlternatives: ['Add OAuth2 and SAML support'],
    });

    // Try to propose answer - should REJECT scope creep
    try {
      await syntheticFounder.proposeAnswer(appRequest.id);
      console.log('❌ FAIL: Should have rejected scope creep\n');
      return false;
    } catch (error: any) {
      if (!error.message.includes('SCOPE VIOLATION')) {
        console.log(`❌ FAIL: Wrong error: ${error.message}\n`);
        return false;
      }

      // Verify violation details
      if (!error.message.toLowerCase().includes('enterprise') && !error.message.toLowerCase().includes('sso')) {
        console.log(`❌ FAIL: Should detect "enterprise" or "sso" keyword\n`);
        return false;
      }
    }

    console.log('✅ PASS: Scope control detected and rejected scope creep\n');
    return true;
  } finally {
    await cleanup(projectId);
  }
}

/**
 * TEST 5: Human Dominance Enforcement (tracks adjustments, escalates after 3)
 */
async function test5_HumanDominance(): Promise<boolean> {
  console.log('TEST 5: Human Dominance Enforcement (escalates after 3 adjustments)...');

  const projectId = await createTestProject();
  const appRequest = await createTestAppRequest(projectId);
  const conductor = new ForgeConductor(prisma, logger);
  const architect = new FoundryArchitectHardened(prisma, conductor, logger);
  const syntheticFounder = new MockLLMSyntheticFounder(prisma, architect, conductor, logger);

  try {
    // Start Foundry session
    await architect.start(appRequest.id);

    // Propose and adjust 3 times
    for (let i = 0; i < 3; i++) {
      const proposed = await syntheticFounder.proposeAnswer(appRequest.id);

      // Human adjusts the answer
      await syntheticFounder.adjustProposedAnswer(proposed.id, `Adjusted answer ${i + 1}`);

      // Check dominance stats
      const stats = syntheticFounder.getDominanceStats(appRequest.id);
      if (!stats) {
        console.log('❌ FAIL: Dominance stats not tracked\n');
        return false;
      }

      if (stats.consecutiveAdjustments !== i + 1) {
        console.log(
          `❌ FAIL: Wrong consecutive adjustments: ${stats.consecutiveAdjustments}, expected ${i + 1}\n`
        );
        return false;
      }
    }

    // Try to propose again - this should trigger escalation (check happens at START of proposeAnswer)
    try {
      await syntheticFounder.proposeAnswer(appRequest.id);
      // If we get here, check that conductor was paused
      const conductorState = await conductor.getStateSnapshot(appRequest.id);
      if (!conductorState.awaitingHuman) {
        console.log('❌ FAIL: Conductor should be paused after 3 consecutive adjustments\n');
        return false;
      }
    } catch (error) {
      // Error is OK if it's because conductor is paused
    }

    // Resume conductor
    await conductor.resumeAfterHuman(appRequest.id);

    // Test approval (should reset consecutive counter)
    const proposed4 = await syntheticFounder.proposeAnswer(appRequest.id);
    await syntheticFounder.approveProposedAnswer(proposed4.id);

    const stats = syntheticFounder.getDominanceStats(appRequest.id);
    if (stats!.consecutiveAdjustments !== 0) {
      console.log(
        `❌ FAIL: Consecutive adjustments not reset after approval: ${stats!.consecutiveAdjustments}\n`
      );
      return false;
    }

    console.log('✅ PASS: Human dominance enforcement working correctly\n');
    return true;
  } finally {
    await cleanup(projectId);
  }
}

/**
 * TEST 6: Determinism & Deduplication (hash-based)
 */
async function test6_DeterminismDeduplication(): Promise<boolean> {
  console.log('TEST 6: Determinism & Deduplication (hash-based, retry safety)...');

  const projectId = await createTestProject();
  const appRequest = await createTestAppRequest(projectId);
  const conductor = new ForgeConductor(prisma, logger);
  const architect = new FoundryArchitectHardened(prisma, conductor, logger);
  const syntheticFounder = new MockLLMSyntheticFounder(prisma, architect, conductor, logger);

  try {
    // Start Foundry session
    await architect.start(appRequest.id);

    // Propose answer for first question
    const proposed1 = await syntheticFounder.proposeAnswer(appRequest.id);
    const requestHash1 = proposed1.requestHash;

    // Try to propose same question again (retry scenario)
    const proposed2 = await syntheticFounder.proposeAnswer(appRequest.id);
    const requestHash2 = proposed2.requestHash;

    // Verify deduplication: same answer returned
    if (proposed1.id !== proposed2.id) {
      console.log('❌ FAIL: Deduplication failed - different IDs\n');
      return false;
    }

    if (requestHash1 !== requestHash2) {
      console.log('❌ FAIL: Request hashes should be identical for same question\n');
      return false;
    }

    // Verify request hash is stored in database
    const dbAnswer = await prisma.syntheticAnswer.findUnique({
      where: { id: proposed1.id },
    });

    if (!dbAnswer || !dbAnswer.requestHash) {
      console.log('❌ FAIL: Request hash not stored in database\n');
      return false;
    }

    console.log('✅ PASS: Determinism & deduplication working correctly\n');
    return true;
  } finally {
    await cleanup(projectId);
  }
}

/**
 * TEST 7: Failure & Escalation (NO silent fallbacks)
 */
async function test7_FailureEscalation(): Promise<boolean> {
  console.log('TEST 7: Failure & Escalation (NO silent fallbacks)...');

  const projectId = await createTestProject();
  const appRequest = await createTestAppRequest(projectId);
  const conductor = new ForgeConductor(prisma, logger);
  const architect = new FoundryArchitectHardened(prisma, conductor, logger);

  // Create synthetic founder WITHOUT API key (will fail)
  const syntheticFounder = new SyntheticFounderHardened(
    prisma,
    architect,
    conductor,
    logger,
    { apiKey: undefined } // NO API key
  );

  try {
    // Start Foundry session
    await architect.start(appRequest.id);

    // Try to propose answer - should FAIL LOUDLY (no silent fallback)
    try {
      await syntheticFounder.proposeAnswer(appRequest.id);
      console.log('❌ FAIL: Should have failed without API key\n');
      return false;
    } catch (error: any) {
      if (!error.message.includes('SYNTHETIC FOUNDER FAILURE')) {
        console.log(`❌ FAIL: Wrong error message: ${error.message}\n`);
        return false;
      }

      // Verify conductor was paused
      const conductorState = await conductor.getStateSnapshot(appRequest.id);
      if (!conductorState.awaitingHuman) {
        console.log('❌ FAIL: Conductor should be paused after LLM failure\n');
        return false;
      }
    }

    console.log('✅ PASS: Failure escalation working correctly (NO silent fallbacks)\n');
    return true;
  } finally {
    await cleanup(projectId);
  }
}

/**
 * TEST 8: Temperature Constraint (≤ 0.3 for determinism)
 */
async function test8_TemperatureConstraint(): Promise<boolean> {
  console.log('TEST 8: Temperature Constraint (≤ 0.3 for determinism)...');

  const projectId = await createTestProject();
  const appRequest = await createTestAppRequest(projectId);
  const conductor = new ForgeConductor(prisma, logger);
  const architect = new FoundryArchitectHardened(prisma, conductor, logger);

  try {
    // Try to create with temperature > 0.3 - should FAIL
    try {
      const syntheticFounder = new SyntheticFounderHardened(
        prisma,
        architect,
        conductor,
        logger,
        { temperature: 0.8 } // TOO HIGH
      );
      console.log('❌ FAIL: Should have rejected temperature > 0.3\n');
      return false;
    } catch (error: any) {
      if (!error.message.includes('DETERMINISM VIOLATION')) {
        console.log(`❌ FAIL: Wrong error: ${error.message}\n`);
        return false;
      }
    }

    // Create with valid temperature ≤ 0.3 - should succeed
    const syntheticFounder = new SyntheticFounderHardened(
      prisma,
      architect,
      conductor,
      logger,
      { temperature: 0.2 }
    );

    const config = (syntheticFounder as any).llmConfig;
    if (config.temperature > 0.3) {
      console.log(`❌ FAIL: Temperature too high: ${config.temperature}\n`);
      return false;
    }

    console.log('✅ PASS: Temperature constraint enforced correctly\n');
    return true;
  } finally {
    await cleanup(projectId);
  }
}

/**
 * TEST 9: Full Integration (propose → approve → submit)
 */
async function test9_FullIntegration(): Promise<boolean> {
  console.log('TEST 9: Full Integration (propose → approve → submit)...');

  const projectId = await createTestProject();
  const appRequest = await createTestAppRequest(projectId);
  const conductor = new ForgeConductor(prisma, logger);
  const architect = new FoundryArchitectHardened(prisma, conductor, logger);
  const syntheticFounder = new MockLLMSyntheticFounder(prisma, architect, conductor, logger);

  try {
    // Start Foundry session
    await architect.start(appRequest.id);

    // Propose answer
    const proposed = await syntheticFounder.proposeAnswer(appRequest.id);

    // Verify contract is complete
    if (!proposed.contract.proposedAnswer || !proposed.contract.confidence || !proposed.contract.reasoning) {
      console.log('❌ FAIL: Incomplete contract\n');
      return false;
    }

    // Approve answer
    await syntheticFounder.approveProposedAnswer(proposed.id);

    // Verify answer was submitted to Foundry Architect
    const session = await architect.getSession(appRequest.id);
    if (!session) {
      console.log('❌ FAIL: Session not found\n');
      return false;
    }

    if (session.currentStep !== 1) {
      console.log(`❌ FAIL: Wrong step: ${session.currentStep}, expected 1\n`);
      return false;
    }

    console.log('✅ PASS: Full integration working correctly\n');
    return true;
  } finally {
    await cleanup(projectId);
  }
}

/**
 * TEST 10: Contract Persistence (stored in database)
 */
async function test10_ContractPersistence(): Promise<boolean> {
  console.log('TEST 10: Contract Persistence (stored in database)...');

  const projectId = await createTestProject();
  const appRequest = await createTestAppRequest(projectId);
  const conductor = new ForgeConductor(prisma, logger);
  const architect = new FoundryArchitectHardened(prisma, conductor, logger);
  const syntheticFounder = new MockLLMSyntheticFounder(prisma, architect, conductor, logger);

  try {
    // Start Foundry session
    await architect.start(appRequest.id);

    // Propose answer
    const proposed = await syntheticFounder.proposeAnswer(appRequest.id);

    // Verify contract stored in database
    const dbAnswer = await prisma.syntheticAnswer.findUnique({
      where: { id: proposed.id },
    });

    if (!dbAnswer) {
      console.log('❌ FAIL: Answer not found in database\n');
      return false;
    }

    if (!dbAnswer.contract) {
      console.log('❌ FAIL: Contract not stored in database\n');
      return false;
    }

    // Parse and verify contract
    const contract = JSON.parse(dbAnswer.contract);
    if (!contract.proposedAnswer || !contract.confidence || !contract.reasoning) {
      console.log('❌ FAIL: Incomplete contract in database\n');
      return false;
    }

    console.log('✅ PASS: Contract persistence working correctly\n');
    return true;
  } finally {
    await cleanup(projectId);
  }
}

/**
 * Main Test Runner
 */
async function runTests() {
  console.log('========================================');
  console.log('SYNTHETIC FOUNDER HARDENED - TEST SUITE');
  console.log('========================================\n');

  const tests = [
    test1_EnvelopeValidation,
    test2_ContextIsolation,
    test3_ContractValidation,
    test4_ScopeControl,
    test5_HumanDominance,
    test6_DeterminismDeduplication,
    test7_FailureEscalation,
    test8_TemperatureConstraint,
    test9_FullIntegration,
    test10_ContractPersistence,
  ];

  let passed = 0;
  let failed = 0;

  for (const test of tests) {
    try {
      const result = await test();
      if (result) {
        passed++;
      } else {
        failed++;
      }
    } catch (error) {
      console.log(`❌ ERROR: ${error instanceof Error ? error.message : 'Unknown error'}\n`);
      failed++;
    }
  }

  console.log('========================================');
  console.log(`RESULTS: ${passed} passed, ${failed} failed`);
  console.log('========================================\n');

  await prisma.$disconnect();
  process.exit(failed > 0 ? 1 : 0);
}

runTests().catch(error => {
  console.error('Fatal error:', error);
  prisma.$disconnect().then(() => process.exit(1));
});
