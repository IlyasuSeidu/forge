import 'dotenv/config';
import { VerificationService } from './src/services/verification-service.js';
import { WorkspaceService } from './src/services/workspace-service.js';
import { StaticVerifier } from './src/services/static-verifier.js';
import { prisma } from './src/lib/prisma.js';
import pino from 'pino';
import { promises as fs } from 'fs';
import crypto from 'crypto';

const logger = pino({ level: 'info' });

async function testSelfHealingForUI() {
  console.log('\n========================================');
  console.log('SELF-HEALING UI TEST');
  console.log('========================================\n');

  const projectId = '5d9571f5-dc21-4173-954b-754bb45a22d9';
  const testWorkspacePath = `/tmp/forge-workspaces/${projectId}`;

  try {
    // Step 1: Check/create project
    let project = await prisma.project.findUnique({
      where: { id: projectId }
    });

    if (!project) {
      project = await prisma.project.create({
        data: {
          id: projectId,
          name: 'Self-Healing UI Test Project',
          description: 'Testing self-healing with UI verification',
        },
      });
      console.log('✓ Project created\n');
    } else {
      console.log('✓ Project exists\n');
    }

    // Step 2: Create execution and app request
    const execution = await prisma.execution.create({
      data: {
        id: crypto.randomUUID(),
        projectId: projectId,
        status: 'running', // Start as running
      },
    });

    const appRequest = await prisma.appRequest.create({
      data: {
        id: crypto.randomUUID(),
        projectId: projectId,
        prompt: 'Test app with button - self-healing UI test',
        status: 'building', // Start as building
        executionId: execution.id,
      },
    });

    console.log('Execution ID:', execution.id);
    console.log('AppRequest ID:', appRequest.id);
    console.log('URL:', `http://localhost:3001/projects/${projectId}/executions/${execution.id}`);
    console.log();

    // Step 3: Setup workspace with broken app
    const workspaceService = new WorkspaceService(logger, projectId);
    await workspaceService.initialize();

    const brokenHTMLPath = '/tmp/test-self-healing2/broken-button/index.html';
    const brokenJSPath = '/tmp/test-self-healing2/broken-button/app.js';
    const htmlContent = await fs.readFile(brokenHTMLPath, 'utf-8');
    const jsContent = await fs.readFile(brokenJSPath, 'utf-8');

    await fs.writeFile(`${testWorkspacePath}/index.html`, htmlContent);
    await fs.writeFile(`${testWorkspacePath}/app.js`, jsContent);

    console.log('✓ Workspace created with broken app\n');

    // Step 4: Verify it's broken
    const staticVerifier = new StaticVerifier(logger);
    const initialVerification = await staticVerifier.verify(testWorkspacePath);

    console.log('Initial verification:', initialVerification.passed ? 'PASSED' : 'FAILED');
    if (!initialVerification.passed) {
      console.log('Errors:',initialVerification.errors.length);
      initialVerification.errors.forEach((err, i) => console.log(`  ${i + 1}. ${err}`));
    }
    console.log();

    // Step 5: Update AppRequest to verifying status before running verification
    await prisma.appRequest.update({
      where: { id: appRequest.id },
      data: { status: 'verifying' }
    });

    // Step 6: Run verification with self-healing
    console.log('Starting self-healing verification...\n');

    const verificationService = new VerificationService(logger);
    const result = await verificationService.startVerification(
      appRequest.id,
      execution.id
    );

    console.log('\n========================================');
    console.log('FINAL RESULT');
    console.log('========================================');
    console.log('Verification Status:', result.status);
    console.log('Attempts:', result.attempt);

    // Check the database records
    const finalExecution = await prisma.execution.findUnique({
      where: { id: execution.id }
    });

    const finalAppRequest = await prisma.appRequest.findUnique({
      where: { id: appRequest.id }
    });

    console.log('\nDatabase Status:');
    console.log('  Execution.status:', finalExecution?.status);
    console.log('  AppRequest.status:', finalAppRequest?.status);

    if (result.status === 'passed') {
      console.log('\n✅ Self-healing SUCCESSFUL!');
      console.log('\nTo view in UI, visit:');
      console.log(`  http://localhost:3001/projects/${projectId}/build-app`);
      console.log(`  or`);
      console.log(`  http://localhost:3001/projects/${projectId}/executions/${execution.id}`);
      console.log('\nThe UI should now show:');
      console.log('  - Progress: All steps complete with Verify in GREEN');
      console.log('  - Status: "Your app is ready! ✓"');
      console.log('  - Badge: "Self-Healed" (purple)');
      console.log('  - Preview and Download buttons available');
    } else {
      console.log('\n❌ Self-healing FAILED');
      console.log('Errors:', result.errors);
    }

    console.log('\n========================================\n');
    console.log('NOTE: Data NOT cleaned up - you can view it in the UI');
    console.log('To clean up later, delete the project or execution manually');

  } catch (error) {
    console.error('Test failed with error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

testSelfHealingForUI().catch(console.error);
