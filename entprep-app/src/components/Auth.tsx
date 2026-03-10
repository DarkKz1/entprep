import React, { useRef, useState } from 'react';
import { supabase } from '../config/supabase';
import { CARD_COMPACT, COLORS } from '../constants/styles';
import { LogOut, Key, Cloud, Camera, Loader2 } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { uploadAvatar } from '../utils/avatarHelpers';
import { useToast } from '../contexts/ToastContext';
import { useT } from '../locales';
import type { AuthUser } from '../types/index';

interface AuthProps {
  user: AuthUser | null;
  onSignOut: () => void;
}

export default function Auth({ user, onSignOut }: AuthProps) {
  const { profile, refreshUser, refreshProfile } = useAuth();
  const toast = useToast();
  const t = useT();
  const fileRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);

  if (!supabase) return null;

  const signInWith = async (provider: 'google' | 'apple') => {
    await supabase!.auth.signInWithOAuth({
      provider,
      options: { redirectTo: 'https://entprep.netlify.app' }
    });
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;
    e.target.value = '';
    setUploading(true);
    try {
      await uploadAvatar(user.id, file);
      await Promise.all([refreshUser(), refreshProfile()]);
      toast.success(t.auth.photoUpdated);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t.auth.photoError);
    } finally {
      setUploading(false);
    }
  };

  if (user) {
    const meta = user.user_metadata as Record<string, string> | undefined;
    const avatar = profile?.avatar_url || meta?.avatar_url;
    const fullName = profile?.display_name || meta?.full_name;
    const initials = (fullName || 'U').split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase();

    return (
      <div style={{ ...CARD_COMPACT, marginBottom: 8 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 11, marginBottom: 12 }}>
          <div
            onClick={() => !uploading && fileRef.current?.click()}
            style={{ position: 'relative', width: 36, height: 36, cursor: 'pointer', flexShrink: 0 }}
          >
            {avatar ? (
              <img src={avatar} alt={fullName || 'Avatar'} style={{ width: 36, height: 36, borderRadius: 18, border: `2px solid ${COLORS.accent}`, objectFit: 'cover' }} />
            ) : (
              <div style={{ width: 36, height: 36, borderRadius: 18, border: `2px solid ${COLORS.accent}`, background: `linear-gradient(135deg,${COLORS.accent},#e55a2b)`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, fontWeight: 700, color: '#fff' }}>
                {initials}
              </div>
            )}
            {uploading ? (
              <div style={{ position: 'absolute', inset: 0, borderRadius: 18, background: 'rgba(0,0,0,0.45)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Loader2 size={16} color="#fff" style={{ animation: 'spin 1s linear infinite' }} />
              </div>
            ) : (
              <div style={{ position: 'absolute', bottom: -2, right: -2, width: 16, height: 16, borderRadius: 8, background: COLORS.accent, display: 'flex', alignItems: 'center', justifyContent: 'center', border: '2px solid var(--bg)' }}>
                <Camera size={8} color="#fff" />
              </div>
            )}
          </div>
          <input ref={fileRef} type="file" accept="image/*" onChange={handleFileSelect} style={{ display: 'none' }} />
          <div>
            <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)' }}>{fullName || t.auth.user}</div>
            <div style={{ fontSize: 11, color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: 4 }}><Cloud size={11} />{t.auth.syncOn}</div>
          </div>
        </div>
        <button onClick={onSignOut} style={{ width: '100%', padding: '11px', background: 'rgba(239,68,68,0.06)', border: '1px solid rgba(239,68,68,0.18)', borderRadius: 10, color: COLORS.red, fontSize: 12, fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
          <LogOut size={14} />{t.auth.signOut}
        </button>
      </div>
    );
  }

  const btnBase: React.CSSProperties = {
    width: '100%', padding: '14px', borderRadius: 12,
    fontSize: 13, fontWeight: 600, cursor: 'pointer',
    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10,
    transition: 'opacity 0.2s',
  };

  return (
    <div style={{ ...CARD_COMPACT, marginBottom: 8 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, fontWeight: 600, color: 'var(--text)', marginBottom: 5 }}>
        <Key size={15} />{t.auth.account}
      </div>
      <div style={{ fontSize: 11, color: 'var(--text-secondary)', marginBottom: 12 }}>{t.auth.syncDesc}</div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        <button onClick={() => signInWith('google')} style={{
          ...btnBase, background: '#fff', border: '1px solid #dadce0', color: '#3c4043',
          boxShadow: '0 1px 3px rgba(0,0,0,0.08)',
        }}>
          <svg width="18" height="18" viewBox="0 0 48 48">
            <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"/>
            <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"/>
            <path fill="#FBBC05" d="M10.53 28.59a14.5 14.5 0 010-9.18l-7.98-6.19a24.001 24.001 0 000 21.56l7.98-6.19z"/>
            <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"/>
          </svg>
          {t.auth.signInGoogle}
        </button>
        <button onClick={() => signInWith('apple')} style={{
          ...btnBase, background: '#000', border: '1px solid #000', color: '#fff',
        }}>
          <svg width="16" height="18" viewBox="0 0 17 20" fill="#fff">
            <path d="M13.19 10.47c-.03-2.67 2.18-3.95 2.28-4.01-1.24-1.82-3.17-2.07-3.86-2.1-1.64-.17-3.2.97-4.03.97-.84 0-2.13-.94-3.5-.92-1.8.03-3.46 1.05-4.39 2.66-1.87 3.25-.48 8.06 1.34 10.7.89 1.29 1.95 2.74 3.35 2.69 1.34-.05 1.85-.87 3.47-.87 1.62 0 2.08.87 3.5.84 1.45-.02 2.36-1.31 3.24-2.61 1.02-1.5 1.44-2.95 1.47-3.02-.03-.01-2.82-1.08-2.87-4.33zM10.52 2.74c.74-.9 1.24-2.14 1.1-3.39-1.07.04-2.36.71-3.12 1.61-.69.79-1.29 2.07-1.13 3.29 1.19.09 2.4-.61 3.15-1.51z"/>
          </svg>
          {t.auth.signInApple}
        </button>
      </div>
    </div>
  );
}
