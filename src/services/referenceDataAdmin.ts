import { ReferenceDataItem } from "@/types/referenceData"
import { db } from "@/config/firebase"
import { collection, doc, getDocs, addDoc, updateDoc, deleteDoc, query, where, writeBatch, setDoc, getDoc } from "firebase/firestore"

const COLLECTION_PREFIX = "referenceData"
const CODE_BASED_ID_TYPES = ['currencies', 'uom', 'organizations']

export class ReferenceDataAdminService {
  private getCollectionName(type: string) {
    return `${COLLECTION_PREFIX}_${type}`
  }

  async getItems(type: string): Promise<ReferenceDataItem[]> {
    const collectionName = this.getCollectionName(type);
    console.log(`Getting items from collection: ${collectionName}`);
    const collectionRef = collection(db, collectionName);
    const snapshot = await getDocs(collectionRef);
    const items = snapshot.docs.map(doc => {
      const data = doc.data();
      console.log('Document data:', { id: doc.id, ...data });
      return {
        ...data,
        id: doc.id || data.id || '', // Ensure we get the ID from either the document or the data
      } as ReferenceDataItem;
    });
    console.log(`Retrieved ${items.length} items from collection: ${collectionName}`);
    return items;
  }

  async addItem(type: string, item: Omit<ReferenceDataItem, "id">): Promise<string> {
    const collectionName = this.getCollectionName(type);
    console.log(`Adding item to collection: ${collectionName}`, item);
    const collectionRef = collection(db, collectionName);

    // For code-based ID types, use code as ID
    if (CODE_BASED_ID_TYPES.includes(type as any) && item.code) {
      const id = item.code.toLowerCase();
      console.log(`Setting document with ID: ${id}`);
      const docRef = doc(collectionRef, id);
      
      // Check if document already exists
      const docSnap = await getDoc(docRef);
      if (docSnap.exists()) {
        throw new Error(`A ${type === 'currencies' ? 'currency' : type === 'uom' ? 'unit of measure' : 'organization'} with code ${item.code} already exists`);
      }

      await setDoc(docRef, {
        ...item,
        id,
        active: true,
        createdAt: new Date().toISOString()
      });
      console.log(`Added item to collection: ${collectionName} with ID: ${id}`);
      return id;
    }

    // For other types, generate random ID
    const docRef = await addDoc(collectionRef, {
      ...item,
      active: true,
      createdAt: new Date().toISOString()
    });
    console.log(`Added item to collection: ${collectionName} with ID: ${docRef.id}`);
    return docRef.id;
  }

  // Helper method to add multiple currencies at once
  async addCurrencies(currencies: Array<{ code: string; name: string }>) {
    const results = [];
    for (const currency of currencies) {
      try {
        const collectionName = this.getCollectionName('currencies');
        const collectionRef = collection(db, collectionName);
        const id = currency.code.toLowerCase();
        const docRef = doc(collectionRef, id);
        
        await setDoc(docRef, {
          code: currency.code,
          name: currency.name,
          active: true,
          createdAt: new Date().toISOString()
        });
        
        results.push({ success: true, id, currency });
      } catch (error) {
        results.push({ success: false, error, currency });
      }
    }
    return results;
  }

  async updateItem(type: string, id: string, item: Partial<ReferenceDataItem>): Promise<void> {
    const collectionName = this.getCollectionName(type);
    console.log(`Updating item in collection: ${collectionName} with ID: ${id}`, item);
    const docRef = doc(db, collectionName, id);
    await updateDoc(docRef, {
      ...item,
      updatedAt: new Date().toISOString()
    });
    console.log(`Updated item in collection: ${collectionName} with ID: ${id}`);
  }

  async deleteItem(type: string, id: string): Promise<void> {
    const collectionName = this.getCollectionName(type);
    console.log(`Deleting item from collection: ${collectionName} with ID: ${id}`);
    const docRef = doc(db, collectionName, id);
    console.log(`Document reference: ${docRef.path}`);
    await deleteDoc(docRef);
    console.log(`Deleted item from collection: ${collectionName} with ID: ${id}`);
  }

  async deleteAllItems(type: string): Promise<void> {
    const collectionName = this.getCollectionName(type);
    console.log(`Deleting all items from collection: ${collectionName}`);
    const collectionRef = collection(db, collectionName);
    const snapshot = await getDocs(collectionRef);
    
    const batch = writeBatch(db)
    snapshot.docs.forEach((doc) => {
      batch.delete(doc.ref)
    })
    
    await batch.commit()
    console.log(`Deleted all items from collection: ${collectionName}`);
  }

  async getActiveItems(type: string): Promise<ReferenceDataItem[]> {
    const collectionName = this.getCollectionName(type);
    console.log(`Getting active items from collection: ${collectionName}`);
    const collectionRef = collection(db, collectionName);
    const q = query(collectionRef, where("active", "==", true))
    const snapshot = await getDocs(q);
    const items = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    })) as ReferenceDataItem[];
    console.log(`Retrieved ${items.length} active items from collection: ${collectionName}`);
    return items;
  }
}

export const referenceDataAdminService = new ReferenceDataAdminService()
