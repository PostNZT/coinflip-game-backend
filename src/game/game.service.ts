import { Injectable, Logger } from '@nestjs/common';
import { SupabaseService } from '../database/supabase.service';
import { ProvablyFairService } from './provably-fair.service';
import { Room, Player, Game, CoinSide, CreateRoomDto, JoinRoomDto } from '../types/game.types';
import {
  RoomNotFoundException,
  RoomFullException,
  InvalidGameStateException,
  DatabaseException,
} from '../common/exceptions/game.exceptions';

/**
 * Service responsible for managing 1v1 coinflip game logic
 * Handles room creation, player joining, and game execution with provably fair mechanics
 */
@Injectable()
export class GameService {
  private readonly logger = new Logger(GameService.name);
  private readonly FIXED_STAKE = 10.00; // Fixed $10 stake per player
  private readonly TOTAL_POT = 20.00; // $20 total pot for 1v1 games

  constructor(
    private readonly supabaseService: SupabaseService,
    private readonly provablyFairService: ProvablyFairService,
  ) {}

  /**
   * Format player data for WebSocket events
   * Ensures all required fields are included for frontend compatibility
   */
  private formatPlayerForWebSocket(player: Player): Player {
    return {
      id: player.id,
      room_id: player.room_id,
      socket_id: player.socket_id,
      name: player.name || `Player ${player.socket_id.substring(0, 4)}`,
      side: player.side,
      is_creator: player.is_creator,
      stake_amount: player.stake_amount,
      has_paid: player.has_paid,
      joined_at: player.joined_at,
    };
  }

