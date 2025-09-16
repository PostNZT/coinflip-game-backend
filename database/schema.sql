-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Game rooms table
CREATE TABLE rooms (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  code VARCHAR(6) UNIQUE NOT NULL,
  creator_side VARCHAR(5) CHECK (creator_side IN ('heads', 'tails')) NOT NULL,
  stake_amount DECIMAL(10,2) DEFAULT 10.00 NOT NULL,
  total_pot DECIMAL(10,2) DEFAULT 20.00 NOT NULL,
  status VARCHAR(20) CHECK (status IN ('waiting', 'full', 'playing', 'completed')) DEFAULT 'waiting',
  server_seed VARCHAR(64) NOT NULL,
  client_seed VARCHAR(64),
  nonce INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Players table
CREATE TABLE players (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  room_id UUID REFERENCES rooms(id) ON DELETE CASCADE,
  socket_id VARCHAR(255) NOT NULL,
  name VARCHAR(50) NOT NULL, -- Player display name (REQUIRED for frontend compatibility)
  side VARCHAR(5) CHECK (side IN ('heads', 'tails')),
  is_creator BOOLEAN DEFAULT FALSE,
  stake_amount DECIMAL(10,2) DEFAULT 10.00 NOT NULL,
  has_paid BOOLEAN DEFAULT FALSE,
  joined_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Games table (individual coin flip games within a room)
CREATE TABLE games (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  room_id UUID REFERENCES rooms(id) ON DELETE CASCADE,
  flip_result VARCHAR(5) CHECK (flip_result IN ('heads', 'tails')),
  winner_side VARCHAR(5) CHECK (winner_side IN ('heads', 'tails')),
  winner_player_id UUID REFERENCES players(id),
  total_pot DECIMAL(10,2) NOT NULL,
  server_seed VARCHAR(64) NOT NULL,
  client_seed VARCHAR(64) NOT NULL,
  nonce INTEGER NOT NULL,
  hash_result VARCHAR(64) NOT NULL,
  is_verified BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  completed_at TIMESTAMP WITH TIME ZONE
);

-- Create indexes for better performance
CREATE INDEX idx_rooms_code ON rooms(code);
CREATE INDEX idx_players_room_id ON players(room_id);
CREATE INDEX idx_players_socket_id ON players(socket_id);
CREATE INDEX idx_players_name ON players(name); -- For player name searches
CREATE INDEX idx_games_room_id ON games(room_id);
CREATE INDEX idx_games_winner_player_id ON games(winner_player_id);

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Trigger to automatically update updated_at
CREATE TRIGGER update_rooms_updated_at
  BEFORE UPDATE ON rooms
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();