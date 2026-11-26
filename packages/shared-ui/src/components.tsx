import type { ReactNode } from 'react';

/* Ícones minimalistas (traço 1.75, 24px). Desenhados para o projeto. */
type IconProps = { size?: number; className?: string };
const svg = (path: ReactNode, { size = 20, className }: IconProps) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth={1.75}
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden="true"
    className={className}
  >
    {path}
  </svg>
);

export const Icon = {
  chevronRight: (p: IconProps = {}) => svg(<path d="M9 6l6 6-6 6" />, { size: 16, ...p }),
  chevronLeft: (p: IconProps = {}) => svg(<path d="M15 6l-6 6 6 6" />, { size: 22, ...p }),
  check: (p: IconProps = {}) => svg(<path d="M5 12.5l4.5 4.5L19 7.5" />, p),
  shield: (p: IconProps = {}) =>
    svg(<path d="M12 3l7 3v5.5c0 4.4-3 8.1-7 9.5-4-1.4-7-5.1-7-9.5V6l7-3z" />, p),
  pause: (p: IconProps = {}) => svg(<path d="M9 6v12M15 6v12" />, p),
  lock: (p: IconProps = {}) =>
    svg(
      <>
        <rect x="5" y="11" width="14" height="10" rx="2.5" />
        <path d="M8 11V8a4 4 0 018 0v3" />
      </>,
      p,
    ),
  sliders: (p: IconProps = {}) =>
    svg(
      <>
        <path d="M4 7h10M18 7h2M4 17h4M12 17h8" />
        <circle cx="16" cy="7" r="2" />
        <circle cx="10" cy="17" r="2" />
      </>,
      p,
    ),
  eyeOff: (p: IconProps = {}) =>
    svg(
      <>
        <path d="M3 3l18 18" />
        <path d="M10.6 5.1A9.7 9.7 0 0112 5c5 0 8.5 4.5 9.5 7a13 13 0 01-2.7 3.9M6.3 6.3C4.4 7.7 3.1 9.7 2.5 12c1 2.5 4.5 7 9.5 7 1.7 0 3.2-.5 4.5-1.2" />
        <path d="M9.9 9.9a3 3 0 004.2 4.2" />
      </>,
      p,
    ),
  book: (p: IconProps = {}) =>
    svg(
      <>
        <path d="M4 5.5A2.5 2.5 0 016.5 3H20v15H6.5A2.5 2.5 0 004 20.5v-15z" />
        <path d="M4 20.5A2.5 2.5 0 006.5 23H20" transform="translate(0 -2)" />
      </>,
      p,
    ),
  device: (p: IconProps = {}) =>
    svg(
      <>
        <rect x="3" y="4" width="18" height="12" rx="2" />
        <path d="M8 20h8M12 16v4" />
      </>,
      p,
    ),
  external: (p: IconProps = {}) => svg(<path d="M14 4h6v6M20 4l-9 9M18 14v5a1 1 0 01-1 1H5a1 1 0 01-1-1V7a1 1 0 011-1h5" />, { size: 16, ...p }),
  mode: (p: IconProps = {}) =>
    svg(
      <>
        <circle cx="12" cy="12" r="8" />
        <path d="M12 4a8 8 0 010 16z" fill="currentColor" stroke="none" />
      </>,
      p,
    ),
};

/** Marca do Instagram Minimal: um traço de "menos" + ponto azul. Não usa a marca do Instagram. */
export function Logo({ size = 64, className }: { size?: number; className?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 64 64" className={className} role="img" aria-label="Instagram Minimal">
      <rect width="64" height="64" rx="16" fill="var(--text)" />
      <rect x="15" y="29" width="24" height="6" rx="3" fill="var(--bg)" />
      <circle cx="46.5" cy="32" r="3.5" fill="#007AFF" />
    </svg>
  );
}

export function NavBar({ title, onBack, backLabel = 'Voltar' }: { title?: string; onBack?: () => void; backLabel?: string }) {
  return (
    <div className="im-nav">
      {onBack ? (
        <button type="button" className="im-back" onClick={onBack}>
          {Icon.chevronLeft()}
          {backLabel}
        </button>
      ) : (
        <span />
      )}
      <div className="im-nav-title">{title}</div>
      <span />
    </div>
  );
}

export function Group({ header, footer, children }: { header?: ReactNode; footer?: ReactNode; children: ReactNode }) {
  return (
    <section className="im-group">
      {header && <h3 className="im-group-header">{header}</h3>}
      <div className="im-list">{children}</div>
      {footer && <p className="im-group-footer">{footer}</p>}
    </section>
  );
}

interface RowProps {
  title: ReactNode;
  subtitle?: ReactNode;
  value?: ReactNode;
  valueTone?: 'ok';
  icon?: ReactNode;
  accessory?: ReactNode;
  onClick?: () => void;
  href?: string;
  tone?: 'link' | 'danger';
  chevron?: boolean;
}

export function Row({ title, subtitle, value, valueTone, icon, accessory, onClick, href, tone, chevron }: RowProps) {
  const content = (
    <>
      {icon && <span className="im-row-icon">{icon}</span>}
      <span className="im-row-text">
        <span className="im-row-title">{title}</span>
        {subtitle && <span className="im-row-subtitle">{subtitle}</span>}
      </span>
      {value !== undefined && <span className={`im-row-value ${valueTone ?? ''}`}>{value}</span>}
      {accessory}
      {href && <span className="im-chevron">{Icon.external()}</span>}
      {!href && (chevron ?? !!onClick) && <span className="im-chevron">{Icon.chevronRight()}</span>}
    </>
  );
  const cls = `im-row ${tone ?? ''}`;
  if (href)
    return (
      <a className={cls} href={href} target="_blank" rel="noreferrer noopener">
        {content}
      </a>
    );
  if (onClick)
    return (
      <button type="button" className={cls} onClick={onClick}>
        {content}
      </button>
    );
  return <div className={cls}>{content}</div>;
}

export function Switch({
  checked,
  onChange,
  label,
  disabled,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
  label: string;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      disabled={disabled}
      className="im-switch"
      onClick={() => onChange(!checked)}
    />
  );
}

export function Button({
  children,
  variant = 'primary',
  block,
  onClick,
  disabled,
  type = 'button',
}: {
  children: ReactNode;
  variant?: 'primary' | 'secondary' | 'plain';
  block?: boolean;
  onClick?: () => void;
  disabled?: boolean;
  type?: 'button' | 'submit';
}) {
  return (
    <button type={type} className={`im-button ${variant} ${block ? 'block' : ''}`} onClick={onClick} disabled={disabled}>
      {children}
    </button>
  );
}

export function Sheet({ title, onClose, children }: { title: string; onClose: () => void; children: ReactNode }) {
  return (
    <>
      <div className="im-scrim" onClick={onClose} />
      <div className="im-sheet" role="dialog" aria-modal="true" aria-label={title}>
        <div className="im-sheet-grab" />
        <h2>{title}</h2>
        {children}
      </div>
    </>
  );
}
