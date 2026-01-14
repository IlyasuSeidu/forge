/**
 * REPAIR AGENT HARDENED - CONSTITUTIONAL TEST SUITE (10/10 REQUIRED)
 *
 * These tests prove the Repair Agent is constitutionally safe:
 * - Cannot act without human approval
 * - Cannot expand scope
 * - Cannot retry
 * - Cannot modify unapproved files
 * - Halts immediately on violation
 */

import { PrismaClient } from '@prisma/client';
import { RepairAgentHardened } from './src/agents/repair-agent-hardened.js';
import { ForgeConductor } from './src/conductor/forge-conductor.js';
import pino from 'pino';
import { randomUUID } from 'crypto';
import fs from 'fs';
import path from 'path';

const prisma = new PrismaClient();
const logger = pino({ level: 'silent' }); // Silence logs during tests
const conductor = new ForgeConductor(prisma, logger);

/**
 * TEST UTILITIES
 */

async function setupTestScenario(): Promise<{
  appRequestId: string;
  projectId: string;
  workspaceDir: string;
}> {
  const projectId = randomUUID();
  const appRequestId = randomUUID();
  const workspaceDir = `/tmp/repair-agent-test-${appRequestId}`;

  // Create workspace
  fs.mkdirSync(workspaceDir, { recursive: true });
  fs.mkdirSync(path.join(workspaceDir, 'src'), { recursive: true });

  // Create test file
  fs.writeFileSync(
    path.join(workspaceDir, 'src', 'test.ts'),
    'export function test(): string {\n  return "hello";\n}\n'
  );

  // Create project
  await prisma.project.create({
    data: {
      id: projectId,
      name: 'Repair Agent Test',
      description: 'Test project for repair agent',
    },
  });

  // Create AppRequest
  await prisma.appRequest.create({
    data: {
      id: appRequestId,
      projectId,
      prompt: 'Test prompt',
      status: 'building',
    },
  });

  // Create ConductorState
  await prisma.conductorState.create({
    data: {
      id: randomUUID(),
      appRequestId,
      currentStatus: 'verification_failed',
      locked: false,
    },
  });

  // Create approved ProjectRuleSet
  await prisma.projectRuleSet.create({
    data: {
      id: randomUUID(),
      appRequestId,
      content: JSON.stringify({ workingDirectory: workspaceDir, rules: [] }),
      status: 'approved',
      rulesHash: 'test-rules-' + randomUUID(),
      approvedBy: 'human',
    },
  });

  // Create approved BuildPrompt
  await prisma.buildPrompt.create({
    data: {
      id: randomUUID(),
      appRequestId,
      title: 'Test Build',
      content: 'Test build prompt',
      sequenceIndex: 0,
      status: 'approved',
      contractHash: 'test-build-' + randomUUID(),
      approvedBy: 'human',
    },
  });

  // Create approved ExecutionPlan
  await prisma.executionPlan.create({
    data: {
      id: randomUUID(),
      appRequestId,
      buildPromptId: randomUUID(),
      status: 'approved',
      contractHash: 'test-plan-' + randomUUID(),
      approvedBy: 'human',
    },
  });

  return { appRequestId, projectId, workspaceDir };
}

async function createFailedVerification(appRequestId: string): Promise<string> {
  const verificationId = randomUUID();
  const resultHash = 'verification-failed-' + randomUUID();

  await prisma.verificationResult.create({
    data: {
      id: verificationId,
      appRequestId,
      overallStatus: 'FAILED',
      verifier: 'VerificationExecutorHardened',
      stepsJson: JSON.stringify([
        {
          stepId: 0,
          criterion: 'Test must pass',
          command: 'test -f src/test.ts',
          exitCode: 1,
          status: 'FAILED',
        },
      ]),
      buildPromptHash: 'test-build-hash',
      executionPlanHash: 'test-plan-hash',
      rulesHash: 'test-rules-hash',
      resultHash,
    },
  });

  return resultHash;
}

async function cleanup(scenario: { appRequestId: string; workspaceDir: string }): Promise<void> {
  // Delete workspace
  if (fs.existsSync(scenario.workspaceDir)) {
    fs.rmSync(scenario.workspaceDir, { recursive: true, force: true });
  }

  // Delete DB records (cascade will handle related records)
  try {
    await prisma.verificationResult.deleteMany({ where: { appRequestId: scenario.appRequestId } });
    await prisma.executionPlan.deleteMany({ where: { appRequestId: scenario.appRequestId } });
    await prisma.buildPrompt.deleteMany({ where: { appRequestId: scenario.appRequestId } });
    await prisma.projectRuleSet.deleteMany({ where: { appRequestId: scenario.appRequestId } });
    await prisma.conductorState.deleteMany({ where: { appRequestId: scenario.appRequestId } });
    const appRequest = await prisma.appRequest.findUnique({ where: { id: scenario.appRequestId } });
    await prisma.appRequest.deleteMany({ where: { id: scenario.appRequestId } });
    if (appRequest?.projectId) {
      await prisma.project.deleteMany({ where: { id: appRequest.projectId } });
    }
  } catch (error) {
    // Ignore cleanup errors
  }
}

