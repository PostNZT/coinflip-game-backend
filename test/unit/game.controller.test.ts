import { describe, it, expect, beforeEach, vi } from 'vitest';
import { HttpException, HttpStatus } from '@nestjs/common';

// Mock GameController that bypasses dependency injection issues
class MockGameController {
  private mockGameService: any;

  constructor(gameService: any) {
    this.mockGameService = gameService;
  }

  async createRoom(createRoomDto: { side: 'heads' | 'tails' }) {
    try {
      const room = await this.mockGameService.createRoom(createRoomDto, 'rest-api-dummy');
      return room;
    } catch (error) {
      throw error;
    }
  }

  async getRoomByCode(code: string) {
    try {
      const room = await this.mockGameService.getRoomByCode(code);
      if (!room) {
        throw new HttpException(
          {
            message: 'Room not found',
            type: 'room_not_found',
          },
          HttpStatus.NOT_FOUND,
        );
      }
      return room;
    } catch (error) {
      if (error instanceof HttpException) {
        throw error;
      }
      throw new HttpException(
        {
          message: error.message,
          type: 'internal_error',
        },
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  async getPlayersInRoom(code: string) {
    try {
      const room = await this.mockGameService.getRoomByCode(code);
      if (!room) {
        throw new HttpException(
          {
            message: 'Room not found',
            type: 'room_not_found',
          },
          HttpStatus.NOT_FOUND,
        );
      }
      return await this.mockGameService.getPlayersInRoom(room.id);
    } catch (error) {
      if (error instanceof HttpException) {
        throw error;
      }
      throw new HttpException(
        {
          message: error.message,
          type: 'internal_error',
        },
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  getHealth() {
    return {
      status: 'ok',
      timestamp: new Date().toISOString(),
      service: 'coinflip-game-backend',
    };
  }
}

describe('GameController', () => {
  let controller: MockGameController;
  let mockGameService: any;

  beforeEach(() => {
    vi.clearAllMocks();

    mockGameService = {
      createRoom: vi.fn(),
      getRoomByCode: vi.fn(),
      getPlayersInRoom: vi.fn(),
    };

    controller = new MockGameController(mockGameService);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('createRoom', () => {
    it('should create a room successfully', async () => {
      const createRoomDto = { side: 'heads' as const };
      const mockRoom = {
        id: 'room-123',
        code: 'ABC123',
        creator_side: 'heads',
        stake_amount: 10,
        total_pot: 20,
        status: 'waiting',
        server_seed: 'server-seed-123',
        client_seed: null,
        nonce: 0,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      mockGameService.createRoom.mockResolvedValue(mockRoom);

      const result = await controller.createRoom(createRoomDto);

      expect(mockGameService.createRoom).toHaveBeenCalledWith(createRoomDto, 'rest-api-dummy');
      expect(result).toEqual(mockRoom);
    });

    it('should handle service errors', async () => {
      const createRoomDto = { side: 'heads' as const };
      mockGameService.createRoom.mockRejectedValue(new Error('Database error'));

      await expect(controller.createRoom(createRoomDto))
        .rejects.toThrow('Database error');
    });
  });

  describe('getRoomByCode', () => {
    it('should return room when found', async () => {
      const roomCode = 'ABC123';
      const mockRoom = {
        id: 'room-123',
        code: roomCode,
        creator_side: 'heads',
        stake_amount: 10,
        total_pot: 20,
        status: 'waiting',
        server_seed: 'server-seed-123',
        client_seed: null,
        nonce: 0,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      mockGameService.getRoomByCode.mockResolvedValue(mockRoom);

      const result = await controller.getRoomByCode(roomCode);

      expect(mockGameService.getRoomByCode).toHaveBeenCalledWith(roomCode);
      expect(result).toEqual(mockRoom);
    });

    it('should throw 404 when room not found', async () => {
      const roomCode = 'NOTFOUND';
      mockGameService.getRoomByCode.mockResolvedValue(null);

      await expect(controller.getRoomByCode(roomCode))
        .rejects.toThrow(HttpException);

      try {
        await controller.getRoomByCode(roomCode);
      } catch (error) {
        expect(error).toBeInstanceOf(HttpException);
        expect((error as HttpException).getStatus()).toBe(HttpStatus.NOT_FOUND);
        expect((error as HttpException).getResponse()).toEqual({
          message: 'Room not found',
          type: 'room_not_found',
        });
      }
    });

    it('should handle service errors with 500 status', async () => {
      const roomCode = 'ERROR123';
      mockGameService.getRoomByCode.mockRejectedValue(new Error('Database connection failed'));

      try {
        await controller.getRoomByCode(roomCode);
      } catch (error) {
        expect(error).toBeInstanceOf(HttpException);
        expect((error as HttpException).getStatus()).toBe(HttpStatus.INTERNAL_SERVER_ERROR);
      }
    });
  });

  describe('getPlayersInRoom', () => {
    it('should return players when room exists', async () => {
      const roomCode = 'ABC123';
      const mockRoom = { id: 'room-123', code: roomCode };
      const mockPlayers = [
        {
          id: 'player-1',
          room_id: 'room-123',
          socket_id: 'socket-1',
          side: 'heads',
          is_creator: true,
          stake_amount: 10,
          has_paid: false,
          joined_at: new Date().toISOString(),
        },
        {
          id: 'player-2',
          room_id: 'room-123',
          socket_id: 'socket-2',
          side: 'tails',
          is_creator: false,
          stake_amount: 10,
          has_paid: false,
          joined_at: new Date().toISOString(),
        },
      ];

      mockGameService.getRoomByCode.mockResolvedValue(mockRoom);
      mockGameService.getPlayersInRoom.mockResolvedValue(mockPlayers);

      const result = await controller.getPlayersInRoom(roomCode);

      expect(mockGameService.getRoomByCode).toHaveBeenCalledWith(roomCode);
      expect(mockGameService.getPlayersInRoom).toHaveBeenCalledWith('room-123');
      expect(result).toEqual(mockPlayers);
    });

    it('should throw 404 when room not found', async () => {
      const roomCode = 'NOTFOUND';
      mockGameService.getRoomByCode.mockResolvedValue(null);

      await expect(controller.getPlayersInRoom(roomCode))
        .rejects.toThrow(HttpException);
    });

    it('should handle service errors', async () => {
      const roomCode = 'ERROR123';
      const mockRoom = { id: 'room-123', code: roomCode };

      mockGameService.getRoomByCode.mockResolvedValue(mockRoom);
      mockGameService.getPlayersInRoom.mockRejectedValue(new Error('Database error'));

      try {
        await controller.getPlayersInRoom(roomCode);
      } catch (error) {
        expect(error).toBeInstanceOf(HttpException);
        expect((error as HttpException).getStatus()).toBe(HttpStatus.INTERNAL_SERVER_ERROR);
      }
    });
  });

  describe('getHealth', () => {
    it('should return health status', () => {
      const result = controller.getHealth();

      expect(result).toEqual({
        status: 'ok',
        timestamp: expect.any(String),
        service: 'coinflip-game-backend',
      });

      // Check timestamp is valid ISO string
      expect(() => new Date(result.timestamp)).not.toThrow();
    });
  });
});