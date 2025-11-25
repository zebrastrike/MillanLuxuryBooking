import { ApiError } from "./queryClient";

import type { ApiError as ApiErrorType } from "./queryClient";

function extractZodIssues(errors: any): string | null {
  // Check for Zod issues array: errors.issues
  if (errors && typeof errors === "object" && "issues" in errors) {
    const issues = errors.issues;
    if (Array.isArray(issues) && issues.length > 0) {
      return issues.map((issue: any) => {
        const path = issue.path && issue.path.length > 0 ? `${issue.path.join(".")}: ` : "";
        return `${path}${issue.message || String(issue)}`;
      }).join(", ");
    }
  }
  // Check for plain errors array
  if (Array.isArray(errors) && errors.length > 0) {
    return errors.map((e: any) => e.message || String(e)).join(", ");
  }
  return null;
}

export function getErrorMessage(error: unknown): string {
  // Check for ApiError with structured body
  if (error instanceof Error && "body" in error) {
    const apiError = error as ApiErrorType;
    const body = apiError.body;
    
    if (body && typeof body === "object") {
      // Check for validation errors (Zod format: { errors: { issues: [...] } })
      if ("errors" in body) {
        const zodMessage = extractZodIssues((body as any).errors);
        if (zodMessage) return zodMessage;
      }
      
      // Check for single error field
      if ("error" in body) {
        return String((body as any).error);
      }
      
      // Use message from body if available
      if ("message" in body && typeof (body as any).message === "string") {
        return (body as any).message;
      }
    }
  }
  
  // Fallback to standard error message extraction
  if (error instanceof Error) {
    return error.message;
  }
  if (typeof error === "string") {
    return error;
  }
  if (typeof error === "object" && error !== null && "message" in error) {
    return String((error as any).message);
  }
  return "An error occurred";
}

function getErrorStatus(error: unknown): number | null {
  if (error instanceof ApiError) {
    return error.status;
  }
  if (error instanceof Response) {
    return error.status;
  }
  if (error instanceof Error && /^401:/.test(error.message)) {
    return 401;
  }
  if (typeof error === "object" && error !== null && "status" in error) {
    const status = (error as any).status;
    if (typeof status === "number") {
      return status;
    }
  }
  return null;
}

export function isUnauthorizedError(error: unknown): boolean {
  return getErrorStatus(error) === 401;
}

export function handleUnauthorizedError(
  error: unknown,
  toast: (options: { title: string; description: string; variant?: "destructive" }) => void
): boolean {
  if (error && isUnauthorizedError(error)) {
    toast({
      title: "Unauthorized",
      description: "Session expired. Please log in again...",
      variant: "destructive",
    });
    setTimeout(() => {
      window.location.href = "/sign-in?redirect_url=/admin";
    }, 500);
    return true;
  }
  return false;
}
