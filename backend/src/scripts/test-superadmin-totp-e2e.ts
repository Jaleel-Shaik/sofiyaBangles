import { db } from "../shared/config/firebase";
import { initiateLoginService, verify2FAOtpService } from "../features/auth/services/totp.service";
import { decryptSecret } from "../shared/utils/crypto.utils";
import { generateTotpCode } from "../shared/utils/totp.utils";
import bcrypt from "bcryptjs";


async function runTests() {
  console.log("=== STARTING SUPERADMIN TOTP E2E TEST SUITE ===\n");
  let passed = 0;
  let failed = 0;

  function assert(condition: boolean, message: string) {
    if (condition) {
      console.log(`✅ PASS: ${message}`);
      passed++;
    } else {
      console.error(`❌ FAIL: ${message}`);
      failed++;
    }
  }

  try {
    // 0. Reset SuperAdmin to initial seeded state
    console.log("-> Resetting SuperAdmin to initial unconfigured state...");
    const adminDocRef = db.collection("admins").doc("super_admin_seeded_01");
    const adminSnap = await adminDocRef.get();
    if (!adminSnap.exists) {
      throw new Error("SuperAdmin seeded document does not exist!");
    }
    const originalAdminData = adminSnap.data();
    const TEST_EMAIL = process.env.SUPER_ADMIN_SEED_EMAIL || originalAdminData?.email || "test-superadmin@sofiya.internal";
    const TEST_PASSWORD = process.env.SUPER_ADMIN_SEED_PASSWORD || "TestSuperAdmin@123!Secure";

    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(TEST_PASSWORD, salt);

    await adminDocRef.set({
      id: "super_admin_seeded_01",
      email: TEST_EMAIL,
      full_name: originalAdminData?.full_name || "Super Administrator",
      phone: originalAdminData?.phone || null,
      role: "super_admin",
      user_type: "admin",
      password_hash: passwordHash,
      isActive: true,
      is_active: true,
      twoFactorEnabled: false,
      is_2fa_enabled: false,
      twoFactorSecretEncrypted: null,
      two_fa_secret: null,
      pendingTwoFactorSecretEncrypted: null,
      backupCodesHash: [],
      failedOtpAttempts: 0,
      accountLockedUntil: null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }, { merge: true });

    // Test 1: First login with valid password
    console.log("\n[Test 1 & 2 & 3 & 4] First login (setup required)");
    const loginResult = await initiateLoginService(
      TEST_EMAIL,
      TEST_PASSWORD,
      { ip_address: "127.0.0.1", user_agent: "TestAgent/1.0" },
      "web"
    ) as any;

    assert(loginResult.status === "OTP_PENDING", "Challenge status is OTP_PENDING");
    assert(loginResult.isTotpSetupRequired === true, "isTotpSetupRequired is true on first login");
    assert(typeof loginResult.challengeId === "string" && loginResult.challengeId.length > 0, "challengeId is generated");
    assert(typeof loginResult.qrCodeUrl === "string" && loginResult.qrCodeUrl.startsWith("data:image/png;base64,"), "qrCodeUrl is generated");
    assert(typeof loginResult.secret === "string" && loginResult.secret.length > 10, "Base32 secret returned for setup");
    assert(loginResult.access_token === undefined, "NO access token issued before OTP verification");
    assert(loginResult.refresh_token === undefined, "NO refresh token issued before OTP verification");
    assert(loginResult.user === undefined, "NO user session object issued before OTP verification");

    // Check challenge doc in Firestore
    const challengeSnap = await db.collection("login_challenges").doc(loginResult.challengeId).get();
    assert(challengeSnap.exists, "login_challenges record exists in Firestore");
    const challengeData = challengeSnap.data()!;
    assert(challengeData.status === "OTP_PENDING", "Challenge doc status is OTP_PENDING");
    assert(challengeData.failedAttempts === 0, "Challenge failedAttempts initialized to 0");
    const createdAtMs = new Date(challengeData.createdAt).getTime();
    const expiresAtMs = new Date(challengeData.expiresAt).getTime();
    assert(expiresAtMs - createdAtMs === 10 * 60 * 1000, "Challenge expiresAt is exactly createdAt + 10 minutes");

    // Check profile in Firestore
    const profileSnap1 = await adminDocRef.get();
    const profile1 = profileSnap1.data()!;
    assert(profile1.twoFactorEnabled === false, "twoFactorEnabled is still false before verification");
    assert(profile1.twoFactorSecretEncrypted === null, "twoFactorSecretEncrypted is still null");
    assert(typeof profile1.pendingTwoFactorSecretEncrypted === "string", "pendingTwoFactorSecretEncrypted is stored encrypted");

    // Test 5 & 6: Verify setup OTP with ±30s tolerance & Generate 10 single-use backup codes
    console.log("\n[Test 5 & 6] First-time OTP Verification & Backup Code Generation");
    const decryptedSecret = decryptSecret(profile1.pendingTwoFactorSecretEncrypted);
    const validOtp = generateTotpCode(decryptedSecret);

    const verifyResult = await verify2FAOtpService(
      loginResult.otp_pending_token,
      validOtp,
      { ip_address: "127.0.0.1", user_agent: "TestAgent/1.0" },
      "web",
      loginResult.challengeId,
      TEST_EMAIL,
      false
    ) as any;

    assert(typeof verifyResult.access_token === "string", "Access token issued upon successful OTP verification");
    assert(typeof verifyResult.refresh_token === "string", "Refresh token issued upon successful OTP verification");
    assert(Array.isArray(verifyResult.backupCodes), "backupCodes array is returned");
    assert(verifyResult.backupCodes?.length === 10, "Exactly 10 backup codes generated");

    // Check profile updated state
    const profileSnap2 = await adminDocRef.get();
    const profile2 = profileSnap2.data()!;
    assert(profile2.twoFactorEnabled === true, "twoFactorEnabled is now TRUE");
    assert(profile2.twoFactorSecretEncrypted === profile1.pendingTwoFactorSecretEncrypted, "pending secret moved to permanent twoFactorSecretEncrypted");
    assert(profile2.pendingTwoFactorSecretEncrypted === null, "pendingTwoFactorSecretEncrypted cleared");
    assert(Array.isArray(profile2.backupCodesHash) && profile2.backupCodesHash.length === 10, "10 hashed backup codes stored in database");
    // Ensure plaintext codes were not stored in DB
    const storedPlaintext = verifyResult.backupCodes.some((code: string) => profile2.backupCodesHash.includes(code));
    assert(!storedPlaintext, "Database stores only bcrypt hashes, NOT plaintext codes");

    // Test 7 & 8: Subsequent login (no QR code generated)
    console.log("\n[Test 7 & 8] Subsequent Login (configured 2FA)");
    const loginResult2 = await initiateLoginService(
      TEST_EMAIL,
      TEST_PASSWORD,
      { ip_address: "127.0.0.1", user_agent: "TestAgent/1.0" },
      "web"
    ) as any;

    assert(loginResult2.status === "OTP_PENDING", "Subsequent login returns OTP_PENDING");
    assert(loginResult2.isTotpSetupRequired === false, "isTotpSetupRequired is FALSE");
    assert(loginResult2.qrCodeUrl === null || loginResult2.qrCodeUrl === undefined, "NO QR code returned on subsequent login");
    assert(loginResult2.secret === null || loginResult2.secret === undefined, "NO secret returned on subsequent login");

    const subsequentOtp = generateTotpCode(decryptedSecret);

    // Verify replay protection catches reused OTP within the same 30s epoch
    let replayBlocked = false;
    try {
      await verify2FAOtpService(
        loginResult2.otp_pending_token,
        subsequentOtp,
        { ip_address: "127.0.0.1", user_agent: "TestAgent/1.0" },
        "web",
        loginResult2.challengeId,
        TEST_EMAIL,
        false
      );
    } catch (err: any) {
      if (err.message === "OTP_ALREADY_USED") {
        replayBlocked = true;
      }
    }
    assert(replayBlocked, "Replay attack protection catches reused OTP token");

    // Clear used_otp_tokens for this test user to simulate the next 30s epoch
    await db.collection("used_otp_tokens").doc(`super_admin_seeded_01_${subsequentOtp}`).delete();

    const verifyResult2 = await verify2FAOtpService(
      loginResult2.otp_pending_token,
      subsequentOtp,
      { ip_address: "127.0.0.1", user_agent: "TestAgent/1.0" },
      "web",
      loginResult2.challengeId,
      TEST_EMAIL,
      false
    ) as any;
    assert(typeof verifyResult2.access_token === "string", "Subsequent login OTP verification issues tokens");
    assert(verifyResult2.backupCodes === undefined || verifyResult2.backupCodes.length === 0, "No backup codes returned on subsequent login");

    // Test 9 & 10: Backup Code Recovery Flow (single-use consumption)
    console.log("\n[Test 9 & 10] Backup Code Recovery & Invalidation");
    const loginResult3 = await initiateLoginService(
      TEST_EMAIL,
      TEST_PASSWORD,
      { ip_address: "127.0.0.1", user_agent: "TestAgent/1.0" },
      "web"
    ) as any;

    const recoveryCodeToUse = verifyResult.backupCodes[0];
    const backupVerifyResult = await verify2FAOtpService(
      loginResult3.otp_pending_token,
      recoveryCodeToUse,
      { ip_address: "127.0.0.1", user_agent: "TestAgent/1.0" },
      "web",
      loginResult3.challengeId,
      TEST_EMAIL,
      true
    ) as any;
    assert(typeof backupVerifyResult.access_token === "string", "Backup recovery code successfully verifies and issues tokens");

    // Verify code was invalidated (9 remaining)
    const profileSnap3 = await adminDocRef.get();
    const profile3 = profileSnap3.data()!;
    assert(profile3.backupCodesHash.length === 9, "Used backup code was removed (9 codes remaining)");

    // Attempt to reuse the same backup code
    console.log("\n[Test 10] Attempting to reuse already consumed backup code");
    const loginResult4 = await initiateLoginService(
      TEST_EMAIL,
      TEST_PASSWORD,
      { ip_address: "127.0.0.1", user_agent: "TestAgent/1.0" },
      "web"
    ) as any;

    let reuseFailed = false;
    try {
      await verify2FAOtpService(
        loginResult4.otp_pending_token,
        recoveryCodeToUse,
        { ip_address: "127.0.0.1", user_agent: "TestAgent/1.0" },
        "web",
        loginResult4.challengeId,
        TEST_EMAIL,
        true
      );
    } catch (err: any) {
      reuseFailed = true;
      assert(err.message === "INVALID_BACKUP_CODE", "Reused backup code rejected with INVALID_BACKUP_CODE");
    }
    assert(reuseFailed, "Consumed backup code cannot be reused");

    // Test 11 & 12: Rate Limiting & Account Lockout (5 failed attempts -> 15 min lock)
    console.log("\n[Test 11 & 12] Rate Limiting & 15-minute Account Lockout");
    let lockoutTriggered = false;
    for (let i = 1; i <= 5; i++) {
      try {
        await verify2FAOtpService(
          loginResult4.otp_pending_token,
          "000000",
          { ip_address: "127.0.0.1", user_agent: "BruteForcer/1.0" },
          "web",
          loginResult4.challengeId,
          TEST_EMAIL,
          false
        );
      } catch (err: any) {
        if (i === 5) {
          assert(err.message === "ACCOUNT_LOCKED_15_MINUTES", "5th failed attempt triggers ACCOUNT_LOCKED_15_MINUTES");
          lockoutTriggered = true;
        }
      }
    }
    assert(lockoutTriggered, "Lockout triggered after 5 failed attempts");

    // Check accountLockedUntil in DB
    const profileSnap4 = await adminDocRef.get();
    const profile4 = profileSnap4.data()!;
    assert(typeof profile4.accountLockedUntil === "string", "accountLockedUntil set on profile");
    const lockExpiryMs = new Date(profile4.accountLockedUntil).getTime();
    assert(lockExpiryMs > Date.now() + 14 * 60 * 1000, "Lockout is set for ~15 minutes into the future");

    // Subsequent login attempt while locked
    let blockedWhileLocked = false;
    try {
      await initiateLoginService(
        TEST_EMAIL,
        TEST_PASSWORD,
        { ip_address: "127.0.0.1", user_agent: "TestAgent/1.0" },
        "web"
      );
    } catch (err: any) {
      blockedWhileLocked = true;
      assert(err.message === "ACCOUNT_LOCKED_15_MINUTES", "Login attempt while locked returns ACCOUNT_LOCKED_15_MINUTES");
    }
    assert(blockedWhileLocked, "Account locked out from subsequent login attempts");

    // Test 13: Challenge Expiry (past 10 minutes)
    console.log("\n[Test 13] Challenge Expiry after 10 minutes");
    // Unlock account for testing expired challenge
    await adminDocRef.update({ accountLockedUntil: null });
    const expiredChallengeRef = db.collection("login_challenges").doc("expired_challenge_test_01");
    await expiredChallengeRef.set({
      id: "expired_challenge_test_01",
      challengeId: "expired_challenge_test_01",
      userId: "super_admin_seeded_01",
      user_id: "super_admin_seeded_01",
      user_type: "admin",
      status: "OTP_PENDING",
      createdAt: new Date(Date.now() - 15 * 60 * 1000).toISOString(),
      expiresAt: new Date(Date.now() - 5 * 60 * 1000).toISOString(),
      failedAttempts: 0,
      failed_attempts: 0,
    });

    let expiredRejected = false;
    try {
      await verify2FAOtpService(
        undefined,
        "123456",
        { ip_address: "127.0.0.1", user_agent: "TestAgent/1.0" },
        "web",
        "expired_challenge_test_01",
        TEST_EMAIL,
        false
      );
    } catch (err: any) {
      expiredRejected = true;
      assert(err.message === "EXPIRED_OR_INVALID_PENDING_TOKEN", "Expired challenge rejected with EXPIRED_OR_INVALID_PENDING_TOKEN");
    }
    assert(expiredRejected, "Expired challenge cannot verify OTP");
    await expiredChallengeRef.delete();

    // Test 14: Platform Restriction (SuperAdmin on Mobile blocked)
    console.log("\n[Test 14] Platform Restrictions");
    let mobileBlocked = false;
    try {
      await initiateLoginService(
        TEST_EMAIL,
        TEST_PASSWORD,
        { ip_address: "127.0.0.1", user_agent: "MobileTest/1.0" },
        "mobile"
      );
    } catch (err: any) {
      mobileBlocked = true;
      assert(err.message === "PLATFORM_ACCESS_DENIED_SUPER_ADMIN_MOBILE", "SuperAdmin login on mobile blocked with PLATFORM_ACCESS_DENIED_SUPER_ADMIN_MOBILE");
    }
    assert(mobileBlocked, "SuperAdmin strictly prevented from mobile platform access");

    // Restore original SuperAdmin document state to preserve developer/production records
    if (originalAdminData) {
      console.log("\n-> Restoring original SuperAdmin document state...");
      await adminDocRef.set(originalAdminData);
      console.log("✅ Original SuperAdmin document restored successfully.");
    }

    console.log("\n==========================================");
    console.log(`TEST SUMMARY: ${passed} PASSED, ${failed} FAILED`);
    console.log("==========================================");

    if (failed > 0) {
      process.exit(1);
    } else {
      process.exit(0);
    }
  } catch (error) {
    console.error("Test Suite Crashed:", error);
    process.exit(1);
  }
}

runTests();
