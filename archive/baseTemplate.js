"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.generateTable = generateTable;
const styles_1 = require("./styles");
function generateTable(rows) {
    return `
    <table style="${styles_1.styles.table}">
      ${rows.map(([key, value]) => `
        <tr>
          <td style="${styles_1.styles.tableCell}"><strong>${key}</strong></td>
          <td style="${styles_1.styles.tableCell}">${value}</td>
        </tr>
      `).join('')}
    </table>
  `;
}
//# sourceMappingURL=baseTemplate.js.map