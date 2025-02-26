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
  header: `
    background-color: #0056b3;
    padding: 20px;
    text-align: center;
    border-radius: 5px 5px 0 0;
  `,
  headerText: `
    color: white;
    margin: 0;
    font-size: 24px;
  `,
  body: `
    padding: 20px;
    background-color: #ffffff;
    border-left: 1px solid #eaeaea;
    border-right: 1px solid #eaeaea;
  `,
  subHeader: `
    color: #444;
    margin-bottom: 15px;
  `,
  section: `
    margin-bottom: 30px;
  `,
  sectionTitle: `
    color: #0056b3;
    font-size: 18px;
    margin-bottom: 10px;
    border-bottom: 1px solid #eaeaea;
    padding-bottom: 5px;
  `,
  paragraph: `
    margin: 10px 0;
    line-height: 1.5;
  `,
  table: `
    border-collapse: collapse;
    width: 100%;
    margin-bottom: 30px;
  `,
  tableHeader: `
    padding: 12px;
    border: 1px solid #ddd;
    background-color: #f8f9fa;
    text-align: left;
  `,
  tableCell: `
    padding: 8px;
    border: 1px solid #ddd;
  `,
  buttonContainer: `
    margin-top: 30px;
    text-align: center;
  `,
  button: `
    display: inline-block;
    padding: 12px 24px;
    background-color: #0056b3;
    color: white;
    text-decoration: none;
    border-radius: 4px;
    font-weight: bold;
  `,
  footer: `
    background-color: #f5f5f5;
    padding: 15px;
    text-align: center;
    border-radius: 0 0 5px 5px;
    border-left: 1px solid #eaeaea;
    border-right: 1px solid #eaeaea;
    border-bottom: 1px solid #eaeaea;
  `,
  footerText: `
    color: #666;
    font-size: 12px;
    margin: 0;
  `,
  smallText: `
    font-size: 12px;
    color: #666;
    font-style: italic;
    margin-top: 15px;
  `,
  notesSection: `
    background-color: #f9f9f9;
    padding: 15px;
    border-radius: 5px;
    margin: 20px 0;
  `,
  notesTitle: `
    color: #0056b3;
    margin-top: 0;
    font-size: 16px;
  `,
  notesParagraph: `
    margin: 10px 0 0;
    line-height: 1.5;
  `
} as const;
