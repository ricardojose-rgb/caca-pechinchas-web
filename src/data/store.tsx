import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import {
  alterarJson, ErroGitHub, lerJson, pesquisarAgora, REPO_PADRAO, ultimaExecucao,
  type Execucao, type Ligacao,
} from "./github";
import type { ConfigCompras, ConfigFavoritos, ConfigProcuras, FavoritoVisto, Negocios, VendaPreparada } from "./types";

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
  favoritos: ConfigFavoritos | null;
  vistos: Record<string, FavoritoVisto>;
  aCarregar: boolean;
  erro: string | null;
  execucao: Execucao | null;
  aviso: string | null;
  acaoAviso: { rotulo: string; fazer: () => void } | null;
  /** chaves escondidas já no ecrã, antes de a gravação no GitHub terminar */
  ocultosLocais: Set<string>;
  ocultar(x: { chave: string; titulo: string; url: string }): void;
}

interface Acoes {
  ligar(l: Ligacao | null): void;
  recarregar(): Promise<void>;
  alterarProcuras(msg: string, f: (c: ConfigProcuras) => ConfigProcuras): Promise<boolean>;
  alterarCompras(msg: string, f: (c: ConfigCompras) => ConfigCompras): Promise<boolean>;
  alterarFavoritos(msg: string, f: (c: ConfigFavoritos) => ConfigFavoritos): Promise<boolean>;
  pesquisar(rapido?: boolean | "favoritos"): Promise<void>;
  vendas: Record<string, VendaPreparada>;
  avisar(texto: string, acao?: { rotulo: string; fazer: () => void }): void;
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
    favoritos: ((await ler("favoritos")) ?? { favoritos: [] }) as ConfigFavoritos,
    vistos: ((await ler("favoritos_estado")) ?? {}) as Record<string, FavoritoVisto>,
    vendas: ((await ler("vendas")) ?? {}) as Record<string, VendaPreparada>,
  };
}

