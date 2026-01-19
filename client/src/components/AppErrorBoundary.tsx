import { Component, type ErrorInfo, type ReactNode } from "react";
import { Button } from "@/components/ui/button";

type AppErrorBoundaryProps = {
  children: ReactNode;
};

type AppErrorBoundaryState = {
  hasError: boolean;
  error: Error | null;
};

export class AppErrorBoundary extends Component<AppErrorBoundaryProps, AppErrorBoundaryState> {
  constructor(props: AppErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): AppErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    // eslint-disable-next-line no-console
    console.error("Unhandled runtime error", error, info.componentStack);
  }

  handleReload = () => {
    window.location.reload();
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-background px-6 text-center">
          <div className="max-w-xl space-y-4">
            <h1 className="text-2xl font-semibold">Something went wrong.</h1>
            <p className="text-muted-foreground">
              The page hit an unexpected error. Please reload and ensure your environment variables (especially Supabase keys)
              are configured correctly if authentication is enabled.
            </p>
            <div className="flex gap-3 justify-center">
              <Button onClick={this.handleReload} data-testid="button-reload-app-error">
                Reload
              </Button>
              <Button variant="outline" onClick={() => this.setState({ hasError: false, error: null })} data-testid="button-dismiss-app-error">
                Dismiss
              </Button>
            </div>
            {this.state.error && (
              <pre className="bg-muted text-left text-sm p-3 rounded-md overflow-auto max-h-48">
                {this.state.error.message}
              </pre>
            )}
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

