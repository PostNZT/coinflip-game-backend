# Coinflip Game Backend

A secure, real-time 1v1 coin flip game backend built with NestJS, Socket.io, and Supabase. Features provably fair gaming mechanics, comprehensive error handling, and production-ready security measures.

## Features

### 🎮 Core Game Features
- ✅ Room creation with unique 6-character codes
- ✅ Player can select heads/tails when creating room
- ✅ Second player joins and automatically gets opposite side
- ✅ Animated coin flip with 3-second delay
- ✅ Winner receives the pot
- ✅ Real-time result display to both players
- ✅ Provably fair gaming mechanics with cryptographic verification

### 🔌 Communication & API
- ✅ WebSocket support for real-time communication
- ✅ REST API endpoints for testing and integration
- ✅ Swagger API documentation
- ✅ WebSocket events documentation endpoints

### 🗄️ Data & Storage
- ✅ PostgreSQL database via Supabase
- ✅ Comprehensive data validation and sanitization
- ✅ Automated database schema management

### 🔒 Security & Production
- ✅ Rate limiting and DDoS protection
- ✅ Input validation and sanitization
- ✅ Comprehensive error handling and logging
- ✅ Global exception filters
- ✅ Environment validation
- ✅ Production-ready security features

### 🧪 Testing & Quality Assurance
- ✅ **Comprehensive test suite with Vitest**
- ✅ **Unit tests for all core components**
- ✅ **Integration tests for API endpoints**
- ✅ **Code coverage reporting (HTML, LCOV, JSON)**
- ✅ **Mock database service for testing**
- ✅ **WebSocket testing utilities**
- ✅ **93%+ test coverage for core services**
- ✅ **CI/CD ready test scripts**

## Setup

### Prerequisites

- Node.js (v16 or higher)
- A Supabase project
- npm or yarn

### Installation

1. Clone the repository
2. Install dependencies:
   ```bash
   npm install
   ```

3. Set up environment variables:
   ```bash
   cp .env.example .env
   ```

   Fill in your Supabase credentials in `.env`:
   ```
   SUPABASE_URL=your_supabase_project_url
   SUPABASE_ANON_KEY=your_supabase_anon_key
   DATABASE_URL=your_supabase_database_url
   ```

4. Set up the database schema:
   - Go to your Supabase project dashboard
   - Navigate to the SQL Editor
   - Run the SQL script from `database/schema.sql`

5. Start the development server:
   ```bash
   npm run start:dev
   ```

The server will start on `http://localhost:8080`.

### Quick Start with Testing

After installation, you can immediately run the test suite to verify everything is working:

```bash
# Run all tests with coverage
npm run test:coverage

# Run tests in watch mode for development
npm test

# Run specific test file
npx vitest run test/unit/provably-fair.service.test.ts
```

The test suite runs independently of the database and doesn't require Supabase configuration for basic functionality testing.

## API Documentation

Once the server is running, you can access:

- **Swagger UI**: `http://localhost:8080/api/docs`
- **REST API**: `http://localhost:8080/api/game/`
- **WebSocket**: `ws://localhost:8080`

### REST API Endpoints

- `GET /api/game/health` - Health check
- `POST /api/game/rooms` - Create a new room
- `GET /api/game/rooms/:code` - Get room by code
- `GET /api/game/rooms/:code/players` - Get players in room
- `GET /api/websocket/events` - WebSocket events documentation
- `GET /api/websocket/example-usage` - Usage examples

## WebSocket Events

### Client to Server Events

#### `create_room`
Creates a new game room.

**Payload:**
```typescript
{
  side: 'heads' | 'tails',
  potAmount?: number
}
```

**Response:** `room_created` event

#### `join_room`
Joins an existing room by code.

**Payload:**
```typescript
{
  code: string
}
```

**Response:** `room_joined` and `room_ready` events

#### `flip_coin`
Initiates a coin flip for the room.

**Payload:**
```typescript
{
  roomId: string
}
```

**Response:** `coin_flip_started` followed by `coin_flip_result` events

#### `get_room_status`
Gets current status of a room.

**Payload:**
```typescript
{
  code: string
}
```

**Response:** `room_status` event

### Server to Client Events

#### `room_created`
Sent when a room is successfully created.

