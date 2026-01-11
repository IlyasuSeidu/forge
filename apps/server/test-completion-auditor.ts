/**
 * Completion Auditor Test Suite
 *
 * Tests the final decision authority agent that determines build progress
 * after verification completes.
 */

import { PrismaClient } from '@prisma/client';
import { ForgeConductor } from './src/conductor/forge-conductor.js';
import { CompletionAuditor } from './src/agents/completion-auditor.js';
import pino from 'pino';
import { randomUUID } from 'crypto';

const prisma = new PrismaClient();
const logger = pino({ level: 'info' });
const conductor = new ForgeConductor(prisma, logger as any);
const auditor = new CompletionAuditor(prisma, conductor, logger);

async function cleanup() {
  console.log('\n🧹 Cleaning up...');
  const appRequests = await prisma.appRequest.findMany({
    where: { prompt: { contains: 'TEST_COMPLETION_AUDITOR' } },
  });
  for (const req of appRequests) {
    await prisma.appRequest.delete({ where: { id: req.id } });
  }
  console.log('✅ Cleanup complete\n');
}

async function setupTestProject() {
  console.log('📦 Setting up test project...');

  const project = await prisma.project.create({
    data: {
      id: randomUUID(),
      name: 'Test Project',
      description: 'Completion Auditor Test',
    },
  });

  const executionId = randomUUID();
  const execution = await prisma.execution.create({
    data: {
      id: executionId,
      projectId: project.id,
      status: 'pending',
    },
  });

  const appRequest = await prisma.appRequest.create({
    data: {
      id: randomUUID(),
      projectId: project.id,
      prompt: 'TEST_COMPLETION_AUDITOR: Test build',
      status: 'active',
      executionId,
    },
  });

  await conductor.initialize(appRequest.id);

  console.log('✅ Project setup complete\n');
  return { project, appRequest, execution };
}

async function transitionToVerifying(appRequestId: string) {
  await conductor.transition(appRequestId, 'base_prompt_ready', 'FoundryArchitect');
  await conductor.transition(appRequestId, 'planning', 'ProductStrategist');
  await conductor.transition(appRequestId, 'screens_defined', 'ScreenCartographer');
  await conductor.transition(appRequestId, 'flows_defined', 'JourneyOrchestrator');
  await conductor.transition(appRequestId, 'designs_ready', 'VisualForge');
  await conductor.transition(appRequestId, 'rules_locked', 'ConstraintCompiler');
  await conductor.transition(appRequestId, 'build_prompts_ready', 'BuildPromptEngineer');
  await conductor.transition(appRequestId, 'building', 'ForgeImplementer');
  await conductor.transition(appRequestId, 'verifying', 'Verification');
}

async function createExecutionPlanWithUnits(appRequestId: string, unitCount: number) {
  const planId = randomUUID();

  const plan = await prisma.executionPlan.create({
    data: {
      id: planId,
      appRequestId,
      buildPromptId: randomUUID(),
      status: 'approved',
    },
  });

  const units = [];
  for (let i = 0; i < unitCount; i++) {
    const unit = await prisma.executionUnit.create({
      data: {
        id: randomUUID(),
        executionPlanId: planId,
        sequenceIndex: i,
        title: `Unit ${i}`,
        description: `Test unit ${i}`,
        status: i === 0 ? 'completed' : 'pending',
        allowedCreateFiles: JSON.stringify([`src/file${i}.ts`]),
        allowedModifyFiles: JSON.stringify([]),
        forbiddenFiles: JSON.stringify([]),
        fullRewriteFiles: JSON.stringify([]),
        dependencyChanges: JSON.stringify({}),
        modificationIntent: JSON.stringify({}),
        completedAt: i === 0 ? new Date() : null,
      },
    });
    units.push(unit);
  }

  return { plan, units };
}

async function createVerification(
  appRequestId: string,
  executionId: string,
  status: 'passed' | 'failed',
  errors: string | null = null,
  attempt: number = 1
) {
  return await prisma.verification.create({
    data: {
      id: randomUUID(),
      appRequestId,
      executionId,
      status,
      errors,
      attempt,
    },
  });
}

