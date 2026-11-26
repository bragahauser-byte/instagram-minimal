/**
 * Página pública do projeto (GitHub Pages). Um botão só, escolhido pelo
 * aparelho de quem abre. Não recebe, não lê e não envia dados da conta do
 * Instagram; a prévia do painel usa só o localStorage deste site.
 */
import { StrictMode, useMemo, useState, type ReactNode } from 'react';
import { createRoot } from 'react-dom/client';
import { SettingsRepository, detectPlatform, localStorageArea, type Platform } from '@im/core';
import { Icon, Logo, MinimalApp } from '@im/ui';
import '../../../packages/shared-ui/src/ui.css';
import './site.css';
import { DOWNLOAD, FREE, REPO, SITE, STORES, USERSCRIPT } from './stores';

type Device = Platform | 'android-other' | 'iphone-other';

type FreeStep = { text: ReactNode; cta?: string; href?: string; copy?: string };

function detectDevice(): Device {
  const ua = navigator.userAgent;
  const p = detectPlatform(ua, navigator.maxTouchPoints);
  if (p === 'unknown' || p === 'chrome' || p === 'edge') {
    if (/Android/.test(ua)) return 'android-other';
    if (/iPhone|iPad|CriOS|FxiOS|EdgiOS/.test(ua)) return 'iphone-other';
  }
  return p;
}

type Plan =
  | { kind: 'store'; label: string; href: string; browser: string }
  | { kind: 'manual'; browser: 'Chrome' | 'Edge' | 'Firefox' }
  | { kind: 'switch'; title: string; text: string; href?: string; cta?: string }
  | { kind: 'soon'; title: string; text: string }
  | { kind: 'steps'; title: string; note?: string; steps: FreeStep[] };

function planFor(d: Device): Plan {
  switch (d) {
    case 'chrome':
      return STORES.chrome ? { kind: 'store', label: 'Adicionar ao Chrome', href: STORES.chrome, browser: 'Chrome' } : { kind: 'manual', browser: 'Chrome' };
    case 'edge':
      return STORES.edge
        ? { kind: 'store', label: 'Adicionar ao Edge', href: STORES.edge, browser: 'Edge' }
        : STORES.chrome
          ? { kind: 'store', label: 'Adicionar ao Edge', href: STORES.chrome, browser: 'Edge' }
          : { kind: 'manual', browser: 'Edge' };
    case 'firefox-android':
      return {
        kind: 'steps',
        title: 'Grátis no Firefox para Android',
        steps: [
          { text: 'Instale o Violentmonkey (grátis).', cta: 'Instalar Violentmonkey', href: FREE.violentmonkeyFirefox },
          { text: <>Volte aqui, toque abaixo e depois em <b>Confirmar instalação</b>.</>, cta: 'Instalar o Instagram Minimal', href: USERSCRIPT },
          { text: 'Abra o Instagram e entre com sua conta.', cta: 'Abrir o Instagram', href: 'https://www.instagram.com/' },
        ],
      };
    case 'firefox':
      return STORES.firefox ? { kind: 'store', label: 'Adicionar ao Firefox', href: STORES.firefox, browser: 'Firefox' } : { kind: 'manual', browser: 'Firefox' };
    case 'android-other':
      return {
        kind: 'steps',
        title: 'No Android, use o Firefox (grátis)',
        note: 'O Chrome do celular e o app do Instagram não aceitam nenhum tipo de complemento. O Firefox aceita.',
        steps: [
          { text: 'Instale o Firefox.', cta: 'Baixar o Firefox', href: FREE.firefoxAndroid },
          { text: 'Abra este endereço no Firefox:', copy: SITE },
        ],
      };
    case 'safari-ios':
      return {
        kind: 'steps',
        title: 'Grátis no Safari do iPhone',
        steps: [
          { text: <>Instale o app <b>Userscripts</b> (grátis), abra uma vez e escolha uma pasta quando ele pedir.</>, cta: 'Baixar Userscripts', href: FREE.userscriptsIOS },
          { text: <>Em <b>Ajustes → Apps → Safari → Extensões → Userscripts</b>: ative e permita em <b>instagram.com</b>.</> },
          { text: <>Volte aqui no Safari, toque abaixo, depois no ícone <b>ᴬA</b> da barra → <b>Userscripts</b> → <b>Instalar</b>.</>, cta: 'Instalar o Instagram Minimal', href: USERSCRIPT },
          { text: 'Abra o Instagram no Safari e entre com sua conta.', cta: 'Abrir o Instagram', href: 'https://www.instagram.com/' },
        ],
      };
    case 'iphone-other':
      return {
        kind: 'steps',
        title: 'No iPhone, use o Safari',
        note: 'O Chrome do iPhone e o app do Instagram não aceitam nenhum tipo de complemento. O Safari aceita, de graça.',
        steps: [{ text: 'Copie o endereço e abra no Safari:', copy: SITE }],
      };
    case 'safari-macos':
      return STORES.appStore
        ? { kind: 'store', label: 'Baixar na App Store', href: STORES.appStore, browser: 'Safari' }
        : { kind: 'soon', title: 'Em breve no Safari', text: 'A versão para Mac aguarda publicação. Enquanto isso, use no Chrome, no Edge ou no Firefox.' };
    default:
      return { kind: 'manual', browser: 'Chrome' };
  }
}

