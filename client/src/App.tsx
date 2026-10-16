import React, { useEffect, useRef, useState } from 'react';
import {
  Send,
  RotateCcw,
  ShieldCheck,
  BookOpen,
  AlertTriangle,
  CheckCircle2,
  RefreshCw,
  Mic,
  KeyRound,
  Music,
  Volume2,
  VolumeX,
  MessageSquarePlus,
  X,
  GripHorizontal,
  PanelRight,
  Subtitles,
  Minimize2,
  Maximize2,
  Zap,
  Globe,
  HelpCircle,
  Sparkles,
  ArrowRight,
} from 'lucide-react';
import { BackstageScene, getNextQuestGuide } from './scenes/BackstageScene';
import { VerificationInspector } from './components/VerificationInspector';
import { WebtoonModal } from './components/WebtoonModal';
import { useGameStore } from './store/useGameStore';
import { soundEngine } from './utils/soundEngine';

type HudLayoutMode = 'subtitle' | 'side' | 'minimized';

export const App: React.FC = () => {
  const {
    lang,
    setLang,
    worldState,
    loading,
    submittingAction,
    error,
    isDrawerOpen,
    fetchInitialState,
    submitPlayerAction,
    resetEpisode,
    setIsDrawerOpen,
    setIsWebtoonModalOpen,
    clearError,
  } = useGameStore();

  const isKo = lang === 'ko';

  const [freeformInput, setFreeformInput] = useState('');
  const [showCustomInput, setShowCustomInput] = useState(false);
  const [soundOn, setSoundOn] = useState(true);
  const [voiceOn, setVoiceOn] = useState(false);
  const [hudMode, setHudMode] = useState<HudLayoutMode>('subtitle');
  const [showGuideModal, setShowGuideModal] = useState(true);
  const nextQuestGuide = getNextQuestGuide(worldState, lang);

  // Draggable HUD state
  const [dragOffset, setDragOffset] = useState<{ x: number; y: number }>({
    x: 0,
    y: 0,
  });
  const dragStateRef = useRef<{
    dragging: boolean;
    startX: number;
    startY: number;
    originX: number;
    originY: number;
  }>({
    dragging: false,
    startX: 0,
    startY: 0,
    originX: 0,
    originY: 0,
  });

  // Typewriter animation state for dialogue & narration
  const [typedLength, setTypedLength] = useState(0);
  const lastPlayedTurnRef = useRef<number>(0);

  useEffect(() => {
    fetchInitialState();
  }, [fetchInitialState]);

  const latestEvent =
    worldState?.history[worldState.history.length - 1] ?? null;

  const fullDialogueText = latestEvent?.npcResponse ?? '';
  const fullNarrationText = latestEvent?.narration ?? '';
  const combinedTargetLen = fullNarrationText.length + fullDialogueText.length;

  // Typewriter effect when latestEvent changes
  useEffect(() => {
    setTypedLength(0);
    if (!combinedTargetLen) return;
    const interval = window.setInterval(() => {
      setTypedLength((prev) => {
        if (prev >= combinedTargetLen) {
          window.clearInterval(interval);
          return combinedTargetLen;
        }
        return prev + 2;
      });
    }, 18);
    return () => window.clearInterval(interval);
  }, [latestEvent?.turnNumber, fullDialogueText, fullNarrationText, combinedTargetLen]);

  const displayedNarration = fullNarrationText.slice(
    0,
    Math.min(typedLength, fullNarrationText.length)
  );
  const displayedDialogue =
    typedLength > fullNarrationText.length
      ? fullDialogueText.slice(0, typedLength - fullNarrationText.length)
      : '';
  const isTyping = typedLength < combinedTargetLen;

  // Trigger procedural Web Audio SFX & optional TTS when a new turn arrives
  useEffect(() => {
    if (!worldState || !latestEvent) return;
    if (
      latestEvent.turnNumber > 0 &&
      latestEvent.turnNumber !== lastPlayedTurnRef.current
    ) {
      lastPlayedTurnRef.current = latestEvent.turnNumber;
      soundEngine.playActionSfx(
        latestEvent.actionType,
        latestEvent.accepted,
        worldState.endingReached
      );
      if (latestEvent.npcResponse) {
        soundEngine.speakCharacterLine(
          latestEvent.speaker,
          latestEvent.npcResponse
        );
      }
    }
  }, [worldState, latestEvent]);

  // Global pointer listeners for smooth HUD dragging
  useEffect(() => {
    const onPointerMove = (e: PointerEvent) => {
      if (!dragStateRef.current.dragging) return;
      const dx = e.clientX - dragStateRef.current.startX;
      const dy = e.clientY - dragStateRef.current.startY;
      setDragOffset({
        x: Math.max(-window.innerWidth * 0.42, Math.min(window.innerWidth * 0.42, dragStateRef.current.originX + dx)),
        y: Math.max(-window.innerHeight * 0.68, Math.min(window.innerHeight * 0.15, dragStateRef.current.originY + dy)),
      });
    };
    const onPointerUp = () => {
      dragStateRef.current.dragging = false;
    };
    window.addEventListener('pointermove', onPointerMove);
    window.addEventListener('pointerup', onPointerUp);
    return () => {
      window.removeEventListener('pointermove', onPointerMove);
      window.removeEventListener('pointerup', onPointerUp);
    };
  }, []);

  const handleDragStart = (e: React.PointerEvent) => {
    e.stopPropagation();
    dragStateRef.current = {
      dragging: true,
      startX: e.clientX,
      startY: e.clientY,
      originX: dragOffset.x,
      originY: dragOffset.y,
    };
  };

  const toggleSound = () => {
    const next = !soundOn;
    setSoundOn(next);
    soundEngine.soundEnabled = next;
  };

  const toggleVoice = () => {
    const next = !voiceOn;
    setVoiceOn(next);
    soundEngine.voiceEnabled = next;
  };

  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!freeformInput.trim() || submittingAction) return;
    const text = freeformInput;
    setFreeformInput('');
    await submitPlayerAction(text);
  };

  const handleRuleGuardDemo = () => {
    if (submittingAction) return;
    if (!worldState?.lockerUnlocked && !worldState?.hasAccessCard) {
      submitPlayerAction(
        isKo
          ? '카드키 없이 지금 당장 보안 장비함을 강제로 열어서 마이크를 꺼낸다!'
          : 'Force the equipment locker open right now and grab the microphone without any access card!'
      );
    } else {
      submitPlayerAction(
        isKo
          ? '마이크 준비 없이 지금 당장 무대 출입문을 열고 콘서트를 시작한다!'
          : 'Open the stage entrance door and start the concert right now without the microphone!'
      );
    }
  };

  const formatNarrativeTimer = (timer: string) => {
    if (!isKo) return timer;
    if (timer === 'SHOWTIME LIVE') return '생방송 무대 진행 중';
    return timer.replace(' TO SHOWTIME', ' 공연 시작 전');
  };

  // Current single-line objective for clean top HUD
  const currentObjectiveText = (() => {
    if (!worldState)
      return isKo ? '대기실 상황 파악 중...' : 'Scanning backstage situation...';
    if (worldState.endingReached === 'SHOWTIME_SAVED')
      return isKo
        ? '결말 가 달성: 전용 마이크로 컴백 쇼케이스 무대 개막!'
        : 'Ending A Unlocked: Showtime Saved with Hana’s Custom Mic!';
    if (worldState.endingReached === 'UNPLUGGED_ENCORE')
      return isKo
        ? '결말 나 달성: 통기타로 무반주 앙코르 무대 개막!'
        : 'Ending B Unlocked: Unplugged Acoustic Encore Stage!';
    if (worldState.hanaHasMicrophone || worldState.acousticBackupApproved)
      return isKo
        ? '무대 준비 완료 — 중앙 무대 출입문을 열어 공연을 시작하세요'
        : 'Ready for cue — Open the Center Stage Entrance Door to begin!';
    if (worldState.hasMicrophone)
      return isKo
        ? '회수한 전용 마이크를 리드 보컬 하나에게 건네주세요'
        : 'Deliver the recovered custom microphone to lead vocalist Hana';
    if (worldState.lockerUnlocked)
      return isKo
        ? '열린 보안 장비함 안에서 하나의 전용 마이크를 꺼내세요'
        : 'Retrieve Hana’s custom wireless mic from the unlocked locker';
    if (worldState.hasAccessCard)
      return isKo
        ? '우측 보안 장비함에 특별 스태프 카드키를 접촉해 잠금을 해제하세요'
        : 'Tap the VIP Staff Access Card on the right security locker';
    if (worldState.hanaTalked || worldState.clueDiscovered)
      return isKo
        ? '좌측 화장대 대리석 위에서 특별 스태프 카드키를 찾으세요'
        : 'Pick up the VIP Staff Access Card on the left vanity table';
    return isKo
      ? '리드 보컬 하나와 대화하거나 화장대 위 단서를 조사하세요'
      : 'Talk to lead vocalist Hana or inspect the vanity table for clues';
  })();

  // Compact narrative choices (always immediately clickable, concise so they never clutter)
  const dialogueChoices = (() => {
    if (!worldState) return [];
    const list: Array<{
      num: string;
      label: string;
      prompt: string;
      kind: 'main' | 'alt' | 'guard';
    }> = [];

    if (!worldState.hanaTalked && !worldState.hasAccessCard) {
      list.push({
        num: '1',
        label: isKo
          ? '하나와 대화해 진정시키고 마이크 행방 묻기'
          : 'Comfort Hana & ask where her custom mic went',
        prompt: isKo
          ? '하나에게 다가가 진정시키고 사라진 전용 마이크의 행방을 묻는다.'
          : 'Talk to Hana to comfort her and ask what happened to her custom starlight microphone.',
        kind: 'main',
      });
    }

    if (!worldState.hasAccessCard) {
      list.push({
        num: String(list.length + 1),
        label: isKo
          ? '화장대 위에서 특별 스태프 카드키 집기'
          : 'Pick up VIP Staff Access Card on vanity table',
        prompt: isKo
          ? '조명 거울 화장대 위에서 특별 스태프 카드키를 집어 든다.'
          : 'Inspect the Hollywood vanity table and pick up the holographic VIP Staff Access Card.',
        kind: 'main',
      });
    }

    if (worldState.hasAccessCard && !worldState.lockerUnlocked) {
      list.push({
        num: String(list.length + 1),
        label: isKo
          ? '특별 카드키로 보안 장비함 잠금 해제하기'
          : 'Unlock security equipment locker with VIP Card',
        prompt: isKo
          ? '특별 스태프 카드키를 보안 장비함 인식기에 접촉해 문을 연다.'
          : 'Use the VIP Staff Access Card to unlock the equipment locker.',
        kind: 'main',
      });
    }

    if (
      worldState.lockerUnlocked &&
      !worldState.hasMicrophone &&
      !worldState.hanaHasMicrophone
    ) {
      list.push({
        num: String(list.length + 1),
        label: isKo
          ? '열린 장비함에서 전용 무선 마이크 꺼내기'
          : 'Take custom wireless mic from unlocked locker',
        prompt: isKo
          ? '열린 장비함 안에서 하나의 전용 무선 마이크를 꺼낸다.'
          : 'Pick up Hana’s custom starlight microphone from inside the unlocked equipment locker.',
        kind: 'main',
      });
    }

    if (worldState.hasMicrophone && !worldState.hanaHasMicrophone) {
      list.push({
        num: String(list.length + 1),
        label: isKo
          ? '하나에게 전용 마이크 건네주기'
          : 'Hand the custom wireless microphone to Hana',
        prompt: isKo
          ? '하나에게 회수한 전용 마이크를 건네며 격려한다.'
          : 'Hand the custom starlight microphone over to Hana so she can perform!',
        kind: 'main',
      });
    }

    if (
      worldState.hanaHasMicrophone &&
      worldState.endingReached === 'NONE'
    ) {
      list.push({
        num: String(list.length + 1),
        label: isKo
          ? '무대 출입문 열고 컴백 쇼케이스 시작 (결말 가)'
          : 'Open Stage Door & start Comeback Stage (Ending A)',
        prompt: isKo
          ? '메인 무대 출입문을 열고 컴백 쇼케이스 무대를 시작한다!'
          : 'Open the stage entrance door and start LUMINA’s comeback performance with Hana’s recovered microphone!',
        kind: 'main',
      });
    }

    // Alternative acoustic path choice
    if (!worldState.guitarTuned && worldState.endingReached === 'NONE') {
      list.push({
        num: String(list.length + 1),
        label: isKo
          ? '[통기타 경로] 소파 옆 통기타 조율하기'
          : '[Acoustic Route] Tune backstage acoustic guitar',
        prompt: isKo
          ? '휴식 소파 옆의 통기타를 조율해 무반주 통기타 무대를 준비한다.'
          : 'Inspect and tune the wooden acoustic guitar resting on the stand for an unplugged stage.',
        kind: 'alt',
      });
    } else if (
      worldState.guitarTuned &&
      !worldState.acousticBackupApproved &&
      worldState.endingReached === 'NONE'
    ) {
      list.push({
        num: String(list.length + 1),
        label: isKo
          ? '[통기타 경로] 지호에게 통기타 무대 편성 제안'
          : '[Acoustic Route] Propose unplugged stage to Jiho',
        prompt: isKo
          ? '무대 감독 지호에게 통기타 생방송 무대 편성을 제안한다.'
          : 'Talk to Jiho and propose organizing an alternative unplugged acoustic performance using the backstage acoustic guitar.',
        kind: 'alt',
      });
    } else if (
      worldState.acousticBackupApproved &&
      worldState.endingReached === 'NONE'
    ) {
      list.push({
        num: String(list.length + 1),
        label: isKo
          ? '[통기타 경로] 통기타 앙코르 무대 시작 (결말 나)'
          : '[Acoustic Route] Open Stage Door for Unplugged Encore (Ending B)',
        prompt: isKo
          ? '무대 출입문을 열고 통기타 앙코르 무대를 시작한다!'
          : 'Open the stage entrance door and start the Unplugged Acoustic Encore performance!',
        kind: 'alt',
      });
    }

    // Fill up to 3 story options if needed
    if (list.length < 3 && !worldState.jihoTalked) {
      list.push({
        num: String(list.length + 1),
        label: isKo
          ? '무대 감독 지호에게 장비함 위치 묻기'
          : 'Ask stage director Jiho about the locked mic',
        prompt: isKo
          ? '무대 감독 지호에게 음향팀이 마이크를 어디에 보관했는지 묻는다.'
          : 'Ask Jiho where the custom microphone was moved and how to unlock the equipment locker.',
        kind: 'main',
      });
    }

    // Always provide 1 deterministic Rule Guard test button when applicable
    if (!worldState.lockerUnlocked && !worldState.hasAccessCard) {
      list.push({
        num: '⚡',
        label: isKo
          ? '[규칙 검증 시험] 카드키 없이 장비함 강제 개방 시도'
          : '[Rule Guard] Force locker open without keycard',
        prompt: isKo
          ? '카드키 없이 보안 장비함을 강제로 열려고 시도한다!'
          : 'Force the equipment locker open right now and grab the microphone without any access card!',
        kind: 'guard',
      });
    } else if (
      !worldState.hanaHasMicrophone &&
      !worldState.acousticBackupApproved
    ) {
      list.push({
        num: '⚡',
        label: isKo
          ? '[규칙 검증 시험] 준비 없이 무대 출입문 강제 개방'
          : '[Rule Guard] Open stage door before ready',
        prompt: isKo
          ? '마이크 준비 없이 지금 당장 무대 출입문을 열고 나간다!'
          : 'Open the stage entrance door and start the concert right now even though we are not ready!',
        kind: 'guard',
      });
    }

    return list.slice(0, 4);
  })();

  const speakerLabel = (speaker?: string) => {
    if (speaker === 'HANA')
      return isKo ? '하나 · 리드 보컬' : 'HANA · Lead Vocal';
    if (speaker === 'JIHO')
      return isKo ? '지호 · 무대 감독' : 'JIHO · Stage Director';
    return isKo ? '대기실 상황' : 'BACKSTAGE';
  };

  return (
    <div className="relative w-screen h-screen overflow-hidden bg-[#141210] text-stone-100 flex flex-col select-none font-sans">
      {/* Slim Top Bar */}
      <header className="z-30 h-12 px-4 flex items-center justify-between bg-stone-950/80 backdrop-blur-md border-b border-white/10 shrink-0">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="flex items-center gap-2 shrink-0">
            <span className="font-bold text-sm tracking-widest text-stone-100">
              FANVERSE
            </span>
            <span className="hidden sm:inline-flex items-center gap-1 text-[10px] px-2 py-0.5 rounded bg-stone-800/90 text-amber-200/90 border border-white/10 font-medium">
              🎬 {isKo ? '제1화 루미나 대기실 위기' : 'Episode Pack: LUMINA Backstage Crisis'}
            </span>
          </div>

          {worldState && (
            <>
              <div
                className={`px-2 py-0.5 rounded font-mono text-xs font-semibold border shrink-0 ${
                  worldState.endingReached !== 'NONE'
                    ? 'bg-emerald-950/80 border-emerald-500/40 text-emerald-300'
                    : 'bg-stone-900 border-amber-400/40 text-amber-200'
                }`}
              >
                {formatNarrativeTimer(worldState.narrativeTimer)}
              </div>

              <div className="hidden lg:flex items-center gap-1.5 text-xs text-stone-300 truncate">
                <span className="text-stone-500">
                  {isKo ? '목표:' : 'Objective:'}
                </span>
                <span className="font-medium text-stone-200 truncate">
                  {currentObjectiveText}
                </span>
              </div>
            </>
          )}
        </div>

        {/* Right Controls: Language + Inventory + Rule Guard + Verifier + 2K Webtoon Button */}
        <div className="flex items-center gap-1.5 shrink-0">
          {/* Language Toggle */}
          <div className="inline-flex items-center rounded-lg bg-stone-900 border border-white/15 p-0.5 text-[11px] font-bold">
            <Globe className="w-3 h-3 text-stone-400 ml-1.5 mr-1" />
            <button
              onClick={() => setLang('en')}
              className={`px-2 py-0.5 rounded-md transition cursor-pointer ${
                lang === 'en'
                  ? 'bg-amber-300 text-stone-950'
                  : 'text-stone-400 hover:text-stone-200'
              }`}
            >
              {isKo ? '영어' : 'EN'}
            </button>
            <button
              onClick={() => setLang('ko')}
              className={`px-2 py-0.5 rounded-md transition cursor-pointer ${
                lang === 'ko'
                  ? 'bg-amber-300 text-stone-950'
                  : 'text-stone-400 hover:text-stone-200'
              }`}
            >
              {isKo ? '한국어' : 'KO'}
            </button>
          </div>

          {worldState && (
            <div className="hidden xl:flex items-center gap-1">
              {worldState.hasAccessCard && (
                <span className="inline-flex items-center gap-1 px-2 py-1 rounded-md bg-stone-900 border border-amber-400/30 text-[10px] text-amber-200">
                  <KeyRound className="w-3 h-3" />
                  {isKo ? '특별 카드키' : 'VIP Keycard'}
                </span>
              )}
              {(worldState.hasMicrophone || worldState.hanaHasMicrophone) && (
                <span className="inline-flex items-center gap-1 px-2 py-1 rounded-md bg-stone-900 border border-emerald-400/30 text-[10px] text-emerald-200">
                  <Mic className="w-3 h-3" />
                  {isKo ? '전용 마이크' : 'Custom Mic'}
                </span>
              )}
              {(worldState.guitarTuned ||
                worldState.acousticBackupApproved) && (
                <span className="inline-flex items-center gap-1 px-2 py-1 rounded-md bg-stone-900 border border-amber-300/30 text-[10px] text-amber-100">
                  <Music className="w-3 h-3" />
                  {isKo ? '통기타' : 'Acoustic Guitar'}
                </span>
              )}
            </div>
          )}

          <button
            onClick={handleRuleGuardDemo}
            disabled={submittingAction}
            className="hidden md:inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-rose-950/60 hover:bg-rose-900/70 border border-rose-400/40 text-rose-200 text-[11px] font-medium cursor-pointer transition"
            title={
              isKo
                ? '결정론적 상태 검증 규칙 차단 및 재작성 과정 시험'
                : 'Trigger a deterministic Rule Guard rejection & Gemini 4 Argon rewrite loop'
            }
          >
            <Zap className="w-3 h-3 text-rose-300" />
            <span>{isKo ? '규칙 검증 시험' : 'Test Rule Guard'}</span>
          </button>

          <button
            onClick={toggleSound}
            className="p-1.5 rounded-lg bg-stone-900 hover:bg-stone-800 border border-white/10 text-stone-300 cursor-pointer"
            title={
              isKo
                ? soundOn
                  ? '효과음 켜짐'
                  : '효과음 꺼짐'
                : soundOn
                  ? 'SFX ON'
                  : 'SFX OFF'
            }
          >
            {soundOn ? (
              <Volume2 className="w-3.5 h-3.5 text-amber-200" />
            ) : (
              <VolumeX className="w-3.5 h-3.5 text-stone-500" />
            )}
          </button>

          <button
            onClick={toggleVoice}
            className={`px-2 py-1 rounded-lg border text-[11px] font-medium cursor-pointer transition ${
              voiceOn
                ? 'bg-stone-800 border-amber-300/50 text-amber-200'
                : 'bg-stone-900 border-white/10 text-stone-400 hover:text-stone-200'
            }`}
          >
            {isKo
              ? voiceOn
                ? '음성 켜짐'
                : '음성 꺼짐'
              : `TTS ${voiceOn ? 'ON' : 'OFF'}`}
          </button>

          <button
            onClick={() => setShowGuideModal(true)}
            className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-medium border transition cursor-pointer ${
              showGuideModal
                ? 'bg-stone-800 border-amber-300/60 text-amber-200'
                : 'bg-stone-900 border-white/10 text-stone-300 hover:bg-stone-800'
            }`}
            title={isKo ? '이야기 요약 및 진행 안내 열기' : 'Open Story Synopsis & Game Guide'}
          >
            <HelpCircle className="w-3.5 h-3.5 text-amber-300" />
            <span className="hidden sm:inline">
              {isKo ? '이야기·안내' : 'Story & Guide'}
            </span>
          </button>

          <button
            onClick={() => setIsDrawerOpen(!isDrawerOpen)}
            className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-medium border transition cursor-pointer ${
              isDrawerOpen
                ? 'bg-stone-800 border-emerald-400/60 text-emerald-200'
                : 'bg-stone-900 border-white/10 text-stone-300 hover:bg-stone-800'
            }`}
          >
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
            <span className="hidden sm:inline">
              {isKo ? '상태 검증' : 'Verifier'}
            </span>
          </button>

          <button
            onClick={() => setIsWebtoonModalOpen(true)}
            className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg bg-amber-300 hover:bg-amber-200 text-stone-950 text-xs font-bold shadow-sm transition cursor-pointer"
          >
            <BookOpen className="w-3.5 h-3.5" />
            <span>
              {isKo ? '초고화질 웹툰 생성 (10종)' : '2K Webtoon (10 Styles)'}
            </span>
          </button>

          <button
            onClick={resetEpisode}
            disabled={loading || submittingAction}
            className="p-1.5 rounded-lg bg-stone-900 hover:bg-stone-800 border border-white/10 text-stone-400 hover:text-stone-200 cursor-pointer"
            title={isKo ? '처음부터 다시 시작' : 'Reset Episode'}
          >
            <RotateCcw className="w-3.5 h-3.5" />
          </button>
        </div>
      </header>

      {/* Full-Screen 3D Interactive Stage */}
      <div className="relative flex-1 overflow-hidden">
        <BackstageScene />

        {/* Sparkling Next-Step Guide Pill (Synchronized with 3D Bouncing Golden Arrow) */}
        {nextQuestGuide && worldState?.endingReached === 'NONE' && !showGuideModal && (
          <div className="absolute top-14 left-1/2 -translate-x-1/2 z-20 px-3 pointer-events-auto max-w-[95vw]">
            <div className="inline-flex items-center gap-2.5 px-3.5 py-1.5 rounded-full bg-stone-950/80 hover:bg-stone-950/95 backdrop-blur-md border border-amber-300/55 shadow-[0_6px_28px_rgba(0,0,0,0.65)] transition">
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-300 text-stone-950 text-[10px] font-extrabold tracking-wider uppercase animate-pulse shrink-0">
                <Sparkles className="w-3 h-3" />
                {nextQuestGuide.stepBadge} · ▼
              </span>
              <span className="text-xs font-semibold text-amber-100 truncate max-w-[260px] sm:max-w-[420px]">
                {nextQuestGuide.instruction}
              </span>
              <button
                disabled={submittingAction}
                onClick={() => submitPlayerAction(nextQuestGuide.prompt)}
                className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-amber-300/20 hover:bg-amber-300 text-amber-200 hover:text-stone-950 border border-amber-300/50 text-[11px] font-bold transition cursor-pointer disabled:opacity-50 shrink-0"
                title={
                  isKo
                    ? '입체 공간의 반짝이는 화살표 위치를 누르거나 이 단추를 눌러 다음 단계를 바로 진행합니다'
                    : 'Click the sparkling 3D arrow in the room or click here to proceed immediately'
                }
              >
                <span>{isKo ? '다음 진행' : 'Proceed'}</span>
                <ArrowRight className="w-3 h-3" />
              </button>
            </div>
          </div>
        )}

        {/* Initial Screen Story Briefing & Quick Play Guide Overlay */}
        {showGuideModal && (
          <div className="absolute inset-0 z-40 flex items-center justify-center bg-black/55 backdrop-blur-sm p-4 pointer-events-auto">
            <div className="w-full max-w-xl rounded-2xl bg-[#191613]/95 border border-amber-300/40 shadow-[0_24px_80px_rgba(0,0,0,0.85)] overflow-hidden text-stone-100">
              {/* Top Header */}
              <div className="px-6 py-4 bg-stone-900/90 border-b border-white/10 flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <span className="px-2.5 py-0.5 rounded-full bg-amber-300 text-stone-950 text-[11px] font-extrabold tracking-wider uppercase">
                    {isKo ? '제1화 상황 안내' : 'EPISODE 01 BRIEFING'}
                  </span>
                  <h2 className="text-base sm:text-lg font-bold text-stone-100">
                    {isKo
                      ? '공연 5분 전 — 이야기 및 진행 안내'
                      : 'Five Minutes Before Showtime — Story & Play Guide'}
                  </h2>
                </div>
                <button
                  onClick={() => setShowGuideModal(false)}
                  className="p-1.5 rounded-lg bg-stone-800/80 hover:bg-stone-700 text-stone-300 hover:text-white cursor-pointer"
                  title={isKo ? '닫기' : 'Close'}
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Body */}
              <div className="p-6 space-y-5 text-xs sm:text-sm leading-relaxed">
                {/* Short Story Explanation */}
                <div className="p-4 rounded-xl bg-stone-900/80 border border-white/10 space-y-1.5">
                  <div className="text-[11px] font-bold uppercase tracking-wider text-amber-300">
                    {isKo ? '📖 이야기 배경' : '📖 Story Synopsis'}
                  </div>
                  <p className="text-stone-200 leading-relaxed">
                    {isKo ? (
                      <>
                        아이돌 걸그룹 <strong>루미나</strong>의 컴백 쇼케이스 생방송 <strong>5분 전</strong>!
                        리드 보컬 <strong>하나</strong>의 전용 무선 마이크가 보안 장비함에 잠겨버렸습니다.
                        당신은 루미나의 현장 매니저로서 <strong>특별 카드키를 찾아 마이크를 회수(결말 가)</strong>하거나,
                        무대 감독 <strong>지호와 통기타 앙코르 무대를 편성(결말 나)</strong>해 공연을 구해야 합니다.
                      </>
                    ) : (
                      <>
                        It is <strong>5 minutes before showtime</strong> for K-POP group <strong>LUMINA&apos;s</strong> live comeback showcase!
                        Lead vocalist <strong>Hana&apos;s</strong> custom wireless microphone is locked inside the security cabinet.
                        As LUMINA&apos;s road manager, recover the VIP keycard and unlock her mic (<strong>Ending A</strong>), or coordinate an unplugged acoustic guitar stage with director <strong>Jiho</strong> (<strong>Ending B</strong>).
                      </>
                    )}
                  </p>
                </div>

                {/* 3-Step Game Guide */}
                <div className="space-y-2.5">
                  <div className="text-[11px] font-bold uppercase tracking-wider text-amber-300">
                    {isKo ? '🎮 3단계 진행 안내' : '🎮 3-Step Quick Play Guide'}
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                    <div className="p-3 rounded-xl bg-stone-900/65 border border-amber-300/25 space-y-1">
                      <div className="font-bold text-amber-200 text-xs flex items-center gap-1.5">
                        <span>1.</span>
                        <span>{isKo ? '반짝이는 화살표 안내' : 'Follow Sparkling Arrow'}</span>
                      </div>
                      <p className="text-[11px] text-stone-300 leading-snug">
                        {isKo
                          ? '사람 눈높이 입체 화면에서 다음 진행 위치 위에 반짝이는 황금 화살표(▼ 단계)가 뜹니다. 화살표나 사물을 누르세요.'
                          : 'A sparkling golden arrow (▼ STEP) floats above the next required 3D target at human eye-level view. Click it to advance.'}
                      </p>
                    </div>

                    <div className="p-3 rounded-xl bg-stone-900/65 border border-white/10 space-y-1">
                      <div className="font-bold text-stone-100 text-xs flex items-center gap-1.5">
                        <span>2.</span>
                        <span>{isKo ? '투명 자막 및 선택지' : 'Unobstructed Choices'}</span>
                      </div>
                      <p className="text-[11px] text-stone-300 leading-snug">
                        {isKo
                          ? '시야를 가리지 않는 하단 자막과 번호 선택지(1·2·3·⚡)로 진행하거나, 이동 손잡이로 대사창을 원하는 곳에 옮기세요.'
                          : 'Use the transparent typewriter subtitles & numbered choice pills (1·2·3·⚡), or drag the HUD anywhere with your mouse.'}
                      </p>
                    </div>

                    <div className="p-3 rounded-xl bg-stone-900/65 border border-white/10 space-y-1">
                      <div className="font-bold text-stone-100 text-xs flex items-center gap-1.5">
                        <span>3.</span>
                        <span>{isKo ? '초고화질 10종 웹툰' : '2K 10-Style Webtoon'}</span>
                      </div>
                      <p className="text-[11px] text-stone-300 leading-snug">
                        {isKo
                          ? '진행한 대사와 이야기를 로맨스 순정·청춘 드라마 등 10가지 화풍의 초고화질 세로형 웹툰으로 즉시 변환·저장하세요.'
                          : 'Convert your story into a 2K (2048px) vertical Naver Webtoon across 10 distinct art styles anytime.'}
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Footer CTA */}
              <div className="px-6 py-4 bg-stone-900/90 border-t border-white/10 flex flex-wrap items-center justify-between gap-3">
                <span className="text-[11px] text-stone-400">
                  {isKo
                    ? '💡 도움말: 마우스 끌기로 입체 시점 회전 · 휠로 확대 및 축소 · 상단 [이야기·안내]로 언제든 다시 열기'
                    : '💡 Tip: Drag to orbit 3D camera · Scroll to zoom · Re-open anytime via [Story & Guide]'}
                </span>
                <button
                  onClick={() => setShowGuideModal(false)}
                  className="px-5 py-2 rounded-xl bg-amber-300 hover:bg-amber-200 text-stone-950 font-extrabold text-xs sm:text-sm shadow-lg transition cursor-pointer inline-flex items-center gap-1.5"
                >
                  <span>
                    {isKo ? '제1화 시작하기' : 'Start Episode 01'}
                  </span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Ending Banner */}
        {worldState && worldState.endingReached !== 'NONE' && (
          <div className="absolute top-14 left-1/2 -translate-x-1/2 z-20 w-full max-w-lg px-4 pointer-events-auto">
            <div className="px-4 py-2.5 rounded-xl bg-stone-950/85 border border-amber-300/50 shadow-2xl backdrop-blur-md flex items-center justify-between gap-3">
              <div>
                <div className="text-[10px] font-bold uppercase tracking-widest text-amber-300">
                  {isKo ? '제1화 완료' : 'EPISODE 01 COMPLETE'}
                </div>
                <div className="text-sm font-bold text-stone-100">
                  {worldState.endingReached === 'SHOWTIME_SAVED'
                    ? isKo
                      ? '결말 가: 컴백 쇼케이스 무대 개막!'
                      : 'Ending A: Comeback Showtime Saved!'
                    : isKo
                      ? '결말 나: 무반주 통기타 앙코르!'
                      : 'Ending B: Unplugged Acoustic Encore!'}
                </div>
              </div>
              <button
                onClick={() => setIsWebtoonModalOpen(true)}
                className="px-3 py-1.5 rounded-lg bg-amber-300 hover:bg-amber-200 text-stone-950 font-bold text-xs cursor-pointer shrink-0"
              >
                {isKo ? '초고화질 세로형 웹툰 보기 →' : 'Open 2K Webtoon →'}
              </button>
            </div>
          </div>
        )}

        {/* Recoverable Error Notice */}
        {error && (
          <div className="absolute top-16 left-1/2 -translate-x-1/2 z-30 w-full max-w-lg px-4 pointer-events-auto">
            <div className="p-3 rounded-xl bg-stone-950/90 border border-rose-400/50 text-stone-100 shadow-2xl flex items-center justify-between gap-3 text-xs">
              <div className="flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0" />
                <span>{error}</span>
              </div>
              <button
                onClick={clearError}
                className="px-2 py-1 rounded bg-stone-800 hover:bg-stone-700 text-stone-200 cursor-pointer"
              >
                {isKo ? '닫기' : 'Dismiss'}
              </button>
            </div>
          </div>
        )}

        {/* =====================================================================
            UNOBSTRUCTED, DRAGGABLE TYPEWRITER SUBTITLE & CHOICE HUD
            - Default ('subtitle'): Zero opaque background box! Floating typewriter
              subtitle with strong drop-shadow + slim clickable pill buttons.
            - 'side': Docked to right side so center/bottom 3D view is 100% open.
            - 'minimized': Collapsed to a tiny floating control pill.
            - Mouse-draggable via the grip bar (`dragOffset.x`, `dragOffset.y`).
           ===================================================================== */}
        <div
          style={{
            transform: `translate3d(${dragOffset.x}px, ${dragOffset.y}px, 0)`,
          }}
          className={`z-20 pointer-events-none transition-shadow ${
            hudMode === 'side'
              ? 'absolute bottom-3 right-3 w-[350px] max-w-[92vw]'
              : 'absolute bottom-2.5 left-1/2 -translate-x-1/2 w-full max-w-2xl px-3'
          }`}
        >
          {/* Floating Drag Handle + HUD Mode Switcher Bar (Always compact & non-blocking) */}
          <div className="flex items-center justify-center mb-1.5 pointer-events-auto">
            <div className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-stone-950/65 hover:bg-stone-950/85 backdrop-blur-md border border-white/15 shadow-lg text-[11px] text-stone-300">
              {/* Drag Grip Handle */}
              <div
                onPointerDown={handleDragStart}
                className="inline-flex items-center gap-1 pr-2 border-r border-white/10 cursor-grab active:cursor-grabbing text-stone-300 hover:text-amber-200"
                title={
                  isKo
                    ? '마우스로 끌어 대사 및 선택창 위치를 자유롭게 이동하세요'
                    : 'Drag with mouse to move dialogue & choices anywhere'
                }
              >
                <GripHorizontal className="w-3.5 h-3.5 text-amber-300" />
                <span className="font-medium">
                  {isKo ? '위치 이동' : 'Drag HUD'}
                </span>
              </div>

              {(dragOffset.x !== 0 || dragOffset.y !== 0) && (
                <button
                  onClick={() => setDragOffset({ x: 0, y: 0 })}
                  className="px-1.5 py-0.5 rounded text-[10px] text-amber-200 hover:bg-white/10 cursor-pointer"
                >
                  {isKo ? '위치 초기화' : 'Reset'}
                </button>
              )}

              {/* Mode: Transparent Subtitle (Default) */}
              <button
                onClick={() => setHudMode('subtitle')}
                className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full cursor-pointer transition ${
                  hudMode === 'subtitle'
                    ? 'bg-amber-300/25 text-amber-200 border border-amber-300/40'
                    : 'text-stone-400 hover:text-stone-200'
                }`}
                title={isKo ? '투명 자막 방식 (화면 가림 없음)' : 'Transparent Subtitle Mode'}
              >
                <Subtitles className="w-3 h-3" />
                <span>{isKo ? '투명 자막' : 'Subtitle'}</span>
              </button>

              {/* Mode: Right Side Dock */}
              <button
                onClick={() => {
                  setHudMode('side');
                  setDragOffset({ x: 0, y: 0 });
                }}
                className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full cursor-pointer transition ${
                  hudMode === 'side'
                    ? 'bg-amber-300/25 text-amber-200 border border-amber-300/40'
                    : 'text-stone-400 hover:text-stone-200'
                }`}
                title={isKo ? '우측 가장자리로 배치' : 'Dock to Right Side'}
              >
                <PanelRight className="w-3 h-3" />
                <span>{isKo ? '우측 배치' : 'Side Dock'}</span>
              </button>

              {/* Mode: Minimize / Expand */}
              <button
                onClick={() =>
                  setHudMode(hudMode === 'minimized' ? 'subtitle' : 'minimized')
                }
                className="p-1 rounded-full text-stone-400 hover:text-white cursor-pointer"
                title={isKo ? '대사 및 선택창 접기·펼치기' : 'Minimize / Expand HUD'}
              >
                {hudMode === 'minimized' ? (
                  <Maximize2 className="w-3 h-3 text-amber-300" />
                ) : (
                  <Minimize2 className="w-3 h-3" />
                )}
              </button>
            </div>
          </div>

          {hudMode !== 'minimized' && (
            <div
              className={
                hudMode === 'side'
                  ? 'pointer-events-auto rounded-2xl bg-stone-950/60 backdrop-blur-md border border-white/12 p-3 space-y-2 shadow-xl'
                  : 'space-y-1.5'
              }
            >
              {/* Typewriter Subtitle Area — Zero solid box in 'subtitle' mode so 3D scene is 100% visible! */}
              {latestEvent && (
                <div
                  onClick={() => {
                    if (isTyping) setTypedLength(combinedTargetLen);
                  }}
                  className={`pointer-events-auto cursor-pointer ${
                    hudMode === 'subtitle'
                      ? 'text-center px-3 py-1'
                      : 'text-left'
                  }`}
                  title={
                    isTyping
                      ? isKo
                        ? '눌러서 글자 출력 즉시 완료'
                        : 'Click to finish typing immediately'
                      : undefined
                  }
                >
                  {/* Speaker + Situation Line + Verification Badge */}
                  <div
                    className={`flex flex-wrap items-center gap-1.5 mb-0.5 ${
                      hudMode === 'subtitle' ? 'justify-center' : 'justify-between'
                    }`}
                  >
                    <span className="px-2 py-0.5 rounded-full bg-stone-950/75 border border-amber-300/40 text-amber-200 text-[11px] font-bold shadow">
                      {speakerLabel(latestEvent.speaker)}
                    </span>

                    {displayedNarration && (
                      <span className="text-xs text-stone-200 font-medium [text-shadow:0_2px_8px_rgba(0,0,0,0.98),0_1px_2px_rgba(0,0,0,1)]">
                        {displayedNarration}
                      </span>
                    )}

                    {latestEvent.turnNumber > 0 && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setIsDrawerOpen(true);
                        }}
                        className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold border cursor-pointer shrink-0 shadow ${
                          latestEvent.accepted
                            ? 'bg-emerald-950/80 border-emerald-400/50 text-emerald-200'
                            : 'bg-rose-950/85 border-rose-400/60 text-rose-200'
                        }`}
                      >
                        {latestEvent.accepted ? (
                          <>
                            <CheckCircle2 className="w-2.5 h-2.5" />
                            <span>{isKo ? '검증됨' : 'Verified'}</span>
                          </>
                        ) : (
                          <>
                            <RefreshCw className="w-2.5 h-2.5" />
                            <span>
                              {isKo ? '규칙 보호 작동' : 'Guard Rewrote'}
                            </span>
                          </>
                        )}
                      </button>
                    )}
                  </div>

                  {/* Typewriter Character Dialogue Line */}
                  {displayedDialogue && (
                    <p
                      className={`font-semibold text-white leading-snug [text-shadow:0_2px_12px_rgba(0,0,0,1),0_0_4px_rgba(0,0,0,0.95)] ${
                        hudMode === 'subtitle'
                          ? 'text-sm sm:text-[15px]'
                          : 'text-xs sm:text-sm'
                      }`}
                    >
                      &ldquo;{displayedDialogue}
                      {isTyping && (
                        <span className="inline-block w-1.5 h-3.5 ml-0.5 bg-amber-300 animate-pulse align-middle" />
                      )}
                      &rdquo;
                    </p>
                  )}
                </div>
              )}

              {/* Immediately Clickable Compact Choice Pills (No bulky container!) */}
              <div
                className={`pointer-events-auto grid gap-1.5 ${
                  hudMode === 'side'
                    ? 'grid-cols-1'
                    : 'grid-cols-1 sm:grid-cols-2'
                }`}
              >
                {dialogueChoices.map((ch, idx) => (
                  <button
                    key={idx}
                    disabled={submittingAction}
                    onClick={() => submitPlayerAction(ch.prompt)}
                    className={`text-left px-3 py-1.5 rounded-full text-xs transition flex items-center gap-2 cursor-pointer disabled:opacity-50 backdrop-blur-md shadow-lg border ${
                      ch.kind === 'main'
                        ? 'bg-stone-950/65 hover:bg-stone-900/90 border-white/20 hover:border-amber-300/80 text-stone-100'
                        : ch.kind === 'alt'
                          ? 'bg-stone-950/60 hover:bg-stone-900/90 border-amber-400/35 hover:border-amber-300/80 text-amber-100'
                          : 'bg-rose-950/55 hover:bg-rose-950/85 border-rose-400/40 text-rose-100'
                    }`}
                  >
                    <span className="w-4 h-4 rounded-full bg-stone-800/90 border border-white/15 text-[10px] font-mono font-bold text-amber-200 flex items-center justify-center shrink-0">
                      {ch.num}
                    </span>
                    <span className="truncate font-medium">{ch.label}</span>
                  </button>
                ))}
              </div>

              {/* Compact Custom Action Input Pill */}
              <div className="pointer-events-auto flex items-center justify-center pt-0.5">
                {!showCustomInput ? (
                  <div className="flex items-center gap-3">
                    <button
                      onClick={() => setShowCustomInput(true)}
                      className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-stone-950/55 hover:bg-stone-900/80 border border-white/15 text-[11px] text-stone-300 hover:text-white cursor-pointer backdrop-blur-sm"
                    >
                      <MessageSquarePlus className="w-3 h-3 text-amber-200" />
                      <span>
                        {isKo
                          ? '직접 대사 및 행동 입력하기'
                          : 'Type custom dialogue / action'}
                      </span>
                    </button>
                    {submittingAction && (
                      <span className="px-2.5 py-0.5 rounded-full bg-stone-950/75 text-[11px] text-amber-200 animate-pulse">
                        {isKo
                          ? '인공지능 이야기 감독 응답 생성 중...'
                          : 'Gemini 4 Argon reasoning...'}
                      </span>
                    )}
                  </div>
                ) : (
                  <form
                    onSubmit={handleFormSubmit}
                    className="w-full flex items-center gap-1.5 bg-stone-950/80 backdrop-blur-md p-1 rounded-full border border-white/20 shadow-xl"
                  >
                    <input
                      type="text"
                      value={freeformInput}
                      onChange={(e) => setFreeformInput(e.target.value)}
                      disabled={submittingAction}
                      placeholder={
                        isKo
                          ? '대사나 행동을 자유롭게 입력하세요...'
                          : 'Type any dialogue or action...'
                      }
                      className="flex-1 px-3 py-1 rounded-full bg-transparent focus:outline-none text-xs text-stone-100 placeholder-stone-400 select-text"
                    />
                    <button
                      type="submit"
                      disabled={submittingAction || !freeformInput.trim()}
                      className="px-3 py-1 rounded-full bg-amber-300 hover:bg-amber-200 disabled:opacity-50 text-stone-950 text-xs font-bold inline-flex items-center gap-1 cursor-pointer shrink-0"
                    >
                      <Send className="w-3 h-3" />
                      <span>{isKo ? '전송' : 'Send'}</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setShowCustomInput(false)}
                      className="p-1 rounded-full hover:bg-stone-800 text-stone-400 cursor-pointer"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </form>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Floating Verification Loop & Architecture Inspector Modal */}
        {isDrawerOpen && (
          <div className="absolute top-3 right-3 bottom-3 w-[420px] max-w-[94vw] z-30 rounded-2xl bg-stone-950/95 backdrop-blur-2xl border border-white/15 shadow-2xl flex flex-col overflow-hidden pointer-events-auto">
            <div className="px-4 py-3 border-b border-white/10 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-emerald-400" />
                <span className="text-xs font-bold text-stone-100">
                  {isKo
                    ? '상태 검증 및 구조 점검창'
                    : 'Verification Loop & Architecture Inspector'}
                </span>
              </div>
              <button
                onClick={() => setIsDrawerOpen(false)}
                className="p-1 rounded-lg hover:bg-stone-800 text-stone-400 hover:text-white cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-4">
              <VerificationInspector />
            </div>
          </div>
        )}
      </div>

      {/* Full Episode 01 Webtoon Modal (10 Naver Webtoon Styles + 2K Single Stitched Vertical Strip) */}
      <WebtoonModal />
    </div>
  );
};

export default App;
