import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  FILTER_KEYS,
  FILTER_LABELS,
  FOCUS_MAX_PAUSE_MIN,
  FOCUS_PHRASE,
  MODE_LABELS,
  MODES,
  PAUSE_OPTIONS_MIN,
  PLATFORM_LABELS,
  cooldownRemaining,
  focusLock,
  isActive,
  nextTransitionIn,
  requiresUnlock,
  type Action,
  type Mode,
  type Platform,
  type Result,
  type SettingsRepository,
  type State,
} from '@im/core';
import { Button, Group, Icon, Logo, NavBar, Row, Sheet, Switch } from './components';

export interface ExtensionStatus {
  /** A extensão tem permissão para rodar no instagram.com. */
  hasAccess: boolean;
  /** Texto curto exibido no painel. */
  label: string;
  tone?: 'ok';
}

export interface AppEnv {
  platform: Platform;
  layout: 'popup' | 'page';
  docsUrl: string;
  /** Modo demonstração (painel do GitHub Pages): não controla nenhuma extensão. */
  demo?: boolean;
  getStatus?: () => Promise<ExtensionStatus>;
  requestAccess?: () => Promise<boolean>;
  /** Tela inicial forçada (ex.: "welcome" na página aberta após instalar). */
  initialRoute?: Route;
  /** Abre o instagram.com (na extensão, numa aba nova). */
  openInstagram?: () => void;
}

type Route = 'welcome' | 'mode' | 'ready' | 'home' | 'settings' | 'privacy' | 'unlock' | 'change-mode';

const fmtClock = (ms: number) => {
  const s = Math.ceil(ms / 1000);
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
};
const fmtTime = (epoch: number) =>
  new Date(epoch).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });

/** Estado + relógio + dispatch, sincronizados com o armazenamento. */
export function useSettings(repo: SettingsRepository) {
  const [state, setState] = useState<State | null>(null);
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    let alive = true;
    repo.load().then((s) => alive && setState(s));
    const off = repo.subscribe((s) => alive && setState(s));
    return () => {
      alive = false;
      off();
    };
  }, [repo]);

  // Relógio só corre quando há pausa, contagem ou desbloqueio em andamento.
  useEffect(() => {
    if (!state || nextTransitionIn(state, Date.now()) === null) return;
    const id = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(id);
  }, [state]);

  const dispatch = useCallback(
    async (a: Action): Promise<Result> => {
      const r = await repo.dispatch(a);
      setState(r.state);
      setNow(Date.now());
      return r;
    },
    [repo],
  );

  return { state, now, dispatch };
}

export function MinimalApp({ repo, env }: { repo: SettingsRepository; env: AppEnv }) {
  const { state, now, dispatch } = useSettings(repo);
  const [route, setRoute] = useState<Route | null>(env.initialRoute ?? null);
  const [pending, setPending] = useState<Action | null>(null);
  const [draftMode, setDraftMode] = useState<Mode>('automatic');

  useEffect(() => {
    if (state && route === null) setRoute(state.onboarded ? 'home' : 'welcome');
  }, [state, route]);

  /** Executa uma ação; no modo Foco, se for bloqueada, abre o desbloqueio. */
  const act = useCallback(
    async (a: Action) => {
      if (!state) return;
      if (requiresUnlock(state, a, Date.now())) {
        setPending(a);
        setRoute('unlock');
        return;
      }
      await dispatch(a);
    },
    [state, dispatch],
  );

  if (!state || route === null) return <div className="im-root im-app" data-layout={env.layout} />;

  let screen;
  switch (route) {
    case 'welcome':
      screen = <Welcome onStart={() => setRoute('mode')} />;
      break;
    case 'mode':
      screen = (
        <ModeSelect
          title="Como você quer usar?"
          value={draftMode}
          onChange={setDraftMode}
          onBack={() => setRoute('welcome')}
          cta="Continuar"
          onConfirm={async () => {
            await dispatch({ type: 'completeOnboarding', mode: draftMode });
            setRoute('ready');
          }}
        />
      );
      break;
    case 'ready':
      screen = <Ready env={env} onPanel={() => setRoute('home')} />;
      break;
    case 'change-mode':
      screen = (
        <ModeSelect
          title="Modo"
          value={draftMode}
          onChange={setDraftMode}
          onBack={() => setRoute('home')}
          cta="Salvar"
          onConfirm={async () => {
            const a: Action = { type: 'setMode', mode: draftMode };
            if (requiresUnlock(state, a, Date.now())) {
              setPending(a);
              setRoute('unlock');
              return;
            }
            await dispatch(a);
            setRoute('home');
          }}
        />
      );
      break;
    case 'settings':
      screen = <SettingsScreen state={state} onBack={() => setRoute('home')} act={act} />;
      break;
    case 'privacy':
      screen = <PrivacyScreen onBack={() => setRoute('home')} />;
      break;
    case 'unlock':
      screen = (
        <UnlockScreen
          state={state}
          now={now}
          dispatch={dispatch}
          onDone={async (unlocked) => {
            if (unlocked && pending) await dispatch(pending);
            const back: Route = pending?.type === 'setFilter' ? 'settings' : 'home';
            setPending(null);
            setRoute(back);
          }}
        />
      );
      break;
    default:
      screen = (
        <Home
          state={state}
          now={now}
          env={env}
          act={act}
          go={(r) => {
            if (r === 'change-mode') setDraftMode(state.mode);
            setRoute(r);
          }}
        />
      );
  }

  return (
    <div className="im-root im-app" data-layout={env.layout}>
      {screen}
    </div>
  );
}

