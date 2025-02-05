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
  if (fromCurrency === toCurrency) {
    return amount;
  }

  const db = getFirestore();
  const ratesRef = collection(db, EXCHANGE_RATES_COLLECTION);
  const ratesSnap = await getDocs(ratesRef);
  
  // Find direct conversion rate
  const directRate = ratesSnap.docs
    .map(doc => doc.data() as ExchangeRate)
    .find(rate => rate.from === fromCurrency && rate.to === toCurrency);

  if (directRate) {
    return amount * directRate.rate;
  }

  // Try reverse rate
  const reverseRate = ratesSnap.docs
    .map(doc => doc.data() as ExchangeRate)
    .find(rate => rate.from === toCurrency && rate.to === fromCurrency);

  if (reverseRate) {
    return amount / reverseRate.rate;
  }

  throw new Error(`No exchange rate found for ${fromCurrency} to ${toCurrency}`);
}
