import { describe, it, expect } from 'vitest';
import { StorageService } from '../server/src/storage.js';

describe('Auth & Email Verification Flow', () => {
  it('creates user with verification code and validates email verification', async () => {
    const storage = new StorageService();
    const testEmail = `test_candidate_${Date.now()}@example.com`;
    const code = '654321';

    const newUser = {
      id: `u_test_${Date.now()}`,
      email: testEmail,
      passwordHash: Buffer.from('StrongPass@2026!').toString('base64'),
      name: 'Verification Tester',
      createdAt: new Date().toISOString(),
      isVerified: false,
      verificationCode: code,
    };

    await storage.saveUser(newUser);

    // Retrieve user and check unverified status
    const retrieved = await storage.findUserByEmail(testEmail);
    expect(retrieved).toBeDefined();
    expect(retrieved?.isVerified).toBe(false);
    expect(retrieved?.verificationCode).toBe(code);

    // Simulate verification
    retrieved!.isVerified = true;
    delete retrieved!.verificationCode;
    await storage.saveUser(retrieved!);

    const verifiedUser = await storage.findUserByEmail(testEmail);
    expect(verifiedUser?.isVerified).toBe(true);
    expect(verifiedUser?.verificationCode).toBeUndefined();
  });
});