/* ------------------------------------------------------------------ telas */

function Welcome({ onStart }: { onStart: () => void }) {
  return (
    <main className="im-screen im-welcome">
      <Logo className="im-logo" />
      <h1>Seu Instagram. Do seu jeito.</h1>
      <p>Menos distrações. Mais intenção.</p>
      <Button block onClick={onStart}>
        Configurar agora
      </Button>
    </main>
  );
}

function openInstagram(env: AppEnv) {
  if (env.openInstagram) env.openInstagram();
  else window.open('https://www.instagram.com/', '_blank', 'noopener');
}

function Ready({ env, onPanel }: { env: AppEnv; onPanel: () => void }) {
  return (
    <main className="im-screen im-welcome">
      <span className="im-ready-check">{Icon.check({ size: 34 })}</span>
      <h1>Tudo pronto.</h1>
      <p>Abra o Instagram e entre com sua conta, como sempre. O bloqueio já está ligado.</p>
      <Button block onClick={() => openInstagram(env)}>
        Abrir o Instagram
      </Button>
      <Button variant="plain" block onClick={onPanel}>
        Ver o painel
      </Button>
    </main>
  );
}

function ModeSelect(props: {
  title: string;
  value: Mode;
  onChange: (m: Mode) => void;
  onBack: () => void;
  onConfirm: () => void;
  cta: string;
}) {
  return (
    <main className="im-screen">
      <NavBar onBack={props.onBack} />
      <h1 className="im-large-title">{props.title}</h1>
      <div className="im-modes" role="radiogroup" aria-label="Modo de funcionamento">
        {MODES.map((m) => (
          <button
            key={m}
            type="button"
            role="radio"
            aria-checked={props.value === m}
            className="im-mode"
            onClick={() => props.onChange(m)}
          >
            <span className="im-radio">{props.value === m && Icon.check({ size: 14 })}</span>
            <span>
              <span className="im-mode-title">
                {MODE_LABELS[m].title}
                {m === 'automatic' && <span className="im-badge im-badge-accent">Recomendado</span>}
              </span>
              <span className="im-mode-desc">{MODE_LABELS[m].description}</span>
            </span>
          </button>
        ))}
      </div>
      <Button block onClick={props.onConfirm}>
        {props.cta}
      </Button>
    </main>
  );
}

