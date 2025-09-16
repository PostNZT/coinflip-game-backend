const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

async function testReplayFunctionality() {
  console.log('🧪 Testing Replay Functionality...');

  const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_ANON_KEY
  );

  try {
    // Look for any completed rooms
    const { data: completedRooms } = await supabase
      .from('rooms')
      .select('*')
      .eq('status', 'completed')
      .limit(1);

    if (completedRooms && completedRooms.length > 0) {
      const room = completedRooms[0];
      console.log(`✅ Found completed room: ${room.code} (${room.id})`);

      // Check players in this room
      const { data: players } = await supabase
        .from('players')
        .select('*')
        .eq('room_id', room.id);

      console.log(`👥 Players in room: ${players?.length || 0}`);
      if (players) {
        players.forEach(p => {
          console.log(`   - ${p.name}: ${p.side} (${p.is_creator ? 'creator' : 'joiner'})`);
        });
      }

      console.log('');
      console.log('🎮 To test replay:');
      console.log('1. Connect to WebSocket');
      console.log(`2. Emit: flip_coin with roomId: "${room.id}"`);
      console.log('3. Should see: room_ready → coin_flip_started → coin_flip_result → game_completed');
      console.log('4. Room status should reset from "completed" to "full" then back to "completed"');

    } else {
      console.log('ℹ️  No completed rooms found for testing');
      console.log('💡 Create a game first, complete it, then test replay functionality');
    }

  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

testReplayFunctionality();