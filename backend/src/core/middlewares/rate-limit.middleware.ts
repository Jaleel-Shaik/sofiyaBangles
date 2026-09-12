import rateLimit from "express-rate-limit";
import { RateLimitError } from "../errors/app.error";

export const authRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 30, // Limit each IP to 30 login/verify attempts per 15 mins
  standardHeaders: true,
  legacyHeaders: false,
  handler: (_req, _res, next) => {
    next(new RateLimitError("Too many authentication attempts. Please try again in 15 minutes."));
  },
});

export const otpRateLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 5,
  standardHeaders: true,
  legacyHeaders: false,
  handler: (_req, _res, next) => {
    next(new RateLimitError("Too many OTP requests. Please wait a minute before trying again."));
  },
});

export const generalApiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 1500, // Generous limit for normal web/mobile traffic
  standardHeaders: true,
  legacyHeaders: false,
  handler: (_req, _res, next) => {
    next(new RateLimitError("API rate limit exceeded. Please slow down."));
  },
});