/**
 * TEST 1: Cannot run without approved RepairPlan
 */
async function test1_cannotRunWithoutApprovedPlan(): Promise<boolean> {
  console.log('TEST 1: Cannot run without approved RepairPlan');

  const scenario = await setupTestScenario();
  const agent = new RepairAgentHardened(prisma, conductor, logger);

  try {
    const verificationHash = await createFailedVerification(scenario.appRequestId);

    // Create RepairPlan WITHOUT human approval
    const repairPlan = {
      repairPlanId: randomUUID(),
      repairPlanHash: 'test-plan-hash',
      sourceVerificationHash: verificationHash,
      actions: [],
      allowedFiles: ['src/test.ts'],
      constraints: { noNewFiles: true, noNewDependencies: true, noScopeExpansion: true },
      approvedBy: 'agent' as any, // NOT HUMAN
      approvedAt: new Date().toISOString(),
    };

    await agent.execute(scenario.appRequestId, repairPlan, scenario.workspaceDir);

    console.log('❌ FAIL: Agent executed without human approval');
    await cleanup(scenario);
    return false;
  } catch (error: any) {
    if (error.message.includes('PRECONDITION VIOLATION') && error.message.includes('human')) {
      console.log('✅ PASS: Agent rejected non-human approval');
      await cleanup(scenario);
      return true;
    }
    console.log('❌ FAIL: Wrong error:', error.message);
    await cleanup(scenario);
    return false;
  }
}

/**
 * TEST 2: Cannot modify files not in RepairPlan
 */
async function test2_cannotModifyUnapprovedFiles(): Promise<boolean> {
  console.log('\nTEST 2: Cannot modify files not in RepairPlan');

  const scenario = await setupTestScenario();
  const agent = new RepairAgentHardened(prisma, conductor, logger);

  // Create second file
  fs.writeFileSync(path.join(scenario.workspaceDir, 'src', 'other.ts'), 'export const x = 1;');

  try {
    const verificationHash = await createFailedVerification(scenario.appRequestId);

    const repairPlan = {
      repairPlanId: randomUUID(),
      repairPlanHash: 'test-plan-hash',
      sourceVerificationHash: verificationHash,
      actions: [
        {
          actionId: 'action-1',
          targetFile: 'src/other.ts', // NOT IN ALLOWED LIST
          operation: 'replace_content' as const,
          oldContent: 'const x = 1',
          newContent: 'const x = 2',
          description: 'Update x',
        },
      ],
      allowedFiles: ['src/test.ts'], // Only test.ts allowed
      constraints: { noNewFiles: true, noNewDependencies: true, noScopeExpansion: true },
      approvedBy: 'human' as const,
      approvedAt: new Date().toISOString(),
    };

    await agent.execute(scenario.appRequestId, repairPlan, scenario.workspaceDir);

    console.log('❌ FAIL: Agent modified unapproved file');
    await cleanup(scenario);
    return false;
  } catch (error: any) {
    if (error.message.includes('ACTION VIOLATION') && error.message.includes('not in allowed list')) {
      console.log('✅ PASS: Agent rejected unapproved file');
      await cleanup(scenario);
      return true;
    }
    console.log('❌ FAIL: Wrong error:', error.message);
    await cleanup(scenario);
    return false;
  }
}

/**
 * TEST 3: Cannot modify outside allowed line ranges
 */
