const app = require("../dist/app");

const handler = app.default || app;

module.exports = handler;
