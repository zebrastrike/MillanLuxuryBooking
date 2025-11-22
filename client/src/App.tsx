import { ClerkProvider } from "@clerk/clerk-react";
import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import Home from "@/pages/home";
import Admin from "@/pages/Admin";
import ClerkDiagnostic from "@/pages/ClerkDiagnostic";
import NotFound from "@/pages/not-found";

const clerkPubKey = import.meta.env.VITE_CLERK_PUBLISHABLE_KEY;

// Debug Clerk configuration
console.log('[App] Clerk Configuration:', {
  publishableKey: clerkPubKey ? `${clerkPubKey.substring(0, 15)}...` : 'MISSING',
  hasKey: !!clerkPubKey,
  keyFormat: clerkPubKey?.startsWith('pk_') ? 'Valid format' : 'Invalid format'
});

// Main router component
function Router() {
  return (
    <Switch>
      <Route path="/" component={Home}/>
      <Route path="/admin" component={Admin}/>
      <Route path="/clerk-diagnostic" component={ClerkDiagnostic}/>
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  if (!clerkPubKey) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="text-center p-8 border rounded-lg">
          <h1 className="text-2xl font-bold text-destructive mb-4">Configuration Error</h1>
          <p className="text-muted-foreground">Clerk publishable key is missing.</p>
          <p className="text-sm text-muted-foreground mt-2">Please set VITE_CLERK_PUBLISHABLE_KEY in your environment.</p>
        </div>
      </div>
    );
  }

  return (
    <ClerkProvider 
      publishableKey={clerkPubKey}
      afterSignOutUrl="/"
    >
      <QueryClientProvider client={queryClient}>
        <TooltipProvider>
          <Toaster />
          <Router />
        </TooltipProvider>
      </QueryClientProvider>
    </ClerkProvider>
  );
}

export default App;
