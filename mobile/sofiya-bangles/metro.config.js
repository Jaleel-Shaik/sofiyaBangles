const { getDefaultConfig } = require("expo/metro-config");
const { withNativeWind } = require("nativewind/metro");

const config = getDefaultConfig(__dirname, {
  // Ensure Expo's built-in CSS support is turned on
  isCSSEnabled: true, 
});

// Pass your global.css path as the input target
module.exports = withNativeWind(config, { input: "./global.css" });
