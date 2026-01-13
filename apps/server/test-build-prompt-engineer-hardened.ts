/**
 * Build Prompt Engineer Hardened - Comprehensive Test Suite
 *
 * Tests all 10 constitutional requirements from Prompt #9.6
 */

import { PrismaClient } from '@prisma/client';
import { ForgeConductor } from './src/conductor/forge-conductor.js';
import { BuildPromptEngineerHardened } from './src/agents/build-prompt-engineer-hardened.js';
import pino from 'pino';
import { randomUUID } from 'crypto';

const prisma = new PrismaClient();
const logger = pino({ level: 'silent' }); // Silent for tests
const conductor = new ForgeConductor(prisma, logger);

let testAppRequestId: string;

/**
 * Setup: Create a complete test context with all required hash-locked artifacts
 */
async function setupTestContext(): Promise<string> {
  const appRequestId = randomUUID();
  const projectId = randomUUID();

  const executionId = randomUUID();

  // Create Project first (required for AppRequest)
  await prisma.project.create({
    data: {
      id: projectId,
      name: 'Test E-Commerce Project',
      description: 'Test project for Build Prompt Engineer Hardened',
    },
  });

  // Create Execution
  await prisma.execution.create({
    data: {
      id: executionId,
      projectId,
      status: 'running',
    },
  });

  // Create AppRequest
  await prisma.appRequest.create({
    data: {
      id: appRequestId,
      projectId,
      prompt: 'Test e-commerce app',
      status: 'active',
      executionId,
    },
  });

  // Create approved ProjectRuleSet (hash-locked)
  await prisma.projectRuleSet.create({
    data: {
      id: randomUUID(),
      appRequestId,
      content: 'Tech stack: Express + TypeScript\nDatabase: SQLite\nFramework: React',
      status: 'approved',
      rulesHash: 'abc123rulesHash',
      approvedAt: new Date(),
    },
  });

  // Create approved ScreenIndex (hash-locked)
  await prisma.screenIndex.create({
    data: {
      id: randomUUID(),
      appRequestId,
      screens: JSON.stringify([
        { name: 'Product List', description: 'Show all products' },
        { name: 'Product Details', description: 'Show single product' },
        { name: 'Shopping Cart', description: 'View cart items' },
      ]),
      status: 'approved',
      screenIndexHash: 'def456screenHash',
      screenIndexVersion: 1,
      approvedAt: new Date(),
      basePromptHash: 'base123',
      planningDocsHash: 'planning456',
    },
  });

  // Create approved UserJourneys (hash-locked)
  await prisma.userJourney.create({
    data: {
      id: randomUUID(),
      appRequestId,
      roleName: 'Customer',
      content: 'Browse products → Add to cart → Checkout',
      order: 1,
      status: 'approved',
      journeyHash: 'journey789hash',
      approvedAt: new Date(),
    },
  });

  await prisma.userJourney.create({
    data: {
      id: randomUUID(),
      appRequestId,
      roleName: 'Admin',
      content: 'Manage products → View orders',
      order: 2,
      status: 'approved',
      journeyHash: 'journeyABChash',
      approvedAt: new Date(),
    },
  });

  // Create approved ScreenMockups (hash-locked)
  await prisma.screenMockup.create({
    data: {
      id: randomUUID(),
      appRequestId,
      screenName: 'Product List',
      layoutType: 'desktop',
      imagePath: '/mockups/product-list.png',
      promptMetadata: JSON.stringify({ contract: 'test', imageHash: 'imageABC123' }),
      mockupHash: 'mockupXYZhash',
      imageHash: 'imageABC123',
      status: 'approved',
      approvedAt: new Date(),
    },
  });

  await prisma.screenMockup.create({
    data: {
      id: randomUUID(),
      appRequestId,
      screenName: 'Product Details',
      layoutType: 'desktop',
      imagePath: '/mockups/product-details.png',
      promptMetadata: JSON.stringify({ contract: 'test', imageHash: 'imageDEF456' }),
      mockupHash: 'mockupDEFhash',
      imageHash: 'imageDEF456',
      status: 'approved',
      approvedAt: new Date(),
    },
  });

  await prisma.screenMockup.create({
    data: {
      id: randomUUID(),
      appRequestId,
      screenName: 'Shopping Cart',
      layoutType: 'desktop',
      imagePath: '/mockups/shopping-cart.png',
      promptMetadata: JSON.stringify({ contract: 'test', imageHash: 'imageGHI789' }),
      mockupHash: 'mockupGHIhash',
      imageHash: 'imageGHI789',
      status: 'approved',
      approvedAt: new Date(),
    },
  });

  // Create ConductorState and set to rules_locked
  await prisma.conductorState.create({
    data: {
      id: randomUUID(),
      appRequestId,
      currentStatus: 'rules_locked',
      locked: false,
      awaitingHuman: false,
    },
  });

  return appRequestId;
}

