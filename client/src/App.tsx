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
} from 'lucide-react';
import { BackstageScene } from './scenes/BackstageScene';
import { VerificationInspector } from './components/VerificationInspector';
import { WebtoonModal } from './components/WebtoonModal';
import { useGameStore } from './store/useGameStore';
import { soundEngine } from './utils/soundEngine';

export const App: React.FC = () => {
  const {
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

  const [freeformInput, setFreeformInput] = useState('');
  const [showCustomInput, setShowCustomInput] = useState(false);
  const [soundOn, setSoundOn] = useState(true);
  const [voiceOn, setVoiceOn] = useState(false);
  const lastPlayedTurnRef = useRef<number>(0);

  useEffect(() => {
    fetchInitialState();
  }, [fetchInitialState]);

  const latestEvent =
    worldState?.history[worldState.history.length - 1] ?? null;

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

  // Current single-line objective for clean top HUD
  const currentObjectiveText = (() => {
    if (!worldState) return '대기실 상황 파악 중...';
    if (worldState.endingReached === 'SHOWTIME_SAVED')
      return '엔딩 A 달성: 커스텀 마이크로 컴백 쇼케이스 무대 오픈!';
    if (worldState.endingReached === 'UNPLUGGED_ENCORE')
      return '엔딩 B 달성: 어쿠스틱 기타로 언플러그드 앙코르 무대 오픈!';
    if (worldState.hanaHasMicrophone || worldState.acousticBackupApproved)
      return '무대 준비 완료 — 중앙 무대 출입문을 열어 공연을 시작하세요';
    if (worldState.hasMicrophone)
      return '회수한 커스텀 마이크를 리드 보컬 하나에게 건네주세요';
    if (worldState.lockerUnlocked)
      return '열린 보안 장비함 안에서 하나의 커스텀 마이크를 꺼내세요';
    if (worldState.hasAccessCard)
      return '우측 보안 장비함에 VIP 스태프 카드키를 태그해 잠금을 해제하세요';
    if (worldState.hanaTalked || worldState.clueDiscovered)
      return '좌측 화장대 대리석 위에서 VIP 스태프 카드키를 찾으세요';
    return '불안해하는 리드 보컬 하나와 대화하거나 대기실 단서를 조사하세요';
  })();

  // Clean Steam-style numbered narrative choices (3 story choices + 1 rule-guard test)
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
        label: '하나에게 다가가 진정시키고 사라진 마이크의 행방을 묻는다',
        prompt:
          'Talk to Hana to comfort her and ask what happened to her custom starlight microphone.',
        kind: 'main',
      });
    }

    if (!worldState.hasAccessCard) {
      list.push({
        num: String(list.length + 1),
        label: '할리우드 조명 거울 화장대 위에서 VIP 스태프 카드키를 집어 든다',
        prompt:
          'Inspect the Hollywood vanity table and pick up the holographic VIP Staff Access Card.',
        kind: 'main',
      });
    }

    if (worldState.hasAccessCard && !worldState.lockerUnlocked) {
      list.push({
        num: String(list.length + 1),
        label: 'VIP 스태프 카드키를 보안 장비함 RFID 리더기에 태그해 문을 연다',
        prompt:
          'Use the VIP Staff Access Card to unlock the equipment locker.',
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
        label: '열린 장비함 안에서 하나의 커스텀 무선 마이크를 꺼낸다',
        prompt:
          'Pick up Hana’s custom starlight microphone from inside the unlocked equipment locker.',
        kind: 'main',
      });
    }

    if (worldState.hasMicrophone && !worldState.hanaHasMicrophone) {
      list.push({
        num: String(list.length + 1),
        label: '하나에게 회수한 커스텀 마이크를 건네며 눈을 맞춰 격려한다',
        prompt:
          'Hand the custom starlight microphone over to Hana so she can perform!',
        kind: 'main',
      });
    }

    if (
      worldState.hanaHasMicrophone &&
      worldState.endingReached === 'NONE'
    ) {
      list.push({
        num: String(list.length + 1),
        label: '메인 무대 출입문을 열고 컴백 쇼케이스 무대를 시작한다 (엔딩 A)',
        prompt:
          'Open the stage entrance door and start LUMINA’s comeback performance with Hana’s recovered microphone!',
        kind: 'main',
      });
    }

    // Alternative acoustic path choice
    if (!worldState.guitarTuned && worldState.endingReached === 'NONE') {
      list.push({
        num: String(list.length + 1),
        label: '[대안 루트] 라운지 소파 옆의 어쿠스틱 기타를 조율해 언플러그드 무대를 준비한다',
        prompt:
          'Inspect and tune the wooden acoustic guitar resting on the stand for an unplugged stage.',
        kind: 'alt',
      });
    } else if (
      worldState.guitarTuned &&
      !worldState.acousticBackupApproved &&
      worldState.endingReached === 'NONE'
    ) {
      list.push({
        num: String(list.length + 1),
        label: '[대안 루트] 무대 디렉터 지호에게 어쿠스틱 라이브 편성을 제안한다',
        prompt:
          'Talk to Jiho and propose organizing an alternative unplugged acoustic performance using the backstage acoustic guitar.',
        kind: 'alt',
      });
    } else if (
      worldState.acousticBackupApproved &&
      worldState.endingReached === 'NONE'
    ) {
      list.push({
        num: String(list.length + 1),
        label: '[대안 루트] 무대 출입문을 열고 언플러그드 앙코르 무대를 시작한다 (엔딩 B)',
        prompt:
          'Open the stage entrance door and start the Unplugged Acoustic Encore performance!',
        kind: 'alt',
      });
    }

    // Fill up to 3 story options if needed
    if (list.length < 3 && !worldState.jihoTalked) {
      list.push({
        num: String(list.length + 1),
        label: '무대 디렉터 지호에게 음향팀이 마이크를 어디에 보관했는지 묻는다',
        prompt:
          'Ask Jiho where the custom microphone was moved and how to unlock the equipment locker.',
        kind: 'main',
      });
    }

    // Always provide 1 deterministic Rule Guard test button when applicable
    if (!worldState.lockerUnlocked && !worldState.hasAccessCard) {
      list.push({
        num: 'G',
        label: '[규칙 가드 테스트] 카드키 없이 보안 장비함을 강제로 열려고 시도한다',
        prompt:
          'Force the equipment locker open right now and grab the microphone without any access card!',
        kind: 'guard',
      });
    } else if (
      !worldState.hanaHasMicrophone &&
      !worldState.acousticBackupApproved
    ) {
      list.push({
        num: 'G',
        label: '[규칙 가드 테스트] 마이크 준비 없이 지금 당장 무대 출입문을 열고 나간다',
        prompt:
          'Open the stage entrance door and start the concert right now even though we are not ready!',
        kind: 'guard',
      });
    }

    return list.slice(0, 4);
  })();

  const speakerLabel = (speaker?: string) => {
    if (speaker === 'HANA') return '하나 · 리드 보컬';
    if (speaker === 'JIHO') return '지호 · 무대 디렉터';
    return '백스테이지 상황';
  };

  return (
    <div className="relative w-screen h-screen overflow-hidden bg-[#141210] text-stone-100 flex flex-col select-none font-sans">
      {/* Clean Minimal Narrative Game Top Bar */}
      <header className="z-30 h-13 px-5 flex items-center justify-between bg-stone-950/85 backdrop-blur-md border-b border-white/10 shrink-0">
        <div className="flex items-center gap-3.5 min-w-0">
          <div className="flex items-center gap-2 shrink-0">
            <span className="font-bold text-sm tracking-widest text-stone-100">
              FANVERSE
            </span>
            <span className="text-[11px] px-2 py-0.5 rounded bg-stone-800 text-amber-200/90 border border-white/10 font-medium">
              EP.01 쇼타임 5분 전
            </span>
          </div>

          {worldState && (
            <>
              <div
                className={`px-2.5 py-0.5 rounded font-mono text-xs font-semibold border shrink-0 ${
                  worldState.endingReached !== 'NONE'
                    ? 'bg-emerald-950/80 border-emerald-500/40 text-emerald-300'
                    : 'bg-stone-900 border-amber-400/40 text-amber-200'
                }`}
              >
                {worldState.narrativeTimer}
              </div>

              <div className="hidden md:flex items-center gap-2 text-xs text-stone-300 truncate">
                <span className="text-stone-500">목표:</span>
                <span className="font-medium text-stone-200 truncate">
                  {currentObjectiveText}
                </span>
              </div>
            </>
          )}
        </div>

        {/* Right Controls: Compact Inventory + Audio + Verifier + 2K Webtoon Button */}
        <div className="flex items-center gap-2 shrink-0">
          {worldState && (
            <div className="hidden lg:flex items-center gap-1.5 mr-1">
              {worldState.hasAccessCard && (
                <span className="inline-flex items-center gap-1 px-2 py-1 rounded-md bg-stone-900 border border-amber-400/30 text-[11px] text-amber-200">
                  <KeyRound className="w-3 h-3" />
                  VIP 카드키
                </span>
              )}
              {(worldState.hasMicrophone || worldState.hanaHasMicrophone) && (
                <span className="inline-flex items-center gap-1 px-2 py-1 rounded-md bg-stone-900 border border-emerald-400/30 text-[11px] text-emerald-200">
                  <Mic className="w-3 h-3" />
                  커스텀 마이크
                </span>
              )}
              {(worldState.guitarTuned ||
                worldState.acousticBackupApproved) && (
                <span className="inline-flex items-center gap-1 px-2 py-1 rounded-md bg-stone-900 border border-amber-300/30 text-[11px] text-amber-100">
                  <Music className="w-3 h-3" />
                  어쿠스틱 기타
                </span>
              )}
            </div>
          )}

          <button
            onClick={toggleSound}
            className="p-1.5 rounded-lg bg-stone-900 hover:bg-stone-800 border border-white/10 text-stone-300 cursor-pointer"
            title={soundOn ? '효과음 켜짐' : '효과음 꺼짐'}
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
            title="캐릭터 음성 합성 (TTS) 켜기/끄기"
          >
            음성 {voiceOn ? 'ON' : 'OFF'}
          </button>

          <button
            onClick={() => setIsDrawerOpen(!isDrawerOpen)}
            className={`inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium border transition cursor-pointer ${
              isDrawerOpen
                ? 'bg-stone-800 border-emerald-400/60 text-emerald-200'
                : 'bg-stone-900 border-white/10 text-stone-300 hover:bg-stone-800'
            }`}
          >
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
            <span className="hidden sm:inline">상태 검증 · 아키텍처</span>
          </button>

          <button
            onClick={() => setIsWebtoonModalOpen(true)}
            className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-stone-100 hover:bg-white text-stone-950 text-xs font-bold shadow-sm transition cursor-pointer"
          >
            <BookOpen className="w-3.5 h-3.5" />
            <span>웹툰 1화 생성 (10종 그림체 · 2K)</span>
          </button>

          <button
            onClick={resetEpisode}
            disabled={loading || submittingAction}
            className="p-1.5 rounded-lg bg-stone-900 hover:bg-stone-800 border border-white/10 text-stone-400 hover:text-stone-200 cursor-pointer"
            title="에피소드 처음부터 다시 시작"
          >
            <RotateCcw className="w-3.5 h-3.5" />
          </button>
        </div>
      </header>

      {/* Full-Screen 3D Interactive Stage */}
      <div className="relative flex-1 overflow-hidden">
        <BackstageScene />

        {/* Ending Banner */}
        {worldState && worldState.endingReached !== 'NONE' && (
          <div className="absolute top-14 left-1/2 -translate-x-1/2 z-20 w-full max-w-lg px-4">
            <div className="px-4 py-3 rounded-xl bg-stone-950/90 border border-amber-300/50 shadow-2xl backdrop-blur-md flex items-center justify-between gap-3">
              <div>
                <div className="text-[10px] font-bold uppercase tracking-widest text-amber-300">
                  EPISODE 01 COMPLETE
                </div>
                <div className="text-sm font-bold text-stone-100">
                  {worldState.endingReached === 'SHOWTIME_SAVED'
                    ? '엔딩 A: 컴백 쇼케이스 무대 오픈!'
                    : '엔딩 B: 언플러그드 어쿠스틱 앙코르!'}
                </div>
              </div>
              <button
                onClick={() => setIsWebtoonModalOpen(true)}
                className="px-3.5 py-2 rounded-lg bg-amber-300 hover:bg-amber-200 text-stone-950 font-bold text-xs cursor-pointer shrink-0"
              >
                2K 세로형 웹툰 1화 보기 →
              </button>
            </div>
          </div>
        )}

        {/* Recoverable Error Notice */}
        {error && (
          <div className="absolute top-16 left-1/2 -translate-x-1/2 z-30 w-full max-w-lg px-4">
            <div className="p-3 rounded-xl bg-stone-950/95 border border-rose-400/50 text-stone-100 shadow-2xl flex items-center justify-between gap-3 text-xs">
              <div className="flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0" />
                <span>{error}</span>
              </div>
              <button
                onClick={clearError}
                className="px-2 py-1 rounded bg-stone-800 hover:bg-stone-700 text-stone-200 cursor-pointer"
              >
                닫기
              </button>
            </div>
          </div>
        )}

        {/* Steam-Style Interactive Narrative Dialogue & Choice HUD (Bottom Center) */}
        <div className="absolute bottom-4 left-4 right-4 z-20 max-w-3xl mx-auto pointer-events-auto">
          <div className="rounded-2xl bg-stone-950/82 backdrop-blur-xl border border-white/12 shadow-2xl px-5 py-4 space-y-3">
            {/* Speaker Name + Verification Status */}
            {latestEvent && (
              <div className="space-y-1">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <span className="px-2.5 py-0.5 rounded bg-stone-800 border border-white/10 text-amber-200 text-xs font-bold">
                      {speakerLabel(latestEvent.speaker)}
                    </span>
                    <span className="text-[11px] text-stone-400">
                      {latestEvent.narration}
                    </span>
                  </div>

                  {latestEvent.turnNumber > 0 && (
                    <button
                      onClick={() => setIsDrawerOpen(true)}
                      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-medium border cursor-pointer shrink-0 ${
                        latestEvent.accepted
                          ? 'bg-emerald-950/60 border-emerald-500/40 text-emerald-300'
                          : 'bg-amber-950/60 border-amber-500/40 text-amber-300'
                      }`}
                    >
                      {latestEvent.accepted ? (
                        <>
                          <CheckCircle2 className="w-3 h-3" />
                          <span>검증 완료</span>
                        </>
                      ) : (
                        <>
                          <RefreshCw className="w-3 h-3" />
                          <span>규칙 가드 차단됨</span>
                        </>
                      )}
                    </button>
                  )}
                </div>

                <p className="text-sm sm:text-[15px] font-medium text-stone-100 leading-relaxed pt-0.5">
                  &ldquo;{latestEvent.npcResponse}&rdquo;
                </p>
              </div>
            )}

            {/* Numbered Dialogue / Action Choices (Steam Adventure Style) */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 pt-1">
              {dialogueChoices.map((ch, idx) => (
                <button
                  key={idx}
                  disabled={submittingAction}
                  onClick={() => submitPlayerAction(ch.prompt)}
                  className={`text-left px-3 py-2 rounded-xl text-xs transition flex items-start gap-2.5 cursor-pointer disabled:opacity-50 border ${
                    ch.kind === 'main'
                      ? 'bg-stone-900/90 hover:bg-stone-800 border-white/12 hover:border-amber-200/50 text-stone-100'
                      : ch.kind === 'alt'
                        ? 'bg-stone-900/75 hover:bg-stone-800 border-amber-400/25 hover:border-amber-300/60 text-amber-100'
                        : 'bg-stone-900/60 hover:bg-stone-800/80 border-rose-400/25 text-stone-300'
                  }`}
                >
                  <span className="w-5 h-5 rounded bg-stone-800 border border-white/10 text-[11px] font-mono font-bold text-amber-200 flex items-center justify-center shrink-0 mt-0.5">
                    {ch.num}
                  </span>
                  <span className="leading-snug">{ch.label}</span>
                </button>
              ))}
            </div>

            {/* Toggleable Custom Natural-Language Input */}
            <div className="flex items-center justify-between pt-0.5">
              {!showCustomInput ? (
                <button
                  onClick={() => setShowCustomInput(true)}
                  className="inline-flex items-center gap-1.5 text-[11px] text-stone-400 hover:text-stone-200 cursor-pointer"
                >
                  <MessageSquarePlus className="w-3.5 h-3.5" />
                  <span>직접 대사 / 행동 입력하기 (자유 입력)</span>
                </button>
              ) : (
                <form
                  onSubmit={handleFormSubmit}
                  className="w-full flex items-center gap-2"
                >
                  <input
                    type="text"
                    value={freeformInput}
                    onChange={(e) => setFreeformInput(e.target.value)}
                    disabled={submittingAction}
                    placeholder="원하는 대사나 행동을 자유롭게 입력하세요..."
                    className="flex-1 px-3.5 py-2 rounded-xl bg-stone-900 border border-white/15 focus:border-amber-300/60 focus:outline-none text-xs text-stone-100 placeholder-stone-500 select-text"
                  />
                  <button
                    type="submit"
                    disabled={submittingAction || !freeformInput.trim()}
                    className="px-4 py-2 rounded-xl bg-stone-100 hover:bg-white disabled:opacity-50 text-stone-950 text-xs font-bold inline-flex items-center gap-1.5 cursor-pointer shrink-0"
                  >
                    <Send className="w-3.5 h-3.5" />
                    <span>{submittingAction ? '처리 중...' : '전송'}</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowCustomInput(false)}
                    className="p-2 rounded-xl bg-stone-900 hover:bg-stone-800 text-stone-400 cursor-pointer"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </form>
              )}

              {submittingAction && !showCustomInput && (
                <span className="text-[11px] text-amber-200 animate-pulse">
                  Gemini 4 Argon 추론 및 검증 중...
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Floating Verification Loop & Architecture Inspector Modal */}
        {isDrawerOpen && (
          <div className="absolute top-4 right-4 bottom-4 w-[420px] max-w-[94vw] z-30 rounded-2xl bg-stone-950/95 backdrop-blur-2xl border border-white/15 shadow-2xl flex flex-col overflow-hidden">
            <div className="px-4 py-3 border-b border-white/10 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-emerald-400" />
                <span className="text-xs font-bold text-stone-100">
                  Verification Loop &amp; Architecture Inspector
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
