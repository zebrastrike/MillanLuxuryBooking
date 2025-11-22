import { useAuth, useUser } from "@clerk/clerk-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { CheckCircle2, XCircle, AlertCircle } from "lucide-react";

export default function ClerkDiagnostic() {
  const { userId, isLoaded: authLoaded, isSignedIn } = useAuth();
  const { user, isLoaded: userLoaded } = useUser();

  const clerkPubKey = import.meta.env.VITE_CLERK_PUBLISHABLE_KEY;
  const currentUrl = window.location.href;
  const domain = window.location.origin;

  return (
    <div className="min-h-screen bg-background p-8">
      <div className="max-w-4xl mx-auto space-y-6">
        <div>
          <h1 className="text-3xl font-bold mb-2">Clerk Authentication Diagnostic</h1>
          <p className="text-muted-foreground">Use this page to troubleshoot Clerk authentication issues</p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              {clerkPubKey ? <CheckCircle2 className="h-5 w-5 text-green-500" /> : <XCircle className="h-5 w-5 text-destructive" />}
              Environment Configuration
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div className="font-medium">Clerk Publishable Key:</div>
              <div className="font-mono text-xs">
                {clerkPubKey ? `${clerkPubKey.substring(0, 20)}...` : <span className="text-destructive">MISSING</span>}
              </div>
              
              <div className="font-medium">Key Format:</div>
              <div>
                {clerkPubKey?.startsWith('pk_test_') ? 
                  <span className="text-green-600">✓ Test Key</span> : 
                  clerkPubKey?.startsWith('pk_live_') ? 
                    <span className="text-blue-600">✓ Live Key</span> : 
                    <span className="text-destructive">✗ Invalid Format</span>
                }
              </div>

              <div className="font-medium">Current Domain:</div>
              <div className="font-mono text-xs">{domain}</div>

              <div className="font-medium">Current URL:</div>
              <div className="font-mono text-xs break-all">{currentUrl}</div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              {authLoaded ? <CheckCircle2 className="h-5 w-5 text-green-500" /> : <AlertCircle className="h-5 w-5 text-yellow-500" />}
              Clerk Auth State
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div className="font-medium">Auth Loaded:</div>
              <div>{authLoaded ? '✓ Yes' : '✗ No'}</div>

              <div className="font-medium">Signed In:</div>
              <div>{isSignedIn ? '✓ Yes' : '✗ No'}</div>

              <div className="font-medium">User ID:</div>
              <div className="font-mono text-xs">{userId || 'None'}</div>

              <div className="font-medium">User Object Loaded:</div>
              <div>{userLoaded ? '✓ Yes' : '✗ No'}</div>

              {user && (
                <>
                  <div className="font-medium">User Email:</div>
                  <div>{user.primaryEmailAddress?.emailAddress || 'None'}</div>

                  <div className="font-medium">User Name:</div>
                  <div>{user.fullName || 'None'}</div>
                </>
              )}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Troubleshooting Steps</CardTitle>
            <CardDescription>If you're seeing an infinite redirect loop:</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <h3 className="font-semibold">1. Add Domain to Clerk Dashboard</h3>
              <p className="text-sm text-muted-foreground">
                Go to your Clerk dashboard → Settings → Domains and add:
              </p>
              <code className="block bg-muted p-2 rounded text-xs">
                {domain}
              </code>
            </div>

            <div className="space-y-2">
              <h3 className="font-semibold">2. Verify Environment Keys Match</h3>
              <p className="text-sm text-muted-foreground">
                Make sure your VITE_CLERK_PUBLISHABLE_KEY and CLERK_SECRET_KEY are from the same Clerk application (both test or both live).
              </p>
            </div>

            <div className="space-y-2">
              <h3 className="font-semibold">3. Check Allowed Redirect URLs</h3>
              <p className="text-sm text-muted-foreground">
                In Clerk dashboard → Paths, ensure these URLs are allowed:
              </p>
              <code className="block bg-muted p-2 rounded text-xs">
                {domain}/admin<br />
                {domain}
              </code>
            </div>

            <div className="space-y-2">
              <h3 className="font-semibold">4. Clear Browser Cache</h3>
              <p className="text-sm text-muted-foreground">
                Clear your browser's cookies and cache, then try again.
              </p>
            </div>
          </CardContent>
        </Card>

        <div className="flex gap-4">
          <Button onClick={() => window.location.href = '/'}>
            Go to Home
          </Button>
          <Button onClick={() => window.location.href = '/admin'} variant="outline">
            Try Admin Page
          </Button>
        </div>
      </div>
    </div>
  );
}
