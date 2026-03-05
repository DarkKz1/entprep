import React, { useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { useBreakpoint } from '../../hooks/useBreakpoint';

interface BottomSheetProps {
  visible: boolean;
  onClose: () => void;
  children: React.ReactNode;
}

export default function BottomSheet({ visible, onClose, children }: BottomSheetProps) {
  const bp = useBreakpoint();
  const isDesktop = bp === 'desktop';
  const sheetRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!visible) return;
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', handleKey);
    // Focus the sheet on open for accessibility
    sheetRef.current?.focus();
    return () => document.removeEventListener('keydown', handleKey);
  }, [visible, onClose]);

  if (!visible) return null;
  return createPortal(
    <>
      <div
        onClick={onClose}
        style={{
          position: 'fixed',
          inset: 0,
          background: 'var(--bg-overlay-light)',
          zIndex: 998,
        }}
      />
      <div
        ref={sheetRef}
        role="dialog"
        aria-modal="true"
        tabIndex={-1}
        style={isDesktop ? {
          position: 'fixed',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          width: '90%',
          maxWidth: 520,
          maxHeight: '80vh',
          overflowY: 'auto',
          fontFamily: "'Segoe UI',-apple-system,sans-serif",
          background: 'var(--bg-sheet)',
          border: '1px solid var(--border)',
          borderRadius: 20,
          padding: '24px 28px 32px',
          zIndex: 999,
          animation: 'scaleIn 0.25s ease',
        } : {
          position: 'fixed',
          bottom: 0,
          left: 0,
          right: 0,
          maxWidth: "var(--content-max-width)",
          margin: '0 auto',
          fontFamily: "'Segoe UI',-apple-system,sans-serif",
          background: 'var(--bg-sheet)',
          borderTop: '1px solid var(--border)',
          borderRadius: '20px 20px 0 0',
          padding: '20px 20px 40px',
          zIndex: 999,
        }}
      >
        {!isDesktop && (
          <div
            style={{
              width: 36,
              height: 4,
              borderRadius: 2,
              background: 'var(--sheet-handle)',
              margin: '0 auto 16px',
            }}
          />
        )}
        {children}
      </div>
    </>,
    document.body
  );
}
