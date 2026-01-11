import 'dotenv/config';
import { VerificationService } from './src/services/verification-service.js';
import { WorkspaceService } from './src/services/workspace-service.js';
import { StaticVerifier } from './src/services/static-verifier.js';
import { prisma } from './src/lib/prisma.js';
import pino from 'pino';
import { promises as fs } from 'fs';
import crypto from 'crypto';

const logger = pino({ level: 'info' });

async function testSelfHealing() {
  console.log('\n========================================');
  console.log('SELF-HEALING TEST');
  console.log('========================================\n');

  // Setup: Create a test project and copy the broken app
  const projectId = crypto.randomUUID();
  const testWorkspacePath = `/tmp/forge-workspaces/${projectId}`;

  try {
    // Create database records FIRST (before writing files)
    console.log('Step 1: Create test database records');
    console.log('----------------------------------------');

    const project = await prisma.project.create({
      data: {
        id: projectId,
        name: 'Self-Healing Test',
        description: 'Testing self-healing repair loop',
      },
    });

    const execution = await prisma.execution.create({
      data: {
        id: crypto.randomUUID(),
        projectId: project.id,
        status: 'completed',
      },
    });

    const appRequest = await prisma.appRequest.create({
      data: {
        id: crypto.randomUUID(),
        projectId: project.id,
        prompt: 'Test app with button',
        status: 'verifying',
        executionId: execution.id,
      },
    });

    console.log('Created project:', project.id);
    console.log('Created execution:', execution.id);
    console.log('Created app request:', appRequest.id);
    console.log();

    // NOW create workspace and copy files
    const workspaceService = new WorkspaceService(logger, projectId);
    await workspaceService.initialize();

    // Copy broken app to workspace (manually to avoid artifact creation)
    const brokenHTMLPath = '/tmp/test-self-healing2/broken-button/index.html';
    const brokenJSPath = '/tmp/test-self-healing2/broken-button/app.js';
    const htmlContent = await fs.readFile(brokenHTMLPath, 'utf-8');
    const jsContent = await fs.readFile(brokenJSPath, 'utf-8');

    // Write directly to filesystem (bypass artifact tracking for test)
    await fs.writeFile(`${testWorkspacePath}/index.html`, htmlContent);
    await fs.writeFile(`${testWorkspacePath}/app.js`, jsContent);

    console.log('Test workspace created:', testWorkspacePath);
    console.log('Broken app copied to workspace\n');

    // Verify the app is broken
    console.log('Step 2: Verify app is broken');
    console.log('----------------------------------------');

    const staticVerifier = new StaticVerifier(logger);
    const initialVerification = await staticVerifier.verify(testWorkspacePath);

    console.log('Initial verification result:', initialVerification.passed ? 'PASSED' : 'FAILED');
    console.log('Errors:', initialVerification.errors.length);

    if (initialVerification.errors.length > 0) {
      console.log('\nErrors found:');
      initialVerification.errors.forEach((err, i) => console.log(`  ${i + 1}. ${err}`));
    }

    if (initialVerification.passed) {
      console.log('\n❌ Test setup failed - app should be broken!');
      return;
    }

    console.log('\n✓ App is broken as expected\n');

    // Run verification with self-healing
    console.log('Step 3: Run verification with self-healing');
    console.log('----------------------------------------');
    console.log('This should:');
    console.log('  1. Detect the error (missing-button)');
    console.log('  2. Attempt repair');
    console.log('  3. Re-verify');
    console.log('  4. Pass or fail after max attempts\n');

    const verificationService = new VerificationService(logger);

    const result = await verificationService.startVerification(
      appRequest.id,
      execution.id
    );

    console.log('\n========================================');
    console.log('VERIFICATION RESULT');
    console.log('========================================');
    console.log('Status:', result.status);
    console.log('Attempts:', result.attempt);

    if (result.errors && result.errors.length > 0) {
      console.log('Errors:', result.errors.length);
      result.errors.slice(0, 5).forEach((err: string, i: number) => {
        console.log(`  ${i + 1}. ${err}`);
      });

      if (result.errors.length > 5) {
        console.log(`  ... and ${result.errors.length - 5} more`);
      }
    } else {
      console.log('No errors - app is working!');
    }

    // Check if repair was successful
    if (result.status === 'passed') {
      console.log('\n✅ Self-healing SUCCESSFUL!');
      console.log('The repair agent fixed the bugs automatically.');

      // Verify the fixed file
      console.log('\nVerifying the repaired file...');
      const repairedJSContent = await fs.readFile(`${testWorkspacePath}/app.js`, 'utf-8');
      if (repairedJSContent.includes('test-button') && !repairedJSContent.includes('missing-button')) {
        console.log('✓ Repair correctly changed missing-button to test-button in app.js');
      } else {
        console.log('⚠ Repair may not have been complete');
        console.log('app.js still contains:', repairedJSContent.substring(0, 500));
      }
    } else {
      console.log('\n❌ Self-healing FAILED');
      console.log('The repair agent could not fix the bugs within 3 attempts.');
    }

    console.log('\n========================================\n');

    // Cleanup
    await prisma.appRequest.delete({ where: { id: appRequest.id } });
    await prisma.execution.delete({ where: { id: execution.id } });
    await prisma.project.delete({ where: { id: project.id } });

    await workspaceService.cleanup();

  } catch (error) {
    console.error('Test failed with error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

testSelfHealing().catch(console.error);
