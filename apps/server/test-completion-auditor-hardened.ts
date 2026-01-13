/**
 * Completion Auditor Hardened - Comprehensive Test Suite
 *
 * Tests all 10 constitutional requirements for completion auditing
 *
 * Philosophy: "If this agent is wrong, Forge is lying."
 */

import { PrismaClient } from '@prisma/client';
import { CompletionAuditorHardened } from './src/agents/completion-auditor-hardened.js';
import { ForgeConductor } from './src/conductor/forge-conductor.js';
import pino from 'pino';
import { randomUUID } from 'crypto';

const prisma = new PrismaClient();
const logger = pino({ level: 'error' }); // Suppress logs during tests
const conductor = new ForgeConductor(prisma, logger);

/**
 * SETUP COMPLETE TEST CONTEXT
 *
 * Creates a fully complete Forge build with all hash-locked artifacts
 */
async function setupCompleteContext(): Promise<{ appRequestId: string }> {
  const appRequestId = randomUUID();
  const projectId = randomUUID();
  const executionId = randomUUID();
  const buildPromptId = randomUUID();
  const planId = randomUUID();

  // Create Project
  await prisma.project.create({
    data: {
      id: projectId,
      name: 'Complete Test Project',
      description: 'Fully completed test project',
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
      executionId,
      prompt: 'Test complete build',
      status: 'verifying',
    },
  });

  // Create approved ProjectRuleSet
  await prisma.projectRuleSet.create({
    data: {
      id: randomUUID(),
      appRequestId,
      content: JSON.stringify({ workingDirectory: '/tmp/test', techStack: {} }),
      status: 'approved',
      rulesHash: 'ruleset_complete_hash',
    },
  });

  // Create approved BuildPrompt
  await prisma.buildPrompt.create({
    data: {
      id: buildPromptId,
      appRequestId,
      title: 'Test BuildPrompt',
      content: '# Test',
      sequenceIndex: 0,
      status: 'approved',
      contractHash: 'buildprompt_complete_hash',
      contractJson: JSON.stringify({ scope: { filesToCreate: ['index.ts'] } }),
      allowedCreateFiles: JSON.stringify(['index.ts']),
      allowedModifyFiles: JSON.stringify([]),
      forbiddenFiles: JSON.stringify([]),
      fullRewriteFiles: JSON.stringify([]),
      dependencyManifest: JSON.stringify({}),
      modificationIntent: JSON.stringify({}),
      approvedBy: 'human',
      approvedAt: new Date(),
    },
  });

  // Create approved ExecutionPlan
  await prisma.executionPlan.create({
    data: {
      id: planId,
      appRequestId,
      buildPromptId,
      status: 'approved',
      contractHash: 'executionplan_complete_hash',
      contractJson: JSON.stringify({ tasks: [] }),
      buildPromptHash: 'buildprompt_complete_hash',
      approvedBy: 'human',
      approvedAt: new Date(),
    },
  });

  // Create Verification record
  await prisma.verification.create({
    data: {
      id: randomUUID(),
      appRequestId,
      executionId,
      status: 'passed',
      errors: null,
      attempt: 1,
    },
  });

  // Create ConductorState
  await prisma.conductorState.create({
    data: {
      id: randomUUID(),
      appRequestId,
      currentStatus: 'verifying',
      locked: false,
      awaitingHuman: false,
      lastAgent: 'ForgeImplementer',
    },
  });

  return { appRequestId };
}

/**
 * CLEANUP TEST CONTEXT
 */
async function cleanupTestContext(appRequestId: string): Promise<void> {
  const appRequest = await prisma.appRequest.findUnique({
    where: { id: appRequestId },
  });

  if (!appRequest) return;

  await prisma.verification.deleteMany({ where: { appRequestId } });
  await prisma.executionPlan.deleteMany({ where: { appRequestId } });
  await prisma.conductorState.deleteMany({ where: { appRequestId } });
  await prisma.buildPrompt.deleteMany({ where: { appRequestId } });
  await prisma.projectRuleSet.deleteMany({ where: { appRequestId } });
  await prisma.appRequest.delete({ where: { id: appRequestId } });
  await prisma.execution.delete({ where: { id: appRequest.executionId! } });
  await prisma.project.delete({ where: { id: appRequest.projectId } });
}

