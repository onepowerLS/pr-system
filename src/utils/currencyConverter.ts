import { getFirestore, collection, getDocs } from 'firebase/firestore';

interface ExchangeRate {
  from: string;
  to: string;
  rate: number;
  updatedAt: string;
}

const EXCHANGE_RATES_COLLECTION = 'exchangeRates';

export async function convertAmount(
  amount: number,
  fromCurrency: string,
  toCurrency: string
): Promise<number> {
  // Normalize currency codes to uppercase
  const normalizedFromCurrency = fromCurrency.toUpperCase();
  const normalizedToCurrency = toCurrency.toUpperCase();

  console.log('Converting amount:', {
    amount,
    from: normalizedFromCurrency,
    to: normalizedToCurrency
  });

  if (normalizedFromCurrency === normalizedToCurrency) {
    console.log('Same currency, returning original amount:', amount);
    return amount;
  }

  const db = getFirestore();
  const ratesRef = collection(db, EXCHANGE_RATES_COLLECTION);
  const ratesSnap = await getDocs(ratesRef);
  
  // Find direct conversion rate
  const directRate = ratesSnap.docs
    .map(doc => doc.data() as ExchangeRate)
    .find(rate => 
      rate.from.toUpperCase() === normalizedFromCurrency && 
      rate.to.toUpperCase() === normalizedToCurrency
    );

  if (directRate) {
    const result = amount * directRate.rate;
    console.log('Using direct rate:', {
      rate: directRate.rate,
      result
    });
    return result;
  }

  // Try reverse rate
  const reverseRate = ratesSnap.docs
    .map(doc => doc.data() as ExchangeRate)
    .find(rate => 
      rate.from.toUpperCase() === normalizedToCurrency && 
      rate.to.toUpperCase() === normalizedFromCurrency
    );

  if (reverseRate) {
    const result = amount / reverseRate.rate;
    console.log('Using reverse rate:', {
      rate: reverseRate.rate,
      result
    });
    return result;
  }

  // No conversion rate found, return original amount
  console.warn('No conversion rate found, returning original amount:', amount);
  return amount;
}
