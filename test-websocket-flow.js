const io = require('socket.io-client');

// Test the complete WebSocket game flow
async function testWebSocketGameFlow() {
  console.log('🎮 Testing complete WebSocket game flow...\n');

  return new Promise((resolve, reject) => {
    let player1Socket, player2Socket;
    let roomCode;
    let testsPassed = 0;
    const totalTests = 6;

    // Test timeout
    const timeout = setTimeout(() => {
      console.log('❌ Test timed out');
      cleanup();
      reject(new Error('Test timeout'));
    }, 30000);

    function cleanup() {
      clearTimeout(timeout);
      if (player1Socket) player1Socket.close();
      if (player2Socket) player2Socket.close();
    }

    function checkComplete() {
      if (testsPassed >= totalTests) {
        console.log('\n✅ All WebSocket game flow tests passed!');
        cleanup();
        resolve();
      }
    }

    // Player 1 - Create room
    player1Socket = io('http://localhost:8080');

    player1Socket.on('connect', () => {
      console.log('✅ Player 1 connected');
      testsPassed++;
      checkComplete();

      // Create room
      player1Socket.emit('create_room', {
        side: 'heads',
        potAmount: 10
      });
    });

    player1Socket.on('room_created', (data) => {
      console.log('✅ Room created:', data.room.code);
      roomCode = data.room.code;
      testsPassed++;
      checkComplete();

      // Now connect Player 2
      player2Socket = io('http://localhost:8080');

      player2Socket.on('connect', () => {
        console.log('✅ Player 2 connected');
        testsPassed++;
        checkComplete();

        // Join the room
        player2Socket.emit('join_room', {
          code: roomCode
        });
      });

      player2Socket.on('room_joined', (data) => {
        console.log('✅ Player 2 joined room - Side:', data.playerSide);
        testsPassed++;
        checkComplete();
      });

      player2Socket.on('room_ready', (data) => {
        console.log('✅ Room is ready with 2 players');
        testsPassed++;
        checkComplete();

        // Start coin flip
        setTimeout(() => {
          console.log('🪙 Starting coin flip...');
          console.log('Room ID for flip:', data.room.id);
          player1Socket.emit('flip_coin', {
            roomId: data.room.id
          });
        }, 1000);
      });

      // Listen for coin flip results on both players
      player1Socket.on('coin_flip_started', () => {
        console.log('🎲 Coin flip animation started');
      });

      player1Socket.on('coin_flip_result', (data) => {
        console.log('✅ Coin flip result received:');
        console.log(`   - Flip result: ${data.flipResult}`);
        console.log(`   - Winner side: ${data.winnerSide}`);
        console.log(`   - Game ID: ${data.game.id}`);
        console.log(`   - Provably fair hash: ${data.game.hashResult}`);
        testsPassed++;
        checkComplete();
      });

      player2Socket.on('coin_flip_result', (data) => {
        console.log('✅ Player 2 also received coin flip result');
      });

      // Error handlers
      player2Socket.on('error', (error) => {
        console.log('❌ Player 2 error:', error);
        cleanup();
        reject(error);
      });
    });

    player1Socket.on('error', (error) => {
      console.log('❌ Player 1 error:', error);
      cleanup();
      reject(error);
    });

    player1Socket.on('connect_error', (error) => {
      console.log('❌ Player 1 connection error:', error.message);
      cleanup();
      reject(error);
    });
  });
}

// Run the test
testWebSocketGameFlow()
  .then(() => {
    console.log('\n🎉 WebSocket game flow test completed successfully!');
    process.exit(0);
  })
  .catch((error) => {
    console.log('\n💥 WebSocket game flow test failed:', error.message);
    process.exit(1);
  });