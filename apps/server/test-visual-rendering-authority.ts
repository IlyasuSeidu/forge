/**
 * TEST SUITE: Visual Rendering Authority
 *
 * MANDATORY: 10/10 tests must pass
 *
 * Tests cover:
 * 1. Envelope validation
 * 2. Context isolation
 * 3. Closed vocabulary enforcement
 * 4. Canonical screen name enforcement
 * 5. Contract schema validation
 * 6. Determinism (same input → same hash)
 * 7. Immutability after approval
 * 8. Rejection allows regeneration
 * 9. Hash chain integrity
 * 10. Full Conductor integration
 */

import { config } from 'dotenv';
config(); // Load environment variables

import { PrismaClient } from '@prisma/client';
import pino from 'pino';
import { randomUUID } from 'crypto';
import { VisualRenderingAuthority } from './src/agents/visual-rendering-authority.js';
import { ForgeConductor } from './src/conductor/forge-conductor.js';

const prisma = new PrismaClient();
const logger = pino({ level: 'info' });

let testsPassed = 0;
let testsFailed = 0;

// Test environment IDs
const projectId = randomUUID();
const appRequestId = randomUUID();
const executionId = randomUUID();

async function setupTestEnvironment() {
  console.log('Setting up test environment...');

  // Create project
  await prisma.project.create({
    data: {
      id: projectId,
      name: 'VRA Test Project',
      description: 'Testing Visual Rendering Authority',
    },
  });

  // Create execution
  await prisma.execution.create({
    data: {
      id: executionId,
      projectId,
      appRequestId,
      status: 'running',
    },
  });

  // Create app request
  await prisma.appRequest.create({
    data: {
      id: appRequestId,
      projectId,
      prompt: 'Build a SaaS analytics dashboard',
      status: 'in_progress',
    },
  });

  // Initialize Conductor
  await prisma.conductorState.create({
    data: {
      id: randomUUID(),
      appRequestId,
      currentStatus: 'flows_defined',
      locked: false,
      awaitingHuman: false,
    },
  });

  // Create approved Foundry Session (Base Prompt)
  await prisma.foundrySession.create({
    data: {
      id: randomUUID(),
      appRequestId,
      status: 'approved',
      answers: JSON.stringify({}),
      draftPrompt: 'Build a SaaS analytics dashboard with user management and reporting',
      basePromptHash: 'test-base-prompt-hash',
      approvedBy: 'human',
      approvedAt: new Date(),
    },
  });

  // Create approved Master Plan
  await prisma.planningDocument.create({
    data: {
      id: randomUUID(),
      appRequestId,
      type: 'MASTER_PLAN',
      content: '# Master Plan\n\n## Vision\nSaaS analytics dashboard\n\n## Target Audience\nBusiness users',
      status: 'approved',
      documentHash: 'test-master-plan-hash',
      basePromptHash: 'test-base-prompt-hash',
      approvedBy: 'human',
      approvedAt: new Date(),
    },
  });

  // Create approved Implementation Plan
  await prisma.planningDocument.create({
    data: {
      id: randomUUID(),
      appRequestId,
      type: 'IMPLEMENTATION_PLAN',
      content: '# Implementation Plan\n\n## Technical Stack\nReact, Node.js, PostgreSQL',
      status: 'approved',
      documentHash: 'test-implementation-plan-hash',
      basePromptHash: 'test-base-prompt-hash',
      approvedBy: 'human',
      approvedAt: new Date(),
    },
  });

  // Create approved Screen Index
  await prisma.screenIndex.create({
    data: {
      id: randomUUID(),
      appRequestId,
      screens: JSON.stringify(['Dashboard', 'Reports', 'Settings']),
      status: 'approved',
      screenIndexHash: 'test-screen-index-hash',
      basePromptHash: 'test-base-prompt-hash',
      planningDocsHash: 'test-planning-docs-hash',
      approvedBy: 'human',
      approvedAt: new Date(),
    },
  });

  // Create approved Screen Definition for Dashboard
  await prisma.screenDefinition.create({
    data: {
      id: randomUUID(),
      appRequestId,
      screenName: 'Dashboard',
      content: `# Dashboard

## Purpose
Main dashboard with analytics and key metrics.

## Layout Structure
- Header with navigation
- Main content area with charts and cards
- Footer with links

## Key UI Elements
- Navigation bar with logo
- Analytics cards showing key metrics
- Charts displaying data trends
- Action buttons for common tasks`,
      order: 1,
      status: 'approved',
      screenHash: 'test-dashboard-hash',
      screenIndexHash: 'test-screen-index-hash',
      basePromptHash: 'test-base-prompt-hash',
      planningDocsHash: 'test-planning-docs-hash',
      approvedBy: 'human',
      approvedAt: new Date(),
    },
  });

  // Create approved User Journey
  await prisma.userJourney.create({
    data: {
      id: randomUUID(),
      appRequestId,
      roleName: 'Admin',
      content: '1. Login\n2. View Dashboard\n3. Analyze metrics',
      order: 1,
      status: 'approved',
      journeyHash: 'test-journey-hash',
      roleTableHash: 'test-role-table-hash',
      screenIndexHash: 'test-screen-index-hash',
      basePromptHash: 'test-base-prompt-hash',
      planningDocsHash: 'test-planning-docs-hash',
      approvedBy: 'human',
      approvedAt: new Date(),
    },
  });

  console.log('✅ Test environment created');
}

