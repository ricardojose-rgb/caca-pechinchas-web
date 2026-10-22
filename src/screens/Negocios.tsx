import { useMemo, useState } from "react";
import { Eye, EyeOff, ExternalLink, ShoppingCart, Star, TrendingDown } from "lucide-react";
import { useDados } from "../data/store";
import { euros, eurosCurto, FONTES, haQuanto, hoje, NOME_FONTE, pais } from "../data/formato";
import type { Negocio, ResultadoProcura } from "../data/types";
import { Foto, PontoFonte, TagFonte, Vazio } from "../ui/components";

type Ordem = "desconto" | "preco" | "recentes";
type Item = Negocio & { procuraId: string; procuraNome: string };

function lerPref<T>(k: string, omissao: T): T {
  try { const v = localStorage.getItem(`pechinchas.${k}`); return v ? (JSON.parse(v) as T) : omissao; } catch { return omissao; }
}
function gravarPref(k: string, v: unknown) {
  try { localStorage.setItem(`pechinchas.${k}`, JSON.stringify(v)); } catch { /* sem armazenamento */ }
}

const ehNovo = (x: Negocio, atualizado: string) =>
  new Date(atualizado).getTime() - new Date(x.primeiro_visto).getTime() < 24 * 3600 * 1000;

export default function NegociosEcra({ irPara }: { irPara: (e: "procuras" | "definicoes") => void }) {
  const d = useDados();
  const [procura, setProcuraS] = useState<string>(() => lerPref("procura", "todas"));
  const [fontes, setFontesS] = useState<string[]>(() => lerPref("fontes", [] as string[]));
  const [ordem, setOrdemS] = useState<Ordem>(() => lerPref("ordem", "desconto" as Ordem));
  const [soNovos, setSoNovosS] = useState<boolean>(() => lerPref("soNovos", false));
  const [comprados, setComprados] = useState<Set<string>>(new Set());

  const setProcura = (v: string) => { setProcuraS(v); gravarPref("procura", v); };
  const setFontes = (v: string[]) => { setFontesS(v); gravarPref("fontes", v); };
  const setOrdem = (v: Ordem) => { setOrdemS(v); gravarPref("ordem", v); };
  const setSoNovos = (v: boolean) => { setSoNovosS(v); gravarPref("soNovos", v); };

  const n = d.negocios;
  const jaComprados = useMemo(() => new Set([
    ...((d.compras?.compras ?? []).map((c) => c.chave).filter(Boolean) as string[]),
    ...(d.favoritos?.ocultos ?? []).map((o) => o.chave),
    ...d.ocultosLocais,
  ]), [d.compras, d.favoritos, d.ocultosLocais]);

  const todos: Item[] = useMemo(() => {
    if (!n) return [];
    const vistos = new Map<string, Item>();
    for (const p of n.procuras)
      for (const x of p.negocios)
        if (!vistos.has(x.chave) && !jaComprados.has(x.chave)) vistos.set(x.chave, { ...x, procuraId: p.id, procuraNome: p.nome });
    return [...vistos.values()];
  }, [n, jaComprados]);

  if (d.aCarregar && !n) return <div className="center"><span className="spinner" /></div>;
  if (!n) {
    return (
      <>
        <div className="topbar"><h1>Negócios</h1></div>
        <Vazio titulo={d.ligacao ? "Ainda não há resultados" : "Liga a tua conta"}>
          <p>{d.ligacao
            ? "A primeira pesquisa ainda não correu. Carrega em Pesquisar agora e volta daqui a 2 minutos."
            : "O site lê os resultados do teu repositório no GitHub. Liga a conta nas Definições."}</p>
          {d.ligacao
            ? <button className="btn filled" onClick={() => d.pesquisar()}>Pesquisar agora</button>
            : <button className="btn filled" onClick={() => irPara("definicoes")}>Ir para Definições</button>}
        </Vazio>
      </>
    );
  }

  const procuraSel = n.procuras.find((p) => p.id === procura);
  let lista = todos.filter((x) => (procura === "todas" || x.procuraId === procura || procuraSel?.negocios.some((y) => y.chave === x.chave))
    && (fontes.length === 0 || fontes.includes(x.fonte))
    && (!soNovos || ehNovo(x, n.atualizado))
    && !jaComprados.has(x.chave) && !comprados.has(x.chave));
  lista = [...lista].sort((a, b) =>
    ordem === "preco" ? a.total - b.total
      : ordem === "recentes" ? b.primeiro_visto.localeCompare(a.primeiro_visto)
        : b.desconto - a.desconto || a.total - b.total);

  const novos = todos.filter((x) => ehNovo(x, n.atualizado)).length;
  const melhor = todos.reduce((m, x) => (x.referencia && x.desconto > m ? x.desconto : m), 0);
  const lidos = Object.values(n.estado_fontes).reduce((s, e) => s + e.lidos, 0);
  const falhados = Object.entries(n.estado_fontes).filter(([, e]) => !e.ok).map(([k]) => NOME_FONTE[k] ?? k);
  const contaPorProcura = (p: ResultadoProcura) => p.negocios.filter((x) => !jaComprados.has(x.chave) && !comprados.has(x.chave)).length;

  return (
    <>
      <div className="topbar"><h1>Negócios</h1></div>
      <div className="sub">
        <span>Actualizado {haQuanto(n.atualizado)}</span>
        {falhados.length === 0
          ? <span className="tag ok">{Object.keys(n.estado_fontes).length} sites a funcionar</span>
          : <button className="tag warn" onClick={() => irPara("definicoes")}>Falhou: {falhados.join(", ")}</button>}
      </div>

      <div className="resumo">
        <div className="card cel"><span className="eyebrow">Negócios agora</span><span className="v">{todos.length}</span></div>
        <div className="card cel"><span className="eyebrow">Recentes (24 h)</span><span className="v">{novos}</span></div>
        <div className="card cel"><span className="eyebrow">Maior desconto</span><span className="v">{melhor ? `−${Math.round(melhor * 100)}%` : "—"}</span></div>
        <div className="card cel secundaria"><span className="eyebrow">Anúncios analisados</span><span className="v">{lidos.toLocaleString("pt-PT")}</span></div>
      </div>

      <div className="toolbar">
        <div className="chips" role="group" aria-label="Procura">
          <button className={`chip ${procura === "todas" ? "on" : ""}`} onClick={() => setProcura("todas")}>
            Todas <span className="n">{todos.length}</span>
          </button>
          {n.procuras.map((p) => (
            <button key={p.id} className={`chip ${procura === p.id ? "on" : ""}`} onClick={() => setProcura(p.id)}>
              {p.nome} <span className="n">{contaPorProcura(p)}</span>
            </button>
          ))}
        </div>
        <div className="linha">
          <div className="chips" role="group" aria-label="Sites">
            {FONTES.map((f) => {
              const on = fontes.includes(f);
              return (
                <button key={f} className={`chip ${on ? "on" : ""}`} aria-pressed={on}
                        onClick={() => setFontes(on ? fontes.filter((x) => x !== f) : [...fontes, f])}>
                  <PontoFonte fonte={f} />{NOME_FONTE[f]}
                </button>
              );
            })}
            <button className={`chip ${soNovos ? "on" : ""}`} aria-pressed={soNovos} onClick={() => setSoNovos(!soNovos)}>Só recentes</button>
          </div>
          <div className="segmented" role="group" aria-label="Ordenar">
            {(["desconto", "preco", "recentes"] as Ordem[]).map((o) => (
              <button key={o} className={ordem === o ? "on" : ""} onClick={() => setOrdem(o)}>
                {o === "desconto" ? "Desconto" : o === "preco" ? "Preço" : "Recentes"}
              </button>
            ))}
          </div>
        </div>
      </div>

      {procuraSel && <InfoProcura p={procuraSel} />}

      {lista.length === 0
        ? <Vazio titulo="Nada com estes filtros"><p>Tira alguns filtros, ou espera pela próxima pesquisa.</p></Vazio>
        : (
          <div className="deals">
            {lista.map((x) => (
              <CartaoNegocio key={x.chave} x={x} mostrarProcura={procura === "todas"} atualizado={n.atualizado}
                             onComprado={() => setComprados(new Set([...comprados, x.chave]))} />
            ))}
          </div>
        )}

      {procuraSel && procuraSel.mais_baratos.length > 0 && (
        <details className="mais" style={{ marginTop: 22 }}>
          <summary>Outros anúncios mais baratos ({procuraSel.mais_baratos.length}), que não chegam a ser negócio</summary>
          <div className="deals" style={{ marginTop: 10 }}>
            {procuraSel.mais_baratos.filter((x) => !jaComprados.has(x.chave)).map((x) => (
              <CartaoNegocio key={x.chave} x={{ ...x, procuraId: procuraSel.id, procuraNome: procuraSel.nome }}
                             mostrarProcura={false} atualizado={n.atualizado} onComprado={() => setComprados(new Set([...comprados, x.chave]))} />
            ))}
          </div>
        </details>
      )}
    </>
  );
}

