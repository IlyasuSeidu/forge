/**
 * FRAMEWORK ASSEMBLY LAYER - NEXT.JS PACK - TEST SUITE
 *
 * Tests for the deterministic manufacturing jig that assembles Forge Implementer
 * output into runnable Next.js applications.
 *
 * Test Categories:
 * 1. Input Validation Tests
 * 2. Determinism Tests
 * 3. File Mounting Tests
 * 4. Route Discovery Tests
 * 5. Integration Tests
 *
 * @version 1.0.0
 * @date 2026-01-14
 */

import {
  FrameworkAssemblyNextJs,
  ForgeImplementerOutput,
  NextJsManifest,
} from './src/assembly/framework-assembly-nextjs';
import { mkdirSync, writeFileSync, existsSync, readFileSync, rmSync } from 'fs';
import { join } from 'path';
import { tmpdir } from 'os';

// ============================================================================
// TEST UTILITIES
// ============================================================================

function createTestWorkspace(name: string): string {
  const workspace = join(tmpdir(), `forge-assembly-test-${name}-${Date.now()}`);
  mkdirSync(workspace, { recursive: true });
  return workspace;
}

function cleanupTestWorkspace(workspace: string): void {
  if (existsSync(workspace)) {
    rmSync(workspace, { recursive: true, force: true });
  }
}

function createTestFile(workspace: string, filePath: string, content: string): void {
  const fullPath = join(workspace, filePath);
  const dir = fullPath.substring(0, fullPath.lastIndexOf('/'));
  mkdirSync(dir, { recursive: true });
  writeFileSync(fullPath, content, 'utf-8');
}

// ============================================================================
// TEST SUITE
// ============================================================================

