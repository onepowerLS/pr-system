export const formatCurrency = (amount: number, currency: string = 'USD'): string => {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: currency,
  }).format(amount);
};

export const calculateDaysOpen = (createdAt: string | Date, completedAt?: string | Date | null): number => {
  if (!createdAt) return 0;
  
  try {
    const startDate = createdAt instanceof Date ? createdAt : new Date(createdAt);
    const endDate = completedAt ? 
      (completedAt instanceof Date ? completedAt : new Date(completedAt)) : 
      new Date();
    
    if (isNaN(startDate.getTime())) {
      console.error('Invalid start date:', createdAt);
      return 0;
    }
    
    if (completedAt && isNaN(endDate.getTime())) {
      console.error('Invalid end date:', completedAt);
      return 0;
    }
    
    const diffTime = Math.abs(endDate.getTime() - startDate.getTime());
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  } catch (error) {
    console.error('Error calculating days open:', error);
    return 0;
  }
};