function CopyButton({ value }: { value: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <button type="button" className="chip" onClick={() => navigator.clipboard?.writeText(value).then(() => setCopied(true))}>
      {value.replace('https://', '')} {copied ? '✓ copiado' : '· copiar'}
    </button>
  );
}

function FreeSteps({ plan }: { plan: Extract<Plan, { kind: 'steps' }> }) {
  return (
    <div className="free">
      <h3>{plan.title}</h3>
      {plan.note && <p className="free-note">{plan.note}</p>}
      <ol>
        {plan.steps.map((st, i) => (
          <li key={i}>
            <span className="step-n">{i + 1}</span>
            <div>
              <p>{st.text}</p>
              {st.copy && <CopyButton value={st.copy} />}
              {st.href && (
                <a className={`im-button ${i === plan.steps.length - 1 ? 'primary' : 'secondary'}`} href={st.href}>
                  {st.cta}
                </a>
              )}
            </div>
          </li>
        ))}
      </ol>
      <p className="free-note">Sem pagar nada, sem conta nova. O login é no Instagram de sempre.</p>
    </div>
  );
}

function Primary({ plan }: { plan: Plan }) {
  const [open, setOpen] = useState(false);
  if (plan.kind === 'steps') return <FreeSteps plan={plan} />;
  if (plan.kind === 'store')
    return (
      <a className="im-button primary big" href={plan.href}>
        {plan.label}
      </a>
    );
  if (plan.kind === 'switch' || plan.kind === 'soon')
    return (
      <div className="notice">
        <h3>{plan.title}</h3>
        <p>{plan.text}</p>
        {plan.kind === 'switch' && plan.href && (
          <a className="im-button primary" href={plan.href}>
            {plan.cta}
          </a>
        )}
      </div>
    );
  // Instalação manual: enquanto não está na loja.
  const target = plan.browser === 'Firefox' ? 'firefox' : 'chromium';
  return (
    <>
      <a className="im-button primary big" href={DOWNLOAD(target)} onClick={() => setOpen(true)}>
        Baixar para {plan.browser}
      </a>
      {open && <ManualSteps browser={plan.browser} />}
      {!open && (
        <button type="button" className="linkish" onClick={() => setOpen(true)}>
          Como instalar
        </button>
      )}
    </>
  );
}

function ManualSteps({ browser }: { browser: 'Chrome' | 'Edge' | 'Firefox' }) {
  const page = browser === 'Edge' ? 'edge://extensions' : browser === 'Chrome' ? 'chrome://extensions' : 'about:debugging#/runtime/this-firefox';
  const [copied, setCopied] = useState(false);
  return (
    <ol className="manual">
      <li>Descompacte o arquivo baixado.</li>
      <li>
        Cole na barra de endereço:{' '}
        <button
          type="button"
          className="chip"
          onClick={() => navigator.clipboard?.writeText(page).then(() => setCopied(true))}
        >
          {page} {copied ? '✓ copiado' : '· copiar'}
        </button>
      </li>
      {browser === 'Firefox' ? (
        <li>
          Clique em <b>Carregar extensão temporária</b> e escolha o arquivo <b>manifest.json</b>.
        </li>
      ) : (
        <li>
          Ligue o <b>Modo do desenvolvedor</b>, clique em <b>Carregar sem compactação</b> e escolha a pasta.
        </li>
      )}
      <li>Pronto: toque em <b>Abrir o Instagram</b> e entre normalmente.</li>
    </ol>
  );
}

