/**
 * Página pública do projeto (GitHub Pages): um guia de instalação com
 * passos grandes para qualquer aparelho. Não recebe, não lê e não envia
 * dados da conta do Instagram. O único sinal que ela lê é o atributo
 * data-im-installed, colocado pelo próprio script quando já está instalado.
 */
import { StrictMode, useEffect, useMemo, useState, type ReactNode } from 'react';
import { createRoot } from 'react-dom/client';
import { detectPlatform } from '@im/core';
import { Icon, Logo } from '@im/ui';
import '../../../packages/shared-ui/src/ui.css';
import './site.css';
import { DOWNLOAD, FREE, REPO, SITE, USERSCRIPT } from './stores';

type Tab = 'iphone' | 'android' | 'computador';
type Desk = 'chrome' | 'edge' | 'firefox' | 'safari';

const IG = 'https://www.instagram.com/';

function detect(): { tab: Tab; desk: Desk; inRightBrowser: boolean } {
  const ua = navigator.userAgent;
  const p = detectPlatform(ua, navigator.maxTouchPoints);
  const iphone = /iPhone|iPad|iPod/.test(ua) || p === 'safari-ios';
  const android = /Android/.test(ua);
  if (iphone) return { tab: 'iphone', desk: 'safari', inRightBrowser: p === 'safari-ios' };
  if (android) return { tab: 'android', desk: 'firefox', inRightBrowser: p === 'firefox-android' };
  const desk: Desk = p === 'edge' ? 'edge' : p === 'firefox' ? 'firefox' : p === 'safari-macos' ? 'safari' : 'chrome';
  return { tab: 'computador', desk, inRightBrowser: true };
}

/** O script, quando instalado, marca o <html> deste site. */
function useInstalled(): string | null {
  const read = () => document.documentElement.getAttribute('data-im-installed');
  const [v, setV] = useState<string | null>(read);
  useEffect(() => {
    const on = () => setV(read());
    document.addEventListener('instagram-minimal:installed', on);
    const mo = new MutationObserver(on);
    mo.observe(document.documentElement, { attributes: true, attributeFilter: ['data-im-installed'] });
    window.addEventListener('focus', on);
    return () => {
      document.removeEventListener('instagram-minimal:installed', on);
      mo.disconnect();
      window.removeEventListener('focus', on);
    };
  }, []);
  return v;
}

type Step = { title: string; hint?: ReactNode; cta?: string; href?: string; copy?: string };

const PHONE: Record<'iphone' | 'android', { label: string; browser: string; steps: Step[] }> = {
  iphone: {
    label: 'iPhone',
    browser: 'Safari',
    steps: [
      {
        title: 'Baixe o app Userscripts',
        hint: 'É grátis. Abra o app uma vez; se ele pedir uma pasta, escolha qualquer uma.',
        cta: 'Baixar na App Store',
        href: FREE.userscriptsIOS,
      },
      {
        title: 'Ligue o Userscripts no Safari',
        hint: (
          <>
            Abra <b>Ajustes</b> → <b>Apps</b> → <b>Safari</b> → <b>Extensões</b> → <b>Userscripts</b>. Ative e escolha{' '}
            <b>Permitir</b> em <b>Todos os sites</b>.
          </>
        ),
      },
      {
        title: 'Instale o Instagram Minimal',
        hint: (
          <>
            Toque no botão. Depois toque em <b>ᴬA</b> na barra do Safari → <b>Userscripts</b> → <b>Instalar</b>.
          </>
        ),
        cta: 'Instalar o Instagram Minimal',
        href: USERSCRIPT,
      },
      { title: 'Abra o Instagram e entre', hint: 'Com sua conta, como sempre. Use pelo Safari.', cta: 'Abrir o Instagram', href: IG },
    ],
  },
  android: {
    label: 'Android',
    browser: 'Firefox',
    steps: [
      {
        title: 'Baixe o Firefox',
        hint: 'É grátis. Depois abra este site dentro do Firefox:',
        cta: 'Baixar no Google Play',
        href: FREE.firefoxAndroid,
        copy: SITE,
      },
      {
        title: 'Adicione o Violentmonkey',
        hint: (
          <>
            Toque em <b>Adicionar ao Firefox</b> e confirme.
          </>
        ),
        cta: 'Abrir o Violentmonkey',
        href: FREE.violentmonkeyFirefox,
      },
      {
        title: 'Instale o Instagram Minimal',
        hint: (
          <>
            Toque no botão e depois em <b>Confirmar instalação</b>.
          </>
        ),
        cta: 'Instalar o Instagram Minimal',
        href: USERSCRIPT,
      },
      { title: 'Abra o Instagram e entre', hint: 'Com sua conta, como sempre. Use pelo Firefox.', cta: 'Abrir o Instagram', href: IG },
    ],
  },
};

