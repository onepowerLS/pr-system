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

  async getNotificationsByPR(prId: string): Promise<NotificationLog[]> {
    const q = query(
      collection(db, this.notificationsCollection),
      where('prId', '==', prId)
    );

    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    } as NotificationLog));
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
      oldStatus: oldStatus as any,
      newStatus: newStatus as any,
      changedBy: user,
      timestamp: new Date(),
      notes
    };

    console.log('Status change notification:', notification);

    try {
      await addDoc(collection(db, this.notificationsCollection), {
        type: 'STATUS_CHANGE',
        prId,
        recipients: [], // Will be determined by the notification worker
        sentAt: new Date(),
        status: 'pending',
        data: notification
      });
    } catch (error) {
      console.error('Error logging status change notification:', error);
      throw error;
    }
  }
}

export const notificationService = new NotificationService();
