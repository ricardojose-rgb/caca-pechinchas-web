import { useEffect, useRef, useState, type ReactNode } from "react";
import { Check, ChevronLeft, ChevronRight, Copy, X, ZoomOut } from "lucide-react";
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

/** Fotos do anúncio em ecrã inteiro: setas/teclado/deslizar para mudar;
 *  clique, roda do rato ou pinça para ampliar; com zoom, a foto acompanha o rato/dedo. */
export function Galeria({ fotos, titulo, onFechar }: { fotos: string[]; titulo: string; onFechar: () => void }) {
  const [i, setI] = useState(0);
  const [zoom, setZoom] = useState(1);
  const [origem, setOrigem] = useState("50% 50%");
  const toque = useRef<{ x: number; dist: number; zoom: number } | null>(null);
  const ir = (d: number) => { setZoom(1); setI((n) => (n + d + fotos.length) % fotos.length); };
  useEffect(() => {
    const tecla = (e: KeyboardEvent) => {
      if (e.key === "Escape") onFechar();
      if (e.key === "ArrowRight") ir(1);
      if (e.key === "ArrowLeft") ir(-1);
    };
    window.addEventListener("keydown", tecla);
    return () => window.removeEventListener("keydown", tecla);
  });
  const apontar = (el: HTMLElement, cx: number, cy: number) => {
    const r = el.getBoundingClientRect();
    const px = Math.min(100, Math.max(0, ((cx - r.left) / r.width) * 100));
    const py = Math.min(100, Math.max(0, ((cy - r.top) / r.height) * 100));
    setOrigem(`${px}% ${py}%`);
  };
  const dist = (t: React.TouchList) => Math.hypot(t[0].clientX - t[1].clientX, t[0].clientY - t[1].clientY);
  return (
    <div className="galeria" role="dialog" aria-modal="true" aria-label={`Fotos: ${titulo}`} onClick={onFechar}>
      <div className="galeria-topo" onClick={(e) => e.stopPropagation()}>
        <span className="clamp1">{titulo}</span>
        {zoom > 1 && <button className="btn icone" onClick={() => setZoom(1)} aria-label="Tirar zoom" title="Tirar zoom"><ZoomOut size={18} /></button>}
        <button className="btn icone" onClick={onFechar} aria-label="Fechar"><X size={20} /></button>
      </div>
      <div className="galeria-palco" onClick={(e) => e.stopPropagation()}>
        <img src={fotos[i]} alt={`Foto ${i + 1} de ${fotos.length}`} referrerPolicy="no-referrer" draggable={false}
             className={zoom > 1 ? "ampliada" : ""}
             style={{ transform: `scale(${zoom})`, transformOrigin: origem }}
             onClick={(e) => { apontar(e.currentTarget, e.clientX, e.clientY); setZoom(zoom > 1 ? 1 : 2.5); }}
             onMouseMove={(e) => { if (zoom > 1) apontar(e.currentTarget, e.clientX, e.clientY); }}
             onWheel={(e) => { apontar(e.currentTarget, e.clientX, e.clientY); setZoom((z) => Math.min(5, Math.max(1, z * (e.deltaY < 0 ? 1.2 : 1 / 1.2)))); }}
             onTouchStart={(e) => {
               toque.current = { x: e.touches[0].clientX, dist: e.touches.length > 1 ? dist(e.touches) : 0, zoom };
             }}
             onTouchMove={(e) => {
               const t = toque.current;
               if (!t) return;
               if (e.touches.length > 1) {
                 const cx = (e.touches[0].clientX + e.touches[1].clientX) / 2, cy = (e.touches[0].clientY + e.touches[1].clientY) / 2;
                 apontar(e.currentTarget, cx, cy);
                 if (t.dist) setZoom(Math.min(5, Math.max(1, t.zoom * (dist(e.touches) / t.dist))));
               } else if (zoom > 1) apontar(e.currentTarget, e.touches[0].clientX, e.touches[0].clientY);
             }}
             onTouchEnd={(e) => {
               const t = toque.current;
               if (t && zoom <= 1 && !t.dist && e.changedTouches.length) {
                 const dx = e.changedTouches[0].clientX - t.x;
                 if (Math.abs(dx) > 40) ir(dx < 0 ? 1 : -1);
               }
               if (e.touches.length === 0) toque.current = null;
             }} />
      </div>
      {fotos.length > 1 && zoom <= 1 && (
        <>
          <button className="galeria-seta esq" onClick={(e) => { e.stopPropagation(); ir(-1); }} aria-label="Anterior"><ChevronLeft size={28} /></button>
          <button className="galeria-seta dir" onClick={(e) => { e.stopPropagation(); ir(1); }} aria-label="Seguinte"><ChevronRight size={28} /></button>
          <span className="galeria-conta">{i + 1} / {fotos.length}</span>
        </>
      )}
    </div>
  );
}