/**
 * Cleanup test data
 */
async function cleanup(appRequestId: string) {
  const appRequest = await prisma.appRequest.findUnique({ where: { id: appRequestId } });
  if (!appRequest) return;

  await prisma.buildPrompt.deleteMany({ where: { appRequestId } });
  await prisma.screenMockup.deleteMany({ where: { appRequestId } });
  await prisma.userJourney.deleteMany({ where: { appRequestId } });
  await prisma.screenIndex.deleteMany({ where: { appRequestId } });
  await prisma.projectRuleSet.deleteMany({ where: { appRequestId } });
  await prisma.conductorState.deleteMany({ where: { appRequestId } });

  if (appRequest.executionId) {
    await prisma.executionEvent.deleteMany({ where: { executionId: appRequest.executionId } });
    await prisma.execution.deleteMany({ where: { id: appRequest.executionId } });
  }

  await prisma.appRequest.deleteMany({ where: { id: appRequestId } });
  await prisma.project.deleteMany({ where: { id: appRequest.projectId } });
}

/**
 * TEST 1: Cannot start unless conductor = rules_locked
 */
async function test1_cannotStartUnlessRulesLocked() {
  console.log('\n🧪 TEST 1: Cannot start unless conductor = rules_locked');

  const appRequestId = await setupTestContext();
  const engineer = new BuildPromptEngineerHardened(prisma, conductor, logger);

  try {
    // Change conductor state to something other than rules_locked
    await prisma.conductorState.update({
      where: { appRequestId },
      data: { currentStatus: 'planning_complete' },
    });

    // Attempt to start - should fail
    await engineer.start(appRequestId);

    console.log('❌ FAILED: Should have thrown error for invalid conductor state');
    await cleanup(appRequestId);
    return false;
  } catch (error: any) {
    if (error.message.includes('CONDUCTOR STATE VIOLATION')) {
      console.log('✅ PASSED: Correctly rejected start with wrong conductor state');
      await cleanup(appRequestId);
      return true;
    } else {
      console.log(`❌ FAILED: Wrong error: ${error.message}`);
      await cleanup(appRequestId);
      return false;
    }
  }
}

/**
 * TEST 2: Cannot reference non-hash-approved artifacts
 */
async function test2_cannotReferenceNonHashApproved() {
  console.log('\n🧪 TEST 2: Cannot reference non-hash-approved artifacts');

  const appRequestId = randomUUID();
  const projectId = randomUUID();
  const executionId = randomUUID();

  // Create Project first
  await prisma.project.create({
    data: {
      id: projectId,
      name: 'Test Project',
      description: 'Test',
    },
  });

  // Create Execution
  await prisma.execution.create({
    data: {
      id: executionId,
      projectId,
      status: 'running',
    },
  });

  // Create AppRequest
  await prisma.appRequest.create({
    data: {
      id: appRequestId,
      projectId,
      prompt: 'Test app',
      status: 'active',
      executionId,
    },
  });

  // Create ProjectRuleSet WITHOUT hash (not approved properly)
  await prisma.projectRuleSet.create({
    data: {
      id: randomUUID(),
      appRequestId,
      content: 'Tech stack: React',
      status: 'approved', // Status is approved but hash is missing
      rulesHash: null, // MISSING HASH
      approvedAt: new Date(),
    },
  });

  // Set conductor state
  await prisma.conductorState.create({
    data: {
      id: randomUUID(),
      appRequestId,
      currentStatus: 'rules_locked',
      locked: false,
      awaitingHuman: false,
    },
  });

  const engineer = new BuildPromptEngineerHardened(prisma, conductor, logger);

  try {
    await engineer.start(appRequestId);

    console.log('❌ FAILED: Should have rejected non-hash-locked artifact');
    await cleanup(appRequestId);
    return false;
  } catch (error: any) {
    if (error.message.includes('CONTEXT ISOLATION VIOLATION')) {
      console.log('✅ PASSED: Correctly rejected non-hash-locked artifact');
      await cleanup(appRequestId);
      return true;
    } else {
      console.log(`❌ FAILED: Wrong error: ${error.message}`);
      await cleanup(appRequestId);
      return false;
    }
  }
}

