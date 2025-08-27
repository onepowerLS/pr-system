"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.generateEmailHeaders = generateEmailHeaders;
function generateEmailHeaders() {
    return {
        'Precedence': 'bulk',
        'X-Auto-Response-Suppress': 'All',
        'Auto-Submitted': 'auto-generated'
    };
}
//# sourceMappingURL=emailHeaders.js.map