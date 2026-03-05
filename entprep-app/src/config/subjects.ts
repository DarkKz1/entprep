import type { SubjectMeta, SubjectConfig, ProfileSubject } from '../types/index';

export const SUBJECT_META: Record<string, SubjectMeta> = {
  math:{name:"Мат. грамотность",color:"#FF6B35"},
  reading:{name:"Грамотность чтения",color:"#8B5CF6"},
  history:{name:"История РК",color:"#0EA5E9"},
  geography:{name:"География",color:"#10B981"},
  english:{name:"Английский язык",color:"#F59E0B"},
  math_profile:{name:"Математика (профиль)",color:"#6366F1"},
  physics:{name:"Физика",color:"#EC4899"},
  biology:{name:"Биология",color:"#14B8A6"},
  chemistry:{name:"Химия",color:"#F97316"},
  world_history:{name:"Всемирная история",color:"#8B5CF6"},
  informatics:{name:"Информатика",color:"#06B6D4"},
  law:{name:"Основы права",color:"#D97706"},
  literature:{name:"Литература",color:"#E11D48"},
};

export const ALL_PROFILES_BASE: ProfileSubject[] = [
  {id:"geography",name:"География",icon:"🌍",color:"#10B981",cnt:20,available:true,examCnt:40},
  {id:"english",name:"Английский язык",icon:"🇬🇧",color:"#F59E0B",cnt:20,available:true,examCnt:40},
  {id:"math_profile",name:"Математика",icon:"📏",color:"#6366F1",cnt:20,available:true,examCnt:40},
  {id:"physics",name:"Физика",icon:"⚛️",color:"#EC4899",cnt:20,available:true,examCnt:40},
  {id:"biology",name:"Биология",icon:"🧬",color:"#14B8A6",cnt:20,available:true,examCnt:40},
  {id:"chemistry",name:"Химия",icon:"🧪",color:"#F97316",cnt:20,available:true,examCnt:40},
  {id:"world_history",name:"Всемирная история",icon:"📜",color:"#8B5CF6",cnt:20,available:true,examCnt:40},
  {id:"informatics",name:"Информатика",icon:"💾",color:"#06B6D4",cnt:20,available:true,examCnt:40},
  {id:"law",name:"Основы права",icon:"⚖️",color:"#D97706",cnt:20,available:true,examCnt:40},
  {id:"literature",name:"Литература",icon:"📚",color:"#E11D48",cnt:20,available:true,examCnt:40},
];

export const SUBS_BASE: Record<string, SubjectConfig> = {
  math:{id:"math",name:"Мат. грамотность",icon:"📐",color:"#FF6B35",cnt:10},
  reading:{id:"reading",name:"Грамотность чтения",icon:"📖",color:"#8B5CF6",cnt:10},
  history:{id:"history",name:"История Казахстана",icon:"🏛️",color:"#0EA5E9",cnt:20},
};