// TEST 1: Verification passed + next unit exists → proceed
async function test1_VerificationPassedProceed() {
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('TEST 1: Verification Passed + Next Unit → Proceed');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  const { appRequest, execution } = await setupTestProject();
  await transitionToVerifying(appRequest.id);

  // Create plan with multiple units (first completed, others pending)
  await createExecutionPlanWithUnits(appRequest.id, 3);

  // Create passed verification
  await createVerification(appRequest.id, execution.id, 'passed');

  const decision = await auditor.audit(appRequest.id);

  if (decision.type !== 'proceed_to_next_unit') {
    console.log(`❌ FAIL: Expected 'proceed_to_next_unit', got '${decision.type}'\n`);
    return false;
  }

  console.log('✅ PASS: Correctly decided to proceed to next unit\n');
  return true;
}

// TEST 2: Verification passed + no units left → completed
async function test2_VerificationPassedCompleted() {
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('TEST 2: Verification Passed + No Units → Completed');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  const { appRequest, execution } = await setupTestProject();
  await transitionToVerifying(appRequest.id);

  // Create plan with single unit (completed)
  const { units } = await createExecutionPlanWithUnits(appRequest.id, 1);

  // Mark the only unit as completed
  await prisma.executionUnit.update({
    where: { id: units[0].id },
    data: { status: 'completed', completedAt: new Date() },
  });

  // Create passed verification
  await createVerification(appRequest.id, execution.id, 'passed');

  const decision = await auditor.audit(appRequest.id);

  if (decision.type !== 'mark_completed') {
    console.log(`❌ FAIL: Expected 'mark_completed', got '${decision.type}'\n`);
    return false;
  }

  console.log('✅ PASS: Correctly decided to mark as completed\n');
  return true;
}

// TEST 3: Verification failed + repair available → retry
async function test3_VerificationFailedRetry() {
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('TEST 3: Verification Failed + Repair Available → Retry');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  const { appRequest, execution } = await setupTestProject();
  await transitionToVerifying(appRequest.id);

  await createExecutionPlanWithUnits(appRequest.id, 2);

  // Create failed verification with repairable error
  await createVerification(
    appRequest.id,
    execution.id,
    'failed',
    'Missing DOM ID: user-profile',
    1
  );

  const decision = await auditor.audit(appRequest.id);

  if (decision.type !== 'retry_with_repair') {
    console.log(`❌ FAIL: Expected 'retry_with_repair', got '${decision.type}'\n`);
    return false;
  }

  console.log('✅ PASS: Correctly decided to retry with repair\n');
  return true;
}

// TEST 4: Verification failed + repair exhausted → escalate
async function test4_VerificationFailedEscalate() {
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('TEST 4: Verification Failed + Repair Exhausted → Escalate');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  const { appRequest, execution } = await setupTestProject();
  await transitionToVerifying(appRequest.id);

  await createExecutionPlanWithUnits(appRequest.id, 2);

  // Create failed verification with MAX attempts
  await createVerification(
    appRequest.id,
    execution.id,
    'failed',
    'Missing file: src/utils.ts',
    3 // MAX_REPAIR_ATTEMPTS
  );

  const decision = await auditor.audit(appRequest.id);

  if (decision.type !== 'escalate_to_human') {
    console.log(`❌ FAIL: Expected 'escalate_to_human', got '${decision.type}'\n`);
    return false;
  }

  if (!('reason' in decision) || !decision.reason.includes('Maximum')) {
    console.log('❌ FAIL: Expected reason to mention maximum attempts\n');
    return false;
  }

  console.log('✅ PASS: Correctly decided to escalate to human\n');
  return true;
}

// TEST 5: Verification failed + non-repairable → failed
async function test5_VerificationFailedNonRepairable() {
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('TEST 5: Verification Failed + Non-Repairable → Failed');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  const { appRequest, execution } = await setupTestProject();
  await transitionToVerifying(appRequest.id);

  await createExecutionPlanWithUnits(appRequest.id, 2);

  // Create failed verification with non-repairable error
  await createVerification(
    appRequest.id,
    execution.id,
    'failed',
    'Security violation: attempted to access /etc/passwd',
    1
  );

  const decision = await auditor.audit(appRequest.id);

  if (decision.type !== 'mark_failed') {
    console.log(`❌ FAIL: Expected 'mark_failed', got '${decision.type}'\n`);
    return false;
  }

  if (!('reason' in decision) || !decision.reason.includes('Non-repairable')) {
    console.log('❌ FAIL: Expected reason to mention non-repairable error\n');
    return false;
  }

  console.log('✅ PASS: Correctly decided to mark as failed\n');
  return true;
}

