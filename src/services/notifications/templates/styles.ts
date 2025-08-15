export const styles = {
  container: `
    font-family: Arial, sans-serif;
    max-width: 800px;
    margin: 0 auto;
    padding: 20px;
  `,
  urgentHeader: `
    display: inline-block;
    padding: 8px 16px;
    border-radius: 4px;
    font-weight: bold;
    margin-bottom: 20px;
    background-color: #ff4444;
    color: white;
  `,
  urgentBadge: `
    display: inline-block;
    padding: 8px 16px;
    border-radius: 4px;
    font-weight: bold;
    margin-bottom: 20px;
    background-color: #ff4444;
    color: white;
  `,
  header: `
    color: #333;
    margin-bottom: 30px;
  `,
  section: `
    margin-bottom: 30px;
  `,
  subHeader: `
    color: #444;
    margin-bottom: 15px;
  `,
  paragraph: `
    margin: 10px 0;
    line-height: 1.5;
  `,
  notesContainer: `
    background-color: #f9f9f9;
    padding: 15px;
    border-radius: 5px;
    margin-top: 15px;
  `,
  notesHeader: `
    color: #555;
    margin-top: 0;
    margin-bottom: 10px;
  `,
  notesParagraph: `
    margin: 0;
    line-height: 1.5;
  `,
  table: `
    border-collapse: collapse;
    width: 100%;
    margin-bottom: 30px;
  `,
  tableHeader: `
    padding: 10px;
    border: 1px solid #ddd;
    background-color: #f2f2f2;
    text-align: left;
  `,
  tableCell: `
    padding: 8px;
    border: 1px solid #ddd;
  `,
  button: `
    display: inline-block;
    padding: 10px 20px;
    background-color: #4CAF50;
    color: white;
    text-decoration: none;
    border-radius: 4px;
    font-weight: bold;
  `,
  buttonContainer: `
    margin-top: 30px;
    text-align: center;
  `
} as const;