  /**
   * Generate a unique 6-character room code
   * Uses alphanumeric characters (A-Z, 0-9) for easy sharing
   */
  private generateRoomCode(): string {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let result = '';
    for (let i = 0; i < 6; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
  }

  /**
   * Create a new 1v1 coinflip game room
   * @param createRoomDto - Room creation parameters (side selection)
   * @param socketId - Creator's WebSocket connection ID
   * @returns Created room with provably fair server seed
   */
  async createRoom(createRoomDto: CreateRoomDto, socketId: string): Promise<Room> {
    const playerName = createRoomDto.playerName || `Player ${socketId.substring(0, 4)}`;
    this.logger.log(`Creating room for socket ${socketId} (${playerName}) with side ${createRoomDto.side}`);

    try {
      const supabase = this.supabaseService.getClient();
      let roomCode: string;
      let codeExists = true;
      let attempts = 0;
      const maxAttempts = 10;

      // Generate unique room code with collision detection
      do {
        if (attempts >= maxAttempts) {
          throw new DatabaseException('room creation', 'Unable to generate unique room code');
        }

        roomCode = this.generateRoomCode();
        const { data } = await supabase
          .from('rooms')
          .select('code')
          .eq('code', roomCode)
          .single();
        codeExists = !!data;
        attempts++;
      } while (codeExists);

      // Generate server seed for provably fair gambling
      const serverSeed = this.provablyFairService.generateServerSeed();

      // Create room with fixed stakes and waiting status
      const { data: room, error: roomError } = await supabase
        .from('rooms')
        .insert({
          code: roomCode,
          creator_side: createRoomDto.side,
          stake_amount: this.FIXED_STAKE,
          total_pot: this.TOTAL_POT,
          status: 'waiting',
          server_seed: serverSeed,
          nonce: 0,
        })
        .select()
        .single();

      if (roomError) {
        this.logger.error(`Database error creating room: ${roomError.message}`);
        throw new DatabaseException('room creation', roomError.message);
      }

      // Add creator as first player
      const { error: playerError } = await supabase
        .from('players')
        .insert({
          room_id: room.id,
          socket_id: socketId,
          name: playerName,
          side: createRoomDto.side,
          is_creator: true,
          stake_amount: this.FIXED_STAKE,
          has_paid: true, // Payment validation handled by frontend/payment system
        });

      if (playerError) {
        this.logger.error(`Database error adding creator to room: ${playerError.message}`);
        // Cleanup: delete room if player creation failed
        await supabase.from('rooms').delete().eq('id', room.id);
        throw new DatabaseException('player creation', playerError.message);
      }

      this.logger.log(`Room ${roomCode} created successfully with ID ${room.id} - Creator side: ${createRoomDto.side}`);
      return room;
    } catch (error) {
      this.logger.error(`Failed to create room: ${error.message}`);
      if (error instanceof DatabaseException) {
        throw error;
      }
      throw new DatabaseException('room creation', error.message);
    }
  }

  async joinRoom(joinRoomDto: JoinRoomDto, socketId: string): Promise<{ room: Room; player: Player }> {
    const playerName = joinRoomDto.playerName || `Player ${socketId.substring(0, 4)}`;
    const supabase = this.supabaseService.getClient();

    // Find room by code
    const { data: room, error: roomError } = await supabase
      .from('rooms')
      .select('*')
      .eq('code', joinRoomDto.code)
      .eq('status', 'waiting')
      .single();

    if (roomError || !room) {
      throw new Error('Room not found or not available');
    }

    // Check if room is full
    const { data: existingPlayers } = await supabase
      .from('players')
      .select('*')
      .eq('room_id', room.id);

    if (existingPlayers && existingPlayers.length >= 2) {
      throw new RoomFullException(joinRoomDto.code);
    }

    // Determine player side (opposite of creator)
    const playerSide: CoinSide = room.creator_side === 'heads' ? 'tails' : 'heads';

    // Validation: Ensure players have opposite sides
    if (playerSide === room.creator_side) {
      this.logger.error(`CRITICAL ERROR: Room ${room.code} - Both players have same side! Creator: ${room.creator_side}, Joiner: ${playerSide}`);
      throw new InvalidGameStateException(
        `Both players have side "${playerSide}"`,
        'Players must have opposite sides'
      );
    }

    this.logger.log(`Room ${room.code}: Creator side is "${room.creator_side}", assigning joining player "${playerName}" side "${playerSide}"`);
    this.logger.log(`✅ Validation passed: Creator="${room.creator_side}" vs Joiner="${playerName}"="${playerSide}" (opposite sides confirmed)`);

    // Generate client seed for joining player
    const clientSeed = this.provablyFairService.generateClientSeed();

    // Add player to room
    const { data: player, error: playerError } = await supabase
      .from('players')
      .insert({
        room_id: room.id,
        socket_id: socketId,
        name: playerName,
        side: playerSide,
        is_creator: false,
        stake_amount: this.FIXED_STAKE,
        has_paid: true, // Assume payment is handled externally
      })
      .select()
      .single();

    if (playerError) {
      throw new Error(`Failed to join room: ${playerError.message}`);
    }

    // Update room with client seed and status
    const { error: updateError } = await supabase
      .from('rooms')
      .update({
        status: 'full',
        client_seed: clientSeed
      })
      .eq('id', room.id);

    if (updateError) {
      throw new Error(`Failed to update room status: ${updateError.message}`);
    }

    return {
      room: { ...room, status: 'full', client_seed: clientSeed },
      player
    };
  }

  /**
   * Reset a completed room for replay
   * Allows same players to play again with new nonce
   */
  async resetRoomForReplay(roomId: string): Promise<void> {
    const supabase = this.supabaseService.getClient();

    this.logger.log(`Resetting room ${roomId} for replay`);

    // Reset room status to 'full' and increment nonce
    const { error: resetError } = await supabase
      .from('rooms')
      .update({
        status: 'full', // Reset from 'completed' to 'full'
        // Keep same server_seed and client_seed - just increment nonce for fairness
      })
      .eq('id', roomId);

    if (resetError) {
      throw new Error(`Failed to reset room for replay: ${resetError.message}`);
    }

    this.logger.log(`✅ Room ${roomId} reset for replay - status changed to 'full'`);
  }

  async flipCoin(roomId: string): Promise<{
    result: CoinSide;
    winner: CoinSide;
    game: Game;
    verification: any;
    winnerPlayer: Player;
  }> {
    const supabase = this.supabaseService.getClient();

    // Verify room exists and is full OR completed (for replay)
    const { data: room, error: roomError } = await supabase
      .from('rooms')
      .select('*')
      .eq('id', roomId)
      .in('status', ['full', 'completed']) // Allow both states
      .single();

    if (roomError || !room) {
      throw new Error('Room not found or not ready for game');
    }

    // If room is completed, reset it for replay
    if (room.status === 'completed') {
      this.logger.log(`Room ${roomId} is completed - resetting for replay`);
      await this.resetRoomForReplay(roomId);

      // Fetch updated room data
      const { data: updatedRoom } = await supabase
        .from('rooms')
        .select('*')
        .eq('id', roomId)
        .single();

      if (updatedRoom) {
        Object.assign(room, updatedRoom);
      }
    }

    if (!room.client_seed) {
      throw new Error('Client seed not set - room not ready for play');
    }

    // Increment nonce for this flip
    const newNonce = room.nonce + 1;

    // Generate provably fair result
    const fairResult = this.provablyFairService.generateResult(
      room.server_seed,
      room.client_seed,
      newNonce
    );

    // Get players to determine winner
    const { data: players } = await supabase
      .from('players')
      .select('*')
      .eq('room_id', roomId);

    if (!players || players.length !== 2) {
      throw new Error('Invalid player count for game');
    }

    // Find winner player
    const winnerPlayer = players.find(p => p.side === fairResult.result);
    if (!winnerPlayer) {
      throw new Error('Unable to determine winner');
    }

    // Create game record with provably fair data
    const { data: game, error: gameError } = await supabase
      .from('games')
      .insert({
        room_id: roomId,
        flip_result: fairResult.result,
        winner_side: fairResult.result,
        winner_player_id: winnerPlayer.id,
        total_pot: room.total_pot,
        server_seed: room.server_seed,
        client_seed: room.client_seed,
        nonce: newNonce,
        hash_result: fairResult.hash,
        is_verified: true,
        completed_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (gameError) {
      throw new Error(`Failed to create game: ${gameError.message}`);
    }

    // Update room status and nonce
    await supabase
      .from('rooms')
      .update({
        status: 'completed',
        nonce: newNonce
      })
      .eq('id', roomId);

    // Create verification data
    const verification = this.provablyFairService.createVerificationData(
      room.server_seed,
      room.client_seed,
      newNonce
    );

    return {
      result: fairResult.result,
      winner: fairResult.result,
      game,
      verification,
      winnerPlayer,
    };
  }

  async getRoomByCode(code: string): Promise<Room | null> {
    const supabase = this.supabaseService.getClient();
    const { data: room } = await supabase
      .from('rooms')
      .select('*')
      .eq('code', code)
      .single();

    return room;
  }

  async getPlayersInRoom(roomId: string): Promise<Player[]> {
    const supabase = this.supabaseService.getClient();
    const { data: players } = await supabase
      .from('players')
      .select('*')
      .eq('room_id', roomId)
      .order('joined_at', { ascending: true }); // Creator first

    return (players || []).map(player => this.formatPlayerForWebSocket(player));
  }

  /**
   * Get complete room data with formatted players
   * Used for WebSocket events to ensure consistency
   */
  async getRoomWithPlayers(roomId: string): Promise<{ room: Room; players: Player[] }> {
    const supabase = this.supabaseService.getClient();

    const { data: room } = await supabase
      .from('rooms')
      .select('*')
      .eq('id', roomId)
      .single();

    const players = await this.getPlayersInRoom(roomId);

    return { room, players };
  }

  /**
   * Check if room is ready for replay
   * Validates that both players are still in the room
   */
  async isRoomReadyForReplay(roomId: string): Promise<boolean> {
    const { room, players } = await this.getRoomWithPlayers(roomId);

    if (!room) {
      return false;
    }

    // Must have exactly 2 players and room must be completed
    if (players.length !== 2 || room.status !== 'completed') {
      return false;
    }

    // Must have both creator and joiner with opposite sides
    const creator = players.find(p => p.is_creator);
    const joiner = players.find(p => !p.is_creator);

    if (!creator || !joiner || creator.side === joiner.side) {
      return false;
    }

    this.logger.log(`Room ${roomId} is ready for replay: ${creator.name}(${creator.side}) vs ${joiner.name}(${joiner.side})`);
    return true;
  }

  async removePlayer(socketId: string): Promise<void> {
    const supabase = this.supabaseService.getClient();

    // Get player's room info before removing
    const { data: player } = await supabase
      .from('players')
      .select('room_id, is_creator')
      .eq('socket_id', socketId)
      .single();

    if (player) {
      // Remove player
      await supabase
        .from('players')
        .delete()
        .eq('socket_id', socketId);

      // If creator left, delete the room
      if (player.is_creator) {
        await supabase
          .from('rooms')
          .delete()
          .eq('id', player.room_id);
      }
    }
  }
}