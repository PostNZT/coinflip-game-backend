import { ApiProperty } from '@nestjs/swagger';
import { IsEnum, IsOptional, IsNumber, IsString, Min } from 'class-validator';

export enum CoinSide {
  HEADS = 'heads',
  TAILS = 'tails',
}

export enum RoomStatus {
  WAITING = 'waiting',
  FULL = 'full',
  PLAYING = 'playing',
  COMPLETED = 'completed',
}

export class CreateRoomDto {
  @ApiProperty({
    enum: CoinSide,
    description: 'The side (heads or tails) the room creator chooses',
    example: CoinSide.HEADS,
  })
  @IsEnum(CoinSide)
  side: CoinSide;
}

export class JoinRoomDto {
  @ApiProperty({
    description: 'The 6-character room code to join',
    example: 'ABC123',
    minLength: 6,
    maxLength: 6,
  })
  @IsString()
  code: string;
}

export class FlipCoinDto {
  @ApiProperty({
    description: 'The UUID of the room to flip coin in',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @IsString()
  roomId: string;
}

export class RoomResponseDto {
  @ApiProperty({
    description: 'Unique room identifier',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  id: string;

  @ApiProperty({
    description: 'Unique 6-character room code',
    example: 'ABC123',
  })
  code: string;

  @ApiProperty({
    enum: CoinSide,
    description: 'The side chosen by the room creator',
    example: CoinSide.HEADS,
  })
  creator_side: CoinSide;

  @ApiProperty({
    description: 'Fixed stake amount per player ($10)',
    example: 10.00,
  })
  stake_amount: number;

  @ApiProperty({
    description: 'Total pot amount ($20 for 1v1)',
    example: 20.00,
  })
  total_pot: number;

  @ApiProperty({
    description: 'Server seed hash for provably fair verification',
    example: 'abc123...',
  })
  server_seed: string;

  @ApiProperty({
    description: 'Client seed for provably fair verification',
    example: 'def456...',
    required: false,
  })
  client_seed?: string;

  @ApiProperty({
    description: 'Current nonce for provably fair verification',
    example: 0,
  })
  nonce: number;

  @ApiProperty({
    enum: RoomStatus,
    description: 'Current room status',
    example: RoomStatus.WAITING,
  })
  status: RoomStatus;

  @ApiProperty({
    description: 'Room creation timestamp',
    example: '2023-12-01T10:00:00Z',
  })
  created_at: string;

  @ApiProperty({
    description: 'Room last update timestamp',
    example: '2023-12-01T10:00:00Z',
  })
  updated_at: string;
}

export class PlayerResponseDto {
  @ApiProperty({
    description: 'Unique player identifier',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  id: string;

  @ApiProperty({
    description: 'Room identifier the player belongs to',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  room_id: string;

  @ApiProperty({
    description: 'WebSocket connection ID',
    example: 'socket_12345',
  })
  socket_id: string;

  @ApiProperty({
    enum: CoinSide,
    description: 'The side assigned to the player',
    example: CoinSide.HEADS,
  })
  side: CoinSide;

  @ApiProperty({
    description: 'Whether this player created the room',
    example: true,
  })
  is_creator: boolean;

  @ApiProperty({
    description: 'Stake amount paid by player ($10)',
    example: 10.00,
  })
  stake_amount: number;

  @ApiProperty({
    description: 'Whether player has paid their stake',
    example: true,
  })
  has_paid: boolean;

  @ApiProperty({
    description: 'Player join timestamp',
    example: '2023-12-01T10:00:00Z',
  })
  joined_at: string;
}

export class GameResponseDto {
  @ApiProperty({
    description: 'Unique game identifier',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  id: string;

  @ApiProperty({
    description: 'Room identifier where the game was played',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  room_id: string;

  @ApiProperty({
    enum: CoinSide,
    description: 'The result of the coin flip',
    example: CoinSide.HEADS,
  })
  flip_result: CoinSide;

  @ApiProperty({
    enum: CoinSide,
    description: 'The winning side',
    example: CoinSide.HEADS,
  })
  winner_side: CoinSide;

  @ApiProperty({
    description: 'Winner player ID',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  winner_player_id: string;

  @ApiProperty({
    description: 'Total pot amount won ($20)',
    example: 20.00,
  })
  total_pot: number;

  @ApiProperty({
    description: 'Server seed used for this game',
    example: 'abc123...',
  })
  server_seed: string;

  @ApiProperty({
    description: 'Client seed used for this game',
    example: 'def456...',
  })
  client_seed: string;

  @ApiProperty({
    description: 'Nonce used for this game',
    example: 1,
  })
  nonce: number;

  @ApiProperty({
    description: 'Hash result for verification',
    example: 'hash123...',
  })
  hash_result: string;

  @ApiProperty({
    description: 'Whether the result is verified as provably fair',
    example: true,
  })
  is_verified: boolean;

  @ApiProperty({
    description: 'Game creation timestamp',
    example: '2023-12-01T10:00:00Z',
  })
  created_at: string;

  @ApiProperty({
    description: 'Game completion timestamp',
    example: '2023-12-01T10:05:00Z',
    required: false,
  })
  completed_at?: string;
}

export class ErrorResponseDto {
  @ApiProperty({
    description: 'Error message',
    example: 'Room not found',
  })
  message: string;

  @ApiProperty({
    description: 'Error type identifier',
    example: 'room_not_found',
  })
  type: string;
}