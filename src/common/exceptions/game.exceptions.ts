import { HttpException, HttpStatus } from '@nestjs/common';

/**
 * Custom exception for room-related errors
 */
export class RoomNotFoundException extends HttpException {
  constructor(roomCode?: string) {
    const message = roomCode
      ? `Room with code '${roomCode}' not found`
      : 'Room not found';

    super(
      {
        message,
        type: 'ROOM_NOT_FOUND',
        statusCode: HttpStatus.NOT_FOUND,
      },
      HttpStatus.NOT_FOUND,
    );
  }
}

/**
 * Custom exception for room capacity errors
 */
export class RoomFullException extends HttpException {
  constructor(roomCode: string) {
    super(
      {
        message: `Room '${roomCode}' is already full`,
        type: 'ROOM_FULL',
        statusCode: HttpStatus.CONFLICT,
      },
      HttpStatus.CONFLICT,
    );
  }
}

/**
 * Custom exception for game state errors
 */
export class InvalidGameStateException extends HttpException {
  constructor(currentState: string, requiredState: string) {
    super(
      {
        message: `Invalid game state. Current: ${currentState}, Required: ${requiredState}`,
        type: 'INVALID_GAME_STATE',
        statusCode: HttpStatus.BAD_REQUEST,
      },
      HttpStatus.BAD_REQUEST,
    );
  }
}

/**
 * Custom exception for provably fair errors
 */
export class ProvablyFairException extends HttpException {
  constructor(message: string) {
    super(
      {
        message: `Provably fair error: ${message}`,
        type: 'PROVABLY_FAIR_ERROR',
        statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
      },
      HttpStatus.INTERNAL_SERVER_ERROR,
    );
  }
}

/**
 * Custom exception for database errors
 */
export class DatabaseException extends HttpException {
  constructor(operation: string, details?: string) {
    const message = details
      ? `Database error during ${operation}: ${details}`
      : `Database error during ${operation}`;

    super(
      {
        message,
        type: 'DATABASE_ERROR',
        statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
      },
      HttpStatus.INTERNAL_SERVER_ERROR,
    );
  }
}