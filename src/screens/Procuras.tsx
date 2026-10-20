import { useState } from "react";
import { Pencil, Plus } from "lucide-react";
import { aPesquisar, useDados } from "../data/store";
import { eurosCurto, listaDeTexto, slug } from "../data/formato";
import type { Categoria, Procura } from "../data/types";
import { BotaoApagar, Marcas, Switch, Vazio } from "../ui/components";

const NOME_CAT: Record<Categoria, string> = { ssd: "SSD", ram: "Memória RAM", generico: "Outro produto" };
const CAP_SSD = [128, 250, 500, 1000, 2000, 4000];
const CAP_RAM = [4, 8, 16, 32, 64];
const capTexto = (c: number) => (c >= 1000 ? `${c / 1000} TB` : `${c} GB`);

export default function ProcurasEcra() {
  const d = useDados();
  const [editar, setEditar] = useState<Procura | "nova" | null>(null);

  const procuras = d.procuras?.procuras ?? [];
  const resultado = (id: string) => d.negocios?.procuras.find((p) => p.id === id);

  const guardar = async (p: Procura, antigaId: string | null) => {
    const ok = await d.alterarProcuras(antigaId ? `Procura alterada: ${p.nome}` : `Nova procura: ${p.nome}`, (c) => {
      const lista = [...(c.procuras ?? [])];
      const i = antigaId ? lista.findIndex((x) => x.id === antigaId) : -1;
      if (i >= 0) lista[i] = p;
      else lista.push(p);
      return { ...c, procuras: lista };
    });
    if (ok) {
      setEditar(null);
      d.avisar(`Guardado. "${p.nome}" entra na próxima pesquisa; carrega em Pesquisar agora para não esperar.`);
    }
  };

  const alternar = (p: Procura) => d.alterarProcuras(`${p.ativa === false ? "Activar" : "Pausar"} procura: ${p.nome}`, (c) => ({
    ...c, procuras: c.procuras.map((x) => (x.id === p.id ? { ...x, ativa: x.ativa === false } : x)),
  }));

  const apagar = async (p: Procura) => {
    const ok = await d.alterarProcuras(`Procura apagada: ${p.nome}`, (c) => ({ ...c, procuras: c.procuras.filter((x) => x.id !== p.id) }));
    if (ok) { setEditar(null); d.avisar(`"${p.nome}" apagada.`); }
  };

  if (editar) {
    return <Editor inicial={editar === "nova" ? null : editar} existentes={procuras.map((p) => p.id)}
                   onGuardar={guardar} onCancelar={() => setEditar(null)} onApagar={apagar} />;
  }

  return (
    <>
      <div className="topbar">
        <h1>Procuras</h1>
        <button className="btn tonal" onClick={() => d.pesquisar()} disabled={aPesquisar(d.execucao)}>
          {aPesquisar(d.execucao) ? <><span className="spinner" />A pesquisar…</> : "Pesquisar agora"}
        </button>
        <button className="btn filled" onClick={() => setEditar("nova")}><Plus size={18} />Nova procura</button>
      </div>
      <p className="sub">Cada procura fica sempre aberta. Comprar alguma coisa não a fecha; só a pausas se quiseres.</p>

      {procuras.length === 0
        ? <Vazio titulo="Ainda não tens procuras"><p>Cria a primeira: um SSD, RAM, uma placa gráfica, o que te lembrares.</p>
            <button className="btn filled" onClick={() => setEditar("nova")}><Plus size={18} />Nova procura</button></Vazio>
        : (
          <div className="procuras">
            {procuras.map((p) => {
              const r = resultado(p.id);
              const ativa = p.ativa !== false;
              return (
                <article key={p.id} className={`card procura ${ativa ? "" : "pausada"}`}>
                  <div className="cab">
                    <h3 className="clamp1">{p.nome}</h3>
                    <Switch on={ativa} onClick={() => alternar(p)} label={ativa ? `Pausar ${p.nome}` : `Activar ${p.nome}`} />
                  </div>
                  <div className="tags" style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                    <span className="tag">{NOME_CAT[p.categoria] ?? p.categoria}</span>
                    {!ativa && <span className="tag warn">Pausada</span>}
                    {r && r.negocios.length > 0 && <span className="tag deal">{r.negocios.length} negócios</span>}
                  </div>
                  <dl className="dados">
                    <dt>Limite</dt><dd>{eurosCurto(p.preco_max)}{p.preco_min ? ` · mínimo ${eurosCurto(p.preco_min)}` : ""}</dd>
                    <dt>Pesquisa</dt><dd className="clamp2">{p.termos.join(", ")}</dd>
                    {resumoFiltros(p) && <><dt>Filtros</dt><dd className="clamp2">{resumoFiltros(p)}</dd></>}
                    {r && Object.keys(r.medianas).length > 0 && (
                      <><dt>Mediana</dt><dd>{Object.entries(r.medianas).map(([g, m]) => `${g === "todos" ? "" : g + " "}${eurosCurto(m.mediana)}`).join(" · ")}</dd></>
                    )}
                  </dl>
                  <div><button className="btn ghost peq" onClick={() => setEditar(p)}><Pencil size={15} />Editar</button></div>
                </article>
              );
            })}
          </div>
        )}
    </>
  );
}

