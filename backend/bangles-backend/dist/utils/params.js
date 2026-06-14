"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getQuery = exports.getParam = void 0;
/**
 * Safely extracts a route parameter as a string.
 * Express v5 types params as `string | string[]`, this normalizes to string.
 */
const getParam = (req, name) => {
    const value = req.params[name];
    if (Array.isArray(value)) {
        return value[0];
    }
    return value || "";
};
exports.getParam = getParam;
/**
 * Safely extracts a query parameter as a string or undefined.
 */
const getQuery = (req, name) => {
    const value = req.query[name];
    if (Array.isArray(value)) {
        return String(value[0]);
    }
    if (value !== undefined) {
        return String(value);
    }
    return undefined;
};
exports.getQuery = getQuery;
