import type { Categoria } from "./types";

// Como os anúncios costumam escrever cada tamanho de SSD (igual ao script Python).
const TAMANHOS_IRMAOS: Record<number, string[]> = {
  64: ["60gb", "64gb"], 128: ["120gb", "128gb"], 180: ["180gb"],
  250: ["240gb", "250gb", "256gb"], 500: ["480gb", "500gb", "512gb"], 750: ["750gb", "800gb"],
  1000: ["960gb", "1tb"], 2000: ["2tb"], 4000: ["4tb"],
};

// palavras do nome que descrevem o tipo de produto e não ajudam na pesquisa
const GENERICAS = [
  "placa grafica", "placa de video", "grafica", "consola", "portatil", "computador", "telemovel",
  "smartphone", "processador", "monitor", "tablet", "auscultadores", "headphones", "comando",
  "comandos", "teclado", "rato", "disco", "memoria", "camara", "maquina fotografica", "objectiva",
  "objetiva", "relogio", "coluna", "colunas", "usado", "usada", "barato", "barata",
];

const normalizar = (t: string) =>
  t.normalize("NFKD").replace(/[̀-ͯ]/g, "").toLowerCase().replace(/\s+/g, " ").trim();

const unicos = (l: string[]) => [...new Set(l.map((x) => x.trim()).filter(Boolean))];

export interface DadosSugestao {
  nome: string;
  categoria: Categoria;
  capacidades: number[];
  interfaces: string[];
  ddr: string[];
  formatos: string[];
}

/** Termos de pesquisa sugeridos a partir do nome e das opções escolhidas. */
export function sugerirTermos(d: DadosSugestao): string[] {
  if (d.categoria === "ssd") {
    const t: string[] = [];
    for (const c of d.capacidades) {
      for (const tam of TAMANHOS_IRMAOS[c] ?? [`${c}gb`]) t.push(`ssd ${tam}`);
      if (d.interfaces.includes("NVMe")) t.push(`nvme ${(TAMANHOS_IRMAOS[c] ?? [`${c}gb`]).slice(-1)[0]}`);
    }
    return unicos(t);
  }
  if (d.categoria === "ram") {
    const t: string[] = [];
    const geracoes = d.ddr.length ? d.ddr : ["DDR4"];
    for (const c of d.capacidades)
      for (const g of geracoes.map((x) => x.toLowerCase())) {
        t.push(`ram ${g} ${c}gb`, `memoria ${g} ${c}gb`);
        if (c >= 8) t.push(`${g} 2x${c / 2}gb`);
        if (d.formatos.length === 1 && d.formatos[0] === "portátil") t.push(`sodimm ${g} ${c}gb`);
      }
    return unicos(t);
  }
  if (d.categoria === "pecas") {
    return ["portatil ssd", "computador ssd", "mini pc ssd", "ordenador portatil ssd"];
  }
  // genérico: o nome sem as palavras que só dizem o tipo de produto
  const n = normalizar(d.nome);
  if (!n) return [];
  let nucleo = n;
  for (const g of GENERICAS) nucleo = nucleo.replace(new RegExp(`(^|\\s)${g}(?=\\s|$)`, "g"), " ");
  nucleo = nucleo.replace(/\s+/g, " ").trim() || n;
  const t = [nucleo];
  const gpu = nucleo.match(/\b(rtx|gtx)\s?(\d{3,4})(\s?ti|\s?super)?\b/);
  if (gpu) t.push(`geforce ${gpu[2]}${gpu[3] ?? ""}`.replace(/\s+/g, " "));
  const radeon = nucleo.match(/\brx\s?(\d{3,4})(\s?xt)?\b/);
  if (radeon) t.push(`radeon rx ${radeon[1]}${radeon[2] ?? ""}`.replace(/\s+/g, " "));
  return unicos(t);
}
