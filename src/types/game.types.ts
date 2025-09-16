export type CoinSide = 'heads' | 'tails';

export type RoomStatus = 'waiting' | 'full' | 'playing' | 'completed';

export interface Room {
  id: string;
  code: string;
  creator_side: CoinSide;
  stake_amount: number;
  total_pot: number;
  status: RoomStatus;
  server_seed: string;
  client_seed?: string;
  nonce: number;
  created_at: string;
  updated_at: string;
}

export interface Player {
  id: string;
  room_id: string;
  socket_id: string;
  name: string;
  side: CoinSide;
  is_creator: boolean;
  stake_amount: number;
  has_paid: boolean;
  joined_at: string;
}

export interface Game {
  id: string;
  room_id: string;
  flip_result: CoinSide;
  winner_side: CoinSide;
  winner_player_id: string;
  total_pot: number;
  server_seed: string;
  client_seed: string;
  nonce: number;
  hash_result: string;
  is_verified: boolean;
  created_at: string;
  completed_at?: string;
}

export interface CreateRoomDto {
  side: CoinSide;
  playerName?: string;
}

export interface JoinRoomDto {
  code: string;
  playerName?: string;
}

export interface FlipCoinDto {
  roomId: string;
}