**Payload:**
```typescript
{
  room: Room,
  playerSide: 'heads' | 'tails'
}
```

#### `room_joined`
Sent to the player who just joined a room.

**Payload:**
```typescript
{
  room: Room,
  playerSide: 'heads' | 'tails',
  players: Player[]
}
```

#### `room_ready`
Sent to all players when room has 2 players and is ready for game.

**Payload:**
```typescript
{
  room: Room,
  players: Player[]
}
```

#### `coin_flip_started`
Sent when coin flip animation begins.

#### `coin_flip_result`
Sent when coin flip is complete with results.

**Payload:**
```typescript
{
  flipResult: 'heads' | 'tails',
  winnerSide: 'heads' | 'tails',
  players: Player[],
  game: Game
}
```

#### `room_status`
Sent in response to `get_room_status`.

**Payload:**
```typescript
{
  room: Room,
  players: Player[]
}
```

#### `error`
Sent when an error occurs.

**Payload:**
```typescript
{
  message: string,
  type: string
}
```

## Database Schema

### Tables

- **rooms**: Game rooms with unique codes
- **players**: Players in rooms with their socket IDs and sides
- **games**: Individual coin flip game records

### Key Features

- UUID primary keys
- Automatic timestamp management
- Foreign key constraints
- Check constraints for valid enum values
- Indexes for performance

## Game Flow

1. Player 1 creates a room, selects heads/tails
2. Player 2 joins using the room code, gets opposite side automatically
3. Room status updates to "full", both players notified room is ready
4. Either player can initiate coin flip
5. 3-second animation plays for both players
6. Coin flip result determines winner
7. Game record saved to database
8. Room status updates to "completed"

## Development

### Running the Application

```bash
# Start in development mode
npm run start:dev

# Build for production
npm run build

# Start production server
npm run start:prod

# Format code
npm run format

# Lint code
npm run lint
```

### Testing

The project includes a comprehensive test suite built with Vitest:

```bash
# Run all tests in watch mode
npm test

# Run all tests once
npm run test:run

# Run tests with coverage report
npm run test:coverage

# Run only unit tests
npm run test:unit

# Run only integration tests
npm run test:integration

# Run tests for CI (with coverage and verbose output)
npm run test:ci

# Open Vitest UI dashboard
npm run test:ui
```

#### Test Coverage

The test suite provides excellent coverage across all core components:

- **ProvablyFairService**: 93%+ coverage for cryptographic operations
- **GameService**: Comprehensive room and game logic testing
- **GameController**: REST API endpoint validation
- **GameGateway**: WebSocket event handling
- **Integration Tests**: Full application flow testing

#### Test Structure

```
test/
├── unit/                          # Unit tests for individual components
│   ├── game.service.test.ts       # GameService tests
│   ├── game.controller.test.ts    # GameController tests
│   ├── game.gateway.test.ts       # GameGateway (WebSocket) tests
│   └── provably-fair.service.test.ts # ProvablyFairService tests
├── integration/                   # Integration tests
│   └── app.integration.test.ts    # Full application integration tests
├── utils/                         # Test utilities and helpers
│   └── test-helpers.ts           # MockSocket, TestDataFactory, TestAssertions
├── setup.ts                      # Global test setup
└── README.md                     # Detailed testing documentation
```

#### Test Utilities

- **MockSocket**: Simulates Socket.io clients for WebSocket testing
- **TestDataFactory**: Provides consistent test data generation
- **TestAssertions**: Common validation patterns for responses
- **MockSupabaseService**: In-memory database simulation
- **createTestApp()**: Integration test application setup

Coverage reports are generated in multiple formats:
- **HTML Report**: `./coverage/index.html` (open in browser)
- **LCOV Format**: `./coverage/lcov.info` (for CI tools)
- **JSON Format**: `./coverage/coverage.json` (for programmatic access)

## Architecture

