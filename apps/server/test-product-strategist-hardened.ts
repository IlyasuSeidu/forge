import { PrismaClient } from '@prisma/client';
import { ProductStrategistHardened } from './src/agents/product-strategist-hardened';
import { FoundryArchitectHardened } from './src/agents/foundry-architect-hardened';
import { ForgeConductor } from './src/conductor/forge-conductor.js';
import { randomUUID } from 'crypto';
import { pino } from 'pino';

const prisma = new PrismaClient();
const logger = pino({ level: 'warn' }); // Reduce noise

/**
 * PRODUCT STRATEGIST HARDENING TEST SUITE
 *
 * Tests all 9 hardening features:
 * 1. Envelope & Authority
 * 2. Context Isolation (Base Prompt by Hash ONLY)
 * 3. Document Output Contracts
 * 4. Feature & Scope Validation
 * 5. Immutability & Section Hashing
 * 6. Determinism Guarantees
 * 7. Failure & Escalation (NO silent fallbacks)
 * 8. Approval Flow Enforcement
 * 9. Production readiness
 */

// Test configuration
const TEST_CONFIG = {
  llmConfig: {
    provider: 'anthropic' as const,
    apiKey: process.env.ANTHROPIC_API_KEY || '',
    model: 'claude-sonnet-4-20250514',
    temperature: 0.2, // Within determinism constraint (≤ 0.3)
    maxTokens: 4000,
    retryAttempts: 3,
  },
};

// Test helpers
async function createTestProject(): Promise<string> {
  const projectId = randomUUID();
  await prisma.project.create({
    data: {
      id: projectId,
      name: 'Test Product Strategist Hardened',
      description: 'Test project for Product Strategist hardening tests',
    },
  });
  return projectId;
}

async function createTestAppRequest(projectId: string): Promise<string> {
  const appRequestId = randomUUID();
  await prisma.appRequest.create({
    data: {
      id: appRequestId,
      projectId,
      prompt: 'Build a task management app for freelancers',
      status: 'idea',
    },
  });

  // Create conductor state
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

  return appRequestId;
}

async function createApprovedBasePrompt(appRequestId: string): Promise<{ hash: string; content: string }> {
  const conductor = new ForgeConductor(prisma, logger);
  const architect = new FoundryArchitectHardened(prisma, conductor, logger);

  // Create a complete foundry session with all answers
  const session = await architect.start(appRequestId);

  // Mock answers for all 8 questions
  const mockAnswers = [
    'A task management app for freelancers',
    'Freelancers and independent consultants',
    'Help users organize projects, track tasks, and manage deadlines',
    'No enterprise features, no team collaboration, no time tracking',
    'Task lists, project organization, deadline tracking',
    'Dashboard, Task List, Project View',
    'Mobile-first, simple UI, works offline',
    'Users can create and complete tasks successfully',
  ];

  // Submit all answers (base prompt is auto-generated after last answer)
  for (let i = 0; i < 8; i++) {
    await architect.submitAnswer(appRequestId, mockAnswers[i]);
  }

  // Approve base prompt (already generated)
  await architect.approveBasePrompt(appRequestId, 'human');

  // Update conductor state to base_prompt_ready
  await prisma.conductorState.update({
    where: { appRequestId },
    data: { currentStatus: 'base_prompt_ready' },
  });

  const basePrompt = await architect.getBasePromptWithHash(appRequestId);
  return { hash: basePrompt.hash, content: basePrompt.content };
}

async function cleanupTest(projectId: string) {
  await prisma.project.delete({ where: { id: projectId } });
}

