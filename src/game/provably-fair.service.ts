import { Injectable, Logger } from '@nestjs/common';
import { createHash, randomBytes } from 'crypto';

/**
 * Interface for provably fair game results
 * Contains all data needed to verify the fairness of a coin flip
 */
export interface ProvablyFairResult {
  result: 'heads' | 'tails';
  serverSeed: string;
  clientSeed: string;
  nonce: number;
  hash: string;
  isVerifiable: boolean;
}

/**
 * Service implementing provably fair gambling mechanics
 * Uses cryptographic hashing to ensure game results cannot be manipulated
 * Players can verify the fairness of each game using the provided seeds and nonce
 */
@Injectable()
export class ProvablyFairService {
  private readonly logger = new Logger(ProvablyFairService.name);
  /**
   * Generate a cryptographically secure server seed
   * This seed is kept secret until after the game to prevent manipulation
   * @returns 64-character hexadecimal string (32 bytes)
   */
  generateServerSeed(): string {
    const seed = randomBytes(32).toString('hex');
    this.logger.debug('Generated new server seed');
    return seed;
  }

  /**
   * Generate a client seed for additional randomness
   * This can be provided by the client or generated automatically
   * @returns 32-character hexadecimal string (16 bytes)
   */
  generateClientSeed(): string {
    const seed = randomBytes(16).toString('hex');
    this.logger.debug('Generated new client seed');
    return seed;
  }

  /**
   * Create a hash of the server seed for pre-commitment
   * This hash can be shared with players before the game starts
   * @param serverSeed - The server seed to hash
   * @returns SHA-256 hash of the server seed
   */
  hashServerSeed(serverSeed: string): string {
    return createHash('sha256').update(serverSeed).digest('hex');
  }

  generateResult(serverSeed: string, clientSeed: string, nonce: number): ProvablyFairResult {
    // Create HMAC-like hash combining all inputs
    const combinedInput = `${serverSeed}:${clientSeed}:${nonce}`;
    const hash = createHash('sha256').update(combinedInput).digest('hex');

    // Convert first 8 characters of hash to integer
    const hashInt = parseInt(hash.substring(0, 8), 16);

    // Determine heads or tails (even = heads, odd = tails)
    const result = hashInt % 2 === 0 ? 'heads' : 'tails';

    return {
      result,
      serverSeed,
      clientSeed,
      nonce,
      hash,
      isVerifiable: true,
    };
  }

  verifyResult(
    serverSeed: string,
    clientSeed: string,
    nonce: number,
    expectedHash: string,
    expectedResult: 'heads' | 'tails'
  ): boolean {
    try {
      const result = this.generateResult(serverSeed, clientSeed, nonce);
      return result.hash === expectedHash && result.result === expectedResult;
    } catch (error) {
      return false;
    }
  }

  createVerificationData(serverSeed: string, clientSeed: string, nonce: number) {
    return {
      serverSeed,
      clientSeed,
      nonce,
      verificationUrl: `https://tools.pnxbet.com/fair/coinflip?server=${serverSeed}&client=${clientSeed}&nonce=${nonce}`,
      instructions: [
        '1. Copy the server seed, client seed, and nonce',
        '2. Visit any provably fair verification tool',
        '3. Input the values to verify the result',
        '4. The result should match the game outcome'
      ]
    };
  }
}