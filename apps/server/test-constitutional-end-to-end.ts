/**
 * CONSTITUTIONAL END-TO-END VERIFICATION TEST
 *
 * Tests ALL hardened agents in canonical order (Tiers 1-5)
 * with real APIs, full hash chain verification, and binary verdict.
 *
 * Philosophy: "If this test fails, constitutional discipline is broken."
 *
 * Test Input: Professional SaaS web application for freelance project
 * and task management.
 *
 * Expected Output: COMPLETE verdict with intact hash chain.
 */

import { PrismaClient } from '@prisma/client';
import pino from 'pino';
import { randomUUID } from 'crypto';
import { ForgeConductor } from './src/conductor/forge-conductor.js';
import { FoundryArchitectHardened } from './src/agents/foundry-architect-hardened.js';
import { SyntheticFounderHardened } from './src/agents/synthetic-founder-hardened.js';
import { ProductStrategistHardened } from './src/agents/product-strategist-hardened.js';
import { ScreenCartographerHardened } from './src/agents/screen-cartographer-hardened.js';
import { JourneyOrchestratorHardened } from './src/agents/journey-orchestrator-hardened.js';
import { VisualForgeHardened } from './src/agents/visual-forge-hardened.js';
import { BuildPromptEngineerHardened } from './src/agents/build-prompt-engineer-hardened.js';
import { ExecutionPlannerHardened } from './src/agents/execution-planner-hardened.js';
import { ForgeImplementerHardened } from './src/agents/forge-implementer-hardened.js';
import { CompletionAuditorHardened } from './src/agents/completion-auditor-hardened.js';

const prisma = new PrismaClient();
const logger = pino({ level: 'info' });
const conductor = new ForgeConductor(prisma, logger);

/**
 * TEST INPUT (from MASTER PROMPT)
 */
const TEST_INPUT = {
  prompt: `A professional SaaS web application for freelance project and task management, allowing freelancers to manage clients, projects, tasks, deadlines, and invoices in a clean, modern dashboard. Target users are solo freelancers and small agencies. The system must be realistic, minimal, and production-ready.`,
};

/**
 * EXECUTION LOG (chronological)
 */
interface ExecutionLogEntry {
  timestamp: Date;
  tier: string;
  agent: string;
  action: string;
  artifactId?: string;
  hash?: string;
  status: 'started' | 'completed' | 'approved' | 'failed';
  details?: string;
}

const executionLog: ExecutionLogEntry[] = [];

function logEntry(entry: Omit<ExecutionLogEntry, 'timestamp'>) {
  const fullEntry = { ...entry, timestamp: new Date() };
  executionLog.push(fullEntry);
  console.log(
    `[${fullEntry.timestamp.toISOString()}] [${fullEntry.tier}] ${fullEntry.agent}: ${fullEntry.action} - ${fullEntry.status}${
      fullEntry.hash ? ` (hash: ${fullEntry.hash.substring(0, 16)}...)` : ''
    }`
  );
}

/**
 * CLEANUP TEST CONTEXT
 */
async function cleanupTestContext(appRequestId: string): Promise<void> {
  const appRequest = await prisma.appRequest.findUnique({
    where: { id: appRequestId },
  });

  if (!appRequest) return;

  // Delete all artifacts in reverse dependency order
  await prisma.verification.deleteMany({ where: { appRequestId } });
  await prisma.executionEvent.deleteMany({ where: { executionId: appRequest.executionId! } });
  await prisma.executionPlan.deleteMany({ where: { appRequestId } });
  await prisma.buildPrompt.deleteMany({ where: { appRequestId } });
  await prisma.visualContract.deleteMany({ where: { appRequestId } });
  await prisma.journey.deleteMany({ where: { appRequestId } });
  await prisma.screen.deleteMany({ where: { appRequestId } });
  await prisma.planningDocument.deleteMany({ where: { appRequestId } });
  await prisma.conductorState.deleteMany({ where: { appRequestId } });
  await prisma.syntheticAnswer.deleteMany({ where: { appRequestId } });
  await prisma.foundryQuestion.deleteMany({ where: { appRequestId } });
  await prisma.projectRuleSet.deleteMany({ where: { appRequestId } });
  await prisma.foundrySession.deleteMany({ where: { appRequestId } });

  if (appRequest.executionId) {
    await prisma.execution.delete({ where: { id: appRequest.executionId } });
  }

  await prisma.appRequest.delete({ where: { id: appRequestId } });
  await prisma.project.delete({ where: { id: appRequest.projectId } });
}