/**
 * TEST 3: Deterministic prompt generation
 */
async function test3_deterministicPromptGeneration() {
  console.log('\n🧪 TEST 3: Deterministic prompt generation');

  const appRequestId = await setupTestContext();
  const engineer = new BuildPromptEngineerHardened(prisma, conductor, logger);

  try {
    // Generate first prompt
    const promptId1 = await engineer.start(appRequestId);
    const prompt1 = await prisma.buildPrompt.findUnique({ where: { id: promptId1 } });

    if (!prompt1 || !prompt1.contractHash) {
      console.log('❌ FAILED: First prompt missing contractHash');
      await cleanup(appRequestId);
      return false;
    }

    // Delete and regenerate with same context
    await prisma.buildPrompt.delete({ where: { id: promptId1 } });

    const promptId2 = await engineer.start(appRequestId);
    const prompt2 = await prisma.buildPrompt.findUnique({ where: { id: promptId2 } });

    if (!prompt2 || !prompt2.contractHash) {
      console.log('❌ FAILED: Second prompt missing contractHash');
      await cleanup(appRequestId);
      return false;
    }

    // Hashes should be identical (deterministic)
    if (prompt1.contractHash === prompt2.contractHash && prompt1.title === prompt2.title) {
      console.log('✅ PASSED: Deterministic generation (same hash)');
      console.log(`   Hash: ${prompt1.contractHash}`);
      await cleanup(appRequestId);
      return true;
    } else {
      console.log('❌ FAILED: Non-deterministic generation');
      console.log(`   Hash 1: ${prompt1.contractHash}`);
      console.log(`   Hash 2: ${prompt2.contractHash}`);
      await cleanup(appRequestId);
      return false;
    }
  } catch (error: any) {
    console.log(`❌ FAILED: ${error.message}`);
    await cleanup(appRequestId);
    return false;
  }
}

/**
 * TEST 4: Closed scope enforcement
 */
async function test4_closedScopeEnforcement() {
  console.log('\n🧪 TEST 4: Closed scope enforcement');

  const appRequestId = await setupTestContext();
  const engineer = new BuildPromptEngineerHardened(prisma, conductor, logger);

  try {
    const promptId = await engineer.start(appRequestId);
    const prompt = await prisma.buildPrompt.findUnique({ where: { id: promptId } });

    if (!prompt) {
      console.log('❌ FAILED: Prompt not found');
      await cleanup(appRequestId);
      return false;
    }

    const allowedCreate = JSON.parse(prompt.allowedCreateFiles);
    const forbiddenFiles = JSON.parse(prompt.forbiddenFiles);

    // Check that forbidden files include ALWAYS_FORBIDDEN_FILES
    const hasPrismaSchema = forbiddenFiles.includes('prisma/schema.prisma');
    const hasAgents = forbiddenFiles.some((f: string) => f.includes('src/agents/'));
    const hasConductor = forbiddenFiles.some((f: string) => f.includes('src/conductor/'));

    if (hasPrismaSchema && hasAgents && hasConductor) {
      console.log('✅ PASSED: Closed scope enforced (forbidden files present)');
      console.log(`   Forbidden: ${forbiddenFiles.length} patterns`);
      console.log(`   Allowed create: ${allowedCreate.length} files`);
      await cleanup(appRequestId);
      return true;
    } else {
      console.log('❌ FAILED: Missing critical forbidden files');
      await cleanup(appRequestId);
      return false;
    }
  } catch (error: any) {
    console.log(`❌ FAILED: ${error.message}`);
    await cleanup(appRequestId);
    return false;
  }
}

/**
 * TEST 5: Ambiguous language rejection (validation)
 */
