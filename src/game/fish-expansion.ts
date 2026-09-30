import type { Species } from "./species";

type Entry = Partial<Species> & Pick<Species,"id"|"name"|"body"|"flank"|"fin"|"mark"|"shape"|"pattern"|"len"|"wid">;
function fish(e:Entry):Species {
  const t=e.tier??1;
  return {tier:t,value:t===1?28:t===2?78:340,time:t===1?.35:t===2?.8:3,speed:t===1?80:t===2?105:115,panic:t===1?175:245,flee:t===1?120:180,school:t===1?[9,17]:t===2?[3,6]:[1,1],...e};
}
export const NEW_FISH:Species[]=[
  fish({id:"hake",name:"Nasello",len:46,wid:12,body:"#8095a8",flank:"#eef5fa",fin:"#526d84",mark:"#536575",shape:"long",pattern:"line",note:"Un classico dei fondali costieri. I banchi argentati si pescano bene con la rete."}),
  fish({id:"horsemackerel",name:"Sugarello",len:33,wid:11,body:"#4b9eaf",flank:"#e0f6ef",fin:"#30677f",mark:"#61c7bc",shape:"fish",pattern:"line",note:"Un piccolo viaggiatore blu-verde che si muove in gruppi numerosi."}),
  fish({id:"sprat",name:"Spratto",len:21,wid:7,school:[17,25],body:"#9ac3d9",flank:"#fbfcf4",fin:"#6297ab",mark:"#356080",shape:"fish",pattern:"line",note:"Minuscolo e abbondante: la rete giusta trasforma il banco in una grande pescata."}),
  fish({id:"pagellus",name:"Pagello",len:31,wid:14,body:"#e39895",flank:"#ffdace",fin:"#c16672",mark:"#d4b752",shape:"fish",pattern:"spots",note:"Riflessi rosati per un pesce tipico delle coste mediterranee."}),
  fish({id:"pompano",name:"Leccia stella",tier:2,len:45,wid:28,body:"#8ca9b8",flank:"#e7eeee",fin:"#d8b85a",mark:"#557584",shape:"flat",pattern:"spots",note:"Il corpo piatto e le pinne dorate ricordano una piccola stella del mare."}),
  fish({id:"albacore",name:"Tonno alalunga",tier:3,len:88,wid:26,value:310,body:"#4a7096",flank:"#e1e8f0",fin:"#334d74",mark:"#afc7dc",shape:"fish",pattern:"line",note:"Pinne lunghissime, grande velocità. Una fiocina potenziata semplifica l'incontro."}),
  fish({id:"blackfin",name:"Tonno pinna nera",tier:2,len:66,wid:22,body:"#4c6984",flank:"#d4ded9",fin:"#25394a",mark:"#e6c76c",shape:"fish",pattern:"line",note:"Un tonno del mare caldo con riflessi bronzati sui fianchi."}),
  fish({id:"tarpon",name:"Tarpon",tier:3,len:105,wid:25,value:375,body:"#8fa8ab",flank:"#f4f2d8",fin:"#668d91",mark:"#b4c29c",shape:"fish",pattern:"spots",note:"Una sagoma argentata che può diventare la leggenda del tuo diario."}),
  fish({id:"sailfish",name:"Pesce vela",tier:3,len:110,wid:25,value:430,body:"#4670b2",flank:"#abdafa",fin:"#3356a0",mark:"#7bdcfa",shape:"fish",pattern:"stripes",bill:.38,billColor:"#badce7",spiky:true,note:"La grande vela dorsale si riconosce anche da lontano."}),
  fish({id:"yellowtang",name:"Chirurgo giallo",len:28,wid:22,body:"#f2d54c",flank:"#fff7a5",fin:"#e7bb34",mark:"#f8ee8f",shape:"round",pattern:"line",note:"Una pennellata di giallo tra i coralli del Pacifico."}),
  fish({id:"damselfish",name:"Damigella blu",len:22,wid:10,body:"#5593eb",flank:"#aed6ff",fin:"#3060b1",mark:"#73e9d5",shape:"fish",pattern:"spots",note:"Piccola ma luminosa: i suoi gruppi sono ottimi per allenarsi con la rete."}),
  fish({id:"moorish",name:"Idolo moresco",tier:2,len:34,wid:27,body:"#f5dc78",flank:"#fff5d4",fin:"#ede8be",mark:"#253543",shape:"round",pattern:"bands",spiky:true,note:"Bianco, nero e oro: uno degli incontri più eleganti della barriera."}),
  fish({id:"bannerfish",name:"Pesce bandiera",len:28,wid:23,body:"#f3ead1",flank:"#fffff4",fin:"#ffd551",mark:"#2d3b4b",shape:"round",pattern:"bands",spiky:true,note:"La lunga pinna dorsale ondeggia come un piccolo stendardo."}),
  fish({id:"napoleon",name:"Pesce Napoleone",tier:3,len:95,wid:51,value:390,body:"#5aaba0",flank:"#b5d6a3",fin:"#426e72",mark:"#78c4b2",shape:"round",pattern:"stripes",protected:true,note:"Un gigante gentile e protetto: osserva, registra e rilascia."}),
  fish({id:"trevally",name:"Carango gigante",tier:3,len:96,wid:31,value:360,body:"#718e98",flank:"#dbe6df",fin:"#435f70",mark:"#92b2bd",shape:"fish",pattern:"spots",note:"Un nuotatore robusto del mare aperto. Vale la pena seguirlo."}),
  fish({id:"whaleshark",name:"Squalo balena",tier:3,len:155,wid:55,value:600,speed:58,body:"#52738c",flank:"#bfd0d5",fin:"#3b536e",mark:"#f4f4d7",shape:"shark",pattern:"spots",protected:true,note:"Non attacca la barca. Un incontro tranquillo con il pesce più grande del mondo."}),
  fish({id:"nurseshark",name:"Squalo nutrice",tier:3,len:97,wid:28,speed:55,body:"#a58f6e",flank:"#d7c6a3",fin:"#7c7158",mark:"#7b7258",shape:"shark",pattern:"spots",protected:true,note:"Questo squalo non partecipa agli attacchi: resta un incontro da registrare e rilasciare."}),
  fish({id:"eagleray",name:"Aquila di mare",tier:3,len:93,wid:109,value:370,body:"#465970",flank:"#7e91a8",fin:"#334157",mark:"#fff7cf",shape:"ray",pattern:"spots",protected:true,note:"Una razza maculata pacifica. Vola sott'acqua senza minacciare il peschereccio."}),
  fish({id:"greatwhite",name:"Squalo bianco",tier:3,len:132,wid:38,value:480,predator:true,speed:96,body:"#7b94a5",flank:"#ecf2ef",fin:"#587284",mark:"#42596b",shape:"shark",pattern:"none",note:"Evento arcade: avverte prima di caricare. Schiva, usa la fiocina o il dissuasore."}),
  fish({id:"tigershark",name:"Squalo tigre",tier:3,len:121,wid:34,value:410,predator:true,speed:108,body:"#789890",flank:"#d6ddd0",fin:"#51716f",mark:"#315151",shape:"shark",pattern:"stripes",note:"Le strisce e il largo muso distinguono questo predatore delle acque tropicali."}),
  fish({id:"hammerhead",name:"Squalo martello",tier:3,len:116,wid:30,value:390,predator:true,speed:112,body:"#669eae",flank:"#d7ece9",fin:"#427485",mark:"#386878",shape:"shark",pattern:"line",note:"Nel gioco compie cariche segnalate. Il radar ti dà il tempo di reagire."}),
  fish({id:"mako",name:"Squalo mako",tier:3,len:103,wid:25,value:420,predator:true,speed:132,body:"#345d9b",flank:"#d9e6ef",fin:"#254577",mark:"#85b8de",shape:"shark",pattern:"line",note:"Veloce, ma la carica mantiene una traiettoria fissa: cambia direzione al momento giusto."}),
  fish({id:"stingray",name:"Pastinaca gigante",tier:3,len:89,wid:100,value:340,predator:true,speed:80,body:"#927d6c",flank:"#c5b194",fin:"#685e52",mark:"#6c5846",shape:"ray",pattern:"spots",protected:true,note:"Attacco difensivo in stile arcade. Se si allontana, viene registrata e rilasciata."}),
  fish({id:"giantsquid",name:"Calamaro gigante",tier:3,len:133,wid:47,value:560,predator:true,speed:92,body:"#a44d81",flank:"#ef98ba",fin:"#703662",mark:"#f4c8d9",shape:"squid",pattern:"spots",note:"Una grande sagoma negli abissi. Tieni pronta la difesa sonar e proteggi lo scafo."}),
];

