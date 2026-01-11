/**
 * Execution Planner Test Suite
 *
 * Tests the deterministic decomposition of build prompts into micro-execution units
 */

import { PrismaClient } from '@prisma/client';
import { ForgeConductor } from './src/conductor/forge-conductor.js';
import { ExecutionPlanner } from './src/agents/execution-planner.js';
import pino from 'pino';
import { randomUUID } from 'crypto';

const prisma = new PrismaClient();
const logger = pino({ level: 'info' });
const conductor = new ForgeConductor(prisma, logger as any);
const planner = new ExecutionPlanner(prisma, conductor, logger);

async function cleanup() {
  console.log('\n🧹 Cleaning up...');
  const appRequests = await prisma.appRequest.findMany({
    where: { prompt: { contains: 'TEST_EXECUTION_PLANNER' } },
  });
  for (const req of appRequests) {
    await prisma.appRequest.delete({ where: { id: req.id } });
  }
  console.log('✅ Cleanup complete\n');
}

async function setupProject() {
  console.log('📦 Setting up test project...');

  const project = await prisma.project.create({
    data: {
      id: randomUUID(),
      name: 'Test Project',
      description: 'Execution Planner Test',
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
      prompt: 'TEST_EXECUTION_PLANNER: Build authentication system',
      status: 'active',
      executionId,
    },
  });

  await conductor.initialize(appRequest.id);

  // Transition through states to build_prompts_ready
  await conductor.transition(appRequest.id, 'base_prompt_ready', 'FoundryArchitect');
  await conductor.transition(appRequest.id, 'planning', 'ProductStrategist');
  await conductor.transition(appRequest.id, 'screens_defined', 'ScreenCartographer');
  await conductor.transition(appRequest.id, 'flows_defined', 'JourneyOrchestrator');
  await conductor.transition(appRequest.id, 'designs_ready', 'VisualForge');
  await conductor.transition(appRequest.id, 'rules_locked', 'ConstraintCompiler');
  await conductor.transition(appRequest.id, 'build_prompts_ready', 'BuildPromptEngineer');

  console.log('✅ Project setup complete\n');
  return { project, appRequest };
}

async function createLargeBuildPrompt(appRequestId: string): Promise<string> {
  // Create a large build prompt that should be decomposed
  const buildPrompt = await prisma.buildPrompt.create({
    data: {
      id: randomUUID(),
      appRequestId,
      title: 'Large Build Prompt: Complete Auth System',
      content: 'Implementation of authentication',
      sequenceIndex: 0,
      status: 'approved',
      allowedCreateFiles: JSON.stringify([
        'src/auth/auth-service.ts',
        'src/auth/jwt-utils.ts',
        'src/auth/password-hash.ts',
        'src/middleware/auth-middleware.ts',
        'src/api/auth/login.ts',
        'src/api/auth/register.ts',
        'src/components/LoginForm.tsx',
      ]),
      allowedModifyFiles: JSON.stringify([
        'src/index.ts',
        'src/types.ts',
      ]),
      forbiddenFiles: JSON.stringify([
        'prisma/schema.prisma',
        'src/conductor/**/*',
      ]),
      fullRewriteFiles: JSON.stringify([]),
      dependencyManifest: JSON.stringify({
        newDependencies: { 'jsonwebtoken': '^9.0.0', 'bcrypt': '^5.1.0' },
        devDependencies: { '@types/jsonwebtoken': '^9.0.0', '@types/bcrypt': '^5.1.0' },
        rationale: ['jsonwebtoken: JWT token generation', 'bcrypt: Password hashing'],
      }),
      modificationIntent: JSON.stringify({
        'src/auth/auth-service.ts': { intent: 'Create auth service', constraints: [] },
        'src/auth/jwt-utils.ts': { intent: 'Create JWT utilities', constraints: [] },
      }),
    },
  });

  return buildPrompt.id;
}

