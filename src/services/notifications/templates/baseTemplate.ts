import { styles } from './styles';

export function generateTable(rows: [string, string][]): string {
  return `
    <table style="${styles.table}">
      ${rows.map(([key, value]) => `
        <tr>
          <td style="${styles.tableCell}"><strong>${key}</strong></td>
          <td style="${styles.tableCell}">${value}</td>
        </tr>
      `).join('')}
    </table>
  `;
}
