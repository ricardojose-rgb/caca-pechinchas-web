import { useState } from "react";
import { ExternalLink, Star, TrendingDown } from "lucide-react";
import { DEMO, useDados } from "../data/store";
import { euros, haQuanto, hoje, NOME_FONTE } from "../data/formato";
import type { FavoritoVisto } from "../data/types";
import { BotaoApagar, Foto, TagFonte, Vazio } from "../ui/components";

const SITES = /(olx\.pt|vinted\.|wallapop\.com|custojusto\.pt)/i;

function fonteDoUrl(url: string): string {
  const m = url.match(/olx|vinted|wallapop|custojusto/i);
  return m ? m[0].toLowerCase() : "loja";
}

function EstadoTag({ v }: { v?: FavoritoVisto }) {
  if (!v) return <span className="tag">À espera da próxima pesquisa</span>;
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
      return setErro("Esse link não parece ser de um anúncio do OLX, Vinted, Wallapop ou CustoJusto.");
    if (lista.some((f) => f.url === url)) return setErro("Esse anúncio já está nos favoritos.");
    setErro("");
    const ok = await d.alterarFavoritos("Favorito novo", (c) => ({
      ...c, favoritos: [...(c.favoritos ?? []), { url, adicionado: hoje() }],
    }));
    if (ok) { setLink(""); d.avisar("Adicionado. O preço aparece depois da próxima pesquisa."); }
  };

  const remover = (url: string) => d.alterarFavoritos("Favorito removido", (c) => ({
    ...c, favoritos: (c.favoritos ?? []).filter((f) => f.url !== url),
  }));

  const ordenados = [...lista].sort((a, b) => {
    const ord = (u: string) => ({ "disponível": 0, "reservado": 1, erro: 2, vendido: 3, removido: 4 } as Record<string, number>)[d.vistos[u]?.estado ?? "erro"] ?? 2;
    return ord(a.url) - ord(b.url) || b.adicionado.localeCompare(a.adicionado);
  });

  return (
    <>
      <div className="topbar"><h1>Favoritos</h1></div>
      {DEMO && <div className="banner">Exemplos: escolhi um negócio de cada site para veres como fica. Os teus favoritos começam vazios.</div>}
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
          <div className="deals">
            {ordenados.map((f) => {
              const v = d.vistos[f.url];
              const fonte = v?.fonte || fonteDoUrl(f.url);
              const precos = v?.precos ?? [];
              const inicial = precos[0]?.[1];
              const atual = v?.preco ?? null;
              const desceu = inicial != null && atual != null && atual < inicial ? inicial - atual : 0;
              const fora = v?.estado === "vendido" || v?.estado === "removido";
              return (
                <article key={f.url} className="card deal" style={fora ? { opacity: 0.6 } : undefined}>
                  <a href={f.url} target="_blank" rel="noreferrer" aria-label="Abrir anúncio"><Foto src={v?.foto ?? ""} fonte={fonte} /></a>
                  <div className="corpo">
                    <div className="preco">
                      <span className="total">{atual != null ? euros(atual) : "—"}</span>
                      {desceu > 0 && <span className="tag deal"><TrendingDown size={12} />−{euros(desceu)}</span>}
                    </div>
                    {inicial != null && desceu > 0 && <div className="decomp">Estava a {euros(inicial)}</div>}
                    <a className="titulo clamp2" href={f.url} target="_blank" rel="noreferrer">{v?.titulo || f.titulo || f.url}</a>
                    <div className="tags">
                      <TagFonte fonte={fonte} />
                      <EstadoTag v={v} />
                    </div>
                    <div className="pe">
                      <span className="ref">{v?.verificado ? `Visto ${haQuanto(v.verificado)}` : `Seguido desde ${f.adicionado}`}{v?.erro ? ` · ${v.erro}` : ""}</span>
                      <span className="acoes">
                        <a className="btn ghost peq" href={f.url} target="_blank" rel="noreferrer"><ExternalLink size={15} />Abrir</a>
                        <BotaoApagar texto="Deixar de seguir" onConfirmar={() => remover(f.url)} />
                      </span>
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        )}
      {lista.length > 0 && <p className="small muted" style={{ marginTop: 14 }}>{lista.length} {lista.length === 1 ? "anúncio" : "anúncios"} em {new Set(lista.map((f) => NOME_FONTE[fonteDoUrl(f.url)] ?? "Loja")).size} sites.</p>}
    </>
  );
}