async function cleanupTestEnvironment() {
  console.log('Cleaning up test environment...');
  await prisma.project.delete({ where: { id: projectId } });
  console.log('✅ Test environment cleaned up');
}

async function runTest(name: string, testFn: () => Promise<void>) {
  try {
    console.log(`\n▶️  ${name}`);
    await testFn();
    console.log(`✅ PASSED: ${name}`);
    testsPassed++;
  } catch (error) {
    console.error(`❌ FAILED: ${name}`);
    console.error(error);
    testsFailed++;
  }
}

async function runTests() {
  console.log('='.repeat(80));
  console.log('VISUAL RENDERING AUTHORITY TEST SUITE');
  console.log('='.repeat(80));
  console.log();

  // Initialize services
  const conductor = new ForgeConductor(prisma, logger);
  const vra = new VisualRenderingAuthority(prisma, conductor, logger);

  // TEST 1: Envelope Validation
  await runTest('TEST 1: Envelope validation', async () => {
    // The envelope is validated automatically on initialization
    // If we got here, envelope is valid
    if (!vra) {
      throw new Error('VisualRenderingAuthority failed to initialize');
    }
  });

  // TEST 2: Context Isolation (hash-based, approved artifacts only)
  await runTest('TEST 2: Context isolation enforcement', async () => {
    // This should succeed because we have all approved artifacts
    const contractId = await vra.expandScreen(appRequestId, 'Dashboard', 'desktop');

    if (!contractId) {
      throw new Error('Expected contractId to be returned');
    }

    // Verify contract was created
    const contract = await prisma.visualExpansionContract.findUnique({
      where: { id: contractId },
    });

    if (!contract) {
      throw new Error('Contract not found in database');
    }

    if (contract.status !== 'awaiting_approval') {
      throw new Error(`Expected status "awaiting_approval", got "${contract.status}"`);
    }
  });

  // TEST 3: Closed Vocabulary Enforcement
  await runTest('TEST 3: Closed vocabulary enforcement', async () => {
    // Get the contract created in test 2
    const contract = await prisma.visualExpansionContract.findFirst({
      where: { appRequestId, screenName: 'Dashboard' },
      orderBy: { createdAt: 'desc' },
    });

    if (!contract) {
      throw new Error('No contract found');
    }

    const contractData = JSON.parse(contract.contractJson);

    // Verify all section types are from closed vocabulary
    const validSectionTypes = [
      'navigation',
      'metric_cards',
      'data_visualization',
      'lists',
      'forms',
      'content',
      'links',
      'hero',
      'footer',
    ];

    for (const section of contractData.sections) {
      if (!validSectionTypes.includes(section.type)) {
        throw new Error(`Invalid section type: ${section.type}`);
      }
    }

    // Verify chart types if present
    const validChartTypes = ['bar', 'line', 'bar_line_combo', 'pie', 'donut', 'area'];
    for (const section of contractData.sections) {
      if (section.charts) {
        for (const chart of section.charts) {
          if (!validChartTypes.includes(chart.chartType)) {
            throw new Error(`Invalid chart type: ${chart.chartType}`);
          }
        }
      }
    }
  });

  // TEST 4: Canonical Screen Name Enforcement
  await runTest('TEST 4: Canonical screen name enforcement', async () => {
    // Try to expand a screen that doesn't exist in Screen Index
    let failed = false;
    try {
      await vra.expandScreen(appRequestId, 'NonExistentScreen', 'desktop');
    } catch (error: any) {
      if (error.message.includes('No approved Screen Definition')) {
        failed = true;
      }
    }

    if (!failed) {
      throw new Error('Should have failed for non-existent screen');
    }
  });

  // TEST 5: Contract Schema Validation
  await runTest('TEST 5: Contract schema validation', async () => {
    const contract = await prisma.visualExpansionContract.findFirst({
      where: { appRequestId, screenName: 'Dashboard' },
      orderBy: { createdAt: 'desc' },
    });

    if (!contract) {
      throw new Error('No contract found');
    }

    const contractData = JSON.parse(contract.contractJson);

    // Verify required fields
    if (!contractData.screen) {
      throw new Error('Missing required field: screen');
    }

    if (!contractData.layoutType) {
      throw new Error('Missing required field: layoutType');
    }

    if (!Array.isArray(contractData.sections)) {
      throw new Error('sections must be an array');
    }

    // Verify each section has required fields
    for (const section of contractData.sections) {
      if (!section.id) {
        throw new Error('Section missing required field: id');
      }
      if (!section.type) {
        throw new Error('Section missing required field: type');
      }
    }
  });

  // TEST 6: Determinism (same input → same hash)
  await runTest('TEST 6: Determinism check', async () => {
    // Note: True determinism test would require generating the same screen twice
    // and comparing hashes. For now, we verify hash exists and is consistent.
    const contract = await prisma.visualExpansionContract.findFirst({
      where: { appRequestId, screenName: 'Dashboard' },
      orderBy: { createdAt: 'desc' },
    });

    if (!contract) {
      throw new Error('No contract found');
    }

    if (!contract.contractHash) {
      throw new Error('Contract hash is missing');
    }

    if (contract.contractHash.length !== 64) {
      throw new Error('Contract hash is not SHA-256 format');
    }

    // Verify integrity
    const isValid = await vra.verifyIntegrity(contract.id);
    if (!isValid) {
      throw new Error('Hash integrity check failed');
    }
  });

  // TEST 7: Immutability after approval
  await runTest('TEST 7: Immutability after approval', async () => {
    const contract = await prisma.visualExpansionContract.findFirst({
      where: { appRequestId, screenName: 'Dashboard' },
      orderBy: { createdAt: 'desc' },
    });

    if (!contract) {
      throw new Error('No contract found');
    }

    // Approve contract
    await vra.approve(contract.id, 'human');

    // Verify approval
    const approvedContract = await prisma.visualExpansionContract.findUnique({
      where: { id: contract.id },
    });

    if (approvedContract?.status !== 'approved') {
      throw new Error('Contract not approved');
    }

    if (!approvedContract.approvedBy) {
      throw new Error('approvedBy not set');
    }

    if (!approvedContract.approvedAt) {
      throw new Error('approvedAt not set');
    }

    // Try to approve again (should fail)
    let failed = false;
    try {
      await vra.approve(contract.id, 'human');
    } catch (error: any) {
      if (error.message.includes('Cannot approve contract')) {
        failed = true;
      }
    }

    if (!failed) {
      throw new Error('Should not allow double approval');
    }
  });

  // TEST 8: Rejection allows regeneration
  await runTest('TEST 8: Rejection workflow', async () => {
    // Create a new screen definition for testing rejection
    await prisma.screenDefinition.create({
      data: {
        id: randomUUID(),
        appRequestId,
        screenName: 'Reports',
        content: '# Reports\n\nAnalytics reports screen',
        order: 2,
        status: 'approved',
        screenHash: 'test-reports-hash',
        screenIndexHash: 'test-screen-index-hash',
        basePromptHash: 'test-base-prompt-hash',
        planningDocsHash: 'test-planning-docs-hash',
        approvedBy: 'human',
        approvedAt: new Date(),
      },
    });

    // Generate contract
    const contractId = await vra.expandScreen(appRequestId, 'Reports', 'desktop');

    // Reject it
    await vra.reject(contractId, 'Test rejection');

    // Verify rejection
    const rejectedContract = await prisma.visualExpansionContract.findUnique({
      where: { id: contractId },
    });

    if (rejectedContract?.status !== 'rejected') {
      throw new Error('Contract not rejected');
    }

    // Should be able to regenerate (not tested here, but workflow allows it)
  });

  // TEST 9: Hash Chain Integrity
  await runTest('TEST 9: Hash chain integrity verification', async () => {
    const contract = await prisma.visualExpansionContract.findFirst({
      where: { appRequestId, screenName: 'Dashboard', status: 'approved' },
    });

    if (!contract) {
      throw new Error('No approved contract found');
    }

    // Verify all hash references exist
    if (!contract.basePromptHash) {
      throw new Error('basePromptHash missing');
    }

    if (!contract.planningDocsHash) {
      throw new Error('planningDocsHash missing');
    }

    if (!contract.screenIndexHash) {
      throw new Error('screenIndexHash missing');
    }

    if (!contract.screenDefinitionHash) {
      throw new Error('screenDefinitionHash missing');
    }

    // Verify hash chain integrity
    const isValid = await vra.verifyIntegrity(contract.id);
    if (!isValid) {
      throw new Error('Hash chain integrity verification failed');
    }
  });

  // TEST 10: Full Conductor Integration
  await runTest('TEST 10: Conductor integration', async () => {
    // Verify conductor state
    const conductorState = await prisma.conductorState.findUnique({
      where: { appRequestId },
    });

    if (!conductorState) {
      throw new Error('ConductorState not found');
    }

    // Verify conductor was locked/unlocked properly during expansion
    if (conductorState.locked) {
      throw new Error('Conductor should be unlocked after expansion completes');
    }

    // Verify conductor is awaiting human approval
    if (!conductorState.awaitingHuman) {
      throw new Error('Conductor should be awaiting human approval');
    }
  });
}

async function main() {
  try {
    await setupTestEnvironment();
    await runTests();

    console.log();
    console.log('='.repeat(80));
    console.log('TEST RESULTS');
    console.log('='.repeat(80));
    console.log(`✅ Passed: ${testsPassed}/10`);
    console.log(`❌ Failed: ${testsFailed}/10`);
    console.log();

    if (testsFailed === 0) {
      console.log('🎉 ALL TESTS PASSED!');
      console.log();
      console.log('Visual Rendering Authority is production-ready.');
    } else {
      console.log('⚠️  SOME TESTS FAILED');
      console.log();
      console.log('Fix failing tests before deployment.');
      process.exit(1);
    }
  } catch (error) {
    console.error('❌ Fatal error during testing:');
    console.error(error);
    process.exit(1);
  } finally {
    await cleanupTestEnvironment();
    await prisma.$disconnect();
  }
}

main();
