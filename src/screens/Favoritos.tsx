import { useState } from "react";
import { ExternalLink, ShoppingCart, Star, TrendingDown } from "lucide-react";
import { DEMO, useDados } from "../data/store";
import { euros, haQuanto, hoje, NOME_FONTE } from "../data/formato";
import { juntarCompra, type Favorito, type FavoritoVisto } from "../data/types";
import { BotaoApagar, Foto, TagFonte, Vazio } from "../ui/components";

const SITES = /(olx\.pt|vinted\.|wallapop\.com|custojusto\.pt)/i;

function fonteDoUrl(url: string): string {
  const m = url.match(/olx|vinted|wallapop|custojusto/i);
  return m ? m[0].toLowerCase() : "loja";
}

function EstadoTag({ v }: { v?: FavoritoVisto }) {
  if (!v) return <span className="tag">A ler o anúncio…</span>;
  if (v.estado === "disponível") return <span className="tag ok">Disponível</span>;
  if (v.estado === "reservado") return <span className="tag deal">Reservado</span>;
  if (v.estado === "vendido") return <span className="tag warn">Vendido</span>;
  if (v.estado === "removido") return <span className="tag warn">Saiu do site</span>;
  return <span className="tag warn" title={v.erro}>Não consegui ler</span>;
}

