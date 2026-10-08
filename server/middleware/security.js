import crypto from "node:crypto";
import helmet from "helmet";
import pino from "pino";
import slowDown from "express-slow-down";
import rateLimit from "express-rate-limit";

export const logger = pino({
  level: process.env.LOG_LEVEL || "info",
  redact: ["req.headers.authorization", "req.headers.cookie", "turnstileToken"]
});

export function requestId(request, response, next) {
  const supplied = request.get("x-request-id");
  const id = supplied && /^[A-Za-z0-9._-]{1,80}$/.test(supplied) ? supplied : crypto.randomUUID();
  request.id = id;
  response.setHeader("x-request-id", id);
  next();
}

export function apiSecurityHeaders() {
  return helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'none'"],
        frameAncestors: ["'none'"],
        baseUri: ["'none'"],
        formAction: ["'none'"]
      }
    },
    hsts: { maxAge: 63072000, includeSubDomains: true, preload: true },
    referrerPolicy: { policy: "no-referrer" },
    crossOriginResourcePolicy: { policy: "same-site" },
    crossOriginOpenerPolicy: { policy: "same-origin" },
    crossOriginEmbedderPolicy: false,
    permissionsPolicy: {
      features: { camera: [], microphone: [], geolocation: [] }
    }
  });
}

const limiterMessage = { error: "Trop de demandes. Réessayez plus tard." };

export const infoLimiter = rateLimit({ windowMs: 60_000, limit: 20, standardHeaders: "draft-8", legacyHeaders: false, message: limiterMessage });
export const downloadLimiter = rateLimit({ windowMs: 60_000, limit: 5, standardHeaders: "draft-8", legacyHeaders: false, message: limiterMessage });
export const apiSlowDown = slowDown({ windowMs: 60_000, delayAfter: 5, delayMs: (hits) => Math.min(hits * 250, 2000) });

export function hashIp(request) {
  return crypto.createHash("sha256").update(String(request.ip)).digest("hex").slice(0, 16);
}
