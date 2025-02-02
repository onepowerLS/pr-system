import { db } from "@/config/firebase";
import { collection, getDocs, query, where, addDoc, writeBatch, doc, setDoc } from "firebase/firestore";

export interface OrganizationData {
  id: string;
  name: string;
}

export interface ReferenceData {
  id: string;
  name: string;
  code?: string;
  type?: string;
  active: boolean;
  organization?: OrganizationData;
  organizationId?: string;
  createdAt?: string;
  updatedAt?: string;
  [key: string]: any;
}

const COLLECTION_PREFIX = "referenceData_";
const ORG_INDEPENDENT_TYPES = ['vendors', 'currencies', 'organizations', 'uom', 'permissions'];

class ReferenceDataService {
  private db = db;

  private getCollectionName(type: string): string {
    return `${COLLECTION_PREFIX}${type}`;
  }

  private generateId(type: string, code: string): string {
    if (['currencies', 'uom', 'organizations'].includes(type)) {
      return code.toLowerCase().replace(/[^a-z0-9]/g, '_');
    }
    return null; // Let Firestore auto-generate
  }

  private handleError(error: any, context: string): never {
    console.error(`Error ${context}:`, error);
    throw error;
  }

  private normalizeOrganizationId(orgId: string | OrganizationData): string {
    if (!orgId) return '';
    console.log('Normalizing organization ID:', {
      input: orgId,
      type: typeof orgId,
      isObject: typeof orgId === 'object',
      hasId: typeof orgId === 'object' && 'id' in orgId
    });
    
    // Handle both string and object cases
    const rawId = typeof orgId === 'string' ? orgId : orgId.id;
    
    // Convert to lowercase and replace any non-alphanumeric chars with underscore
    const normalized = rawId.toLowerCase()
      .replace(/[^a-z0-9]/g, '_')
      .replace(/_+/g, '_')  // Replace multiple underscores with single
      .replace(/^_|_$/g, ''); // Remove leading/trailing underscores
    
    console.log('Normalized organization ID:', {
      input: rawId,
      normalized,
      steps: {
        lowercase: rawId.toLowerCase(),
        nonAlpha: rawId.toLowerCase().replace(/[^a-z0-9]/g, '_'),
        final: normalized
      }
    });
    
    return normalized;
  }

  async getItemsByType(type: string, organization?: string | OrganizationData): Promise<ReferenceData[]> {
    console.log('Getting reference data items:', { type, organization });
    
    try {
      const collectionName = this.getCollectionName(type);
      console.log('Collection name:', collectionName);
      
      const collectionRef = collection(this.db, collectionName);
      let q = collectionRef;

      // Only filter by organization for org-dependent types
      if (!ORG_INDEPENDENT_TYPES.includes(type) && organization) {
        const normalizedOrgId = this.normalizeOrganizationId(organization);
        console.log('Applying organization filter:', { 
          type, 
          organization,
          normalizedOrgId,
          isOrgDependent: !ORG_INDEPENDENT_TYPES.includes(type),
          orgIndependentTypes: ORG_INDEPENDENT_TYPES 
        });
        
        // Query for both old and new organization field formats
        q = query(
          collectionRef, 
          where('organizationId', '==', normalizedOrgId)
        );
      } else {
        console.log('Not applying organization filter:', {
          type,
          organization,
          isOrgDependent: !ORG_INDEPENDENT_TYPES.includes(type),
          orgIndependentTypes: ORG_INDEPENDENT_TYPES
        });
      }

      const querySnapshot = await getDocs(q);
      console.log('Query snapshot:', {
        empty: querySnapshot.empty,
        size: querySnapshot.size,
        docs: querySnapshot.docs.map(doc => doc.id)
      });
      
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
          active: item.active,
          organization: item.organization
        }))
      });

      // Filter inactive items
      const activeItems = items.filter(item => item.active);
      console.log('Filtered to active items:', {
        type,
        totalCount: items.length,
        activeCount: activeItems.length,
        items: activeItems.map(item => ({
          id: item.id,
          name: item.name,
          organization: item.organization
        }))
      });

      return activeItems;
    } catch (error) {
      return this.handleError(error, 'getting reference data items');
    }
  }

  async getDepartments(organization: string | OrganizationData): Promise<ReferenceData[]> {
    console.log('Getting departments for organization:', organization);
    
    try {
      const collectionRef = collection(this.db, this.getCollectionName('departments'));
      const normalizedOrgId = this.normalizeOrganizationId(organization);
      console.log('Using normalized org ID:', normalizedOrgId);
      
      // Query for departments where organization.id matches
      const q = query(
        collectionRef,
        where('organization.id', '==', normalizedOrgId)
      );
      
      console.log('Executing departments query:', {
        collection: this.getCollectionName('departments'),
        normalizedOrgId,
        query: 'organization.id == ' + normalizedOrgId
      });
      
      const querySnapshot = await getDocs(q);

      const items = querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as ReferenceData[];

      // Log the results for debugging
      console.log('Found departments:', {
        total: items.length,
        items: items.map(item => ({
          id: item.id,
          name: item.name,
          organizationId: item.organizationId,
          organization: item.organization
        }))
      });

      return items.filter(item => item.active);
    } catch (error) {
      return this.handleError(error, 'getting departments');
    }
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
    return this.getItemsByType('vendors');
  }

  async getOrganizations(): Promise<ReferenceData[]> {
    return this.getItemsByType('organizations');
  }

  async getCurrencies(): Promise<ReferenceData[]> {
    return this.getItemsByType('currencies');
  }

  async createItem(type: string, data: Omit<ReferenceData, 'id'>): Promise<ReferenceData> {
    console.log('Creating reference data item:', { type, data });
    
    try {
      const collectionName = this.getCollectionName(type);
      const collectionRef = collection(this.db, collectionName);

      // Handle organization field
      if (data.organization) {
        const normalizedOrgId = this.normalizeOrganizationId(data.organization);
        data.organizationId = normalizedOrgId;
      }

      // Generate ID for code-based types
      const id = data.code ? this.generateId(type, data.code) : null;
      const timestamp = new Date().toISOString();

      const itemData = {
        ...data,
        active: true,
        createdAt: timestamp,
        updatedAt: timestamp
      };

      if (id) {
        const docRef = doc(collectionRef, id);
        await setDoc(docRef, itemData);
        return { ...itemData, id };
      } else {
        const docRef = await addDoc(collectionRef, itemData);
        return { ...itemData, id: docRef.id };
      }
    } catch (error) {
      return this.handleError(error, 'creating reference data item');
    }
  }
}

export const referenceDataService = new ReferenceDataService();
