import type { Fonte } from "./types";

const eur = new Intl.NumberFormat("pt-PT", { style: "currency", currency: "EUR" });
const eurRedondo = new Intl.NumberFormat("pt-PT", { style: "currency", currency: "EUR", maximumFractionDigits: 0 });

export const euros = (v: number | null | undefined) => (v == null ? "—" : eur.format(v));
export const eurosCurto = (v: number | null | undefined) =>
  v == null ? "—" : Number.isInteger(v) ? eurRedondo.format(v) : eur.format(v);

export const NOME_FONTE: Record<string, string> = {
  olx: "OLX", vinted: "Vinted", wallapop: "Wallapop", custojusto: "CustoJusto", loja: "Loja", lojas: "Lojas",
};

export const FONTES: Fonte[] = ["olx", "vinted", "wallapop"];

const BANDEIRAS: Record<string, string> = { ES: "Espanha", FR: "França", IT: "Itália", DE: "Alemanha", PT: "Portugal" };
export const pais = (c: string) => BANDEIRAS[c] ?? c;

export function haQuanto(iso: string, agora = Date.now()): string {
  const min = Math.round((agora - new Date(iso).getTime()) / 60000);
  if (min < 1) return "agora mesmo";
  if (min < 60) return `há ${min} min`;
  const h = Math.round(min / 60);
  if (h < 24) return `há ${h} h`;
  const d = Math.round(h / 24);
  return d === 1 ? "ontem" : `há ${d} dias`;
}

export function dataHora(iso: string): string {
  return new Date(iso).toLocaleString("pt-PT", {
    timeZone: "Europe/Lisbon", day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit",
  });
}

export const hoje = () => new Date().toISOString().slice(0, 10);

export function slug(t: string): string {
  return t.normalize("NFKD").replace(/[̀-ͯ]/g, "").toLowerCase()
    .replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 40) || "procura";
}

export const listaDeTexto = (t: string) => t.split(",").map((s) => s.trim()).filter(Boolean);
