/**
 * Demo: Show sample BuildPromptContract output
 */

import { PrismaClient } from '@prisma/client';
import { BuildPromptEngineerHardened } from './src/agents/build-prompt-engineer-hardened.js';
import { ForgeConductor } from './src/conductor/forge-conductor.js';
import pino from 'pino';
import { randomUUID } from 'crypto';

const prisma = new PrismaClient();
const logger = pino({ level: 'silent' });
const conductor = new ForgeConductor(prisma, logger);

async function demo() {
  // Create minimal test context
  const appRequestId = randomUUID();
  const projectId = randomUUID();
  const executionId = randomUUID();

  await prisma.project.create({ data: { id: projectId, name: 'Demo', description: 'Demo' } });
  await prisma.execution.create({ data: { id: executionId, projectId, status: 'running' } });
  await prisma.appRequest.create({
    data: { id: appRequestId, projectId, prompt: 'E-commerce app', status: 'active', executionId },
  });

  // Create hash-locked artifacts
  await prisma.projectRuleSet.create({
    data: {
      id: randomUUID(),
      appRequestId,
      content: 'Tech: Express + TypeScript + React\nDatabase: SQLite + Prisma',
      status: 'approved',
      rulesHash: 'demo123',
      approvedAt: new Date(),
    },
  });

  await prisma.screenIndex.create({
    data: {
      id: randomUUID(),
      appRequestId,
      screens: JSON.stringify([
        { name: 'Login', description: 'User authentication' },
        { name: 'Dashboard', description: 'Main dashboard' },
      ]),
      status: 'approved',
      screenIndexHash: 'screen123',
      screenIndexVersion: 1,
      approvedAt: new Date(),
      basePromptHash: 'base123',
      planningDocsHash: 'plan123',
    },
  });

  await prisma.userJourney.create({
    data: {
      id: randomUUID(),
      appRequestId,
      roleName: 'User',
      content: 'Login → Dashboard',
      order: 1,
      status: 'approved',
      journeyHash: 'journey123',
      approvedAt: new Date(),
    },
  });

  await prisma.screenMockup.create({
    data: {
      id: randomUUID(),
      appRequestId,
      screenName: 'Login',
      layoutType: 'desktop',
      imagePath: '/mockups/login.png',
      promptMetadata: JSON.stringify({ contract: 'test' }),
      mockupHash: 'mockup123',
      imageHash: 'image123',
      status: 'approved',
      approvedAt: new Date(),
    },
  });

  await prisma.conductorState.create({
    data: {
      id: randomUUID(),
      appRequestId,
      currentStatus: 'rules_locked',
      locked: false,
      awaitingHuman: false,
    },
  });

  // Generate first prompt
  const engineer = new BuildPromptEngineerHardened(prisma, conductor, logger);
  const promptId = await engineer.start(appRequestId);

  const prompt = await prisma.buildPrompt.findUnique({ where: { id: promptId } });
  const contract = JSON.parse(prompt!.contractJson!);

  console.log('\n📋 BUILD PROMPT CONTRACT OUTPUT:\n');
  console.log(JSON.stringify(contract, null, 2));

  console.log('\n\n📊 CONTRACT METADATA:');
  console.log(`Contract Hash: ${prompt!.contractHash}`);
  console.log(`Sequence: ${prompt!.sequenceIndex}`);
  console.log(`Title: ${prompt!.title}`);
  console.log(`Status: ${prompt!.status}`);

  // Cleanup
  await prisma.buildPrompt.deleteMany({ where: { appRequestId } });
  await prisma.conductorState.deleteMany({ where: { appRequestId } });
  await prisma.screenMockup.deleteMany({ where: { appRequestId } });
  await prisma.userJourney.deleteMany({ where: { appRequestId } });
  await prisma.screenIndex.deleteMany({ where: { appRequestId } });
  await prisma.projectRuleSet.deleteMany({ where: { appRequestId } });
  await prisma.appRequest.deleteMany({ where: { id: appRequestId } });
  await prisma.execution.deleteMany({ where: { id: executionId } });
  await prisma.project.deleteMany({ where: { id: projectId } });

  await prisma.$disconnect();
}

demo().catch(console.error);