export default function FavoritosEcra() {
  const d = useDados();
  const [link, setLink] = useState("");
  const [erro, setErro] = useState("");
  const lista = d.favoritos?.favoritos ?? [];

  const adicionar = async () => {
    const url = link.trim();
    if (!/^https?:\/\//i.test(url)) return setErro("Cola o link completo do anúncio (começa por https://).");
    if (!SITES.test(url) && !/pcdiga|pccomponentes|worten|kuantokusta|amazon/i.test(url))
      return setErro("Esse link não parece ser de um anúncio do OLX, Vinted ou Wallapop.");
    if (lista.some((f) => f.url === url)) return setErro("Esse anúncio já está nos favoritos.");
    setErro("");
    const ok = await d.alterarFavoritos("Favorito novo", (c) => ({
      ...c, favoritos: [...(c.favoritos ?? []), { url, adicionado: hoje() }],
    }));
    if (ok) {
      setLink("");
      // leitura rápida só dos favoritos (~1 min), em vez de esperar pela próxima pesquisa
      if (!DEMO) void d.pesquisar("favoritos");
      d.avisar("Adicionado. A foto e o preço aparecem dentro de cerca de 1 minuto.");
    }
  };

  const remover = (url: string) => d.alterarFavoritos("Favorito removido", (c) => ({
    ...c, favoritos: (c.favoritos ?? []).filter((f) => f.url !== url),
  }));

  const saiu = (u: string) => ["vendido", "removido"].includes(d.vistos[u]?.estado ?? "");
  const limparSairam = async () => {
    const urls = new Set(lista.filter((f) => saiu(f.url)).map((f) => f.url));
    const ok = await d.alterarFavoritos(`Limpar ${urls.size} favoritos que saíram`, (c) => ({
      ...c, favoritos: (c.favoritos ?? []).filter((f) => !urls.has(f.url)),
    }));
    if (ok) d.avisar(`${urls.size} ${urls.size === 1 ? "favorito removido" : "favoritos removidos"}.`);
  };

  const ordenados = [...lista].sort((a, b) => {
    const ord = (u: string) => ({ "disponível": 0, "reservado": 1, erro: 2, vendido: 3, removido: 4 } as Record<string, number>)[d.vistos[u]?.estado ?? "erro"] ?? 2;
    return ord(a.url) - ord(b.url) || b.adicionado.localeCompare(a.adicionado);
  });

  const aVenda = ordenados.filter((f) => !saiu(f.url));
  const sairam = ordenados.filter((f) => saiu(f.url));

  return (
    <>
      <div className="topbar"><h1>Favoritos</h1></div>
      {DEMO && <div className="banner">Exemplos: escolhi um negócio de cada site e simulei os estados vendido, reservado e retirado para veres o aspecto. Estes anúncios não estão realmente nesses estados.</div>}
      <p className="sub">Anúncios que estás a seguir. Em cada pesquisa vejo o preço e se ainda estão à venda, sem entrar na tua conta de nenhum site.</p>

      <form className="card form" style={{ marginBottom: 18 }} onSubmit={(e) => { e.preventDefault(); void adicionar(); }}>
        <div className="campo">
          <label htmlFor="f-link">Colar link de um anúncio</label>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            <input id="f-link" className="input" style={{ flex: "1 1 280px" }} value={link} onChange={(e) => setLink(e.target.value)}
                   placeholder="https://www.vinted.pt/items/…" inputMode="url" />
            <button type="submit" className="btn filled"><Star size={17} />Seguir</button>
          </div>
          <span className="ajuda">Copia o link de um favorito teu no OLX, Vinted ou Wallapop. Nos negócios, a estrela faz o mesmo.</span>
        </div>
        {erro && <div className="tag warn" style={{ justifySelf: "start", fontSize: 13, padding: "6px 12px", whiteSpace: "normal" }}>{erro}</div>}
      </form>

      {ordenados.length === 0
        ? <Vazio titulo="Ainda não segues nenhum anúncio"><p>Cola o link de um anúncio acima, ou carrega na estrela de um negócio.</p></Vazio>
        : (
          <>
            {aVenda.length > 0 && <div className="deals">{aVenda.map((f) => <CartaoFavorito key={f.url} f={f} onRemover={() => remover(f.url)} />)}</div>}
            {aVenda.length === 0 && <Vazio titulo="Nenhum dos teus favoritos está à venda"><p>Os que saíram estão em baixo.</p></Vazio>}
            {sairam.length > 0 && (
              <>
                <div className="seccao">
                  <h2 className="h2">Já não estão à venda ({sairam.length})</h2>
                  <BotaoApagar texto="Limpar todos" onConfirmar={() => void limparSairam()} />
                </div>
                <div className="deals">{sairam.map((f) => <CartaoFavorito key={f.url} f={f} onRemover={() => remover(f.url)} />)}</div>
              </>
            )}
          </>
        )}
      {lista.length > 0 && <p className="small muted" style={{ marginTop: 14 }}>{lista.length} {lista.length === 1 ? "anúncio" : "anúncios"} em {new Set(lista.map((f) => NOME_FONTE[fonteDoUrl(f.url)] ?? "Loja")).size} sites.</p>}
    </>
  );
}

function CartaoFavorito({ f, onRemover }: { f: Favorito; onRemover: () => void }) {
  const d = useDados();
  const v = d.vistos[f.url];
  const fonte = v?.fonte || fonteDoUrl(f.url);
  const precos = v?.precos ?? [];
  const inicial = precos[0]?.[1];
  const atual = v?.preco ?? f.preco ?? null;
  const [aComprar, setAComprar] = useState(false);
  const [pago, setPago] = useState(atual != null ? String(atual).replace(".", ",") : "");
  const [deixar, setDeixar] = useState(true);
  const [aGravar, setAGravar] = useState(false);
  const titulo = v?.titulo || f.titulo || f.url;
  const comprei = async () => {
    const valor = Number(pago.replace(",", "."));
    if (!Number.isFinite(valor) || valor <= 0) { d.avisar("Escreve quanto pagaste, com portes (ex.: 30,50)."); return; }
    setAGravar(true);
    const ok = await d.alterarCompras(`Compra: ${titulo.slice(0, 60)}`, (c) => juntarCompra(c, {
      ...(f.chave ? { chave: f.chave } : {}), titulo, url: f.url, foto: v?.foto || f.foto || undefined,
      preco_pago: Math.round(valor * 100) / 100, data: hoje(), vendido_por: null, data_venda: null,
    }));
    if (ok && deixar) await d.alterarFavoritos("Favorito comprado", (c) => ({ ...c, favoritos: (c.favoritos ?? []).filter((x) => x.url !== f.url) }));
    setAGravar(false);
    if (ok) {
      setAComprar(false);
      if (!DEMO) void d.pesquisar("favoritos");
      d.avisar("Registado em Compras. O anúncio de venda fica pronto daqui a cerca de 1 minuto.");
    }
  };
  const desceu = inicial != null && atual != null && atual < inicial ? inicial - atual : 0;
  const fora = v?.estado === "vendido" || v?.estado === "removido";
  const reservado = v?.estado === "reservado";
  const faixa = v?.estado === "vendido" ? { texto: "VENDIDO", tom: "fora" as const }
    : v?.estado === "removido" ? { texto: "JÁ NÃO ESTÁ À VENDA", tom: "fora" as const }
      : reservado ? { texto: "RESERVADO", tom: "reservado" as const } : undefined;
  return (
    <article className={`card deal ${fora ? "saiu" : ""} ${reservado ? "reservado" : ""}`}>
      <a href={f.url} target="_blank" rel="noreferrer" aria-label="Abrir anúncio"><Foto src={v?.foto || f.foto || ""} fonte={fonte} faixa={faixa} /></a>
      <div className="corpo">
        <div className="preco">
          <span className="total">{atual != null ? euros(atual) : "—"}</span>
          {!fora && desceu > 0 && <span className="tag deal"><TrendingDown size={12} />−{euros(desceu)}</span>}
        </div>
        {!fora && inicial != null && desceu > 0 && <div className="decomp">Estava a {euros(inicial)}</div>}
        <a className="titulo clamp2" href={f.url} target="_blank" rel="noreferrer">{titulo}</a>
        <div className="tags">
          <TagFonte fonte={fonte} />
          <EstadoTag v={v} />
        </div>
      </div>
      <div className="pe">
          <span className="ref">{v?.verificado ? `${fora ? "Saiu, visto" : "Visto"} ${haQuanto(v.verificado)}` : `Seguido desde ${f.adicionado}`}{v?.erro ? ` · ${v.erro}` : ""}</span>
          <span className="acoes">
            <button className="btn ghost peq" onClick={() => setAComprar(!aComprar)}><ShoppingCart size={15} />Comprei</button>
            <span className="espaco" />
            {!fora && <a className="btn tonal peq" href={f.url} target="_blank" rel="noreferrer"><ExternalLink size={15} />Abrir</a>}
            <BotaoApagar texto={fora ? "Remover" : "Deixar de seguir"} onConfirmar={onRemover} />
          </span>
      </div>
      {aComprar && (
        <form className="comprei" onSubmit={(e) => { e.preventDefault(); void comprei(); }}>
          <label htmlFor={`fpago-${f.url}`} className="small" style={{ fontWeight: 800 }}>Paguei</label>
          <input id={`fpago-${f.url}`} className="input peq num" inputMode="decimal" value={pago} onChange={(e) => setPago(e.target.value)} />
          <span className="small muted">€ com portes</span>
          <label className="small" style={{ display: "inline-flex", gap: 6, alignItems: "center" }}>
            <input type="checkbox" checked={deixar} onChange={(e) => setDeixar(e.target.checked)} />Deixar de seguir
          </label>
          <span style={{ flex: 1 }} />
          <button type="button" className="btn ghost peq" onClick={() => setAComprar(false)}>Cancelar</button>
          <button type="submit" className="btn filled peq" disabled={aGravar}>{aGravar ? "A guardar…" : "Registar compra"}</button>
        </form>
      )}
    </article>
  );
}