function InfoProcura({ p }: { p: ResultadoProcura }) {
  const meds = Object.entries(p.medianas).sort(([a], [b]) => a.localeCompare(b));
  return (
    <div className="card notice" style={{ marginBottom: 14 }}>
      <div className="small muted">
        Limite <strong className="num" style={{ color: "var(--fg)" }}>{eurosCurto(p.preco_max)}</strong>
        {" · "}{p.total_anuncios} anúncios no mercado
        {meds.length > 0 && <> · Medianas dos usados: {meds.map(([g, m], i) => (
          <span key={g}>{i > 0 && ", "}{g === "todos" ? "" : `${g} `}<strong className="num" style={{ color: "var(--fg)" }}>{eurosCurto(m.mediana)}</strong> <span className="num">({m.n})</span></span>
        ))}</>}
      </div>
      {p.novo_mais_barato && (
        <div className="small">Novo em loja: <a className="primary-text" style={{ color: "var(--primary)", fontWeight: 700 }} href={p.novo_mais_barato.url} target="_blank" rel="noreferrer">{p.novo_mais_barato.titulo}</a> · <strong className="num">{euros(p.novo_mais_barato.total)}</strong></div>
      )}
    </div>
  );
}

/** "29 € + 5,65 € portes" · "Entrega em mão · 14 km" · "Envio de Espanha" — sem repetir o total. */
function decomposicao(x: Negocio) {
  const partes: string[] = [];
  const emMao = x.nota?.startsWith("em mão");
  if (x.extras > 0) partes.push(`${euros(x.preco)} + ${euros(x.extras)} portes e taxas`);
  if (emMao) partes.push(x.nota.replace("em mão", "Entrega em mão"));
  else if (x.pais !== "PT") partes.push(`envio de ${pais(x.pais)}`);
  else if (x.nota && !/^envio de/.test(x.nota)) partes.push(x.nota);
  if (x.motivos?.length && !(x.referencia && x.desconto > 0))
    partes.push(x.motivos[0].startsWith("≤") ? `dentro do teu limite (${x.motivos[0]})` : x.motivos[0]);
  return partes.join(" · ") || "Portes incluídos";
}

