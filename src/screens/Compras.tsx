import { Fragment, useState } from "react";
import { Check, Copy, ExternalLink, Megaphone, Plus, Trash2 } from "lucide-react";
import { aPesquisar, DEMO, useDados } from "../data/store";
import { euros, haQuanto, hoje, NOME_FONTE } from "../data/formato";
import { chaveCompra, juntarCompra, type Compra, type VendaPreparada } from "../data/types";
import { BotaoApagar, Vazio } from "../ui/components";

const num = (t: string) => Number(t.replace(",", "."));
const dataPt = (iso?: string | null) => (iso ? new Date(iso + "T12:00:00").toLocaleDateString("pt-PT", { day: "2-digit", month: "short" }) : "");

export default function ComprasEcra() {
  const d = useDados();
  const [nova, setNova] = useState(false);
  const [aVender, setAVender] = useState<string | null>(null);
  const compras = d.compras?.compras ?? [];

  const investido = compras.reduce((s, c) => s + (c.preco_pago || 0), 0);
  const vendidas = compras.filter((c) => c.vendido_por != null);
  const lucro = vendidas.reduce((s, c) => s + ((c.vendido_por ?? 0) - c.preco_pago), 0);
  const emStock = compras.length - vendidas.length;

  const atualizar = (i: number, f: (c: Compra) => Compra | null, msg: string) =>
    d.alterarCompras(msg, (cfg) => {
      // localizar pela chave/título para não depender da ordem se o ficheiro mudou
      const alvo = compras[i];
      const lista = [...cfg.compras];
      const j = lista.findIndex((c) => alvo.id ? c.id === alvo.id
        : c.titulo === alvo.titulo && c.data === alvo.data && c.preco_pago === alvo.preco_pago);
      if (j < 0) return cfg;
      const novo = f(lista[j]);
      if (novo) lista[j] = novo; else lista.splice(j, 1);
      return { ...cfg, compras: lista };
    });

  return (
    <>
      <div className="topbar">
        <h1>Compras</h1>
        <button className="btn tonal" onClick={() => setNova(!nova)}><Plus size={18} />Adicionar compra</button>
      </div>
      <p className="sub">Regista aqui o que compras e por quanto vendes. Os artigos comprados deixam de aparecer nos negócios.</p>

      <div className="resumo">
        <div className="card cel"><span className="eyebrow">Por vender</span><span className="v">{emStock}</span></div>
        <div className="card cel"><span className="eyebrow">Investido</span><span className="v">{euros(investido)}</span></div>
        <div className="card cel"><span className="eyebrow">Vendidas</span><span className="v">{vendidas.length}</span></div>
        <div className="card cel"><span className="eyebrow">Lucro realizado</span>
          <span className={`v ${lucro >= 0 ? "lucro" : "prejuizo"}`}>{lucro >= 0 ? "+" : ""}{euros(lucro)}</span></div>
      </div>

      {nova && <NovaCompra onFeito={() => setNova(false)} />}

      {compras.length === 0
        ? <Vazio titulo="Ainda sem compras"><p>Em cada negócio há um botão Comprei. Também podes adicionar uma compra à mão.</p></Vazio>
        : (
          <div className="card tabela-wrap">
            <table className="t">
              <thead><tr><th>Artigo</th><th>Data</th><th className="dir">Pago</th><th>Venda</th><th className="dir">Lucro</th><th /></tr></thead>
              <tbody>
                {[...compras.entries()].reverse().map(([i, c]) => {
                  const k = chaveCompra(c);
                  const vender = (v: number | null) => atualizar(i, (x) => ({ ...x, vendido_por: v, data_venda: v == null ? null : hoje() }),
                    v == null ? `Venda anulada: ${c.titulo.slice(0, 50)}` : `Vendido: ${c.titulo.slice(0, 50)}`);
                  const v = d.vendas[k];
                  return (
                    <Fragment key={`${k}-${i}`}>
                      <LinhaCompra c={c} venda={v} aberto={aVender === k}
                                   onAbrir={() => setAVender(aVender === k ? null : k)}
                                   onVender={vender}
                                   onApagar={() => atualizar(i, () => null, `Compra apagada: ${c.titulo.slice(0, 50)}`)} />
                      {aVender === k && c.vendido_por == null && (
                        <tr className="linha-venda"><td colSpan={6}>
                          <PainelVenda c={c} v={v} onVender={vender}
                                       onLinks={(links, msg) => atualizar(i, (x) => ({ ...x, a_venda: links.length ? links : undefined }), msg)} />
                        </td></tr>
                      )}
                    </Fragment>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
    </>
  );
}

function LinhaCompra({ c, venda, aberto, onAbrir, onVender, onApagar }: {
  c: Compra; venda?: VendaPreparada; aberto: boolean; onAbrir: () => void;
  onVender: (v: number | null) => void; onApagar: () => void;
}) {
  const [valor, setValor] = useState("");
  const vendida = c.vendido_por != null;
  const l = vendida ? (c.vendido_por ?? 0) - c.preco_pago : null;
  return (
    <tr>
      <td style={{ minWidth: 220 }}>
        {c.url ? <a href={c.url} target="_blank" rel="noreferrer" style={{ fontWeight: 700 }}>{c.titulo}</a> : <strong>{c.titulo}</strong>}
        {!vendidaJa(c) && (
          <div style={{ display: "flex", gap: 6, alignItems: "center", flexWrap: "wrap", marginTop: 4 }}>
            <button className={`btn ${aberto ? "tonal" : "ghost"} peq`} style={{ marginLeft: -8 }} onClick={onAbrir}>
              <Megaphone size={14} />{aberto ? "Fechar" : "Vender"}
            </button>
            {venda?.vendido_detectado && <span className="tag deal">Vendido no site?</span>}
            {!venda?.vendido_detectado && Object.keys(venda?.a_venda ?? {}).length > 0 && (
              <span className="tag ok">À venda em {Object.keys(venda!.a_venda).length} {Object.keys(venda!.a_venda).length === 1 ? "site" : "sites"}</span>
            )}
          </div>
        )}
      </td>
      <td className="muted" style={{ whiteSpace: "nowrap" }}>{dataPt(c.data)}</td>
      <td className="dir" style={{ whiteSpace: "nowrap" }}>{euros(c.preco_pago)}</td>
      <td style={{ whiteSpace: "nowrap" }}>
        {vendida
          ? <span>{euros(c.vendido_por)} <span className="muted small">{dataPt(c.data_venda)}</span> <button className="btn ghost peq" onClick={() => onVender(null)}>Anular</button></span>
          : (
            <form style={{ display: "flex", gap: 6, alignItems: "center" }}
                  onSubmit={(e) => { e.preventDefault(); const v = num(valor); if (Number.isFinite(v) && v > 0) onVender(Math.round(v * 100) / 100); }}>
              <input aria-label="Vendido por" className="input peq num" inputMode="decimal" placeholder="Vendi por" value={valor} onChange={(e) => setValor(e.target.value)} />
              <button type="submit" className="btn ghost peq" disabled={!valor}>Vendido</button>
            </form>
          )}
      </td>
      <td className={`dir ${l == null ? "muted" : l >= 0 ? "lucro" : "prejuizo"}`} style={{ whiteSpace: "nowrap" }}>
        {l == null ? "—" : `${l >= 0 ? "+" : ""}${euros(l)}`}
      </td>
      <td className="dir"><BotaoApagar onConfirmar={onApagar} /></td>
    </tr>
  );
}

function NovaCompra({ onFeito }: { onFeito: () => void }) {
  const d = useDados();
  const [titulo, setTitulo] = useState("");
  const [preco, setPreco] = useState("");
  const [url, setUrl] = useState("");
  const [erro, setErro] = useState("");

  const guardar = async () => {
    const v = num(preco);
    if (!titulo.trim()) return setErro("Escreve o que compraste.");
    if (!Number.isFinite(v) || v <= 0) return setErro("Escreve quanto pagaste.");
    const ok = await d.alterarCompras(`Compra: ${titulo.slice(0, 60)}`, (c) => juntarCompra(c,
      { titulo: titulo.trim(), url: url.trim() || undefined, preco_pago: Math.round(v * 100) / 100, data: hoje(), vendido_por: null, data_venda: null }));
    if (ok) onFeito();
  };

  return (
    <form className="card form" style={{ marginBottom: 14 }} onSubmit={(e) => { e.preventDefault(); void guardar(); }}>
      <div className="grelha">
        <div className="campo"><label htmlFor="c-tit">Artigo</label>
          <input id="c-tit" className="input" value={titulo} onChange={(e) => setTitulo(e.target.value)} placeholder="Ex.: SSD Crucial MX500 500GB" /></div>
        <div className="campo"><label htmlFor="c-preco">Paguei (com portes)</label>
          <input id="c-preco" className="input num" inputMode="decimal" value={preco} onChange={(e) => setPreco(e.target.value)} placeholder="Ex.: 28,50" /></div>
      </div>
      <div className="campo"><label htmlFor="c-url">Link do anúncio (opcional)</label>
        <input id="c-url" className="input" value={url} onChange={(e) => setUrl(e.target.value)} placeholder="https://" /></div>
      {erro && <div className="tag warn" style={{ justifySelf: "start", fontSize: 13, padding: "6px 12px" }}>{erro}</div>}
      <div style={{ display: "flex", gap: 8 }}>
        <button type="submit" className="btn filled">Guardar compra</button>
        <button type="button" className="btn ghost" onClick={onFeito}>Cancelar</button>
      </div>
    </form>
  );
}

const vendidaJa = (c: Compra) => c.vendido_por != null;

function Copiar({ texto, rotulo = "Copiar" }: { texto: string; rotulo?: string }) {
  const [feito, setFeito] = useState(false);
  return (
    <button type="button" className="btn ghost peq" onClick={() => {
      void navigator.clipboard?.writeText(texto).then(() => { setFeito(true); setTimeout(() => setFeito(false), 1500); });
    }}>
      {feito ? <Check size={14} /> : <Copy size={14} />}{feito ? "Copiado" : rotulo}
    </button>
  );
}

function PainelVenda({ c, v, onVender, onLinks }: {
  c: Compra; v?: VendaPreparada; onVender: (v: number) => void;
  onLinks: (links: string[], msg: string) => Promise<boolean>;
}) {
  const d = useDados();
  const [desc, setDesc] = useState(v?.anuncio.descricao ?? "");
  const [titulo, setTitulo] = useState(v?.anuncio.titulo ?? "");
  const [link, setLink] = useState("");
  const links = c.a_venda ?? [];

  if (!v) {
    return (
      <div className="painel-venda">
        <p className="small muted" style={{ margin: 0 }}>O anúncio desta compra ainda não está preparado (fica pronto em cada pesquisa).</p>
        <button className="btn tonal peq" disabled={aPesquisar(d.execucao)} onClick={() => void d.pesquisar(true)}>
          {aPesquisar(d.execucao) ? <><span className="spinner" />A preparar…</> : "Preparar agora (1 min)"}
        </button>
      </div>
    );
  }
  const a = v.anuncio;
  const det = v.vendido_detectado;
  return (
    <div className="painel-venda">
      {det && (
        <div className="banner" style={{ marginBottom: 0 }}>
          <span>O teu anúncio {NOME_FONTE[v.a_venda[det.url]?.fonte ?? ""] ? `no ${NOME_FONTE[v.a_venda[det.url].fonte!]}` : ""} aparece como vendido{det.preco ? ` por ${euros(det.preco)}` : ""}.</span>
          {det.preco != null && <button className="btn filled peq" onClick={() => onVender(det.preco!)}>Registar venda de {euros(det.preco)}</button>}
        </div>
      )}

      <div className="campo">
        <div className="rotulo-linha"><label htmlFor={`t-${c.titulo}`}>Título</label><Copiar texto={titulo} /></div>
        <input id={`t-${c.titulo}`} className="input" value={titulo} onChange={(e) => setTitulo(e.target.value)} />
      </div>
      <div className="campo">
        <div className="rotulo-linha"><label htmlFor={`d-${c.titulo}`}>Descrição</label><Copiar texto={desc} /></div>
        <textarea id={`d-${c.titulo}`} className="input" rows={11} value={desc} onChange={(e) => setDesc(e.target.value)} />
        <span className="ajuda">Preenche ou apaga o que está entre [parênteses rectos] antes de colar. Podes editar aqui à vontade.</span>
      </div>

      <div className="precos-venda">
        <div className="card cel"><span className="eyebrow">Preço justo</span><span className="v">{euros(a.preco.justo)}</span>
          <span className="small lucro">+{euros(a.preco.margem_justo)} sobre o que pagaste</span><Copiar texto={String(a.preco.justo)} /></div>
        <div className="card cel"><span className="eyebrow">Para vender rápido</span><span className="v">{euros(a.preco.rapido)}</span>
          <span className="small lucro">+{euros(a.preco.margem_rapido)}</span><Copiar texto={String(a.preco.rapido)} /></div>
        <div className="small muted" style={{ alignSelf: "center" }}>{a.preco.nota} Pagaste {euros(a.preco.pago)}.</div>
      </div>

      <div className="small muted">
        Estado: <b>{a.estado}</b> · Categoria: <b>{a.categoria}</b> · Tamanho do envio na Vinted: <b>{a.vinted_pacote}</b>
      </div>

      <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
        <a className="btn filled peq" href={v.vender_em.olx} target="_blank" rel="noreferrer"><ExternalLink size={14} />Publicar no OLX</a>
        <a className="btn filled peq" href={v.vender_em.vinted} target="_blank" rel="noreferrer"><ExternalLink size={14} />Vender na Vinted</a>
      </div>

      <div className="campo">
        <label htmlFor={`l-${c.titulo}`}>Os teus anúncios desta compra</label>
        {links.map((u) => {
          const e = v.a_venda[u];
          return (
            <div key={u} className="meu-anuncio">
              <a href={u} target="_blank" rel="noreferrer" className="clamp1">{e?.titulo || u}</a>
              <span className={`tag ${e?.estado === "vendido" ? "deal" : e?.estado === "disponível" ? "ok" : ""}`}>
                {e ? `${e.estado}${e.preco ? ` · ${euros(e.preco)}` : ""}` : "a verificar"}</span>
              {e?.verificado && <span className="small muted">{haQuanto(e.verificado)}</span>}
              <button className="btn icone" aria-label="Deixar de vigiar" onClick={() => void onLinks(links.filter((x) => x !== u), "Anúncio de venda removido")}><Trash2 size={15} /></button>
            </div>
          );
        })}
        <form style={{ display: "flex", gap: 8 }} onSubmit={(e) => {
          e.preventDefault();
          const u = link.trim();
          if (!/^https?:\/\//.test(u)) return;
          void onLinks([...links.filter((x) => x !== u), u], `A vender: ${c.titulo.slice(0, 50)}`).then((ok) => ok && setLink(""));
        }}>
          <input id={`l-${c.titulo}`} className="input" placeholder="Cola o link do teu anúncio depois de publicares" value={link} onChange={(e) => setLink(e.target.value)} />
          <button type="submit" className="btn tonal" disabled={!link.trim()}>Vigiar</button>
        </form>
        <span className="ajuda">Em cada pesquisa vejo se continua à venda. Quando vender, aviso-te e registas a venda com um toque.{DEMO ? " (Na pré-visualização não fica guardado.)" : ""}</span>
      </div>
    </div>
  );
}