async function test5_ambiguousLanguageRejection() {
  console.log('\n🧪 TEST 5: Ambiguous language rejection');

  const appRequestId = await setupTestContext();
  const engineer = new BuildPromptEngineerHardened(prisma, conductor, logger);

  try {
    const promptId = await engineer.start(appRequestId);
    const prompt = await prisma.buildPrompt.findUnique({ where: { id: promptId } });

    if (!prompt || !prompt.contractJson) {
      console.log('❌ FAILED: Prompt or contract not found');
      await cleanup(appRequestId);
      return false;
    }

    const contract = JSON.parse(prompt.contractJson);

    // Check that intent is clear (no ambiguous words like "ensure", "improve", "optimize")
    const ambiguousWords = ['ensure', 'improve', 'optimize', 'enhance', 'maybe', 'possibly'];
    const intentLower = contract.intent.toLowerCase();

    const hasAmbiguous = ambiguousWords.some(word => intentLower.includes(word));

    if (!hasAmbiguous) {
      console.log('✅ PASSED: No ambiguous language in intent');
      console.log(`   Intent: "${contract.intent}"`);
      await cleanup(appRequestId);
      return true;
    } else {
      console.log('❌ FAILED: Found ambiguous language in intent');
      console.log(`   Intent: "${contract.intent}"`);
      await cleanup(appRequestId);
      return false;
    }
  } catch (error: any) {
    console.log(`❌ FAILED: ${error.message}`);
    await cleanup(appRequestId);
    return false;
  }
}

/**
 * TEST 6: Hash immutability after approval
 */
async function test6_hashImmutabilityAfterApproval() {
  console.log('\n🧪 TEST 6: Hash immutability after approval');

  const appRequestId = await setupTestContext();
  const engineer = new BuildPromptEngineerHardened(prisma, conductor, logger);

  try {
    // Generate and approve prompt
    const promptId = await engineer.start(appRequestId);
    const beforeApproval = await prisma.buildPrompt.findUnique({ where: { id: promptId } });

    if (!beforeApproval || !beforeApproval.contractHash) {
      console.log('❌ FAILED: Prompt or hash missing before approval');
      await cleanup(appRequestId);
      return false;
    }

    const hashBefore = beforeApproval.contractHash;

    // Approve
    await engineer.approve(promptId, 'test-human');

    const afterApproval = await prisma.buildPrompt.findUnique({ where: { id: promptId } });

    if (!afterApproval || !afterApproval.contractHash) {
      console.log('❌ FAILED: Prompt or hash missing after approval');
      await cleanup(appRequestId);
      return false;
    }

    const hashAfter = afterApproval.contractHash;

    // Hash should be identical (immutable)
    if (hashBefore === hashAfter && afterApproval.status === 'approved') {
      console.log('✅ PASSED: Hash immutable after approval');
      console.log(`   Hash: ${hashAfter}`);
      console.log(`   Status: ${afterApproval.status}`);
      await cleanup(appRequestId);
      return true;
    } else {
      console.log('❌ FAILED: Hash changed or status incorrect');
      await cleanup(appRequestId);
      return false;
    }
  } catch (error: any) {
    console.log(`❌ FAILED: ${error.message}`);
    await cleanup(appRequestId);
    return false;
  }
}

/**
 * TEST 7: Reordering prevention
 */
async function test7_reorderingPrevention() {
  console.log('\n🧪 TEST 7: Reordering prevention');

  const appRequestId = await setupTestContext();
  const engineer = new BuildPromptEngineerHardened(prisma, conductor, logger);

  try {
    // Generate and approve first prompt (sequence 0 - scaffolding)
    const prompt1Id = await engineer.start(appRequestId);
    await engineer.approve(prompt1Id, 'test-human');

    const prompt1 = await prisma.buildPrompt.findUnique({ where: { id: prompt1Id } });

    // Generate and approve second prompt (sequence 1 - architecture)
    await prisma.conductorState.update({ where: { appRequestId }, data: { currentStatus: 'rules_locked' } }); // Reset state
    const prompt2Id = await engineer.generateNext(appRequestId);
    await engineer.approve(prompt2Id, 'test-human');

    const prompt2 = await prisma.buildPrompt.findUnique({ where: { id: prompt2Id } });

    // Verify sequence numbers are strictly increasing
    if (!prompt1 || !prompt2) {
      console.log('❌ FAILED: Prompts not found');
      await cleanup(appRequestId);
      return false;
    }

    if (prompt1.sequenceIndex === 0 &&
        prompt2.sequenceIndex === 1 &&
        prompt1.title === 'Project Scaffolding & Setup' &&
        prompt2.title === 'Core Architecture & Database') {
      console.log('✅ PASSED: Sequence ordering enforced');
      console.log(`   Sequence 0: ${prompt1.title}`);
      console.log(`   Sequence 1: ${prompt2.title}`);
      await cleanup(appRequestId);
      return true;
    } else {
      console.log('❌ FAILED: Incorrect sequence or titles');
      await cleanup(appRequestId);
      return false;
    }
  } catch (error: any) {
    console.log(`❌ FAILED: ${error.message}`);
    await cleanup(appRequestId);
    return false;
  }
}