export const REGION_ADDITIONS: Record<string,[string,number][]> = {
  medit:[["hake",2],["horsemackerel",2],["pagellus",1.8],["pompano",1],["albacore",.3]],
  caribbean:[["blackfin",1.2],["tarpon",.35],["nurseshark",.18],["eagleray",.22]],
  greatbarrier:[["damselfish",2.8],["bannerfish",2],["moorish",1],["napoleon",.24],["nurseshark",.2]],
  northsea:[["sprat",3],["hake",2],["horsemackerel",1.8]],
  pacificnw:[["sprat",2],["albacore",.3],["hake",1.6]],
  arctic:[["sprat",2]],bering:[["sprat",2.5],["hake",1.6]],antarctic:[["hake",1.5]],
  japan:[["horsemackerel",2],["trevally",.25],["albacore",.3]],
  southatl:[["sailfish",.35],["albacore",.35]],sargasso:[["blackfin",1.4],["tarpon",.25],["sailfish",.3]],
  seasia:[["damselfish",3],["moorish",1.3],["bannerfish",2],["napoleon",.3],["whaleshark",.15]],
  indian:[["trevally",.3],["sailfish",.3],["whaleshark",.18]],
  hawaii:[["yellowtang",3],["damselfish",2.5],["moorish",1.4],["eagleray",.3],["sailfish",.25]],
  midatl:[["whaleshark",.12]],marianas:[["napoleon",.1]],
};
export const PREDATOR_POOLS:Record<string,string[]>={
  medit:["shark","mako","greatwhite"],caribbean:["tigershark","hammerhead","stingray"],
  greatbarrier:["tigershark","hammerhead","stingray"],northsea:["shark","mako"],
  pacificnw:["greatwhite","shark"],arctic:["orca","shark"],bering:["orca","greatwhite"],
  antarctic:["orca","giantsquid"],japan:["mako","hammerhead"],southatl:["mako","greatwhite"],
  sargasso:["tigershark","mako"],seasia:["hammerhead","stingray","tigershark"],
  indian:["tigershark","greatwhite"],hawaii:["tigershark","hammerhead"],
  midatl:["angler","giantsquid"],marianas:["giantsquid","angler"],
};
