import React from 'react';
import { SUBS, ALL_PROFILES } from '../config/questionPools';
import { CARD, TYPE, COLORS } from '../constants/styles';
import { useNav } from '../contexts/NavigationContext';
import BackButton from './ui/BackButton';
import { Swords, Play } from 'lucide-react';
import { useBreakpoint } from '../hooks/useBreakpoint';
import { useT } from '../locales';

interface ChallengeProps {
  data: {
    subjectId: string;
    score: number;
    topicId?: string | null;
  } | null;
}

export default function Challenge({ data }: ChallengeProps) {
  const bp = useBreakpoint(); const isDesktop = bp === 'desktop';
  const { nav } = useNav();
  const t = useT();
  if (!data) return null;

  const { subjectId, score, topicId } = data;
  const sub = SUBS[subjectId] || ALL_PROFILES.find(p => p.id === subjectId);
  const subName = (t.subjects as Record<string, string>)[subjectId] || sub?.name || subjectId;
  const subIcon = sub?.icon || '\uD83D\uDCCB';
  const subColor = sub?.color || COLORS.teal;

  const accept = () => {
    sessionStorage.setItem('entprep_challenge', JSON.stringify({ subjectId, score, topicId }));
    window.history.replaceState({}, '', window.location.pathname);
    nav('test', subjectId, topicId);
  };

  const decline = () => {
    window.history.replaceState({}, '', window.location.pathname);
    nav('home');
  };

  return (
    <div style={{ padding: `0 var(--content-padding) ${isDesktop ? 40 : 100}px` }}>
      <BackButton onClick={decline} label={t.challenge.goHome} style={{ marginBottom: 20 }} />
      <div style={{
        ...CARD,
        background: 'linear-gradient(135deg,rgba(255,107,53,0.08),rgba(26,154,140,0.08))',
        border: '2px solid rgba(255,107,53,0.25)',
        borderRadius: 22, padding: '40px 24px', textAlign: 'center',
        animation: 'slideUp 0.5s cubic-bezier(0.16,1,0.3,1)',
      }}>
        <Swords size={56} color={COLORS.accent} style={{ marginBottom: 16 }} />
        <div style={{ ...TYPE.h2, fontSize: 20, marginBottom: 12 }}>{t.challenge.challenged}</div>
        <div style={{ fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.7, marginBottom: 24 }}>
          {t.challenge.friendScored} <span style={{ color: COLORS.accent, fontWeight: 700, fontSize: 16 }}>{score}%</span> {t.challenge.inSubject}
        </div>
        <div style={{
          background: 'var(--bg-card)', borderRadius: 16,
          border: `1px solid ${subColor}30`, padding: '18px 16px', marginBottom: 24,
          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 12,
        }}>
          <span style={{ fontSize: 32 }}>{subIcon}</span>
          <span style={{ fontSize: 16, fontWeight: 700, color: 'var(--text)' }}>{subName}</span>
        </div>
        <div style={{ fontSize: 18, fontWeight: 700, color: 'var(--text-body)', marginBottom: 28 }}>{t.challenge.canYouBeat}</div>
        <button onClick={accept} style={{
          width: '100%', padding: '16px',
          background: `linear-gradient(135deg,${COLORS.accent},${COLORS.accentDark})`, color: '#fff',
          border: 'none', borderRadius: 14, fontSize: 16, fontWeight: 700, cursor: 'pointer',
          boxShadow: '0 4px 24px rgba(255,107,53,0.3)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, marginBottom: 10,
        }}>
          <Play size={18} />{t.challenge.accept}
        </button>
        <button onClick={decline} style={{
          width: '100%', padding: '14px',
          background: 'var(--bg-subtle)', color: 'var(--text-muted)',
          border: '1px solid var(--border)', borderRadius: 14, fontSize: 13, fontWeight: 600, cursor: 'pointer',
        }}>
          {t.challenge.notNow}
        </button>
      </div>
    </div>
  );
}
