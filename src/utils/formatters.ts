export const formatCurrency = (amount: number, currency: string = 'USD'): string => {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: currency,
  }).format(amount);
};

export const calculateDaysOpen = (createdAt: string | Date): number => {
  if (!createdAt) return 0;
  
  try {
    const startDate = new Date(createdAt);
    const endDate = new Date('2024-12-29T11:52:31-05:00'); // Current time from context
    
    if (isNaN(startDate.getTime())) {
      console.error('Invalid start date:', createdAt);
      return 0;
    }
    
    // Calculate the difference in milliseconds
    const diffTime = Math.abs(endDate.getTime() - startDate.getTime());
    
    // Calculate days by comparing UTC dates to avoid timezone issues
    const startUTC = Date.UTC(startDate.getUTCFullYear(), startDate.getUTCMonth(), startDate.getUTCDate());
    const endUTC = Date.UTC(endDate.getUTCFullYear(), endDate.getUTCMonth(), endDate.getUTCDate());
    
    // Get difference in days
    const diffDays = Math.floor((endUTC - startUTC) / (1000 * 60 * 60 * 24));
    
    console.log('Days calculation:', {
      input: createdAt,
      startDate: startDate.toISOString(),
      endDate: endDate.toISOString(),
      diffTime,
      diffDays
    });
    
    return diffDays;
  } catch (error) {
    console.error('Error calculating days open:', error);
    return 0;
  }
};
