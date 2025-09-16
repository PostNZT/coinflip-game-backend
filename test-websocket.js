const io = require('socket.io-client');

console.log('🚀 Starting WebSocket tests...');

// Create two socket connections to simulate two players
const player1 = io('http://localhost:8080');
const player2 = io('http://localhost:8080');

let roomCode = '';
let roomId = '';

// Player 1 events
player1.on('connect', () => {
  console.log('✅ Player 1 connected:', player1.id);

  // Create room after connection
  setTimeout(() => {
    console.log('🎯 Player 1 creating room...');
    player1.emit('create_room', { side: 'heads' });
  }, 500);
});

player1.on('room_created', (data) => {
  console.log('🏠 Room created:', data);
  console.log('👤 Player 1 (Creator) - Side:', data.playerSide, '| Room Creator Side:', data.room.creator_side);
  roomCode = data.room.code;
  roomId = data.room.id;

  // Player 2 joins after room is created
  setTimeout(() => {
    console.log('🎯 Player 2 joining room...');
    player2.emit('join_room', { code: roomCode });
  }, 500);
});

player1.on('room_ready', (data) => {
  console.log('✅ Room ready (Player 1):', data);

  // Start coin flip after room is ready
  setTimeout(() => {
    console.log('🪙 Starting coin flip...');
    player1.emit('flip_coin', { roomId: roomId });
  }, 1000);
});

player1.on('coin_flip_started', () => {
  console.log('🎲 Coin flip started! (Player 1)');
});

player1.on('coin_flip_result', (data) => {
  console.log('🎉 Coin flip result (Player 1):', {
    result: data.flipResult,
    winner: data.winnerSide,
    winnerPlayer: data.winnerPlayer?.side,
    totalPot: data.totalPot,
    verification: data.verification
  });

  // Cleanup and exit
  setTimeout(() => {
    console.log('✅ WebSocket tests completed successfully!');
    process.exit(0);
  }, 1000);
});

player1.on('error', (error) => {
  console.error('❌ Player 1 error:', error);
});

// Player 2 events
player2.on('connect', () => {
  console.log('✅ Player 2 connected:', player2.id);
});

player2.on('room_joined', (data) => {
  console.log('🏠 Player 2 joined room:', data);
  console.log('👤 Player 2 (Joiner) - Side:', data.playerSide, '| Room Creator Side:', data.room.creator_side);

  // Validation check
  const expectedJoinerSide = data.room.creator_side === 'heads' ? 'tails' : 'heads';
  if (data.playerSide === expectedJoinerSide) {
    console.log('✅ CORRECT: Player sides are properly assigned (1v1 heads/tails)');
  } else {
    console.log('❌ ERROR: Both players have the same side!');
    console.log(`   Creator has: ${data.room.creator_side}`);
    console.log(`   Joiner has: ${data.playerSide}`);
    console.log(`   Expected joiner side: ${expectedJoinerSide}`);
  }

  // Check all players in room
  if (data.players && data.players.length >= 2) {
    console.log('👥 All players in room:');
    data.players.forEach((player, index) => {
      console.log(`   Player ${index + 1}: ${player.side} (${player.is_creator ? 'Creator' : 'Joiner'})`);
    });
  }
});

player2.on('room_ready', (data) => {
  console.log('✅ Room ready (Player 2):', data);
});

player2.on('coin_flip_started', () => {
  console.log('🎲 Coin flip started! (Player 2)');
});

player2.on('coin_flip_result', (data) => {
  console.log('🎉 Coin flip result (Player 2):', {
    result: data.flipResult,
    winner: data.winnerSide,
    winnerPlayer: data.winnerPlayer?.side,
    totalPot: data.totalPot
  });
});

player2.on('error', (error) => {
  console.error('❌ Player 2 error:', error);
});

// Timeout safety
setTimeout(() => {
  console.log('⏰ Test timeout - exiting');
  process.exit(1);
}, 15000);