const INSTALL_STEP: Step = {
  title: 'Instale o Instagram Minimal',
  hint: (
    <>
      Clique no botão e depois em <b>Instalar</b>.
    </>
  ),
  cta: 'Instalar o Instagram Minimal',
  href: USERSCRIPT,
};
const OPEN_STEP: Step = { title: 'Abra o Instagram e entre', hint: 'Com sua conta, como sempre.', cta: 'Abrir o Instagram', href: IG };

const DESK: Record<Desk, { label: string; steps: Step[] }> = {
  chrome: {
    label: 'Chrome',
    steps: [
      {
        title: 'Adicione o Tampermonkey',
        hint: (
          <>
            Clique em <b>Usar no Chrome</b> → <b>Adicionar extensão</b>. É grátis.
          </>
        ),
        cta: 'Abrir na Chrome Web Store',
        href: FREE.tampermonkeyChrome,
      },
      {
        title: 'Libere os scripts',
        hint: (
          <>
            Cole o endereço abaixo na barra do Chrome e ative <b>Permitir scripts do usuário</b>.
          </>
        ),
        copy: 'chrome://extensions/?id=dhdgffkkebhmkfjojejmpbldmpobfkfo',
      },
      INSTALL_STEP,
      OPEN_STEP,
    ],
  },
  edge: {
    label: 'Edge',
    steps: [
      {
        title: 'Adicione o Tampermonkey',
        hint: (
          <>
            Clique em <b>Obter</b> → <b>Adicionar extensão</b>. É grátis.
          </>
        ),
        cta: 'Abrir no Edge Add-ons',
        href: FREE.tampermonkeyEdge,
      },
      {
        title: 'Libere os scripts',
        hint: (
          <>
            Cole o endereço abaixo na barra do Edge e ligue o <b>Modo de desenvolvedor</b>. Se aparecer, ative também{' '}
            <b>Permitir scripts do usuário</b> nos detalhes do Tampermonkey.
          </>
        ),
        copy: 'edge://extensions',
      },
      INSTALL_STEP,
      OPEN_STEP,
    ],
  },
  firefox: {
    label: 'Firefox',
    steps: [
      {
        title: 'Adicione o Violentmonkey',
        hint: (
          <>
            Clique em <b>Adicionar ao Firefox</b> e confirme. É grátis.
          </>
        ),
        cta: 'Abrir o Violentmonkey',
        href: FREE.violentmonkeyFirefox,
      },
      {
        ...INSTALL_STEP,
        hint: (
          <>
            Clique no botão e depois em <b>Confirmar instalação</b>.
          </>
        ),
      },
      OPEN_STEP,
    ],
  },
  safari: {
    label: 'Safari (Mac)',
    steps: [
      { title: 'Baixe o app Userscripts', hint: 'É grátis. Abra o app uma vez.', cta: 'Baixar na App Store', href: FREE.userscriptsIOS },
      {
        title: 'Ligue o Userscripts no Safari',
        hint: (
          <>
            <b>Safari</b> → <b>Ajustes</b> → <b>Extensões</b> → marque <b>Userscripts</b> e permita em todos os sites.
          </>
        ),
      },
      {
        ...INSTALL_STEP,
        hint: (
          <>
            Clique no botão, depois no ícone do <b>Userscripts</b> na barra → <b>Instalar</b>.
          </>
        ),
      },
      OPEN_STEP,
    ],
  },
};

function CopyButton({ value }: { value: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      type="button"
      className="chip"
      onClick={() =>
        navigator.clipboard
          ?.writeText(value)
          .then(() => setCopied(true))
          .catch(() => window.prompt('Copie o endereço:', value))
      }
    >
      {value.replace('https://', '')} <span>{copied ? '✓ copiado' : 'copiar'}</span>
    </button>
  );
}

function Steps({ steps }: { steps: Step[] }) {
  const [done, setDone] = useState<number[]>([]);
  const toggle = (i: number) => setDone((d) => (d.includes(i) ? d.filter((x) => x !== i) : [...d, i]));
  return (
    <ol className="guide">
      {steps.map((st, i) => {
        const isDone = done.includes(i);
        const last = i === steps.length - 1;
        return (
          <li key={st.title + i} className={isDone ? 'done' : ''}>
            <button
              type="button"
              className="guide-n"
              onClick={() => toggle(i)}
              aria-label={isDone ? `Desmarcar passo ${i + 1}` : `Marcar passo ${i + 1} como feito`}
            >
              {isDone ? Icon.check({ size: 16 }) : i + 1}
            </button>
            <div className="guide-body">
              <h3>{st.title}</h3>
              {st.hint && <p>{st.hint}</p>}
              {st.copy && <CopyButton value={st.copy} />}
              {st.href && (
                <a
                  className={`im-button ${isDone && !last ? 'secondary' : 'primary'}`}
                  href={st.href}
                  onClick={() => !last && setDone((d) => (d.includes(i) ? d : [...d, i]))}
                >
                  {st.cta}
                </a>
              )}
              {!st.href && !isDone && (
                <button type="button" className="im-button secondary" onClick={() => toggle(i)}>
                  Feito
                </button>
              )}
            </div>
          </li>
        );
      })}
    </ol>
  );
}

