import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import {
  alterarJson, ErroGitHub, lerJson, pesquisarAgora, REPO_PADRAO, ultimaExecucao,
  type Execucao, type Ligacao,
} from "./github";
import type { ConfigCompras, ConfigProcuras, Negocios } from "./types";

declare const __DEMO__: boolean;
export const DEMO = __DEMO__;

const CHAVE_LS = "pechinchas.ligacao";

function lerLigacao(): Ligacao | null {
  try {
    const j = JSON.parse(localStorage.getItem(CHAVE_LS) || "null");
    return j && j.token ? { token: j.token, repo: j.repo || REPO_PADRAO } : null;
  } catch { return null; }
}

function gravarLigacao(l: Ligacao | null) {
  try {
    if (l) localStorage.setItem(CHAVE_LS, JSON.stringify(l));
    else localStorage.removeItem(CHAVE_LS);
  } catch { /* sem armazenamento: fica só nesta sessão */ }
}

interface Estado {
  ligacao: Ligacao | null;
  negocios: Negocios | null;
  procuras: ConfigProcuras | null;
  compras: ConfigCompras | null;
  aCarregar: boolean;
  erro: string | null;
  execucao: Execucao | null;
  aviso: string | null;
}

interface Acoes {
  ligar(l: Ligacao | null): void;
  recarregar(): Promise<void>;
  alterarProcuras(msg: string, f: (c: ConfigProcuras) => ConfigProcuras): Promise<boolean>;
  alterarCompras(msg: string, f: (c: ConfigCompras) => ConfigCompras): Promise<boolean>;
  pesquisar(): Promise<void>;
  avisar(texto: string): void;
}

const Ctx = createContext<(Estado & Acoes) | null>(null);

async function carregarDemo() {
  const mods = import.meta.glob<{ default: unknown }>("../demo/*.json");
  const ler = async (n: string) => {
    const m = mods[`../demo/${n}.json`];
    return m ? (await m()).default : null;
  };
  return {
    negocios: (await ler("negocios")) as Negocios | null,
    procuras: (await ler("procuras")) as ConfigProcuras | null,
    compras: ((await ler("compras")) ?? { compras: [] }) as ConfigCompras,
  };
}

export function DadosProvider({ children }: { children: ReactNode }) {
  const [ligacao, setLigacao] = useState<Ligacao | null>(() => (DEMO ? null : lerLigacao()));
  const [negocios, setNegocios] = useState<Negocios | null>(null);
  const [procuras, setProcuras] = useState<ConfigProcuras | null>(null);
  const [compras, setCompras] = useState<ConfigCompras | null>(null);
  const [aCarregar, setACarregar] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [execucao, setExecucao] = useState<Execucao | null>(null);
  const [aviso, setAviso] = useState<string | null>(null);
  const timerAviso = useRef<number>();

  const avisar = useCallback((t: string) => {
    setAviso(t);
    window.clearTimeout(timerAviso.current);
    timerAviso.current = window.setTimeout(() => setAviso(null), 4500);
  }, []);

  const recarregar = useCallback(async () => {
    setErro(null);
    if (DEMO) {
      const d = await carregarDemo();
      setNegocios(d.negocios); setProcuras(d.procuras); setCompras(d.compras);
      return;
    }
    if (!ligacao) return;
    setACarregar(true);
    try {
      const [n, p, c, ex] = await Promise.all([
        lerJson<Negocios>(ligacao, "data/negocios.json").then((r) => r.dados).catch((e) => {
          if (e instanceof ErroGitHub && e.status === 404) return null; // ainda sem pesquisas
          throw e;
        }),
        lerJson<ConfigProcuras>(ligacao, "config/procuras.json").then((r) => r.dados),
        lerJson<ConfigCompras>(ligacao, "config/compras.json").then((r) => r.dados),
        ultimaExecucao(ligacao).catch(() => null),
      ]);
      setNegocios(n); setProcuras(p); setCompras(c); setExecucao(ex);
    } catch (e) {
      setErro(e instanceof Error ? e.message : String(e));
    } finally {
      setACarregar(false);
    }
  }, [ligacao]);

  useEffect(() => { void recarregar(); }, [recarregar]);

  // enquanto uma pesquisa corre, ver de 20 em 20 segundos se já acabou
  useEffect(() => {
    if (DEMO || !ligacao || !execucao || execucao.estado === "completed") return;
    const t = window.setInterval(async () => {
      const ex = await ultimaExecucao(ligacao).catch(() => null);
      if (!ex) return;
      setExecucao(ex);
      if (ex.estado === "completed") {
        avisar(ex.resultado === "success" ? "Pesquisa terminada. Resultados actualizados." : "A pesquisa terminou com erro. Vê o estado dos sites nas Definições.");
        void recarregar();
      }
    }, 20000);
    return () => window.clearInterval(t);
  }, [execucao, ligacao, recarregar, avisar]);

  const ligar = useCallback((l: Ligacao | null) => {
    gravarLigacao(l);
    setLigacao(l);
    if (!l) { setNegocios(null); setProcuras(null); setCompras(null); setExecucao(null); }
  }, []);

  const alterar = useCallback(async <T,>(caminho: string, msg: string, f: (c: T) => T,
                                         atual: T | null, set: (v: T) => void): Promise<boolean> => {
    if (DEMO) {
      if (atual) set(f(structuredClone(atual)));
      avisar("Pré-visualização: a alteração aparece aqui mas não fica guardada.");
      return true;
    }
    if (!ligacao) { avisar("Liga a tua conta do GitHub nas Definições para guardar."); return false; }
    try {
      const r = await alterarJson<T>(ligacao, caminho, msg, f);
      set(r.dados);
      return true;
    } catch (e) {
      avisar(e instanceof Error ? e.message : String(e));
      return false;
    }
  }, [ligacao, avisar]);

  const alterarProcuras = useCallback((msg: string, f: (c: ConfigProcuras) => ConfigProcuras) =>
    alterar<ConfigProcuras>("config/procuras.json", msg, f, procuras, setProcuras), [alterar, procuras]);
  const alterarCompras = useCallback((msg: string, f: (c: ConfigCompras) => ConfigCompras) =>
    alterar<ConfigCompras>("config/compras.json", msg, f, compras, setCompras), [alterar, compras]);

  const pesquisar = useCallback(async () => {
    if (DEMO) { avisar("Pré-visualização: no site a sério, isto lança uma pesquisa nova (demora 1 a 2 minutos)."); return; }
    if (!ligacao) { avisar("Liga a tua conta do GitHub nas Definições."); return; }
    try {
      await pesquisarAgora(ligacao);
      setExecucao({ estado: "queued", resultado: null, quando: new Date().toISOString() });
      avisar("Pesquisa lançada. Demora 1 a 2 minutos; a página actualiza sozinha.");
    } catch (e) {
      avisar(e instanceof Error ? e.message : String(e));
    }
  }, [ligacao, avisar]);

  const valor = useMemo(() => ({
    ligacao, negocios, procuras, compras, aCarregar, erro, execucao, aviso,
    ligar, recarregar, alterarProcuras, alterarCompras, pesquisar, avisar,
  }), [ligacao, negocios, procuras, compras, aCarregar, erro, execucao, aviso,
    ligar, recarregar, alterarProcuras, alterarCompras, pesquisar, avisar]);

  return <Ctx.Provider value={valor}>{children}</Ctx.Provider>;
}

export function useDados() {
  const v = useContext(Ctx);
  if (!v) throw new Error("useDados fora do DadosProvider");
  return v;
}

export const aPesquisar = (e: Execucao | null) => !!e && e.estado !== "completed";