/**
 * TEST 1: Check 1 - Rule Integrity (No ProjectRuleSet)
 */
async function test1_ruleIntegrityNoRuleSet(): Promise<string> {
  let appRequestId: string | undefined;

  try {
    const context = await setupCompleteContext();
    appRequestId = context.appRequestId;

    // Delete ProjectRuleSet
    await prisma.projectRuleSet.deleteMany({ where: { appRequestId } });

    const auditor = new CompletionAuditorHardened(prisma, conductor, logger);
    const report = await auditor.audit(appRequestId);

    if (report.verdict === 'NOT_COMPLETE' &&
        report.failureReasons?.some(r => r.includes('No ProjectRuleSet found'))) {
      console.log('✅ PASSED: Correctly detected missing ProjectRuleSet');
      return 'pass';
    } else {
      return 'test1';
    }
  } finally {
    if (appRequestId) await cleanupTestContext(appRequestId);
  }
}

/**
 * TEST 2: Check 2 - Prompt Integrity (Unapproved BuildPrompt)
 */
async function test2_promptIntegrityUnapproved(): Promise<string> {
  let appRequestId: string | undefined;

  try {
    const context = await setupCompleteContext();
    appRequestId = context.appRequestId;

    // Change BuildPrompt status to awaiting_approval
    await prisma.buildPrompt.updateMany({
      where: { appRequestId },
      data: { status: 'awaiting_approval' },
    });

    const auditor = new CompletionAuditorHardened(prisma, conductor, logger);
    const report = await auditor.audit(appRequestId);

    if (report.verdict === 'NOT_COMPLETE' &&
        report.failureReasons?.some(r => r.includes('not approved'))) {
      console.log('✅ PASSED: Correctly detected unapproved BuildPrompt');
      return 'pass';
    } else {
      return 'test2';
    }
  } finally {
    if (appRequestId) await cleanupTestContext(appRequestId);
  }
}

/**
 * TEST 3: Check 3 - Execution Integrity (Missing ExecutionPlan)
 */
async function test3_executionIntegrityMissingPlan(): Promise<string> {
  let appRequestId: string | undefined;

  try {
    const context = await setupCompleteContext();
    appRequestId = context.appRequestId;

    // Delete ExecutionPlan
    await prisma.executionPlan.deleteMany({ where: { appRequestId } });

    const auditor = new CompletionAuditorHardened(prisma, conductor, logger);
    const report = await auditor.audit(appRequestId);

    if (report.verdict === 'NOT_COMPLETE' &&
        report.failureReasons?.some(r => r.includes('Expected 1 ExecutionPlans'))) {
      console.log('✅ PASSED: Correctly detected missing ExecutionPlan');
      return 'pass';
    } else {
      return 'test3';
    }
  } finally {
    if (appRequestId) await cleanupTestContext(appRequestId);
  }
}

/**
 * TEST 4: Check 5 - Failure Scan (Failed ExecutionPlan)
 */
async function test4_failureScanFailedPlan(): Promise<string> {
  let appRequestId: string | undefined;

  try {
    const context = await setupCompleteContext();
    appRequestId = context.appRequestId;

    // Change ExecutionPlan status to failed
    await prisma.executionPlan.updateMany({
      where: { appRequestId },
      data: { status: 'failed' },
    });

    const auditor = new CompletionAuditorHardened(prisma, conductor, logger);
    const report = await auditor.audit(appRequestId);

    if (report.verdict === 'NOT_COMPLETE' &&
        report.failureReasons?.some(r => r.includes('ExecutionPlans failed'))) {
      console.log('✅ PASSED: Correctly detected failed ExecutionPlan');
      return 'pass';
    } else {
      return 'test4';
    }
  } finally {
    if (appRequestId) await cleanupTestContext(appRequestId);
  }
}

