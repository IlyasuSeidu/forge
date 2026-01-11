import { RuntimeVerifier } from './src/services/runtime-verifier.js';
import pino from 'pino';

const logger = pino({ level: 'info' });
const verifier = new RuntimeVerifier(logger);

async function runTests() {
  console.log('\n========================================');
  console.log('RUNTIME VERIFICATION TESTS');
  console.log('========================================\n');

  // Test 1: App with JS error on load (should FAIL)
  console.log('TEST 1: App with JS error on load');
  console.log('Expected: FAIL (uncaught exception)');
  console.log('----------------------------------------');

  const test1Result = await verifier.verify('/tmp/test-runtime-verification/test1-load-error');

  console.log('Result:', test1Result.passed ? '✓ PASSED' : '✗ FAILED');
  console.log('Errors:', test1Result.errors.length);
  if (test1Result.errors.length > 0) {
    test1Result.errors.forEach((err, i) => console.log(`  ${i + 1}. ${err}`));
  }

  console.log('\n========================================\n');

  // Test 2: App with button that crashes on click (should FAIL)
  console.log('TEST 2: App with button that crashes on click');
  console.log('Expected: FAIL (error on button click)');
  console.log('----------------------------------------');

  const test2Result = await verifier.verify('/tmp/test-runtime-verification/test2-button-crash');

  console.log('Result:', test2Result.passed ? '✓ PASSED' : '✗ FAILED');
  console.log('Errors:', test2Result.errors.length);
  if (test2Result.errors.length > 0) {
    test2Result.errors.forEach((err, i) => console.log(`  ${i + 1}. ${err}`));
  }

  console.log('\n========================================\n');

  // Test 3: Working simple app (should PASS)
  console.log('TEST 3: Working simple app');
  console.log('Expected: PASS (no errors)');
  console.log('----------------------------------------');

  const test3Result = await verifier.verify('/tmp/test-runtime-verification/test3-working-app');

  console.log('Result:', test3Result.passed ? '✓ PASSED' : '✗ FAILED');
  console.log('Errors:', test3Result.errors.length);
  if (test3Result.errors.length > 0) {
    test3Result.errors.forEach((err, i) => console.log(`  ${i + 1}. ${err}`));
  }

  console.log('\n========================================\n');

  // Summary
  console.log('TEST SUMMARY:');
  console.log(`Test 1 (Load Error):    ${test1Result.passed ? '✓ PASS (unexpected)' : '✗ FAIL (expected)'}`);
  console.log(`Test 2 (Button Crash):  ${test2Result.passed ? '✓ PASS (unexpected)' : '✗ FAIL (expected)'}`);
  console.log(`Test 3 (Working App):   ${test3Result.passed ? '✓ PASS (expected)' : '✗ FAIL (unexpected)'}`);

  console.log('\n========================================\n');

  // Validation
  const allTestsPassed =
    !test1Result.passed && // Should fail
    !test2Result.passed && // Should fail
    test3Result.passed;     // Should pass

  if (allTestsPassed) {
    console.log('✅ All tests passed as expected!');
    console.log('Runtime verification is working correctly.');
  } else {
    console.log('❌ Some tests did not pass as expected!');
    console.log('Runtime verification may have issues.');
  }

  console.log('\n========================================\n');
}

runTests().catch(console.error);