// TEST 1: Envelope Validation
async function testEnvelopeValidation(): Promise<boolean> {
  console.log('TEST 1: Envelope Validation (PLANNING_AUTHORITY)');
  const projectId = await createTestProject();
  const appRequestId = await createTestAppRequest(projectId);

  try {
    const conductor = new ForgeConductor(prisma, logger);
    const strategist = new ProductStrategistHardened(prisma, conductor, logger, null, TEST_CONFIG.llmConfig);

    // Verify envelope properties
    const envelope = (strategist as any).envelope;

    if (envelope.agentName !== 'ProductStrategist') {
      console.log('❌ FAIL: Wrong agent name\n');
      await cleanupTest(projectId);
      return false;
    }

    if (envelope.authorityLevel !== 'PLANNING_AUTHORITY') {
      console.log('❌ FAIL: Wrong authority level\n');
      await cleanupTest(projectId);
      return false;
    }

    if (!envelope.allowedActions.includes('generateMasterPlan')) {
      console.log('❌ FAIL: Missing allowed action\n');
      await cleanupTest(projectId);
      return false;
    }

    if (!envelope.forbiddenActions.includes('inventFeatures')) {
      console.log('❌ FAIL: Missing forbidden action\n');
      await cleanupTest(projectId);
      return false;
    }

    if (!envelope.forbiddenActions.includes('modifyApprovedDocuments')) {
      console.log('❌ FAIL: Missing forbidden action\n');
      await cleanupTest(projectId);
      return false;
    }

    console.log('✅ PASS: Envelope validation successful\n');
    await cleanupTest(projectId);
    return true;
  } catch (error: any) {
    console.log(`❌ FAIL: ${error.message}\n`);
    await cleanupTest(projectId);
    return false;
  }
}

// TEST 2: Context Isolation (Base Prompt by Hash ONLY)
async function testContextIsolation(): Promise<boolean> {
  console.log('TEST 2: Context Isolation (Base Prompt by Hash ONLY)');
  const projectId = await createTestProject();
  const appRequestId = await createTestAppRequest(projectId);

  try {
    const conductor = new ForgeConductor(prisma, logger);
    const strategist = new ProductStrategistHardened(prisma, conductor, logger, null, TEST_CONFIG.llmConfig);

    // Try to access Base Prompt without creating one (should fail)
    try {
      await strategist.start(appRequestId);
      console.log('❌ FAIL: Should not allow access without approved Base Prompt\n');
      await cleanupTest(projectId);
      return false;
    } catch (error: any) {
      // Should reject due to conductor state not being 'base_prompt_ready'
      if (!error.message.includes('base_prompt_ready') && !error.message.includes('Conductor state')) {
        console.log(`❌ FAIL: Wrong error message: ${error.message}\n`);
        await cleanupTest(projectId);
        return false;
      }
    }

    // Now create and approve Base Prompt
    const { hash } = await createApprovedBasePrompt(appRequestId);

    // Try again - should work
    const masterPlan = await strategist.start(appRequestId);

    // Verify basePromptHash is stored
    const doc = await prisma.planningDocument.findUnique({ where: { id: masterPlan.id } });
    if (doc?.basePromptHash !== hash) {
      console.log('❌ FAIL: Base Prompt hash not stored correctly\n');
      await cleanupTest(projectId);
      return false;
    }

    console.log('✅ PASS: Context isolation enforced\n');
    await cleanupTest(projectId);
    return true;
  } catch (error: any) {
    console.log(`❌ FAIL: ${error.message}\n`);
    await cleanupTest(projectId);
    return false;
  }
}

// TEST 3: Document Output Contracts (MasterPlanContract)
async function testDocumentContracts(): Promise<boolean> {
  console.log('TEST 3: Document Output Contracts (MasterPlanContract)');
  const projectId = await createTestProject();
  const appRequestId = await createTestAppRequest(projectId);

  try {
    await createApprovedBasePrompt(appRequestId);
    const conductor = new ForgeConductor(prisma, logger);
    const strategist = new ProductStrategistHardened(prisma, conductor, logger, null, TEST_CONFIG.llmConfig);

    // Generate Master Plan
    const masterPlan = await strategist.start(appRequestId);

    // Verify contract structure in content
    if (!masterPlan.content.includes('# Vision')) {
      console.log('❌ FAIL: Missing Vision section\n');
      await cleanupTest(projectId);
      return false;
    }

    if (!masterPlan.content.includes('# Target Audience')) {
      console.log('❌ FAIL: Missing Target Audience section\n');
      await cleanupTest(projectId);
      return false;
    }

    if (!masterPlan.content.includes('# Core Problem')) {
      console.log('❌ FAIL: Missing Core Problem section\n');
      await cleanupTest(projectId);
      return false;
    }

    if (!masterPlan.content.includes('# Core Modules')) {
      console.log('❌ FAIL: Missing Core Modules section\n');
      await cleanupTest(projectId);
      return false;
    }

    if (!masterPlan.content.includes('# Success Criteria')) {
      console.log('❌ FAIL: Missing Success Criteria section\n');
      await cleanupTest(projectId);
      return false;
    }

    console.log('✅ PASS: Document contract validation successful\n');
    await cleanupTest(projectId);
    return true;
  } catch (error: any) {
    console.log(`❌ FAIL: ${error.message}\n`);
    await cleanupTest(projectId);
    return false;
  }
}

