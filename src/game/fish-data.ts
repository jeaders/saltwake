import type { Species } from "./species";

type Definition = Pick<Species, "id" | "name" | "body" | "flank" | "fin" | "mark" | "pattern" | "shape" | "len" | "wid"> & Partial<Species>;
const fish = (d: Definition): Species => {
  const t = d.tier ?? 1;
  return {
    tier: t, value: t === 1 ? 24 : t === 2 ? 65 : 270,
    time: t === 1 ? 0.3 : t === 2 ? 0.8 : 2.5,
    speed: t === 1 ? 74 : t === 2 ? 94 : 112,
    panic: t === 1 ? 170 : t === 2 ? 220 : 270,
    flee: t === 1 ? 120 : t === 2 ? 155 : 200,
    school: t === 1 ? [10, 18] : t === 2 ? [3, 6] : [1, 1],
    ...d,
  };
};

/** New silhouettes, colours, patterns and behaviours. Regional distribution is arcade-inspired. */
export const EXTRA_FISH: Species[] = [
  fish({ id: "anchovy", name: "Acciuga", len: 20, wid: 6, value: 12, school: [15, 24], body: "#8ac9d8", flank: "#ecf9ff", fin: "#6998b8", mark: "#36688d", pattern: "line", shape: "fish", note: "Piccola ma socievole: una sola rete può fare una grande pescata." }),
  fish({ id: "seabream", name: "Orata", tier: 2, len: 42, wid: 22, value: 70, body: "#afbdd0", flank: "#f4f1d1", fin: "#d0a64a", mark: "#ffd46e", pattern: "bands", shape: "round", note: "La fascia dorata sul muso è il suo segno distintivo." }),
  fish({ id: "seabass", name: "Branzino", tier: 2, len: 58, wid: 17, body: "#718ca7", flank: "#e8f0f8", fin: "#607b94", mark: "#30465f", pattern: "line", shape: "fish", note: "Un velocista delle acque costiere del Mediterraneo." }),
  fish({ id: "redmullet", name: "Triglia", len: 29, wid: 12, body: "#ef7279", flank: "#ffe7c8", fin: "#d95467", mark: "#ffc76a", pattern: "line", shape: "fish", note: "Rossa come il tramonto, si muove in piccoli banchi." }),
  fish({ id: "garfish", name: "Aguglia", tier: 2, len: 76, wid: 9, speed: 124, body: "#469b9e", flank: "#c8f2ed", fin: "#2b757f", mark: "#e8ffff", pattern: "line", shape: "long", bill: 0.25, billColor: "#9ec5c0", note: "Lunga e affilata. Il suo becco è impossibile da confondere." }),
  fish({ id: "sole", name: "Sogliola", len: 34, wid: 24, speed: 44, school: [3, 6], body: "#ac8d64", flank: "#dbcaa6", fin: "#8c704e", mark: "#5e4d3b", pattern: "spots", shape: "flat", note: "Il mimetismo del fondale. Cercala vicino alle coste." }),
  fish({ id: "herring", name: "Aringa", len: 28, wid: 9, school: [14, 22], body: "#82acc7", flank: "#e6f5ff", fin: "#7392ad", mark: "#457092", pattern: "line", shape: "fish", note: "Forma grandi banchi argentati nei mari freddi." }),
  fish({ id: "pollock", name: "Merluzzo d’Alaska", len: 38, wid: 12, body: "#918e78", flank: "#eae1c8", fin: "#65745e", mark: "#4c5647", pattern: "spots", shape: "fish", note: "Un abitante instancabile del Pacifico settentrionale." }),
  fish({ id: "halibut", name: "Halibut", tier: 3, len: 94, wid: 66, value: 310, speed: 60, body: "#7b8478", flank: "#b5bfa7", fin: "#5d6c64", mark: "#344b43", pattern: "spots", shape: "flat", note: "Un gigante piatto: servirà la fiocina per tirarlo a bordo." }),
  fish({ id: "haddock", name: "Eglefino", len: 35, wid: 13, body: "#9b96b0", flank: "#e8e3f2", fin: "#80759b", mark: "#403753", pattern: "line", shape: "fish", note: "La linea scura sul fianco lo distingue dal merluzzo." }),
  fish({ id: "rockfish", name: "Scorfano", tier: 2, len: 38, wid: 27, speed: 55, body: "#df6752", flank: "#ffa16c", fin: "#b63f39", mark: "#762e35", pattern: "spots", shape: "round", spiky: true, note: "Rosso e spinoso. Bello da guardare, meglio non toccarlo." }),
  fish({ id: "butterfly", name: "Pesce farfalla", len: 30, wid: 22, body: "#ffe24f", flank: "#fffbc7", fin: "#e5b327", mark: "#25384d", pattern: "bands", shape: "round", note: "Piccolo, vivace e vestito di giallo. Ama le barriere coralline." }),
  fish({ id: "bluetang", name: "Chirurgo blu", tier: 2, len: 40, wid: 23, body: "#386fe5", flank: "#86bdff", fin: "#ffd253", mark: "#122350", pattern: "line", shape: "round", note: "Blu elettrico e coda gialla: una macchia di colore nella barriera." }),
  fish({ id: "parrotfish", name: "Pesce pappagallo", tier: 2, len: 47, wid: 23, body: "#20bdac", flank: "#91ead0", fin: "#f37cba", mark: "#6859bc", pattern: "bands", shape: "round", note: "I suoi colori cambiano con l’età. È il giardiniere della barriera." }),
  fish({ id: "triggerfish", name: "Pesce balestra", tier: 2, len: 42, wid: 25, body: "#634e95", flank: "#b3a0d8", fin: "#ffbb52", mark: "#fff1c5", pattern: "spots", shape: "round", note: "Un carattere deciso, con macchie chiare e pinne dorate." }),
  fish({ id: "lionfish", name: "Pesce leone", tier: 2, len: 42, wid: 25, body: "#c96150", flank: "#fff0c4", fin: "#da8564", mark: "#5d3547", pattern: "bands", shape: "round", spiky: true, note: "La corona di spine nasconde un predatore elegante." }),
  fish({ id: "wrasse", name: "Labrido", len: 27, wid: 10, body: "#63ce91", flank: "#adf0c9", fin: "#dd6fb3", mark: "#31886d", pattern: "stripes", shape: "fish", note: "Sfreccia in piccoli gruppi tra alghe e coralli." }),
  fish({ id: "snapper", name: "Dentice", tier: 2, len: 52, wid: 21, body: "#ed7f82", flank: "#ffe6d2", fin: "#c95160", mark: "#9c5ea3", pattern: "spots", shape: "fish", note: "Riflessi rosa e blu per uno dei classici della pesca costiera." }),
  fish({ id: "grouper", name: "Cernia gigante", tier: 3, len: 102, wid: 48, value: 350, speed: 57, body: "#738878", flank: "#b1b98b", fin: "#4d695d", mark: "#304e43", pattern: "spots", shape: "round", note: "Un incontro raro e pesante. Preparati con sonar e fiocina." }),
  fish({ id: "barracuda", name: "Barracuda", tier: 3, len: 114, wid: 17, value: 300, speed: 150, panic: 320, body: "#4e8da3", flank: "#d4eced", fin: "#2c657a", mark: "#234657", pattern: "stripes", shape: "long", note: "Un siluro argentato. Anticipa la sua traiettoria." }),
  fish({ id: "bonito", name: "Palamita", tier: 2, len: 54, wid: 17, speed: 125, body: "#4487b2", flank: "#d4eaf7", fin: "#2c577e", mark: "#1e365a", pattern: "stripes", shape: "fish", note: "Le strisce oblique tradiscono questa parente del tonno." }),
  fish({ id: "yellowfin", name: "Tonno pinna gialla", tier: 3, len: 100, wid: 29, value: 290, speed: 142, body: "#387d9c", flank: "#deedf1", fin: "#ffdf49", mark: "#e4c340", pattern: "line", shape: "fish", note: "Le pinne dorate illuminano i banchi del mare aperto." }),
  fish({ id: "skipjack", name: "Tonnetto striato", tier: 2, len: 59, wid: 19, school: [4, 7], body: "#596e9d", flank: "#cddbed", fin: "#3d4977", mark: "#283255", pattern: "stripes", shape: "fish", note: "I grandi gruppi rendono la rete particolarmente efficace." }),
  fish({ id: "marlin", name: "Marlin blu", tier: 3, len: 120, wid: 22, value: 420, speed: 155, body: "#315da9", flank: "#b9dcf9", fin: "#1d3980", mark: "#74bffc", pattern: "stripes", shape: "fish", bill: 0.45, billColor: "#c6e8f7", note: "Un trofeo del Pacifico: veloce, raro, indimenticabile." }),
  fish({ id: "wahoo", name: "Wahoo", tier: 2, len: 73, wid: 13, value: 85, speed: 140, body: "#378dba", flank: "#d7f1ff", fin: "#275d8a", mark: "#225279", pattern: "stripes", shape: "long", note: "Lungo e velocissimo. La fiocina ti aiuterà a raggiungerlo." }),
  fish({ id: "flyingfish", name: "Pesce volante", len: 34, wid: 10, speed: 110, body: "#72b7d9", flank: "#e4f8ff", fin: "#8ccae8", mark: "#4b799e", pattern: "line", shape: "fish", spiky: true, note: "Le sue grandi pinne gli permettono di planare sulle onde." }),
  fish({ id: "coelacanth", name: "Celacanto", tier: 3, len: 102, wid: 42, value: 500, speed: 50, body: "#4e6a9e", flank: "#9dadcf", fin: "#34497c", mark: "#e2ebf9", pattern: "spots", shape: "round", note: "Un fossile vivente, da osservare e rilasciare con rispetto.", protected: true }),
  fish({ id: "moray", name: "Murena", tier: 2, len: 94, wid: 13, value: 90, school: [1, 2], body: "#658354", flank: "#a4b875", fin: "#435e3b", mark: "#253e2b", pattern: "spots", shape: "eel", note: "Serpeggia tra rocce e coralli. Segui il suo movimento sinuoso." }),
  fish({ id: "conger", name: "Grongo", tier: 2, len: 102, wid: 14, school: [1, 3], body: "#7b8a9a", flank: "#cbd5de", fin: "#526170", mark: "#405565", pattern: "line", shape: "eel", note: "Un lungo nastro argentato nelle acque del Mediterraneo." }),
  fish({ id: "mola", name: "Pesce luna", tier: 3, len: 90, wid: 83, value: 380, speed: 42, body: "#9fb6c2", flank: "#deeced", fin: "#728d9f", mark: "#657b8e", pattern: "spots", shape: "flat", note: "Quasi una luna galleggiante: un gigante gentile.", protected: true }),
  fish({ id: "seahorse", name: "Cavalluccio marino", tier: 2, len: 40, wid: 23, value: 90, speed: 32, school: [2, 4], body: "#f9b85b", flank: "#ffe4a0", fin: "#ffdc84", mark: "#a86d36", pattern: "stripes", shape: "seahorse", note: "Un piccolo incontro prezioso. Si registra nel diario e si rilascia.", protected: true }),
  fish({ id: "squid", name: "Calamaro", tier: 2, len: 65, wid: 20, speed: 120, body: "#d785c6", flank: "#f9ccef", fin: "#ad559b", mark: "#873b81", pattern: "spots", shape: "squid", note: "Si sposta a propulsione: un lampo rosa tra le onde." }),
  fish({ id: "cuttlefish", name: "Seppia", tier: 2, len: 54, wid: 30, speed: 65, body: "#bf997b", flank: "#eddcc3", fin: "#ac7e62", mark: "#685347", pattern: "stripes", shape: "squid", note: "Morbide pinne e disegni sul mantello la distinguono dal calamaro." }),
  fish({ id: "octopus", name: "Polpo", tier: 2, len: 60, wid: 34, speed: 48, school: [1, 3], body: "#d47c79", flank: "#ffb3a0", fin: "#b2575f", mark: "#943e4f", pattern: "spots", shape: "squid", note: "Otto braccia, tanta curiosità e un perfetto mimetismo." }),
  fish({ id: "icefish", name: "Pesce ghiaccio", len: 31, wid: 8, body: "#badfe5", flank: "#f4ffff", fin: "#9dcbd9", mark: "#7fabbd", pattern: "line", shape: "long", note: "Quasi trasparente nelle acque gelide dell’oceano australe." }),
  fish({ id: "hatchetfish", name: "Pesce accetta", len: 24, wid: 20, body: "#53679e", flank: "#abebff", fin: "#32416a", mark: "#74efff", pattern: "spots", shape: "flat", glow: "#7ceeff", note: "Piccolo e luminoso: il suo bagliore arriva dal buio degli abissi." }),
  fish({ id: "dragonfish", name: "Drago nero", tier: 3, len: 110, wid: 15, value: 480, body: "#232d4b", flank: "#58628f", fin: "#172139", mark: "#fa729d", pattern: "spots", shape: "eel", glow: "#fb79ac", note: "Bioluminescenza rossa e una silhouette da leggenda." }),
];

