import { useState } from "react";
import { Plus } from "lucide-react";
import { useDados } from "../data/store";
import { euros, hoje } from "../data/formato";
import type { Compra } from "../data/types";
import { BotaoApagar, Vazio } from "../ui/components";

const num = (t: string) => Number(t.replace(",", "."));
const dataPt = (iso?: string | null) => (iso ? new Date(iso + "T12:00:00").toLocaleDateString("pt-PT", { day: "2-digit", month: "short" }) : "");

export default function ComprasEcra() {
  const d = useDados();
  const [nova, setNova] = useState(false);
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
      const j = lista.findIndex((c) => c.titulo === alvo.titulo && c.data === alvo.data && c.preco_pago === alvo.preco_pago);
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
                {[...compras.entries()].reverse().map(([i, c]) => (
                  <LinhaCompra key={`${c.titulo}-${c.data}-${i}`} c={c}
                               onVender={(v) => atualizar(i, (x) => ({ ...x, vendido_por: v, data_venda: v == null ? null : hoje() }),
                                 v == null ? `Venda anulada: ${c.titulo.slice(0, 50)}` : `Vendido: ${c.titulo.slice(0, 50)}`)}
                               onApagar={() => atualizar(i, () => null, `Compra apagada: ${c.titulo.slice(0, 50)}`)} />
                ))}
              </tbody>
            </table>
          </div>
        )}
    </>
  );
}

function LinhaCompra({ c, onVender, onApagar }: { c: Compra; onVender: (v: number | null) => void; onApagar: () => void }) {
  const [valor, setValor] = useState("");
  const vendida = c.vendido_por != null;
  const l = vendida ? (c.vendido_por ?? 0) - c.preco_pago : null;
  return (
    <tr>
      <td style={{ minWidth: 220 }}>
        {c.url ? <a href={c.url} target="_blank" rel="noreferrer" style={{ fontWeight: 700 }}>{c.titulo}</a> : <strong>{c.titulo}</strong>}
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
    const ok = await d.alterarCompras(`Compra: ${titulo.slice(0, 60)}`, (c) => ({
      ...c, compras: [...(c.compras ?? []), { titulo: titulo.trim(), url: url.trim() || undefined, preco_pago: Math.round(v * 100) / 100, data: hoje(), vendido_por: null, data_venda: null }],
    }));
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