async function runTests() {
  console.log('🧪 FRAMEWORK ASSEMBLY LAYER - NEXT.JS PACK - TEST SUITE\n');

  let passed = 0;
  let failed = 0;

  // Test 1: Input Validation - Missing Fields
  try {
    console.log('Test 1: Input validation fails when required fields are missing...');
    const assembly = new FrameworkAssemblyNextJs();
    const workspace = createTestWorkspace('test1');

    const invalidInput: any = {
      // Missing appRequestId
      executionLogId: 'log-123',
      executionLogHash: 'hash-123',
      workspaceDir: workspace,
      filesCreated: [],
      timestamp: new Date().toISOString(),
    };

    let threw = false;
    try {
      await assembly.assemble(invalidInput);
    } catch (err: any) {
      threw = true;
      if (!err.message.includes('ASSEMBLY VALIDATION FAILED')) {
        throw new Error('Wrong error message: ' + err.message);
      }
      if (!err.message.includes('Missing appRequestId')) {
        throw new Error('Should mention missing appRequestId');
      }
    }

    cleanupTestWorkspace(workspace);

    if (!threw) {
      throw new Error('Should have thrown validation error');
    }

    console.log('✅ Test 1 PASSED\n');
    passed++;
  } catch (err: any) {
    console.log(`❌ Test 1 FAILED: ${err.message}\n`);
    failed++;
  }

  // Test 2: Input Validation - Workspace Does Not Exist
  try {
    console.log('Test 2: Input validation fails when workspace does not exist...');
    const assembly = new FrameworkAssemblyNextJs();

    const invalidInput: ForgeImplementerOutput = {
      appRequestId: 'app-123',
      executionLogId: 'log-123',
      executionLogHash: 'hash-123',
      workspaceDir: '/nonexistent/workspace',
      filesCreated: [],
      filesModified: [],
      timestamp: new Date().toISOString(),
    };

    let threw = false;
    try {
      await assembly.assemble(invalidInput);
    } catch (err: any) {
      threw = true;
      if (!err.message.includes('Workspace directory does not exist')) {
        throw new Error('Should mention workspace does not exist');
      }
    }

    if (!threw) {
      throw new Error('Should have thrown validation error');
    }

    console.log('✅ Test 2 PASSED\n');
    passed++;
  } catch (err: any) {
    console.log(`❌ Test 2 FAILED: ${err.message}\n`);
    failed++;
  }

  // Test 3: Input Validation - Declared File Does Not Exist
  try {
    console.log('Test 3: Input validation fails when declared file does not exist...');
    const assembly = new FrameworkAssemblyNextJs();
    const workspace = createTestWorkspace('test3');

    const invalidInput: ForgeImplementerOutput = {
      appRequestId: 'app-123',
      executionLogId: 'log-123',
      executionLogHash: 'hash-123',
      workspaceDir: workspace,
      filesCreated: ['nonexistent.ts'],
      filesModified: [],
      timestamp: new Date().toISOString(),
    };

    let threw = false;
    try {
      await assembly.assemble(invalidInput);
    } catch (err: any) {
      threw = true;
      if (!err.message.includes('Declared file does not exist')) {
        throw new Error('Should mention file does not exist');
      }
    }

    cleanupTestWorkspace(workspace);

    if (!threw) {
      throw new Error('Should have thrown validation error');
    }

    console.log('✅ Test 3 PASSED\n');
    passed++;
  } catch (err: any) {
    console.log(`❌ Test 3 FAILED: ${err.message}\n`);
    failed++;
  }

  // Test 4: Determinism - Same Input Produces Same Hash
  try {
    console.log('Test 4: Same input produces same manifest hash (determinism)...');
    const assembly = new FrameworkAssemblyNextJs();
    const workspace1 = createTestWorkspace('test4a');
    const workspace2 = createTestWorkspace('test4b');

    // Create identical files in both workspaces
    createTestFile(workspace1, 'components/Button.tsx', 'export const Button = () => <button>Click</button>');
    createTestFile(workspace2, 'components/Button.tsx', 'export const Button = () => <button>Click</button>');

    const input1: ForgeImplementerOutput = {
      appRequestId: 'app-123',
      executionLogId: 'log-123',
      executionLogHash: 'hash-abc',
      workspaceDir: workspace1,
      filesCreated: ['components/Button.tsx'],
      filesModified: [],
      timestamp: '2026-01-14T00:00:00Z', // Fixed timestamp
    };

    const input2: ForgeImplementerOutput = {
      appRequestId: 'app-123',
      executionLogId: 'log-123',
      executionLogHash: 'hash-abc',
      workspaceDir: workspace2,
      filesCreated: ['components/Button.tsx'],
      filesModified: [],
      timestamp: '2026-01-14T00:00:00Z', // Same timestamp
    };

    const manifest1 = await assembly.assemble(input1);
    const manifest2 = await assembly.assemble(input2);

    cleanupTestWorkspace(workspace1);
    cleanupTestWorkspace(workspace2);
    cleanupTestWorkspace(join(workspace1, 'nextjs-app'));
    cleanupTestWorkspace(join(workspace2, 'nextjs-app'));

    if (manifest1.manifestHash !== manifest2.manifestHash) {
      throw new Error(
        `Hashes differ: ${manifest1.manifestHash} vs ${manifest2.manifestHash}`
      );
    }

    console.log('✅ Test 4 PASSED\n');
    passed++;
  } catch (err: any) {
    console.log(`❌ Test 4 FAILED: ${err.message}\n`);
    failed++;
  }

  // Test 5: Base Scaffold Creation
  try {
    console.log('Test 5: Base scaffold creates all required Next.js files...');
    const assembly = new FrameworkAssemblyNextJs();
    const workspace = createTestWorkspace('test5');

    const input: ForgeImplementerOutput = {
      appRequestId: 'app-123',
      executionLogId: 'log-123',
      executionLogHash: 'hash-123',
      workspaceDir: workspace,
      filesCreated: [],
      filesModified: [],
      timestamp: new Date().toISOString(),
    };

    const manifest = await assembly.assemble(input);
    const outputDir = join(workspace, 'nextjs-app');

    // Check required files exist
    const requiredFiles = [
      'package.json',
      'next.config.js',
      'tsconfig.json',
      '.gitignore',
      'app/layout.tsx',
      'app/page.tsx',
    ];

    for (const file of requiredFiles) {
      const filePath = join(outputDir, file);
      if (!existsSync(filePath)) {
        throw new Error(`Required file missing: ${file}`);
      }
    }

    // Check package.json has correct dependencies
    const packageJson = JSON.parse(
      readFileSync(join(outputDir, 'package.json'), 'utf-8')
    );
    if (!packageJson.dependencies?.next) {
      throw new Error('package.json missing next dependency');
    }
    if (!packageJson.dependencies?.react) {
      throw new Error('package.json missing react dependency');
    }

    cleanupTestWorkspace(workspace);
    cleanupTestWorkspace(outputDir);

    console.log('✅ Test 5 PASSED\n');
    passed++;
  } catch (err: any) {
    console.log(`❌ Test 5 FAILED: ${err.message}\n`);
    failed++;
  }

  // Test 6: File Mounting - Components Directory
  try {
    console.log('Test 6: Files in components/ directory are mounted correctly...');
    const assembly = new FrameworkAssemblyNextJs();
    const workspace = createTestWorkspace('test6');

    createTestFile(
      workspace,
      'components/Header.tsx',
      'export const Header = () => <header>Header</header>'
    );
    createTestFile(
      workspace,
      'components/Footer.tsx',
      'export const Footer = () => <footer>Footer</footer>'
    );

    const input: ForgeImplementerOutput = {
      appRequestId: 'app-123',
      executionLogId: 'log-123',
      executionLogHash: 'hash-123',
      workspaceDir: workspace,
      filesCreated: ['components/Header.tsx', 'components/Footer.tsx'],
      filesModified: [],
      timestamp: new Date().toISOString(),
    };

    const manifest = await assembly.assemble(input);
    const outputDir = join(workspace, 'nextjs-app');

    // Check files are mounted
    if (!existsSync(join(outputDir, 'components/Header.tsx'))) {
      throw new Error('Header.tsx not mounted');
    }
    if (!existsSync(join(outputDir, 'components/Footer.tsx'))) {
      throw new Error('Footer.tsx not mounted');
    }

    // Check mountedFiles metadata
    const headerMount = manifest.mountedFiles.find(f => f.sourcePath === 'components/Header.tsx');
    if (!headerMount) {
      throw new Error('Header.tsx not in mountedFiles');
    }
    if (headerMount.fileType !== 'component') {
      throw new Error('Header.tsx should be type component');
    }
    if (headerMount.determinedBy !== 'RULE_4_COMPONENTS_DIR') {
      throw new Error('Header.tsx should use RULE_4_COMPONENTS_DIR');
    }

    cleanupTestWorkspace(workspace);
    cleanupTestWorkspace(outputDir);

    console.log('✅ Test 6 PASSED\n');
    passed++;
  } catch (err: any) {
    console.log(`❌ Test 6 FAILED: ${err.message}\n`);
    failed++;
  }

  // Test 7: File Mounting - Page Files
  try {
    console.log('Test 7: Page files are mounted to app/ directory...');
    const assembly = new FrameworkAssemblyNextJs();
    const workspace = createTestWorkspace('test7');

    createTestFile(
      workspace,
      'dashboard/page.tsx',
      'export default function Dashboard() { return <div>Dashboard</div> }'
    );

    const input: ForgeImplementerOutput = {
      appRequestId: 'app-123',
      executionLogId: 'log-123',
      executionLogHash: 'hash-123',
      workspaceDir: workspace,
      filesCreated: ['dashboard/page.tsx'],
      filesModified: [],
      timestamp: new Date().toISOString(),
    };

    const manifest = await assembly.assemble(input);
    const outputDir = join(workspace, 'nextjs-app');

    // Check file is mounted to app/dashboard/page.tsx
    if (!existsSync(join(outputDir, 'app/dashboard/page.tsx'))) {
      throw new Error('dashboard/page.tsx not mounted to app/');
    }

    // Check mountedFiles metadata
    const pageMount = manifest.mountedFiles.find(f => f.sourcePath === 'dashboard/page.tsx');
    if (!pageMount) {
      throw new Error('dashboard/page.tsx not in mountedFiles');
    }
    if (pageMount.fileType !== 'page') {
      throw new Error('Should be type page');
    }

    cleanupTestWorkspace(workspace);
    cleanupTestWorkspace(outputDir);

    console.log('✅ Test 7 PASSED\n');
    passed++;
  } catch (err: any) {
    console.log(`❌ Test 7 FAILED: ${err.message}\n`);
    failed++;
  }

  // Test 8: Route Discovery - Pages
  try {
    console.log('Test 8: Route discovery detects page routes correctly...');
    const assembly = new FrameworkAssemblyNextJs();
    const workspace = createTestWorkspace('test8');

    createTestFile(
      workspace,
      'app/about/page.tsx',
      'export default function About() { return <div>About</div> }'
    );
    createTestFile(
      workspace,
      'app/contact/page.tsx',
      'export default function Contact() { return <div>Contact</div> }'
    );

    const input: ForgeImplementerOutput = {
      appRequestId: 'app-123',
      executionLogId: 'log-123',
      executionLogHash: 'hash-123',
      workspaceDir: workspace,
      filesCreated: ['app/about/page.tsx', 'app/contact/page.tsx'],
      filesModified: [],
      timestamp: new Date().toISOString(),
    };

    const manifest = await assembly.assemble(input);

    // Check routes are discovered (plus root route)
    const aboutRoute = manifest.routes.find(r => r.path === '/about');
    const contactRoute = manifest.routes.find(r => r.path === '/contact');

    if (!aboutRoute) {
      throw new Error('/about route not discovered');
    }
    if (!contactRoute) {
      throw new Error('/contact route not discovered');
    }
    if (aboutRoute.routeType !== 'page') {
      throw new Error('/about should be type page');
    }
    if (contactRoute.routeType !== 'page') {
      throw new Error('/contact should be type page');
    }

    cleanupTestWorkspace(workspace);
    cleanupTestWorkspace(join(workspace, 'nextjs-app'));

    console.log('✅ Test 8 PASSED\n');
    passed++;
  } catch (err: any) {
    console.log(`❌ Test 8 FAILED: ${err.message}\n`);
    failed++;
  }

  // Test 9: Route Discovery - API Routes
  try {
    console.log('Test 9: Route discovery detects API routes correctly...');
    const assembly = new FrameworkAssemblyNextJs();
    const workspace = createTestWorkspace('test9');

    createTestFile(
      workspace,
      'api/users/route.ts',
      'export async function GET() { return new Response("users") }'
    );

    const input: ForgeImplementerOutput = {
      appRequestId: 'app-123',
      executionLogId: 'log-123',
      executionLogHash: 'hash-123',
      workspaceDir: workspace,
      filesCreated: ['api/users/route.ts'],
      filesModified: [],
      timestamp: new Date().toISOString(),
    };

    const manifest = await assembly.assemble(input);
    const outputDir = join(workspace, 'nextjs-app');

    // Check file mounted to app/api/users/route.ts
    if (!existsSync(join(outputDir, 'app/api/users/route.ts'))) {
      throw new Error('route.ts not mounted to app/api/');
    }

    // Check route discovered
    const apiRoute = manifest.routes.find(r => r.path === '/api/users');
    if (!apiRoute) {
      throw new Error('/api/users route not discovered');
    }
    if (apiRoute.routeType !== 'api') {
      throw new Error('Should be type api');
    }

    cleanupTestWorkspace(workspace);
    cleanupTestWorkspace(outputDir);

    console.log('✅ Test 9 PASSED\n');
    passed++;
  } catch (err: any) {
    console.log(`❌ Test 9 FAILED: ${err.message}\n`);
    failed++;
  }

  // Test 10: Assembly Validation
  try {
    console.log('Test 10: Assembly validation detects structural issues...');
    const assembly = new FrameworkAssemblyNextJs();
    const workspace = createTestWorkspace('test10');

    const input: ForgeImplementerOutput = {
      appRequestId: 'app-123',
      executionLogId: 'log-123',
      executionLogHash: 'hash-123',
      workspaceDir: workspace,
      filesCreated: [],
      filesModified: [],
      timestamp: new Date().toISOString(),
    };

    const manifest = await assembly.assemble(input);
    const outputDir = join(workspace, 'nextjs-app');

    // Validate should pass
    const result1 = assembly.validateAssembly(outputDir);
    if (!result1.valid) {
      throw new Error('Valid assembly should pass validation');
    }
    if (result1.errors.length > 0) {
      throw new Error('Should have no errors');
    }

    // Delete required file
    rmSync(join(outputDir, 'package.json'));

    // Validate should fail
    const result2 = assembly.validateAssembly(outputDir);
    if (result2.valid) {
      throw new Error('Invalid assembly should fail validation');
    }
    if (!result2.errors.some(e => e.includes('package.json'))) {
      throw new Error('Should report missing package.json');
    }

    cleanupTestWorkspace(workspace);
    cleanupTestWorkspace(outputDir);

    console.log('✅ Test 10 PASSED\n');
    passed++;
  } catch (err: any) {
    console.log(`❌ Test 10 FAILED: ${err.message}\n`);
    failed++;
  }

  // Test 11: Integration - Complex App Assembly
  try {
    console.log('Test 11: Integration test - assemble complex app with multiple file types...');
    const assembly = new FrameworkAssemblyNextJs();
    const workspace = createTestWorkspace('test11');

    // Create realistic file structure
    createTestFile(workspace, 'components/Navbar.tsx', 'export const Navbar = () => <nav>Nav</nav>');
    createTestFile(workspace, 'components/Sidebar.tsx', 'export const Sidebar = () => <aside>Sidebar</aside>');
    createTestFile(workspace, 'lib/utils.ts', 'export const formatDate = (d: Date) => d.toISOString()');
    createTestFile(workspace, 'app/dashboard/page.tsx', 'export default function Dashboard() { return <div>Dashboard</div> }');
    createTestFile(workspace, 'app/dashboard/layout.tsx', 'export default function Layout({children}: any) { return <div>{children}</div> }');
    createTestFile(workspace, 'api/health/route.ts', 'export async function GET() { return new Response("OK") }');
    createTestFile(workspace, 'styles/globals.css', 'body { margin: 0; }');

    const input: ForgeImplementerOutput = {
      appRequestId: 'app-integration',
      executionLogId: 'log-integration',
      executionLogHash: 'hash-integration',
      workspaceDir: workspace,
      filesCreated: [
        'components/Navbar.tsx',
        'components/Sidebar.tsx',
        'lib/utils.ts',
        'app/dashboard/page.tsx',
        'app/dashboard/layout.tsx',
        'api/health/route.ts',
        'styles/globals.css',
      ],
      filesModified: [],
      timestamp: new Date().toISOString(),
    };

    const manifest = await assembly.assemble(input);
    const outputDir = join(workspace, 'nextjs-app');

    // Check all files mounted
    if (manifest.mountedFiles.length !== 7) {
      throw new Error(`Expected 7 mounted files, got ${manifest.mountedFiles.length}`);
    }

    // Check routes discovered (root + dashboard + dashboard layout + api/health)
    if (manifest.routes.length < 4) {
      throw new Error(`Expected at least 4 routes, got ${manifest.routes.length}`);
    }

    // Check validation passes
    const validation = assembly.validateAssembly(outputDir);
    if (!validation.valid) {
      throw new Error(`Assembly validation failed: ${validation.errors.join(', ')}`);
    }

    // Check manifest has all required fields
    if (!manifest.manifestId) throw new Error('Missing manifestId');
    if (!manifest.manifestHash) throw new Error('Missing manifestHash');
    if (!manifest.executionLogHash) throw new Error('Missing executionLogHash');
    if (manifest.frameworkVersion !== '14.2.0') throw new Error('Wrong framework version');
    if (manifest.frameworkType !== 'nextjs-app-router') throw new Error('Wrong framework type');

    cleanupTestWorkspace(workspace);
    cleanupTestWorkspace(outputDir);

    console.log('✅ Test 11 PASSED\n');
    passed++;
  } catch (err: any) {
    console.log(`❌ Test 11 FAILED: ${err.message}\n`);
    failed++;
  }

  // Test 12: Manifest Hash Chain Reference
  try {
    console.log('Test 12: Manifest preserves executionLogHash for hash chain...');
    const assembly = new FrameworkAssemblyNextJs();
    const workspace = createTestWorkspace('test12');

    const executionLogHash = 'abc123def456';

    const input: ForgeImplementerOutput = {
      appRequestId: 'app-123',
      executionLogId: 'log-123',
      executionLogHash,
      workspaceDir: workspace,
      filesCreated: [],
      filesModified: [],
      timestamp: new Date().toISOString(),
    };

    const manifest = await assembly.assemble(input);

    if (manifest.executionLogHash !== executionLogHash) {
      throw new Error('Manifest should preserve executionLogHash');
    }

    cleanupTestWorkspace(workspace);
    cleanupTestWorkspace(join(workspace, 'nextjs-app'));

    console.log('✅ Test 12 PASSED\n');
    passed++;
  } catch (err: any) {
    console.log(`❌ Test 12 FAILED: ${err.message}\n`);
    failed++;
  }

  // ========================================================================
  // FINAL REPORT
  // ========================================================================

  console.log('='.repeat(70));
  console.log('FRAMEWORK ASSEMBLY LAYER - NEXT.JS PACK - TEST RESULTS');
  console.log('='.repeat(70));
  console.log(`Total Tests: ${passed + failed}`);
  console.log(`Passed: ${passed}`);
  console.log(`Failed: ${failed}`);
  console.log('='.repeat(70));

  if (failed === 0) {
    console.log('✅ ALL TESTS PASSED - FRAMEWORK ASSEMBLY LAYER IS READY\n');
    process.exit(0);
  } else {
    console.log('❌ SOME TESTS FAILED - REVIEW FAILURES ABOVE\n');
    process.exit(1);
  }
}

// Run tests
runTests().catch(err => {
  console.error('Fatal error running tests:', err);
  process.exit(1);
});
