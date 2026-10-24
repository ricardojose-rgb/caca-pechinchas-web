import { useEffect, useState, type ReactNode } from "react";
import { Check, ChevronLeft, ChevronRight, Copy, X } from "lucide-react";
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

/** Ícone para copiar o nome do artigo (fica um visto durante 1,5 s). */
export function CopiarNome({ texto }: { texto: string }) {
  const [feito, setFeito] = useState(false);
  return (
    <button type="button" className="copiar-nome" title={feito ? "Copiado" : "Copiar nome"} aria-label="Copiar nome"
            onClick={(e) => {
              e.preventDefault(); e.stopPropagation();
              void navigator.clipboard?.writeText(texto).then(() => { setFeito(true); setTimeout(() => setFeito(false), 1500); });
            }}>
      {feito ? <Check size={14} /> : <Copy size={14} />}
    </button>
  );
}

/** Fotos do anúncio original em ecrã inteiro (setas, teclado e deslizar). */
export function Galeria({ fotos, titulo, onFechar }: { fotos: string[]; titulo: string; onFechar: () => void }) {
  const [i, setI] = useState(0);
  const [x0, setX0] = useState<number | null>(null);
  const ir = (d: number) => setI((n) => (n + d + fotos.length) % fotos.length);
  useEffect(() => {
    const tecla = (e: KeyboardEvent) => {
      if (e.key === "Escape") onFechar();
      if (e.key === "ArrowRight") ir(1);
      if (e.key === "ArrowLeft") ir(-1);
    };
    window.addEventListener("keydown", tecla);
    return () => window.removeEventListener("keydown", tecla);
  });
  return (
    <div className="galeria" role="dialog" aria-modal="true" aria-label={`Fotos: ${titulo}`} onClick={onFechar}
         onTouchStart={(e) => setX0(e.touches[0].clientX)}
         onTouchEnd={(e) => { if (x0 != null) { const dx = e.changedTouches[0].clientX - x0; if (Math.abs(dx) > 40) ir(dx < 0 ? 1 : -1); } setX0(null); }}>
      <div className="galeria-topo" onClick={(e) => e.stopPropagation()}>
        <span className="clamp1">{titulo}</span>
        <button className="btn icone" onClick={onFechar} aria-label="Fechar"><X size={20} /></button>
      </div>
      <img src={fotos[i]} alt={`Foto ${i + 1} de ${fotos.length}`} referrerPolicy="no-referrer" onClick={(e) => e.stopPropagation()} />
      {fotos.length > 1 && (
        <>
          <button className="galeria-seta esq" onClick={(e) => { e.stopPropagation(); ir(-1); }} aria-label="Anterior"><ChevronLeft size={28} /></button>
          <button className="galeria-seta dir" onClick={(e) => { e.stopPropagation(); ir(1); }} aria-label="Seguinte"><ChevronRight size={28} /></button>
          <span className="galeria-conta">{i + 1} / {fotos.length}</span>
        </>
      )}
    </div>
  );
}
