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

    // For now, just log the notification
    await this.logNotification(
      NotificationType.STATUS_CHANGE,
      prId,
      [user.email], // We'll expand recipients based on roles later
      'pending'
    );

    // TODO: Implement email sending via Firebase Functions
    console.log('Status change notification:', notification);
  }
}

export const notificationService = new NotificationService();