/**
 * TEST 5: Check 5 - Failure Scan (Conductor Paused)
 */
async function test5_failureScanConductorPaused(): Promise<string> {
  let appRequestId: string | undefined;

  try {
    const context = await setupCompleteContext();
    appRequestId = context.appRequestId;

    // Pause conductor
    await prisma.conductorState.updateMany({
      where: { appRequestId },
      data: { awaitingHuman: true },
    });

    const auditor = new CompletionAuditorHardened(prisma, conductor, logger);
    const report = await auditor.audit(appRequestId);

    if (report.verdict === 'NOT_COMPLETE' &&
        report.failureReasons?.some(r => r.includes('awaiting human'))) {
      console.log('✅ PASSED: Correctly detected paused conductor');
      return 'pass';
    } else {
      return 'test5';
    }
  } finally {
    if (appRequestId) await cleanupTestContext(appRequestId);
  }
}

/**
 * TEST 6: Check 6 - Verification Integrity (No Verification)
 */
async function test6_verificationIntegrityMissing(): Promise<string> {
  let appRequestId: string | undefined;

  try {
    const context = await setupCompleteContext();
    appRequestId = context.appRequestId;

    // Delete Verification records
    await prisma.verification.deleteMany({ where: { appRequestId } });

    const auditor = new CompletionAuditorHardened(prisma, conductor, logger);
    const report = await auditor.audit(appRequestId);

    if (report.verdict === 'NOT_COMPLETE' &&
        report.failureReasons?.some(r => r.includes('No verification records'))) {
      console.log('✅ PASSED: Correctly detected missing verification');
      return 'pass';
    } else {
      return 'test6';
    }
  } finally {
    if (appRequestId) await cleanupTestContext(appRequestId);
  }
}

/**
 * TEST 7: Check 8 - Hash Chain Integrity (Broken Chain)
 */
async function test7_hashChainIntegrityBroken(): Promise<string> {
  let appRequestId: string | undefined;

  try {
    const context = await setupCompleteContext();
    appRequestId = context.appRequestId;

    // Break hash chain: change ExecutionPlan.buildPromptHash
    await prisma.executionPlan.updateMany({
      where: { appRequestId },
      data: { buildPromptHash: 'wrong_hash' },
    });

    const auditor = new CompletionAuditorHardened(prisma, conductor, logger);
    const report = await auditor.audit(appRequestId);

    if (report.verdict === 'NOT_COMPLETE' &&
        report.failureReasons?.some(r => r.includes('Hash chain broken'))) {
      console.log('✅ PASSED: Correctly detected broken hash chain');
      return 'pass';
    } else {
      return 'test7';
    }
  } finally {
    if (appRequestId) await cleanupTestContext(appRequestId);
  }
}

/**
 * TEST 8: Check 9 - Conductor Final State (Locked)
 */
async function test8_conductorFinalStateLocked(): Promise<string> {
  let appRequestId: string | undefined;

  try {
    const context = await setupCompleteContext();
    appRequestId = context.appRequestId;

    // Lock conductor
    await prisma.conductorState.updateMany({
      where: { appRequestId },
      data: { locked: true },
    });

    const auditor = new CompletionAuditorHardened(prisma, conductor, logger);
    const report = await auditor.audit(appRequestId);

    if (report.verdict === 'NOT_COMPLETE' &&
        report.failureReasons?.some(r => r.includes('Conductor is locked'))) {
      console.log('✅ PASSED: Correctly detected locked conductor');
      return 'pass';
    } else {
      return 'test8';
    }
  } finally {
    if (appRequestId) await cleanupTestContext(appRequestId);
  }
}

/**
 * TEST 9: Deterministic Report Hash
 */
