import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import { ValidationPipe } from '@nestjs/common';
import { AllExceptionsFilter } from '../../src/common/filters/all-exceptions.filter';
import { AppModule } from '../../src/app.module';
import { SupabaseService } from '../../src/database/supabase.service';
import { MockSupabaseService } from '../../src/database/mock-supabase.service';

/**
 * Creates a test application with the same configuration as main.ts
 */
export async function createTestApp(): Promise<INestApplication> {
  const moduleFixture: TestingModule = await Test.createTestingModule({
    imports: [AppModule],
  })
    .overrideProvider(SupabaseService)
    .useClass(MockSupabaseService)
    .compile();

  const app = moduleFixture.createNestApplication();

  // Apply the same configuration as main.ts
  app.useGlobalFilters(new AllExceptionsFilter());
  app.useGlobalPipes(
    new ValidationPipe({
      transform: true,
      whitelist: true,
      forbidNonWhitelisted: true,
      transformOptions: {
        enableImplicitConversion: true,
      },
    }),
  );

  await app.init();
  return app;
}

/**
 * Mock data factories for consistent test data
 */
export const TestDataFactory = {
  createRoom: (overrides: Partial<any> = {}) => ({
    id: 'room-test-123',
    code: 'TEST123',
    creator_side: 'heads',
    stake_amount: 10,
    total_pot: 20,
    status: 'waiting',
    server_seed: 'a'.repeat(64),
    client_seed: null,
    nonce: 0,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    ...overrides,
  }),

  createPlayer: (overrides: Partial<any> = {}) => ({
    id: 'player-test-123',
    room_id: 'room-test-123',
    socket_id: 'socket-test-123',
    side: 'heads',
    is_creator: true,
    stake_amount: 10,
    has_paid: false,
    joined_at: new Date().toISOString(),
    ...overrides,
  }),

  createGame: (overrides: Partial<any> = {}) => ({
    id: 'game-test-123',
    room_id: 'room-test-123',
    flip_result: 'heads',
    winner_side: 'heads',
    winner_player_id: 'player-test-123',
    total_pot: 20,
    server_seed: 'a'.repeat(64),
    client_seed: 'b'.repeat(32),
    nonce: 1,
    hash_result: 'hash-test-123',
    is_verified: false,
    created_at: new Date().toISOString(),
    completed_at: new Date().toISOString(),
    ...overrides,
  }),

  createCreateRoomDto: (overrides: Partial<any> = {}) => ({
    side: 'heads' as const,
    ...overrides,
  }),

  createJoinRoomDto: (overrides: Partial<any> = {}) => ({
    code: 'TEST123',
    ...overrides,
  }),

  createFlipCoinDto: (overrides: Partial<any> = {}) => ({
    roomId: 'room-test-123',
    ...overrides,
  }),

  createGetRoomStatusDto: (overrides: Partial<any> = {}) => ({
    code: 'TEST123',
    ...overrides,
  }),
};

/**
 * Async test utilities
 */
export const TestUtils = {
  /**
   * Wait for a specified amount of time
   */
  wait: (ms: number): Promise<void> => {
    return new Promise(resolve => setTimeout(resolve, ms));
  },

  /**
   * Wait for a condition to be true
   */
  waitFor: async (
    condition: () => boolean | Promise<boolean>,
    timeout: number = 5000,
    interval: number = 100,
  ): Promise<void> => {
    const start = Date.now();
    while (Date.now() - start < timeout) {
      if (await condition()) {
        return;
      }
      await TestUtils.wait(interval);
    }
    throw new Error(`Condition not met within ${timeout}ms`);
  },

  /**
   * Generate a random string of specified length
   */
  randomString: (length: number = 6): string => {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let result = '';
    for (let i = 0; i < length; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
  },

  /**
   * Generate a random hex string of specified length
   */
  randomHex: (length: number = 32): string => {
    const chars = 'abcdef0123456789';
    let result = '';
    for (let i = 0; i < length; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
  },
};


/**
 * Mock Socket.io client for testing
 */
export class MockSocket {
  public id: string;
  private events: Map<string, Function[]> = new Map();
  private joinedRooms: Set<string> = new Set();

  constructor(id: string = 'mock-socket-123') {
    this.id = id;
  }

  join(room: string): void {
    this.joinedRooms.add(room);
  }

  leave(room: string): void {
    this.joinedRooms.delete(room);
  }

  emit(event: string, data?: any): void {
    // Simulate emitting to server - in tests, this would trigger handlers
  }

  on(event: string, callback: Function): void {
    if (!this.events.has(event)) {
      this.events.set(event, []);
    }
    this.events.get(event)!.push(callback);
  }

  off(event: string, callback?: Function): void {
    if (!this.events.has(event)) return;

    if (callback) {
      const handlers = this.events.get(event)!;
      const index = handlers.indexOf(callback);
      if (index > -1) {
        handlers.splice(index, 1);
      }
    } else {
      this.events.delete(event);
    }
  }

  // Simulate receiving an event from server
  simulateReceive(event: string, data?: any): void {
    const handlers = this.events.get(event) || [];
    handlers.forEach(handler => handler(data));
  }

  // Get rooms the socket has joined
  getRooms(): string[] {
    return Array.from(this.joinedRooms);
  }

  // Check if socket is in a specific room
  isInRoom(room: string): boolean {
    return this.joinedRooms.has(room);
  }
}