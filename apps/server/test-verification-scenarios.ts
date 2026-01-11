/**
 * Test script for verification scenarios
 * Tests three scenarios:
 * 1. App passes verification without repair
 * 2. App needs auto-fix and succeeds
 * 3. App fails after max repair attempts
 */

import 'dotenv/config';
import { PrismaClient } from '@prisma/client';
import { VerificationService } from './src/services/verification-service.js';
import { WorkspaceService } from './src/services/workspace-service.js';
import { createLogger } from './src/utils/logger.js';
import fs from 'fs/promises';
import path from 'path';
import { randomUUID } from 'crypto';

const prisma = new PrismaClient();
const logger = createLogger();

const TEST_PROJECT_ID = 'test-verification-scenarios-project';
const TEST_WORKSPACE_PATH = `/tmp/forge-workspaces/${TEST_PROJECT_ID}`;

async function setupProject() {
  // Clean up any existing test project
  await prisma.artifact.deleteMany({ where: { projectId: TEST_PROJECT_ID } });
  await prisma.verification.deleteMany({
    where: {
      appRequest: { projectId: TEST_PROJECT_ID }
    }
  });
  await prisma.appRequest.deleteMany({ where: { projectId: TEST_PROJECT_ID } });
  await prisma.execution.deleteMany({ where: { projectId: TEST_PROJECT_ID } });
  await prisma.project.deleteMany({ where: { id: TEST_PROJECT_ID } });

  // Create test project
  const project = await prisma.project.create({
    data: {
      id: TEST_PROJECT_ID,
      name: 'Verification Test Project',
      description: 'Testing verification scenarios',
    },
  });

  return project;
}

async function scenario1PassesWithoutRepair() {
  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('📋 SCENARIO 1: App passes verification (no repair needed)');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  const execution = await prisma.execution.create({
    data: { id: randomUUID(), projectId: TEST_PROJECT_ID, status: 'running' },
  });

  const appRequest = await prisma.appRequest.create({
    data: {
      id: randomUUID(),
      projectId: TEST_PROJECT_ID,
      prompt: 'Build a working counter app',
      status: 'building',
      executionId: execution.id,
    },
  });

  // Create workspace with CORRECT app (no bugs)
  await fs.mkdir(TEST_WORKSPACE_PATH, { recursive: true });
  // Clean workspace before test
  try {
    const files = await fs.readdir(TEST_WORKSPACE_PATH);
    for (const file of files) {
      await fs.unlink(path.join(TEST_WORKSPACE_PATH, file));
    }
  } catch (err) {
    // Ignore if empty
  }

  const htmlContent = `<!DOCTYPE html>
<html>
<head><title>Counter</title></head>
<body>
  <h1>Counter App</h1>
  <div id="counter">0</div>
  <button id="increment-btn">Increment</button>
  <script src="app.js"></script>
</body>
</html>`;

  const jsContent = `// Counter App
const counter = document.getElementById('counter');
const button = document.getElementById('increment-btn');

let count = 0;
button.addEventListener('click', () => {
  count++;
  counter.textContent = count;
});`;

  await fs.writeFile(`${TEST_WORKSPACE_PATH}/index.html`, htmlContent);
  await fs.writeFile(`${TEST_WORKSPACE_PATH}/app.js`, jsContent);

  console.log('✅ Created workspace with correct app (matching IDs)');

  // Update status to verifying
  await prisma.appRequest.update({
    where: { id: appRequest.id },
    data: { status: 'verifying' },
  });

  // Run verification
  const verificationService = new VerificationService(logger);
  const result = await verificationService.startVerification(appRequest.id, execution.id);

  console.log(`\n✅ Verification Status: ${result.status}`);
  console.log(`✅ Attempt Count: ${result.attempt}`);
  console.log(`✅ Errors: ${result.errors?.length || 0}`);

  // Check final states
  const finalExecution = await prisma.execution.findUnique({ where: { id: execution.id } });
  const finalAppRequest = await prisma.appRequest.findUnique({ where: { id: appRequest.id } });

  console.log(`\n📊 Final States:`);
  console.log(`   Execution: ${finalExecution?.status}`);
  console.log(`   AppRequest: ${finalAppRequest?.status}`);

  const passed = result.status === 'passed' &&
                 result.attempt === 1 &&
                 finalExecution?.status === 'completed' &&
                 finalAppRequest?.status === 'completed';

  if (passed) {
    console.log('\n✅ SCENARIO 1 PASSED: App verified without repair');
  } else {
    console.log('\n❌ SCENARIO 1 FAILED');
  }

  return passed;
}

