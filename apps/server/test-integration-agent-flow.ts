/**
 * Integration Test: Foundry Architect → Synthetic Founder Flow
 *
 * This tests the real end-to-end flow with Claude API:
 * 1. Start Foundry Architect session
 * 2. Use Synthetic Founder to propose answers (with real LLM calls)
 * 3. Approve/adjust answers
 * 4. Complete all questions
 * 5. Approve Base Prompt
 *
 * REQUIRES: ANTHROPIC_API_KEY environment variable
 *
 * Run with: ANTHROPIC_API_KEY=sk-... node --loader ts-node/esm test-integration-agent-flow.ts
 */

import { PrismaClient } from '@prisma/client';
import { SyntheticFounderHardened } from './src/agents/synthetic-founder-hardened.js';
import { FoundryArchitectHardened } from './src/agents/foundry-architect-hardened.js';
import { ForgeConductor } from './src/conductor/forge-conductor.js';
import { randomUUID } from 'crypto';
import { pino } from 'pino';

const prisma = new PrismaClient();
const logger = pino({ level: 'info' }); // Show info logs for visibility

/**
 * Test Helpers
 */
async function createTestProject(): Promise<string> {
  const projectId = randomUUID();
  await prisma.project.create({
    data: {
      id: projectId,
      name: 'Integration Test - Agent Flow',
      description: 'Testing Foundry Architect → Synthetic Founder with real Claude API',
    },
  });
  return projectId;
}

async function createTestAppRequest(projectId: string): Promise<{
  id: string;
  projectId: string;
}> {
  const appRequestId = randomUUID();
  await prisma.appRequest.create({
    data: {
      id: appRequestId,
      projectId,
      prompt: `Build a task management app for freelancers.

Core idea: Help freelancers track client projects, tasks, and deadlines.
Target users: Freelancers and independent consultants who juggle multiple clients.
Main features needed: Task lists, project organization, deadline tracking, client management.
Key screens: Dashboard, Task List, Project View, Settings.`,
      status: 'idea',
    },
  });

  // Create ConductorState for this AppRequest
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

  return { id: appRequestId, projectId };
}

async function cleanup(projectId: string) {
  await prisma.project.delete({ where: { id: projectId } });
}

/**
 * Main Integration Test
 */
