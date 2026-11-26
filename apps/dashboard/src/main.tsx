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
import { DOWNLOAD, REPO, STORES } from './stores';

type Device = Platform | 'android-other' | 'iphone-other';

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
  | { kind: 'soon'; title: string; text: string };

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
    case 'firefox':
    case 'firefox-android':
      return STORES.firefox ? { kind: 'store', label: 'Adicionar ao Firefox', href: STORES.firefox, browser: 'Firefox' } : { kind: 'manual', browser: 'Firefox' };
    case 'android-other':
      return {
        kind: 'switch',
        title: 'No Android, use o Firefox',
        text: 'O app do Instagram e o Chrome do Android não aceitam extensões. Instale o Firefox, abra este site nele e toque no botão.',
        href: 'https://play.google.com/store/apps/details?id=org.mozilla.firefox',
        cta: 'Baixar o Firefox',
      };
    case 'safari-ios':
    case 'iphone-other':
      return STORES.appStore
        ? { kind: 'store', label: 'Baixar na App Store', href: STORES.appStore, browser: 'Safari' }
        : { kind: 'soon', title: 'Em breve no iPhone', text: 'A versão para iPhone está pronta e aguarda publicação na App Store. Enquanto isso, use no computador.' };
    case 'safari-macos':
      return STORES.appStore
        ? { kind: 'store', label: 'Baixar na App Store', href: STORES.appStore, browser: 'Safari' }
        : { kind: 'soon', title: 'Em breve no Safari', text: 'A versão para Mac aguarda publicação. Enquanto isso, use no Chrome, no Edge ou no Firefox.' };
    default:
      return { kind: 'manual', browser: 'Chrome' };
  }
}

function Primary({ plan }: { plan: Plan }) {
  const [open, setOpen] = useState(false);
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
        <p className="fine">Grátis. Você entra no Instagram de sempre — sua senha nunca passa por aqui.</p>
      </section>

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
              <h4>iPhone e Mac</h4>
              <p>Aguardando publicação na App Store. Quem tem Mac com Xcode pode instalar pelo código.</p>
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
