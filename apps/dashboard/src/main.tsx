/**
 * Página pública do projeto (GitHub Pages). Não recebe, não lê e não envia
 * nenhum dado da conta do Instagram. A prévia do painel usa só o
 * localStorage deste site e não controla a extensão instalada.
 */
import { StrictMode, useMemo, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { FILTER_KEYS, FILTER_LABELS, SettingsRepository, detectPlatform, localStorageArea, type Platform } from '@im/core';
import { Icon, Logo, MinimalApp } from '@im/ui';
import '../../../packages/shared-ui/src/ui.css';
import './site.css';

const REPO = 'https://github.com/bragahauser-byte/instagram-minimal';
const RELEASES = `${REPO}/releases/latest`;
const doc = (name: string) => `${REPO}/blob/main/docs/${name}`;

type Install = { id: Platform | 'edge-chrome'; name: string; how: string[]; link?: [string, string] };

const INSTALLS: Install[] = [
  {
    id: 'chrome',
    name: 'Chrome e Edge',
    how: [
      'Baixe instagram-minimal-chromium.zip na página de versões e descompacte.',
      'Abra chrome://extensions (ou edge://extensions) e ligue o Modo do desenvolvedor.',
      'Clique em "Carregar sem compactação" e escolha a pasta descompactada.',
    ],
    link: ['Baixar para Chrome e Edge', RELEASES],
  },
  {
    id: 'firefox',
    name: 'Firefox',
    how: [
      'Baixe instagram-minimal-firefox.zip na página de versões.',
      'Abra about:debugging → Este Firefox → Carregar extensão temporária e escolha o manifest.json.',
      'Para instalar de forma permanente, a extensão precisa ser assinada pela Mozilla (veja a documentação).',
    ],
    link: ['Baixar para Firefox', RELEASES],
  },
  {
    id: 'firefox-android',
    name: 'Firefox para Android',
    how: [
      'Usa o mesmo pacote do Firefox.',
      'Depois de publicado no addons.mozilla.org, instale pelo menu Extensões do Firefox no Android.',
      'Para testar antes disso: web-ext run -t firefox-android (precisa de cabo USB e adb).',
    ],
  },
  {
    id: 'safari-macos',
    name: 'Safari no Mac e no iPhone',
    how: [
      'Abra apps/ios no Xcode (projeto gerado com XcodeGen) e rode o app no Mac ou no iPhone.',
      'Ative em Ajustes → Apps → Safari → Extensões → Instagram Minimal (iPhone) ou Safari → Configurações → Extensões (Mac).',
      'Permita o acesso a instagram.com quando o Safari pedir.',
    ],
    link: ['Guia de instalação', doc('installation.md')],
  },
];

const PRIVACY = [
  ['Nenhuma senha', 'Você entra no Instagram oficial, como sempre. O Instagram Minimal nunca pede nem vê sua senha.'],
  ['Nada sai do aparelho', 'Os filtros rodam no navegador. Não há servidor, conta, analytics ou telemetria.'],
  ['Só o instagram.com', 'A extensão só tem acesso ao site do Instagram. Mais nenhum.'],
  ['Código aberto', 'Cada linha pode ser lida e auditada no GitHub.'],
];

function Site() {
  const platform = useMemo(() => detectPlatform(navigator.userAgent, navigator.maxTouchPoints), []);
  const repo = useMemo(() => new SettingsRepository(localStorageArea(window.localStorage, 'im-demo:')), []);
  const [key, setKey] = useState(0);

  return (
    <div className="site im-root">
      <header className="top">
        <a className="brand" href="#">
          <Logo size={28} />
          <span>Instagram Minimal</span>
        </a>
        <nav>
          <a href="#instalar">Instalar</a>
          <a href="#privacidade">Privacidade</a>
          <a href="#docs">Documentação</a>
          <a href={REPO}>GitHub</a>
        </nav>
      </header>

      <section className="hero">
        <Logo size={72} className="hero-logo" />
        <h1>Seu Instagram. Do seu jeito.</h1>
        <p>Menos distrações. Mais intenção.</p>
        <div className="hero-cta">
          <a className="im-button primary" href="#instalar">
            Configurar agora
          </a>
          <a className="im-button plain" href="#previa">
            Ver o painel
          </a>
        </div>
        <p className="fine">Gratuito, de código aberto e sem login próprio.</p>
      </section>

      <section className="band">
        <div className="cols3">
          <div>
            <h3>Sem Reels</h3>
            <p>Aba, páginas, links e reprodução de Reels bloqueados — inclusive os que chegam pelo Direct.</p>
          </div>
          <div>
            <h3>Sem sugeridos</h3>
            <p>Só posts de quem você segue no feed. Sugestões de pessoas para seguir continuam.</p>
          </div>
          <div>
            <h3>Tudo o resto igual</h3>
            <p>Direct, Stories, curtidas, comentários, perfis, notificações e publicar continuam normais.</p>
          </div>
        </div>
      </section>

      <section className="section" id="previa">
        <h2>Configure em segundos.</h2>
        <p className="lead">
          Três modos: Manual, Automático e Foco permanente. Cada bloqueio liga e desliga separadamente.
        </p>
        <div className="device">
          <MinimalApp key={key} repo={repo} env={{ platform, layout: 'popup', docsUrl: '#docs', demo: true }} />
        </div>
        <p className="fine center">
          Prévia interativa. As escolhas ficam só neste navegador e não controlam a extensão.{' '}
          <button
            className="linkish"
            type="button"
            onClick={() => {
              localStorage.removeItem('im-demo:im:state');
              setKey((k) => k + 1);
            }}
          >
            Recomeçar a prévia
          </button>
        </p>
      </section>

      <section className="band" id="bloqueios">
        <h2>O que pode ser bloqueado</h2>
        <ul className="grid-list">
          {FILTER_KEYS.map((k) => (
            <li key={k}>
              <strong>{FILTER_LABELS[k].title}</strong>
              <span>{FILTER_LABELS[k].description}</span>
            </li>
          ))}
        </ul>
      </section>

      <section className="section" id="instalar">
        <h2>Instalar</h2>
        <p className="lead">Instale, abra o instagram.com e entre normalmente. O bloqueio começa sozinho.</p>
        <div className="installs">
          {INSTALLS.map((i) => (
            <article key={i.id} className={`install ${platform.startsWith(i.id.split('-')[0]!) ? 'current' : ''}`}>
              <h3>{i.name}</h3>
              <ol>
                {i.how.map((s) => (
                  <li key={s}>{s}</li>
                ))}
              </ol>
              {i.link && (
                <a className="im-button secondary" href={i.link[1]}>
                  {i.link[0]}
                </a>
              )}
            </article>
          ))}
        </div>
      </section>

      <section className="band" id="privacidade">
        <h2>Privacidade em primeiro lugar</h2>
        <div className="cols2">
          {PRIVACY.map(([t, d]) => (
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

      <section className="section" id="docs">
        <h2>Documentação</h2>
        <div className="docs">
          {[
            ['Instalação', 'installation.md'],
            ['Privacidade e permissões', 'privacy.md'],
            ['Arquitetura', 'architecture.md'],
            ['Seletores e como atualizar', 'selectors.md'],
            ['Desenvolvimento e testes', 'development.md'],
            ['Publicação', 'publishing.md'],
            ['Problemas comuns', 'troubleshooting.md'],
            ['Limitações conhecidas', 'limitations.md'],
          ].map(([t, f]) => (
            <a key={f} href={doc(f!)} className="doc">
              {t}
              {Icon.chevronRight()}
            </a>
          ))}
        </div>
      </section>

      <footer className="foot">
        <p>
          Instagram Minimal é um projeto independente e de código aberto (MIT). Não é afiliado, patrocinado ou aprovado
          pela Meta ou pelo Instagram. "Instagram" é marca da Meta Platforms, Inc.
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
