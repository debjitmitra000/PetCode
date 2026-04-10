"use strict";
// Small utility helpers — imported and used in Pet.ts
Object.defineProperty(exports, "__esModule", { value: true });
exports.formatDuration = exports.isInTimeRange = exports.getCurrentHour = exports.clamp = void 0;
// Clamp a number between min and max
function clamp(value, min, max) {
    return Math.max(min, Math.min(max, value));
}
exports.clamp = clamp;
// Get current hour (0–23)
function getCurrentHour() {
    return new Date().getHours();
}
exports.getCurrentHour = getCurrentHour;
// Check if current time is within a given hour range.
// Handles midnight wrap-around (e.g. 23:00 – 02:00).
function isInTimeRange(startHour, endHour) {
    const hour = getCurrentHour();
    if (startHour <= endHour) {
        return hour >= startHour && hour < endHour;
    }
    // Wraps around midnight
    return hour >= startHour || hour < endHour;
}
exports.isInTimeRange = isInTimeRange;
// Format milliseconds into a readable "Xh Xm" string
function formatDuration(ms) {
    const totalMinutes = Math.floor(ms / 60000);
    const hours = Math.floor(totalMinutes / 60);
    const minutes = totalMinutes % 60;
    if (hours > 0) {
        return `${hours}h ${minutes}m`;
    }
    return `${minutes}m`;
}
exports.formatDuration = formatDuration;
//# sourceMappingURL=helpers.js.map