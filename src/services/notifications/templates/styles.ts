export const styles = {
  container: `
    font-family: Arial, sans-serif;
    max-width: 800px;
    margin: 0 auto;
    padding: 20px;
  `,
  urgentHeader: `
    background-color: #ff4444;
    color: white;
    padding: 10px;
    text-align: center;
    margin-bottom: 20px;
    border-radius: 4px;
  `,
  normalHeader: `
    background-color: #00C851;
    color: black;
    padding: 10px;
    text-align: center;
    margin-bottom: 20px;
    border-radius: 4px;
  `,
  table: `
    width: 100%;
    border-collapse: collapse;
    margin: 20px 0;
  `,
  th: `
    background-color: #f8f9fa;
    border: 1px solid #ddd;
    padding: 8px;
    text-align: left;
  `,
  td: `
    border: 1px solid #ddd;
    padding: 8px;
    text-align: left;
  `,
  tr: `
    &:nth-child(even) {
      background-color: #f9f9f9;
    }
  `,
  button: `
    display: inline-block;
    padding: 10px 20px;
    background-color: #4CAF50;
    color: white;
    text-decoration: none;
    border-radius: 4px;
    margin-top: 20px;
    &:hover {
      background-color: #45a049;
    }
  `,
  lineItems: `
    margin-top: 20px;
  `
};
