"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const env_1 = require("./config/env");
const app_1 = __importDefault(require("./app"));
app_1.default.listen(env_1.env.PORT, "0.0.0.0", () => {
    console.log(`\n🚀 Sofiya Bangles API Server`);
    console.log(`   Running on: http://localhost:${env_1.env.PORT}`);
    console.log(`   Health:     http://localhost:${env_1.env.PORT}/api/health`);
    console.log(`   Environment: ${process.env.NODE_ENV || "development"}\n`);
});
