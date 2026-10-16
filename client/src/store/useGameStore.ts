import { create } from 'zustand';
import {
  CameraShotId,
  GeneratedWebtoonEpisode,
  TargetId,
  VerificationInspectorTrace,
  WebtoonStyleId,
  WorldState,
} from '../../../shared/types';

export interface WebtoonSnapshot {
  panelIndex: 1 | 2 | 3;
  title: string;
  caption: string;
  speaker: string;
  dialogue: string;
  imageDataUrl: string;
  timestamp: string;
}

const SESSION_STORAGE_KEY = 'fanverse_session_id';
const LANG_STORAGE_KEY = 'fanverse_lang';

function getOrCreateSessionId(): string {
  try {
    const existing = window.localStorage.getItem(SESSION_STORAGE_KEY);
    if (existing && existing.trim().length > 0) return existing;
    const created = `sess_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
    window.localStorage.setItem(SESSION_STORAGE_KEY, created);
    return created;
  } catch {
    return 'default_session';
  }
}

function getInitialLang(): 'en' | 'ko' {
  try {
    const saved = window.localStorage.getItem(LANG_STORAGE_KEY);
    if (saved === 'ko' || saved === 'en') return saved;
  } catch {
    // ignore storage errors
  }
  return 'en';
}

function localizeTurnZero(ws: WorldState | null, lang: 'en' | 'ko'): WorldState | null {
  if (!ws) return null;
  const isKo = lang === 'ko';
  const nextHistory = ws.history.map((evt, idx) => {
    if (idx === 0 && evt.id === 'evt-init-0') {
      return {
        ...evt,
        playerInput: isKo ? '[이야기 시작]' : '[EPISODE START]',
        npcResponse: isKo
          ? '잠깐만요—아까 대기실 모니터 옮기는 걸 도와주신 특별 출입증 당첨 팬분 맞으시죠? 제발 도와주세요, 루미나 컴백 첫 무대까지 5분밖에 안 남았는데 제 전용 별빛 무선 마이크가 감쪽같이 사라졌어요!'
          : "Wait—you're the VIP fan pass winner who helped carry the standby monitors, right? Please, we have five minutes until LUMINA's comeback stage and my custom starlight mic has vanished!",
        narration: isKo
          ? '제1막 — 개막 5분 전을 알리는 홀로그램 초시계가 깜빡이는 가운데, 루미나의 대기실 곳곳에 자홍빛과 청록빛 비상 경고등이 긴박하게 맥동합니다.'
          : 'ACT 1 — Neon magenta and cyan warning lights pulse across LUMINA’s backstage dressing room as the 05:00 holographic countdown clock ticks.',
      };
    }
    return evt;
  });
  return {
    ...ws,
    episodeTitle: isKo
      ? '제1화 — 개막 5분 전'
      : 'Episode 01 — Five Minutes Before Showtime',
    history: nextHistory,
  };
}

interface GameStore {
  sessionId: string;
  lang: 'en' | 'ko';
  worldState: WorldState | null;
  loading: boolean;
  submittingAction: boolean;
  error: string | null;
  selectedTarget: TargetId | null;
  hoveredTarget: TargetId | null;
  activeDrawerTab: 'STORY' | 'INSPECTOR' | 'ASSETS' | 'WEBTOON';
  isDrawerOpen: boolean;
  isWebtoonModalOpen: boolean;
  verificationHistory: VerificationInspectorTrace[];
  webtoonSnapshots: {
    crisisStart?: WebtoonSnapshot;
    keyAction?: WebtoonSnapshot;
    endingMoment?: WebtoonSnapshot;
  };
  canvasCaptureFn: (() => string | null) | null;
  captureAllCameraShotsFn:
    | (() => Promise<Partial<Record<CameraShotId, string>>>)
    | null;
  multiAngle3DFrames: Partial<Record<CameraShotId, string>>;
  selectedWebtoonStyle: WebtoonStyleId;
  generatedEpisode: GeneratedWebtoonEpisode | null;
  generatingWebtoon: boolean;

  setLang: (lang: 'en' | 'ko') => void;
  setCanvasCaptureFn: (fn: (() => string | null) | null) => void;
  setCaptureAllCameraShotsFn: (
    fn: (() => Promise<Partial<Record<CameraShotId, string>>>) | null
  ) => void;
  setSelectedWebtoonStyle: (style: WebtoonStyleId) => void;
  setSelectedTarget: (target: TargetId | null) => void;
  setHoveredTarget: (target: TargetId | null) => void;
  setActiveDrawerTab: (tab: 'STORY' | 'INSPECTOR' | 'ASSETS' | 'WEBTOON') => void;
  setIsDrawerOpen: (open: boolean) => void;
  setIsWebtoonModalOpen: (open: boolean) => void;
  clearError: () => void;

  captureMilestoneSnapshot: (
    slot: 'crisisStart' | 'keyAction' | 'endingMoment',
    meta: {
      title: string;
      caption: string;
      speaker: string;
      dialogue: string;
    }
  ) => void;
  captureAll3DCameraAngles: () => Promise<Partial<Record<CameraShotId, string>>>;
  generateWebtoonEpisode: (
    styleId?: WebtoonStyleId,
    langOverride?: 'en' | 'ko'
  ) => Promise<void>;

  fetchInitialState: () => Promise<void>;
  submitPlayerAction: (playerInput: string, targetHint?: TargetId) => Promise<void>;
  resetEpisode: () => Promise<void>;
}

const DEFAULT_FALLBACK_SVG_DATA_URL = (
  label: string,
  lang: 'en' | 'ko' = 'en',
  accent = '#d97706'
) => {
  const headerText =
    lang === 'ko'
      ? 'FANVERSE 대기실 // 입체 장면 포착'
      : 'FANVERSE BACKSTAGE // 3D SCENE CAPTURE';
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="800" height="450" viewBox="0 0 800 450">
    <defs>
      <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0%" stop-color="#1c1917"/>
        <stop offset="50%" stop-color="#292524"/>
        <stop offset="100%" stop-color="#18181b"/>
      </linearGradient>
    </defs>
    <rect width="800" height="450" fill="url(#bg)"/>
    <rect x="40" y="40" width="720" height="370" rx="18" fill="none" stroke="${accent}" stroke-opacity="0.45" stroke-width="2"/>
    <text x="70" y="110" fill="${accent}" font-family="sans-serif" font-size="22" font-weight="bold">${headerText}</text>
    <text x="70" y="160" fill="#fafaf9" font-family="sans-serif" font-size="32" font-weight="bold">${label}</text>
  </svg>`;
  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
};

export const useGameStore = create<GameStore>((set, get) => ({
  sessionId: getOrCreateSessionId(),
  lang: getInitialLang(),
  worldState: null,
  loading: false,
  submittingAction: false,
  error: null,
  selectedTarget: null,
  hoveredTarget: null,
  activeDrawerTab: 'INSPECTOR',
  isDrawerOpen: false,
  isWebtoonModalOpen: false,
  verificationHistory: [],
  webtoonSnapshots: {},
  canvasCaptureFn: null,
  captureAllCameraShotsFn: null,
  multiAngle3DFrames: {},
  selectedWebtoonStyle: 'NAVER_ROMANCE_IDOL',
  generatedEpisode: null,
  generatingWebtoon: false,

  setLang: (lang) => {
    try {
      window.localStorage.setItem(LANG_STORAGE_KEY, lang);
    } catch {
      // ignore
    }
    set((state) => ({
      lang,
      worldState: localizeTurnZero(state.worldState, lang),
      generatedEpisode: null,
      error: null,
    }));
  },
  setCanvasCaptureFn: (fn) => set({ canvasCaptureFn: fn }),
  setCaptureAllCameraShotsFn: (fn) => set({ captureAllCameraShotsFn: fn }),
  setSelectedWebtoonStyle: (style) => set({ selectedWebtoonStyle: style }),
  setSelectedTarget: (target) => set({ selectedTarget: target }),
  setHoveredTarget: (target) => set({ hoveredTarget: target }),
  setActiveDrawerTab: (tab) => set({ activeDrawerTab: tab, isDrawerOpen: true }),
  setIsDrawerOpen: (open) => set({ isDrawerOpen: open }),
  setIsWebtoonModalOpen: (open) => set({ isWebtoonModalOpen: open }),
  clearError: () => set({ error: null }),

  captureMilestoneSnapshot: (slot, meta) => {
    const captureFn = get().canvasCaptureFn;
    const lang = get().lang;
    let dataUrl = captureFn ? captureFn() : null;
    if (!dataUrl || dataUrl.length < 100) {
      dataUrl = DEFAULT_FALLBACK_SVG_DATA_URL(meta.title, lang);
    }

    const panelIndex =
      slot === 'crisisStart' ? 1 : slot === 'keyAction' ? 2 : 3;

    set((state) => ({
      webtoonSnapshots: {
        ...state.webtoonSnapshots,
        [slot]: {
          panelIndex,
          title: meta.title,
          caption: meta.caption,
          speaker: meta.speaker,
          dialogue: meta.dialogue,
          imageDataUrl: dataUrl!,
          timestamp: new Date().toISOString(),
        },
      },
    }));
  },

  captureAll3DCameraAngles: async () => {
    const fn = get().captureAllCameraShotsFn;
    if (!fn) return get().multiAngle3DFrames;
    try {
      const shots = await fn();
      const merged = { ...get().multiAngle3DFrames, ...shots };
      set({ multiAngle3DFrames: merged });
      return merged;
    } catch {
      return get().multiAngle3DFrames;
    }
  },

  generateWebtoonEpisode: async (
    styleOverride?: WebtoonStyleId,
    langOverride?: 'en' | 'ko'
  ) => {
    const styleId = styleOverride ?? get().selectedWebtoonStyle;
    const lang = langOverride ?? get().lang;
    const sessionId = get().sessionId;
    set({
      selectedWebtoonStyle: styleId,
      generatingWebtoon: true,
    });

    try {
      await get().captureAll3DCameraAngles();

      const res = await fetch('/api/webtoon/generate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-session-id': sessionId,
          'x-lang': lang,
        },
        body: JSON.stringify({ styleId, lang }),
      });
      const data = await res.json();
      if (res.ok && data.ok && data.episode) {
        set({
          generatedEpisode: data.episode,
          generatingWebtoon: false,
        });
      } else {
        set({ generatingWebtoon: false });
      }
    } catch {
      set({ generatingWebtoon: false });
    }
  },

  fetchInitialState: async () => {
    set({ loading: true, error: null });
    const sessionId = get().sessionId;
    const lang = get().lang;
    try {
      const res = await fetch('/api/state', {
        headers: { 'x-session-id': sessionId, 'x-lang': lang },
      });
      const data = await res.json();
      if (!res.ok || !data.ok) {
        throw new Error(
          data.message ||
            (lang === 'ko'
              ? '세계관 상태를 불러오지 못했습니다.'
              : 'Failed to load world state')
        );
      }
      const ws = localizeTurnZero(data.worldState, lang);
      set({
        worldState: ws,
        loading: false,
      });

      setTimeout(() => {
        if (!get().webtoonSnapshots.crisisStart) {
          const isKo = get().lang === 'ko';
          get().captureMilestoneSnapshot('crisisStart', {
            title: isKo ? '05:00 — 대기실 위기 발생' : '05:00 — Backstage Crisis',
            caption: isKo
              ? '루미나의 컴백 무대 5분 전, 리드 보컬 하나의 전용 무선 마이크가 보안 보관함 안에 잠겨 있습니다.'
              : 'Five minutes before LUMINA’s comeback stage, lead vocalist Hana’s custom wireless mic is locked inside the security cabinet.',
            speaker: 'HANA',
            dialogue: isKo
              ? '제발 도와주세요, 루미나 컴백 무대까지 5분밖에 안 남았는데 제 전용 무선 마이크가 잠겨 있어요!'
              : "Please, we have five minutes until LUMINA's comeback stage and my custom wireless mic is locked away!",
          });
        }
      }, 900);
    } catch (err) {
      set({
        loading: false,
        error:
          err instanceof Error
            ? err.message
            : lang === 'ko'
              ? 'FANVERSE 서버에 연결할 수 없습니다.'
              : 'Could not connect to FANVERSE server.',
      });
    }
  },

  submitPlayerAction: async (playerInput: string, targetHint?: TargetId) => {
    const trimmed = playerInput.trim();
    if (!trimmed || get().submittingAction) return;
    const sessionId = get().sessionId;
    const lang = get().lang;

    set({ submittingAction: true, error: null });

    try {
      const res = await fetch('/api/action', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-session-id': sessionId,
          'x-lang': lang,
        },
        body: JSON.stringify({
          playerInput: trimmed,
          targetHint: targetHint ?? get().selectedTarget ?? undefined,
          lang,
        }),
      });

      const data = await res.json();

      if (!res.ok || !data.ok) {
        set({
          submittingAction: false,
          error:
            data.message ||
            (lang === 'ko'
              ? '인공지능 응답 요청에 실패했습니다. 세계관 상태는 안전하게 보존되었으니 다시 시도해 주세요.'
              : 'Gemini 4 Argon request failed. Your world state was safely preserved—please try again.'),
          worldState: localizeTurnZero(data.worldState ?? get().worldState, lang),
        });
        return;
      }

      const nextWorldState = localizeTurnZero(data.worldState, lang)!;
      const trace: VerificationInspectorTrace | undefined = data.trace;

      set((state) => ({
        worldState: nextWorldState,
        submittingAction: false,
        verificationHistory: trace
          ? [trace, ...state.verificationHistory]
          : state.verificationHistory,
      }));

      setTimeout(() => {
        const latestEvent =
          nextWorldState.history[nextWorldState.history.length - 1];
        if (!latestEvent) return;
        const isKo = get().lang === 'ko';

        if (latestEvent.milestoneTag === 'KEY_ACTION') {
          get().captureMilestoneSnapshot('keyAction', {
            title: isKo
              ? `${nextWorldState.narrativeTimer} — 결정적인 대기실 행동`
              : `${nextWorldState.narrativeTimer} — Decisive Backstage Move`,
            caption: latestEvent.narration,
            speaker: latestEvent.speaker,
            dialogue: latestEvent.npcResponse,
          });
        } else if (latestEvent.milestoneTag === 'ENDING_MOMENT') {
          if (!get().webtoonSnapshots.keyAction) {
            get().captureMilestoneSnapshot('keyAction', {
              title: isKo
                ? '01:00 — 대기실 위기 돌파'
                : '01:00 — Backstage Breakthrough',
              caption: isKo
                ? '루미나 스태프들과 힘을 합쳐 무대 시작 직전 대기실의 위기를 해결했습니다.'
                : 'Working together with LUMINA’s crew, you resolved the backstage crisis just before cue.',
              speaker: latestEvent.speaker,
              dialogue: trimmed,
            });
          }
          get().captureMilestoneSnapshot('endingMoment', {
            title:
              nextWorldState.endingReached === 'SHOWTIME_SAVED'
                ? isKo
                  ? '결말 가 — 기적의 컴백 무대!'
                  : 'ENDING A — Showtime Saved!'
                : isKo
                  ? '결말 나 — 어쿠스틱 앙코르!'
                  : 'ENDING B — Unplugged Encore!',
            caption: latestEvent.narration,
            speaker: latestEvent.speaker,
            dialogue: latestEvent.npcResponse,
          });
        }
      }, 350);
    } catch (err) {
      set({
        submittingAction: false,
        error:
          err instanceof Error
            ? err.message
            : lang === 'ko'
              ? '서버와 통신하는 중 네트워크 오류가 발생했습니다.'
              : 'Network error while communicating with Gemini 4 Argon.',
      });
    }
  },

  resetEpisode: async () => {
    set({ loading: true, error: null });
    const sessionId = get().sessionId;
    const lang = get().lang;
    try {
      const res = await fetch('/api/reset', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-session-id': sessionId,
          'x-lang': lang,
        },
        body: JSON.stringify({ lang }),
      });
      const data = await res.json();
      if (!res.ok || !data.ok) {
        throw new Error(
          data.message ||
            (lang === 'ko'
              ? '이야기 초기화에 실패했습니다.'
              : 'Failed to reset episode')
        );
      }
      set({
        worldState: localizeTurnZero(data.worldState, lang),
        loading: false,
        selectedTarget: null,
        verificationHistory: [],
        webtoonSnapshots: {},
        multiAngle3DFrames: {},
        generatedEpisode: null,
      });

      setTimeout(() => {
        const isKo = get().lang === 'ko';
        get().captureMilestoneSnapshot('crisisStart', {
          title: isKo ? '05:00 — 대기실 위기 발생' : '05:00 — Backstage Crisis',
          caption: isKo
            ? '루미나의 컴백 무대 5분 전, 리드 보컬 하나의 전용 무선 마이크가 잠겨 있습니다.'
            : 'Five minutes before LUMINA’s comeback stage, lead vocalist Hana’s custom wireless mic is locked away.',
          speaker: 'HANA',
          dialogue: isKo
            ? '제발 도와주세요, 루미나 컴백 무대까지 5분밖에 안 남았는데 제 전용 무선 마이크가 사라졌어요!'
            : "Please, we have five minutes until LUMINA's comeback stage and my custom wireless mic is gone!",
        });
      }, 600);
    } catch (err) {
      set({
        loading: false,
        error:
          err instanceof Error
            ? err.message
            : lang === 'ko'
              ? '세계관 상태 초기화에 실패했습니다.'
              : 'Failed to reset world state.',
      });
    }
  },
}));