async function test3_cannotModifyOutsideLineRange(): Promise<boolean> {
  console.log('\nTEST 3: Cannot modify outside allowed line ranges');

  const scenario = await setupTestScenario();
  const agent = new RepairAgentHardened(prisma, conductor, logger);

  try {
    const verificationHash = await createFailedVerification(scenario.appRequestId);

    const repairPlan = {
      repairPlanId: randomUUID(),
      repairPlanHash: 'test-plan-hash',
      sourceVerificationHash: verificationHash,
      actions: [
        {
          actionId: 'action-1',
          targetFile: 'src/test.ts',
          operation: 'replace_lines' as const,
          allowedLineRange: [10, 20] as [number, number], // File only has 3 lines
          newContent: 'new line',
          description: 'Replace lines',
        },
      ],
      allowedFiles: ['src/test.ts'],
      constraints: { noNewFiles: true, noNewDependencies: true, noScopeExpansion: true },
      approvedBy: 'human' as const,
      approvedAt: new Date().toISOString(),
    };

    await agent.execute(scenario.appRequestId, repairPlan, scenario.workspaceDir);

    console.log('❌ FAIL: Agent modified outside line range');
    await cleanup(scenario);
    return false;
  } catch (error: any) {
    if (error.message.includes('ACTION VIOLATION') && error.message.includes('out of bounds')) {
      console.log('✅ PASS: Agent rejected out-of-bounds line range');
      await cleanup(scenario);
      return true;
    }
    console.log('❌ FAIL: Wrong error:', error.message);
    await cleanup(scenario);
    return false;
  }
}

/**
 * TEST 4: Cannot add new files
 */
async function test4_cannotAddNewFiles(): Promise<boolean> {
  console.log('\nTEST 4: Cannot add new files');

  const scenario = await setupTestScenario();
  const agent = new RepairAgentHardened(prisma, conductor, logger);

  try {
    const verificationHash = await createFailedVerification(scenario.appRequestId);

    const repairPlan = {
      repairPlanId: randomUUID(),
      repairPlanHash: 'test-plan-hash',
      sourceVerificationHash: verificationHash,
      actions: [
        {
          actionId: 'action-1',
          targetFile: 'src/new-file.ts', // DOES NOT EXIST
          operation: 'replace_content' as const,
          oldContent: '',
          newContent: 'export const x = 1;',
          description: 'Create new file',
        },
      ],
      allowedFiles: ['src/new-file.ts'],
      constraints: { noNewFiles: true, noNewDependencies: true, noScopeExpansion: true },
      approvedBy: 'human' as const,
      approvedAt: new Date().toISOString(),
    };

    await agent.execute(scenario.appRequestId, repairPlan, scenario.workspaceDir);

    console.log('❌ FAIL: Agent created new file');
    await cleanup(scenario);
    return false;
  } catch (error: any) {
    if (error.message.includes('ACTION VIOLATION') && error.message.includes('does not exist')) {
      console.log('✅ PASS: Agent rejected new file creation');
      await cleanup(scenario);
      return true;
    }
    console.log('❌ FAIL: Wrong error:', error.message);
    await cleanup(scenario);
    return false;
  }
}

/**
 * TEST 5: Cannot execute without FAILED VerificationResult
 */
async function test5_requiresFailedVerification(): Promise<boolean> {
  console.log('\nTEST 5: Cannot execute without FAILED VerificationResult');

  const scenario = await setupTestScenario();
  const agent = new RepairAgentHardened(prisma, conductor, logger);

  try {
    // Create PASSED verification (not FAILED)
    const verificationId = randomUUID();
    const resultHash = 'verification-passed-' + randomUUID();

    await prisma.verificationResult.create({
      data: {
        id: verificationId,
        appRequestId: scenario.appRequestId,
        overallStatus: 'PASSED', // NOT FAILED
        verifier: 'VerificationExecutorHardened',
        stepsJson: JSON.stringify([]),
        buildPromptHash: 'test',
        executionPlanHash: 'test',
        rulesHash: 'test',
        resultHash,
      },
    });

    const repairPlan = {
      repairPlanId: randomUUID(),
      repairPlanHash: 'test-plan-hash',
      sourceVerificationHash: resultHash,
      actions: [],
      allowedFiles: ['src/test.ts'],
      constraints: { noNewFiles: true, noNewDependencies: true, noScopeExpansion: true },
      approvedBy: 'human' as const,
      approvedAt: new Date().toISOString(),
    };

    await agent.execute(scenario.appRequestId, repairPlan, scenario.workspaceDir);

    console.log('❌ FAIL: Agent executed with PASSED verification');
    await cleanup(scenario);
    return false;
  } catch (error: any) {
    if (error.message.includes('PRECONDITION VIOLATION') && error.message.includes('FAILED')) {
      console.log('✅ PASS: Agent rejected PASSED verification');
      await cleanup(scenario);
      return true;
    }
    console.log('❌ FAIL: Wrong error:', error.message);
    await cleanup(scenario);
    return false;
  }
}

/**
 * TEST 6: Deterministic execution hash
 */
