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
    const endDate = new Date(); // Use current time
    
    if (isNaN(startDate.getTime())) {
      console.error('Invalid start date:', createdAt);
      return 0;
    }
    
    // Calculate UTC timestamps for both dates
    const startUTC = Date.UTC(startDate.getUTCFullYear(), startDate.getUTCMonth(), startDate.getUTCDate());
    const endUTC = Date.UTC(endDate.getUTCFullYear(), endDate.getUTCMonth(), endDate.getUTCDate());
    
    // Calculate the difference in days
    const diffDays = Math.floor((endUTC - startUTC) / (1000 * 60 * 60 * 24));
    
    // If PR was created in the future, return 0 instead of negative days
    if (diffDays < 0) {
      return 0;
    }
    
    console.log('Days calculation:', {
      input: createdAt,
      startDate: startDate.toISOString(),
      endDate: endDate.toISOString(),
      diffDays
    });
    
    return diffDays;
  } catch (error) {
    console.error('Error calculating days open:', error);
    return 0;
  }
};
