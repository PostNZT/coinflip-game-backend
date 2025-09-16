import { Injectable } from '@nestjs/common';
import { Room, Player, Game } from '../types/game.types';

@Injectable()
export class MockSupabaseService {
  private rooms: Map<string, Room> = new Map();
  private players: Map<string, Player> = new Map();
  private games: Map<string, Game> = new Map();
  private roomCodes: Set<string> = new Set();

  getClient() {
    return {
      from: (table: string) => {
        switch (table) {
          case 'rooms':
            return this.createRoomsClient();
          case 'players':
            return this.createPlayersClient();
          case 'games':
            return this.createGamesClient();
          default:
            throw new Error(`Unknown table: ${table}`);
        }
      }
    };
  }

  private createRoomsClient() {
    return {
      select: (columns: string) => ({
        eq: (column: string, value: any) => ({
          eq: (column2: string, value2: any) => ({
            single: async () => {
              if (column === 'code' && column2 === 'status') {
                const room = Array.from(this.rooms.values()).find(r => r.code === value && r.status === value2);
                return { data: room || null, error: null };
              }
              if (column === 'id' && column2 === 'status') {
                const room = this.rooms.get(value);
                if (room && room.status === value2) {
                  return { data: room, error: null };
                }
                console.log(`Mock DB: Room lookup failed - ID: ${value}, Expected Status: ${value2}, Found Room:`, room ? `Status: ${room.status}` : 'Not found');
                return { data: null, error: { message: `Room not found with id ${value} and status ${value2}` } };
              }
              return { data: null, error: { message: 'Invalid query parameters' } };
            }
          }),
          single: async () => {
            if (column === 'code') {
              const room = Array.from(this.rooms.values()).find(r => r.code === value);
              return { data: room || null, error: null };
            }
            if (column === 'id') {
              const room = this.rooms.get(value);
              return { data: room || null, error: null };
            }
            return { data: null, error: null };
          }
        })
      }),
      insert: (data: any) => ({
        select: () => ({
          single: async () => {
            const id = `room_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
            const room: Room = {
              id,
              ...data,
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString(),
            };
            this.rooms.set(id, room);
            this.roomCodes.add(data.code);
            return { data: room, error: null };
          }
        })
      }),
      update: (data: any) => ({
        eq: (column: string, value: any) => {
          const basePromise = (async () => {
            if (column === 'id') {
              const room = this.rooms.get(value);
              if (room) {
                const updatedRoom = { ...room, ...data, updated_at: new Date().toISOString() };
                this.rooms.set(value, updatedRoom);
                console.log(`Mock DB: Updated room ${value} with data:`, data, 'New room status:', updatedRoom.status);
                return { error: null };
              }
            }
            return { error: { message: 'Room not found' } };
          })();

          // Create an object that extends the promise with select method
          const enhancedPromise = Object.assign(basePromise, {
            select: () => ({
              single: async () => {
                const result = await basePromise;
                if (column === 'id' && !result.error) {
                  const room = this.rooms.get(value);
                  return { data: room, error: null };
                }
                return { data: null, error: result.error };
              }
            })
          });

          return enhancedPromise;
        }
      }),
      delete: () => ({
        eq: (column: string, value: any) => async () => {
          if (column === 'id') {
            const room = this.rooms.get(value);
            if (room) {
              this.rooms.delete(value);
              this.roomCodes.delete(room.code);
              return { error: null };
            }
          }
          return { error: { message: 'Room not found' } };
        }
      })
    };
  }

  private createPlayersClient() {
    return {
      select: (columns: string) => ({
        eq: (column: string, value: any) => {
          if (column === 'room_id') {
            return (async () => {
              const players = Array.from(this.players.values()).filter(p => p.room_id === value);
              return { data: players, error: null };
            })();
          }
          if (column === 'socket_id') {
            return {
              single: async () => {
                const player = Array.from(this.players.values()).find(p => p.socket_id === value);
                return { data: player || null, error: null };
              }
            };
          }
          return { data: [], error: null };
        }
      }),
      insert: (data: any) => ({
        select: () => ({
          single: async () => {
            const id = `player_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
            const player: Player = {
              id,
              ...data,
              joined_at: new Date().toISOString(),
            };
            this.players.set(id, player);
            return { data: player, error: null };
          }
        })
      }),
      delete: () => ({
        eq: (column: string, value: any) => async () => {
          if (column === 'socket_id') {
            const player = Array.from(this.players.values()).find(p => p.socket_id === value);
            if (player) {
              this.players.delete(player.id);
              return { error: null };
            }
          }
          return { error: null };
        }
      })
    };
  }

  private createGamesClient() {
    return {
      insert: (data: any) => ({
        select: () => ({
          single: async () => {
            const id = `game_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
            const game: Game = {
              id,
              ...data,
              created_at: new Date().toISOString(),
            };
            this.games.set(id, game);
            return { data: game, error: null };
          }
        })
      })
    };
  }

  // Helper method to get players by room ID (simplified)
  async getPlayersInRoom(roomId: string): Promise<Player[]> {
    return Array.from(this.players.values()).filter(p => p.room_id === roomId);
  }
}