/**
 * TEST 8: Prompt regeneration blocked
 */
async function test8_promptRegenerationBlocked() {
  console.log('\n🧪 TEST 8: Prompt regeneration blocked');

  const appRequestId = await setupTestContext();
  const engineer = new BuildPromptEngineerHardened(prisma, conductor, logger);

  try {
    // Generate and approve first prompt
    const promptId = await engineer.start(appRequestId);
    await engineer.approve(promptId, 'test-human');

    // Try to start again - should fail (cannot regenerate approved prompt)
    await prisma.conductorState.update({ where: { appRequestId }, data: { currentStatus: 'rules_locked' } }); // Reset state

    try {
      await engineer.start(appRequestId);
      console.log('❌ FAILED: Should not allow regeneration when prompts already exist');
      await cleanup(appRequestId);
      return false;
    } catch (innerError: any) {
      // This should fail because generateNext should be used, not start
      console.log('✅ PASSED: Cannot regenerate using start() after approval');
      console.log(`   Error: ${innerError.message.substring(0, 50)}...`);
      await cleanup(appRequestId);
      return true;
    }
  } catch (error: any) {
    console.log(`❌ FAILED: Unexpected error: ${error.message}`);
    await cleanup(appRequestId);
    return false;
  }
}

/**
 * TEST 9: Exact dependency declarations
 */
async function test9_exactDependencyDeclarations() {
  console.log('\n🧪 TEST 9: Exact dependency declarations');

  const appRequestId = await setupTestContext();
  const engineer = new BuildPromptEngineerHardened(prisma, conductor, logger);

  try {
    const promptId = await engineer.start(appRequestId);
    const prompt = await prisma.buildPrompt.findUnique({ where: { id: promptId } });

    if (!prompt || !prompt.dependencyManifest) {
      console.log('❌ FAILED: Prompt or manifest not found');
      await cleanup(appRequestId);
      return false;
    }

    const manifest = JSON.parse(prompt.dependencyManifest);
    const contract = JSON.parse(prompt.contractJson!);

    const actualDeps = Object.keys(manifest.newDependencies);

    // Check that some dependencies were added (scaffolding needs deps)
    const hasDependencies = actualDeps.length > 0;

    // Check versions are specified (all should start with ^ or specific version)
    const allHaveVersions = Object.values(manifest.newDependencies).every((v: any) =>
      typeof v === 'string' && v.length > 0
    );

    // Check contract dependencies array is populated and sorted
    const contractDeps = contract.dependencies.add;
    const contractHasDeps = contractDeps.length > 0;
    const contractDepsSorted = contractDeps.every((dep: string, i: number) =>
      i === 0 || dep >= contractDeps[i - 1]
    );

    // Check each contract dep has a version (contains @)
    const contractDepsVersioned = contractDeps.every((dep: string) => dep.includes('@'));

    if (hasDependencies && allHaveVersions && contractHasDeps && contractDepsSorted && contractDepsVersioned) {
      console.log('✅ PASSED: Exact dependency declarations');
      console.log(`   Dependencies: ${actualDeps.join(', ')}`);
      console.log(`   Contract deps sorted: ${contractDepsSorted}`);
      console.log(`   All versioned: ${contractDepsVersioned}`);
      await cleanup(appRequestId);
      return true;
    } else {
      console.log('❌ FAILED: Dependency validation failed');
      console.log(`   Has dependencies: ${hasDependencies}`);
      console.log(`   All versioned: ${allHaveVersions}`);
      console.log(`   Contract has deps: ${contractHasDeps}`);
      console.log(`   Contract sorted: ${contractDepsSorted}`);
      console.log(`   Contract versioned: ${contractDepsVersioned}`);
      await cleanup(appRequestId);
      return false;
    }
  } catch (error: any) {
    console.log(`❌ FAILED: ${error.message}`);
    await cleanup(appRequestId);
    return false;
  }
}

