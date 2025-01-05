import { ref, uploadBytes, getDownloadURL, deleteObject } from 'firebase/storage';
import { storage } from '../config/firebase';

/**
 * Uploads a file to temporary storage
 * @param file File to upload
 * @returns Object containing the file URL and metadata
 */
export async function uploadToTempStorage(file: File) {
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
}

/**
 * Moves a file from temporary to permanent storage
 * @param tempPath Path of the file in temp storage
 * @param prNumber PR number for folder organization
 * @param fileName Original file name
 * @returns New permanent URL of the file
 */
export async function moveToPermanentStorage(
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

    if (!fileName) {
      throw new Error('File name is required');
    }

    // Create references
    const tempRef = ref(storage, tempPath);
    const permanentPath = `pr/${prNumber}/attachments/${fileName}`;
    const permanentRef = ref(storage, permanentPath);

    // Get the file data from temp storage
    const tempUrl = await getDownloadURL(tempRef);
    const response = await fetch(tempUrl);
    const blob = await response.blob();

    // Upload to permanent location
    await uploadBytes(permanentRef, blob);

    // Delete temp file
    await deleteObject(tempRef);

    // Get permanent URL
    return await getDownloadURL(permanentRef);
  } catch (error) {
    console.error('Error moving file to permanent storage:', error);
    throw error;
  }
}

/**
 * Deletes a file from storage
 * @param url URL of the file to delete
 */
export async function deleteFile(url: string): Promise<void> {
  try {
    if (!url) {
      throw new Error('URL is required');
    }

    const path = url.split('/o/')[1].split('?')[0];
    const fileRef = ref(storage, decodeURIComponent(path));
    await deleteObject(fileRef);
  } catch (error) {
    console.error('Error deleting file:', error);
    throw error;
  }
}
