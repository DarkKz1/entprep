import React from 'react';
import { CARD_COMPACT } from '../constants/styles.js';

export default class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, info) {
    console.error('ErrorBoundary caught:', error, info);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={{ padding: '40px 20px', textAlign: 'center', minHeight: '60vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ fontSize: 48, marginBottom: 16 }}>&#x26A0;&#xFE0F;</div>
          <div style={{ fontSize: 18, fontWeight: 700, color: '#fff', marginBottom: 8, fontFamily: "'Unbounded',sans-serif" }}>
            Что-то пошло не так
          </div>
          <div style={{ fontSize: 13, color: '#94a3b8', marginBottom: 24, maxWidth: 300, lineHeight: 1.6 }}>
            Произошла ошибка. Попробуйте перезагрузить страницу.
          </div>
          {this.state.error && (
            <div style={{ ...CARD_COMPACT, background: 'rgba(239,68,68,0.06)', border: '1px solid rgba(239,68,68,0.18)', padding: '10px 14px', marginBottom: 20, maxWidth: 340 }}>
              <div style={{ fontSize: 10, color: '#ef4444', fontFamily: "'JetBrains Mono',monospace", wordBreak: 'break-all' }}>
                {this.state.error.message}
              </div>
            </div>
          )}
          <button
            onClick={() => window.location.reload()}
            style={{
              padding: '14px 32px',
              background: 'linear-gradient(135deg,#FF6B35,#e85d26)',
              color: '#fff',
              border: 'none',
              borderRadius: 14,
              fontSize: 14,
              fontWeight: 700,
              cursor: 'pointer',
              boxShadow: '0 4px 20px rgba(255,107,53,0.25)',
            }}
          >
            Перезагрузить
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}
