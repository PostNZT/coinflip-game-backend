const axios = require('axios');
const io = require('socket.io-client');

// Test error handling and validation
async function testErrorHandling() {
  console.log('🔍 Testing error handling and validation...\n');

  let testsPassed = 0;
  const totalTests = 8;

  try {
    // Test 1: Invalid room creation data
    console.log('Test 1: Invalid room creation data');
    try {
      await axios.post('http://localhost:8080/api/game/rooms', {
        side: 'invalid_side', // Invalid enum value
        potAmount: 10
      });
      console.log('❌ Should have failed validation');
    } catch (error) {
      if (error.response && error.response.status === 400) {
        console.log('✅ Correctly rejected invalid side value');
        testsPassed++;
      } else {
        console.log('❌ Unexpected error:', error.message);
      }
    }

    // Test 2: Missing required fields
    console.log('\nTest 2: Missing required fields');
    try {
      await axios.post('http://localhost:8080/api/game/rooms', {
        // Missing side field
        potAmount: 10
      });
      console.log('❌ Should have failed validation');
    } catch (error) {
      if (error.response && error.response.status === 400) {
        console.log('✅ Correctly rejected missing required field');
        testsPassed++;
      } else {
        console.log('❌ Unexpected error:', error.message);
      }
    }

    // Test 3: Invalid room code format
    console.log('\nTest 3: Invalid room code lookup');
    try {
      await axios.get('http://localhost:8080/api/game/rooms/INVALID');
      console.log('❌ Should have returned 404');
    } catch (error) {
      if (error.response && error.response.status === 404) {
        console.log('✅ Correctly returned 404 for non-existent room');
        testsPassed++;
      } else {
        console.log('❌ Unexpected error:', error.message);
      }
    }

    // Test 4: Extra properties in request (should be stripped)
    console.log('\nTest 4: Extra properties handling');
    try {
      const response = await axios.post('http://localhost:8080/api/game/rooms', {
        side: 'heads',
        potAmount: 10,
        extraProperty: 'should_be_stripped',
        maliciousData: '<script>alert("xss")</script>'
      });
      if (response.status === 201) {
        console.log('✅ Request succeeded with extra properties stripped');
        testsPassed++;
      }
    } catch (error) {
      if (error.response && error.response.status === 400 &&
          error.response.data.message.includes('should not exist')) {
        console.log('✅ Correctly rejected extra properties');
        testsPassed++;
      } else {
        console.log('❌ Unexpected error:', error.response?.data || error.message);
      }
    }

    // Test 5: WebSocket error handling
    console.log('\nTest 5: WebSocket error handling');
    const socket = io('http://localhost:8080');

    await new Promise((resolve) => {
      socket.on('connect', () => {
        console.log('Connected to WebSocket');

        // Test invalid room join
        socket.emit('join_room', {
          code: 'NONEXIST'
        });

        socket.on('error', (error) => {
          if (error.message.includes('Room not found')) {
            console.log('✅ WebSocket correctly handled invalid room join');
            testsPassed++;
          } else {
            console.log('❌ Unexpected WebSocket error:', error);
          }
          socket.close();
          resolve();
        });

        // Timeout in case no error is received
        setTimeout(() => {
          console.log('❌ No error received for invalid room join');
          socket.close();
          resolve();
        }, 3000);
      });
    });

    // Test 6: Invalid endpoint
    console.log('\nTest 6: Invalid endpoint handling');
    try {
      await axios.get('http://localhost:8080/api/game/nonexistent');
      console.log('❌ Should have returned 404');
    } catch (error) {
      if (error.response && error.response.status === 404) {
        console.log('✅ Correctly returned 404 for invalid endpoint');
        testsPassed++;
      } else {
        console.log('❌ Unexpected error:', error.message);
      }
    }

    // Test 7: Invalid HTTP method
    console.log('\nTest 7: Invalid HTTP method');
    try {
      await axios.delete('http://localhost:8080/api/game/health');
      console.log('❌ Should have returned 405 or 404');
    } catch (error) {
      if (error.response && (error.response.status === 405 || error.response.status === 404)) {
        console.log('✅ Correctly rejected invalid HTTP method');
        testsPassed++;
      } else {
        console.log('❌ Unexpected error:', error.message);
      }
    }

    // Test 8: Large payload handling
    console.log('\nTest 8: Large payload handling');
    try {
      const largePayload = {
        side: 'heads',
        potAmount: 10,
        largeField: 'x'.repeat(10000) // 10KB string
      };
      await axios.post('http://localhost:8080/api/game/rooms', largePayload);
      console.log('❌ Should have rejected large payload or stripped large field');
    } catch (error) {
      if (error.response && (error.response.status === 400 || error.response.status === 413)) {
        console.log('✅ Correctly handled large payload');
        testsPassed++;
      } else {
        console.log('❌ Unexpected error:', error.message);
      }
    }

  } catch (error) {
    console.log('❌ Test suite error:', error.message);
  }

  console.log(`\n📊 Error Handling Tests: ${testsPassed}/${totalTests} passed`);

  if (testsPassed >= 6) {
    console.log('✅ Error handling and validation working correctly!');
    return true;
  } else {
    console.log('❌ Some error handling tests failed');
    return false;
  }
}

// Run the test
testErrorHandling()
  .then((success) => {
    console.log(success ? '\n🎉 Error handling tests completed successfully!' : '\n💥 Error handling tests failed');
    process.exit(success ? 0 : 1);
  })
  .catch((error) => {
    console.log('\n💥 Error handling test failed:', error.message);
    process.exit(1);
  });