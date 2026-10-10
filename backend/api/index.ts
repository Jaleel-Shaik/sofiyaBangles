import app from "../src/app";

// Vercel Serverless Function handler
function handler(req: any, res: any) {
  // If Vercel internal rewrite routed to /api, restore the original incoming path if available
  const matchedPath = req.headers?.["x-matched-path"] || req.headers?.["x-vercel-matched-path"];
  if (matchedPath && typeof matchedPath === "string" && req.url === "/api" && matchedPath !== "/api") {
    req.url = matchedPath;
  }
  return app(req, res);
}

export default handler;
// @ts-ignore
module.exports = handler;
// @ts-ignore
module.exports.default = handler;

