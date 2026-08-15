const { generateSecret, generateSync, verifySync } = require('otplib');

const secret = generateSecret();

// Get current step
const step = Math.floor(Date.now() / 1000 / 30);

// Generate token for 2 steps ago (60-90 seconds ago)
const token = generateSync({ secret, counter: step - 2 }); 
console.log('Past token (2 steps ago):', token);

// Verify with default window (0 steps)
const rDefault = verifySync({ token, secret });
console.log('Verify default:', rDefault.valid);

// Verify with window: 1 (allows ±1 step)
const rWin1 = verifySync({ token, secret, window: 1 });
console.log('Verify window 1:', rWin1.valid);

// Verify with window: 2 (allows ±2 steps)
const rWin2 = verifySync({ token, secret, window: 2 });
console.log('Verify window 2:', rWin2.valid);
