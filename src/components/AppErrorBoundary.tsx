import React from "react";

interface AppErrorBoundaryState {
  message: string | null;
  stack: string | null;
}

export default class AppErrorBoundary extends React.Component<React.PropsWithChildren, AppErrorBoundaryState> {
  state: AppErrorBoundaryState = { message: null, stack: null };

  static getDerivedStateFromError(error: unknown): AppErrorBoundaryState {
    return describeError(error);
  }

  componentDidMount() {
    window.addEventListener("error", this.handleError);
    window.addEventListener("unhandledrejection", this.handleRejection);
  }

  componentWillUnmount() {
    window.removeEventListener("error", this.handleError);
    window.removeEventListener("unhandledrejection", this.handleRejection);
  }

  componentDidCatch(error: unknown) {
    console.error("EarthLink render failure", error);
  }

  private handleError = (event: ErrorEvent) => {
    this.setState(describeError(event.error ?? event.message));
  };

  private handleRejection = (event: PromiseRejectionEvent) => {
    this.setState(describeError(event.reason));
  };

  render() {
    if (!this.state.message) return this.props.children;

    return (
      <div
        className="h-screen w-screen overflow-auto p-6 font-mono"
        style={{ background: "#0c0a09", color: "#e7e5e4" }}
      >
        <div className="max-w-4xl">
          <div className="text-sm font-semibold" style={{ color: "#f87171" }}>
            EarthLink runtime error
          </div>
          <pre className="mt-3 whitespace-pre-wrap text-xs leading-5">{this.state.message}</pre>
          {this.state.stack && (
            <pre className="mt-4 whitespace-pre-wrap text-[11px] leading-5" style={{ color: "#a8a29e" }}>
              {this.state.stack}
            </pre>
          )}
        </div>
      </div>
    );
  }
}

function describeError(error: unknown): AppErrorBoundaryState {
  if (error instanceof Error) {
    return { message: error.message || String(error), stack: error.stack ?? null };
  }
  return { message: typeof error === "string" ? error : JSON.stringify(error), stack: null };
}
