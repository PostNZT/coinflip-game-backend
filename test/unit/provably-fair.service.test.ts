import { Test, TestingModule } from '@nestjs/testing';
import { describe, it, expect, beforeEach } from 'vitest';
import { ProvablyFairService } from '../../src/game/provably-fair.service';
import { createHash } from 'crypto';

describe('ProvablyFairService', () => {
  let service: ProvablyFairService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [ProvablyFairService],
    }).compile();

    service = module.get<ProvablyFairService>(ProvablyFairService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('generateServerSeed', () => {
    it('should generate a 64-character hex string', () => {
      const seed = service.generateServerSeed();

      expect(seed).toHaveLength(64);
      expect(seed).toMatch(/^[a-f0-9]{64}$/);
    });

    it('should generate unique seeds', () => {
      const seed1 = service.generateServerSeed();
      const seed2 = service.generateServerSeed();

      expect(seed1).not.toBe(seed2);
    });
  });

  describe('generateClientSeed', () => {
    it('should generate a 32-character hex string', () => {
      const seed = service.generateClientSeed();

      expect(seed).toHaveLength(32);
      expect(seed).toMatch(/^[a-f0-9]{32}$/);
    });

    it('should generate unique seeds', () => {
      const seed1 = service.generateClientSeed();
      const seed2 = service.generateClientSeed();

      expect(seed1).not.toBe(seed2);
    });
  });

  describe('generateResult', () => {
    it('should generate deterministic results', () => {
      const serverSeed = 'a'.repeat(64);
      const clientSeed = 'b'.repeat(32);
      const nonce = 1;

      const result1 = service.generateResult(serverSeed, clientSeed, nonce);
      const result2 = service.generateResult(serverSeed, clientSeed, nonce);

      expect(result1).toEqual(result2);
      expect(result1.result).toMatch(/^(heads|tails)$/);
      expect(result1.hash).toHaveLength(64);
      expect(result1.serverSeed).toBe(serverSeed);
      expect(result1.clientSeed).toBe(clientSeed);
      expect(result1.nonce).toBe(nonce);
    });

    it('should generate different results for different inputs', () => {
      const serverSeed = 'a'.repeat(64);
      const clientSeed = 'b'.repeat(32);

      const result1 = service.generateResult(serverSeed, clientSeed, 1);
      const result2 = service.generateResult(serverSeed, clientSeed, 2);

      expect(result1.hash).not.toBe(result2.hash);
      // Results might be the same (50/50 chance), but hashes should be different
    });

    it('should generate different results for different server seeds', () => {
      const serverSeed1 = 'a'.repeat(64);
      const serverSeed2 = 'b'.repeat(64);
      const clientSeed = 'c'.repeat(32);
      const nonce = 1;

      const result1 = service.generateResult(serverSeed1, clientSeed, nonce);
      const result2 = service.generateResult(serverSeed2, clientSeed, nonce);

      expect(result1.hash).not.toBe(result2.hash);
    });

    it('should generate different results for different client seeds', () => {
      const serverSeed = 'a'.repeat(64);
      const clientSeed1 = 'b'.repeat(32);
      const clientSeed2 = 'c'.repeat(32);
      const nonce = 1;

      const result1 = service.generateResult(serverSeed, clientSeed1, nonce);
      const result2 = service.generateResult(serverSeed, clientSeed2, nonce);

      expect(result1.hash).not.toBe(result2.hash);
    });
  });

  describe('verifyResult', () => {
    it('should verify a valid result', () => {
      const serverSeed = 'a'.repeat(64);
      const clientSeed = 'b'.repeat(32);
      const nonce = 1;

      const result = service.generateResult(serverSeed, clientSeed, nonce);
      const isValid = service.verifyResult(serverSeed, clientSeed, nonce, result.hash, result.result);

      expect(isValid).toBe(true);
    });

    it('should reject invalid result with wrong hash', () => {
      const serverSeed = 'a'.repeat(64);
      const clientSeed = 'b'.repeat(32);
      const nonce = 1;

      const result = service.generateResult(serverSeed, clientSeed, nonce);
      const isValid = service.verifyResult(serverSeed, clientSeed, nonce, 'invalid-hash', result.result);

      expect(isValid).toBe(false);
    });

    it('should reject result with wrong expected result', () => {
      const serverSeed = 'a'.repeat(64);
      const clientSeed = 'b'.repeat(32);
      const nonce = 1;

      const result = service.generateResult(serverSeed, clientSeed, nonce);
      const wrongResult = result.result === 'heads' ? 'tails' : 'heads';
      const isValid = service.verifyResult(serverSeed, clientSeed, nonce, result.hash, wrongResult);

      expect(isValid).toBe(false);
    });

    it('should reject result with modified server seed', () => {
      const serverSeed = 'a'.repeat(64);
      const clientSeed = 'b'.repeat(32);
      const nonce = 1;

      const result = service.generateResult(serverSeed, clientSeed, nonce);
      const isValid = service.verifyResult('b'.repeat(64), clientSeed, nonce, result.hash, result.result);

      expect(isValid).toBe(false);
    });

    it('should reject result with modified client seed', () => {
      const serverSeed = 'a'.repeat(64);
      const clientSeed = 'b'.repeat(32);
      const nonce = 1;

      const result = service.generateResult(serverSeed, clientSeed, nonce);
      const isValid = service.verifyResult(serverSeed, 'c'.repeat(32), nonce, result.hash, result.result);

      expect(isValid).toBe(false);
    });

    it('should reject result with modified nonce', () => {
      const serverSeed = 'a'.repeat(64);
      const clientSeed = 'b'.repeat(32);
      const nonce = 1;

      const result = service.generateResult(serverSeed, clientSeed, nonce);
      const isValid = service.verifyResult(serverSeed, clientSeed, 2, result.hash, result.result);

      expect(isValid).toBe(false);
    });
  });

  describe('createVerificationData', () => {
    it('should return verification data', () => {
      const serverSeed = 'a'.repeat(64);
      const clientSeed = 'b'.repeat(32);
      const nonce = 1;

      const verificationData = service.createVerificationData(serverSeed, clientSeed, nonce);

      expect(verificationData).toEqual({
        serverSeed,
        clientSeed,
        nonce,
        verificationUrl: expect.stringContaining('https://tools.pnxbet.com'),
        instructions: expect.arrayContaining([
          expect.stringContaining('Copy the server seed'),
          expect.stringContaining('Visit any provably fair'),
          expect.stringContaining('Input the values'),
          expect.stringContaining('The result should match'),
        ]),
      });
    });
  });

  describe('hash computation', () => {
    it('should match Node.js crypto hash', () => {
      const serverSeed = 'test-server-seed-123456789abcdef0123456789abcdef0123456789abcdef0';
      const clientSeed = 'test-client-seed-123456789abcdef0';
      const nonce = 42;

      const result = service.generateResult(serverSeed, clientSeed, nonce);

      // Manually compute the expected hash
      const combinedInput = `${serverSeed}:${clientSeed}:${nonce}`;
      const expectedHash = createHash('sha256').update(combinedInput).digest('hex');

      expect(result.hash).toBe(expectedHash);
    });

    it('should produce fair distribution over many trials', () => {
      const trials = 1000;
      let headsCount = 0;
      let tailsCount = 0;

      for (let i = 0; i < trials; i++) {
        const serverSeed = service.generateServerSeed();
        const clientSeed = service.generateClientSeed();
        const nonce = i + 1;

        const result = service.generateResult(serverSeed, clientSeed, nonce);

        if (result.result === 'heads') {
          headsCount++;
        } else {
          tailsCount++;
        }
      }

      const headsPercentage = (headsCount / trials) * 100;
      const tailsPercentage = (tailsCount / trials) * 100;

      // Should be roughly 50/50 (allowing 10% variance for small sample)
      expect(headsPercentage).toBeGreaterThan(40);
      expect(headsPercentage).toBeLessThan(60);
      expect(tailsPercentage).toBeGreaterThan(40);
      expect(tailsPercentage).toBeLessThan(60);
      expect(headsCount + tailsCount).toBe(trials);
    });
  });
});