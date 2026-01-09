import { WorkspaceService, PathValidationError } from './apps/server/src/services/workspace-service.js';
import pino from 'pino';

const logger = pino({ level: 'silent' }); // Silent for test output
const projectId = 'test-security-project';
const workspace = new WorkspaceService(logger, projectId);

async function testPathValidation() {
  console.log('🔒 Testing workspace path validation and security...\n');

  const dangerousPaths = [
    '../../../etc/passwd',
    '../../etc/passwd',
    '../etc/passwd',
    '/etc/passwd',
    '/tmp/outside-workspace',
    'valid-dir/../../etc/passwd',
    './../../etc/passwd',
    'ok/../../../etc/passwd',
  ];

  let blocked = 0;
  let failed = 0;

  for (const path of dangerousPaths) {
    try {
      await workspace.writeFile(path, 'malicious content');
      console.log(`❌ SECURITY FAIL: Path "${path}" was NOT blocked!`);
      failed++;
    } catch (error) {
      if (error instanceof PathValidationError) {
        console.log(`✅ BLOCKED: "${path}"`);
        blocked++;
      } else {
        console.log(`⚠️  UNEXPECTED ERROR for "${path}":`, error);
        failed++;
      }
    }
  }

  console.log(`\n📊 Results:`);
  console.log(`   Blocked: ${blocked}/${dangerousPaths.length}`);
  console.log(`   Failed: ${failed}/${dangerousPaths.length}`);

  if (failed === 0 && blocked === dangerousPaths.length) {
    console.log('\n✅ All security tests passed!');
    return true;
  } else {
    console.log('\n❌ Security vulnerabilities detected!');
    return false;
  }
}

// Test valid paths work correctly
async function testValidPaths() {
  console.log('\n📁 Testing valid path operations...\n');

  await workspace.initialize();

  try {
    // Test directory creation
    await workspace.createDirectory('valid-dir');
    console.log('✅ Created directory: valid-dir');

    // Test file creation
    await workspace.writeFile('valid-dir/test.txt', 'Hello, World!');
    console.log('✅ Created file: valid-dir/test.txt');

    // Test file reading
    const content = await workspace.readFile('valid-dir/test.txt');
    if (content === 'Hello, World!') {
      console.log('✅ Read file correctly: content matches');
    } else {
      console.log('❌ File content mismatch');
    }

    // Test nested paths
    await workspace.writeFile('valid-dir/nested/deep/file.json', '{"test": true}');
    console.log('✅ Created nested file: valid-dir/nested/deep/file.json');

    console.log('\n✅ All valid path operations succeeded!');
    return true;
  } catch (error) {
    console.log('❌ Valid path operation failed:', error);
    return false;
  }
}

// Run tests
(async () => {
  const securityPassed = await testPathValidation();
  const validPathsPassed = await testValidPaths();

  console.log('\n' + '='.repeat(50));
  if (securityPassed && validPathsPassed) {
    console.log('🎉 All workspace tests passed!');
    process.exit(0);
  } else {
    console.log('💥 Some tests failed!');
    process.exit(1);
  }
})();
