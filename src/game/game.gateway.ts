import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  ConnectedSocket,
  MessageBody,
  OnGatewayConnection,
  OnGatewayDisconnect,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { GameService } from './game.service';
import { CreateRoomDto, JoinRoomDto } from '../types/game.types';

@WebSocketGateway({
  cors: {
    origin: '*',
    methods: ['GET', 'POST'],
  },
})
export class GameGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  constructor(private gameService: GameService) {}

  /**
   * Format player data for WebSocket events
   * Ensures winner player object has complete data
   */
  private formatPlayerForEvent(player: any): any {
    return {
      id: player.id,
      name: player.name || `Player ${player.socket_id?.substring(0, 4) || 'Unknown'}`,
      side: player.side,
      is_creator: player.is_creator,
      socket_id: player.socket_id,
    };
  }

  handleConnection(client: Socket) {
    console.log(`Client connected: ${client.id}`);
  }

  async handleDisconnect(client: Socket) {
    console.log(`Client disconnected: ${client.id}`);
    try {
      await this.gameService.removePlayer(client.id);
    } catch (error) {
      console.error('Error removing player:', error);
    }
  }

  @SubscribeMessage('create_room')
  async handleCreateRoom(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: CreateRoomDto,
  ) {
    try {
      console.log(`Client ${client.id} creating room with data:`, data);
      const room = await this.gameService.createRoom(data, client.id);

      // Join the socket room
      client.join(room.id);

      // Get complete room data with players
      const { room: completeRoom, players } = await this.gameService.getRoomWithPlayers(room.id);

      // Send room created event with complete player data
      client.emit('room_created', {
        room: completeRoom,
        playerSide: data.side,
        players, // INCLUDE FULL PLAYER ARRAY with names
        stakeAmount: 10.00,
        totalPot: 20.00,
      });

      console.log(`Room created: ${room.code} by ${client.id} (${players[0].name})`);
    } catch (error) {
      client.emit('error', {
        message: error.message,
        type: 'create_room_error',
      });
    }
  }

  @SubscribeMessage('join_room')
  async handleJoinRoom(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: JoinRoomDto,
  ) {
    try {
      console.log(`Client ${client.id} joining room with code: ${data.code}`);
      const { room, player } = await this.gameService.joinRoom(data, client.id);
      console.log(`Client ${client.id} (${player.name}) joined room - Player side: ${player.side}, Room creator side: ${room.creator_side}`);

      // Join the socket room
      client.join(room.id);

      // Get complete room data with both players (formatted with names)
      const { room: completeRoom, players } = await this.gameService.getRoomWithPlayers(room.id);

      // Notify both players that room is ready
      this.server.to(room.id).emit('room_ready', {
        room: completeRoom,
        players, // INCLUDE BOTH PLAYERS with names
        message: 'Both players ready! Game can start.',
      });

      // Send join confirmation to the new player with complete player data
      client.emit('room_joined', {
        room: completeRoom,
        playerSide: player.side,
        players, // INCLUDE BOTH PLAYERS - creator and joiner with names
        stakeAmount: 10.00,
        totalPot: 20.00,
      });

      console.log(`Player ${client.id} (${player.name}) joined room: ${room.code}`);

      // Auto-start the game after a short delay
      setTimeout(async () => {
        try {
          console.log(`Auto-starting game in room ${room.id}`);

          // Start flip animation
          this.server.to(room.id).emit('coin_flip_started', {
            message: 'Coin flip starting...',
          });

          // Simulate coin flip animation delay
          setTimeout(async () => {
            try {
              const result = await this.gameService.flipCoin(room.id);
              const { players: currentPlayers } = await this.gameService.getRoomWithPlayers(room.id);

              // Send result to all players in room with complete player data
              this.server.to(room.id).emit('coin_flip_result', {
                flipResult: result.result,
                winnerSide: result.winner,
                winnerPlayer: this.formatPlayerForEvent(result.winnerPlayer),
                totalPot: 20.00,
                players: currentPlayers, // Complete formatted player data
                game: result.game,
                verification: result.verification,
              });

              // Send individual results to each player with names
              currentPlayers.forEach(gamePlayer => {
                const isWinner = gamePlayer.id === result.winnerPlayer.id;
                this.server.to(gamePlayer.socket_id).emit('game_completed', {
                  result: isWinner ? 'win' : 'lose',
                  flipResult: result.result,
                  yourSide: gamePlayer.side,
                  winnerSide: result.winner,
                  winnings: isWinner ? 20.00 : 0,
                  players: currentPlayers, // CRITICAL: Include player data for UI display
                  verification: result.verification,
                  game: result.game,
                });
              });

              console.log(`Auto-started coin flip completed in room ${room.id}: ${result.result}`);
              console.log(`Game result - Flip: ${result.result}, Winner: ${result.winnerPlayer.side}, Players: [${currentPlayers.map(p => `${p.name}:${p.side}(${p.is_creator ? 'creator' : 'joiner'})`).join(', ')}]`);
            } catch (error) {
              this.server.to(room.id).emit('error', {
                message: error.message,
                type: 'auto_flip_error',
              });
            }
          }, 3000); // 3 second delay for animation

        } catch (error) {
          this.server.to(room.id).emit('error', {
            message: error.message,
            type: 'auto_start_error',
          });
        }
      }, 2000); // 2 second delay before auto-start
    } catch (error) {
      client.emit('error', {
        message: error.message,
        type: 'join_room_error',
      });
    }
  }

  @SubscribeMessage('flip_coin')
  async handleFlipCoin(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { roomId: string },
  ) {
    try {
      console.log(`Client ${client.id} requested flip_coin for room ${data.roomId}`);

      // Check if this is a replay scenario
      const { room: currentRoom } = await this.gameService.getRoomWithPlayers(data.roomId);

      if (currentRoom.status === 'completed') {
        console.log(`Room ${data.roomId} is completed - checking if ready for replay`);

        // Validate room is ready for replay
        const isReadyForReplay = await this.gameService.isRoomReadyForReplay(data.roomId);
        if (!isReadyForReplay) {
          client.emit('error', {
            message: 'Room is not ready for replay. Both players must be present.',
            type: 'replay_not_ready',
          });
          return;
        }

        console.log(`✅ Room ${data.roomId} validated for replay - starting new game`);

        // Emit room_ready for replay to reset frontend state
        this.server.to(data.roomId).emit('room_ready', {
          room: { ...currentRoom, status: 'full' }, // Show as full for replay
          players: await this.gameService.getPlayersInRoom(data.roomId),
          message: 'Both players ready! Starting new coin flip!',
          isReplay: true, // Flag to indicate this is a replay
        });

        // Short delay before starting flip animation
        await new Promise(resolve => setTimeout(resolve, 1000));
      }

      // Start flip animation
      this.server.to(data.roomId).emit('coin_flip_started', {
        message: 'Coin flip starting...',
      });

      // Simulate coin flip animation delay (2-3 seconds)
      setTimeout(async () => {
        try {
          const result = await this.gameService.flipCoin(data.roomId);
          const { players } = await this.gameService.getRoomWithPlayers(data.roomId);

          // Send result to all players in room with complete player data
          this.server.to(data.roomId).emit('coin_flip_result', {
            flipResult: result.result,
            winnerSide: result.winner,
            winnerPlayer: this.formatPlayerForEvent(result.winnerPlayer),
            totalPot: 20.00,
            players, // Complete formatted player data with names
            game: result.game,
            verification: result.verification,
          });

          // Send individual results to each player with complete data
          players.forEach(player => {
            const isWinner = player.id === result.winnerPlayer.id;
            this.server.to(player.socket_id).emit('game_completed', {
              result: isWinner ? 'win' : 'lose',
              flipResult: result.result,
              yourSide: player.side,
              winnerSide: result.winner,
              winnings: isWinner ? 20.00 : 0,
              players, // CRITICAL: Include player data for UI display with names
              verification: result.verification,
              game: result.game,
            });
          });

          console.log(`Coin flip completed in room ${data.roomId}: ${result.result} (${currentRoom.status === 'completed' ? 'REPLAY' : 'FIRST_GAME'})`);
          console.log(`Manual game result - Flip: ${result.result}, Winner: ${result.winnerPlayer.side}, Players: [${players.map(p => `${p.name}:${p.side}(${p.is_creator ? 'creator' : 'joiner'})`).join(', ')}]`);
        } catch (error) {
          this.server.to(data.roomId).emit('error', {
            message: error.message,
            type: 'flip_coin_error',
          });
        }
      }, 3000); // 3 second delay for animation

    } catch (error) {
      client.emit('error', {
        message: error.message,
        type: 'flip_coin_error',
      });
    }
  }

  @SubscribeMessage('get_room_status')
  async handleGetRoomStatus(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { code: string },
  ) {
    try {
      const room = await this.gameService.getRoomByCode(data.code);
      if (!room) {
        client.emit('error', {
          message: 'Room not found',
          type: 'room_not_found',
        });
        return;
      }

      // Get complete room data with formatted players
      const { players } = await this.gameService.getRoomWithPlayers(room.id);

      client.emit('room_status', {
        room,
        players, // Complete player data with names
      });
    } catch (error) {
      client.emit('error', {
        message: error.message,
        type: 'get_room_status_error',
      });
    }
  }
}