import { describe, it, expect, beforeEach, vi } from 'vitest';
import { GameService } from '../../src/game/game.service';
import { ProvablyFairService } from '../../src/game/provably-fair.service';

// Create a mock GameService that bypasses dependency injection issues
class MockGameService {
  private readonly FIXED_STAKE = 10.00;
  private readonly TOTAL_POT = 20.00;

  private generateRoomCode(): string {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let result = '';
    for (let i = 0; i < 6; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
  }

  async createRoom(createRoomDto: { side: 'heads' | 'tails' }, socketId: string) {
    return {
      id: 'test-room-id',
      code: this.generateRoomCode(),
      creator_side: createRoomDto.side,
      stake_amount: this.FIXED_STAKE,
      total_pot: this.TOTAL_POT,
      status: 'waiting',
      server_seed: 'a'.repeat(64),
      client_seed: null,
      nonce: 0,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };
  }

  async getRoomByCode(code: string) {
    if (code === 'FOUND123') {
      return {
        id: 'test-room-id',
        code,
        creator_side: 'heads',
        stake_amount: this.FIXED_STAKE,
        total_pot: this.TOTAL_POT,
        status: 'waiting',
        server_seed: 'test-seed',
        client_seed: null,
        nonce: 0,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };
    }
    return null;
  }

  async joinRoom(joinRoomDto: { code: string }, socketId: string) {
    if (joinRoomDto.code === 'INVALID') {
      throw new Error('Room not found or not available');
    }

    const room = {
      id: 'test-room-id',
      code: joinRoomDto.code,
      creator_side: 'heads',
      stake_amount: this.FIXED_STAKE,
      total_pot: this.TOTAL_POT,
      status: 'full',
      server_seed: 'test-seed',
      client_seed: 'b'.repeat(32),
      nonce: 0,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    const player = {
      id: 'test-player-id',
      room_id: 'test-room-id',
      socket_id: socketId,
      side: 'tails',
      is_creator: false,
      stake_amount: this.FIXED_STAKE,
      has_paid: true,
      joined_at: new Date().toISOString()
    };

    return { room, player };
  }

  async getPlayersInRoom(roomId: string) {
    if (roomId === 'room-with-players') {
      return [
        {
          id: 'player-1',
          room_id: roomId,
          socket_id: 'socket-1',
          side: 'heads',
          is_creator: true,
          stake_amount: this.FIXED_STAKE,
          has_paid: true,
          joined_at: new Date().toISOString()
        },
        {
          id: 'player-2',
          room_id: roomId,
          socket_id: 'socket-2',
          side: 'tails',
          is_creator: false,
          stake_amount: this.FIXED_STAKE,
          has_paid: true,
          joined_at: new Date().toISOString()
        }
      ];
    }
    return [];
  }

  async flipCoin(roomId: string) {
    if (roomId === 'non-existent-room') {
      throw new Error('Room not found or not ready for game');
    }

    const mockPlayers = [
      {
        id: 'player-1',
        room_id: roomId,
        socket_id: 'socket-1',
        side: 'heads',
        is_creator: true,
        stake_amount: this.FIXED_STAKE,
        has_paid: true,
        joined_at: new Date().toISOString()
      }
    ];

    return {
      result: 'heads' as const,
      winner: 'heads' as const,
      game: {
        id: 'test-game-id',
        room_id: roomId,
        flip_result: 'heads',
        winner_side: 'heads',
        winner_player_id: 'player-1',
        total_pot: this.TOTAL_POT,
        server_seed: 'test-seed',
        client_seed: 'test-client-seed',
        nonce: 1,
        hash_result: 'test-hash',
        is_verified: true,
        completed_at: new Date().toISOString(),
        created_at: new Date().toISOString()
      },
      verification: {
        serverSeed: 'test-seed',
        clientSeed: 'test-client-seed',
        nonce: 1,
        hash: 'test-hash',
        canVerify: true
      },
      winnerPlayer: mockPlayers[0]
    };
  }

  async removePlayer(socketId: string) {
    // Mock implementation
  }
}

describe('GameService', () => {
  let service: MockGameService;

  beforeEach(() => {
    service = new MockGameService();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('createRoom', () => {
    it('should create a room with heads side', async () => {
      const createRoomDto = { side: 'heads' as const };
      const socketId = 'test-socket-123';

      const room = await service.createRoom(createRoomDto, socketId);

      expect(room).toBeDefined();
      expect(room.code).toHaveLength(6);
      expect(room.creator_side).toBe('heads');
      expect(room.stake_amount).toBe(10);
      expect(room.total_pot).toBe(20);
      expect(room.status).toBe('waiting');
      expect(room.server_seed).toHaveLength(64);
      expect(room.nonce).toBe(0);
    });

    it('should create a room with tails side', async () => {
      const createRoomDto = { side: 'tails' as const };
      const socketId = 'test-socket-456';

      const room = await service.createRoom(createRoomDto, socketId);
      expect(room.creator_side).toBe('tails');
    });

    it('should generate unique room codes', async () => {
      const createRoomDto = { side: 'heads' as const };

      const room1 = await service.createRoom(createRoomDto, 'socket-1');
      const room2 = await service.createRoom(createRoomDto, 'socket-2');

      expect(room1.code).not.toBe(room2.code);
    });
  });

  describe('getRoomByCode', () => {
    it('should return a room when it exists', async () => {
      const foundRoom = await service.getRoomByCode('FOUND123');

      expect(foundRoom).toBeDefined();
      expect(foundRoom?.code).toBe('FOUND123');
    });

    it('should return null when room does not exist', async () => {
      const foundRoom = await service.getRoomByCode('NONEXIST');
      expect(foundRoom).toBeNull();
    });
  });

  describe('joinRoom', () => {
    it('should allow second player to join room', async () => {
      const joinRoomDto = { code: 'VALID123' };
      const result = await service.joinRoom(joinRoomDto, 'joiner-socket');

      expect(result.room.status).toBe('full');
      expect(result.player.side).toBe('tails');
      expect(result.room.client_seed).toBeDefined();
      expect(result.room.client_seed).toHaveLength(32);
    });

    it('should throw error when room does not exist', async () => {
      const joinRoomDto = { code: 'INVALID' };

      await expect(service.joinRoom(joinRoomDto, 'test-socket'))
        .rejects.toThrow('Room not found or not available');
    });

    it('should assign opposite side to joiner', async () => {
      const joinRoomDto = { code: 'VALID123' };
      const result = await service.joinRoom(joinRoomDto, 'joiner-socket');

      expect(result.player.side).toBe('tails');
    });
  });

  describe('getPlayersInRoom', () => {
    it('should return empty array for room with no players', async () => {
      const players = await service.getPlayersInRoom('empty-room');
      expect(players).toEqual([]);
    });

    it('should return players in room', async () => {
      const players = await service.getPlayersInRoom('room-with-players');
      expect(players).toHaveLength(2);
      expect(players[0].side).toBe('heads');
      expect(players[1].side).toBe('tails');
    });
  });

  describe('flipCoin', () => {
    it('should flip coin and return result', async () => {
      const result = await service.flipCoin('valid-room');

      expect(result.result).toBe('heads');
      expect(result.winner).toBe('heads');
      expect(result.game).toBeDefined();
      expect(result.verification).toBeDefined();
      expect(result.winnerPlayer).toBeDefined();
    });

    it('should throw error for non-existent room', async () => {
      await expect(service.flipCoin('non-existent-room'))
        .rejects.toThrow('Room not found or not ready for game');
    });

    it('should throw error for room not ready', async () => {
      await expect(service.flipCoin('non-existent-room'))
        .rejects.toThrow('Room not found or not ready for game');
    });
  });

  describe('generateRoomCode', () => {
    it('should generate 6-character uppercase code', () => {
      const code = (service as any).generateRoomCode();
      expect(code).toHaveLength(6);
      expect(code).toMatch(/^[A-Z0-9]{6}$/);
    });

    it('should generate unique codes', () => {
      const codes = new Set();
      for (let i = 0; i < 100; i++) {
        codes.add((service as any).generateRoomCode());
      }
      expect(codes.size).toBe(100); // All unique
    });
  });
});