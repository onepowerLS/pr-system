import { styles } from './styles';

export type TableRow = [string, string] | { label: string; value: string };

export function generateTable(rows: TableRow[]): string {
  return `
    <table style="${styles.table}">
      ${rows.map(row => {
        const [key, value] = Array.isArray(row) 
          ? row 
          : [row.label, row.value];
        
        return `
        <tr>
          <td style="${styles.tableCell}"><strong>${key}</strong></td>
          <td style="${styles.tableCell}">${value}</td>
        </tr>
      `;
      }).join('')}
    </table>
  `;
}
