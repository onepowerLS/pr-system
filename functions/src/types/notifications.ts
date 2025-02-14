export interface NotificationPayload {
    notification: StatusChangeNotification;
    recipients: string[];
}

export interface StatusChangeNotification {
    type: 'STATUS_CHANGE';
    prId: string;
    prNumber: string;
    oldStatus: string;
    newStatus: string;
    timestamp: string;
    user: {
        email: string;
        name: string;
    };
    notes: string;
    metadata: {
        description: string;
        amount: number;
        currency: string;
        department: string;
        requiredDate: string;
    };
}
