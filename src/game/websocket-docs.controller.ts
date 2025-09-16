import { Controller, Get } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';

@ApiTags('websocket')
@Controller('api/websocket')
export class WebSocketDocsController {
  @Get('events')
  @ApiOperation({
    summary: 'WebSocket Events Documentation',
    description: `
      This endpoint provides documentation for all WebSocket events used in the coinflip game.

      ## Connection
      Connect to WebSocket server at: ws://localhost:8080

      ## Client to Server Events

      ### create_room
      Creates a new game room
      **Payload:**
      \`\`\`json
      {
        "side": "heads" | "tails",
        "playerName": "John" // Optional - defaults to "Player XXXX"
      }
      \`\`\`
      **Note:** Stakes are fixed at $10 per player ($20 total pot)
      **Response:** room_created event

      ### join_room
      Joins an existing room by code
      **Payload:**
      \`\`\`json
      {
        "code": "ABC123",
        "playerName": "Jane" // Optional - defaults to "Player XXXX"
      }
      \`\`\`
      **Response:** room_joined and room_ready events

      ### flip_coin
      Initiates a coin flip (works on 'full' and 'completed' rooms for replay)
      **Payload:**
      \`\`\`json
      {
        "roomId": "uuid-string"
      }
      \`\`\`
      **Response:**
      - For new games: coin_flip_started followed by coin_flip_result
      - For replays: room_ready, coin_flip_started, then coin_flip_result
      **Note:** If room is 'completed', it will reset and start a new game with same players

      ### get_room_status
      Gets current room status
      **Payload:**
      \`\`\`json
      {
        "code": "ABC123"
      }
      \`\`\`
      **Response:** room_status event

      ## Server to Client Events

      ### room_created
      Sent when room is successfully created
      **Payload:**
      \`\`\`json
      {
        "room": Room,
        "playerSide": "heads" | "tails",
        "stakeAmount": 10.00,
        "totalPot": 20.00
      }
      \`\`\`

      ### room_joined
      Sent to player who just joined
      **Payload:**
      \`\`\`json
      {
        "room": Room,
        "playerSide": "heads" | "tails",
        "players": Player[]
      }
      \`\`\`

      ### room_ready
      Sent when room has 2 players (game will auto-start in 2 seconds) or during replay
      **Payload:**
      \`\`\`json
      {
        "room": Room,
        "players": Player[],
        "message": "Both players ready! Game can start.",
        "isReplay": true // Optional - present only for replay scenarios
      }
      \`\`\`

      ### coin_flip_started
      Sent when coin flip animation begins (auto-starts after room_ready)
      **Payload:**
      \`\`\`json
      {
        "message": "Coin flip starting..."
      }
      \`\`\`

      ### coin_flip_result
      Sent when flip is complete (general results for all players)
      **Payload:**
      \`\`\`json
      {
        "flipResult": "heads" | "tails",
        "winnerSide": "heads" | "tails",
        "winnerPlayer": Player,
        "totalPot": 20.00,
        "players": Player[],
        "game": Game,
        "verification": {
          "serverSeed": "string",
          "clientSeed": "string",
          "nonce": 1,
          "verificationUrl": "string",
          "instructions": ["string"]
        }
      }
      \`\`\`

      ### game_completed
      NEW: Sent individually to each player with personalized win/lose data
      **Payload:**
      \`\`\`json
      {
        "result": "win" | "lose",
        "flipResult": "heads" | "tails",
        "yourSide": "heads" | "tails",
        "winnerSide": "heads" | "tails",
        "winnings": 20.00,
        "verification": {
          "serverSeed": "string",
          "clientSeed": "string",
          "nonce": 1,
          "verificationUrl": "string",
          "instructions": ["string"]
        },
        "game": Game
      }
      \`\`\`

      ### room_status
      Response to get_room_status
      **Payload:**
      \`\`\`json
      {
        "room": Room,
        "players": Player[]
      }
      \`\`\`

      ### error
      Sent when an error occurs
      **Payload:**
      \`\`\`json
      {
        "message": "Error description",
        "type": "error_type_identifier"
      }
      \`\`\`
      **Error Types:**
      - \`ROOM_FULL\`: Room already has 2 players
      - \`ROOM_NOT_FOUND\`: Room code not found
      - \`replay_not_ready\`: Both players must be present for replay
      - \`flip_coin_error\`: General flip coin error
      - \`auto_flip_error\`: Auto-start flip error
    `,
  })
  @ApiResponse({
    status: 200,
    description: 'WebSocket events documentation',
    schema: {
      type: 'object',
      properties: {
        message: {
          type: 'string',
          example: 'WebSocket events documentation available in the description above',
        },
        websocketUrl: {
          type: 'string',
          example: 'ws://localhost:8080',
        },
        clientEvents: {
          type: 'array',
          items: {
            type: 'string',
          },
          example: ['create_room', 'join_room', 'flip_coin', 'get_room_status'],
        },
        serverEvents: {
          type: 'array',
          items: {
            type: 'string',
          },
          example: [
            'room_created',
            'room_joined',
            'room_ready',
            'coin_flip_started',
            'coin_flip_result',
            'game_completed',
            'room_status',
            'error',
          ],
        },
      },
    },
  })
  getWebSocketEvents() {
    return {
      message: 'WebSocket events documentation available in the operation description above',
      websocketUrl: 'ws://localhost:8080',
      clientEvents: ['create_room', 'join_room', 'flip_coin', 'get_room_status'],
      serverEvents: [
        'room_created',
        'room_joined',
        'room_ready',
        'coin_flip_started',
        'coin_flip_result',
        'game_completed',
        'room_status',
        'error',
      ],
    };
  }

  @Get('example-usage')
  @ApiOperation({
    summary: 'WebSocket Usage Example',
    description: `
      Example client-side JavaScript code for connecting to the WebSocket server:

      \`\`\`javascript
      import io from 'socket.io-client';

      const socket = io('http://localhost:8080');

      // Create a room
      socket.emit('create_room', {
        side: 'heads',
        potAmount: 100
      });

      // Listen for room created
      socket.on('room_created', (data) => {
        console.log('Room created:', data.room.code);
        console.log('Your side:', data.playerSide);
      });

      // Join a room
      socket.emit('join_room', {
        code: 'ABC123'
      });

      // Listen for room ready
      socket.on('room_ready', (data) => {
        console.log('Room ready for game!');
        console.log('Players:', data.players);
      });

      // Start coin flip
      socket.emit('flip_coin', {
        roomId: 'room-uuid'
      });

      // Listen for flip result
      socket.on('coin_flip_result', (data) => {
        console.log('Coin landed on:', data.flipResult);
        console.log('Winner:', data.winnerSide);
      });

      // Handle errors
      socket.on('error', (error) => {
        console.error('Error:', error.message);
      });
      \`\`\`
    `,
  })
  @ApiResponse({
    status: 200,
    description: 'Example usage code',
    schema: {
      type: 'object',
      properties: {
        language: {
          type: 'string',
          example: 'javascript',
        },
        example: {
          type: 'string',
          example: 'See operation description for full example code',
        },
      },
    },
  })
  getUsageExample() {
    return {
      language: 'javascript',
      example: 'See operation description for full example code',
    };
  }
}