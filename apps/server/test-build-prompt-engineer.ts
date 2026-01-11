/**
 * Build Prompt Engineer Test Script
 */

import 'dotenv/config';
import { PrismaClient } from '@prisma/client';
import { ForgeConductor } from './src/conductor/forge-conductor.js';
import { BuildPromptEngineer } from './src/agents/build-prompt-engineer.js';
import { createLogger } from './src/utils/logger.js';
import { randomUUID } from 'crypto';

const prisma = new PrismaClient();
const logger = createLogger();
const conductor = new ForgeConductor(prisma, logger);
const engineer = new BuildPromptEngineer(prisma, conductor, logger);

const TEST_PROJECT_ID = 'build-prompt-engineer-test';

async function cleanup() {
  console.log('\n🧹 Cleaning up...');
  const appRequests = await prisma.appRequest.findMany({
    where: { projectId: TEST_PROJECT_ID },
    select: { id: true },
  });
  const appRequestIds = appRequests.map(ar => ar.id);

  if (appRequestIds.length > 0) {
    await prisma.buildPrompt.deleteMany({ where: { appRequestId: { in: appRequestIds } } });
    await prisma.projectRuleSet.deleteMany({ where: { appRequestId: { in: appRequestIds } } });
    await prisma.screenMockup.deleteMany({ where: { appRequestId: { in: appRequestIds } } });
    await prisma.screenIndex.deleteMany({ where: { appRequestId: { in: appRequestIds } } });
  }

  await prisma.conductorState.deleteMany({ where: { appRequest: { projectId: TEST_PROJECT_ID } } });
  await prisma.appRequest.deleteMany({ where: { projectId: TEST_PROJECT_ID } });
  await prisma.execution.deleteMany({ where: { projectId: TEST_PROJECT_ID } });
  await prisma.project.deleteMany({ where: { id: TEST_PROJECT_ID } });
  console.log('✅ Cleanup complete\n');
}

async function setupProject() {
  console.log('📦 Setting up test project...');

  await prisma.project.create({
    data: { id: TEST_PROJECT_ID, name: 'Build Prompt Test', description: 'Test Tier 4 agent' },
  });

  const execution = await prisma.execution.create({
    data: { id: randomUUID(), projectId: TEST_PROJECT_ID, status: 'running' },
  });

  const appRequest = await prisma.appRequest.create({
    data: {
      id: randomUUID(),
      projectId: TEST_PROJECT_ID,
      prompt: 'Build prompts test',
      status: 'pending',
      executionId: execution.id,
    },
  });

  await conductor.initialize(appRequest.id);
  await conductor.transition(appRequest.id, 'base_prompt_ready', 'FoundryArchitect');
  await conductor.transition(appRequest.id, 'planning', 'ProductStrategist');
  await conductor.transition(appRequest.id, 'screens_defined', 'ScreenCartographer');
  await conductor.transition(appRequest.id, 'flows_defined', 'JourneyOrchestrator');
  await conductor.transition(appRequest.id, 'designs_ready', 'VisualForge');
  await conductor.transition(appRequest.id, 'rules_locked', 'ConstraintCompiler');

  await prisma.screenIndex.create({
    data: {
      id: randomUUID(),
      appRequestId: appRequest.id,
      screens: JSON.stringify(['Screen1', 'Screen2']),
      status: 'approved',
      approvedAt: new Date(),
    },
  });

  await prisma.projectRuleSet.create({
    data: {
      id: randomUUID(),
      appRequestId: appRequest.id,
      content: 'Project rules content',
      status: 'approved',
      approvedAt: new Date(),
    },
  });

  console.log('✅ Project setup complete\n');
  return { appRequest };
}

