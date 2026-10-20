import { useEffect, useMemo, useState } from "react";
import { Settings, ShoppingBag, Search, Star, Tag } from "lucide-react";
import { aPesquisar, DEMO, useDados } from "./data/store";
import { dataHora, haQuanto } from "./data/formato";
import { Logo } from "./ui/components";
import NegociosEcra from "./screens/Negocios";
import ProcurasEcra from "./screens/Procuras";
import ComprasEcra from "./screens/Compras";
import FavoritosEcra from "./screens/Favoritos";
import DefinicoesEcra from "./screens/Definicoes";

type Ecra = "negocios" | "favoritos" | "procuras" | "compras" | "definicoes";
const ECRAS: { id: Ecra; nome: string; Icone: typeof Tag }[] = [
  { id: "negocios", nome: "Negócios", Icone: Tag },
  { id: "favoritos", nome: "Favoritos", Icone: Star },
  { id: "procuras", nome: "Procuras", Icone: Search },
  { id: "compras", nome: "Compras", Icone: ShoppingBag },
  { id: "definicoes", nome: "Definições", Icone: Settings },
];

function ecraDoEndereco(): Ecra {
  const h = location.hash.replace("#", "");
  return (ECRAS.some((e) => e.id === h) ? h : "negocios") as Ecra;
}

export default function App() {
  const d = useDados();
  const [ecra, setEcra] = useState<Ecra>(ecraDoEndereco);

  useEffect(() => {
    const f = () => setEcra(ecraDoEndereco());
    window.addEventListener("hashchange", f);
    return () => window.removeEventListener("hashchange", f);
  }, []);

  const ir = (e: Ecra) => {
    setEcra(e);
    try { history.replaceState(null, "", `#${e}`); } catch { /* sem histórico */ }
    window.scrollTo({ top: 0 });
  };

  // sem ligação, o site começa nas Definições
  useEffect(() => { if (!DEMO && !d.ligacao) setEcra("definicoes"); }, [d.ligacao]);

  const nNegocios = useMemo(() => {
    const vistos = new Set<string>();
    d.negocios?.procuras.forEach((p) => p.negocios.forEach((x) => vistos.add(x.chave)));
    return vistos.size;
  }, [d.negocios]);

  const pesquisando = aPesquisar(d.execucao);

  return (
    <div className="app">
      <aside className="sidebar">
        <div className="brand"><Logo />Caça-Pechinchas</div>
        {ECRAS.map(({ id, nome, Icone }) => (
          <button key={id} className={`nav-item ${ecra === id ? "active" : ""}`} onClick={() => ir(id)}>
            <Icone size={19} />{nome}
            {id === "negocios" && nNegocios > 0 && <span className="badge">{nNegocios}</span>}
          </button>
        ))}
        <div className="spacer" />
        {d.negocios && (
          <div className="foot small muted">
            <span>Última pesquisa</span>
            <strong style={{ color: "var(--fg)" }}>{dataHora(d.negocios.atualizado)}</strong>
            <span>{haQuanto(d.negocios.atualizado)}</span>
          </div>
        )}
        <button className="btn tonal" style={{ justifyContent: "center", margin: "6px 4px 0" }}
                onClick={() => d.pesquisar()} disabled={pesquisando}>
          {pesquisando ? <><span className="spinner" />A pesquisar…</> : "Pesquisar agora"}
        </button>
      </aside>

      <main className="main">
        <div className="page">
          {DEMO && (
            <div className="banner">
              Pré-visualização com os dados da pesquisa de {d.negocios ? dataHora(d.negocios.atualizado) : "hoje"}.
              As alterações aparecem mas não ficam guardadas.
            </div>
          )}
          {d.erro && <div className="banner" style={{ background: "color-mix(in srgb, var(--warn) 14%, transparent)", color: "var(--warn)" }}>{d.erro}</div>}
          {ecra === "negocios" && <NegociosEcra irPara={ir} />}
          {ecra === "favoritos" && <FavoritosEcra />}
          {ecra === "procuras" && <ProcurasEcra />}
          {ecra === "compras" && <ComprasEcra />}
          {ecra === "definicoes" && <DefinicoesEcra />}
        </div>
      </main>

      <nav className="bottomnav">
        {ECRAS.map(({ id, nome, Icone }) => (
          <button key={id} className={ecra === id ? "active" : ""} onClick={() => ir(id)}>
            <span className="pill"><Icone size={20} />
              {id === "negocios" && nNegocios > 0 && <span className="dot">{nNegocios}</span>}
            </span>
            {nome}
          </button>
        ))}
      </nav>

      {d.aviso && <div className="toast" role="status">{d.aviso}</div>}
    </div>
  );
}
