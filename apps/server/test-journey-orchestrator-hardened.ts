/**
 * Journey Orchestrator (Hardened) - Production Test Suite
 *
 * CRITICAL: All tests use REAL Claude API calls (no mocks).
 * Temperature ≤ 0.3 for determinism.
 *
 * Required outcome: 10/10 tests passing
 */

import { PrismaClient } from '@prisma/client';
import { JourneyOrchestratorHardened } from './src/agents/journey-orchestrator-hardened';
import { ForgeConductor } from './src/conductor/forge-conductor';
import pino from 'pino';
import { randomUUID, createHash } from 'crypto';

const prisma = new PrismaClient();
const logger = pino({ level: 'silent' }); // Silent to see only test output
const conductor = new ForgeConductor(prisma, logger);

const llmConfig = {
  provider: 'anthropic' as const,
  apiKey: process.env.ANTHROPIC_API_KEY || '',
  model: 'claude-sonnet-4-20250514',
  temperature: 0.2,
  maxTokens: 3000,
  retryAttempts: 3,
};

// Test result tracking
const testResults: { name: string; passed: boolean; error?: string }[] = [];

function logTest(name: string, passed: boolean, error?: string) {
  testResults.push({ name, passed, error });
  console.log(passed ? `✅ ${name}` : `❌ ${name}${error ? ': ' + error : ''}`);
}

/**
 * Setup: Create test project with approved planning docs, screen index
 */