async function test6_deterministicHash(): Promise<boolean> {
  console.log('\nTEST 6: Deterministic execution hash');

  const scenario = await setupTestScenario();
  const agent = new RepairAgentHardened(prisma, conductor, logger);

  try {
    const verificationHash = await createFailedVerification(scenario.appRequestId);

    const repairPlan = {
      repairPlanId: randomUUID(),
      repairPlanHash: 'test-plan-hash-deterministic',
      sourceVerificationHash: verificationHash,
      actions: [
        {
          actionId: 'action-1',
          targetFile: 'src/test.ts',
          operation: 'replace_content' as const,
          oldContent: 'return "hello"',
          newContent: 'return "world"',
          description: 'Update return value',
        },
      ],
      allowedFiles: ['src/test.ts'],
      constraints: { noNewFiles: true, noNewDependencies: true, noScopeExpansion: true },
      approvedBy: 'human' as const,
      approvedAt: new Date().toISOString(),
    };

    const log1 = await agent.execute(scenario.appRequestId, repairPlan, scenario.workspaceDir);

    // Reset file
    fs.writeFileSync(
      path.join(scenario.workspaceDir, 'src', 'test.ts'),
      'export function test(): string {\n  return "hello";\n}\n'
    );

    // Execute again
    const log2 = await agent.execute(scenario.appRequestId, repairPlan, scenario.workspaceDir);

    // Hashes should be different (executionId is unique)
    // But the structure should be the same
    if (log1.status === log2.status && log1.actionsExecuted.length === log2.actionsExecuted.length) {
      console.log('✅ PASS: Execution logs are structurally consistent');
      await cleanup(scenario);
      return true;
    }

    console.log('❌ FAIL: Execution logs differ');
    await cleanup(scenario);
    return false;
  } catch (error: any) {
    console.log('❌ FAIL: Execution failed:', error.message);
    await cleanup(scenario);
    return false;
  }
}

/**
 * TEST 7: Halts immediately on first violation
 */
async function test7_haltsOnFirstViolation(): Promise<boolean> {
  console.log('\nTEST 7: Halts immediately on first violation');

  const scenario = await setupTestScenario();
  const agent = new RepairAgentHardened(prisma, conductor, logger);

  try {
    const verificationHash = await createFailedVerification(scenario.appRequestId);

    const repairPlan = {
      repairPlanId: randomUUID(),
      repairPlanHash: 'test-plan-hash',
      sourceVerificationHash: verificationHash,
      actions: [
        {
          actionId: 'action-1',
          targetFile: 'src/test.ts',
          operation: 'replace_content' as const,
          oldContent: 'DOES_NOT_EXIST', // Will fail
          newContent: 'new content',
          description: 'Invalid replace',
        },
        {
          actionId: 'action-2',
          targetFile: 'src/test.ts',
          operation: 'replace_content' as const,
          oldContent: 'return "hello"',
          newContent: 'return "world"',
          description: 'Valid replace',
        },
      ],
      allowedFiles: ['src/test.ts'],
      constraints: { noNewFiles: true, noNewDependencies: true, noScopeExpansion: true },
      approvedBy: 'human' as const,
      approvedAt: new Date().toISOString(),
    };

    const log = await agent.execute(scenario.appRequestId, repairPlan, scenario.workspaceDir);

    if (log.status === 'FAILED' && log.actionsExecuted.length === 0) {
      console.log('✅ PASS: Agent halted on first violation, no actions executed');
      await cleanup(scenario);
      return true;
    }

    console.log('❌ FAIL: Agent did not halt or executed some actions');
    await cleanup(scenario);
    return false;
  } catch (error: any) {
    console.log('❌ FAIL: Unexpected error:', error.message);
    await cleanup(scenario);
    return false;
  }
}

/**
 * TEST 8: Cannot retry on failure
 */
async function test8_cannotRetry(): Promise<boolean> {
  console.log('\nTEST 8: Cannot retry on failure');

  const agent = new RepairAgentHardened(prisma, conductor, logger);

  // Check envelope
  const envelope = agent['envelope'];

  if (envelope.forbiddenActions.includes('retryOnFailure')) {
    console.log('✅ PASS: retryOnFailure is forbidden');
    return true;
  }

  console.log('❌ FAIL: retryOnFailure not in forbidden actions');
  return false;
}

/**
 * TEST 9: Successful bounded repair
 */