async function test1_CannotStartWithWrongState() {
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('TEST 1: Cannot Start Unless Conductor = rules_locked');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  const testAppRequest = await prisma.appRequest.create({
    data: { id: randomUUID(), projectId: TEST_PROJECT_ID, prompt: 'Test', status: 'pending' },
  });

  await conductor.initialize(testAppRequest.id);

  try {
    await engineer.start(testAppRequest.id);
    console.log('❌ FAIL: Should have thrown error\n');
    return false;
  } catch (error) {
    console.log('✅ PASS: Correctly rejected start');
    console.log(`   Error: ${error instanceof Error ? error.message : 'Unknown'}\n`);
    return true;
  }
}

async function test2_GenerateFirstPrompt(appRequestId: string) {
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('TEST 2: Generate First Build Prompt');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  const prompt = await engineer.start(appRequestId);
  console.log(`✅ First prompt generated: ${prompt.title}`);
  console.log(`   Order: ${prompt.sequenceIndex}`);
  console.log(`   Status: ${prompt.status}\n`);

  return prompt.sequenceIndex === 0;
}

async function test3_CannotGenerateNextWithoutApproval(appRequestId: string) {
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('TEST 3: Cannot Generate Next Without Approval');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  const state = await conductor.getStateSnapshot(appRequestId);
  if (state.awaitingHuman) {
    console.log('✅ PASS: Conductor awaiting human approval\n');
    return true;
  }

  console.log('❌ FAIL: Should be awaiting approval\n');
  return false;
}

async function test4_ApproveAndGenerateSequentially(appRequestId: string) {
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('TEST 4: Approve and Generate Prompts Sequentially');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  await engineer.approveCurrentPrompt(appRequestId);
  console.log('✅ First prompt approved\n');

  const second = await engineer.generateNextPrompt(appRequestId);
  console.log(`✅ Second prompt generated: ${second.title}`);
  console.log(`   Order: ${second.sequenceIndex}\n`);

  return second.sequenceIndex === 1;
}

async function test5_RejectAllowsRegeneration(appRequestId: string) {
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('TEST 5: Reject Allows Regeneration');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  await engineer.rejectCurrentPrompt(appRequestId, 'Needs more detail');
  console.log('✅ Prompt rejected\n');

  const regenerated = await engineer.generateNextPrompt(appRequestId);
  console.log(`✅ Prompt regenerated: ${regenerated.title}\n`);

  return regenerated.sequenceIndex === 1;
}

async function test6_CompleteAllPrompts(appRequestId: string) {
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('TEST 6: Complete All Prompts and Transition');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  const state = await engineer.getCurrentState(appRequestId);
  const remaining = state.remainingCount;
  console.log(`📊 Remaining prompts: ${remaining + 1}\n`);

  // Approve current and generate remaining
  await engineer.approveCurrentPrompt(appRequestId);

  for (let i = 0; i < remaining; i++) {
    await engineer.generateNextPrompt(appRequestId);
    await engineer.approveCurrentPrompt(appRequestId);
    console.log(`   Approved prompt ${i + 2}\n`);
  }

  const conductorState = await conductor.getStateSnapshot(appRequestId);
  console.log(`✅ Conductor state: ${conductorState.currentStatus}\n`);

  if (conductorState.currentStatus !== 'build_prompts_ready') {
    console.log('❌ FAIL: Should transition to "build_prompts_ready"\n');
    return false;
  }

  console.log('✅ PASS: Transitioned to "build_prompts_ready"\n');
  return true;
}

async function test7_VerifyEvents(appRequestId: string) {
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('TEST 7: Verify Events');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  const appRequest = await prisma.appRequest.findUnique({ where: { id: appRequestId } });
  if (!appRequest?.executionId) return false;

  const events = await prisma.executionEvent.findMany({
    where: {
      executionId: appRequest.executionId,
      type: { in: ['build_prompt_created', 'build_prompt_approved', 'build_prompts_ready'] },
    },
  });

  console.log(`✅ Events found: ${events.length}\n`);
  return events.length > 0;
}

