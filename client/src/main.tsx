import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { ClerkProvider } from "@clerk/clerk-react";
import App from "./App";
import { CLERK_ENABLED, CLERK_FRONTEND_API, CLERK_PUBLISHABLE_KEY } from "./lib/clerkConfig";
import "./index.css";

const app = (
  <StrictMode>
    {CLERK_ENABLED ? (
      <ClerkProvider
        publishableKey={CLERK_PUBLISHABLE_KEY}
        // frontendApi is required when using a custom Clerk domain; the prop exists at runtime even if typings lag
        // @ts-expect-error frontendApi is supported for self-hosted Clerk Frontend APIs
        frontendApi={CLERK_FRONTEND_API}
        afterSignOutUrl="/"
      >
        <App />
      </ClerkProvider>
    ) : (
      <App />
    )}
  </StrictMode>
);

createRoot(document.getElementById("root")!).render(app);
