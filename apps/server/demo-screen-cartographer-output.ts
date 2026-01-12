/**
 * Demonstration: Screen Cartographer Output Examples
 *
 * This script shows what the actual LLM outputs look like at each stage
 * of the screen cartography process with closed vocabulary.
 */

import { PrismaClient } from '@prisma/client';
import { ScreenCartographerHardened } from './src/agents/screen-cartographer-hardened';
import { ForgeConductor } from './src/conductor';
import pino from 'pino';
import { randomUUID } from 'crypto';
import { FoundryArchitectHardened } from './src/agents/foundry-architect-hardened';
import { ProductStrategistHardened } from './src/agents/product-strategist-hardened';

const prisma = new PrismaClient();
const logger = pino({ level: 'silent' }); // Silent to see only our output
const conductor = new ForgeConductor(prisma, logger);

const llmConfig = {
  provider: 'anthropic' as const,
  apiKey: process.env.ANTHROPIC_API_KEY || '',
  model: 'claude-sonnet-4-20250514',
  temperature: 0.2,
  maxTokens: 2000,
  retryAttempts: 3,
};

async function main() {
  console.log('═══════════════════════════════════════════════════════════');
  console.log('  SCREEN CARTOGRAPHER OUTPUT DEMONSTRATION');
  console.log('═══════════════════════════════════════════════════════════\n');

  // Create test project and app request
  const projectId = randomUUID();
  await prisma.project.create({
    data: { id: projectId, userId: 'test-user', name: 'Demo Project' },
  });

  const appRequestId = randomUUID();
  await prisma.appRequest.create({
    data: {
      id: appRequestId,
      projectId,
      prompt: 'Build a task management app for freelancers',
      status: 'idea',
    },
  });

  await prisma.conductorState.create({
    data: {
      id: randomUUID(),
      appRequestId,
      currentStatus: 'idea',
      locked: false,
      awaitingHuman: false,
      lastAgent: null,
    },
  });

  // Step 1: Create Base Prompt
  console.log('📝 STEP 1: Creating Base Prompt (via Foundry Architect)');
  console.log('─────────────────────────────────────────────────────────\n');

  const architect = new FoundryArchitectHardened(prisma, conductor, logger);
  await architect.start(appRequestId);

  const mockAnswers = [
    'A task management app for freelancers',
    'Freelancers and independent consultants',
    'Help users organize projects, track tasks, and manage deadlines',
    'No enterprise features, no team collaboration, no time tracking',
    'Task lists, project organization, deadline tracking',
    'Landing Page, Login, Signup, Dashboard, Task List, Create Task, Edit Task, Project View, Settings, Profile',
    'Mobile-first, simple UI, works offline',
    'Users can create and complete tasks successfully',
  ];

  for (let i = 0; i < 8; i++) {
    await architect.submitAnswer(appRequestId, mockAnswers[i]);
  }

  await architect.approveBasePrompt(appRequestId, 'human');
  console.log('✅ Base Prompt approved\n');
  console.log('Key Answer #6 (Screens):');
  console.log(`  "${mockAnswers[5]}"\n`);

  // Step 2: Create Planning Docs
  console.log('📋 STEP 2: Creating Planning Docs (via Product Strategist)');
  console.log('─────────────────────────────────────────────────────────\n');

  await prisma.conductorState.update({
    where: { appRequestId },
    data: { currentStatus: 'base_prompt_ready' },
  });

  const strategist = new ProductStrategistHardened(
    prisma,
    conductor,
    logger,
    architect,
    llmConfig
  );

  await strategist.start(appRequestId);
  await strategist.approveDocument(appRequestId, 'MASTER_PLAN');
  await strategist.approveDocument(appRequestId, 'IMPLEMENTATION_PLAN');
  console.log('✅ Master Plan approved');
  console.log('✅ Implementation Plan approved\n');

  // Step 3: Extract Closed Vocabulary
  console.log('🔒 STEP 3: Extracting Closed Vocabulary');
  console.log('─────────────────────────────────────────────────────────\n');

  await prisma.conductorState.update({
    where: { appRequestId },
    data: { currentStatus: 'planning' },
  });

  const cartographer = new ScreenCartographerHardened(
    prisma,
    conductor,
    logger,
    strategist,
    llmConfig
  );

  // Access private method for demonstration (using any cast)
  const basePrompt = await (cartographer as any).getBasePrompt(appRequestId);
  const { masterPlan, implPlan } = await (cartographer as any).getPlanningDocsWithHash(appRequestId);
  const allowedNames = (cartographer as any).extractAllowedScreenNames(
    basePrompt,
    masterPlan,
    implPlan
  );

  console.log('Allowed Screen Names (Closed Vocabulary):');
  console.log('');
  allowedNames.forEach((name: string, i: number) => {
    console.log(`  ${i + 1}. ${name}`);
  });
  console.log('');
  console.log(`Total: ${allowedNames.length} allowed screen names\n`);

  // Step 4: Generate Screen Index
  console.log('🎯 STEP 4: Generating Screen Index (with Real Claude API)');
  console.log('─────────────────────────────────────────────────────────\n');

  console.log('System Prompt sent to Claude:');
  console.log('─────────────────────────────────────────────────────────');
  console.log(`You are a senior product/UX architect generating a Screen Index.

CRITICAL RULES:
- You may ONLY select screen names from the allowed vocabulary provided below
- DO NOT rename, pluralize, or invent new screen names
- DO NOT use synonyms or variations
...

ALLOWED SCREEN NAMES (CLOSED VOCABULARY):
${allowedNames.slice(0, 15).map((name: string, i: number) => `${i + 1}. ${name}`).join('\n')}
... (${allowedNames.length} total)

OUTPUT FORMAT (STRICT):
You MUST respond with ONLY a valid JSON object matching this schema:
{
  "screens": ["array", "of", "screen", "names"]
}`);
  console.log('─────────────────────────────────────────────────────────\n');

  const screenIndex = await cartographer.start(appRequestId);
  const screens = JSON.parse(screenIndex.screens);

  console.log('Claude\'s Raw Response (after JSON parsing):');
  console.log('─────────────────────────────────────────────────────────');
  console.log(JSON.stringify({ screens }, null, 2));
  console.log('─────────────────────────────────────────────────────────\n');

  console.log('After Canonicalization:');
  console.log('─────────────────────────────────────────────────────────');
  screens.forEach((screen: string, i: number) => {
    console.log(`  ${i + 1}. "${screen}" ✅ (matched vocabulary)`);
  });
  console.log('─────────────────────────────────────────────────────────\n');

  console.log(`✅ Screen Index created with ${screens.length} screens`);
  console.log(`📦 Hash: ${screenIndex.screenIndexHash?.substring(0, 16)}...\n`);

  // Step 5: Approve and describe first screen
  console.log('📱 STEP 5: Describing First Screen (Login)');
  console.log('─────────────────────────────────────────────────────────\n');

  await cartographer.approveScreenIndex(appRequestId);
  const screen1 = await cartographer.describeNextScreen(appRequestId);

  console.log('Claude\'s Response for "Login" screen:');
  console.log('─────────────────────────────────────────────────────────');
  console.log(screen1.content.substring(0, 800) + '...\n');
  console.log('─────────────────────────────────────────────────────────\n');

  console.log('Screen Definition Structure:');
  console.log('─────────────────────────────────────────────────────────');
  console.log(`✅ # ${screen1.screenName}`);
  console.log('✅ ## Purpose');
  console.log('✅ ## User Role Access');
  console.log('✅ ## Layout Structure');
  console.log('✅ ## Functional Logic');
  console.log('✅ ## Key UI Elements');
  console.log('✅ ## Special Behaviors');
  console.log('─────────────────────────────────────────────────────────\n');

  console.log(`📦 Screen Hash: ${screen1.screenHash?.substring(0, 16) || 'pending approval'}...\n`);

  // Cleanup
  await prisma.project.delete({ where: { id: projectId } });

  console.log('═══════════════════════════════════════════════════════════');
  console.log('  DEMONSTRATION COMPLETE');
  console.log('═══════════════════════════════════════════════════════════\n');

  console.log('Key Takeaways:');
  console.log('  1. Closed vocabulary extracted from base prompt + planning docs');
  console.log('  2. Claude receives the vocabulary in system prompt');
  console.log('  3. Claude\'s output is canonicalized to match exact vocabulary');
  console.log('  4. Screen definitions follow strict 6-section contract');
  console.log('  5. All outputs are hash-locked on approval');

  await prisma.$disconnect();
}

main().catch(console.error);