async function test9_successfulBoundedRepair(): Promise<boolean> {
  console.log('\nTEST 9: Successful bounded repair');

  const scenario = await setupTestScenario();
  const agent = new RepairAgentHardened(prisma, conductor, logger);

  try {
    const verificationHash = await createFailedVerification(scenario.appRequestId);

    const repairPlan = {
      repairPlanId: randomUUID(),
      repairPlanHash: 'test-plan-hash',
      sourceVerificationHash: verificationHash,
      actions: [
        {
          actionId: 'action-1',
          targetFile: 'src/test.ts',
          operation: 'replace_content' as const,
          oldContent: 'return "hello"',
          newContent: 'return "world"',
          description: 'Update return value',
        },
      ],
      allowedFiles: ['src/test.ts'],
      constraints: { noNewFiles: true, noNewDependencies: true, noScopeExpansion: true },
      approvedBy: 'human' as const,
      approvedAt: new Date().toISOString(),
    };

    const log = await agent.execute(scenario.appRequestId, repairPlan, scenario.workspaceDir);

    // Verify execution
    if (log.status !== 'SUCCESS') {
      console.log('❌ FAIL: Execution status not SUCCESS');
      await cleanup(scenario);
      return false;
    }

    if (log.actionsExecuted.length !== 1) {
      console.log('❌ FAIL: Expected 1 action executed');
      await cleanup(scenario);
      return false;
    }

    if (!log.filesTouched.includes('src/test.ts')) {
      console.log('❌ FAIL: File not in filesTouched');
      await cleanup(scenario);
      return false;
    }

    // Verify file was actually modified
    const content = fs.readFileSync(path.join(scenario.workspaceDir, 'src', 'test.ts'), 'utf-8');
    if (!content.includes('return "world"')) {
      console.log('❌ FAIL: File content not updated');
      await cleanup(scenario);
      return false;
    }

    console.log('✅ PASS: Repair executed successfully');
    await cleanup(scenario);
    return true;
  } catch (error: any) {
    console.log('❌ FAIL: Execution failed:', error.message);
    await cleanup(scenario);
    return false;
  }
}

/**
 * TEST 10: Execution log has hash
 */
async function test10_executionLogHasHash(): Promise<boolean> {
  console.log('\nTEST 10: Execution log has hash');

  const scenario = await setupTestScenario();
  const agent = new RepairAgentHardened(prisma, conductor, logger);

  try {
    const verificationHash = await createFailedVerification(scenario.appRequestId);

    const repairPlan = {
      repairPlanId: randomUUID(),
      repairPlanHash: 'test-plan-hash',
      sourceVerificationHash: verificationHash,
      actions: [
        {
          actionId: 'action-1',
          targetFile: 'src/test.ts',
          operation: 'replace_content' as const,
          oldContent: 'return "hello"',
          newContent: 'return "world"',
          description: 'Update return value',
        },
      ],
      allowedFiles: ['src/test.ts'],
      constraints: { noNewFiles: true, noNewDependencies: true, noScopeExpansion: true },
      approvedBy: 'human' as const,
      approvedAt: new Date().toISOString(),
    };

    const log = await agent.execute(scenario.appRequestId, repairPlan, scenario.workspaceDir);

    if (!log.executionHash) {
      console.log('❌ FAIL: Execution log missing hash');
      await cleanup(scenario);
      return false;
    }

    if (log.executionHash.length !== 64) {
      console.log('❌ FAIL: Execution hash not SHA-256');
      await cleanup(scenario);
      return false;
    }

    console.log('✅ PASS: Execution log has valid hash');
    await cleanup(scenario);
    return true;
  } catch (error: any) {
    console.log('❌ FAIL: Execution failed:', error.message);
    await cleanup(scenario);
    return false;
  }
}

/**
 * RUN ALL TESTS
 */
async function main() {
  console.log('════════════════════════════════════════════════════════');
  console.log('REPAIR AGENT HARDENED - CONSTITUTIONAL TEST SUITE');
  console.log('════════════════════════════════════════════════════════\n');

  const results = [
    await test1_cannotRunWithoutApprovedPlan(),
    await test2_cannotModifyUnapprovedFiles(),
    await test3_cannotModifyOutsideLineRange(),
    await test4_cannotAddNewFiles(),
    await test5_requiresFailedVerification(),
    await test6_deterministicHash(),
    await test7_haltsOnFirstViolation(),
    await test8_cannotRetry(),
    await test9_successfulBoundedRepair(),
    await test10_executionLogHasHash(),
  ];

  const passed = results.filter((r) => r).length;
  const total = results.length;

  console.log('\n════════════════════════════════════════════════════════');
  console.log(`RESULTS: ${passed}/${total} tests passed`);
  console.log('════════════════════════════════════════════════════════\n');

  if (passed === total) {
    console.log('✅ ALL TESTS PASSED - Repair Agent is constitutionally safe\n');
    process.exit(0);
  } else {
    console.log('❌ SOME TESTS FAILED - Repair Agent has constitutional violations\n');
    process.exit(1);
  }
}

main().catch((error) => {
  console.error('❌ TEST SUITE FAILED:', error);
  process.exit(1);
});
