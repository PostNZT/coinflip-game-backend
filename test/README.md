# Test Suite Documentation

## Overview
This test suite provides comprehensive coverage for the coinflip game backend using Vitest. It includes unit tests, integration tests, and code coverage reporting.

## Test Structure

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
│   └── test-helpers.ts           # Common test utilities and mock factories
├── setup.ts                      # Global test setup
└── README.md                     # This file
```

## Running Tests

### All Tests
```bash
npm test                  # Run all tests in watch mode
npm run test:run         # Run all tests once
npm run test:ci          # Run tests with coverage for CI
```

### Specific Test Types
```bash
npm run test:unit        # Run only unit tests
npm run test:integration # Run only integration tests
npm run test:watch       # Run tests in watch mode
npm run test:ui          # Open Vitest UI dashboard
```

### Code Coverage
```bash
npm run test:coverage    # Generate code coverage report
```

Coverage reports are generated in:
- `./coverage/index.html` - HTML report (open in browser)
- `./coverage/lcov.info` - LCOV format for CI tools
- Terminal output during test run

## Test Categories

### Unit Tests
Tests individual components in isolation with mocked dependencies:

- **GameService**: Room creation, joining, coin flipping logic
- **GameController**: REST API endpoint handling, error responses
- **GameGateway**: WebSocket event handling, real-time communication
- **ProvablyFairService**: Cryptographic seed generation and verification

### Integration Tests
Tests the complete application flow:

- **API Endpoints**: Full request/response cycle testing
- **Validation**: Input validation and error handling
- **Security**: Rate limiting, malicious input rejection
- **Documentation Endpoints**: WebSocket documentation endpoints

## Test Utilities

### MockSocket
Simulates Socket.io client for testing WebSocket functionality:
```typescript
const mockSocket = new MockSocket('test-socket-id');
mockSocket.emit('create_room', { side: 'heads' });
mockSocket.simulateReceive('room_created', roomData);
```

### TestDataFactory
Provides consistent test data:
```typescript
const room = TestDataFactory.createRoom({ side: 'tails' });
const player = TestDataFactory.createPlayer({ is_creator: false });
```

### TestAssertions
Common assertion patterns:
```typescript
TestAssertions.isValidRoom(response.body);
TestAssertions.isValidRoomCode('ABC123');
TestAssertions.isValidTimestamp(room.created_at);
```

## Coverage Targets

The test suite aims for:
- **Lines**: 80%+ coverage
- **Functions**: 80%+ coverage
- **Branches**: 80%+ coverage
- **Statements**: 80%+ coverage

## Mocking Strategy

### Database Mocking
Uses `MockSupabaseService` to simulate database operations without requiring a real database connection.

### Service Mocking
Individual services are mocked in unit tests to ensure isolation and predictable behavior.

### External Dependencies
All external dependencies (crypto, Socket.io, etc.) are mocked or stubbed for consistent testing.

## Best Practices

### Test Organization
- One test file per source file
- Descriptive test names that explain the scenario
- Grouped tests using `describe` blocks
- Clear arrange/act/assert structure

### Test Data
- Use factory functions for consistent test data
- Avoid hardcoded values where possible
- Clean up test data between tests

### Assertions
- Test both success and error cases
- Verify all relevant properties in responses
- Use specific matchers (toEqual, toMatch, etc.)

### Async Testing
- Properly handle promises and async operations
- Use appropriate timeouts for async tests
- Clean up resources in afterEach/afterAll

## Configuration

### Vitest Config (`vitest.config.ts`)
- Node.js environment for backend testing
- Global test utilities available
- Coverage configuration with thresholds
- Path aliases for imports

### Environment Setup (`test/setup.ts`)
- Mock environment variables
- Global test configuration
- Suppress console output during tests

## Continuous Integration

For CI environments, use:
```bash
npm run test:ci
```

This command:
- Runs all tests once (no watch mode)
- Generates coverage reports
- Provides verbose output for debugging
- Fails if coverage thresholds are not met

## Debugging Tests

### Individual Test Files
```bash
npx vitest run test/unit/game.service.test.ts
```

### Specific Test Cases
```bash
npx vitest run -t "should create room with heads side"
```

### Debug Mode
```bash
npx vitest run --inspect-brk
```

## Adding New Tests

1. **Create test file** following naming convention: `*.test.ts`
2. **Import dependencies** from `@nestjs/testing` and `vitest`
3. **Use test utilities** from `test/utils/test-helpers.ts`
4. **Follow existing patterns** for consistency
5. **Update coverage** if adding new source files

## Test Performance

- Tests should run quickly (< 5 seconds total)
- Use mocks to avoid expensive operations
- Parallel execution enabled by default
- Watch mode for development efficiency