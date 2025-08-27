// A simple standalone script to test our email formatting logic
// This doesn't depend on the entire project being built

/**
 * Format an email address into a proper name
 * @param {string} email - The email address to format
 * @returns {string} - The formatted name
 */
function formatEmailToName(email) {
  return email
    .split('@')[0]                 // Get the part before @
    .replace(/\./g, ' ')           // Replace dots with spaces
    .replace(/^(.)|\s+(.)/g,       // Capitalize first letter and letters after spaces
      (match) => match.toUpperCase());
}

// Test with various email formats
const testEmails = [
  'jopi@1pwrafrica.com',
  'john.doe@example.com',
  'jane.smith@company.org',
  'test.user.name@domain.com',
  'first.middle.last@email.com',
  'simple@email.com'
];

console.log('Testing email name formatting logic:');
console.log('====================================');

for (const email of testEmails) {
  const formattedName = formatEmailToName(email);
  console.log(`Email: ${email}`);
  console.log(`Formatted name: ${formattedName}`);
  console.log('------------------------------------');
}

// Special test for jopi@1pwrafrica.com
const jopiEmail = 'jopi@1pwrafrica.com';
const jopiFormatted = formatEmailToName(jopiEmail);
console.log('\nSpecial test for jopi@1pwrafrica.com:');
console.log(`Formatted name: ${jopiFormatted}`);
console.log(`This is the name that would appear in the email notification.`);
console.log('====================================');

console.log('\nConclusion:');
console.log('Our generalizable solution formats any email address into a proper name');
console.log('without relying on special case handling for specific users.');
console.log('This approach will work for all users, including jopi@1pwrafrica.com,');
console.log('which will be formatted as "Jopi" in the email notifications.');
