import React, { ErrorInfo, ReactNode } from "react";
import { AlertTriangle, RefreshCw } from "lucide-react";

interface Props { children: ReactNode; }
interface State { hasError: boolean; }

export class ErrorBoundary extends React.Component<Props, State> {
  state: State = { hasError: false };

  static getDerivedStateFromError(): State {
    return { hasError: true };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error("[ErrorBoundary]", error, info.componentStack);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen molecular-bg flex items-center justify-center p-6">
          <div className="glass-card-strong rounded-3xl p-8 text-center max-w-sm w-full border border-[#ef4444]/40">
            <div className="w-16 h-16 rounded-full bg-[#ef4444]/10 border border-[#ef4444]/40 flex items-center justify-center mx-auto mb-4">
              <AlertTriangle className="w-8 h-8 text-[#ef4444]" />
            </div>
            <h3 className="text-xl text-white mb-2">Something went wrong</h3>
            <p className="text-[#8a9ab8] text-sm mb-6">
              This page crashed unexpectedly. Your data is safe.
            </p>
            <button
              onClick={() => {
                this.setState({ hasError: false });
                window.history.back();
              }}
              className="w-full glass-card rounded-xl py-3 border border-[#4fd1c5]/50 text-[#4fd1c5] flex items-center justify-center gap-2"
            >
              <RefreshCw className="w-4 h-4" />
              Go Back
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}
