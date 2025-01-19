import { db } from "@/config/firebase";
import { collection, getDocs, query, where } from "firebase/firestore";
import { ReferenceData } from "@/types/referenceData";

const COLLECTION_PREFIX = "referenceData";

class ReferenceDataService {
  private db = db;

  private getCollectionName(type: string): string {
    return `${COLLECTION_PREFIX}_${type}`;
  }

  async getItemsByType(type: string, organization?: string): Promise<ReferenceData[]> {
    console.log('Getting reference data items:', { type, organization });
    
    try {
      const collectionRef = collection(this.db, this.getCollectionName(type));
      let q = collectionRef;

      // For vendors, filter where organization is empty string
      // For organizations, don't apply any filter
      // For other types, filter by the specified organization
      if (type === 'vendors') {
        q = query(collectionRef, where('organization', '==', ''));
      } else if (type !== 'organizations' && organization) {
        q = query(collectionRef, where('organization', '==', organization));
      }

      const querySnapshot = await getDocs(q);
      const items = querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as ReferenceData[];

      console.log('Retrieved reference data items:', { 
        type,
        count: items.length,
        items: items.map(item => ({
          id: item.id,
          name: item.name,
          type: item.type,
          active: item.active
        }))
      });

      // For organizations, only return active ones
      if (type === 'organizations') {
        return items.filter(item => item.active);
      }

      return items;
    } catch (error) {
      console.error('Error getting reference data items:', error);
      throw error;
    }
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

  public async getOrganizations(): Promise<ReferenceData[]> {
    console.log('Getting organizations');
    const items = await this.getItemsByType('organizations');
    console.log('Retrieved organizations:', items.map(item => ({
      id: item.id,
      name: item.name,
      active: item.active
    })));
    return items;
  }

  async getCurrencies(): Promise<ReferenceData[]> {
    return this.getItemsByType('currencies');
  }
}

export const referenceDataService = new ReferenceDataService();
