import { ref, uploadBytes, getDownloadURL, deleteObject } from 'firebase/storage';
import { storage } from '../config/firebase';

/**
 * Service for handling file storage operations
 */
export const StorageService = {
  /**
   * Uploads a file to temporary storage
   * @param file File to upload
   * @returns Object containing the file URL and metadata
   */
  async uploadToTempStorage(file: File) {
    try {
      // Create a reference to temp storage with a unique name
      const tempPath = `temp/${Date.now()}-${file.name}`;
      const storageRef = ref(storage, tempPath);

      // Upload the file
      const snapshot = await uploadBytes(storageRef, file);
      const url = await getDownloadURL(snapshot.ref);

      return {
        name: file.name,
        size: file.size,
        type: file.type,
        url,
        path: tempPath // Store the path for later use
      };
    } catch (error) {
      console.error('Error uploading file:', error);
      throw error;
    }
  },

  /**
   * Moves a file from temporary to permanent storage
   * @param tempPath Path of the file in temp storage
   * @param prNumber PR number for folder organization
   * @param fileName Original file name
   * @returns New permanent URL of the file
   */
  async moveToPermanentStorage(
    tempPath: string,
    prNumber: string,
    fileName: string
  ): Promise<string> {
    try {
      if (!tempPath) {
        throw new Error('Temp path is required');
      }

      if (!prNumber) {
        throw new Error('PR number is required');
      }

      // Create references
      const tempRef = ref(storage, tempPath);
      const permanentPath = `pr/${prNumber}/${fileName}`;
      const permanentRef = ref(storage, permanentPath);

      // Get the download URL before moving
      const tempUrl = await getDownloadURL(tempRef);

      // Download the file from temp storage
      const response = await fetch(tempUrl);
      const blob = await response.blob();

      // Upload to permanent location
      await uploadBytes(permanentRef, blob);

      // Delete from temp storage
      await deleteObject(tempRef);

      // Return the new permanent URL
      return await getDownloadURL(permanentRef);
    } catch (error) {
      console.error('Error moving file to permanent storage:', error);
      throw error;
    }
  },

  /**
   * Deletes a file from storage
   * @param url URL of the file to delete
   */
  async deleteFile(url: string): Promise<void> {
    try {
      const fileRef = ref(storage, url);
      await deleteObject(fileRef);
    } catch (error) {
      console.error('Error deleting file:', error);
      throw error;
    }
  }
};