// TEST 6: Auditor never mutates state
async function test6_AuditorNeverMutatesState() {
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('TEST 6: Auditor Never Mutates State');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  const { appRequest, execution } = await setupTestProject();
  await transitionToVerifying(appRequest.id);

  const { units } = await createExecutionPlanWithUnits(appRequest.id, 3);
  await createVerification(appRequest.id, execution.id, 'passed');

  // Capture state before audit
  const unitsBefore = await prisma.executionUnit.findMany({
    where: { executionPlanId: units[0].executionPlanId },
  });

  const conductorBefore = await conductor.getStateSnapshot(appRequest.id);

  // Run audit
  await auditor.audit(appRequest.id);

  // Check state after audit
  const unitsAfter = await prisma.executionUnit.findMany({
    where: { executionPlanId: units[0].executionPlanId },
  });

  const conductorAfter = await conductor.getStateSnapshot(appRequest.id);

  // Verify units unchanged (except for CompletionDecision records)
  if (unitsBefore.length !== unitsAfter.length) {
    console.log('❌ FAIL: Auditor modified execution units\n');
    return false;
  }

  for (let i = 0; i < unitsBefore.length; i++) {
    if (
      unitsBefore[i].status !== unitsAfter[i].status ||
      unitsBefore[i].completedAt?.getTime() !== unitsAfter[i].completedAt?.getTime()
    ) {
      console.log('❌ FAIL: Auditor modified execution unit status\n');
      return false;
    }
  }

  // Verify conductor state unchanged
  if (conductorBefore?.currentStatus !== conductorAfter?.currentStatus) {
    console.log('❌ FAIL: Auditor modified conductor state\n');
    return false;
  }

  console.log('✅ PASS: Auditor did not mutate state\n');
  return true;
}

// TEST 7: Auditor emits exactly one event
async function test7_AuditorEmitsOneEvent() {
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('TEST 7: Auditor Emits Exactly One Event');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  const { appRequest, execution } = await setupTestProject();
  await transitionToVerifying(appRequest.id);

  await createExecutionPlanWithUnits(appRequest.id, 2);
  await createVerification(appRequest.id, execution.id, 'passed');

  // Count events before
  const eventsBefore = await prisma.executionEvent.findMany({
    where: { executionId: execution.id },
  });

  // Run audit
  await auditor.audit(appRequest.id);

  // Count events after
  const eventsAfter = await prisma.executionEvent.findMany({
    where: { executionId: execution.id },
  });

  const newEvents = eventsAfter.length - eventsBefore.length;

  if (newEvents !== 1) {
    console.log(`❌ FAIL: Expected exactly 1 event, got ${newEvents}\n`);
    return false;
  }

  // Verify event type
  const latestEvent = eventsAfter[eventsAfter.length - 1];
  if (!latestEvent.type.startsWith('completion_audit_')) {
    console.log(`❌ FAIL: Event type '${latestEvent.type}' doesn't start with 'completion_audit_'\n`);
    return false;
  }

  console.log('✅ PASS: Auditor emitted exactly one event\n');
  return true;
}

// TEST 8: Auditor is deterministic
async function test8_AuditorDeterministic() {
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('TEST 8: Auditor Is Deterministic');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  const decisions = [];

  // Run same scenario twice
  for (let i = 0; i < 2; i++) {
    const { appRequest, execution } = await setupTestProject();
    await transitionToVerifying(appRequest.id);

    await createExecutionPlanWithUnits(appRequest.id, 3);
    await createVerification(appRequest.id, execution.id, 'passed');

    const decision = await auditor.audit(appRequest.id);
    decisions.push(decision);

    await cleanup();
  }

  if (decisions[0].type !== decisions[1].type) {
    console.log(`❌ FAIL: Decisions differ: '${decisions[0].type}' vs '${decisions[1].type}'\n`);
    return false;
  }

  console.log('✅ PASS: Auditor is deterministic\n');
  return true;
}