async function createSmallBuildPrompt(appRequestId: string): Promise<string> {
  // Create a small build prompt that should NOT be decomposed
  const buildPrompt = await prisma.buildPrompt.create({
    data: {
      id: randomUUID(),
      appRequestId,
      title: 'Small Build Prompt: Add Helper Function',
      content: 'Add a small utility function',
      sequenceIndex: 1,
      status: 'approved',
      allowedCreateFiles: JSON.stringify(['src/utils/helper.ts']),
      allowedModifyFiles: JSON.stringify([]),
      forbiddenFiles: JSON.stringify(['prisma/schema.prisma']),
      fullRewriteFiles: JSON.stringify([]),
      dependencyManifest: JSON.stringify({
        newDependencies: {},
        devDependencies: {},
        rationale: [],
      }),
      modificationIntent: JSON.stringify({
        'src/utils/helper.ts': { intent: 'Add utility function', constraints: [] },
      }),
    },
  });

  return buildPrompt.id;
}

// TEST 1: Cannot start unless Conductor = build_prompts_ready
async function test1_CannotStartWithWrongState() {
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('TEST 1: Cannot Start Unless Conductor = build_prompts_ready');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  const project = await prisma.project.create({
    data: { id: randomUUID(), name: 'Test', description: 'Test' },
  });

  const appRequest = await prisma.appRequest.create({
    data: {
      id: randomUUID(),
      projectId: project.id,
      prompt: 'TEST',
      status: 'active',
    },
  });

  await conductor.initialize(appRequest.id);

  const buildPrompt = await prisma.buildPrompt.create({
    data: {
      id: randomUUID(),
      appRequestId: appRequest.id,
      title: 'Test',
      content: 'Test',
      sequenceIndex: 0,
      status: 'approved',
      allowedCreateFiles: '[]',
      allowedModifyFiles: '[]',
      forbiddenFiles: '[]',
      fullRewriteFiles: '[]',
      dependencyManifest: '{}',
      modificationIntent: '{}',
    },
  });

  try {
    await planner.start(buildPrompt.id);
    console.log('❌ FAIL: Should have rejected start\n');
    return false;
  } catch (error: any) {
    if (error.message.includes("expected 'build_prompts_ready'")) {
      console.log('✅ PASS: Correctly rejected start');
      console.log(`   Error: ${error.message}\n`);
      return true;
    }
    throw error;
  }
}

// TEST 2: Large prompt decomposes into multiple units
async function test2_LargePromptDecomposes(appRequestId: string) {
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('TEST 2: Large Prompt Decomposes Into Multiple Units');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  const buildPromptId = await createLargeBuildPrompt(appRequestId);
  const plan = await planner.start(buildPromptId);

  if (plan.units.length <= 1) {
    console.log(`❌ FAIL: Expected multiple units, got ${plan.units.length}\n`);
    return false;
  }

  console.log(`✅ Large prompt decomposed into ${plan.units.length} units:`);
  plan.units.forEach((unit, idx) => {
    console.log(`   ${idx + 1}. ${unit.title}`);
  });
  console.log();

  return true;
}

// TEST 3: Small prompt produces single unit
async function test3_SmallPromptSingleUnit(appRequestId: string) {
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('TEST 3: Small Prompt Produces Single Unit');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  const buildPromptId = await createSmallBuildPrompt(appRequestId);
  const plan = await planner.start(buildPromptId);

  if (plan.units.length !== 1) {
    console.log(`❌ FAIL: Expected 1 unit, got ${plan.units.length}\n`);
    return false;
  }

  console.log(`✅ Small prompt produced single unit: ${plan.units[0].title}\n`);
  return true;
}

// TEST 4: Dependency install isolated
async function test4_DependencyIsolation(appRequestId: string) {
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('TEST 4: Dependency Install Isolated Into Own Unit');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  const buildPromptId = await createLargeBuildPrompt(appRequestId);
  const plan = await planner.start(buildPromptId);

  // Find dependency unit
  const depUnit = plan.units.find(u => u.title.includes('Dependencies'));

  if (!depUnit) {
    console.log('❌ FAIL: No dedicated dependency unit found\n');
    return false;
  }

  if (depUnit.allowedCreateFiles.length > 0 || depUnit.allowedModifyFiles.length > 0) {
    console.log('❌ FAIL: Dependency unit should not create/modify files\n');
    return false;
  }

  console.log('✅ Dependency unit isolated:');
  console.log(`   Title: ${depUnit.title}`);
  console.log(`   Sequence: ${depUnit.sequenceIndex}`);
  console.log(`   Files: 0 (correct)\n`);

  return true;
}

