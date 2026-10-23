// Acesso ao repositório privado caca-pechinchas através da API do GitHub.
// A chave (fine-grained) fica guardada só neste browser.

export interface Ligacao {
  token: string;
  repo: string; // "dono/repositorio"
}

export const REPO_PADRAO = "ricardojose-rgb/caca-pechinchas";

export class ErroGitHub extends Error {
  constructor(public status: number, msg: string) { super(msg); }
}

function mensagem(status: number): string {
  if (status === 401) return "A chave do GitHub não é válida ou expirou. Cria uma nova nas Definições.";
  if (status === 403) return "A chave não tem permissão para isto. Confirma que deste acesso ao repositório com Contents e Actions em \"Read and write\".";
  if (status === 404) return "Não encontrei o repositório. Confirma o nome e se a chave tem acesso a ele.";
  if (status === 409 || status === 422) return "O ficheiro mudou entretanto. Tenta outra vez.";
  return `O GitHub respondeu com um erro (${status}). Tenta outra vez daqui a pouco.`;
}

async function gh(l: Ligacao, caminho: string, init: RequestInit = {}, accept = "application/vnd.github+json"): Promise<Response> {
  let res: Response;
  try {
    res = await fetch(`https://api.github.com/repos/${l.repo}${caminho}`, {
      ...init,
      headers: {
        Authorization: `Bearer ${l.token}`,
        Accept: accept,
        "X-GitHub-Api-Version": "2022-11-28",
        ...(init.body ? { "Content-Type": "application/json" } : {}),
      },
      cache: "no-store",
    });
  } catch {
    throw new ErroGitHub(0, "Sem ligação ao GitHub. Verifica a internet.");
  }
  if (!res.ok) throw new ErroGitHub(res.status, mensagem(res.status));
  return res;
}

function deBase64(b64: string): string {
  const bin = atob(b64.replace(/\n/g, ""));
  const bytes = Uint8Array.from(bin, (c) => c.charCodeAt(0));
  return new TextDecoder().decode(bytes);
}

function paraBase64(texto: string): string {
  const bytes = new TextEncoder().encode(texto);
  let bin = "";
  for (let i = 0; i < bytes.length; i += 0x8000) bin += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
  return btoa(bin);
}

export interface Ficheiro { texto: string; sha: string }

export async function lerFicheiro(l: Ligacao, caminho: string): Promise<Ficheiro> {
  const meta = await (await gh(l, `/contents/${caminho}?ref=main`)).json();
  if (meta.content && meta.encoding === "base64") return { texto: deBase64(meta.content), sha: meta.sha };
  // ficheiros com mais de 1 MB vêm sem conteúdo: pedir em bruto
  const raw = await gh(l, `/contents/${caminho}?ref=main`, {}, "application/vnd.github.raw");
  return { texto: await raw.text(), sha: meta.sha };
}

export async function lerJson<T>(l: Ligacao, caminho: string): Promise<{ dados: T; sha: string }> {
  const f = await lerFicheiro(l, caminho);
  return { dados: JSON.parse(f.texto) as T, sha: f.sha };
}

/** Lê o JSON mais recente, aplica a alteração e grava. Repete uma vez se outro
 *  aparelho (ou a pesquisa automática) tiver gravado entretanto. */
export async function alterarJson<T>(l: Ligacao, caminho: string, mensagemCommit: string,
                                     alterar: (atual: T) => T): Promise<{ dados: T; sha: string }> {
  for (let tentativa = 0; tentativa < 4; tentativa++) {
    if (tentativa > 0) await new Promise((r) => setTimeout(r, 400 * tentativa));
    const { dados, sha } = await lerJson<T>(l, caminho);
    const novo = alterar(dados);
    try {
      const res = await gh(l, `/contents/${caminho}`, {
        method: "PUT",
        body: JSON.stringify({
          message: mensagemCommit,
          content: paraBase64(JSON.stringify(novo, null, 2) + "\n"),
          sha,
          branch: "main",
        }),
      });
      const j = await res.json();
      return { dados: novo, sha: j.content.sha };
    } catch (e) {
      if (e instanceof ErroGitHub && (e.status === 409 || e.status === 422) && tentativa < 3) continue;
      throw e;
    }
  }
  throw new ErroGitHub(409, mensagem(409));
}

export async function pesquisarAgora(l: Ligacao, soVendas = false): Promise<void> {
  await gh(l, "/actions/workflows/procurar.yml/dispatches", {
    method: "POST",
    body: JSON.stringify({ ref: "main", inputs: { diagnostico: "false", vendas: soVendas ? "true" : "false" } }),
  });
}

export interface Execucao { estado: "queued" | "in_progress" | "completed" | string; resultado: string | null; quando: string }

export async function ultimaExecucao(l: Ligacao): Promise<Execucao | null> {
  const j = await (await gh(l, "/actions/workflows/procurar.yml/runs?per_page=1")).json();
  const r = j.workflow_runs?.[0];
  return r ? { estado: r.status, resultado: r.conclusion, quando: r.created_at } : null;
}

export async function testarLigacao(l: Ligacao): Promise<void> {
  await gh(l, "");
}

const nomeChave = encodeURIComponent("Caça-Pechinchas site");
const descChave = encodeURIComponent("Site do Caça-Pechinchas: ler negócios e editar procuras e compras");
export function urlCriarChave(dono: string): string {
  return `https://github.com/settings/personal-access-tokens/new?name=${nomeChave}&description=${descChave}` +
    `&target_name=${encodeURIComponent(dono)}&expires_in=none&contents=write&actions=write`;
}