async function runIntegrationTest() {
  console.log('╔═══════════════════════════════════════════════════════╗');
  console.log('║  INTEGRATION TEST: Agent 1 → Agent 2 Flow             ║');
  console.log('║  Foundry Architect → Synthetic Founder                ║');
  console.log('╚═══════════════════════════════════════════════════════╝\n');

  // Check for API key
  if (!process.env.ANTHROPIC_API_KEY) {
    console.log('❌ ERROR: ANTHROPIC_API_KEY environment variable not set');
    console.log('   Please set it with: export ANTHROPIC_API_KEY=sk-...\n');
    process.exit(1);
  }

  console.log('✅ API key found\n');

  const projectId = await createTestProject();
  const appRequest = await createTestAppRequest(projectId);

  try {
    // Initialize agents
    const conductor = new ForgeConductor(prisma, logger);
    const architect = new FoundryArchitectHardened(prisma, conductor, logger);
    const syntheticFounder = new SyntheticFounderHardened(
      prisma,
      architect,
      conductor,
      logger,
      {
        temperature: 0.2, // Deterministic
        provider: 'anthropic',
        model: 'claude-sonnet-4-20250514',
      }
    );

    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('STEP 1: Start Foundry Architect Session');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

    await architect.start(appRequest.id);
    console.log('✅ Foundry session started\n');

    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('STEP 2: Answer Questions with Synthetic Founder');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

    // Track stats
    let totalApproved = 0;
    let totalAdjusted = 0;

    // Answer all 8 questions
    for (let i = 0; i < 8; i++) {
      const currentQuestion = await architect.getCurrentQuestion(appRequest.id);
      console.log(`\nQuestion ${i + 1}/${currentQuestion.totalQuestions}:`);
      console.log(`"${currentQuestion.question}"`);
      console.log(`Optional: ${currentQuestion.optional ? 'Yes' : 'No'}\n`);

      // Use Synthetic Founder to propose answer (REAL LLM CALL)
      console.log('🤖 Calling Claude API to generate proposal...');
      const startTime = Date.now();

      const proposed = await syntheticFounder.proposeAnswer(appRequest.id);

      const duration = Date.now() - startTime;
      console.log(`⏱️  API call took ${duration}ms\n`);

      // Display proposed answer
      console.log('📝 Proposed Answer:');
      console.log(`   Answer: "${proposed.contract.proposedAnswer}"`);
      console.log(`   Confidence: ${proposed.contract.confidence}`);
      console.log(`   Reasoning: "${proposed.contract.reasoning}"`);
      if (proposed.contract.assumptions.length > 0) {
        console.log(`   Assumptions: ${proposed.contract.assumptions.join(', ')}`);
      }
      if (proposed.contract.suggestedAlternatives.length > 0) {
        console.log(`   Alternatives: ${proposed.contract.suggestedAlternatives.join(', ')}`);
      }

      // For demo, approve all answers
      // In real usage, human would review and decide
      console.log('\n✅ Approving answer...');
      await syntheticFounder.approveProposedAnswer(proposed.id);
      totalApproved++;

      console.log('✓ Answer submitted to Foundry Architect\n');
      console.log('─────────────────────────────────────────────────────\n');
    }

    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('STEP 3: Review Draft Base Prompt');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

    const session = await architect.getSession(appRequest.id);
    if (!session) {
      throw new Error('Session not found');
    }

    console.log('📄 Draft Base Prompt Generated:\n');
    console.log('─────────────────────────────────────────────────────');
    console.log(session.draftPrompt);
    console.log('─────────────────────────────────────────────────────\n');

    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('STEP 4: Approve Base Prompt');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

    await architect.approveBasePrompt(appRequest.id, 'human');
    const approvedSession = await architect.getSession(appRequest.id);

    console.log('✅ Base Prompt APPROVED and LOCKED\n');
    console.log(`   Hash: ${approvedSession!.basePromptHash!.substring(0, 32)}...`);
    console.log(`   Version: ${approvedSession!.basePromptVersion}`);
    console.log(`   Status: ${approvedSession!.status}`);
    console.log(`   Approved At: ${approvedSession!.approvedAt?.toISOString()}\n`);

    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('STEP 5: Review Human Dominance Stats');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

    const stats = syntheticFounder.getDominanceStats(appRequest.id);
    console.log('📊 Synthetic Founder Statistics:');
    console.log(`   Total Proposed: ${stats!.totalProposed}`);
    console.log(`   Total Approved: ${stats!.totalApproved}`);
    console.log(`   Total Adjusted: ${stats!.totalAdjusted}`);
    console.log(`   Consecutive Adjustments: ${stats!.consecutiveAdjustments}`);
    console.log(`   Approval Rate: ${((stats!.totalApproved / stats!.totalProposed) * 100).toFixed(1)}%\n`);

    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('STEP 6: Verify Conductor State');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

    const conductorState = await conductor.getStateSnapshot(appRequest.id);
    console.log('🎛️  Conductor State:');
    console.log(`   Status: ${conductorState.currentStatus}`);
    console.log(`   Locked: ${conductorState.locked}`);
    console.log(`   Awaiting Human: ${conductorState.awaitingHuman}`);
    console.log(`   Last Agent: ${conductorState.lastAgent}\n`);

    if (conductorState.currentStatus !== 'base_prompt_ready') {
      throw new Error(`Expected status 'base_prompt_ready', got '${conductorState.currentStatus}'`);
    }

    console.log('╔═══════════════════════════════════════════════════════╗');
    console.log('║  ✅ INTEGRATION TEST PASSED                           ║');
    console.log('╚═══════════════════════════════════════════════════════╝\n');

    console.log('Summary:');
    console.log(`  • ${stats!.totalProposed} questions answered with AI assistance`);
    console.log(`  • ${stats!.totalApproved} answers approved by human`);
    console.log(`  • Base Prompt generated and locked with hash`);
    console.log(`  • Conductor transitioned to 'base_prompt_ready'`);
    console.log(`  • Ready for downstream agents (Product Strategist, etc.)\n`);

  } catch (error) {
    console.log('\n❌ TEST FAILED\n');
    console.error(error);
    process.exit(1);
  } finally {
    await cleanup(projectId);
    await prisma.$disconnect();
  }
}

runIntegrationTest().catch(error => {
  console.error('Fatal error:', error);
  prisma.$disconnect().then(() => process.exit(1));
});
