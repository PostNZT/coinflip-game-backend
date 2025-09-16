import { Controller, Get, Post, Body, Param, UseGuards, Logger, HttpException, HttpStatus } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiParam, ApiBody, ApiSecurity } from '@nestjs/swagger';
import { GameService } from './game.service';
import { RateLimitGuard } from '../common/guards/rate-limit.guard';
import {
  CreateRoomDto,
  JoinRoomDto,
  RoomResponseDto,
  PlayerResponseDto,
  ErrorResponseDto,
} from '../dto/game.dto';
import {
  RoomNotFoundException,
  DatabaseException,
} from '../common/exceptions/game.exceptions';

/**
 * REST API controller for coinflip game operations
 * Provides endpoints for room management and game status
 * Protected by rate limiting to prevent abuse
 */
@ApiTags('game')
@Controller('api/game')
@UseGuards(RateLimitGuard)
@ApiSecurity('rate-limit')
export class GameController {
  private readonly logger = new Logger(GameController.name);

  constructor(private readonly gameService: GameService) {}

  @Post('rooms')
  @ApiOperation({
    summary: 'Create a new game room',
    description: 'Creates a new game room with a unique 6-character code. The creator chooses heads or tails.',
  })
  @ApiBody({ type: CreateRoomDto })
  @ApiResponse({
    status: 201,
    description: 'Room created successfully',
    type: RoomResponseDto,
  })
  @ApiResponse({
    status: 400,
    description: 'Invalid input data',
    type: ErrorResponseDto,
  })
  async createRoom(@Body() createRoomDto: CreateRoomDto) {
    this.logger.log(`REST API room creation request: ${createRoomDto.side}`);

    try {
      // For REST API, use a dummy socket ID (WebSocket is preferred for real-time gameplay)
      const room = await this.gameService.createRoom(createRoomDto, 'rest-api-dummy');
      this.logger.log(`Room created via REST API: ${room.code}`);
      return room;
    } catch (error) {
      this.logger.error(`REST API room creation failed: ${error.message}`);
      throw error; // Let the global exception filter handle it
    }
  }

  @Get('rooms/:code')
  @ApiOperation({
    summary: 'Get room information by code',
    description: 'Retrieves room details and current status using the 6-character room code.',
  })
  @ApiParam({
    name: 'code',
    description: 'The 6-character room code',
    example: 'ABC123',
  })
  @ApiResponse({
    status: 200,
    description: 'Room found',
    type: RoomResponseDto,
  })
  @ApiResponse({
    status: 404,
    description: 'Room not found',
    type: ErrorResponseDto,
  })
  async getRoomByCode(@Param('code') code: string) {
    try {
      const room = await this.gameService.getRoomByCode(code);
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
          type: 'get_room_error',
        },
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Get('rooms/:code/players')
  @ApiOperation({
    summary: 'Get players in a room',
    description: 'Retrieves all players currently in the specified room.',
  })
  @ApiParam({
    name: 'code',
    description: 'The 6-character room code',
    example: 'ABC123',
  })
  @ApiResponse({
    status: 200,
    description: 'Players retrieved successfully',
    type: [PlayerResponseDto],
  })
  @ApiResponse({
    status: 404,
    description: 'Room not found',
    type: ErrorResponseDto,
  })
  async getPlayersInRoom(@Param('code') code: string) {
    try {
      const room = await this.gameService.getRoomByCode(code);
      if (!room) {
        throw new HttpException(
          {
            message: 'Room not found',
            type: 'room_not_found',
          },
          HttpStatus.NOT_FOUND,
        );
      }

      const players = await this.gameService.getPlayersInRoom(room.id);
      return players;
    } catch (error) {
      if (error instanceof HttpException) {
        throw error;
      }
      throw new HttpException(
        {
          message: error.message,
          type: 'get_players_error',
        },
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Get('health')
  @ApiOperation({
    summary: 'Health check',
    description: 'Simple health check endpoint to verify the API is running.',
  })
  @ApiResponse({
    status: 200,
    description: 'Service is healthy',
    schema: {
      type: 'object',
      properties: {
        status: { type: 'string', example: 'ok' },
        timestamp: { type: 'string', example: '2023-12-01T10:00:00Z' },
        service: { type: 'string', example: 'coinflip-game-backend' },
      },
    },
  })
  getHealth() {
    return {
      status: 'ok',
      timestamp: new Date().toISOString(),
      service: 'coinflip-game-backend',
    };
  }
}