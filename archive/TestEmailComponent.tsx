import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { testEmailNotifications } from '@/utils/testEmailNotifications';
import { CheckCircle, XCircle, Loader2 } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

// Create simple Alert components since they might not be available
const Alert = ({ 
  variant = "default", 
  className = "", 
  children 
}: { 
  variant?: "default" | "destructive"; 
  className?: string; 
  children: React.ReactNode 
}) => {
  const bgColor = variant === "destructive" ? "bg-red-50 border-red-200" : "bg-green-50 border-green-200";
  return (
    <div className={`p-4 rounded-md border ${bgColor} ${className}`}>
      {children}
    </div>
  );
};

const AlertTitle = ({ children }: { children: React.ReactNode }) => (
  <h5 className="text-sm font-medium mb-1">{children}</h5>
);

const AlertDescription = ({ children }: { children: React.ReactNode }) => (
  <div className="text-sm">{children}</div>
);

export function TestEmailComponent() {
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState<{
    success?: boolean;
    message?: string;
    data?: any;
  } | null>(null);
  const [testEmail, setTestEmail] = useState('jopi.leoma@example.com');

  const runTest = async () => {
    setIsLoading(true);
    setResult(null);
    
    try {
      // Pass the custom email to the test function
      const testResult = await testEmailNotifications.testEmailNameFormatting(testEmail);
      setResult(testResult);
    } catch (error) {
      setResult({
        success: false,
        message: `Error: ${error instanceof Error ? error.message : String(error)}`
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Card className="w-full max-w-2xl mx-auto">
      <CardHeader>
        <CardTitle>Email Notification Test</CardTitle>
        <CardDescription>
          Test email notifications to ensure requestor names are properly formatted
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <div>
            <h3 className="text-lg font-medium">Email Name Formatting Test</h3>
            <p className="text-sm text-gray-500 mb-2">
              Tests if the email notification correctly formats the requestor name from email addresses
            </p>
            <div className="mb-4">
              <Label htmlFor="test-email">Test Email</Label>
              <Input 
                id="test-email"
                value={testEmail}
                onChange={(e) => setTestEmail(e.target.value)}
                placeholder="Enter an email to test"
                disabled={isLoading}
                className="mb-2"
              />
              <p className="text-xs text-gray-500">
                The system will attempt to format this email into a proper name
              </p>
            </div>
            <Button 
              onClick={runTest} 
              disabled={isLoading}
              className="flex items-center"
            >
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Running Test...
                </>
              ) : (
                'Run Email Formatting Test'
              )}
            </Button>
          </div>

          {result && (
            <Alert variant={result.success ? "default" : "destructive"} className="mt-4">
              <div className="flex items-start">
                {result.success ? (
                  <CheckCircle className="h-5 w-5 mr-2 text-green-500" />
                ) : (
                  <XCircle className="h-5 w-5 mr-2 text-red-500" />
                )}
                <div>
                  <AlertTitle>{result.success ? 'Success' : 'Error'}</AlertTitle>
                  <AlertDescription>
                    {result.message}
                    
                    {result.data && (
                      <div className="mt-2 p-2 bg-gray-100 rounded text-xs">
                        <pre>{JSON.stringify(result.data, null, 2)}</pre>
                      </div>
                    )}
                  </AlertDescription>
                </div>
              </div>
            </Alert>
          )}
        </div>
      </CardContent>
      <CardFooter className="flex justify-between">
        <p className="text-xs text-gray-500">
          This test component helps verify email notification templates
        </p>
      </CardFooter>
    </Card>
  );
}

export default TestEmailComponent;