function Home({
  state,
  now,
  env,
  act,
  go,
}: {
  state: State;
  now: number;
  env: AppEnv;
  act: (a: Action) => Promise<void>;
  go: (r: Route) => void;
}) {
  const active = isActive(state, now);
  const [sheet, setSheet] = useState(false);
  const [status, setStatus] = useState<ExtensionStatus | null>(null);
  const enabledCount = FILTER_KEYS.filter((k) => state.filters[k]).length;
  const lock = focusLock(state, now);

  const refreshStatus = useCallback(() => {
    env.getStatus?.().then(setStatus).catch(() => setStatus(null));
  }, [env]);
  useEffect(refreshStatus, [refreshStatus]);

  const title = active ? 'Bloqueador ativo' : state.mode === 'manual' ? 'Bloqueador desligado' : 'Bloqueador pausado';
  const sub = !active && state.pauseUntil
    ? `Volta sozinho às ${fmtTime(state.pauseUntil)}`
    : MODE_LABELS[state.mode].title + (state.mode === 'focus' && lock === 'unlocked' && state.unlockedUntil
        ? ` · desbloqueado por ${fmtClock(state.unlockedUntil - now)}`
        : '');

  return (
    <main className="im-screen">
      <h1 className="im-large-title" style={{ marginTop: 16 }}>
        Instagram Minimal
      </h1>

      <section className="im-hero" aria-live="polite">
        <div className="im-hero-top">
          <span className="im-dot" data-on={active}>
            {active ? Icon.shield({ size: 22 }) : Icon.pause({ size: 22 })}
          </span>
          <div style={{ flex: 1 }}>
            <p className="im-hero-title">{title}</p>
            <p className="im-hero-sub">{sub}</p>
          </div>
          {state.mode === 'manual' && (
            <Switch
              checked={state.enabled}
              label="Bloqueador"
              onChange={(v) => act({ type: 'setEnabled', enabled: v })}
            />
          )}
        </div>
        {state.mode !== 'manual' && (
          <div className="im-hero-actions">
            {active ? (
              <Button
                variant="secondary"
                onClick={() =>
                  state.mode === 'focus' ? act({ type: 'pause', minutes: FOCUS_MAX_PAUSE_MIN }) : setSheet(true)
                }
              >
                {state.mode === 'focus' ? `Pausar ${FOCUS_MAX_PAUSE_MIN} min` : 'Pausar'}
              </Button>
            ) : (
              <Button onClick={() => act({ type: 'resume' })}>Retomar agora</Button>
            )}
            {state.mode === 'focus' && lock === 'unlocked' && (
              <Button variant="secondary" onClick={() => act({ type: 'lock' })}>
                Trancar
              </Button>
            )}
          </div>
        )}
      </section>

      <Group>
        <Row tone="link" title="Abrir o Instagram" chevron={false} onClick={() => openInstagram(env)} />
      </Group>

      <Group>
        <Row
          icon={Icon.sliders({ size: 17 })}
          title="Configurações de bloqueio"
          value={`${enabledCount} de ${FILTER_KEYS.length}`}
          onClick={() => go('settings')}
        />
        <Row icon={Icon.mode({ size: 17 })} title="Modo" value={MODE_LABELS[state.mode].title} onClick={() => go('change-mode')} />
      </Group>

      <Group header="Extensão" footer={env.demo ? 'Demonstração: estas opções ficam só neste navegador e não controlam a extensão.' : undefined}>
        <Row icon={Icon.device({ size: 17 })} title="Plataforma" value={PLATFORM_LABELS[env.platform]} />
        <Row
          icon={Icon.check({ size: 17 })}
          title="Status"
          value={status?.label ?? (env.demo ? 'Demonstração' : 'Verificando…')}
          valueTone={status?.tone}
        />
        {status && !status.hasAccess && env.requestAccess && (
          <Row
            tone="link"
            title="Permitir acesso ao instagram.com"
            onClick={async () => {
              await env.requestAccess?.();
              refreshStatus();
            }}
          />
        )}
      </Group>

      <Group>
        <Row icon={Icon.lock({ size: 17 })} title="Privacidade" onClick={() => go('privacy')} />
        <Row icon={Icon.book({ size: 17 })} title="Documentação" href={env.docsUrl} />
      </Group>

      {sheet && (
        <Sheet title="Pausar por quanto tempo?" onClose={() => setSheet(false)}>
          <Group footer="Depois disso o bloqueador volta sozinho.">
            {PAUSE_OPTIONS_MIN.map((m) => (
              <Row
                key={m}
                title={m < 60 ? `${m} minutos` : '1 hora'}
                chevron={false}
                onClick={async () => {
                  setSheet(false);
                  await act({ type: 'pause', minutes: m });
                }}
              />
            ))}
          </Group>
          <Button variant="plain" block onClick={() => setSheet(false)}>
            Cancelar
          </Button>
        </Sheet>
      )}
    </main>
  );
}

function SettingsScreen({ state, onBack, act }: { state: State; onBack: () => void; act: (a: Action) => Promise<void> }) {
  return (
    <main className="im-screen">
      <NavBar title="Bloqueios" onBack={onBack} />
      <Group
        footer={
          state.mode === 'focus'
            ? 'No modo Foco, desligar um bloqueio pede uma espera e uma confirmação.'
            : 'Sugestões de pessoas para seguir continuam aparecendo. Só o conteúdo recomendado sai.'
        }
      >
        {FILTER_KEYS.map((k) => (
          <Row
            key={k}
            title={FILTER_LABELS[k].title}
            subtitle={FILTER_LABELS[k].description}
            accessory={
              <Switch
                checked={state.filters[k]}
                label={FILTER_LABELS[k].title}
                onChange={(v) => act({ type: 'setFilter', key: k, value: v })}
              />
            }
          />
        ))}
      </Group>
      <Group>
        <Row tone="link" title="Restaurar padrões" chevron={false} onClick={() => act({ type: 'restoreDefaults' })} />
      </Group>
    </main>
  );
}

