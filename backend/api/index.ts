import app from "../src/app";

/**
 * Vercel Serverless Function entry point for Express app.
 * Restores original requested URL path if Vercel internal rewrite routes to /api.
 */
export default function handler(req: any, res: any) {
  const matchedPath = req.headers?.["x-matched-path"] || req.headers?.["x-vercel-matched-path"];

  if (matchedPath && typeof matchedPath === "string") {
    const urlWithoutQuery = req.url.split("?")[0];
    if (urlWithoutQuery === "/api" || urlWithoutQuery === "/api/") {
      const queryString = req.url.includes("?") ? req.url.slice(req.url.indexOf("?")) : "";
      if (matchedPath !== "/api" && matchedPath !== "/api/") {
        req.url = matchedPath + queryString;
      }
    }
  }

  return app(req, res);
}

// CommonJS compatibility for Vercel Node runtime
// @ts-ignore
module.exports = handler;
// @ts-ignore
module.exports.default = handler;
