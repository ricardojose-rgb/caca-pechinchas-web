// Formatos dos ficheiros do repositório caca-pechinchas (escritos pelo script Python).

export type Fonte = "olx" | "vinted" | "wallapop" | "custojusto" | "loja";

export interface Negocio {
  chave: string;
  fonte: Fonte;
  titulo: string;
  url: string;
  foto: string;
  fotos?: string[];
  local: string;
  pais: string;
  preco: number;
  extras: number;
  total: number;
  nota: string;
  resumo: string;
  grupo: string;
  atributos: Record<string, unknown>;
  condicao: "novo" | "como novo" | "usado" | string;
  referencia: number | null;
  referencia_origem: string;
  desconto: number;
  margem_revenda: number | null;
  negocio: boolean;
  motivos: string[];
  baixou_preco: boolean;
  primeiro_visto: string;
  ultimo_visto: string;
  unidades?: number;
  abaixo_do_novo: number | null;
  /** artigo de um anúncio com vários artigos (cada um com o seu preço) */
  lote?: { titulo: string; artigos: number; quantidade: number };
}

export interface ResultadoProcura {
  id: string;
  nome: string;
  categoria: Categoria;
  preco_max: number;
  medianas: Record<string, { mediana: number; n: number }>;
  novo_mais_barato: Negocio | null;
  negocios: Negocio[];
  mais_baratos: Negocio[];
  total_anuncios: number;
}

export interface EstadoFonte {
  ok: boolean;
  lidos: number;
  relevantes: number;
  erros: string[];
}

export interface Negocios {
  atualizado: string;
  estado_fontes: Record<string, EstadoFonte>;
  procuras: ResultadoProcura[];
  compras: { n: number; investido: number; vendidas: number; lucro: number };
  favoritos?: { n: number; alertas: AlertaFavorito[] };
}

export interface AlertaFavorito {
  tipo: "favorito_baixou" | "favorito_saiu";
  url: string;
  titulo: string;
  preco?: number;
  antes?: number;
  estado?: string;
  quando: string;
}

export interface Favorito {
  url: string;
  chave?: string;
  titulo?: string;
  /** guardados ao seguir a partir de um negócio, para aparecerem logo */
  foto?: string;
  preco?: number;
  adicionado: string;
}

export interface Oculto {
  chave: string;
  titulo?: string;
  url?: string;
  quando?: string;
}

export interface ConfigFavoritos {
  favoritos: Favorito[];
  /** anúncios que excluíste: não voltam a aparecer nos negócios */
  ocultos?: Oculto[];
  [outro: string]: unknown;
}

export type EstadoFavorito = "disponível" | "reservado" | "vendido" | "removido" | "erro";

export interface FavoritoVisto {
  titulo?: string;
  preco?: number | null;
  foto?: string;
  estado: EstadoFavorito;
  fonte?: string;
  verificado?: string;
  precos?: [string, number][];
  erro?: string;
}

export type Categoria = "ssd" | "ram" | "monitor" | "pecas" | "generico";

export interface Procura {
  id: string;
  nome: string;
  categoria: Categoria;
  termos: string[];
  preco_max: number;
  preco_min?: number;
  ativa?: boolean;
  // ssd / ram
  capacidades?: number[];
  interfaces?: string[];
  incluir_externos?: boolean;
  ddr?: string[];
  formatos?: string[];
  // monitores
  polegadas?: number[];
  resolucoes?: string[];
  hz_min?: number;
  // PCs às peças
  margem_minima?: number;
  // genérico
  obrigatorio?: string[];
  excluir?: string[];
  variantes?: Record<string, string>;
  [outro: string]: unknown;
}

export interface ConfigProcuras {
  procuras: Procura[];
  [outro: string]: unknown;
}

export interface Compra {
  /** identificador próprio (duas compras nunca têm o mesmo) */
  id?: string;
  chave?: string;
  titulo: string;
  url?: string;
  procura?: string;
  preco_pago: number;
  data: string;
  vendido_por?: number | null;
  data_venda?: string | null;
  /** links dos teus anúncios de venda (OLX, Vinted...) para vigiar */
  a_venda?: string[];
  foto?: string;
  /** mediana do mercado quando compraste */
  mediana?: number;
}

/** data/vendas.json: anúncio pronto a colar e estado dos teus anúncios de venda */
export interface VendaPreparada {
  titulo_compra: string;
  foto?: string;
  fotos?: string[];
  tipo: "ssd" | "ram" | "monitor" | "pc" | "outro";
  anuncio: {
    titulo: string;
    descricao: string;
    preco: { justo: number; rapido: number; pago: number; margem_justo: number; margem_rapido: number; nota: string };
    vinted_pacote: string;
    categoria: string;
    estado: string;
    fotos: string;
  };
  vender_em: Record<string, string>;
  a_venda: Record<string, { estado: EstadoFavorito; preco?: number | null; titulo?: string | null; verificado?: string; fonte?: string; erro?: string }>;
  vendido_detectado?: { url: string; preco: number | null; quando: string };
}

/** Igual ao script: identifica a compra em data/vendas.json. */
export const chaveCompra = (c: Compra) => c.id || c.chave || `${c.titulo}|${c.data}|${c.preco_pago}`;

export const novoId = () => Math.random().toString(16).slice(2, 12).padEnd(10, "0");

/** Junta uma compra nova, a não ser que o mesmo anúncio já lá esteja. */
export function juntarCompra(cfg: ConfigCompras, nova: Compra): ConfigCompras {
  const lista = cfg.compras ?? [];
  if (lista.some((c) => (nova.url && c.url === nova.url) || (nova.chave && c.chave === nova.chave)))
    throw new Error("Esta compra já está registada em Compras.");
  return { ...cfg, compras: [...lista, { ...nova, id: nova.id ?? novoId() }] };
}

export interface ConfigCompras {
  compras: Compra[];
  [outro: string]: unknown;
}