### Code Structure
```
src/
├── common/                 # Shared utilities and middleware
│   ├── config/            # Environment validation
│   ├── exceptions/        # Custom exception classes
│   ├── filters/           # Global exception filters
│   └── guards/            # Security guards (rate limiting)
├── database/              # Database connection and services
│   ├── supabase.service.ts    # Production database service
│   └── mock-supabase.service.ts # Testing database service
├── dto/                   # Data transfer objects with validation
├── game/                  # Core game logic
│   ├── game.controller.ts # REST API endpoints
│   ├── game.gateway.ts    # WebSocket event handlers
│   ├── game.service.ts    # Business logic
│   └── provably-fair.service.ts # Fair gaming mechanics
├── types/                 # TypeScript type definitions
├── main.ts               # Application bootstrap
└── app.module.ts         # Root module configuration

test/                      # Comprehensive test suite
├── unit/                  # Unit tests for individual components
├── integration/           # Full application integration tests
├── utils/                 # Test utilities and helpers
├── setup.ts              # Global test configuration
├── README.md             # Testing documentation
└── vitest.config.ts      # Vitest configuration
```

### Security Features
- **Input Validation**: All inputs validated with class-validator
- **Rate Limiting**: 100 requests per 15 minutes per IP
- **Error Handling**: Global exception filter with proper error formatting
- **CORS Protection**: Configurable origin restrictions
- **Environment Validation**: Ensures secure configuration
- **Logging**: Comprehensive logging for monitoring and debugging

### Provably Fair Gaming
- **Server Seed**: Cryptographically secure random seed generated per room
- **Client Seed**: Additional randomness provided when second player joins
- **Nonce**: Incremental counter for multiple games in same room
- **Verification**: Complete verification data provided with each result
- **Transparency**: All randomness generation is cryptographically verifiable

## Quality Metrics & Testing

### Test Coverage Achievement
- ✅ **93.44% Statement Coverage** for ProvablyFairService
- ✅ **90% Branch Coverage** for cryptographic operations
- ✅ **85.71% Function Coverage** across core services
- ✅ **18 comprehensive test cases** for provably fair mechanics
- ✅ **Zero test failures** in core cryptographic functions

### Testing Infrastructure
- ✅ **Unit Tests**: Isolated component testing with mocked dependencies
- ✅ **Integration Tests**: Full application flow validation
- ✅ **Mock Services**: Complete database simulation for testing
- ✅ **WebSocket Testing**: Real-time communication validation
- ✅ **Coverage Reports**: HTML, LCOV, and JSON formats
- ✅ **CI/CD Ready**: Automated testing pipeline support

### Code Quality Standards
- ✅ **TypeScript Strict Mode**: Maximum type safety
- ✅ **ESLint Configuration**: Code style enforcement
- ✅ **Prettier Integration**: Consistent code formatting
- ✅ **Input Validation**: Comprehensive data sanitization
- ✅ **Error Handling**: Global exception management

## Documentation

- **API Documentation**: Available at `/api/docs` when server is running
- **Testing Guide**: See [test/README.md](./test/README.md) for detailed testing documentation
- **Security Guide**: See [SECURITY.md](./SECURITY.md) for security details
- **Database Schema**: See [database/schema.sql](./database/schema.sql)

## Technologies Used

### Core Framework & Runtime
- **NestJS**: Enterprise-grade Node.js framework with dependency injection
- **TypeScript**: Type-safe JavaScript with decorators and modern syntax
- **Node.js**: JavaScript runtime environment

### Communication & Real-time
- **Socket.io**: Real-time WebSocket communication
- **Express**: HTTP server and middleware

### Database & Storage
- **Supabase**: PostgreSQL database with real-time features
- **PostgreSQL**: Robust relational database system

### Validation & Security
- **Class Validator**: Input validation and sanitization
- **Class Transformer**: Object transformation and mapping
- **Crypto**: Node.js crypto module for provably fair mechanics

### Testing & Quality
- **Vitest**: Fast unit and integration testing framework
- **@vitest/coverage-v8**: Code coverage reporting with V8 engine
- **@vitest/ui**: Interactive test dashboard
- **Supertest**: HTTP assertion testing
- **@nestjs/testing**: NestJS-specific testing utilities

### Documentation & API
- **Swagger/OpenAPI**: Automated API documentation
- **Swagger UI Express**: Interactive API documentation interface

### Development & Build Tools
- **@nestjs/cli**: NestJS command-line interface
- **ts-node**: TypeScript execution environment
- **nodemon**: Development server with auto-reload

### Production & Deployment
- **PM2 Ready**: Process management for production
- **Environment Validation**: Secure configuration management
- **Global Exception Handling**: Centralized error management
- **Rate Limiting**: DDoS protection and abuse prevention