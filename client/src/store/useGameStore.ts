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

interface GameStore {
  sessionId: string;
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
  generateWebtoonEpisode: (styleId?: WebtoonStyleId) => Promise<void>;

  fetchInitialState: () => Promise<void>;
  submitPlayerAction: (playerInput: string, targetHint?: TargetId) => Promise<void>;
  resetEpisode: () => Promise<void>;
}

const DEFAULT_FALLBACK_SVG_DATA_URL = (label: string, accent = '#d97706') => {
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
    <text x="70" y="110" fill="${accent}" font-family="sans-serif" font-size="22" font-weight="bold">FANVERSE BACKSTAGE // 3D SCENE CAPTURE</text>
    <text x="70" y="160" fill="#fafaf9" font-family="sans-serif" font-size="32" font-weight="bold">${label}</text>
  </svg>`;
  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
};

export const useGameStore = create<GameStore>((set, get) => ({
  sessionId: getOrCreateSessionId(),
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
    let dataUrl = captureFn ? captureFn() : null;
    if (!dataUrl || dataUrl.length < 100) {
      dataUrl = DEFAULT_FALLBACK_SVG_DATA_URL(meta.title);
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

  generateWebtoonEpisode: async (styleOverride?: WebtoonStyleId) => {
    const styleId = styleOverride ?? get().selectedWebtoonStyle;
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
        },
        body: JSON.stringify({ styleId }),
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
    try {
      const res = await fetch('/api/state', {
        headers: { 'x-session-id': sessionId },
      });
      const data = await res.json();
      if (!res.ok || !data.ok) {
        throw new Error(data.message || 'Failed to load world state');
      }
      const ws: WorldState = data.worldState;
      set({
        worldState: ws,
        loading: false,
      });

      setTimeout(() => {
        if (!get().webtoonSnapshots.crisisStart) {
          get().captureMilestoneSnapshot('crisisStart', {
            title: '05:00 — Backstage Crisis',
            caption:
              'Five minutes before LUMINA’s comeback stage, lead vocalist Hana’s custom wireless mic is locked inside the security cabinet.',
            speaker: 'HANA',
            dialogue:
              "Please, we have five minutes until LUMINA's comeback stage and my custom wireless mic is locked away!",
          });
        }
      }, 900);
    } catch (err) {
      set({
        loading: false,
        error:
          err instanceof Error
            ? err.message
            : 'Could not connect to FANVERSE server.',
      });
    }
  },

  submitPlayerAction: async (playerInput: string, targetHint?: TargetId) => {
    const trimmed = playerInput.trim();
    if (!trimmed || get().submittingAction) return;
    const sessionId = get().sessionId;

    set({ submittingAction: true, error: null });

    try {
      const res = await fetch('/api/action', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-session-id': sessionId,
        },
        body: JSON.stringify({
          playerInput: trimmed,
          targetHint: targetHint ?? get().selectedTarget ?? undefined,
        }),
      });

      const data = await res.json();

      if (!res.ok || !data.ok) {
        set({
          submittingAction: false,
          error:
            data.message ||
            'Gemini 4 Argon request failed. Your world state was safely preserved—please try again.',
          worldState: data.worldState ?? get().worldState,
        });
        return;
      }

      const nextWorldState: WorldState = data.worldState;
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

        if (latestEvent.milestoneTag === 'KEY_ACTION') {
          get().captureMilestoneSnapshot('keyAction', {
            title: `${nextWorldState.narrativeTimer} — Decisive Backstage Move`,
            caption: latestEvent.narration,
            speaker: latestEvent.speaker,
            dialogue: latestEvent.npcResponse,
          });
        } else if (latestEvent.milestoneTag === 'ENDING_MOMENT') {
          if (!get().webtoonSnapshots.keyAction) {
            get().captureMilestoneSnapshot('keyAction', {
              title: '01:00 — Backstage Breakthrough',
              caption:
                'Working together with LUMINA’s crew, you resolved the backstage crisis just before cue.',
              speaker: latestEvent.speaker,
              dialogue: trimmed,
            });
          }
          get().captureMilestoneSnapshot('endingMoment', {
            title:
              nextWorldState.endingReached === 'SHOWTIME_SAVED'
                ? 'ENDING A — Showtime Saved!'
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
            : 'Network error while communicating with Gemini 4 Argon.',
      });
    }
  },

  resetEpisode: async () => {
    set({ loading: true, error: null });
    const sessionId = get().sessionId;
    try {
      const res = await fetch('/api/reset', {
        method: 'POST',
        headers: { 'x-session-id': sessionId },
      });
      const data = await res.json();
      if (!res.ok || !data.ok) {
        throw new Error(data.message || 'Failed to reset episode');
      }
      set({
        worldState: data.worldState,
        loading: false,
        selectedTarget: null,
        verificationHistory: [],
        webtoonSnapshots: {},
        multiAngle3DFrames: {},
        generatedEpisode: null,
      });

      setTimeout(() => {
        get().captureMilestoneSnapshot('crisisStart', {
          title: '05:00 — Backstage Crisis',
          caption:
            'Five minutes before LUMINA’s comeback stage, lead vocalist Hana’s custom wireless mic is locked away.',
          speaker: 'HANA',
          dialogue:
            "Please, we have five minutes until LUMINA's comeback stage and my custom wireless mic is gone!",
        });
      }, 600);
    } catch (err) {
      set({
        loading: false,
        error:
          err instanceof Error ? err.message : 'Failed to reset world state.',
      });
    }
  },
}));
