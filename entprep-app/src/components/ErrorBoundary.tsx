import React from 'react';
import { CARD_COMPACT, COLORS } from '../constants/styles';
import { captureError } from '../config/sentry';
import { getT } from '../locales';

interface ErrorBoundaryProps {
  title?: string;
  message?: string;
  onRecover?: () => void;
  children: React.ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
  componentStack: string | null;
}

function getLang(): 'ru' | 'kk' {
  try {
    const data = JSON.parse(localStorage.getItem('entprep_data') || '{}');
    const lang = data?.st?.lang;
    return lang === 'kk' ? 'kk' : 'ru';
  } catch {
    return 'ru';
  }
}

export default class ErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, error: null, componentStack: null };
  }

  static getDerivedStateFromError(error: Error): Partial<ErrorBoundaryState> {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    console.error('ErrorBoundary caught:', error, info);
    this.setState({ componentStack: info?.componentStack || null });
    captureError(error, { componentStack: info?.componentStack, boundary: this.props.title || 'root' });
  }

  handleRecover = () => {
    this.setState({ hasError: false, error: null });
    if (this.props.onRecover) this.props.onRecover();
  };

  render() {
    if (this.state.hasError) {
      const tr = getT(getLang());
      const {
        title = tr.errorBoundary.title,
        message = tr.errorBoundary.message,
        onRecover,
      } = this.props;

      const isFeature = !!onRecover;

      return (
        <div style={{ padding: isFeature ? '30px 20px' : '40px 20px', textAlign: 'center', minHeight: isFeature ? '40vh' : '60vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ fontSize: isFeature ? 36 : 48, marginBottom: 16 }}>&#x26A0;&#xFE0F;</div>
          <div style={{ fontSize: isFeature ? 16 : 18, fontWeight: 700, color: 'var(--text)', marginBottom: 8, fontFamily: "'Unbounded',sans-serif" }}>
            {title}
          </div>
          <div style={{ fontSize: 13, color: 'var(--text-secondary)', marginBottom: 24, maxWidth: 300, lineHeight: 1.6 }}>
            {message}
          </div>
          {this.state.error && (
            <div style={{ ...CARD_COMPACT, background: 'rgba(239,68,68,0.06)', border: '1px solid rgba(239,68,68,0.18)', padding: '10px 14px', marginBottom: 20, maxWidth: 340 }}>
              <div style={{ fontSize: 10, color: COLORS.red, fontFamily: "'JetBrains Mono',monospace", wordBreak: 'break-all' }}>
                {String(this.state.error?.message || this.state.error)}
              </div>
            </div>
          )}
          {import.meta.env.DEV && this.state.componentStack && (
            <div style={{ ...CARD_COMPACT, background: 'rgba(26,154,140,0.06)', border: '1px solid rgba(26,154,140,0.18)', padding: '10px 14px', marginBottom: 20, maxWidth: 340, textAlign: 'left' }}>
              <div style={{ fontSize: 9, color: COLORS.teal, fontWeight: 600, marginBottom: 4 }}>Component Stack:</div>
              <pre style={{ fontSize: 8, color: 'var(--text-secondary)', fontFamily: "'JetBrains Mono',monospace", whiteSpace: 'pre-wrap', wordBreak: 'break-all', margin: 0, maxHeight: 200, overflow: 'auto' }}>
                {this.state.componentStack}
              </pre>
            </div>
          )}
          <div style={{ display: 'flex', gap: 10 }}>
            {isFeature && (
              <button
                onClick={this.handleRecover}
                style={{
                  padding: '14px 32px',
                  background: `linear-gradient(135deg,${COLORS.accent},${COLORS.accentDark})`,
                  color: '#fff',
                  border: 'none',
                  borderRadius: 14,
                  fontSize: 14,
                  fontWeight: 700,
                  cursor: 'pointer',
                  boxShadow: '0 4px 20px rgba(255,107,53,0.25)',
                }}
              >
                {tr.errorBoundary.goBack}
              </button>
            )}
            <button
              onClick={() => window.location.reload()}
              style={{
                padding: '14px 32px',
                background: isFeature ? 'var(--bg-card)' : `linear-gradient(135deg,${COLORS.accent},${COLORS.accentDark})`,
                color: isFeature ? 'var(--text)' : '#fff',
                border: isFeature ? '1px solid var(--border-light)' : 'none',
                borderRadius: 14,
                fontSize: 14,
                fontWeight: 700,
                cursor: 'pointer',
                boxShadow: isFeature ? 'none' : '0 4px 20px rgba(255,107,53,0.25)',
              }}
            >
              {tr.errorBoundary.reload}
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}
