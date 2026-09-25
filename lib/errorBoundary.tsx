import React, { Component, type ErrorInfo, type ReactNode } from 'react';
import { Logger } from './logger';

interface Props {
  children: ReactNode;
  fallback?: (error: Error, reset: () => void) => ReactNode;
  onError?: (error: Error, errorInfo: ErrorInfo) => void;
  autoRecoverAfterMs?: number;
  resetKey?: unknown;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorCount: number;
}

export class ErrorBoundary extends Component<Props, State> {
  private recoveryTimer: ReturnType<typeof setTimeout> | null = null;

  state: State = { hasError: false, error: null, errorCount: 0 };

  static getDerivedStateFromError(error: Error): Partial<State> {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
    Logger.error('ErrorBoundary caught unhandled React error', { error, errorInfo });
    this.setState(prev => ({ errorCount: prev.errorCount + 1 }));
    this.props.onError?.(error, errorInfo);

    const { autoRecoverAfterMs = 0 } = this.props;
    if (autoRecoverAfterMs > 0 && this.state.errorCount < 3) {
      this.recoveryTimer = setTimeout(() => this.reset(), autoRecoverAfterMs);
    }
  }

  componentDidUpdate(prevProps: Props): void {
    if (prevProps.resetKey !== this.props.resetKey && this.state.hasError) {
      this.reset();
    }
  }

  componentWillUnmount(): void {
    if (this.recoveryTimer) clearTimeout(this.recoveryTimer);
  }

  reset = (): void => {
    if (this.recoveryTimer) clearTimeout(this.recoveryTimer);
    this.setState({ hasError: false, error: null });
  };

  render(): ReactNode {
    if (this.state.hasError && this.state.error) {
      if (this.props.fallback) {
        return this.props.fallback(this.state.error, this.reset);
      }

      return (
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '32px',
            gap: '12px',
            color: '#f8fafc',
            fontFamily: '-apple-system, BlinkMacSystemFont, sans-serif',
          }}
        >
          <span style={{ fontSize: '32px' }}>warning</span>
          <p style={{ margin: 0, opacity: 0.7, fontSize: '14px' }}>Something went wrong. Trying to recover...</p>
          <button
            onClick={this.reset}
            style={{
              padding: '8px 20px',
              borderRadius: '8px',
              border: 'none',
              background: 'rgba(56,189,248,0.15)',
              color: '#38bdf8',
              cursor: 'pointer',
              fontSize: '13px',
            }}
          >
            Retry
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}
