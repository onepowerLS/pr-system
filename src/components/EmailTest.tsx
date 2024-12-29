import React, { useState } from 'react';
import { getFunctions, httpsCallable } from 'firebase/functions';
import { Button, Box, Alert } from '@mui/material';

const EmailTest: React.FC = () => {
    const [status, setStatus] = useState<{
        loading: boolean;
        error?: string;
        success?: string;
    }>({ loading: false });

    const sendTestEmail = async () => {
        setStatus({ loading: true });
        try {
            const functions = getFunctions();
            const testEmail = httpsCallable(functions, 'testEmailNotification');
            
            const result = await testEmail({});
            const data = result.data as { success: boolean; messageId: string; response: string };
            
            setStatus({
                loading: false,
                success: `Email sent successfully! Message ID: ${data.messageId}`
            });
        } catch (error) {
            console.error('Error sending test email:', error);
            setStatus({
                loading: false,
                error: 'Failed to send test email. Check console for details.'
            });
        }
    };

    return (
        <Box sx={{ p: 2 }}>
            <Button 
                variant="contained" 
                onClick={sendTestEmail}
                disabled={status.loading}
            >
                {status.loading ? 'Sending...' : 'Send Test Email'}
            </Button>

            {status.error && (
                <Alert severity="error" sx={{ mt: 2 }}>
                    {status.error}
                </Alert>
            )}

            {status.success && (
                <Alert severity="success" sx={{ mt: 2 }}>
                    {status.success}
                </Alert>
            )}
        </Box>
    );
};

export default EmailTest;