/**
 * TEST 10: Full audit trail emission
 */
async function test10_fullAuditTrailEmission() {
  console.log('\n🧪 TEST 10: Full audit trail emission');

  const appRequestId = await setupTestContext();
  const engineer = new BuildPromptEngineerHardened(prisma, conductor, logger);

  try {
    // Get execution ID
    const appRequest = await prisma.appRequest.findUnique({ where: { id: appRequestId } });
    if (!appRequest?.executionId) {
      console.log('❌ FAILED: No execution ID found');
      await cleanup(appRequestId);
      return false;
    }

    const executionId = appRequest.executionId;

    // Count events before
    const eventsBefore = await prisma.executionEvent.count({
      where: { executionId },
    });

    // Generate prompt (should emit events)
    const promptId = await engineer.start(appRequestId);

    // Count events after
    const eventsAfter = await prisma.executionEvent.count({
      where: { executionId },
    });

    // Approve (should emit more events)
    await engineer.approve(promptId, 'test-human');

    const eventsAfterApproval = await prisma.executionEvent.count({
      where: { executionId },
    });

    // Check that events were emitted
    const eventsFromGeneration = eventsAfter - eventsBefore;
    const eventsFromApproval = eventsAfterApproval - eventsAfter;

    if (eventsFromGeneration >= 1 && eventsFromApproval >= 1) {
      console.log('✅ PASSED: Full audit trail emission');
      console.log(`   Events from generation: ${eventsFromGeneration}`);
      console.log(`   Events from approval: ${eventsFromApproval}`);
      console.log(`   Total events: ${eventsAfterApproval}`);
      await cleanup(appRequestId);
      return true;
    } else {
      console.log('❌ FAILED: Insufficient event emission');
      console.log(`   Events from generation: ${eventsFromGeneration}`);
      console.log(`   Events from approval: ${eventsFromApproval}`);
      await cleanup(appRequestId);
      return false;
    }
  } catch (error: any) {
    console.log(`❌ FAILED: ${error.message}`);
    await cleanup(appRequestId);
    return false;
  }
}

/**
 * Run all tests
 */
async function runAllTests() {
  console.log('\n' + '='.repeat(80));
  console.log('BUILD PROMPT ENGINEER HARDENED - COMPREHENSIVE TEST SUITE');
  console.log('Testing all 10 constitutional requirements');
  console.log('='.repeat(80));

  const results = {
    test1: await test1_cannotStartUnlessRulesLocked(),
    test2: await test2_cannotReferenceNonHashApproved(),
    test3: await test3_deterministicPromptGeneration(),
    test4: await test4_closedScopeEnforcement(),
    test5: await test5_ambiguousLanguageRejection(),
    test6: await test6_hashImmutabilityAfterApproval(),
    test7: await test7_reorderingPrevention(),
    test8: await test8_promptRegenerationBlocked(),
    test9: await test9_exactDependencyDeclarations(),
    test10: await test10_fullAuditTrailEmission(),
  };

  console.log('\n' + '='.repeat(80));
  console.log('TEST RESULTS SUMMARY');
  console.log('='.repeat(80));

  const passed = Object.values(results).filter(r => r === true).length;
  const total = Object.values(results).length;

  Object.entries(results).forEach(([test, result], index) => {
    const status = result ? '✅ PASS' : '❌ FAIL';
    console.log(`${status} - Test ${index + 1}: ${test}`);
  });

  console.log('\n' + '-'.repeat(80));
  console.log(`FINAL SCORE: ${passed}/${total} tests passed`);
  console.log('='.repeat(80));

  if (passed === total) {
    console.log('\n🎉 ALL TESTS PASSED! Constitutional requirements validated.');
  } else {
    console.log(`\n⚠️  ${total - passed} test(s) failed. Review output above.`);
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
