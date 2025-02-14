"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.StorageService = void 0;
const storage_1 = require("firebase/storage");
const firebase_1 = require("../config/firebase");
/**
 * Service for handling file storage operations
 */
exports.StorageService = {
    /**
     * Uploads a file to temporary storage
     * @param file File to upload
     * @returns Object containing the file URL and metadata
     */
    async uploadToTempStorage(file) {
        try {
            // Create a reference to temp storage with a unique name
            const tempPath = `temp/${Date.now()}-${file.name}`;
            const storageRef = (0, storage_1.ref)(firebase_1.storage, tempPath);
            // Upload the file
            const snapshot = await (0, storage_1.uploadBytes)(storageRef, file);
            const url = await (0, storage_1.getDownloadURL)(snapshot.ref);
            return {
                name: file.name,
                size: file.size,
                type: file.type,
                url,
                path: tempPath // Store the path for later use
            };
        }
        catch (error) {
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
    async moveToPermanentStorage(tempPath, prNumber, fileName) {
        try {
            if (!tempPath) {
                throw new Error('Temp path is required');
            }
            if (!prNumber) {
                throw new Error('PR number is required');
            }
            // Create references
            const tempRef = (0, storage_1.ref)(firebase_1.storage, tempPath);
            const permanentPath = `pr/${prNumber}/${fileName}`;
            const permanentRef = (0, storage_1.ref)(firebase_1.storage, permanentPath);
            // Get the download URL before moving
            const tempUrl = await (0, storage_1.getDownloadURL)(tempRef);
            // Download the file from temp storage
            const response = await fetch(tempUrl);
            const blob = await response.blob();
            // Upload to permanent location
            await (0, storage_1.uploadBytes)(permanentRef, blob);
            // Delete from temp storage
            await (0, storage_1.deleteObject)(tempRef);
            // Return the new permanent URL
            return await (0, storage_1.getDownloadURL)(permanentRef);
        }
        catch (error) {
            console.error('Error moving file to permanent storage:', error);
            throw error;
        }
    },
    /**
     * Deletes a file from storage
     * @param url URL of the file to delete
     */
    async deleteFile(url) {
        try {
            const fileRef = (0, storage_1.ref)(firebase_1.storage, url);
            await (0, storage_1.deleteObject)(fileRef);
        }
        catch (error) {
            console.error('Error deleting file:', error);
            throw error;
        }
    }
};
//# sourceMappingURL=storage.js.map