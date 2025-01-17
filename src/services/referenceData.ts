import { db } from "@/config/firebase";
import { collection, getDocs, query, where } from "firebase/firestore";
import { ReferenceData } from "@/types/referenceData";

const COLLECTION_PREFIX = "referenceData";

class ReferenceDataService {
  private getCollectionName(type: string) {
    return `${COLLECTION_PREFIX}_${type}`;
  }

  private async getItemsByType(type: string, organization?: string): Promise<ReferenceData[]> {
    const collectionRef = collection(db, this.getCollectionName(type));
    let q = collectionRef;

    // For vendors, filter where organization is empty string
    // For other types, filter by the specified organization
    if (type === 'vendors') {
      q = query(collectionRef, where('organization', '==', ''));
    } else if (organization) {
      q = query(collectionRef, where('organization', '==', organization));
    }

    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    } as ReferenceData));
  }

  async getDepartments(organization: string): Promise<ReferenceData[]> {
    return this.getItemsByType('departments', organization);
  }

  async getProjectCategories(organization: string): Promise<ReferenceData[]> {
    return this.getItemsByType('projectCategories', organization);
  }

  async getSites(organization: string): Promise<ReferenceData[]> {
    return this.getItemsByType('sites', organization);
  }

  async getExpenseTypes(organization: string): Promise<ReferenceData[]> {
    return this.getItemsByType('expenseTypes', organization);
  }

  async getVehicles(organization: string): Promise<ReferenceData[]> {
    return this.getItemsByType('vehicles', organization);
  }

  async getVendors(): Promise<ReferenceData[]> {
    return this.getItemsByType('vendors'); // Don't pass organization for vendors
  }

  async getCurrencies(): Promise<ReferenceData[]> {
    return this.getItemsByType('currencies');
  }
}

export const referenceDataService = new ReferenceDataService();
