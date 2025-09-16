import { Test, TestingModule } from '@nestjs/testing';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { GameGateway } from '../../src/game/game.gateway';
import { GameService } from '../../src/game/game.service';
import { Socket, Server } from 'socket.io';

describe('GameGateway', () => {
  let gateway: GameGateway;
  let gameService: GameService;
  let mockClient: Partial<Socket>;
  let mockServer: Partial<Server>;

  const mockGameService = {
    createRoom: vi.fn(),
    joinRoom: vi.fn(),
    flipCoin: vi.fn(),
    getRoomByCode: vi.fn(),
    getPlayersInRoom: vi.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        GameGateway,
        {
          provide: GameService,
          useValue: mockGameService,
        },
      ],
    }).compile();

    gateway = module.get<GameGateway>(GameGateway);
    gameService = module.get<GameService>(GameService);

    // Mock Socket.io client
    mockClient = {
      id: 'test-socket-123',
      join: vi.fn(),
      emit: vi.fn(),
    };

    // Mock Socket.io server
    mockServer = {
      to: vi.fn(() => ({
        emit: vi.fn(),
      })) as any,
    };

    gateway.server = mockServer as Server;

    // Reset mocks
    vi.clearAllMocks();
  });

  it('should be defined', () => {
    expect(gateway).toBeDefined();
  });

  describe('handleConnection', () => {
    it('should log client connection', () => {
      const consoleSpy = vi.spyOn(console, 'log');

      gateway.handleConnection(mockClient as Socket);

      expect(consoleSpy).toHaveBeenCalledWith('Client connected: test-socket-123');
    });
  });

  describe('handleDisconnect', () => {
    it('should log client disconnection', () => {
      const consoleSpy = vi.spyOn(console, 'log');

      gateway.handleDisconnect(mockClient as Socket);

      expect(consoleSpy).toHaveBeenCalledWith('Client disconnected: test-socket-123');
    });
  });

  describe('handleCreateRoom', () => {
    it('should create room and emit room_created event', async () => {
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

      await gateway.handleCreateRoom(mockClient as Socket, createRoomDto);

      expect(mockGameService.createRoom).toHaveBeenCalledWith(createRoomDto, 'test-socket-123');
      expect(mockClient.join).toHaveBeenCalledWith('room-123');
      expect(mockClient.emit).toHaveBeenCalledWith('room_created', {
        room: mockRoom,
        playerSide: 'heads',
        stakeAmount: 10.00,
        totalPot: 20.00,
      });
    });

    it('should emit error when room creation fails', async () => {
      const createRoomDto = { side: 'heads' as const };
      mockGameService.createRoom.mockRejectedValue(new Error('Database error'));

      await gateway.handleCreateRoom(mockClient as Socket, createRoomDto);

      expect(mockClient.emit).toHaveBeenCalledWith('error', {
        message: 'Database error',
        type: 'create_room_error',
      });
    });
  });

  describe('handleJoinRoom', () => {
    it('should join room and emit room_joined and room_ready events', async () => {
      const joinRoomDto = { code: 'ABC123' };
      const mockRoom = {
        id: 'room-123',
        code: 'ABC123',
        status: 'full',
      };
      const mockPlayer = {
        id: 'player-2',
        side: 'tails',
      };
      const mockPlayers = [
        { id: 'player-1', side: 'heads' },
        { id: 'player-2', side: 'tails' },
      ];

      mockGameService.joinRoom.mockResolvedValue({
        room: mockRoom,
        player: mockPlayer,
      });
      mockGameService.getPlayersInRoom.mockResolvedValue(mockPlayers);

      await gateway.handleJoinRoom(mockClient as Socket, joinRoomDto);

      expect(mockGameService.joinRoom).toHaveBeenCalledWith(joinRoomDto, 'test-socket-123');
      expect(mockClient.join).toHaveBeenCalledWith('room-123');
      expect(mockClient.emit).toHaveBeenCalledWith('room_joined', {
        room: mockRoom,
        playerSide: 'tails',
        players: mockPlayers,
        stakeAmount: 10.00,
        totalPot: 20.00,
      });
      expect(mockServer.to).toHaveBeenCalledWith('room-123');
    });

    it('should emit error when join fails', async () => {
      const joinRoomDto = { code: 'INVALID' };
      mockGameService.joinRoom.mockRejectedValue(new Error('Room not found'));

      await gateway.handleJoinRoom(mockClient as Socket, joinRoomDto);

      expect(mockClient.emit).toHaveBeenCalledWith('error', {
        message: 'Room not found',
        type: 'join_room_error',
      });
    });
  });

  describe('handleFlipCoin', () => {
    it('should start coin flip and emit results', async () => {
      const flipCoinDto = { roomId: 'room-123' };
      const mockResult = {
        result: 'heads' as const,
        winner: 'heads' as const,
        game: { id: 'game-123', hashResult: 'hash-123' },
        verification: { serverSeed: 'seed', clientSeed: 'seed', nonce: 1 },
        winnerPlayer: { id: 'player-1', side: 'heads' },
      };
      const mockPlayers = [
        { id: 'player-1', side: 'heads' },
        { id: 'player-2', side: 'tails' },
      ];

      mockGameService.flipCoin.mockResolvedValue(mockResult);
      mockGameService.getPlayersInRoom.mockResolvedValue(mockPlayers);

      // Mock setTimeout to execute immediately
      vi.spyOn(global, 'setTimeout').mockImplementation((callback: any) => {
        callback();
        return {} as any;
      });

      await gateway.handleFlipCoin(mockClient as Socket, flipCoinDto);

      expect(mockServer.to).toHaveBeenCalledWith('room-123');
      expect(mockGameService.flipCoin).toHaveBeenCalledWith('room-123');
    });

    it('should emit error when flip fails', async () => {
      const flipCoinDto = { roomId: 'invalid-room' };
      mockGameService.flipCoin.mockRejectedValue(new Error('Room not ready'));

      await gateway.handleFlipCoin(mockClient as Socket, flipCoinDto);

      expect(mockClient.emit).toHaveBeenCalledWith('error', {
        message: 'Room not ready',
        type: 'flip_coin_error',
      });
    });
  });

  describe('handleGetRoomStatus', () => {
    it('should return room status', async () => {
      const getRoomStatusDto = { code: 'ABC123' };
      const mockRoom = {
        id: 'room-123',
        code: 'ABC123',
        status: 'waiting',
      };
      const mockPlayers = [
        { id: 'player-1', side: 'heads' },
      ];

      mockGameService.getRoomByCode.mockResolvedValue(mockRoom);
      mockGameService.getPlayersInRoom.mockResolvedValue(mockPlayers);

      await gateway.handleGetRoomStatus(mockClient as Socket, getRoomStatusDto);

      expect(mockGameService.getRoomByCode).toHaveBeenCalledWith('ABC123');
      expect(mockGameService.getPlayersInRoom).toHaveBeenCalledWith('room-123');
      expect(mockClient.emit).toHaveBeenCalledWith('room_status', {
        room: mockRoom,
        players: mockPlayers,
      });
    });

    it('should emit error when room not found', async () => {
      const getRoomStatusDto = { code: 'NOTFOUND' };
      mockGameService.getRoomByCode.mockResolvedValue(null);

      await gateway.handleGetRoomStatus(mockClient as Socket, getRoomStatusDto);

      expect(mockClient.emit).toHaveBeenCalledWith('error', {
        message: 'Room not found',
        type: 'room_status_error',
      });
    });

    it('should emit error when service fails', async () => {
      const getRoomStatusDto = { code: 'ERROR123' };
      mockGameService.getRoomByCode.mockRejectedValue(new Error('Database error'));

      await gateway.handleGetRoomStatus(mockClient as Socket, getRoomStatusDto);

      expect(mockClient.emit).toHaveBeenCalledWith('error', {
        message: 'Database error',
        type: 'room_status_error',
      });
    });
  });
});