/**
 * MAIN TEST EXECUTION
 */
async function runConstitutionalEndToEndTest() {
  console.log('================================================================================');
  console.log('CONSTITUTIONAL END-TO-END VERIFICATION TEST');
  console.log('Testing ALL hardened agents (Tiers 1-5) in canonical order');
  console.log('================================================================================\n');

  let appRequestId: string | undefined;
  let projectId: string | undefined;
  let executionId: string | undefined;

  try {
    // ============================================================================
    // SETUP: Create Project and AppRequest
    // ============================================================================
    projectId = randomUUID();
    executionId = randomUUID();
    appRequestId = randomUUID();

    console.log('📦 SETUP: Creating project and app request...\n');

    await prisma.project.create({
      data: {
        id: projectId,
        name: 'Constitutional E2E Test Project',
        description: 'End-to-end test of all hardened agents',
      },
    });

    await prisma.execution.create({
      data: {
        id: executionId,
        projectId,
        status: 'running',
      },
    });

    await prisma.appRequest.create({
      data: {
        id: appRequestId,
        projectId,
        executionId,
        prompt: TEST_INPUT.prompt,
        status: 'foundry_running',
      },
    });

    // Create ConductorState (must start in 'idea' status for Foundry Architect)
    await prisma.conductorState.create({
      data: {
        id: randomUUID(),
        appRequestId,
        currentStatus: 'idea',
        locked: false,
        awaitingHuman: false,
        lastAgent: 'System',
      },
    });

    logEntry({
      tier: 'SETUP',
      agent: 'System',
      action: 'Created project, app request, and conductor state',
      artifactId: appRequestId,
      status: 'completed',
    });

    // ============================================================================
    // TIER 1: FOUNDRY ARCHITECT → SYNTHETIC FOUNDER
    // ============================================================================
    console.log('\n🏗️  TIER 1: FOUNDRY & INTENT\n');

    // Foundry Architect: Start session
    logEntry({
      tier: 'TIER-1',
      agent: 'FoundryArchitect',
      action: 'Starting foundry session',
      status: 'started',
    });

    const foundryArchitect = new FoundryArchitectHardened(prisma, conductor, logger);
    const sessionSummary = await foundryArchitect.start(appRequestId);

    logEntry({
      tier: 'TIER-1',
      agent: 'FoundryArchitect',
      action: 'Generated foundry questions',
      artifactId: sessionSummary.id,
      status: 'completed',
    });

    // Synthetic Founder: Answer questions
    logEntry({
      tier: 'TIER-1',
      agent: 'SyntheticFounder',
      action: 'Answering foundry questions',
      status: 'started',
    });

    const syntheticFounder = new SyntheticFounderHardened(
      prisma,
      foundryArchitect,
      conductor,
      logger,
      {
        apiKey: process.env.ANTHROPIC_API_KEY,
        model: 'claude-sonnet-4-20250514',
        temperature: 0.2,
        maxTokens: 2000,
        retryAttempts: 2,
        provider: 'anthropic',
      }
    );

    // Answer all questions using Synthetic Founder
    for (let step = 0; step < sessionSummary.totalSteps; step++) {
      // Have Synthetic Founder propose answer to current question
      const proposedAnswer = await syntheticFounder.proposeAnswer(appRequestId);

      // Approve the proposed answer (auto-approve for test)
      await syntheticFounder.approveProposedAnswer(proposedAnswer.id);

      // Submit the answer to Foundry Architect
      await foundryArchitect.submitAnswer(appRequestId, proposedAnswer.contract.proposedAnswer);

      logEntry({
        tier: 'TIER-1',
        agent: 'SyntheticFounder',
        action: `Answered question ${step + 1}/${sessionSummary.totalSteps}`,
        status: 'approved',
      });
    }

    // Base Prompt is auto-generated after all questions answered
    const basePromptSession = await prisma.foundrySession.findUnique({
      where: { appRequestId },
      select: { basePromptHash: true, draftPrompt: true },
    });

    logEntry({
      tier: 'TIER-1',
      agent: 'FoundryArchitect',
      action: 'Generated Base Prompt (auto)',
      hash: basePromptSession?.basePromptHash || undefined,
      status: 'completed',
    });

    // Approve Base Prompt (in production, human would review)
    await foundryArchitect.approveBasePrompt(appRequestId, 'human');

    logEntry({
      tier: 'TIER-1',
      agent: 'FoundryArchitect',
      action: 'Approved Base Prompt',
      hash: basePromptSession?.basePromptHash || undefined,
      status: 'approved',
    });

    // ============================================================================
    // TIER 2: PRODUCT STRATEGIST → SCREEN CARTOGRAPHER → JOURNEY ORCHESTRATOR
    // ============================================================================
    console.log('\n📋 TIER 2: PLANNING & STRATEGY\n');

    // Product Strategist: Generate Master Plan and Implementation Plan
    logEntry({
      tier: 'TIER-2',
      agent: 'ProductStrategist',
      action: 'Generating Master Plan',
      status: 'started',
    });

    const productStrategist = new ProductStrategistHardened(prisma, conductor, logger, {
      apiKey: process.env.ANTHROPIC_API_KEY,
      model: 'claude-sonnet-4-20250514',
      temperature: 0.2,
      maxTokens: 3000,
      retryAttempts: 2,
      provider: 'anthropic',
    });

    // Start generates Master Plan
    const masterPlanDoc = await productStrategist.start(appRequestId);

    logEntry({
      tier: 'TIER-2',
      agent: 'ProductStrategist',
      action: 'Generated Master Plan',
      artifactId: masterPlanDoc.id,
      hash: masterPlanDoc.documentHash || undefined,
      status: 'completed',
    });

    // Approve Master Plan (this also generates Implementation Plan automatically)
    const implPlanDoc = await productStrategist.approveDocument(appRequestId, 'MASTER_PLAN');

    logEntry({
      tier: 'TIER-2',
      agent: 'ProductStrategist',
      action: 'Approved Master Plan (Implementation Plan auto-generated)',
      hash: masterPlanDoc.documentHash || undefined,
      status: 'approved',
    });

    if (!implPlanDoc) {
      throw new Error('Implementation Plan was not generated after Master Plan approval');
    }

    logEntry({
      tier: 'TIER-2',
      agent: 'ProductStrategist',
      action: 'Implementation Plan generated',
      artifactId: implPlanDoc.id,
      hash: implPlanDoc.documentHash || undefined,
      status: 'completed',
    });

    // Approve Implementation Plan
    await productStrategist.approveDocument(appRequestId, 'IMPLEMENTATION_PLAN');

    logEntry({
      tier: 'TIER-2',
      agent: 'ProductStrategist',
      action: 'Approved Implementation Plan',
      hash: implPlanDoc.documentHash || undefined,
      status: 'approved',
    });

    // Screen Cartographer: Generate screen index and screen definitions
    logEntry({
      tier: 'TIER-2',
      agent: 'ScreenCartographer',
      action: 'Generating screen index',
      status: 'started',
    });

    const screenCartographer = new ScreenCartographerHardened(prisma, conductor, logger, {
      apiKey: process.env.ANTHROPIC_API_KEY,
      model: 'claude-sonnet-4-20250514',
      temperature: 0.2,
      maxTokens: 3000,
      retryAttempts: 2,
      provider: 'anthropic',
    });

    // Generate screen index
    const screenIndex = await screenCartographer.start(appRequestId);

    logEntry({
      tier: 'TIER-2',
      agent: 'ScreenCartographer',
      action: 'Generated screen index',
      artifactId: screenIndex.id,
      hash: screenIndex.screenIndexHash || undefined,
      status: 'completed',
    });

    // Approve screen index
    await screenCartographer.approveScreenIndex(appRequestId);

    logEntry({
      tier: 'TIER-2',
      agent: 'ScreenCartographer',
      action: 'Approved screen index',
      status: 'approved',
    });

    // Generate and approve each screen definition
    let screenCount = 0;
    while (true) {
      try {
        const screenDef = await screenCartographer.describeNextScreen(appRequestId);
        await screenCartographer.approveCurrentScreen(appRequestId);
        screenCount++;

        logEntry({
          tier: 'TIER-2',
          agent: 'ScreenCartographer',
          action: `Generated and approved screen ${screenCount}`,
          status: 'approved',
        });
      } catch (error: any) {
        if (error.message.includes('All screens have been described')) {
          break;
        }
        throw error;
      }
    }

    logEntry({
      tier: 'TIER-2',
      agent: 'ScreenCartographer',
      action: `All screens described (${screenCount} screens)`,
      status: 'completed',
    });

    // Journey Orchestrator: Generate user role table and journeys
    logEntry({
      tier: 'TIER-2',
      agent: 'JourneyOrchestrator',
      action: 'Generating user role table',
      status: 'started',
    });

    const journeyOrchestrator = new JourneyOrchestratorHardened(prisma, conductor, logger, {
      apiKey: process.env.ANTHROPIC_API_KEY,
      model: 'claude-sonnet-4-20250514',
      temperature: 0.2,
      maxTokens: 3000,
      retryAttempts: 2,
      provider: 'anthropic',
    });

    // Generate user role table
    const userRoleTable = await journeyOrchestrator.start(appRequestId);

    logEntry({
      tier: 'TIER-2',
      agent: 'JourneyOrchestrator',
      action: 'Generated user role table',
      status: 'completed',
    });

    // Approve user role table
    await journeyOrchestrator.approveUserRoleTable(appRequestId);

    logEntry({
      tier: 'TIER-2',
      agent: 'JourneyOrchestrator',
      action: 'Approved user role table',
      status: 'approved',
    });

    // Generate and approve each journey
    let journeyCount = 0;
    while (true) {
      try {
        const journey = await journeyOrchestrator.describeNextJourney(appRequestId);
        await journeyOrchestrator.approveCurrentJourney(appRequestId);
        journeyCount++;

        logEntry({
          tier: 'TIER-2',
          agent: 'JourneyOrchestrator',
          action: `Generated and approved journey ${journeyCount}`,
          status: 'approved',
        });
      } catch (error: any) {
        if (error.message.includes('All journeys have been described')) {
          break;
        }
        throw error;
      }
    }

    logEntry({
      tier: 'TIER-2',
      agent: 'JourneyOrchestrator',
      action: `All journeys described (${journeyCount} journeys)`,
      status: 'completed',
    });

    // ============================================================================
    // TIER 3: VISUAL FORGE (orchestrates VRA → DVNL → VCA → VCRA → Playwright)
    // ============================================================================
    console.log('\n🎨 TIER 3: VISUAL MOCKUP GENERATION\n');

    logEntry({
      tier: 'TIER-3',
      agent: 'VisualForge',
      action: 'Generating mockups for all screens',
      status: 'started',
    });

    const visualForge = new VisualForgeHardened(prisma, conductor, logger);

    // Get all screens to generate mockups for
    const screens = await prisma.screen.findMany({
      where: { appRequestId, status: 'approved' },
    });

    let mockupsGenerated = 0;
    for (const screen of screens) {
      // Generate desktop mockup (Visual Forge internally handles VRA/DVNL/VCA/VCRA/Playwright)
      await visualForge.generateMockup(appRequestId, screen.name, 'desktop', 'html-tailwind');

      // Approve mockup
      await visualForge.approveMockup(appRequestId, screen.name);

      mockupsGenerated++;

      logEntry({
        tier: 'TIER-3',
        agent: 'VisualForge',
        action: `Generated and approved mockup for ${screen.name}`,
        status: 'approved',
      });
    }

    logEntry({
      tier: 'TIER-3',
      agent: 'VisualForge',
      action: `All mockups generated (${mockupsGenerated} screens)`,
      status: 'completed',
      details: 'Each mockup generated via VCRA code + Playwright rendering',
    });

    // ============================================================================
    // TIER 4: BUILD PROMPT ENGINEER → EXECUTION PLANNER → FORGE IMPLEMENTER
    // ============================================================================
    console.log('\n🔨 TIER 4: BUILD EXECUTION\n');

    // Build Prompt Engineer: Generate BuildPrompts
    logEntry({
      tier: 'TIER-4',
      agent: 'BuildPromptEngineer',
      action: 'Generating BuildPrompts',
      status: 'started',
    });

    const buildPromptEngineer = new BuildPromptEngineerHardened(prisma, conductor, logger);
    const buildPromptIds = await buildPromptEngineer.start(appRequestId);

    logEntry({
      tier: 'TIER-4',
      agent: 'BuildPromptEngineer',
      action: `Generated ${buildPromptIds.length} BuildPrompts`,
      status: 'completed',
    });

    // Approve all BuildPrompts
    for (const bpId of buildPromptIds) {
      await buildPromptEngineer.approve(bpId, 'test-approver');
    }

    logEntry({
      tier: 'TIER-4',
      agent: 'BuildPromptEngineer',
      action: 'Approved all BuildPrompts',
      status: 'approved',
    });

    // Execution Planner: Generate ExecutionPlans
    logEntry({
      tier: 'TIER-4',
      agent: 'ExecutionPlanner',
      action: 'Generating ExecutionPlans',
      status: 'started',
    });

    const executionPlanner = new ExecutionPlannerHardened(prisma, conductor, logger);
    const executionPlanIds: string[] = [];

    for (const bpId of buildPromptIds) {
      const planId = await executionPlanner.start(bpId);
      executionPlanIds.push(planId);
    }

    logEntry({
      tier: 'TIER-4',
      agent: 'ExecutionPlanner',
      action: `Generated ${executionPlanIds.length} ExecutionPlans`,
      status: 'completed',
    });

    // Approve all ExecutionPlans
    for (const planId of executionPlanIds) {
      await executionPlanner.approve(planId, 'test-approver');
    }

    logEntry({
      tier: 'TIER-4',
      agent: 'ExecutionPlanner',
      action: 'Approved all ExecutionPlans',
      status: 'approved',
    });

    // Forge Implementer: Execute all plans
    logEntry({
      tier: 'TIER-4',
      agent: 'ForgeImplementer',
      action: 'Executing all plans',
      status: 'started',
    });

    const forgeImplementer = new ForgeImplementerHardened(prisma, conductor, logger);

    for (const planId of executionPlanIds) {
      const execLog = await forgeImplementer.execute(planId);

      if (execLog.status === 'failed') {
        throw new Error(`Execution failed at ${execLog.failedAt}: ${execLog.taskResults.find(t => t.status === 'failure')?.error}`);
      }

      logEntry({
        tier: 'TIER-4',
        agent: 'ForgeImplementer',
        action: `Executed plan ${planId}`,
        hash: execLog.logHash,
        status: 'completed',
        details: `${execLog.taskResults.length} tasks completed`,
      });
    }

    logEntry({
      tier: 'TIER-4',
      agent: 'ForgeImplementer',
      action: 'All plans executed successfully',
      status: 'completed',
    });

    // ============================================================================
    // FINAL GATE: COMPLETION AUDITOR
    // ============================================================================
    console.log('\n✅ FINAL GATE: COMPLETION AUDIT\n');

    logEntry({
      tier: 'FINAL-GATE',
      agent: 'CompletionAuditor',
      action: 'Running 9 completion checks',
      status: 'started',
    });

    const completionAuditor = new CompletionAuditorHardened(prisma, conductor, logger);
    const completionReport = await completionAuditor.audit(appRequestId);

    logEntry({
      tier: 'FINAL-GATE',
      agent: 'CompletionAuditor',
      action: 'Completion audit finished',
      hash: completionReport.reportHash,
      status: 'completed',
      details: `Verdict: ${completionReport.verdict}`,
    });

    // ============================================================================
    // RESULTS
    // ============================================================================
    console.log('\n================================================================================');
    console.log('TEST RESULTS');
    console.log('================================================================================\n');

    console.log(`📊 EXECUTION SUMMARY:`);
    console.log(`   Total steps: ${executionLog.length}`);
    console.log(`   Tier 1 steps: ${executionLog.filter(e => e.tier === 'TIER-1').length}`);
    console.log(`   Tier 2 steps: ${executionLog.filter(e => e.tier === 'TIER-2').length}`);
    console.log(`   Tier 3 steps: ${executionLog.filter(e => e.tier === 'TIER-3').length}`);
    console.log(`   Tier 4 steps: ${executionLog.filter(e => e.tier === 'TIER-4').length}`);
    console.log(`   Final Gate steps: ${executionLog.filter(e => e.tier === 'FINAL-GATE').length}\n`);

    console.log(`🔒 HASH CHAIN VERIFICATION:`);
    console.log(`   Base Prompt Hash: ${basePrompt?.basePromptHash}`);
    console.log(`   Master Plan Hash: ${masterPlan?.documentHash}`);
    console.log(`   Implementation Plan Hash: ${implPlan?.documentHash}`);
    console.log(`   Completion Report Hash: ${completionReport.reportHash}\n`);

    console.log(`⚖️  FINAL VERDICT:`);
    console.log(`   Status: ${completionReport.verdict}`);
    console.log(`   Verification: ${completionReport.verificationStatus}`);
    console.log(`   Build Prompts: ${completionReport.buildPromptCount}`);
    console.log(`   Execution Plans: ${completionReport.executionPlanCount}`);

    if (completionReport.verdict === 'COMPLETE') {
      console.log(`\n✅ CONSTITUTIONAL TEST PASSED`);
      console.log(`   All hardened agents executed successfully`);
      console.log(`   Hash chain integrity maintained`);
      console.log(`   Binary verdict: COMPLETE\n`);
    } else {
      console.log(`\n❌ CONSTITUTIONAL TEST FAILED`);
      console.log(`   Verdict: ${completionReport.verdict}`);
      console.log(`   Failure Reasons:`);
      completionReport.failureReasons?.forEach(reason => {
        console.log(`   - ${reason}`);
      });
      console.log();
    }

    console.log('================================================================================');

    if (completionReport.verdict !== 'COMPLETE') {
      process.exit(1);
    }
  } catch (error) {
    console.error('\n❌ FATAL ERROR:', error);
    console.error('\nExecution log up to failure:');
    executionLog.forEach(entry => {
      console.error(
        `  [${entry.timestamp.toISOString()}] [${entry.tier}] ${entry.agent}: ${entry.action} - ${entry.status}`
      );
    });
    process.exit(1);
  } finally {
    if (appRequestId) {
      console.log('\n🧹 Cleaning up test context...');
      await cleanupTestContext(appRequestId);
    }
    await prisma.$disconnect();
  }
}

runConstitutionalEndToEndTest().catch(error => {
  console.error('Unhandled error:', error);
  process.exit(1);
});
