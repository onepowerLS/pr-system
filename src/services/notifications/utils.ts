/**
 * Generates a link to view a PR in the system
 */
export function generatePRLink(prId: string): string {
  const baseUrl = window.location.origin;
  return `${baseUrl}/pr/${prId}`;
}

/**
 * Formats a date for display
 */
export function formatDate(date: string | Date): string {
  if (!date) return 'Not specified';
  return new Date(date).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });
}

/**
 * Formats currency amount
 */
export function formatAmount(amount: number, currency: string): string {
  if (!amount) return 'Not specified';
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: currency || 'USD'
  }).format(amount);
}
