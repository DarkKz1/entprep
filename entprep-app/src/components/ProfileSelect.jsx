import React, { useState } from "react";
import { ALL_PROFILES } from '../config/questionPools.js';
import { CARD_COMPACT, CARD_HERO, TYPE } from '../constants/styles.js';
import { Target, Check, ArrowRight } from 'lucide-react';

export default function ProfileSelect({onConfirm}){
  const[sel,setSel]=useState([]);
  const toggle=id=>{
    if(!ALL_PROFILES.find(p=>p.id===id).available)return;
    setSel(prev=>{
      if(prev.includes(id))return prev.filter(x=>x!==id);
      if(prev.length>=2)return prev;
      return[...prev,id];
    });
  };
  return(<div style={{padding:"0 20px 100px"}}>
    <div style={{...CARD_HERO,textAlign:"center",marginBottom:20}}>
      <div style={{width:60,height:60,borderRadius:18,background:"rgba(255,107,53,0.15)",display:"flex",alignItems:"center",justifyContent:"center",margin:"0 auto 14px"}}>
        <Target size={30} color="#FF6B35"/>
      </div>
      <h1 style={{...TYPE.h1,fontSize:20,marginBottom:8}}>Выбери профильные предметы</h1>
      <p style={{...TYPE.bodySmall,margin:0}}>ЕНТ включает 2 профильных предмета по 40 заданий каждый</p>
      <p style={{...TYPE.caption,marginTop:5}}>Выбери ровно 2 предмета. Можно изменить в настройках.</p>
    </div>
    <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8,marginBottom:18}}>
      {ALL_PROFILES.map(p=>{
        const active=sel.includes(p.id);
        const disabled=!p.available;
        return(<button key={p.id} onClick={()=>toggle(p.id)} disabled={disabled} style={{
          ...CARD_COMPACT,
          background:active?"rgba(255,107,53,0.1)":"rgba(30,30,50,0.55)",
          border:active?"2px solid #FF6B35":"2px solid rgba(255,255,255,0.06)",
          padding:"14px 10px",cursor:disabled?"not-allowed":"pointer",
          textAlign:"center",transition:"all 0.25s",opacity:disabled?0.4:1,position:"relative",
          transform:active?"scale(1.02)":"scale(1)",
        }}>
          {active&&<div style={{position:"absolute",top:7,right:7,width:20,height:20,borderRadius:10,background:"#FF6B35",display:"flex",alignItems:"center",justifyContent:"center"}}>
            <Check size={12} color="#fff"/>
          </div>}
          <div style={{fontSize:28,marginBottom:6}}>{p.icon}</div>
          <div style={{fontSize:12,fontWeight:700,color:disabled?"#64748b":"#fff"}}>{p.name}</div>
          {p.available?<div style={{fontSize:11,color:"#94a3b8",marginTop:3}}>{p.pool} вопросов</div>
          :<div style={{fontSize:11,color:"#64748b",marginTop:3,fontStyle:"italic"}}>Скоро</div>}
        </button>);
      })}
    </div>
    <div style={{fontSize:12,color:"#94a3b8",textAlign:"center",marginBottom:14}}>
      Выбрано: <span style={{color:"#FF6B35",fontWeight:700}}>{sel.length}</span> / 2
    </div>
    <button onClick={()=>onConfirm(sel)} disabled={sel.length!==2} style={{
      width:"100%",padding:"16px",background:sel.length===2?"linear-gradient(135deg,#FF6B35,#e85d26)":"rgba(42,42,62,0.6)",
      border:"none",borderRadius:14,color:sel.length===2?"#fff":"#64748b",fontSize:15,fontWeight:700,
      cursor:sel.length===2?"pointer":"not-allowed",transition:"all 0.3s",
      boxShadow:sel.length===2?"0 4px 20px rgba(255,107,53,0.25)":"none",
      display:"flex",alignItems:"center",justifyContent:"center",gap:8,
    }}>
      {sel.length===2?<>Подтвердить выбор<ArrowRight size={18}/></>:"Выберите 2 предмета"}
    </button>
  </div>);
}
