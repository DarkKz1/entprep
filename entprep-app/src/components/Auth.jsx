import React from "react";
import { supabase } from '../config/supabase.js';
import { CARD_COMPACT } from '../constants/styles.js';
import { LogOut, Key, Cloud } from 'lucide-react';

export default function Auth({ user, onSignOut }) {
  if (!supabase) return null;

  const signIn = async () => {
    await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: window.location.origin }
    });
  };

  if (user) {
    const avatar = user.user_metadata?.avatar_url;
    return (
      <div style={{...CARD_COMPACT,marginBottom:8}}>
        <div style={{display:"flex",alignItems:"center",gap:11,marginBottom:12}}>
          {avatar && <img src={avatar} alt="" style={{width:36,height:36,borderRadius:18,border:"2px solid #FF6B35"}}/>}
          <div>
            <div style={{fontSize:13,fontWeight:600,color:"#fff"}}>{user.user_metadata?.full_name || "Пользователь"}</div>
            <div style={{fontSize:11,color:"#94a3b8",display:"flex",alignItems:"center",gap:4}}><Cloud size={11}/>Синхронизация вкл.</div>
          </div>
        </div>
        <button onClick={onSignOut} style={{width:"100%",padding:"11px",background:"rgba(239,68,68,0.06)",border:"1px solid rgba(239,68,68,0.18)",borderRadius:10,color:"#ef4444",fontSize:12,fontWeight:600,cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center",gap:6}}>
          <LogOut size={14}/>Выйти из аккаунта
        </button>
      </div>
    );
  }

  return (
    <div style={{...CARD_COMPACT,marginBottom:8}}>
      <div style={{display:"flex",alignItems:"center",gap:6,fontSize:13,fontWeight:600,color:"#fff",marginBottom:5}}>
        <Key size={15}/>Аккаунт
      </div>
      <div style={{fontSize:11,color:"#94a3b8",marginBottom:12}}>Войдите для синхронизации прогресса между устройствами</div>
      <button onClick={signIn} style={{width:"100%",padding:"12px",background:"linear-gradient(135deg,#FF6B35,#e55a2b)",border:"none",borderRadius:10,color:"#fff",fontSize:13,fontWeight:700,cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center",gap:8}}>
        <svg width="16" height="16" viewBox="0 0 48 48"><path fill="#FFC107" d="M43.6 20.1H42V20H24v8h11.3C33.9 33.5 29.4 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3 0 5.8 1.1 7.9 3l5.7-5.7C34 5.9 29.3 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.3-.1-2.7-.4-3.9z"/><path fill="#FF3D00" d="M6.3 14.7l6.6 4.8C14.4 15.2 18.8 12 24 12c3 0 5.8 1.1 7.9 3l5.7-5.7C34 5.9 29.3 4 24 4 16.3 4 9.7 8.3 6.3 14.7z"/><path fill="#4CAF50" d="M24 44c5.2 0 9.9-1.8 13.4-5l-6.2-5.2C29.3 35.2 26.7 36 24 36c-5.3 0-9.8-2.5-11.3-8H6.1C9.5 39.6 16.2 44 24 44z"/><path fill="#1976D2" d="M43.6 20.1H42V20H24v8h11.3c-.8 2.3-2.2 4.2-4.1 5.6l6.2 5.2C36.7 39.4 44 34 44 24c0-1.3-.1-2.7-.4-3.9z"/></svg>
        Войти через Google
      </button>
    </div>
  );
}
