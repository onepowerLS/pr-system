export function generateEmailHeaders() {
  return {
    'Precedence': 'bulk',
    'X-Auto-Response-Suppress': 'All',
    'Auto-Submitted': 'auto-generated'
  };
}
