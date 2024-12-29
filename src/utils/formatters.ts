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
    const endDate = new Date('2024-12-29T11:42:00-05:00'); // Current time from context
    
    if (isNaN(startDate.getTime())) {
      console.error('Invalid start date:', createdAt);
      return 0;
    }
    
    // Calculate the difference in milliseconds
    const diffTime = endDate.getTime() - startDate.getTime();
    
    // If the difference is negative (future date), return 0
    if (diffTime < 0) {
      console.log('Future date detected:', {
        input: createdAt,
        parsedStart: startDate.toISOString(),
        parsedEnd: endDate.toISOString(),
        diffTime
      });
      return 0;
    }
    
    console.log('Date calculation:', {
      input: createdAt,
      parsedStart: startDate.toISOString(),
      parsedEnd: endDate.toISOString(),
      diffTime
    });
    
    // Calculate days by comparing UTC dates
    const startUTC = new Date(Date.UTC(startDate.getUTCFullYear(), startDate.getUTCMonth(), startDate.getUTCDate()));
    const endUTC = new Date(Date.UTC(endDate.getUTCFullYear(), endDate.getUTCMonth(), endDate.getUTCDate()));
    
    // Get difference in days
    const diffTimeUTC = endUTC.getTime() - startUTC.getTime();
    const diffDays = Math.floor(diffTimeUTC / (1000 * 60 * 60 * 24));
    
    console.log('Days calculation:', {
      startUTC: startUTC.toISOString(),
      endUTC: endUTC.toISOString(),
      diffTimeUTC,
      diffDays
    });
    
    return diffDays;
  } catch (error) {
    console.error('Error calculating days open:', error);
    return 0;
  }
};