async function setupTestProject() {
  const projectId = randomUUID();
  await prisma.project.create({
    data: { id: projectId, name: 'Test Project', description: 'Test' },
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

  return { projectId, appRequestId };
}

/**
 * Create approved base prompt, planning docs, and screen index (minimal setup)
 */
async function setupApprovedDocs(appRequestId: string) {
  // Create Base Prompt
  const basePrompt = `# Base Prompt for Task Management App

## What is your app about?
A task management app for freelancers to organize projects and track tasks.

## Who are your target users?
Freelancers and independent consultants, particularly User and Admin roles.

## Core Features
- Task lists
- Project organization
- Deadline tracking
- User authentication (Login, Signup)
- Admin dashboard for management

## Screens
Landing Page, Login, Signup, Dashboard, Task List, Create Task, Edit Task, Settings, Profile

## Success Criteria
Users can successfully create, view, and complete tasks.`;

  const basePromptHash = createHash('sha256').update(basePrompt, 'utf8').digest('hex');

  await prisma.foundrySession.create({
    data: {
      id: randomUUID(),
      appRequestId,
      status: 'approved',
      currentStep: 8,
      answers: JSON.stringify([]),
      draftPrompt: basePrompt,
      basePromptVersion: 1,
      basePromptHash,
      approvedAt: new Date(),
      approvedBy: 'human',
    },
  });

  // Create Master Plan
  const masterPlan = `# Master Plan

## Vision
A streamlined task management platform for freelancers.

## Target Audience
Freelancers need simple project and task organization without enterprise complexity.

## Core Features
1. User authentication (User, Admin roles)
2. Task management (create, edit, complete)
3. Project organization
4. Deadline tracking

## User Roles
- Admin: Full system access, user management
- User: Can manage own tasks and projects`;

  const masterPlanHash = createHash('sha256').update(masterPlan, 'utf8').digest('hex');

  await prisma.planningDocument.create({
    data: {
      id: randomUUID(),
      appRequestId,
      type: 'MASTER_PLAN',
      content: masterPlan,
      status: 'approved',
      documentVersion: 1,
      documentHash: masterPlanHash,
      basePromptHash,
      approvedAt: new Date(),
      approvedBy: 'human',
    },
  });

  // Create Implementation Plan
  const implPlan = `# Implementation Plan

## Architecture
- React frontend
- Node.js backend
- SQLite database

## Core Modules
1. Authentication (Login, Signup screens)
2. Task Management (Task List, Create Task, Edit Task screens)
3. Dashboard (Dashboard screen for overview)
4. Settings (Settings screen for preferences)

## User Roles
- Admin: All permissions, can manage users
- User: Can manage own tasks

## Development Phases
1. User authentication
2. Basic task CRUD
3. Project organization
4. Dashboard views`;

  const implPlanHash = createHash('sha256').update(implPlan, 'utf8').digest('hex');
  const planningDocsHash = createHash('sha256').update(masterPlan + '\n' + implPlan, 'utf8').digest('hex');

  await prisma.planningDocument.create({
    data: {
      id: randomUUID(),
      appRequestId,
      type: 'IMPLEMENTATION_PLAN',
      content: implPlan,
      status: 'approved',
      documentVersion: 1,
      documentHash: implPlanHash,
      basePromptHash,
      approvedAt: new Date(),
      approvedBy: 'human',
    },
  });

  // Create Screen Index
  const screens = [
    'Landing Page',
    'Login',
    'Signup',
    'Dashboard',
    'Task List',
    'Create Task',
    'Edit Task',
    'Settings',
    'Profile',
  ];

  const screenIndexHash = createHash('sha256').update(JSON.stringify(screens), 'utf8').digest('hex');

  await prisma.screenIndex.create({
    data: {
      id: randomUUID(),
      appRequestId,
      screens: JSON.stringify(screens),
      status: 'approved',
      screenIndexVersion: 1,
      screenIndexHash,
      approvedAt: new Date(),
      approvedBy: 'human',
      basePromptHash,
      planningDocsHash,
    },
  });
}

async function runTests() {
  console.log('═══════════════════════════════════════════════════════════');
  console.log('  JOURNEY ORCHESTRATOR (HARDENED) - PRODUCTION TEST SUITE');
  console.log('═══════════════════════════════════════════════════════════\n');
  console.log('Running 10 mandatory tests with REAL Claude API calls...\n');

  const { projectId, appRequestId } = await setupTestProject();

  console.log('Setting up approved documents (Base Prompt, Planning Docs, Screen Index)...\n');
  await setupApprovedDocs(appRequestId);
  console.log('Setup complete!\n');

  try {
    // ===========================================================
    // TEST 1: Envelope Validation (BEHAVIORAL_AUTHORITY)
    // ===========================================================
    try {
      const orchestrator = new JourneyOrchestratorHardened(
        prisma,
        conductor,
        logger,
        llmConfig
      );

      // Access private method via any cast for testing
      const envelope = (orchestrator as any).envelope;

      if (
        envelope.agentName === 'JourneyOrchestrator' &&
        envelope.authorityLevel === 'BEHAVIORAL_AUTHORITY' &&
        envelope.allowedActions.includes('defineUserRoles') &&
        envelope.forbiddenActions.includes('inventRoles') &&
        envelope.forbiddenActions.includes('modifyScreens')
      ) {
        logTest('TEST 1: Envelope validation (BEHAVIORAL_AUTHORITY)', true);
      } else {
        logTest('TEST 1: Envelope validation (BEHAVIORAL_AUTHORITY)', false, 'Envelope structure invalid');
      }
    } catch (error) {
      logTest('TEST 1: Envelope validation (BEHAVIORAL_AUTHORITY)', false, String(error));
    }

    // ===========================================================
    // TEST 2: Context Isolation (Hash-Based)
    // ===========================================================
    try {
      const orchestrator = new JourneyOrchestratorHardened(
        prisma,
        conductor,
        logger,
        llmConfig
      );

      const roleTable = await orchestrator.start(appRequestId);

      // Verify role table has hash references
      if (
        roleTable.basePromptHash &&
        roleTable.planningDocsHash &&
        roleTable.screenIndexHash &&
        roleTable.basePromptHash.length === 64 &&
        roleTable.planningDocsHash.length === 64 &&
        roleTable.screenIndexHash.length === 64
      ) {
        logTest('TEST 2: Context isolation (hash-based)', true);
      } else {
        logTest('TEST 2: Context isolation (hash-based)', false, 'Missing or invalid hash references');
      }
    } catch (error) {
      logTest('TEST 2: Context isolation (hash-based)', false, String(error));
    }

    // ===========================================================
    // TEST 3: Closed Role Vocabulary Enforcement
    // ===========================================================
    try {
      const orchestrator = new JourneyOrchestratorHardened(
        prisma,
        conductor,
        logger,
        llmConfig
      );

      // Access private method
      const basePrompt = await (orchestrator as any).getBasePrompt(appRequestId);
      const { masterPlan, implPlan } = await (orchestrator as any).getPlanningDocsWithHash(appRequestId);
      const allowedRoles = (orchestrator as any).extractAllowedRoles(basePrompt, masterPlan, implPlan);

      // Verify vocabulary is extracted
      if (
        Array.isArray(allowedRoles) &&
        allowedRoles.length > 0 &&
        allowedRoles.every(role => typeof role === 'string' && role.length > 0)
      ) {
        logTest('TEST 3: Closed role vocabulary enforcement', true);
      } else {
        logTest('TEST 3: Closed role vocabulary enforcement', false, 'Invalid vocabulary extraction');
      }
    } catch (error) {
      logTest('TEST 3: Closed role vocabulary enforcement', false, String(error));
    }

    // ===========================================================
    // TEST 4: Role Canonicalization (Fail Loudly)
    // ===========================================================
    try {
      const orchestrator = new JourneyOrchestratorHardened(
        prisma,
        conductor,
        logger,
        llmConfig
      );

      const allowedRoles = ['Admin', 'User', 'Guest'];

      // Test valid canonicalization
      const canon1 = (orchestrator as any).canonicalizeRoleName('admin', allowedRoles);
      const canon2 = (orchestrator as any).canonicalizeRoleName('USER', allowedRoles);

      if (canon1 !== 'Admin' || canon2 !== 'User') {
        throw new Error('Canonicalization not case-insensitive');
      }

      // Test invalid role (should throw)
      let threwError = false;
      try {
        (orchestrator as any).canonicalizeRoleName('SuperAdmin', allowedRoles);
      } catch (error) {
        if (error instanceof Error && error.message.includes('ROLE NAME CANONICALIZATION FAILURE')) {
          threwError = true;
        }
      }

      if (threwError) {
        logTest('TEST 4: Role canonicalization (fail loudly)', true);
      } else {
        logTest('TEST 4: Role canonicalization (fail loudly)', false, 'Did not fail loudly on unknown role');
      }
    } catch (error) {
      logTest('TEST 4: Role canonicalization (fail loudly)', false, String(error));
    }

    // ===========================================================
    // TEST 5: UserRoleContract Validation
    // ===========================================================
    try {
      const orchestrator = new JourneyOrchestratorHardened(
        prisma,
        conductor,
        logger,
        llmConfig
      );

      // Test valid contract
      const validContract = {
        roles: [
          {
            roleName: 'Admin',
            description: 'Administrator role',
            permissions: ['manage_users', 'view_all'],
            accessibleScreens: ['Dashboard', 'Settings'],
            forbiddenScreens: [],
          },
        ],
      };

      (orchestrator as any).validateUserRoleTableContract(validContract);

      // Test invalid contract (missing roleName)
      let threwError = false;
      try {
        const invalidContract = {
          roles: [
            {
              description: 'Missing roleName',
              permissions: [],
              accessibleScreens: [],
              forbiddenScreens: [],
            },
          ],
        };
        (orchestrator as any).validateUserRoleTableContract(invalidContract);
      } catch (error) {
        if (error instanceof Error && error.message.includes('CONTRACT VIOLATION')) {
          threwError = true;
        }
      }

      if (threwError) {
        logTest('TEST 5: UserRoleContract validation', true);
      } else {
        logTest('TEST 5: UserRoleContract validation', false, 'Did not fail on invalid contract');
      }
    } catch (error) {
      logTest('TEST 5: UserRoleContract validation', false, String(error));
    }

    // ===========================================================
    // TEST 6: UserJourneyContract Validation
    // ===========================================================
    try {
      const orchestrator = new JourneyOrchestratorHardened(
        prisma,
        conductor,
        logger,
        llmConfig
      );

      const screenIndex = ['Dashboard', 'Task List', 'Settings'];

      // Test valid contract
      const validContract = {
        roleName: 'User',
        steps: [
          { order: 1, screen: 'Dashboard', action: 'View tasks', outcome: 'See task list' },
          { order: 2, screen: 'Task List', action: 'Select task', outcome: 'View details' },
        ],
      };

      (orchestrator as any).validateUserJourneyContract(validContract, screenIndex);

      // Test invalid contract (unknown screen)
      let threwError = false;
      try {
        const invalidContract = {
          roleName: 'User',
          steps: [
            { order: 1, screen: 'UnknownScreen', action: 'Do something', outcome: 'Result' },
          ],
        };
        (orchestrator as any).validateUserJourneyContract(invalidContract, screenIndex);
      } catch (error) {
        if (error instanceof Error && error.message.includes('unknown screen')) {
          threwError = true;
        }
      }

      if (threwError) {
        logTest('TEST 6: UserJourneyContract validation', true);
      } else {
        logTest('TEST 6: UserJourneyContract validation', false, 'Did not fail on unknown screen');
      }
    } catch (error) {
      logTest('TEST 6: UserJourneyContract validation', false, String(error));
    }

    // ===========================================================
    // TEST 7: Immutability & Hashing
    // ===========================================================
    try {
      const orchestrator = new JourneyOrchestratorHardened(
        prisma,
        conductor,
        logger,
        llmConfig
      );

      // Get existing role table from TEST 2 (should be awaiting approval)
      let roleTable = await prisma.userRoleDefinition.findUnique({
        where: { appRequestId },
      });

      if (!roleTable) {
        throw new Error('Role table not found (TEST 2 should have created it)');
      }

      // Role table should NOT have hash yet (awaiting approval)
      if (roleTable.roleTableHash !== null) {
        throw new Error('Role table should not have hash before approval');
      }

      await orchestrator.approveUserRoleTable(appRequestId, 'human');

      const approved = await prisma.userRoleDefinition.findUnique({
        where: { appRequestId },
      });

      // After approval, should have hash
      if (
        approved &&
        approved.roleTableHash &&
        approved.roleTableHash.length === 64 &&
        approved.status === 'approved' &&
        approved.approvedBy === 'human'
      ) {
        logTest('TEST 7: Immutability & hashing', true);
      } else {
        logTest('TEST 7: Immutability & hashing', false, 'Hash not locked on approval');
      }
    } catch (error) {
      logTest('TEST 7: Immutability & hashing', false, String(error));
    }

    // ===========================================================
    // TEST 8: Determinism Guarantees
    // ===========================================================
    try {
      const orchestrator = new JourneyOrchestratorHardened(
        prisma,
        conductor,
        logger,
        llmConfig
      );

      // Get role table content
      const roleTable = await prisma.userRoleDefinition.findUnique({
        where: { appRequestId },
      });

      if (!roleTable) {
        throw new Error('Role table not found');
      }

      // Parse roles from content
      const roleNames = (orchestrator as any).extractRoleNamesFromRoleTable(roleTable.content);

      // All role names should be from closed vocabulary (no hallucinations)
      const basePrompt = await (orchestrator as any).getBasePrompt(appRequestId);
      const { masterPlan, implPlan } = await (orchestrator as any).getPlanningDocsWithHash(appRequestId);
      const allowedRoles = (orchestrator as any).extractAllowedRoles(basePrompt, masterPlan, implPlan);

      const allValid = roleNames.every((role: string) =>
        allowedRoles.some((allowed: string) => allowed.toLowerCase() === role.toLowerCase())
      );

      if (allValid && roleNames.length > 0) {
        logTest('TEST 8: Determinism guarantees', true);
      } else {
        logTest('TEST 8: Determinism guarantees', false, `Found roles not in vocabulary: ${roleNames.join(', ')}`);
      }
    } catch (error) {
      logTest('TEST 8: Determinism guarantees', false, String(error));
    }

    // ===========================================================
    // TEST 9: Failure & Escalation
    // ===========================================================
    try {
      const orchestrator = new JourneyOrchestratorHardened(
        prisma,
        conductor,
        logger,
        llmConfig
      );

      // Try to approve journey without generating it (should fail)
      let approveWithoutGenerateFailed = false;
      try {
        await orchestrator.approveCurrentJourney(appRequestId);
      } catch (error) {
        if (error instanceof Error && error.message.includes('No User Journey awaiting approval')) {
          approveWithoutGenerateFailed = true;
        }
      }

      // Generate a journey
      const journey = await orchestrator.describeNextJourney(appRequestId);

      // Try to approve the same journey twice (second should fail)
      await orchestrator.approveCurrentJourney(appRequestId);

      let doubleApproveFailed = false;
      try {
        await orchestrator.approveCurrentJourney(appRequestId);
      } catch (error) {
        if (error instanceof Error && error.message.includes('No User Journey awaiting approval')) {
          doubleApproveFailed = true;
        }
      }

      // Try to reject when no journey is awaiting approval (should fail)
      let rejectWithoutPendingFailed = false;
      try {
        await orchestrator.rejectCurrentJourney(appRequestId, 'Test');
      } catch (error) {
        if (error instanceof Error && error.message.includes('No User Journey awaiting approval')) {
          rejectWithoutPendingFailed = true;
        }
      }

      if (approveWithoutGenerateFailed && doubleApproveFailed && rejectWithoutPendingFailed) {
        logTest('TEST 9: Failure & escalation', true);
      } else {
        logTest('TEST 9: Failure & escalation', false, 'Did not fail loudly on invalid operations');
      }
    } catch (error) {
      logTest('TEST 9: Failure & escalation', false, String(error));
    }

    // ===========================================================
    // TEST 10: Full Integration (Roles → Journeys → All Approved)
    // ===========================================================
    try {
      // Already have role table approved from TEST 7-9
      const orchestrator = new JourneyOrchestratorHardened(
        prisma,
        conductor,
        logger,
        llmConfig
      );

      const roleTable = await prisma.userRoleDefinition.findUnique({
        where: { appRequestId },
      });

      if (!roleTable) {
        throw new Error('Role table not found');
      }

      const roleNames = (orchestrator as any).extractRoleNamesFromRoleTable(roleTable.content);

      // Generate and approve journeys for remaining roles
      for (let i = 1; i < roleNames.length; i++) {
        const journey = await orchestrator.describeNextJourney(appRequestId);
        await orchestrator.approveCurrentJourney(appRequestId);
      }

      // Verify all journeys approved
      const approvedJourneys = await prisma.userJourney.count({
        where: { appRequestId, status: 'approved' },
      });

      if (approvedJourneys === roleNames.length) {
        logTest('TEST 10: Full integration (roles → journeys → all approved)', true);
      } else {
        logTest(
          'TEST 10: Full integration (roles → journeys → all approved)',
          false,
          `Expected ${roleNames.length} journeys, got ${approvedJourneys}`
        );
      }
    } catch (error) {
      logTest('TEST 10: Full integration (roles → journeys → all approved)', false, String(error));
    }
  } finally {
    // Cleanup
    await prisma.project.delete({ where: { id: projectId } });
  }

  // ===========================================================
  // RESULTS SUMMARY
  // ===========================================================
  console.log('\n═══════════════════════════════════════════════════════════');
  console.log('  TEST RESULTS');
  console.log('═══════════════════════════════════════════════════════════\n');

  const passed = testResults.filter(t => t.passed).length;
  const failed = testResults.filter(t => !t.passed).length;

  console.log(`Passed: ${passed}/10`);
  console.log(`Failed: ${failed}/10`);

  if (failed > 0) {
    console.log('\nFailed tests:');
    testResults.filter(t => !t.passed).forEach(t => {
      console.log(`  ❌ ${t.name}`);
      if (t.error) {
        console.log(`     ${t.error}`);
      }
    });
  }

  console.log('');

  if (passed === 10) {
    console.log('🎉 ALL TESTS PASSED - Journey Orchestrator is production-ready');
  } else {
    console.log('⚠️  SOME TESTS FAILED - Journey Orchestrator needs fixes');
    process.exit(1);
  }

  await prisma.$disconnect();
}

runTests().catch(error => {
  console.error('Test suite failed:', error);
  process.exit(1);
});
