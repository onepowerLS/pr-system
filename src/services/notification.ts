import { collection, addDoc, Timestamp, query, where, getDocs } from 'firebase/firestore';
import { db } from '../config/firebase';
import { NotificationLog, NotificationType, StatusChangeNotification } from '../types/notification';
import { User } from '../types/user';

class NotificationService {
  private readonly notificationsCollection = 'notifications';

  async logNotification(
    type: NotificationType,
    prId: string,
    recipients: string[],
    status: NotificationLog['status'] = 'pending'
  ): Promise<string> {
    const notification: Omit<NotificationLog, 'id'> = {
      type,
      prId,
      recipients,
      sentAt: new Date(),
      status,
    };

    const docRef = await addDoc(collection(db, this.notificationsCollection), notification);
    return docRef.id;
  }

  async handleStatusChange(
    prId: string,
    oldStatus: string,
    newStatus: string,
    user: User,
    notes?: string
  ): Promise<void> {
    const notification: StatusChangeNotification = {
      prId,
      oldStatus,
      newStatus,
      changedBy: user,
      timestamp: new Date()
    };

    // Only add notes if they exist
    if (notes) {
      notification.notes = notes;
    }

    console.log('Status change notification:', notification);

    try {
      // Log the notification in Firestore
      await this.logNotification(
        'STATUS_CHANGE',
        prId,
        ['procurement@1pwrafrica.com', user.email], // Include both procurement and user email
        'pending'
      );
    } catch (error) {
      console.error('Error logging notification:', error);
      throw error;
    }
  }

  async getNotificationsByPR(prId: string): Promise<NotificationLog[]> {
    const q = query(
      collection(db, this.notificationsCollection),
      where('prId', '==', prId)
    );

    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    })) as NotificationLog[];
  }
}

export const notificationService = new NotificationService();
