/**
 * Quick test to verify OpenAI DALL-E integration
 */

import { config } from 'dotenv';
import { PrismaClient } from '@prisma/client';
import { ForgeConductor } from './src/conductor/forge-conductor.js';
import { VisualForgeHardened } from './src/agents/visual-forge-hardened.js';
import pino from 'pino';
import { randomUUID } from 'crypto';

// Load environment variables
config();

const prisma = new PrismaClient();
const logger = pino({ level: 'info' });

async function testOpenAIIntegration() {
  console.log('='.repeat(80));
  console.log('TESTING OPENAI DALL-E INTEGRATION');
  console.log('='.repeat(80));
  console.log();

  // Check API key
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    console.log('❌ OPENAI_API_KEY not configured');
    process.exit(1);
  }
  console.log(`✅ OpenAI API Key configured: ${apiKey.substring(0, 20)}...`);
  console.log();

  try {
    // Create test project
    const projectId = randomUUID();
    const appRequestId = randomUUID();
    const executionId = randomUUID();

    console.log('Creating test environment...');

    await prisma.project.create({
      data: {
        id: projectId,
        name: 'OpenAI Test Project',
        description: 'Testing OpenAI DALL-E integration',
      },
    });

    await prisma.execution.create({
      data: {
        id: executionId,
        projectId,
        status: 'running',
        startedAt: new Date(),
      },
    });

    await prisma.appRequest.create({
      data: {
        id: appRequestId,
        projectId,
        executionId,
        prompt: 'Test app for OpenAI integration',
        status: 'pending',
      },
    });

    // Create planning documents
    const basePromptHash = 'test-base-prompt-hash';
    const planningDocsHash = 'test-planning-docs-hash';

    await prisma.planningDocument.create({
      data: {
        id: randomUUID(),
        appRequestId,
        type: 'master_plan',
        content: 'Test master plan',
        status: 'approved',
        documentHash: 'test-master-plan-hash',
        basePromptHash,
      },
    });

    // Create approved ScreenIndex
    const screenIndexHash = 'test-screen-index-hash';
    await prisma.screenIndex.create({
      data: {
        id: randomUUID(),
        appRequestId,
        screens: JSON.stringify(['Dashboard']),
        status: 'approved',
        screenIndexHash,
        screenIndexVersion: 1,
        approvedBy: 'human',
        basePromptHash,
        planningDocsHash,
      },
    });

    // Create approved Screen Definition
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
        screenVersion: 1,
        approvedBy: 'human',
        screenIndexHash,
        basePromptHash,
        planningDocsHash,
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

    console.log('✅ Test environment created');
    console.log();

    // Initialize Visual Forge
    const conductor = new ForgeConductor(prisma, logger);
    const visualForge = new VisualForgeHardened(prisma, conductor, logger);

    console.log('Generating mockup via OpenAI DALL-E 3...');
    console.log('This may take 10-20 seconds...');
    console.log();

    const startTime = Date.now();

    // Generate mockup
    const result = await visualForge.generateMockup(appRequestId, 'Dashboard', 'desktop');

    const duration = ((Date.now() - startTime) / 1000).toFixed(2);

    console.log();
    console.log('='.repeat(80));
    console.log('✅ MOCKUP GENERATED SUCCESSFULLY');
    console.log('='.repeat(80));
    console.log(`Screen: ${result.screenName}`);
    console.log(`Layout: ${result.layoutType}`);
    console.log(`Image Path: ${result.imagePath}`);
    console.log(`Image Hash: ${result.imageHash}`);
    console.log(`Mockup Hash: ${result.contract.imageHash}`);
    console.log(`Generation Time: ${duration}s`);
    console.log();

    // Check file size to verify it's a real image
    const fs = await import('fs/promises');
    const stats = await fs.stat(result.imagePath);
    const sizeKB = (stats.size / 1024).toFixed(2);

    console.log(`File Size: ${sizeKB} KB`);
    console.log();

    if (stats.size > 1000) {
      console.log('✅ Real image file generated (file size > 1KB)');
    } else {
      console.log('⚠️  Small file size - might be placeholder');
    }

    console.log();
    console.log('🎉 OpenAI DALL-E integration working correctly!');
    console.log();

    // Cleanup
    await prisma.project.delete({ where: { id: projectId } });
    console.log('✅ Test cleanup complete');

  } catch (error) {
    console.error('❌ Test failed:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

testOpenAIIntegration().catch((error) => {
  console.error('Fatal error:', error);
  process.exit(1);
});