const TABS: { id: Tab; label: string }[] = [
  { id: 'iphone', label: 'iPhone' },
  { id: 'android', label: 'Android' },
  { id: 'computador', label: 'Computador' },
];

function Site() {
  const det = useMemo(detect, []);
  const [tab, setTab] = useState<Tab>(det.tab);
  const [desk, setDesk] = useState<Desk>(det.desk);
  const installed = useInstalled();

  const steps = tab === 'computador' ? DESK[desk].steps : PHONE[tab].steps;
  const wrongBrowser = tab !== 'computador' && tab === det.tab && !det.inRightBrowser;

  return (
    <div className="site im-root">
      <section className="hero compact">
        <Logo size={60} className="hero-logo" />
        <h1>Seu Instagram. Do seu jeito.</h1>
        <p>Sem Reels. Sem sugeridos. Direct, Stories e quem você segue continuam iguais.</p>
        <p className="fine">Grátis · Sem conta nova · O login é no Instagram de sempre</p>
      </section>

      <main className="guide-wrap">
        {installed ? (
          <div className="installed" role="status">
            <span className="installed-check">{Icon.check({ size: 28 })}</span>
            <h2>Instalado neste navegador.</h2>
            <p>Agora é só abrir o Instagram e entrar com sua conta.</p>
            <a className="im-button primary big" href={IG}>
              Abrir o Instagram
            </a>
          </div>
        ) : (
          <>
            <div className="tabs" role="tablist" aria-label="Aparelho">
              {TABS.map((t) => (
                <button key={t.id} type="button" role="tab" aria-selected={tab === t.id} className="tab" onClick={() => setTab(t.id)}>
                  {t.label}
                </button>
              ))}
            </div>

            {tab === 'computador' && (
              <div className="subtabs" role="tablist" aria-label="Navegador">
                {(Object.keys(DESK) as Desk[]).map((d) => (
                  <button key={d} type="button" role="tab" aria-selected={desk === d} className="subtab" onClick={() => setDesk(d)}>
                    {DESK[d].label}
                  </button>
                ))}
              </div>
            )}

            {wrongBrowser && (
              <div className="warn">
                <b>Abra este site no {PHONE[tab as 'iphone' | 'android'].browser}.</b>{' '}
                {tab === 'iphone'
                  ? 'O Chrome do iPhone e o app do Instagram não aceitam complementos.'
                  : 'O Chrome do Android e o app do Instagram não aceitam complementos.'}
                <div>
                  <CopyButton value={SITE} />
                </div>
              </div>
            )}

            <Steps key={tab + desk} steps={steps} />
            <p className="guide-foot">
              Depois de instalar, volte a esta página: ela mostra <b>✓ Instalado</b> sozinha.
            </p>
          </>
        )}
      </main>

      <section className="band slim">
        <div className="cols2 privacy">
          {[
            ['Sua senha não passa por aqui', 'O login é no instagram.com oficial.'],
            ['Nada sai do aparelho', 'Sem servidor, sem conta, sem rastreamento. Código aberto.'],
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
          <summary>Dúvidas e opções avançadas</summary>
          <div className="faq">
            <h4>Como pauso?</h4>
            <p>Desligue o script “Instagram Minimal” no app (Userscripts, Violentmonkey ou Tampermonkey).</p>
            <h4>Por que não funciona no app do Instagram ou no Chrome do celular?</h4>
            <p>Eles não aceitam nenhum tipo de complemento. Por isso o guia usa o Safari (iPhone) e o Firefox (Android).</p>
            <h4>Quero a extensão completa, com painel e modos (computador)</h4>
            <p>
              <a href={DOWNLOAD('chromium')}>Chrome/Edge</a> · <a href={DOWNLOAD('firefox')}>Firefox</a> ·{' '}
              <a href={`${REPO}/blob/main/docs/installation.md`}>como instalar</a>
            </p>
          </div>
        </details>
        <p className="links">
          <a href={REPO}>Código no GitHub</a> · <a href={`${REPO}/blob/main/docs/privacy.md`}>Privacidade</a>
        </p>
        <p>Projeto independente e de código aberto. Não é afiliado à Meta nem ao Instagram.</p>
      </footer>
    </div>
  );
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <Site />
  </StrictMode>,
);