function resumoFiltros(p: Procura): string {
  const partes: string[] = [];
  if (p.capacidades?.length) partes.push(p.capacidades.map(capTexto).join("/"));
  if (p.interfaces?.length) partes.push(p.interfaces.join("/"));
  if (p.ddr?.length) partes.push(p.ddr.join("/"));
  if (p.formatos?.length) partes.push(p.formatos.join("/"));
  if (p.obrigatorio?.length) partes.push(`com ${p.obrigatorio.join(" + ")}`);
  if (p.excluir?.length) partes.push(`sem ${p.excluir.join(", ")}`);
  return partes.join(" · ");
}

function Editor({ inicial, existentes, onGuardar, onCancelar, onApagar }: {
  inicial: Procura | null; existentes: string[];
  onGuardar: (p: Procura, antigaId: string | null) => Promise<void>;
  onCancelar: () => void; onApagar: (p: Procura) => void;
}) {
  const [nome, setNome] = useState(inicial?.nome ?? "");
  const [categoria, setCategoria] = useState<Categoria>(inicial?.categoria ?? "generico");
  const [termos, setTermos] = useState((inicial?.termos ?? []).join(", "));
  const [precoMax, setPrecoMax] = useState(inicial ? String(inicial.preco_max) : "");
  const [precoMin, setPrecoMin] = useState(inicial?.preco_min ? String(inicial.preco_min) : "");
  const [capacidades, setCapacidades] = useState<number[]>(inicial?.capacidades ?? []);
  const [interfaces, setInterfaces] = useState<string[]>(inicial?.interfaces ?? []);
  const [externos, setExternos] = useState(!!inicial?.incluir_externos);
  const [ddr, setDdr] = useState<string[]>(inicial?.ddr ?? ["DDR4"]);
  const [formatos, setFormatos] = useState<string[]>(inicial?.formatos ?? []);
  const [obrigatorio, setObrigatorio] = useState((inicial?.obrigatorio ?? []).join(", "));
  const [excluir, setExcluir] = useState((inicial?.excluir ?? []).join(", "));
  const [variantes, setVariantes] = useState(Object.entries(inicial?.variantes ?? {}).map(([k, v]) => `${k} = ${v}`).join("\n"));
  const [erro, setErro] = useState("");
  const [aGravar, setAGravar] = useState(false);

  const submeter = async () => {
    const max = Number(precoMax.replace(",", "."));
    const min = precoMin ? Number(precoMin.replace(",", ".")) : 0;
    const listaTermos = listaDeTexto(termos);
    if (!nome.trim()) return setErro("Dá um nome à procura.");
    if (listaTermos.length === 0) return setErro("Escreve pelo menos um termo de pesquisa.");
    if (!Number.isFinite(max) || max <= 0) return setErro("Escreve o preço máximo que pagavas.");
    if ((categoria === "ssd" || categoria === "ram") && capacidades.length === 0) return setErro("Escolhe pelo menos uma capacidade.");

    let id = inicial?.id ?? slug(nome);
    if (!inicial) { let n = 2; const base = id; while (existentes.includes(id)) id = `${base}-${n++}`; }

    // mantém campos que o site não edita (ex.: páginas, desconto_minimo)
    const p: Procura = { ...(inicial ?? {}), id, nome: nome.trim(), categoria, termos: listaTermos, preco_max: max,
      ativa: inicial?.ativa ?? true } as Procura;
    for (const k of ["preco_min", "capacidades", "interfaces", "incluir_externos", "ddr", "formatos", "obrigatorio", "excluir", "variantes"]) delete p[k];
    if (min > 0) p.preco_min = min;
    if (categoria === "ssd") {
      p.capacidades = [...capacidades].sort((a, b) => a - b);
      if (interfaces.length) p.interfaces = interfaces;
      if (externos) p.incluir_externos = true;
    } else if (categoria === "ram") {
      p.capacidades = [...capacidades].sort((a, b) => a - b);
      if (ddr.length) p.ddr = ddr;
      if (formatos.length) p.formatos = formatos;
    } else {
      const obr = listaDeTexto(obrigatorio);
      p.obrigatorio = obr.length ? obr : [listaTermos[0]];
      const exc = listaDeTexto(excluir);
      if (exc.length) p.excluir = exc;
      const vars = Object.fromEntries(variantes.split("\n").map((l) => l.split("=").map((s) => s.trim()))
        .filter((a) => a.length === 2 && a[0] && a[1]));
      if (Object.keys(vars).length) p.variantes = vars;
    }
    setErro(""); setAGravar(true);
    await onGuardar(p, inicial?.id ?? null);
    setAGravar(false);
  };

  return (
    <>
      <div className="topbar"><h1>{inicial ? `Editar ${inicial.nome}` : "Nova procura"}</h1></div>
      <form className="card form" onSubmit={(e) => { e.preventDefault(); void submeter(); }}>
        <div className="grelha">
          <div className="campo">
            <label htmlFor="p-nome">Nome</label>
            <input id="p-nome" className="input" value={nome} onChange={(e) => setNome(e.target.value)} placeholder="Ex.: Placa gráfica RTX 3060" />
          </div>
          <div className="campo">
            <span className="rot">Tipo de produto</span>
            <div className="segmented" style={{ alignSelf: "start" }}>
              {(["ssd", "ram", "generico"] as Categoria[]).map((c) => (
                <button type="button" key={c} className={categoria === c ? "on" : ""}
                        onClick={() => { setCategoria(c); setCapacidades([]); }}>{NOME_CAT[c]}</button>
              ))}
            </div>
          </div>
        </div>

        <div className="campo">
          <label htmlFor="p-termos">O que escrever na pesquisa dos sites</label>
          <input id="p-termos" className="input" value={termos} onChange={(e) => setTermos(e.target.value)} placeholder="Ex.: rtx 3060, geforce 3060" />
          <span className="ajuda">Separados por vírgulas. Cada termo é pesquisado em todos os sites, por isso poucos e bons.</span>
        </div>

        <div className="grelha">
          <div className="campo">
            <label htmlFor="p-max">Preço máximo (com portes)</label>
            <input id="p-max" className="input num" inputMode="decimal" value={precoMax} onChange={(e) => setPrecoMax(e.target.value)} placeholder="Ex.: 180" />
            <span className="ajuda">Também é negócio o que estiver 25% abaixo da mediana do mercado.</span>
          </div>
          <div className="campo">
            <label htmlFor="p-min">Preço mínimo (opcional)</label>
            <input id="p-min" className="input num" inputMode="decimal" value={precoMin} onChange={(e) => setPrecoMin(e.target.value)} placeholder="Ex.: 100" />
            <span className="ajuda">Deita fora caixas vazias, acessórios e iscas de 1 €.</span>
          </div>
        </div>

        {categoria === "ssd" && (
          <>
            <div className="campo"><span className="rot">Capacidade</span>
              <Marcas opcoes={CAP_SSD} valor={capacidades} onChange={setCapacidades} rotulo={capTexto} />
              <span className="ajuda">240/256 GB contam como 250; 480/512 GB como 500.</span></div>
            <div className="campo"><span className="rot">Tipo (vazio = todos)</span>
              <Marcas opcoes={["SATA", "NVMe", "M.2 SATA"]} valor={interfaces} onChange={setInterfaces} /></div>
            <label className="campo" style={{ display: "flex", gap: 10, alignItems: "center" }}>
              <Switch on={externos} onClick={() => setExternos(!externos)} label="Incluir SSD externos" />
              <span className="small" style={{ fontWeight: 700 }}>Incluir SSD externos (USB)</span>
            </label>
          </>
        )}

        {categoria === "ram" && (
          <>
            <div className="campo"><span className="rot">Capacidade total</span>
              <Marcas opcoes={CAP_RAM} valor={capacidades} onChange={setCapacidades} rotulo={(c) => `${c} GB`} />
              <span className="ajuda">Um kit 2×8 GB conta como 16 GB.</span></div>
            <div className="grelha">
              <div className="campo"><span className="rot">Geração</span>
                <Marcas opcoes={["DDR3", "DDR4", "DDR5"]} valor={ddr} onChange={setDdr} /></div>
              <div className="campo"><span className="rot">Formato (vazio = os dois)</span>
                <Marcas opcoes={["desktop", "portátil"]} valor={formatos} onChange={setFormatos} rotulo={(f) => (f === "desktop" ? "Desktop" : "Portátil")} /></div>
            </div>
          </>
        )}

        {categoria === "generico" && (
          <>
            <div className="grelha">
              <div className="campo">
                <label htmlFor="p-obr">Palavras obrigatórias no título</label>
                <input id="p-obr" className="input" value={obrigatorio} onChange={(e) => setObrigatorio(e.target.value)} placeholder="Ex.: rtx|geforce, 3060" />
                <span className="ajuda">Todas têm de aparecer. <code className="k">a|b</code> quer dizer uma ou outra. Vazio = o primeiro termo.</span>
              </div>
              <div className="campo">
                <label htmlFor="p-exc">Palavras que excluem</label>
                <input id="p-exc" className="input" value={excluir} onChange={(e) => setExcluir(e.target.value)} placeholder="Ex.: ti, portatil, pc" />
                <span className="ajuda">Ex.: <code className="k">ti</code> para não apanhar a 3060 Ti.</span>
              </div>
            </div>
            <div className="campo">
              <label htmlFor="p-var">Versões a comparar em separado (opcional)</label>
              <textarea id="p-var" className="input" value={variantes} onChange={(e) => setVariantes(e.target.value)} placeholder={"12GB = 12gb\n8GB = 8gb"} />
              <span className="ajuda">Uma por linha, <code className="k">nome = palavras</code>. Cada versão tem a sua mediana de preço.</span>
            </div>
          </>
        )}

        {erro && <div className="tag warn" style={{ justifySelf: "start", fontSize: 13, padding: "6px 12px" }}>{erro}</div>}
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
          <button type="submit" className="btn filled" disabled={aGravar}>{aGravar ? "A guardar…" : "Guardar procura"}</button>
          <button type="button" className="btn ghost" onClick={onCancelar}>Cancelar</button>
          <span style={{ flex: 1 }} />
          {inicial && <BotaoApagar texto="Apagar procura" onConfirmar={() => onApagar(inicial)} />}
        </div>
      </form>
    </>
  );
}