async function test9_deterministicReportHash(): Promise<string> {
  let appRequestId: string | undefined;

  try {
    const context = await setupCompleteContext();
    appRequestId = context.appRequestId;

    const auditor = new CompletionAuditorHardened(prisma, conductor, logger);

    // Run audit twice
    const report1 = await auditor.audit(appRequestId);

    // Reset conductor state for second run
    await prisma.conductorState.updateMany({
      where: { appRequestId },
      data: { currentStatus: 'verifying' },
    });

    const report2 = await auditor.audit(appRequestId);

    // Reports should have same hash (excluding timestamp)
    // Since we exclude checkedAt from hash, hashes should match
    if (report1.reportHash === report2.reportHash) {
      console.log('✅ PASSED: Report hash is deterministic');
      console.log(`   Hash: ${report1.reportHash}`);
      return 'pass';
    } else {
      console.log('❌ FAILED: Report hashes do not match');
      console.log(`   Hash 1: ${report1.reportHash}`);
      console.log(`   Hash 2: ${report2.reportHash}`);
      return 'test9';
    }
  } finally {
    if (appRequestId) await cleanupTestContext(appRequestId);
  }
}

/**
 * TEST 10: Complete Build Passes All Checks
 */
async function test10_completeBuildPasses(): Promise<string> {
  let appRequestId: string | undefined;

  try {
    const context = await setupCompleteContext();
    appRequestId = context.appRequestId;

    const auditor = new CompletionAuditorHardened(prisma, conductor, logger);
    const report = await auditor.audit(appRequestId);

    if (report.verdict === 'COMPLETE' &&
        report.verificationStatus === 'passed' &&
        !report.failureReasons) {
      console.log('✅ PASSED: Complete build passes all checks');
      console.log(`   Report hash: ${report.reportHash}`);
      console.log(`   Prompts: ${report.buildPromptCount}, Plans: ${report.executionPlanCount}`);
      return 'pass';
    } else {
      console.log('❌ FAILED: Complete build did not pass');
      console.log(`   Verdict: ${report.verdict}`);
      console.log(`   Failure reasons: ${report.failureReasons?.join(', ')}`);
      return 'test10';
    }
  } finally {
    if (appRequestId) await cleanupTestContext(appRequestId);
  }
}

/**
 * RUN ALL TESTS
 */
async function runAllTests() {
  console.log('================================================================================');
  console.log('COMPLETION AUDITOR HARDENED - COMPREHENSIVE TEST SUITE');
  console.log('Testing all 10 constitutional requirements for completion auditing');
  console.log('================================================================================\n');

  const results = {
    test1: await test1_ruleIntegrityNoRuleSet(),
    test2: await test2_promptIntegrityUnapproved(),
    test3: await test3_executionIntegrityMissingPlan(),
    test4: await test4_failureScanFailedPlan(),
    test5: await test5_failureScanConductorPaused(),
    test6: await test6_verificationIntegrityMissing(),
    test7: await test7_hashChainIntegrityBroken(),
    test8: await test8_conductorFinalStateLocked(),
    test9: await test9_deterministicReportHash(),
    test10: await test10_completeBuildPasses(),
  };

  console.log('\n================================================================================');
  console.log('TEST RESULTS SUMMARY');
  console.log('================================================================================');

  let passed = 0;
  let failed = 0;

  Object.entries(results).forEach(([test, result]) => {
    if (result === 'pass') {
      console.log(`✅ PASS - Test ${test.replace('test', '')}: ${test}`);
      passed++;
    } else {
      console.log(`❌ FAIL - Test ${test.replace('test', '')}: ${result}`);
      failed++;
    }
  });

  console.log('\n' + '─'.repeat(80));
  console.log(`FINAL SCORE: ${passed}/10 tests passed`);
  console.log('================================================================================');

  if (failed > 0) {
    console.log(`\n⚠️  ${failed} test(s) failed. Review output above.`);
    process.exit(1);
  } else {
    console.log('\n🎉 ALL TESTS PASSED! Completion auditing validated.');
  }
}

runAllTests()
  .catch((e) => {
    console.error('Fatal error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
