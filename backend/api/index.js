const app = require("../dist/app");

const expressApp = typeof app === "function" ? app : (app.default || app);

/**
 * Vercel Serverless Function entry point bridging to compiled Express app.
 * Resolves path rewriting and catches unhandled runtime errors gracefully.
 */
function handler(req, res) {
  try {
    const matchedPath = req.headers["x-matched-path"] || req.headers["x-vercel-matched-path"];
    if (matchedPath && typeof matchedPath === "string") {
      const urlWithoutQuery = req.url.split("?")[0];
      if (
        urlWithoutQuery === "/api" ||
        urlWithoutQuery === "/api/" ||
        urlWithoutQuery === "/api/index.js" ||
        urlWithoutQuery === "/api/index"
      ) {
        const queryString = req.url.includes("?") ? req.url.slice(req.url.indexOf("?")) : "";
        if (matchedPath !== "/api" && matchedPath !== "/api/") {
          req.url = matchedPath + queryString;
        }
      }
    }

    return expressApp(req, res);
  } catch (err) {
    console.error("Vercel Serverless Function Handler Error:", err);
    if (!res.headersSent) {
      res.statusCode = 500;
      res.setHeader("Content-Type", "application/json");
      res.end(
        JSON.stringify({
          success: false,
          error: "INTERNAL_SERVER_ERROR",
          message: err && err.message ? err.message : String(err),
        })
      );
    }
  }
}

module.exports = handler;
module.exports.default = handler;
