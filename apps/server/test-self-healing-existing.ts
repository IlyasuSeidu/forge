import 'dotenv/config';
import { VerificationService } from './src/services/verification-service.js';
import { WorkspaceService } from './src/services/workspace-service.js';
import { StaticVerifier } from './src/services/static-verifier.js';
import { prisma } from './src/lib/prisma.js';
import pino from 'pino';
import { promises as fs } from 'fs';
import crypto from 'crypto';

const logger = pino({ level: 'info' });

async function testSelfHealingWithExistingProject() {
  console.log('\n========================================');
  console.log('SELF-HEALING TEST - EXISTING PROJECT');
  console.log('========================================\n');

  const projectId = '5d9571f5-dc21-4173-954b-754bb45a22d9';
  const testWorkspacePath = `/tmp/forge-workspaces/${projectId}`;

  try {
    // Check if project exists
    console.log('Step 1: Check existing project');
    console.log('----------------------------------------');

    const project = await prisma.project.findUnique({
      where: { id: projectId }
    });

    if (!project) {
      console.log('❌ Project not found - creating it');
      await prisma.project.create({
        data: {
          id: projectId,
          name: 'Self-Healing Test Project',
          description: 'Testing self-healing with specific project ID',
        },
      });
      console.log('✓ Project created');
    } else {
      console.log('✓ Project found:', project.name);
    }

    // Create new execution and app request for this test
    const execution = await prisma.execution.create({
      data: {
        id: crypto.randomUUID(),
        projectId: projectId,
        status: 'completed',
      },
    });

    const appRequest = await prisma.appRequest.create({
      data: {
        id: crypto.randomUUID(),
        projectId: projectId,
        prompt: 'Test app with button - self-healing test',
        status: 'verifying',
        executionId: execution.id,
      },
    });

    console.log('Created execution:', execution.id);
    console.log('Created app request:', appRequest.id);
    console.log();

    // Create workspace and copy broken app
    console.log('Step 2: Setup workspace with broken app');
    console.log('----------------------------------------');

    const workspaceService = new WorkspaceService(logger, projectId);
    await workspaceService.initialize();

    // Copy broken app files
    const brokenHTMLPath = '/tmp/test-self-healing2/broken-button/index.html';
    const brokenJSPath = '/tmp/test-self-healing2/broken-button/app.js';
    const htmlContent = await fs.readFile(brokenHTMLPath, 'utf-8');
    const jsContent = await fs.readFile(brokenJSPath, 'utf-8');

    // Write files
    await fs.writeFile(`${testWorkspacePath}/index.html`, htmlContent);
    await fs.writeFile(`${testWorkspacePath}/app.js`, jsContent);

    console.log('✓ Workspace created:', testWorkspacePath);
    console.log('✓ Broken app copied to workspace\n');

    // Verify the app is broken
    console.log('Step 3: Verify app is broken');
    console.log('----------------------------------------');

    const staticVerifier = new StaticVerifier(logger);
    const initialVerification = await staticVerifier.verify(testWorkspacePath);

    console.log('Initial verification:', initialVerification.passed ? 'PASSED' : 'FAILED');
    console.log('Errors found:', initialVerification.errors.length);

    if (initialVerification.errors.length > 0) {
      console.log('\nErrors:');
      initialVerification.errors.forEach((err, i) => console.log(`  ${i + 1}. ${err}`));
    }

    if (initialVerification.passed) {
      console.log('\n❌ Test setup failed - app should be broken!');
      return;
    }

    console.log('\n✓ App is broken as expected\n');

    // Run verification with self-healing
    console.log('Step 4: Run verification with self-healing');
    console.log('----------------------------------------');
    console.log('Starting repair loop...\n');

    const verificationService = new VerificationService(logger);

    const result = await verificationService.startVerification(
      appRequest.id,
      execution.id
    );

    console.log('\n========================================');
    console.log('VERIFICATION RESULT');
    console.log('========================================');
    console.log('Project ID:', projectId);
    console.log('Status:', result.status);
    console.log('Attempts:', result.attempt);

    if (result.errors && result.errors.length > 0) {
      console.log('Errors:', result.errors.length);
      result.errors.slice(0, 5).forEach((err: string, i: number) => {
        console.log(`  ${i + 1}. ${err}`);
      });
    } else {
      console.log('No errors - app is working!');
    }

    // Check if repair was successful
    if (result.status === 'passed') {
      console.log('\n✅ Self-healing SUCCESSFUL!');
      console.log('The repair agent fixed the bugs automatically.');

      // Show the repaired files
      console.log('\nRepaired files in workspace:');
      const files = await fs.readdir(testWorkspacePath);
      files.forEach(file => console.log(`  - ${file}`));

      // Verify the fix
      console.log('\nVerifying the repair...');
      const repairedJSContent = await fs.readFile(`${testWorkspacePath}/app.js`, 'utf-8');
      if (repairedJSContent.includes('test-button') && !repairedJSContent.includes('missing-button')) {
        console.log('✓ Repair correctly changed missing-button to test-button');
      } else {
        console.log('⚠ Checking repair content...');
        console.log(repairedJSContent.substring(0, 300));
      }
    } else {
      console.log('\n❌ Self-healing FAILED');
      console.log('The repair agent could not fix the bugs within the attempt limit.');
    }

    console.log('\n========================================\n');

    // Cleanup
    console.log('Cleaning up test data...');
    await prisma.appRequest.delete({ where: { id: appRequest.id } });
    await prisma.execution.delete({ where: { id: execution.id } });

    // Note: NOT deleting the project since it was specified by user
    console.log('✓ Cleanup complete (project preserved)');

  } catch (error) {
    console.error('Test failed with error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

testSelfHealingWithExistingProject().catch(console.error);
