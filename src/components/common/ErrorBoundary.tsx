import { Component, type ErrorInfo, type ReactNode } from 'react';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Uncaught error:', error, errorInfo);
  }

  private handleReset = () => {
    this.setState({ hasError: false, error: null });
    window.location.href = '/';
  };

  public render() {
    if (this.state.hasError) {
      return (
        <div style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          minHeight: '100vh',
          padding: '24px',
          backgroundColor: 'var(--bg)',
          color: 'var(--text)',
          textAlign: 'center',
          boxSizing: 'border-box',
        }}>
          <div style={{
            maxWidth: '500px',
            width: '100%',
            padding: '40px',
            borderRadius: '12px',
            border: '1px solid var(--border)',
            boxShadow: 'var(--shadow)',
          }}>
            <h1 style={{
              fontSize: '28px',
              fontWeight: 500,
              color: 'var(--text-h)',
              marginBottom: '16px',
              marginTop: 0,
              letterSpacing: '-0.5px',
            }}>
              Something went wrong
            </h1>
            <p style={{
              fontSize: '16px',
              lineHeight: '1.5',
              marginBottom: '24px',
              color: 'var(--text)',
            }}>
              An unexpected runtime error occurred. Please try reloading the page or returning home.
            </p>
            {this.state.error && (
              <pre style={{
                textAlign: 'left',
                padding: '16px',
                backgroundColor: 'var(--code-bg)',
                borderRadius: '8px',
                overflowX: 'auto',
                fontSize: '13px',
                fontFamily: 'var(--mono)',
                color: 'var(--text-h)',
                marginBottom: '24px',
                maxHeight: '200px',
                border: '1px solid var(--border)',
              }}>
                <code>{this.state.error.toString()}</code>
              </pre>
            )}
            <div style={{ display: 'flex', gap: '12px', justifyContent: 'center' }}>
              <button
                onClick={() => window.location.reload()}
                style={{
                  padding: '10px 20px',
                  backgroundColor: 'var(--accent)',
                  color: '#fff',
                  border: 'none',
                  borderRadius: '6px',
                  cursor: 'pointer',
                  fontWeight: 500,
                  fontSize: '15px',
                }}
              >
                Reload Page
              </button>
              <button
                onClick={this.handleReset}
                style={{
                  padding: '10px 20px',
                  backgroundColor: 'transparent',
                  color: 'var(--text-h)',
                  border: '1px solid var(--border)',
                  borderRadius: '6px',
                  cursor: 'pointer',
                  fontWeight: 500,
                  fontSize: '15px',
                }}
              >
                Go Home
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