async function scenario2SelfHealingSucceeds() {
  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('🔧 SCENARIO 2: Self-healing succeeds after repair');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  const execution = await prisma.execution.create({
    data: { id: randomUUID(), projectId: TEST_PROJECT_ID, status: 'running' },
  });

  const appRequest = await prisma.appRequest.create({
    data: {
      id: randomUUID(),
      projectId: TEST_PROJECT_ID,
      prompt: 'Build a todo app',
      status: 'building',
      executionId: execution.id,
    },
  });

  // Clean workspace before test
  await fs.mkdir(TEST_WORKSPACE_PATH, { recursive: true });
  try {
    const files = await fs.readdir(TEST_WORKSPACE_PATH);
    for (const file of files) {
      await fs.unlink(path.join(TEST_WORKSPACE_PATH, file));
    }
  } catch (err) {
    // Ignore if empty
  }

  const htmlContent = `<!DOCTYPE html>
<html>
<head><title>Todo App</title></head>
<body>
  <h1>Todo List</h1>
  <button id="add-btn">Add Todo</button>
  <div id="todo-list"></div>
  <script src="app.js"></script>
</body>
</html>`;

  // BUG: References "add-button" but HTML has "add-btn"
  const jsContent = `// Todo App
const addButton = document.getElementById('add-button'); // WRONG ID!
const todoList = document.getElementById('todo-list');

addButton.addEventListener('click', () => {
  const item = document.createElement('div');
  item.textContent = 'New Todo';
  todoList.appendChild(item);
});`;

  await fs.writeFile(`${TEST_WORKSPACE_PATH}/index.html`, htmlContent);
  await fs.writeFile(`${TEST_WORKSPACE_PATH}/app.js`, jsContent);

  console.log('⚠️  Created workspace with broken app (ID mismatch: add-button vs add-btn)');

  // Update status to verifying
  await prisma.appRequest.update({
    where: { id: appRequest.id },
    data: { status: 'verifying' },
  });

  // Run verification (should trigger repair and succeed)
  const verificationService = new VerificationService(logger);
  const result = await verificationService.startVerification(appRequest.id, execution.id);

  console.log(`\n📊 Verification Status: ${result.status}`);
  console.log(`📊 Attempt Count: ${result.attempt}`);
  console.log(`📊 Errors: ${result.errors?.length || 0}`);

  // Check for self-healing event
  const events = await prisma.executionEvent.findMany({
    where: { executionId: execution.id },
    orderBy: { createdAt: 'asc' },
  });

  const selfHealedEvent = events.find(e => e.type === 'verification_passed_after_repair');
  const repairEvents = events.filter(e => e.type.includes('repair'));

  console.log(`\n🔍 Events:`);
  repairEvents.forEach(e => console.log(`   - ${e.type}: ${e.message}`));

  // Check final states
  const finalExecution = await prisma.execution.findUnique({ where: { id: execution.id } });
  const finalAppRequest = await prisma.appRequest.findUnique({ where: { id: appRequest.id } });

  console.log(`\n📊 Final States:`);
  console.log(`   Execution: ${finalExecution?.status}`);
  console.log(`   AppRequest: ${finalAppRequest?.status}`);

  const passed = result.status === 'passed' &&
                 result.attempt > 1 &&
                 selfHealedEvent !== undefined &&
                 finalExecution?.status === 'completed' &&
                 finalAppRequest?.status === 'completed';

  if (passed) {
    console.log('\n✅ SCENARIO 2 PASSED: Self-healing succeeded after repair');
  } else {
    console.log('\n❌ SCENARIO 2 FAILED');
    if (!selfHealedEvent) {
      console.log('   Missing verification_passed_after_repair event');
    }
  }

  return passed;
}