async function test8_ExecutionContractIncluded(appRequestId: string) {
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('TEST 8: Execution Contract Sections Included');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  const firstPrompt = await prisma.buildPrompt.findFirst({
    where: { appRequestId, sequenceIndex: 0 },
  });

  if (!firstPrompt) {
    console.log('❌ FAIL: No first prompt found\n');
    return false;
  }

  // Check that content includes mandatory sections
  const requiredSections = [
    '## Allowed File Operations',
    '### Files to CREATE',
    '### Files to MODIFY (PATCH ONLY)',
    '### Files to MODIFY (FULL REWRITE)',
    '### Files FORBIDDEN to Touch',
    '## Dependency Changes',
    '### New Dependencies',
    '### Dev Dependencies',
    '### Rationale',
    '## Modification Intent',
  ];

  const missingSections = requiredSections.filter(section => !firstPrompt.content.includes(section));

  if (missingSections.length > 0) {
    console.log('❌ FAIL: Missing required sections:');
    missingSections.forEach(s => console.log(`   - ${s}`));
    console.log();
    return false;
  }

  console.log('✅ PASS: All execution contract sections present\n');
  return true;
}

async function test9_ContractFieldsPopulated(appRequestId: string) {
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('TEST 9: Execution Contract Fields Populated');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  const firstPrompt = await prisma.buildPrompt.findFirst({
    where: { appRequestId, sequenceIndex: 0 },
  });

  if (!firstPrompt) return false;

  // Check database fields are populated
  const allowedCreateFiles = JSON.parse(firstPrompt.allowedCreateFiles);
  const forbiddenFiles = JSON.parse(firstPrompt.forbiddenFiles);
  const dependencyManifest = JSON.parse(firstPrompt.dependencyManifest);
  const modificationIntent = JSON.parse(firstPrompt.modificationIntent);

  if (!Array.isArray(allowedCreateFiles) || allowedCreateFiles.length === 0) {
    console.log('❌ FAIL: allowedCreateFiles not populated\n');
    return false;
  }

  if (!Array.isArray(forbiddenFiles) || forbiddenFiles.length === 0) {
    console.log('❌ FAIL: forbiddenFiles not populated\n');
    return false;
  }

  if (typeof dependencyManifest !== 'object') {
    console.log('❌ FAIL: dependencyManifest not an object\n');
    return false;
  }

  if (typeof modificationIntent !== 'object' || Object.keys(modificationIntent).length === 0) {
    console.log('❌ FAIL: modificationIntent not populated\n');
    return false;
  }

  console.log(`✅ allowedCreateFiles: ${allowedCreateFiles.length} files`);
  console.log(`✅ forbiddenFiles: ${forbiddenFiles.length} files`);
  console.log(`✅ dependencyManifest: valid`);
  console.log(`✅ modificationIntent: ${Object.keys(modificationIntent).length} files\n`);

  return true;
}

async function test10_ForbiddenFilesEnforced(appRequestId: string) {
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('TEST 10: Forbidden Files Always Enforced');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  const prompts = await prisma.buildPrompt.findMany({
    where: { appRequestId },
    orderBy: { sequenceIndex: 'asc' },
  });

  const alwaysForbidden = [
    'prisma/schema.prisma',
    'src/conductor',
    'src/agents/verification-agent.ts',
    'docs/PROJECT_RULES.md',
  ];

  for (const prompt of prompts) {
    const forbiddenFiles = JSON.parse(prompt.forbiddenFiles);

    for (const forbidden of alwaysForbidden) {
      const found = forbiddenFiles.some((f: string) => f.includes(forbidden));
      if (!found) {
        console.log(`❌ FAIL: Prompt ${prompt.sequenceIndex} missing forbidden: ${forbidden}\n`);
        return false;
      }
    }
  }

  console.log(`✅ PASS: All ${prompts.length} prompts include forbidden files\n`);
  return true;
}