export function DadosProvider({ children }: { children: ReactNode }) {
  const [ligacao, setLigacao] = useState<Ligacao | null>(() => (DEMO ? null : lerLigacao()));
  const [negocios, setNegocios] = useState<Negocios | null>(null);
  const [procuras, setProcuras] = useState<ConfigProcuras | null>(null);
  const [compras, setCompras] = useState<ConfigCompras | null>(null);
  const [favoritos, setFavoritos] = useState<ConfigFavoritos | null>(null);
  const [vistos, setVistos] = useState<Record<string, FavoritoVisto>>({});
  const [vendas, setVendas] = useState<Record<string, VendaPreparada>>({});
  const [aCarregar, setACarregar] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [execucao, setExecucao] = useState<Execucao | null>(null);
  const [aviso, setAviso] = useState<string | null>(null);
  const [acaoAviso, setAcaoAviso] = useState<{ rotulo: string; fazer: () => void } | null>(null);
  const [ocultosLocais, setOcultosLocais] = useState<Set<string>>(new Set());
  const timerAviso = useRef<number>();

  const avisar = useCallback((t: string, acao?: { rotulo: string; fazer: () => void }) => {
    setAviso(t);
    setAcaoAviso(acao ?? null);
    window.clearTimeout(timerAviso.current);
    timerAviso.current = window.setTimeout(() => { setAviso(null); setAcaoAviso(null); }, acao ? 7000 : 4500);
  }, []);

  const recarregar = useCallback(async () => {
    setErro(null);
    if (DEMO) {
      const d = await carregarDemo();
      setNegocios(d.negocios); setProcuras(d.procuras); setCompras(d.compras);
      setFavoritos(d.favoritos); setVistos(d.vistos); setVendas(d.vendas);
      return;
    }
    if (!ligacao) return;
    setACarregar(true);
    try {
      const semFicheiro = <T,>(v: T) => (e: unknown) => {
        if (e instanceof ErroGitHub && e.status === 404) return v;
        throw e;
      };
      const [n, p, c, ex, fv, vs, vd] = await Promise.all([
        lerJson<Negocios>(ligacao, "data/negocios.json").then((r) => r.dados).catch((e) => {
          if (e instanceof ErroGitHub && e.status === 404) return null; // ainda sem pesquisas
          throw e;
        }),
        lerJson<ConfigProcuras>(ligacao, "config/procuras.json").then((r) => r.dados),
        lerJson<ConfigCompras>(ligacao, "config/compras.json").then((r) => r.dados),
        ultimaExecucao(ligacao).catch(() => null),
        lerJson<ConfigFavoritos>(ligacao, "config/favoritos.json").then((r) => r.dados).catch(semFicheiro({ favoritos: [] } as ConfigFavoritos)),
        lerJson<Record<string, FavoritoVisto>>(ligacao, "data/favoritos.json").then((r) => r.dados).catch(semFicheiro({})),
        lerJson<Record<string, VendaPreparada>>(ligacao, "data/vendas.json").then((r) => r.dados).catch(semFicheiro({})),
      ]);
      setNegocios(n); setProcuras(p); setCompras(c); setExecucao(ex); setFavoritos(fv); setVistos(vs); setVendas(vd);
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
    if (!l) { setNegocios(null); setProcuras(null); setCompras(null); setExecucao(null); setFavoritos(null); setVistos({}); }
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

  const alterarFavoritos = useCallback((msg: string, f: (c: ConfigFavoritos) => ConfigFavoritos) =>
    alterar<ConfigFavoritos>("config/favoritos.json", msg, f, favoritos ?? { favoritos: [] }, setFavoritos), [alterar, favoritos]);

  // esconde logo; grava no GitHub em segundo plano (e volta a mostrar se falhar)
  const filaOcultos = useRef<Promise<unknown>>(Promise.resolve());
  const ocultar = useCallback((x: { chave: string; titulo: string; url: string }) => {
    const mudar = (f: (s: Set<string>) => void) => setOcultosLocais((s) => { const n = new Set(s); f(n); return n; });
    mudar((s) => s.add(x.chave));
    // uma gravação de cada vez, para várias exclusões seguidas não colidirem
    const gravar = filaOcultos.current.then(() => alterarFavoritos(`Anúncio excluído: ${x.titulo.slice(0, 60)}`, (c) => ({
      ...c,
      ocultos: [...(c.ocultos ?? []).filter((o) => o.chave !== x.chave),
        { chave: x.chave, titulo: x.titulo, url: x.url, quando: new Date().toISOString().slice(0, 10) }],
    })));
    filaOcultos.current = gravar;
    void gravar.then((ok) => { if (!ok) mudar((s) => s.delete(x.chave)); });
    avisar("Anúncio excluído.", {
      rotulo: "Desfazer",
      fazer: () => {
        mudar((s) => s.delete(x.chave));
        filaOcultos.current = filaOcultos.current.then(() => alterarFavoritos(`Anúncio reposto: ${x.titulo.slice(0, 60)}`,
          (c) => ({ ...c, ocultos: (c.ocultos ?? []).filter((o) => o.chave !== x.chave) })));
        setAviso(null); setAcaoAviso(null);
      },
    });
  }, [alterarFavoritos, avisar]);

  const pesquisar = useCallback(async (rapido: boolean | "favoritos" = false) => {
    const soVendas = !!rapido;
    if (DEMO) { avisar("Pré-visualização: no site a sério, isto lança uma pesquisa nova (demora 1 a 2 minutos)."); return; }
    if (!ligacao) { avisar("Liga a tua conta do GitHub nas Definições."); return; }
    try {
      await pesquisarAgora(ligacao, soVendas);
      setExecucao({ estado: "queued", resultado: null, quando: new Date().toISOString() });
      if (rapido === "favoritos") return;   // quem chamou já avisou
      avisar(soVendas ? "A preparar os anúncios de venda. Demora cerca de 1 minuto; a página actualiza sozinha."
        : "Pesquisa lançada. Demora 1 a 2 minutos; a página actualiza sozinha.");
    } catch (e) {
      avisar(e instanceof Error ? e.message : String(e));
    }
  }, [ligacao, avisar]);

  const valor = useMemo(() => ({
    ligacao, negocios, procuras, compras, favoritos, vistos, aCarregar, erro, execucao, aviso, acaoAviso, ocultosLocais, ocultar,
    ligar, recarregar, alterarProcuras, alterarCompras, alterarFavoritos, pesquisar, avisar, vendas,
  }), [ligacao, negocios, procuras, compras, favoritos, vistos, aCarregar, erro, execucao, aviso, acaoAviso, ocultosLocais, ocultar,
    ligar, recarregar, alterarProcuras, alterarCompras, alterarFavoritos, pesquisar, avisar, vendas]);

  return <Ctx.Provider value={valor}>{children}</Ctx.Provider>;
}

export function useDados() {
  const v = useContext(Ctx);
  if (!v) throw new Error("useDados fora do DadosProvider");
  return v;
}

export const aPesquisar = (e: Execucao | null) => !!e && e.estado !== "completed";
