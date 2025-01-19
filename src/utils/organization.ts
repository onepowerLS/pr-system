/**
 * Normalizes organization IDs to a consistent format
 * @param orgId Organization ID to normalize
 * @returns Normalized organization ID
 */
export function normalizeOrganizationId(orgId: string): string {
  if (!orgId) return '';
  
  // Remove any whitespace and convert to uppercase
  return orgId.trim().toUpperCase();
}