function CartaoNegocio({ x, mostrarProcura, atualizado, onComprado }: {
  x: Item; mostrarProcura: boolean; atualizado: string; onComprado: () => void;
}) {
  const d = useDados();
  const [aComprar, setAComprar] = useState(false);
  const [pago, setPago] = useState(String(x.total));
  const [aGravar, setAGravar] = useState(false);

  const registar = async () => {
    const valor = Number(pago.replace(",", "."));
    if (!Number.isFinite(valor) || valor <= 0) { d.avisar("Escreve quanto pagaste, por exemplo 30,50."); return; }
    setAGravar(true);
    const ok = await d.alterarCompras(`Compra: ${x.titulo.slice(0, 60)}`, (c) => ({
      ...c,
      compras: [...(c.compras ?? []), {
        chave: x.chave, titulo: x.titulo, url: x.url, procura: x.procuraId,
        preco_pago: Math.round(valor * 100) / 100, data: hoje(), vendido_por: null, data_venda: null,
      }],
    }));
    setAGravar(false);
    if (ok) { onComprado(); d.avisar("Registado em Compras. A procura continua aberta."); }
  };

  const seguido = (d.favoritos?.favoritos ?? []).some((f) => f.url === x.url || f.chave === x.chave);
  const alternarFavorito = async () => {
    const ok = await d.alterarFavoritos(seguido ? "Favorito removido" : "Favorito novo", (c) => ({
      ...c,
      favoritos: seguido
        ? (c.favoritos ?? []).filter((f) => f.url !== x.url && f.chave !== x.chave)
        : [...(c.favoritos ?? []), { url: x.url, chave: x.chave, titulo: x.titulo, adicionado: hoje() }],
    }));
    if (ok && !seguido) d.avisar("A seguir. Avisa-te se baixar de preço ou sair.");
  };
  const excluir = () => d.ocultar(x);

  const ePecas = x.grupo === "portátil" || x.grupo === "desktop";
  const poucoVisivel = (x.atributos?.pouco_visivel as string) || "";
  const desconto = x.referencia ? Math.round(x.desconto * 100) : null;
  return (
    <article className="card deal">
      <a href={x.url} target="_blank" rel="noreferrer" aria-label={`Abrir anúncio: ${x.titulo}`}><Foto src={x.foto} fonte={x.fonte} /></a>
      <div className="corpo">
        <div className="preco">
          <span className="total">{euros(x.total)}</span>
          {desconto != null && desconto > 0 && <span className="tag deal"><TrendingDown size={12} />−{desconto}%</span>}
        </div>
        <div className="decomp">{decomposicao(x)}</div>
        <a className="titulo clamp2" href={x.url} target="_blank" rel="noreferrer">{x.titulo}</a>
        {ePecas && x.referencia_origem && <div className="decomp">{x.referencia_origem}</div>}
        <div className="tags">
          <TagFonte fonte={x.fonte} />
          {x.resumo && <span className="tag">{x.resumo}</span>}
          {ehNovo(x, atualizado) && <span className="tag new" title="Apareceu nas últimas 24 horas">Recente</span>}
          {x.baixou_preco && <span className="tag new">Baixou</span>}
          {(x.unidades ?? 1) > 1 && <span className="tag">{x.unidades} unidades</span>}
          {x.condicao !== "usado" && <span className="tag ok">{x.condicao === "novo" ? "Selado" : "Como novo"}</span>}
          {poucoVisivel && <span className="tag new" title={poucoVisivel}><Eye size={12} />Pouco visível</span>}
          {mostrarProcura && <span className="tag contorno">{x.procuraNome}</span>}
        </div>
      </div>
      <div className="pe">
        <span className="ref" title={x.referencia_origem}>{x.referencia
          ? (ePecas
            ? <>Peças valem <b>{eurosCurto(Math.round(x.referencia))}</b></>
            : <>Mediana <b>{eurosCurto(x.referencia)}</b></>)
          : "Sem mediana ainda"}
          {x.margem_revenda != null && x.margem_revenda > 0 && <> · margem <b className="margem">{eurosCurto(Math.round(x.margem_revenda))}</b></>}
        </span>
        <span className="acoes">
          <button className={`btn icone ${seguido ? "seguido" : ""}`} onClick={() => void alternarFavorito()}
                  aria-pressed={seguido} aria-label={seguido ? "Deixar de seguir" : "Seguir anúncio"} title={seguido ? "Deixar de seguir" : "Seguir: avisa se baixar ou sair"}>
            <Star size={16} fill={seguido ? "currentColor" : "none"} />
          </button>
          <span className="espaco" />
          <button className="btn icone" onClick={excluir}
                  aria-label="Excluir anúncio" title="Excluir: não volta a aparecer (podes desfazer)">
            <EyeOff size={16} />
          </button>
          <button className="btn ghost peq" onClick={() => setAComprar(!aComprar)}><ShoppingCart size={15} />Comprei</button>
          <a className="btn tonal peq" href={x.url} target="_blank" rel="noreferrer"><ExternalLink size={15} />Abrir</a>
        </span>
      </div>
      {aComprar && (
        <form className="comprei" onSubmit={(e) => { e.preventDefault(); void registar(); }}>
          <label htmlFor={`pago-${x.chave}`} className="small" style={{ fontWeight: 800 }}>Paguei</label>
          <input id={`pago-${x.chave}`} className="input peq num" inputMode="decimal" value={pago} onChange={(e) => setPago(e.target.value)} />
          <span className="small muted">€ com portes</span>
          <span style={{ flex: 1 }} />
          <button type="button" className="btn ghost peq" onClick={() => setAComprar(false)}>Cancelar</button>
          <button type="submit" className="btn filled peq" disabled={aGravar}>{aGravar ? "A guardar…" : "Registar compra"}</button>
        </form>
      )}
    </article>
  );
}