export const FISH_POOLS: Record<string, [string, number][]> = {
  medit: [["sardine", 4], ["anchovy", 4], ["redmullet", 2.5], ["mackerel", 2], ["sole", 1.4], ["seabream", 1.8], ["seabass", 1.4], ["squid", 1], ["cuttlefish", 0.8], ["octopus", 0.6], ["garfish", 0.8], ["bonito", 0.9], ["conger", 0.5], ["seahorse", 0.35], ["bluefin", 0.45], ["grouper", 0.3], ["mola", 0.18], ["swordfish", 0.3]],
  caribbean: [["butterfly", 3], ["wrasse", 3], ["angelfish", 2], ["parrotfish", 2], ["bluetang", 1.8], ["snapper", 1.5], ["triggerfish", 1.3], ["lionfish", 1], ["moray", 0.8], ["seahorse", 0.5], ["barracuda", 0.35], ["manta", 0.3], ["grouper", 0.3]],
  greatbarrier: [["clownfish", 4], ["butterfly", 3], ["wrasse", 2.5], ["parrotfish", 2], ["angelfish", 1.5], ["bluetang", 1.5], ["triggerfish", 1.5], ["pufferfish", 1.2], ["lionfish", 1], ["moray", 0.8], ["seahorse", 0.6], ["grouper", 0.4], ["manta", 0.35]],
  northsea: [["herring", 4], ["cod", 3], ["haddock", 2], ["mackerel", 2], ["sole", 1.3], ["salmon", 1.5], ["seabass", 0.8], ["squid", 0.7], ["halibut", 0.35], ["sturgeon", 0.25]],
  pacificnw: [["perch", 4], ["herring", 3], ["pollock", 3], ["salmon", 2], ["rockfish", 1.8], ["squid", 1], ["char", 0.6], ["halibut", 0.4], ["sturgeon", 0.35]],
  arctic: [["cod", 4], ["herring", 3], ["icefish", 2], ["char", 2], ["haddock", 1.5], ["halibut", 0.5], ["narwhal", 0.3]],
  bering: [["pollock", 4], ["cod", 3], ["herring", 3], ["salmon", 1.8], ["char", 1.2], ["squid", 1], ["halibut", 0.5], ["narwhal", 0.15]],
  antarctic: [["icefish", 5], ["cod", 2], ["squid", 1.5], ["char", 1.5], ["halibut", 0.45], ["mola", 0.2]],
  japan: [["mackerel", 3], ["sardine", 3], ["anchovy", 2.5], ["squid", 2], ["yellowtail", 1.5], ["bonito", 1.2], ["skipjack", 1], ["rockfish", 0.9], ["swordfish", 0.3], ["bluefin", 0.5]],
  southatl: [["sparkfish", 3], ["flyingfish", 3], ["herring", 2], ["dorado", 2], ["wahoo", 1.4], ["squid", 1], ["swordfish", 0.45], ["yellowfin", 0.3]],
  sargasso: [["flyingfish", 4], ["sardine", 3], ["mackerel", 2], ["dorado", 2], ["wahoo", 1.5], ["bonito", 1.2], ["yellowtail", 1], ["marlin", 0.35], ["yellowfin", 0.4], ["mola", 0.2]],
  seasia: [["clownfish", 4], ["wrasse", 3], ["butterfly", 2.5], ["parrotfish", 2], ["bluetang", 1.5], ["lionfish", 1.2], ["seahorse", 1], ["moray", 0.8], ["manta", 0.4], ["grouper", 0.3]],
  indian: [["flyingfish", 3], ["mackerel", 3], ["dorado", 2], ["skipjack", 2], ["wahoo", 1.5], ["squid", 1], ["yellowfin", 0.4], ["marlin", 0.25], ["coelacanth", 0.15]],
  hawaii: [["flyingfish", 4], ["mackerel", 2.5], ["dorado", 2], ["yellowtail", 1.5], ["wahoo", 1.5], ["skipjack", 1.2], ["bluetang", 1], ["yellowfin", 0.5], ["marlin", 0.4], ["mola", 0.18]],
  midatl: [["lantern", 4], ["hatchetfish", 4], ["viperfish", 2], ["squid", 1], ["dragonfish", 0.4], ["oarfish", 0.3], ["coelacanth", 0.15]],
  marianas: [["lantern", 4], ["hatchetfish", 4], ["viperfish", 2.5], ["dragonfish", 0.5], ["oarfish", 0.4]],
};
