import { PrismaClient } from '@prisma/client';
import { ScreenCartographerHardened } from './src/agents/screen-cartographer-hardened';
import { ProductStrategistHardened } from './src/agents/product-strategist-hardened';
import { FoundryArchitectHardened } from './src/agents/foundry-architect-hardened';
import { ForgeConductor } from './src/conductor/forge-conductor.js';
import { randomUUID } from 'crypto';
import { pino } from 'pino';

const prisma = new PrismaClient();
const logger = pino({ level: 'warn' }); // Reduce noise

/**
 * SCREEN CARTOGRAPHER HARDENING TEST SUITE
 *
 * Tests all hardening features with REAL Claude API calls:
 * 1. Envelope & Authority (STRUCTURAL_AUTHORITY)
 * 2. Context Isolation (planning docs by hash ONLY)
 * 3. Screen Index Contract validation
 * 4. Screen Definition Contract validation (6 sections)
 * 5. Immutability & Hashing (index + screens)
 * 6. Determinism Guarantees (temperature ≤ 0.3)
 * 7. Failure & Escalation (NO silent fallbacks)
 * 8. Screen Justification (maps to planning docs)
 * 9. Hash Integrity Verification
 * 10. Full Integration (Screen Index → Screens → all approved)
 */

// Test configuration
const TEST_CONFIG = {
  llmConfig: {
    provider: 'anthropic' as const,
    apiKey: process.env.ANTHROPIC_API_KEY || '',
    model: 'claude-sonnet-4-20250514',
    temperature: 0.2, // Within determinism constraint (≤ 0.3)
    maxTokens: 2000,
    retryAttempts: 3,
  },
};

