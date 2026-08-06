import test from 'node:test';
import assert from 'node:assert/strict';
import { generate } from 'otplib';
import { generateTotpSecret, verifyTotpCode } from '../../../shared/utils/totp.utils';

test('TOTP Utilities Setup and Invalidation Suite', async (t) => {

  await t.test('generateTotpSecret formats the issuer dynamically with the current month and year', () => {
    const email = 'test@example.com';
    const { secret, otpauthUrl } = generateTotpSecret(email);

    assert.ok(secret, 'Secret key should be generated');
    assert.ok(otpauthUrl, 'otpauth URI should be generated');

    const now = new Date();
    const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    const expectedMonthYear = `${months[now.getMonth()]} ${now.getFullYear()}`;
    const expectedIssuer = `Sofiya Bangles (${expectedMonthYear})`;

    // Verify the URL contains percent-encoded or plain representation of the dynamic issuer
    const url = new URL(otpauthUrl);
    const issuerParam = url.searchParams.get('issuer');
    
    assert.equal(issuerParam, expectedIssuer, 'Issuer parameter should match the month/year label');
  });

  await t.test('verifyTotpCode accepts currently valid OTP code and rejects incorrect ones', async () => {
    const email = 'user@example.com';
    const { secret } = generateTotpSecret(email);

    // Generate a valid OTP code using otplib generator
    const code = await generate({ secret });

    // Verify it is accepted
    const isValid = verifyTotpCode(secret, code);
    assert.equal(isValid, true, 'OTP code from the same secret should be accepted');

    // Verify an incorrect code is rejected
    const isInvalid = verifyTotpCode(secret, '000000');
    assert.equal(isInvalid, false, 'Invalid OTP code should be rejected');
  });

  await t.test('Secret rotation invalidates old authenticator entries (old OTP rejection)', async () => {
    const email = 'user@example.com';
    
    // 1. First setup (representing the previous/old configuration)
    const setup1 = generateTotpSecret(email);
    
    // 2. Second setup (representing rotation/regeneration)
    const setup2 = generateTotpSecret(email);

    // Make sure they generated different secrets
    assert.notEqual(setup1.secret, setup2.secret, 'Rotated secrets should be different');

    // Generate a code using the first (old) secret
    const oldCode = await generate({ secret: setup1.secret });

    // Verify the old code is rejected against the second (new active) secret
    const isOldCodeAccepted = verifyTotpCode(setup2.secret, oldCode);
    assert.equal(isOldCodeAccepted, false, 'OTP code from the old secret must be rejected against the new secret');

    // Generate a code using the second (new) secret
    const newCode = await generate({ secret: setup2.secret });

    // Verify the new code is accepted against the second (new active) secret
    const isNewCodeAccepted = verifyTotpCode(setup2.secret, newCode);
    assert.equal(isNewCodeAccepted, true, 'OTP code from the new secret should be accepted');
  });
});