function Step({ n, title, children }: { n: number; title: string; children: ReactNode }) {
  return (
    <div className="step">
      <span className="step-n">{n}</span>
      <h3>{title}</h3>
      <p>{children}</p>
    </div>
  );
}

function Site() {
  const device = useMemo(detectDevice, []);
  const plan = useMemo(() => planFor(device), [device]);
  const platform = detectPlatform(navigator.userAgent, navigator.maxTouchPoints);
  const repo = useMemo(() => new SettingsRepository(localStorageArea(window.localStorage, 'im-demo:')), []);
  const [key, setKey] = useState(0);

  return (
    <div className="site im-root">
      <section className="hero">
        <Logo size={72} className="hero-logo" />
        <h1>Seu Instagram. Do seu jeito.</h1>
        <p>Sem Reels. Sem sugeridos. Direct, Stories e quem você segue continuam iguais.</p>
        <div className="hero-cta">
          <Primary plan={plan} />
        </div>
        {plan.kind !== 'steps' && (
          <p className="fine">Grátis. Você entra no Instagram de sempre — sua senha nunca passa por aqui.</p>
        )}
      </section>

      {plan.kind !== 'steps' && (
      <section className="band">
        <div className="steps">
          <Step n={1} title="Instale">
            Um toque no botão acima.
          </Step>
          <Step n={2} title="Abra o Instagram">
            O botão aparece assim que termina de instalar.
          </Step>
          <Step n={3} title="Entre e use">
            Com sua conta, como sempre. O bloqueio já está ligado.
          </Step>
        </div>
      </section>
      )}

      <section className="section" id="previa">
        <h2>Um painel simples.</h2>
        <p className="lead">Ligar, pausar e escolher o que bloquear. Nada além disso.</p>
        <div className="device">
          <MinimalApp key={key} repo={repo} env={{ platform, layout: 'popup', docsUrl: `${REPO}#readme`, demo: true }} />
        </div>
        <p className="fine center">
          Prévia: não controla a extensão.{' '}
          <button
            className="linkish"
            type="button"
            onClick={() => {
              localStorage.removeItem('im-demo:im:state');
              setKey((k) => k + 1);
            }}
          >
            Recomeçar
          </button>
        </p>
      </section>

      <section className="band">
        <div className="cols2 privacy">
          {[
            ['Sem senha', 'O login é no instagram.com oficial. Nada passa por este site.'],
            ['Nada sai do aparelho', 'Sem servidor, sem conta, sem rastreamento.'],
          ].map(([t, d]) => (
            <div key={t} className="fact">
              <span className="im-check">{Icon.check({ size: 20 })}</span>
              <div>
                <h3>{t}</h3>
                <p>{d}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      <footer className="foot">
        <details className="more">
          <summary>Outros aparelhos e instalação manual</summary>
          <div className="more-grid">
            <div>
              <h4>Chrome e Edge</h4>
              <a href={DOWNLOAD('chromium')}>Baixar</a>
              <ManualSteps browser="Chrome" />
            </div>
            <div>
              <h4>Firefox (computador e Android)</h4>
              <a href={DOWNLOAD('firefox')}>Baixar</a>
              <ManualSteps browser="Firefox" />
            </div>
            <div>
              <h4>iPhone (Safari) e Android (Firefox) — grátis</h4>
              <p>
                Instale o app gratuito Userscripts (iPhone) ou o Violentmonkey (Firefox Android) e depois{' '}
                <a href={USERSCRIPT}>o script do Instagram Minimal</a>. Abra este site pelo celular para ver o passo a passo.
              </p>
            </div>
          </div>
        </details>
        <p className="links">
          <a href={REPO}>Código no GitHub</a> · <a href={`${REPO}/blob/main/docs/privacy.md`}>Privacidade</a> ·{' '}
          <a href={`${REPO}/blob/main/docs/installation.md`}>Ajuda</a>
        </p>
        <p>
          Projeto independente e de código aberto. Não é afiliado à Meta nem ao Instagram. "Instagram" é marca da Meta
          Platforms, Inc.
        </p>
      </footer>
    </div>
  );
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <Site />
  </StrictMode>,
);