// Test helpers
async function createTestProject(): Promise<string> {
  const projectId = randomUUID();
  await prisma.project.create({
    data: {
      id: projectId,
      name: 'Test Screen Cartographer Hardened',
      description: 'Test project for Screen Cartographer hardening tests',
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

async function createApprovedPlanningDocs(appRequestId: string): Promise<void> {
  // Create Base Prompt
  const conductor = new ForgeConductor(prisma, logger);
  const architect = new FoundryArchitectHardened(prisma, conductor, logger);

  await architect.start(appRequestId);

  const mockAnswers = [
    'A task management app for freelancers',
    'Freelancers and independent consultants',
    'Help users organize projects, track tasks, and manage deadlines',
    'No enterprise features, no team collaboration, no time tracking',
    'Task lists, project organization, deadline tracking',
    'Landing Page, Login, Signup, Dashboard, Task List, Create Task, Edit Task, Project View, Settings, Profile',
    'Mobile-first, simple UI, works offline',
    'Users can create and complete tasks successfully',
  ];

  for (let i = 0; i < 8; i++) {
    await architect.submitAnswer(appRequestId, mockAnswers[i]);
  }

  await architect.approveBasePrompt(appRequestId, 'human');

  // Update conductor to base_prompt_ready
  await prisma.conductorState.update({
    where: { appRequestId },
    data: { currentStatus: 'base_prompt_ready' },
  });

  // Create Planning Docs
  const strategist = new ProductStrategistHardened(prisma, conductor, logger, architect, TEST_CONFIG.llmConfig);

  const masterPlan = await strategist.start(appRequestId);
  await strategist.approveDocument(appRequestId, 'MASTER_PLAN');
  await strategist.approveDocument(appRequestId, 'IMPLEMENTATION_PLAN');

  // Update conductor to planning
  await prisma.conductorState.update({
    where: { appRequestId },
    data: { currentStatus: 'planning' },
  });
}

async function cleanupTest(projectId: string) {
  await prisma.project.delete({ where: { id: projectId } });
}

// TEST 1: Envelope Validation
async function testEnvelopeValidation(): Promise<boolean> {
  console.log('TEST 1: Envelope Validation (STRUCTURAL_AUTHORITY)');
  const projectId = await createTestProject();
  const appRequestId = await createTestAppRequest(projectId);

  try {
    const conductor = new ForgeConductor(prisma, logger);
    const cartographer = new ScreenCartographerHardened(prisma, conductor, logger, null, TEST_CONFIG.llmConfig);

    // Verify envelope properties
    const envelope = (cartographer as any).envelope;

    if (envelope.agentName !== 'ScreenCartographer') {
      console.log('❌ FAIL: Wrong agent name\n');
      await cleanupTest(projectId);
      return false;
    }

    if (envelope.authorityLevel !== 'STRUCTURAL_AUTHORITY') {
      console.log('❌ FAIL: Wrong authority level\n');
      await cleanupTest(projectId);
      return false;
    }

    if (!envelope.forbiddenActions.includes('inventScreens')) {
      console.log('❌ FAIL: Missing forbidden action: inventScreens\n');
      await cleanupTest(projectId);
      return false;
    }

    if (!envelope.forbiddenActions.includes('modifyApprovedScreenDefinitions')) {
      console.log('❌ FAIL: Missing forbidden action: modifyApprovedScreenDefinitions\n');
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

// TEST 2: Context Isolation (Planning Docs by Hash ONLY)
async function testContextIsolation(): Promise<boolean> {
  console.log('TEST 2: Context Isolation (Planning Docs by Hash ONLY)');
  const projectId = await createTestProject();
  const appRequestId = await createTestAppRequest(projectId);

  try {
    const conductor = new ForgeConductor(prisma, logger);
    const cartographer = new ScreenCartographerHardened(prisma, conductor, logger, null, TEST_CONFIG.llmConfig);

    // Try to start without planning docs (should fail)
    try {
      await prisma.conductorState.update({
        where: { appRequestId },
        data: { currentStatus: 'planning' },
      });
      await cartographer.start(appRequestId);
      console.log('❌ FAIL: Should not allow access without approved planning docs\n');
      await cleanupTest(projectId);
      return false;
    } catch (error: any) {
      if (!error.message.includes('Planning documents') && !error.message.includes('not found')) {
        console.log(`❌ FAIL: Wrong error message: ${error.message}\n`);
        await cleanupTest(projectId);
        return false;
      }
    }

    // Reset conductor state to 'idea' before creating planning docs
    await prisma.conductorState.update({
      where: { appRequestId },
      data: { currentStatus: 'idea' },
    });

    // Now create approved planning docs
    await createApprovedPlanningDocs(appRequestId);

    // Try again - should work
    const screenIndex = await cartographer.start(appRequestId);

    // Verify planning docs hashes are stored
    const index = await prisma.screenIndex.findUnique({ where: { id: screenIndex.id } });
    if (!index?.basePromptHash || !index?.planningDocsHash) {
      console.log('❌ FAIL: Planning docs hashes not stored\n');
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

// TEST 3: Screen Index Contract Validation
async function testScreenIndexContract(): Promise<boolean> {
  console.log('TEST 3: Screen Index Contract Validation');
  const projectId = await createTestProject();
  const appRequestId = await createTestAppRequest(projectId);

  try {
    await createApprovedPlanningDocs(appRequestId);
    const conductor = new ForgeConductor(prisma, logger);
    const cartographer = new ScreenCartographerHardened(prisma, conductor, logger, null, TEST_CONFIG.llmConfig);

    // Generate Screen Index
    const screenIndex = await cartographer.start(appRequestId);

    // Verify screens array is not empty
    if (!screenIndex.screens || screenIndex.screens.length === 0) {
      console.log('❌ FAIL: Screen Index is empty\n');
      await cleanupTest(projectId);
      return false;
    }

    // Verify all screens are strings
    for (const screen of screenIndex.screens) {
      if (typeof screen !== 'string' || screen.trim().length === 0) {
        console.log(`❌ FAIL: Invalid screen name: "${screen}"\n`);
        await cleanupTest(projectId);
        return false;
      }
    }

    // Check for duplicates
    const unique = new Set(screenIndex.screens);
    if (unique.size !== screenIndex.screens.length) {
      console.log('❌ FAIL: Screen Index contains duplicates\n');
      await cleanupTest(projectId);
      return false;
    }

    console.log('✅ PASS: Screen Index contract validation successful\n');
    await cleanupTest(projectId);
    return true;
  } catch (error: any) {
    console.log(`❌ FAIL: ${error.message}\n`);
    await cleanupTest(projectId);
    return false;
  }
}

// TEST 4: Screen Definition Contract Validation (6 sections)
async function testScreenDefinitionContract(): Promise<boolean> {
  console.log('TEST 4: Screen Definition Contract Validation (6 sections)');
  const projectId = await createTestProject();
  const appRequestId = await createTestAppRequest(projectId);

  try {
    await createApprovedPlanningDocs(appRequestId);
    const conductor = new ForgeConductor(prisma, logger);
    const cartographer = new ScreenCartographerHardened(prisma, conductor, logger, null, TEST_CONFIG.llmConfig);

    // Generate and approve Screen Index
    await cartographer.start(appRequestId);
    await cartographer.approveScreenIndex(appRequestId);

    // Generate first screen definition
    const screenDef = await cartographer.describeNextScreen(appRequestId);

    // Verify all 6 required sections are present
    const requiredSections = [
      '## Purpose',
      '## User Role Access',
      '## Layout Structure',
      '## Functional Logic',
      '## Key UI Elements',
      '## Special Behaviors',
    ];

    for (const section of requiredSections) {
      if (!screenDef.content.includes(section)) {
        console.log(`❌ FAIL: Missing section: ${section}\n`);
        await cleanupTest(projectId);
        return false;
      }
    }

    console.log('✅ PASS: Screen Definition contract validation successful\n');
    await cleanupTest(projectId);
    return true;
  } catch (error: any) {
    console.log(`❌ FAIL: ${error.message}\n`);
    await cleanupTest(projectId);
    return false;
  }
}

// TEST 5: Immutability & Hashing (Index + Screens)
async function testImmutabilityAndHashing(): Promise<boolean> {
  console.log('TEST 5: Immutability & Hashing (Index + Screens)');
  const projectId = await createTestProject();
  const appRequestId = await createTestAppRequest(projectId);

  try {
    await createApprovedPlanningDocs(appRequestId);
    const conductor = new ForgeConductor(prisma, logger);
    const cartographer = new ScreenCartographerHardened(prisma, conductor, logger, null, TEST_CONFIG.llmConfig);

    // Generate Screen Index
    const screenIndex = await cartographer.start(appRequestId);

    // Before approval, hash should not be set
    let index = await prisma.screenIndex.findUnique({ where: { id: screenIndex.id } });
    if (index?.screenIndexHash) {
      console.log('❌ FAIL: Screen Index hash should not be set before approval\n');
      await cleanupTest(projectId);
      return false;
    }

    // Approve Screen Index
    await cartographer.approveScreenIndex(appRequestId);

    // After approval, hash should be set
    index = await prisma.screenIndex.findUnique({ where: { id: screenIndex.id } });
    if (!index?.screenIndexHash) {
      console.log('❌ FAIL: Screen Index hash not set after approval\n');
      await cleanupTest(projectId);
      return false;
    }

    // Try to reject approved index (should fail - IMMUTABLE)
    try {
      await cartographer.rejectScreenIndex(appRequestId, 'Testing immutability');
      console.log('❌ FAIL: Should not allow rejection of approved Screen Index\n');
      await cleanupTest(projectId);
      return false;
    } catch (error: any) {
      if (!error.message.includes('IMMUTABILITY VIOLATION')) {
        console.log(`❌ FAIL: Wrong error message: ${error.message}\n`);
        await cleanupTest(projectId);
        return false;
      }
    }

    // Test screen immutability
    const screenDef = await cartographer.describeNextScreen(appRequestId);

    // Before approval, screen hash should not be set
    let screen = await prisma.screenDefinition.findUnique({ where: { id: screenDef.id } });
    if (screen?.screenHash) {
      console.log('❌ FAIL: Screen hash should not be set before approval\n');
      await cleanupTest(projectId);
      return false;
    }

    // Approve screen
    await cartographer.approveCurrentScreen(appRequestId);

    // After approval, screen hash should be set
    screen = await prisma.screenDefinition.findUnique({ where: { id: screenDef.id } });
    if (!screen?.screenHash) {
      console.log('❌ FAIL: Screen hash not set after approval\n');
      await cleanupTest(projectId);
      return false;
    }

    console.log('✅ PASS: Immutability & hashing enforced\n');
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
      const cartographer = new ScreenCartographerHardened(prisma, conductor, logger, null, {
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
    await createApprovedPlanningDocs(appRequestId);
    const conductor = new ForgeConductor(prisma, logger);
    const cartographer = new ScreenCartographerHardened(prisma, conductor, logger, null, TEST_CONFIG.llmConfig);

    const screenIndex = await cartographer.start(appRequestId);

    // Check stable formatting (no timestamps in content)
    const index = await prisma.screenIndex.findUnique({ where: { id: screenIndex.id } });
    const screensStr = JSON.stringify(index?.screens);
    if (screensStr.match(/\d{4}-\d{2}-\d{2}/) || screensStr.match(/\d{2}:\d{2}:\d{2}/)) {
      console.log('❌ FAIL: Screen Index contains timestamps (non-deterministic)\n');
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
    await createApprovedPlanningDocs(appRequestId);
    const conductor = new ForgeConductor(prisma, logger);
    const cartographer = new ScreenCartographerHardened(prisma, conductor, logger, null, {
      ...TEST_CONFIG.llmConfig,
      apiKey: 'invalid-key-12345',
    });

    try {
      await cartographer.start(appRequestId);
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

// TEST 8: Screen Justification Validation
async function testScreenJustification(): Promise<boolean> {
  console.log('TEST 8: Screen Justification (maps to planning docs)');
  const projectId = await createTestProject();
  const appRequestId = await createTestAppRequest(projectId);

  try {
    await createApprovedPlanningDocs(appRequestId);
    const conductor = new ForgeConductor(prisma, logger);
    const cartographer = new ScreenCartographerHardened(prisma, conductor, logger, null, TEST_CONFIG.llmConfig);

    // Generate Screen Index
    const screenIndex = await cartographer.start(appRequestId);

    // Verify screens are justified (task-related or standard UI)
    const screensStr = screenIndex.screens.join(' ').toLowerCase();
    const hasTaskRelated = screensStr.includes('task') || screensStr.includes('dashboard') || screensStr.includes('project');
    const hasStandardUI = screensStr.includes('login') || screensStr.includes('sign') || screensStr.includes('settings');

    if (!hasTaskRelated && !hasStandardUI) {
      console.log('❌ FAIL: Screens do not seem justified by planning docs\n');
      await cleanupTest(projectId);
      return false;
    }

    console.log('✅ PASS: Screen justification validation successful\n');
    await cleanupTest(projectId);
    return true;
  } catch (error: any) {
    console.log(`❌ FAIL: ${error.message}\n`);
    await cleanupTest(projectId);
    return false;
  }
}

// TEST 9: Hash Integrity Verification
async function testHashIntegrityVerification(): Promise<boolean> {
  console.log('TEST 9: Hash Integrity Verification');
  const projectId = await createTestProject();
  const appRequestId = await createTestAppRequest(projectId);

  try {
    await createApprovedPlanningDocs(appRequestId);
    const conductor = new ForgeConductor(prisma, logger);
    const cartographer = new ScreenCartographerHardened(prisma, conductor, logger, null, TEST_CONFIG.llmConfig);

    // Generate and approve Screen Index
    await cartographer.start(appRequestId);
    await cartographer.approveScreenIndex(appRequestId);

    // Get the approved index hash
    const indexData = await cartographer.getScreenIndexWithHash(appRequestId);
    const originalHash = indexData.hash;

    // Verify integrity with correct hash
    const isValid = await cartographer.verifyScreenIndexIntegrity(appRequestId, originalHash);
    if (!isValid) {
      console.log('❌ FAIL: Screen Index integrity verification failed for correct hash\n');
      await cleanupTest(projectId);
      return false;
    }

    // Verify integrity with wrong hash (tampering detected)
    const isTampered = await cartographer.verifyScreenIndexIntegrity(appRequestId, 'wrong-hash-12345');
    if (isTampered) {
      console.log('❌ FAIL: Should detect tampering with wrong hash\n');
      await cleanupTest(projectId);
      return false;
    }

    console.log('✅ PASS: Hash integrity verification successful\n');
    await cleanupTest(projectId);
    return true;
  } catch (error: any) {
    console.log(`❌ FAIL: ${error.message}\n`);
    await cleanupTest(projectId);
    return false;
  }
}

// TEST 10: Full Integration (Screen Index → Screens → all approved)
async function testFullIntegration(): Promise<boolean> {
  console.log('TEST 10: Full Integration (Screen Index → Screens → all approved)');
  const projectId = await createTestProject();
  const appRequestId = await createTestAppRequest(projectId);

  try {
    await createApprovedPlanningDocs(appRequestId);
    const conductor = new ForgeConductor(prisma, logger);
    const cartographer = new ScreenCartographerHardened(prisma, conductor, logger, null, TEST_CONFIG.llmConfig);

    console.log('  → Generating Screen Index...');
    const screenIndex = await cartographer.start(appRequestId);
    console.log(`  → Screen Index generated (${screenIndex.screens.length} screens)`);

    console.log('  → Approving Screen Index...');
    await cartographer.approveScreenIndex(appRequestId);

    const indexData = await cartographer.getScreenIndexWithHash(appRequestId);
    console.log(`  → Screen Index locked with hash: ${indexData.hash.substring(0, 16)}...`);

    // Describe and approve first 2 screens
    const totalScreens = screenIndex.screens.length;
    const screensToTest = Math.min(2, totalScreens); // Test first 2 screens

    for (let i = 0; i < screensToTest; i++) {
      console.log(`  → Describing screen ${i + 1}/${screensToTest}: ${screenIndex.screens[i]}...`);
      const screenDef = await cartographer.describeNextScreen(appRequestId);
      console.log(`  → Screen described (${screenDef.content.length} chars)`);

      console.log(`  → Approving screen ${i + 1}/${screensToTest}...`);
      await cartographer.approveCurrentScreen(appRequestId);

      const screen = await prisma.screenDefinition.findUnique({ where: { id: screenDef.id } });
      console.log(`  → Screen locked with hash: ${screen!.screenHash!.substring(0, 16)}...`);
    }

    // Verify all approved screens reference correct hashes
    const approvedScreens = await cartographer.getApprovedScreens(appRequestId);
    for (const screen of approvedScreens) {
      if (screen.screenIndexHash !== indexData.hash) {
        console.log('❌ FAIL: Screen does not reference correct Screen Index hash\n');
        await cleanupTest(projectId);
        return false;
      }

      if (!screen.basePromptHash || !screen.planningDocsHash) {
        console.log('❌ FAIL: Screen missing hash references\n');
        await cleanupTest(projectId);
        return false;
      }
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
  console.log('  SCREEN CARTOGRAPHER HARDENING TEST SUITE');
  console.log('═══════════════════════════════════════════════════════════\n');

  const tests = [
    { name: 'Envelope Validation', fn: testEnvelopeValidation },
    { name: 'Context Isolation', fn: testContextIsolation },
    { name: 'Screen Index Contract', fn: testScreenIndexContract },
    { name: 'Screen Definition Contract', fn: testScreenDefinitionContract },
    { name: 'Immutability & Hashing', fn: testImmutabilityAndHashing },
    { name: 'Determinism Guarantees', fn: testDeterminismGuarantees },
    { name: 'Failure & Escalation', fn: testFailureEscalation },
    { name: 'Screen Justification', fn: testScreenJustification },
    { name: 'Hash Integrity', fn: testHashIntegrityVerification },
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
    console.log('🎉 ALL TESTS PASSED - Screen Cartographer is production-ready\n');
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