const PRIVACY_FACTS = [
  'Nenhuma senha armazenada',
  'Nenhuma conta intermediada pelo Instagram Minimal',
  'Configurações armazenadas localmente',
  'Nenhum rastreamento publicitário',
  'Nenhuma telemetria ou analytics',
  'Nenhum servidor próprio: os filtros rodam no seu aparelho',
];

const PERMISSIONS: [string, string][] = [
  ['Acesso a instagram.com', 'Aplicar os filtros somente nesse site.'],
  ['storage', 'Guardar suas escolhas neste aparelho.'],
  ['declarativeNetRequest', 'Impedir que links diretos de Reels abram.'],
  ['alarms', 'Retomar o bloqueio quando uma pausa termina.'],
];

function PrivacyScreen({ onBack }: { onBack: () => void }) {
  return (
    <main className="im-screen">
      <NavBar title="Privacidade" onBack={onBack} />
      <Group footer="Você faz login no Instagram oficial, como sempre. A extensão não vê nem guarda sua senha, cookies ou mensagens.">
        {PRIVACY_FACTS.map((t) => (
          <Row key={t} title={t} accessory={<span className="im-check">{Icon.check({ size: 18 })}</span>} />
        ))}
      </Group>
      <Group header="Permissões usadas">
        {PERMISSIONS.map(([t, d]) => (
          <Row key={t} title={t} subtitle={d} />
        ))}
      </Group>
    </main>
  );
}

function UnlockScreen({
  state,
  now,
  dispatch,
  onDone,
}: {
  state: State;
  now: number;
  dispatch: (a: Action) => Promise<Result>;
  onDone: (unlocked: boolean) => void;
}) {
  const lock = focusLock(state, now);
  const [phrase, setPhrase] = useState('');
  const [error, setError] = useState<string | null>(null);
  const remaining = useMemo(() => cooldownRemaining(state, now), [state, now]);

  useEffect(() => {
    if (lock === 'unlocked') onDone(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lock]);

  return (
    <main className="im-screen">
      <NavBar
        title="Modo Foco"
        backLabel="Cancelar"
        onBack={async () => {
          if (state.unlockRequestedAt !== null) await dispatch({ type: 'cancelUnlock' });
          onDone(false);
        }}
      />
      <div className="im-center">
        {lock === 'locked' && (
          <>
            <h2>Tem certeza?</h2>
            <p>Para desativar ou afrouxar o bloqueio, espere 1 minuto e confirme. É uma pausa para decidir com calma.</p>
            <Button block onClick={() => dispatch({ type: 'requestUnlock' })}>
              Começar a espera
            </Button>
          </>
        )}
        {lock === 'cooling' && (
          <>
            <h2>Respire um pouco</h2>
            <p>Você poderá confirmar quando o tempo acabar.</p>
            <div className="im-countdown" aria-live="polite">
              {fmtClock(remaining)}
            </div>
          </>
        )}
        {lock === 'ready' && (
          <form
            onSubmit={async (e) => {
              e.preventDefault();
              const r = await dispatch({ type: 'confirmUnlock', phrase });
              if (!r.ok) setError(r.reason === 'phrase' ? 'A frase não confere.' : 'Não foi possível confirmar.');
            }}
          >
            <h2>Confirme</h2>
            <p>
              Digite <span className="im-phrase">{FOCUS_PHRASE}</span>
            </p>
            <label className="im-visually-hidden" htmlFor="im-phrase">
              Frase de confirmação
            </label>
            <input
              id="im-phrase"
              className="im-input"
              autoComplete="off"
              autoCapitalize="none"
              spellCheck={false}
              value={phrase}
              onChange={(e) => {
                setPhrase(e.target.value);
                setError(null);
              }}
            />
            {error && <p className="im-error">{error}</p>}
            <Button block type="submit" disabled={!phrase.trim()}>
              Desbloquear por 5 minutos
            </Button>
          </form>
        )}
      </div>
    </main>
  );
}