async function test11_DependencyDeduplication(appRequestId: string) {
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('TEST 11: Dependency Deduplication');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  const prompts = await prisma.buildPrompt.findMany({
    where: { appRequestId },
    orderBy: { sequenceIndex: 'asc' },
  });

  const allDeps = new Set<string>();
  const duplicates: string[] = [];

  for (const prompt of prompts) {
    const manifest = JSON.parse(prompt.dependencyManifest);
    const deps = [
      ...Object.keys(manifest.newDependencies || {}),
      ...Object.keys(manifest.devDependencies || {}),
    ];

    for (const dep of deps) {
      if (allDeps.has(dep)) {
        duplicates.push(dep);
      }
      allDeps.add(dep);
    }
  }

  if (duplicates.length > 0) {
    console.log(`❌ FAIL: Duplicate dependencies found: ${duplicates.join(', ')}\n`);
    return false;
  }

  console.log(`✅ PASS: No duplicate dependencies across ${prompts.length} prompts\n`);
  return true;
}

async function test12_ModificationIntentComplete(appRequestId: string) {
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('TEST 12: Modification Intent Complete');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  const prompts = await prisma.buildPrompt.findMany({
    where: { appRequestId },
    orderBy: { sequenceIndex: 'asc' },
  });

  for (const prompt of prompts) {
    const allowedCreateFiles = JSON.parse(prompt.allowedCreateFiles);
    const allowedModifyFiles = JSON.parse(prompt.allowedModifyFiles);
    const fullRewriteFiles = JSON.parse(prompt.fullRewriteFiles);
    const modificationIntent = JSON.parse(prompt.modificationIntent);

    const allFiles = [...allowedCreateFiles, ...allowedModifyFiles, ...fullRewriteFiles];

    for (const file of allFiles) {
      if (!modificationIntent[file]) {
        console.log(`❌ FAIL: Prompt ${prompt.sequenceIndex} missing intent for: ${file}\n`);
        return false;
      }

      const intent = modificationIntent[file];
      if (!intent.intent || !intent.constraints) {
        console.log(`❌ FAIL: Prompt ${prompt.sequenceIndex} incomplete intent for: ${file}\n`);
        return false;
      }
    }
  }

  console.log(`✅ PASS: All files have complete modification intent\n`);
  return true;
}

async function runAllTests() {
  console.log('\n╔═══════════════════════════════════════════════════════╗');
  console.log('║  BUILD PROMPT ENGINEER TEST SUITE                     ║');
  console.log('╚═══════════════════════════════════════════════════════╝\n');

  try {
    await cleanup();
    const { appRequest } = await setupProject();

    const results: boolean[] = [];
    results.push(await test1_CannotStartWithWrongState());
    results.push(await test2_GenerateFirstPrompt(appRequest.id));
    results.push(await test3_CannotGenerateNextWithoutApproval(appRequest.id));
    results.push(await test4_ApproveAndGenerateSequentially(appRequest.id));
    results.push(await test5_RejectAllowsRegeneration(appRequest.id));
    results.push(await test6_CompleteAllPrompts(appRequest.id));
    results.push(await test7_VerifyEvents(appRequest.id));
    results.push(await test8_ExecutionContractIncluded(appRequest.id));
    results.push(await test9_ContractFieldsPopulated(appRequest.id));
    results.push(await test10_ForbiddenFilesEnforced(appRequest.id));
    results.push(await test11_DependencyDeduplication(appRequest.id));
    results.push(await test12_ModificationIntentComplete(appRequest.id));

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
    console.log('✅ Cannot start unless Conductor = rules_locked');
    console.log('✅ First prompt generated and paused');
    console.log('✅ Cannot generate next without approval');
    console.log('✅ Prompts generated in deterministic order');
    console.log('✅ Rejection allows regeneration');
    console.log('✅ All prompts approved transitions to "build_prompts_ready"');
    console.log('✅ Events emitted correctly');
    console.log('✅ Execution contract sections included in prompts');
    console.log('✅ Contract fields populated in database');
    console.log('✅ Forbidden files enforced in all prompts');
    console.log('✅ Dependencies deduplicated across prompts');
    console.log('✅ Modification intent complete for all files\n');

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
