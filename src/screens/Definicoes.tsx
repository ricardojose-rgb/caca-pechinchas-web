import { useState } from "react";
import { ExternalLink } from "lucide-react";
import { DEMO, useDados } from "../data/store";
import { dataHora, NOME_FONTE } from "../data/formato";
import { REPO_PADRAO, testarLigacao, urlCriarChave } from "../data/github";
import { PontoFonte } from "../ui/components";

export default function DefinicoesEcra() {
  const d = useDados();
  const [token, setToken] = useState("");
  const [repo, setRepo] = useState(d.ligacao?.repo ?? REPO_PADRAO);
  const [estado, setEstado] = useState<"" | "a testar" | string>("");

  const ligar = async () => {
    const l = { token: token.trim(), repo: repo.trim() || REPO_PADRAO };
    if (!l.token) { setEstado("Cola a chave do GitHub."); return; }
    setEstado("a testar");
    try {
      await testarLigacao(l);
      d.ligar(l);
      setToken("");
      setEstado("");
      d.avisar("Ligado. A carregar os teus negócios…");
    } catch (e) {
      setEstado(e instanceof Error ? e.message : String(e));
    }
  };

  const dono = (repo.split("/")[0] || "ricardojose-rgb").trim();
  const n = d.negocios;

  return (
    <>
      <div className="topbar"><h1>Definições</h1></div>

      <h2 className="h2">Ligação ao GitHub</h2>
      {DEMO ? (
        <div className="card notice"><p>Na pré-visualização não há ligação: os dados são uma cópia da pesquisa de hoje.</p></div>
      ) : d.ligacao ? (
        <div className="card notice">
          <h3>Ligado a {d.ligacao.repo}</h3>
          <p>A chave está guardada só neste browser. Para usar o site noutro computador, cria lá uma ligação igual.</p>
          <button className="btn ghost peq" onClick={() => d.ligar(null)}>Desligar</button>
        </div>
      ) : (
        <form className="card form" onSubmit={(e) => { e.preventDefault(); void ligar(); }}>
          <p className="muted" style={{ margin: 0 }}>O site lê os negócios e grava as procuras e compras no teu repositório privado. Precisa de uma chave do GitHub com acesso só a esse repositório.</p>
          <ol className="passos">
            <li>Abre <a href={urlCriarChave(dono)} target="_blank" rel="noreferrer" style={{ color: "var(--primary)", fontWeight: 800 }}>criar chave no GitHub <ExternalLink size={13} style={{ display: "inline", verticalAlign: "-2px" }} /></a>. O nome e as permissões já vêm preenchidos.</li>
            <li>Em <strong>Repository access</strong>, escolhe <strong>Only select repositories</strong> e marca <code className="k">caca-pechinchas</code>.</li>
            <li>Carrega em <strong>Generate token</strong>, copia a chave e cola-a aqui.</li>
          </ol>
          <div className="grelha">
            <div className="campo">
              <label htmlFor="d-token">Chave do GitHub</label>
              <input id="d-token" className="input" type="password" autoComplete="off" value={token} onChange={(e) => setToken(e.target.value)} placeholder="github_pat_…" />
            </div>
            <div className="campo">
              <label htmlFor="d-repo">Repositório</label>
              <input id="d-repo" className="input" value={repo} onChange={(e) => setRepo(e.target.value)} />
            </div>
          </div>
          {estado && estado !== "a testar" && <div className="tag warn" style={{ justifySelf: "start", fontSize: 13, padding: "6px 12px", whiteSpace: "normal" }}>{estado}</div>}
          <div><button type="submit" className="btn filled" disabled={estado === "a testar"}>{estado === "a testar" ? "A testar…" : "Ligar"}</button></div>
        </form>
      )}

      {n && (
        <>
          <h2 className="h2">Estado dos sites</h2>
          <p className="sub" style={{ marginBottom: 10 }}>Última pesquisa: {dataHora(n.atualizado)}. Corre sozinha de hora em hora, das 7h às 2h.</p>
          <div className="card tabela-wrap">
            <table className="t">
              <thead><tr><th>Site</th><th>Estado</th><th className="dir">Anúncios lidos</th><th className="dir">Úteis</th></tr></thead>
              <tbody>
                {Object.entries(n.estado_fontes).map(([f, e]) => (
                  <tr key={f}>
                    <td style={{ fontWeight: 700, whiteSpace: "nowrap" }}><span style={{ display: "inline-flex", gap: 8, alignItems: "center" }}><PontoFonte fonte={f} />{NOME_FONTE[f] ?? f}</span></td>
                    <td>{e.ok ? <span className="tag ok">A funcionar</span> : <span className="tag warn" title={e.erros.join("\n")}>Falhou</span>}
                      {!e.ok && e.erros[0] && <div className="small muted" style={{ marginTop: 4 }}>{e.erros[0]}</div>}</td>
                    <td className="dir">{e.lidos}</td>
                    <td className="dir">{e.relevantes}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </>
  );
}
