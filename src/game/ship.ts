export type HullPaint = "coral" | "lagoon" | "navy" | "ochre" | "sage" | "pearl";
export type CabinPaint = "ivory" | "slate" | "wood";
export type FlagColor = "sun" | "sea" | "coral" | "mint";
export type ShipModel = "classic" | "explorer" | "cabin";
export interface ShipAppearance { name: string; hull: HullPaint; cabin: CabinPaint; flag: FlagColor; model: ShipModel; }
export const HULL_PAINTS:Record<HullPaint,{name:string;color:string;edge:string}>={
  coral:{name:"Corallo",color:"#ed856e",edge:"#a55045"},lagoon:{name:"Laguna",color:"#62bbae",edge:"#32796f"},
  navy:{name:"Blu oceano",color:"#607eae",edge:"#314c76"},ochre:{name:"Sole",color:"#ebc177",edge:"#a27945"},
  sage:{name:"Salvia",color:"#9bb497",edge:"#586e59"},pearl:{name:"Perla",color:"#ece4c8",edge:"#aba583"},
};
export const CABIN_PAINTS:Record<CabinPaint,{name:string;color:string;edge:string}>={
  ivory:{name:"Avorio",color:"#fff1d3",edge:"#c3b493"},slate:{name:"Ardesia",color:"#5d7b87",edge:"#344e60"},wood:{name:"Legno",color:"#bf966b",edge:"#876345"},
};
export const FLAGS:Record<FlagColor,{name:string;color:string}>={sun:{name:"Oro",color:"#ffd17b"},sea:{name:"Mare",color:"#98daf0"},coral:{name:"Rosso",color:"#ee9b87"},mint:{name:"Menta",color:"#a7e2ba"}};
export const SHIP_MODELS:Record<ShipModel,{name:string;description:string}>={classic:{name:"Classico",description:"Linee pulite, ponte in legno."},explorer:{name:"Esploratore",description:"Cabina compatta e pannello solare."},cabin:{name:"Cabinato",description:"Tettuccio ampio e oblò laterali."}};
export const defaultShip=():ShipAppearance=>({name:"Stella del Mare",hull:"coral",cabin:"ivory",flag:"sun",model:"classic"});
export function validatedShip(d:Partial<ShipAppearance>|undefined):ShipAppearance {
  const s=defaultShip();if(!d)return s;
  if(typeof d.name==="string")s.name=d.name.replace(/[<>\u0000-\u001f]/g,"").slice(0,24).trim()||s.name;
  if(d.hull&&Object.prototype.hasOwnProperty.call(HULL_PAINTS,d.hull))s.hull=d.hull;if(d.cabin&&Object.prototype.hasOwnProperty.call(CABIN_PAINTS,d.cabin))s.cabin=d.cabin;
  if(d.flag&&Object.prototype.hasOwnProperty.call(FLAGS,d.flag))s.flag=d.flag;if(d.model&&Object.prototype.hasOwnProperty.call(SHIP_MODELS,d.model))s.model=d.model;
  return s;
}
