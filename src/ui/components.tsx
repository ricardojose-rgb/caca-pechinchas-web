import { useEffect, useState, type ReactNode } from "react";
import { NOME_FONTE } from "../data/formato";

export function Logo() {
  return (
    <svg viewBox="0 0 64 64" aria-hidden="true">
      <rect width="64" height="64" rx="16" fill="var(--primary-soft)" />
      <path d="M18 14h14l18 18-16 16-18-18z" fill="none" stroke="var(--on-primary-soft)" strokeWidth="5" strokeLinejoin="round" />
      <circle cx="26" cy="22" r="3.5" fill="var(--deal)" />
    </svg>
  );
}

export function PontoFonte({ fonte }: { fonte: string }) {
  return <span className="ponto" style={{ background: `var(--s-${fonte}, var(--muted))` }} />;
}

export function TagFonte({ fonte }: { fonte: string }) {
  return <span className="tag"><PontoFonte fonte={fonte} />{NOME_FONTE[fonte] ?? fonte}</span>;
}

/** Foto do anúncio; se não carregar, mostra as iniciais do site.
 *  Com `faixa`, mostra uma faixa na diagonal (ex.: VENDIDO) e a foto a cinzento. */
export function Foto({ src, fonte, faixa }: { src: string; fonte: string; faixa?: { texto: string; tom: "fora" | "reservado" } }) {
  const [falhou, setFalhou] = useState(!src);
  useEffect(() => setFalhou(!src), [src]);
  const apagada = faixa?.tom === "fora";
  return (
    <div className={`foto ${apagada ? "apagada" : ""}`}>
      {!falhou && <img src={src} alt="" loading="lazy" referrerPolicy="no-referrer" onError={() => setFalhou(true)} />}
      {falhou && <div className="mono" style={{ color: `var(--s-${fonte}, var(--muted))` }}>{(NOME_FONTE[fonte] ?? fonte).slice(0, 3).toUpperCase()}</div>}
      {faixa && <div className={`faixa ${faixa.tom}`}>{faixa.texto}</div>}
    </div>
  );
}

export function Switch({ on, onClick, label }: { on: boolean; onClick: () => void; label: string }) {
  return <button type="button" role="switch" aria-checked={on} aria-label={label} className={`switch ${on ? "on" : ""}`} onClick={onClick} />;
}

/** Botão de apagar em dois passos (o browser da página não mostra confirm()). */
export function BotaoApagar({ onConfirmar, texto = "Apagar" }: { onConfirmar: () => void; texto?: string }) {
  const [armado, setArmado] = useState(false);
  useEffect(() => {
    if (!armado) return;
    const t = window.setTimeout(() => setArmado(false), 4000);
    return () => window.clearTimeout(t);
  }, [armado]);
  return (
    <button type="button" className={`btn perigo peq ${armado ? "armado" : ""}`}
            onClick={() => (armado ? onConfirmar() : setArmado(true))}>
      {armado ? "Confirmar" : texto}
    </button>
  );
}

export function Vazio({ titulo, children }: { titulo: string; children?: ReactNode }) {
  return <div className="empty card"><h3>{titulo}</h3>{children}</div>;
}

export function Marcas<T extends string | number>({ opcoes, valor, onChange, rotulo }: {
  opcoes: T[]; valor: T[]; onChange: (v: T[]) => void; rotulo?: (o: T) => string;
}) {
  return (
    <div className="marcas">
      {opcoes.map((o) => {
        const on = valor.includes(o);
        return (
          <button type="button" key={String(o)} className={on ? "on" : ""} aria-pressed={on}
                  onClick={() => onChange(on ? valor.filter((x) => x !== o) : [...valor, o])}>
            {rotulo ? rotulo(o) : String(o)}
          </button>
        );
      })}
    </div>
  );
}