// TEST 4: Feature & Scope Validation
async function testFeatureScopeValidation(): Promise<boolean> {
  console.log('TEST 4: Feature & Scope Validation');
  const projectId = await createTestProject();
  const appRequestId = await createTestAppRequest(projectId);

  try {
    await createApprovedBasePrompt(appRequestId);
    const conductor = new ForgeConductor(prisma, logger);
    const strategist = new ProductStrategistHardened(prisma, conductor, logger, null, TEST_CONFIG.llmConfig);

    // Generate Master Plan
    const masterPlan = await strategist.start(appRequestId);

    // Parse modules from content
    const modulesMatch = masterPlan.content.match(/# Core Modules\n\n([\s\S]*?)\n\n#/);
    if (!modulesMatch) {
      console.log('❌ FAIL: Could not parse Core Modules\n');
      await cleanupTest(projectId);
      return false;
    }

    const moduleLines = modulesMatch[1].split('\n').filter(line => line.trim());
    if (moduleLines.length === 0) {
      console.log('❌ FAIL: Core Modules cannot be empty\n');
      await cleanupTest(projectId);
      return false;
    }

    // Check that modules are reasonable for a task management app
    const modulesText = moduleLines.join(' ').toLowerCase();
    const hasTaskRelated = modulesText.includes('task') || modulesText.includes('project') || modulesText.includes('auth');

    if (!hasTaskRelated) {
      console.log('❌ FAIL: Modules do not seem related to Base Prompt\n');
      await cleanupTest(projectId);
      return false;
    }

    console.log('✅ PASS: Feature & scope validation successful\n');
    await cleanupTest(projectId);
    return true;
  } catch (error: any) {
    console.log(`❌ FAIL: ${error.message}\n`);
    await cleanupTest(projectId);
    return false;
  }
}

// TEST 5: Immutability & Section Hashing
async function testImmutabilityAndHashing(): Promise<boolean> {
  console.log('TEST 5: Immutability & Section Hashing');
  const projectId = await createTestProject();
  const appRequestId = await createTestAppRequest(projectId);

  try {
    await createApprovedBasePrompt(appRequestId);
    const conductor = new ForgeConductor(prisma, logger);
    const strategist = new ProductStrategistHardened(prisma, conductor, logger, null, TEST_CONFIG.llmConfig);

    // Generate Master Plan
    const masterPlan = await strategist.start(appRequestId);

    // Before approval, hash should not be set
    let doc = await prisma.planningDocument.findUnique({ where: { id: masterPlan.id } });
    if (doc?.documentHash) {
      console.log('❌ FAIL: Document hash should not be set before approval\n');
      await cleanupTest(projectId);
      return false;
    }

    // Approve document
    await strategist.approveDocument(appRequestId, 'MASTER_PLAN');

    // After approval, hash should be set
    doc = await prisma.planningDocument.findUnique({ where: { id: masterPlan.id } });
    if (!doc?.documentHash) {
      console.log('❌ FAIL: Document hash not set after approval\n');
      await cleanupTest(projectId);
      return false;
    }

    // Section hashes should be stored
    const sectionHashes = JSON.parse(doc.sectionHashes);
    if (Object.keys(sectionHashes).length === 0) {
      console.log('❌ FAIL: Section hashes not computed\n');
      await cleanupTest(projectId);
      return false;
    }

    // Try to reject approved document (should fail - IMMUTABLE)
    try {
      await strategist.rejectDocument(appRequestId, 'MASTER_PLAN', 'Testing immutability');
      console.log('❌ FAIL: Should not allow rejection of approved document\n');
      await cleanupTest(projectId);
      return false;
    } catch (error: any) {
      if (!error.message.includes('IMMUTABLE') && !error.message.includes('approved')) {
        console.log(`❌ FAIL: Wrong error message: ${error.message}\n`);
        await cleanupTest(projectId);
        return false;
      }
    }

    console.log('✅ PASS: Immutability & section hashing enforced\n');
    await cleanupTest(projectId);
    return true;
  } catch (error: any) {
    console.log(`❌ FAIL: ${error.message}\n`);
    await cleanupTest(projectId);
    return false;
  }
}

// TEST 6: Determinism Guarantees
async function testDeterminismGuarantees(): Promise<boolean> {
  console.log('TEST 6: Determinism Guarantees');
  const projectId = await createTestProject();
  const appRequestId = await createTestAppRequest(projectId);

  try {
    // Test temperature constraint
    try {
      const conductor = new ForgeConductor(prisma, logger);
      const strategist = new ProductStrategistHardened(prisma, conductor, logger, null, {
        ...TEST_CONFIG.llmConfig,
        temperature: 0.5, // VIOLATION: > 0.3
      });
      console.log('❌ FAIL: Should reject temperature > 0.3\n');
      await cleanupTest(projectId);
      return false;
    } catch (error: any) {
      if (!error.message.includes('DETERMINISM VIOLATION') && !error.message.includes('Temperature')) {
        console.log(`❌ FAIL: Wrong error message: ${error.message}\n`);
        await cleanupTest(projectId);
        return false;
      }
    }

    // Test with valid temperature
    await createApprovedBasePrompt(appRequestId);
    const conductor = new ForgeConductor(prisma, logger);
    const strategist = new ProductStrategistHardened(prisma, conductor, logger, null, TEST_CONFIG.llmConfig);

    const masterPlan = await strategist.start(appRequestId);

    // Check stable formatting (no timestamps in content)
    if (masterPlan.content.match(/\d{4}-\d{2}-\d{2}/) || masterPlan.content.match(/\d{2}:\d{2}:\d{2}/)) {
      console.log('❌ FAIL: Content contains timestamps (non-deterministic)\n');
      await cleanupTest(projectId);
      return false;
    }

    console.log('✅ PASS: Determinism guarantees enforced\n');
    await cleanupTest(projectId);
    return true;
  } catch (error: any) {
    console.log(`❌ FAIL: ${error.message}\n`);
    await cleanupTest(projectId);
    return false;
  }
}

// TEST 7: Failure & Escalation (NO silent fallbacks)
async function testFailureEscalation(): Promise<boolean> {
  console.log('TEST 7: Failure & Escalation (NO silent fallbacks)');
  const projectId = await createTestProject();
  const appRequestId = await createTestAppRequest(projectId);

  try {
    // Test with invalid API key (should fail loudly, not silently)
    await createApprovedBasePrompt(appRequestId);
    const conductor = new ForgeConductor(prisma, logger);
    const strategist = new ProductStrategistHardened(prisma, conductor, logger, null, {
      ...TEST_CONFIG.llmConfig,
      apiKey: 'invalid-key-12345',
    });

    try {
      await strategist.start(appRequestId);
      console.log('❌ FAIL: Should throw error with invalid API key\n');
      await cleanupTest(projectId);
      return false;
    } catch (error: any) {
      // Should get a clear error, not silent fallback
      if (!error.message || error.message.includes('fallback')) {
        console.log('❌ FAIL: Should fail loudly, not use silent fallback\n');
        await cleanupTest(projectId);
        return false;
      }
    }

    console.log('✅ PASS: Failure escalation works (no silent fallbacks)\n');
    await cleanupTest(projectId);
    return true;
  } catch (error: any) {
    console.log(`❌ FAIL: ${error.message}\n`);
    await cleanupTest(projectId);
    return false;
  }
}

// TEST 8: Approval Flow Enforcement
async function testApprovalFlowEnforcement(): Promise<boolean> {
  console.log('TEST 8: Approval Flow Enforcement');
  const projectId = await createTestProject();
  const appRequestId = await createTestAppRequest(projectId);

  try {
    await createApprovedBasePrompt(appRequestId);
    const conductor = new ForgeConductor(prisma, logger);
    const strategist = new ProductStrategistHardened(prisma, conductor, logger, null, TEST_CONFIG.llmConfig);

    // Generate Master Plan
    await strategist.start(appRequestId);

    // Try to approve Implementation Plan BEFORE Master Plan (should fail)
    try {
      await strategist.approveDocument(appRequestId, 'IMPLEMENTATION_PLAN');
      console.log('❌ FAIL: Should not allow Implementation Plan approval before Master Plan\n');
      await cleanupTest(projectId);
      return false;
    } catch (error: any) {
      if (!error.message.includes('APPROVAL FLOW VIOLATION') && !error.message.includes('Master Plan')) {
        console.log(`❌ FAIL: Wrong error message: ${error.message}\n`);
        await cleanupTest(projectId);
        return false;
      }
    }

    // Now approve Master Plan first
    await strategist.approveDocument(appRequestId, 'MASTER_PLAN');

    // Generate Implementation Plan (should work now)
    const implPlan = await strategist.start(appRequestId);

    // Approve Implementation Plan (should work now)
    await strategist.approveDocument(appRequestId, 'IMPLEMENTATION_PLAN');

    const doc = await prisma.planningDocument.findFirst({
      where: { appRequestId, type: 'IMPLEMENTATION_PLAN', status: 'approved' },
    });

    if (!doc) {
      console.log('❌ FAIL: Implementation Plan not approved\n');
      await cleanupTest(projectId);
      return false;
    }

    console.log('✅ PASS: Approval flow enforcement successful\n');
    await cleanupTest(projectId);
    return true;
  } catch (error: any) {
    console.log(`❌ FAIL: ${error.message}\n`);
    await cleanupTest(projectId);
    return false;
  }
}

// TEST 9: Document Integrity Verification
async function testDocumentIntegrityVerification(): Promise<boolean> {
  console.log('TEST 9: Document Integrity Verification');
  const projectId = await createTestProject();
  const appRequestId = await createTestAppRequest(projectId);

  try {
    await createApprovedBasePrompt(appRequestId);
    const conductor = new ForgeConductor(prisma, logger);
    const strategist = new ProductStrategistHardened(prisma, conductor, logger, null, TEST_CONFIG.llmConfig);

    // Generate and approve Master Plan
    const masterPlan = await strategist.start(appRequestId);
    await strategist.approveDocument(appRequestId, 'MASTER_PLAN');

    // Get the approved document hash
    const doc = await prisma.planningDocument.findUnique({ where: { id: masterPlan.id } });
    const originalHash = doc!.documentHash!;

    // Verify integrity with correct hash
    const isValid = await strategist.verifyDocumentIntegrity(appRequestId, 'MASTER_PLAN', originalHash);
    if (!isValid) {
      console.log('❌ FAIL: Document integrity verification failed for correct hash\n');
      await cleanupTest(projectId);
      return false;
    }

    // Verify integrity with wrong hash (tampering detected)
    const isTampered = await strategist.verifyDocumentIntegrity(appRequestId, 'MASTER_PLAN', 'wrong-hash-12345');
    if (isTampered) {
      console.log('❌ FAIL: Should detect tampering with wrong hash\n');
      await cleanupTest(projectId);
      return false;
    }

    console.log('✅ PASS: Document integrity verification successful\n');
    await cleanupTest(projectId);
    return true;
  } catch (error: any) {
    console.log(`❌ FAIL: ${error.message}\n`);
    await cleanupTest(projectId);
    return false;
  }
}

// TEST 10: Full Integration (Generate both plans)
async function testFullIntegration(): Promise<boolean> {
  console.log('TEST 10: Full Integration (Generate Master + Implementation Plans)');
  const projectId = await createTestProject();
  const appRequestId = await createTestAppRequest(projectId);

  try {
    const { hash: basePromptHash } = await createApprovedBasePrompt(appRequestId);
    const conductor = new ForgeConductor(prisma, logger);
    const strategist = new ProductStrategistHardened(prisma, conductor, logger, null, TEST_CONFIG.llmConfig);

    console.log('  → Generating Master Plan...');
    const masterPlan = await strategist.start(appRequestId);
    console.log(`  → Master Plan generated (${masterPlan.content.length} chars)`);

    console.log('  → Approving Master Plan (auto-generates Implementation Plan)...');
    const implPlan = await strategist.approveDocument(appRequestId, 'MASTER_PLAN');

    const masterDoc = await prisma.planningDocument.findUnique({ where: { id: masterPlan.id } });
    console.log(`  → Master Plan locked with hash: ${masterDoc!.documentHash!.substring(0, 16)}...`);
    console.log(`  → Implementation Plan generated (${implPlan!.content.length} chars)`);

    console.log('  → Approving Implementation Plan...');
    await strategist.approveDocument(appRequestId, 'IMPLEMENTATION_PLAN');

    const implDoc = await prisma.planningDocument.findUnique({ where: { id: implPlan!.id } });
    console.log(`  → Implementation Plan locked with hash: ${implDoc!.documentHash!.substring(0, 16)}...`);

    // Verify both documents reference the same Base Prompt
    if (masterDoc!.basePromptHash !== basePromptHash || implDoc!.basePromptHash !== basePromptHash) {
      console.log('❌ FAIL: Documents do not reference correct Base Prompt hash\n');
      await cleanupTest(projectId);
      return false;
    }

    // Verify both are approved and immutable
    if (masterDoc!.status !== 'approved' || implDoc!.status !== 'approved') {
      console.log('❌ FAIL: Documents not in approved status\n');
      await cleanupTest(projectId);
      return false;
    }

    console.log('✅ PASS: Full integration successful\n');
    await cleanupTest(projectId);
    return true;
  } catch (error: any) {
    console.log(`❌ FAIL: ${error.message}\n`);
    await cleanupTest(projectId);
    return false;
  }
}

// Run all tests
async function runAllTests() {
  console.log('═══════════════════════════════════════════════════════════');
  console.log('  PRODUCT STRATEGIST HARDENING TEST SUITE');
  console.log('═══════════════════════════════════════════════════════════\n');

  const tests = [
    { name: 'Envelope Validation', fn: testEnvelopeValidation },
    { name: 'Context Isolation', fn: testContextIsolation },
    { name: 'Document Contracts', fn: testDocumentContracts },
    { name: 'Feature & Scope Validation', fn: testFeatureScopeValidation },
    { name: 'Immutability & Hashing', fn: testImmutabilityAndHashing },
    { name: 'Determinism Guarantees', fn: testDeterminismGuarantees },
    { name: 'Failure & Escalation', fn: testFailureEscalation },
    { name: 'Approval Flow Enforcement', fn: testApprovalFlowEnforcement },
    { name: 'Document Integrity', fn: testDocumentIntegrityVerification },
    { name: 'Full Integration', fn: testFullIntegration },
  ];

  const results: boolean[] = [];

  for (const test of tests) {
    try {
      const result = await test.fn();
      results.push(result);
    } catch (error: any) {
      console.log(`❌ FAIL: ${test.name} - ${error.message}\n`);
      results.push(false);
    }
  }

  console.log('═══════════════════════════════════════════════════════════');
  console.log('  RESULTS');
  console.log('═══════════════════════════════════════════════════════════\n');

  const passed = results.filter(r => r).length;
  const total = results.length;

  console.log(`Passed: ${passed}/${total}`);
  console.log(`Failed: ${total - passed}/${total}\n`);

  if (passed === total) {
    console.log('🎉 ALL TESTS PASSED - Product Strategist is production-ready\n');
  } else {
    console.log('❌ SOME TESTS FAILED - Review hardening implementation\n');
  }

  await prisma.$disconnect();
  process.exit(passed === total ? 0 : 1);
}

// Run tests
runAllTests().catch((error) => {
  console.error('Fatal error:', error);
  prisma.$disconnect();
  process.exit(1);
});
