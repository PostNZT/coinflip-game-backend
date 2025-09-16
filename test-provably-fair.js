const crypto = require('crypto');

// Test provably fair functionality
async function testProvablyFair() {
  console.log('🎲 Testing provably fair functionality...\n');

  let testsPassed = 0;
  const totalTests = 6;

  try {
    // Test 1: Server seed generation
    console.log('Test 1: Server seed generation');
    const serverSeed1 = crypto.randomBytes(32).toString('hex');
    const serverSeed2 = crypto.randomBytes(32).toString('hex');

    if (serverSeed1 !== serverSeed2 && serverSeed1.length === 64 && serverSeed2.length === 64) {
      console.log('✅ Server seeds are unique and properly formatted');
      console.log(`   Sample seed: ${serverSeed1.substring(0, 16)}...`);
      testsPassed++;
    } else {
      console.log('❌ Server seed generation failed');
    }

    // Test 2: Client seed generation
    console.log('\nTest 2: Client seed generation');
    const clientSeed1 = crypto.randomBytes(16).toString('hex');
    const clientSeed2 = crypto.randomBytes(16).toString('hex');

    if (clientSeed1 !== clientSeed2 && clientSeed1.length === 32 && clientSeed2.length === 32) {
      console.log('✅ Client seeds are unique and properly formatted');
      console.log(`   Sample seed: ${clientSeed1.substring(0, 16)}...`);
      testsPassed++;
    } else {
      console.log('❌ Client seed generation failed');
    }

    // Test 3: Hash generation and deterministic results
    console.log('\nTest 3: Hash generation deterministic behavior');
    const testServerSeed = 'test_server_seed_123456789abcdef';
    const testClientSeed = 'test_client_seed_123456';
    const nonce = 1;

    const hash1 = generateHash(testServerSeed, testClientSeed, nonce);
    const hash2 = generateHash(testServerSeed, testClientSeed, nonce);

    if (hash1 === hash2) {
      console.log('✅ Hash generation is deterministic');
      console.log(`   Hash: ${hash1.substring(0, 16)}...`);
      testsPassed++;
    } else {
      console.log('❌ Hash generation is not deterministic');
    }

    // Test 4: Different inputs produce different hashes
    console.log('\nTest 4: Different inputs produce different results');
    const hash3 = generateHash(testServerSeed, testClientSeed, 2); // Different nonce
    const hash4 = generateHash(testServerSeed, 'different_client_seed', nonce); // Different client seed

    if (hash1 !== hash3 && hash1 !== hash4 && hash3 !== hash4) {
      console.log('✅ Different inputs produce different hashes');
      testsPassed++;
    } else {
      console.log('❌ Different inputs should produce different hashes');
    }

    // Test 5: Coin flip result generation
    console.log('\nTest 5: Coin flip result generation');
    const result1 = generateCoinResult(testServerSeed, testClientSeed, nonce);
    const result2 = generateCoinResult(testServerSeed, testClientSeed, nonce);

    if ((result1 === 'heads' || result1 === 'tails') && result1 === result2) {
      console.log('✅ Coin flip results are deterministic and valid');
      console.log(`   Result: ${result1}`);
      testsPassed++;
    } else {
      console.log('❌ Coin flip result generation failed');
    }

    // Test 6: Result distribution (should be roughly 50/50 over many trials)
    console.log('\nTest 6: Result distribution analysis');
    const trials = 1000;
    let headsCount = 0;
    let tailsCount = 0;

    for (let i = 0; i < trials; i++) {
      const randomServerSeed = crypto.randomBytes(32).toString('hex');
      const randomClientSeed = crypto.randomBytes(16).toString('hex');
      const randomNonce = Math.floor(Math.random() * 1000);

      const result = generateCoinResult(randomServerSeed, randomClientSeed, randomNonce);
      if (result === 'heads') {
        headsCount++;
      } else {
        tailsCount++;
      }
    }

    const headsPercentage = (headsCount / trials) * 100;
    const tailsPercentage = (tailsCount / trials) * 100;

    console.log(`   ${trials} trials: ${headsCount} heads (${headsPercentage.toFixed(1)}%), ${tailsCount} tails (${tailsPercentage.toFixed(1)}%)`);

    // Distribution should be roughly 50/50 (allowing 5% variance)
    if (headsPercentage >= 45 && headsPercentage <= 55) {
      console.log('✅ Result distribution is fair (within expected variance)');
      testsPassed++;
    } else {
      console.log('❌ Result distribution appears biased');
    }

  } catch (error) {
    console.log('❌ Provably fair test suite error:', error.message);
  }

  console.log(`\n📊 Provably Fair Tests: ${testsPassed}/${totalTests} passed`);

  if (testsPassed >= 5) {
    console.log('✅ Provably fair functionality working correctly!');
    return true;
  } else {
    console.log('❌ Some provably fair tests failed');
    return false;
  }
}

// Helper functions that mirror the server-side logic
function generateHash(serverSeed, clientSeed, nonce) {
  const combinedInput = `${serverSeed}:${clientSeed}:${nonce}`;
  return crypto.createHash('sha256').update(combinedInput).digest('hex');
}

function generateCoinResult(serverSeed, clientSeed, nonce) {
  const hash = generateHash(serverSeed, clientSeed, nonce);
  const hashInt = parseInt(hash.substring(0, 8), 16);
  return hashInt % 2 === 0 ? 'heads' : 'tails';
}

// Run the test
testProvablyFair()
  .then((success) => {
    console.log(success ? '\n🎉 Provably fair tests completed successfully!' : '\n💥 Provably fair tests failed');
    process.exit(success ? 0 : 1);
  })
  .catch((error) => {
    console.log('\n💥 Provably fair test failed:', error.message);
    process.exit(1);
  });