// TEST 9: Error classification works correctly
async function test9_ErrorClassification() {
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('TEST 9: Error Classification Works');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  const testCases = [
    {
      error: 'Ruleset violation: attempted to modify forbidden file',
      expectedDecision: 'mark_failed',
    },
    {
      error: 'Missing DOM ID: login-button',
      expectedDecision: 'retry_with_repair',
    },
    {
      error: 'Architectural conflict: invalid component hierarchy',
      expectedDecision: 'mark_failed',
    },
    {
      error: 'Runtime error: undefined variable foo',
      expectedDecision: 'retry_with_repair',
    },
  ];

  for (const testCase of testCases) {
    const { appRequest, execution } = await setupTestProject();
    await transitionToVerifying(appRequest.id);

    await createExecutionPlanWithUnits(appRequest.id, 2);
    await createVerification(appRequest.id, execution.id, 'failed', testCase.error, 1);

    const decision = await auditor.audit(appRequest.id);

    if (decision.type !== testCase.expectedDecision) {
      console.log(
        `❌ FAIL: For error "${testCase.error}", expected '${testCase.expectedDecision}', got '${decision.type}'\n`
      );
      return false;
    }

    await cleanup();
  }

  console.log('✅ PASS: Error classification works correctly\n');
  return true;
}

// TEST 10: Decision recorded in database
async function test10_DecisionRecorded() {
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('TEST 10: Decision Recorded in Database');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  const { appRequest, execution } = await setupTestProject();
  await transitionToVerifying(appRequest.id);

  await createExecutionPlanWithUnits(appRequest.id, 2);
  await createVerification(appRequest.id, execution.id, 'passed');

  await auditor.audit(appRequest.id);

  const decisions = await prisma.completionDecision.findMany({
    where: { appRequestId: appRequest.id },
  });

  if (decisions.length !== 1) {
    console.log(`❌ FAIL: Expected 1 decision record, got ${decisions.length}\n`);
    return false;
  }

  if (decisions[0].decisionType !== 'proceed_to_next_unit') {
    console.log(`❌ FAIL: Expected decision type 'proceed_to_next_unit', got '${decisions[0].decisionType}'\n`);
    return false;
  }

  console.log('✅ PASS: Decision recorded in database\n');
  return true;
}

async function runAllTests() {
  console.log('\n╔═══════════════════════════════════════════════════════╗');
  console.log('║  COMPLETION AUDITOR TEST SUITE                        ║');
  console.log('╚═══════════════════════════════════════════════════════╝\n');

  try {
    await cleanup();

    const results: boolean[] = [];

    results.push(await test1_VerificationPassedProceed());
    await cleanup();

    results.push(await test2_VerificationPassedCompleted());
    await cleanup();

    results.push(await test3_VerificationFailedRetry());
    await cleanup();

    results.push(await test4_VerificationFailedEscalate());
    await cleanup();

    results.push(await test5_VerificationFailedNonRepairable());
    await cleanup();

    results.push(await test6_AuditorNeverMutatesState());
    await cleanup();

    results.push(await test7_AuditorEmitsOneEvent());
    await cleanup();

    results.push(await test8_AuditorDeterministic());
    await cleanup();

    results.push(await test9_ErrorClassification());
    await cleanup();

    results.push(await test10_DecisionRecorded());
    await cleanup();

    if (!results.every((r) => r === true)) {
      console.log('╔═══════════════════════════════════════════════════════╗');
      console.log('║  SOME TESTS FAILED ❌                                 ║');
      console.log('╚═══════════════════════════════════════════════════════╝\n');
      return 1;
    }

    console.log('╔═══════════════════════════════════════════════════════╗');
    console.log('║  ALL TESTS COMPLETED SUCCESSFULLY! ✅                 ║');
    console.log('╚═══════════════════════════════════════════════════════╝\n');

    console.log('Summary:');
    console.log('✅ Verification passed + next unit → proceed');
    console.log('✅ Verification passed + no units → completed');
    console.log('✅ Verification failed + repair available → retry');
    console.log('✅ Verification failed + repair exhausted → escalate');
    console.log('✅ Verification failed + non-repairable → failed');
    console.log('✅ Auditor never mutates state');
    console.log('✅ Auditor emits exactly one event');
    console.log('✅ Auditor is deterministic');
    console.log('✅ Error classification works');
    console.log('✅ Decision recorded in database\n');

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
  .then((exitCode) => process.exit(exitCode))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