// TEST 5: Execution units ordered deterministically
async function test5_DeterministicOrdering(appRequestId: string) {
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('TEST 5: Execution Units Ordered Deterministically');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  const buildPromptId = await createLargeBuildPrompt(appRequestId);
  const plan = await planner.start(buildPromptId);

  // Check sequence indexes are sequential
  for (let i = 0; i < plan.units.length; i++) {
    if (plan.units[i].sequenceIndex !== i) {
      console.log(`❌ FAIL: Unit ${i} has sequenceIndex ${plan.units[i].sequenceIndex}\n`);
      return false;
    }
  }

  console.log('✅ All units have sequential indexes (0 to N-1)\n');
  return true;
}

// TEST 6: Approving plan allows execution
async function test6_ApprovePlan(appRequestId: string) {
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('TEST 6: Approving Plan Allows Execution');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  const buildPromptId = await createSmallBuildPrompt(appRequestId);
  const plan = await planner.start(buildPromptId);

  await planner.approvePlan(plan.id);

  const currentUnit = await planner.getCurrentUnit(appRequestId);

  if (!currentUnit) {
    console.log('❌ FAIL: No current unit after approval\n');
    return false;
  }

  console.log('✅ Plan approved, current unit available:');
  console.log(`   Unit: ${currentUnit.title}\n`);

  return true;
}

// TEST 7: Rejecting plan halts execution
async function test7_RejectPlan(appRequestId: string) {
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('TEST 7: Rejecting Plan Halts Execution');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  const buildPromptId = await createSmallBuildPrompt(appRequestId);
  const plan = await planner.start(buildPromptId);

  await planner.rejectPlan(plan.id, 'Test rejection');

  const dbPlan = await prisma.executionPlan.findUnique({ where: { id: plan.id } });

  if (dbPlan?.status !== 'rejected') {
    console.log(`❌ FAIL: Plan status is ${dbPlan?.status}, expected 'rejected'\n`);
    return false;
  }

  console.log('✅ Plan rejected successfully\n');
  return true;
}

async function runAllTests() {
  console.log('\n╔═══════════════════════════════════════════════════════╗');
  console.log('║  EXECUTION PLANNER TEST SUITE                         ║');
  console.log('╚═══════════════════════════════════════════════════════╝\n');

  try {
    await cleanup();
    const { appRequest } = await setupProject();

    const results: boolean[] = [];
    results.push(await test1_CannotStartWithWrongState());
    results.push(await test2_LargePromptDecomposes(appRequest.id));
    results.push(await test3_SmallPromptSingleUnit(appRequest.id));
    results.push(await test4_DependencyIsolation(appRequest.id));
    results.push(await test5_DeterministicOrdering(appRequest.id));
    results.push(await test6_ApprovePlan(appRequest.id));
    results.push(await test7_RejectPlan(appRequest.id));

    if (!results.every(r => r === true)) {
      console.log('╔═══════════════════════════════════════════════════════╗');
      console.log('║  SOME TESTS FAILED ❌                                 ║');
      console.log('╚═══════════════════════════════════════════════════════╝\n');
      return 1;
    }

    console.log('╔═══════════════════════════════════════════════════════╗');
    console.log('║  ALL TESTS COMPLETED SUCCESSFULLY! ✅                 ║');
    console.log('╚═══════════════════════════════════════════════════════╝\n');

    console.log('Summary:');
    console.log('✅ Cannot start unless Conductor = build_prompts_ready');
    console.log('✅ Large prompt decomposes into multiple units');
    console.log('✅ Small prompt produces single unit');
    console.log('✅ Dependency install isolated into own unit');
    console.log('✅ Execution units ordered deterministically');
    console.log('✅ Approving plan allows execution');
    console.log('✅ Rejecting plan halts execution\n');

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
    console.error(error);
    process.exit(1);
  });