async function scenario3FailsAfterMaxAttempts() {
  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('❌ SCENARIO 3: Fails after max repair attempts');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  const execution = await prisma.execution.create({
    data: { id: randomUUID(), projectId: TEST_PROJECT_ID, status: 'running' },
  });

  const appRequest = await prisma.appRequest.create({
    data: {
      id: randomUUID(),
      projectId: TEST_PROJECT_ID,
      prompt: 'Build a calculator',
      status: 'building',
      executionId: execution.id,
    },
  });

  // Clean workspace before test
  await fs.mkdir(TEST_WORKSPACE_PATH, { recursive: true });
  try {
    const files = await fs.readdir(TEST_WORKSPACE_PATH);
    for (const file of files) {
      await fs.unlink(path.join(TEST_WORKSPACE_PATH, file));
    }
  } catch (err) {
    // Ignore if empty
  }

  const htmlContent = `<!DOCTYPE html>
<html>
<head>
  <title>Calculator</title>
  <link rel="stylesheet" href="missing-styles.css">
</head>
<body>
  <h1>Calculator</h1>
  <div id="display">0</div>
  <button id="btn-1">1</button>
  <button id="btn-add">+</button>
  <script src="missing-library.js"></script>
  <script src="calculator.js"></script>
  <script src="another-missing-file.js"></script>
</body>
</html>`;

  // Calculator.js references non-existent files - can't be fixed without creating those files
  const jsContent = `// Calculator - depends on missing files
const display = document.getElementById('display');
const btn1 = document.getElementById('btn-1');
const btnAdd = document.getElementById('btn-add');

// All IDs are correct, but missing external dependencies
btn1.addEventListener('click', () => {
  display.textContent = '1';
});`;

  await fs.writeFile(`${TEST_WORKSPACE_PATH}/index.html`, htmlContent);
  await fs.writeFile(`${TEST_WORKSPACE_PATH}/calculator.js`, jsContent);

  console.log('💥 Created workspace with broken app (missing required files: missing-styles.css, missing-library.js, another-missing-file.js)');

  // Update status to verifying
  await prisma.appRequest.update({
    where: { id: appRequest.id },
    data: { status: 'verifying' },
  });

  // Run verification (should fail after max attempts)
  const verificationService = new VerificationService(logger);
  const result = await verificationService.startVerification(appRequest.id, execution.id);

  console.log(`\n📊 Verification Status: ${result.status}`);
  console.log(`📊 Attempt Count: ${result.attempt}`);
  console.log(`📊 Errors: ${result.errors?.length || 0}`);
  if (result.errors && result.errors.length > 0) {
    console.log('\n🔍 Errors:');
    result.errors.slice(0, 3).forEach(err => console.log(`   - ${err}`));
    if (result.errors.length > 3) {
      console.log(`   ... and ${result.errors.length - 3} more`);
    }
  }

  // Check for max attempts event
  const events = await prisma.executionEvent.findMany({
    where: { executionId: execution.id },
    orderBy: { createdAt: 'asc' },
  });

  const maxAttemptsEvent = events.find(e => e.type === 'repair_max_attempts_reached');
  const repairEvents = events.filter(e => e.type.includes('repair'));

  console.log(`\n🔍 Repair Events (${repairEvents.length}):`);
  repairEvents.forEach(e => console.log(`   - ${e.type}`));

  // Check final states
  const finalExecution = await prisma.execution.findUnique({ where: { id: execution.id } });
  const finalAppRequest = await prisma.appRequest.findUnique({ where: { id: appRequest.id } });

  console.log(`\n📊 Final States:`);
  console.log(`   Execution: ${finalExecution?.status}`);
  console.log(`   AppRequest: ${finalAppRequest?.status}`);

  const passed = result.status === 'failed' &&
                 result.attempt === 5 && // MAX_REPAIR_ATTEMPTS
                 maxAttemptsEvent !== undefined &&
                 finalExecution?.status === 'failed' &&
                 finalAppRequest?.status === 'verification_failed';

  if (passed) {
    console.log('\n✅ SCENARIO 3 PASSED: Failed after max attempts as expected');
  } else {
    console.log('\n❌ SCENARIO 3 FAILED');
    if (!maxAttemptsEvent) {
      console.log('   Missing repair_max_attempts_reached event');
    }
  }

  return passed;
}

async function runTests() {
  console.log('\n╔═══════════════════════════════════════════╗');
  console.log('║  VERIFICATION SCENARIOS TEST SUITE        ║');
  console.log('╚═══════════════════════════════════════════╝');

  try {
    await setupProject();
    console.log('✅ Test project setup complete\n');

    const results = {
      scenario1: await scenario1PassesWithoutRepair(),
      scenario2: await scenario2SelfHealingSucceeds(),
      scenario3: await scenario3FailsAfterMaxAttempts(),
    };

    console.log('\n╔═══════════════════════════════════════════╗');
    console.log('║  TEST SUMMARY                             ║');
    console.log('╚═══════════════════════════════════════════╝\n');
    console.log(`Scenario 1 (Pass without repair): ${results.scenario1 ? '✅ PASSED' : '❌ FAILED'}`);
    console.log(`Scenario 2 (Self-healing succeeds): ${results.scenario2 ? '✅ PASSED' : '❌ FAILED'}`);
    console.log(`Scenario 3 (Fails after max attempts): ${results.scenario3 ? '✅ PASSED' : '❌ FAILED'}`);

    const allPassed = results.scenario1 && results.scenario2 && results.scenario3;

    if (allPassed) {
      console.log('\n🎉 ALL SCENARIOS PASSED!\n');
    } else {
      console.log('\n⚠️  SOME SCENARIOS FAILED\n');
    }

    return allPassed ? 0 : 1;
  } catch (error) {
    console.error('\n❌ Test suite error:', error);
    return 1;
  } finally {
    await prisma.$disconnect();
  }
}

runTests()
  .then(exitCode => process.exit(exitCode))
  .catch(error => {
    console.error('Fatal error:', error);
    process.exit(1);
  });
