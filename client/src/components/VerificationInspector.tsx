import React, { useState } from 'react';
import {
  CheckCircle2,
  XCircle,
  RefreshCw,
  ShieldCheck,
  Terminal,
  Cpu,
  Layers,
  GitBranch,
  Sparkles,
  ArrowRight,
  Lock,
  BookOpen,
  Volume2,
} from 'lucide-react';
import { useGameStore } from '../store/useGameStore';

interface PipelineNodeSpec {
  id: string;
  step: string;
  title: string;
  subtitle: string;
  modelBadge: string;
  apiBadge: string;
  summary: string;
  highlights: string[];
  codeSnippet: string;
}

const PIPELINE_NODES: PipelineNodeSpec[] = [
  {
    id: 'director',
    step: 'STEP 01',
    title: '1M-Context Story Director Proposal',
    subtitle: 'Full Playthrough History + 3D Target Raycast → Structured Intent',
    modelBadge: 'gemini-4-argon',
    apiBadge: 'thinking_level: "low"',
    summary:
      'Every turn feeds the immutable Canonical World Facts, authoritative WorldState, and 100% un-summarized turn history into Gemini 4 Argon via the Interactions API with a strict JSON Schema contract.',
    highlights: [
      'Uses ai.interactions.create() with response_format (PROPOSAL_JSON_SCHEMA)',
      'thinking_level: "low" for sub-second interactive 3D turn responsiveness',
      'Maps free-form player dialogue or 3D clicks to 10 discrete ActionTypes & 12 TargetIds',
    ],
    codeSnippet: `const interaction = await ai.interactions.create({
  model: 'gemini-4-argon',
  input: initialPrompt,
  response_format: {
    type: 'text',
    mime_type: 'application/json',
    schema: PROPOSAL_JSON_SCHEMA,
  },
  generation_config: { thinking_level: 'low' },
});`,
  },
  {
    id: 'validator',
    step: 'STEP 02',
    title: 'Deterministic Canonical World Validator',
    subtitle: 'Hard Precondition Gate Before Any State Mutation',
    modelBadge: 'validateAction.ts',
    apiBadge: 'Zero-Hallucination Guard',
    summary:
      'AI proposals are never trusted to mutate world state directly. A deterministic TypeScript rule engine verifies every proposed flag transition against authoritative preconditions.',
    highlights: [
      'LOCKER_REQUIRES_ACCESS_CARD: Blocks unlocking locker without VIP Access Card',
      'MIC_REQUIRES_UNLOCKED_LOCKER: Blocks grabbing Starlight Mic while locker is locked',
      'STAGE_REQUIRES_RESOLVED_CRISIS: Blocks opening stage door before Ending A/B readiness',
    ],
    codeSnippet: `if (wantsLockerUnlocked && !currentState.hasAccessCard) {
  errors.push(
    'LOCKER_REQUIRES_ACCESS_CARD: Cannot unlock equipment_locker without access_card.'
  );
}`,
  },
  {
    id: 'correction',
    step: 'STEP 03',
    title: 'Stateful Self-Correction Loop (Max 2 Retries)',
    subtitle: 'Interactions API Chaining + Escalated Reasoning Depth',
    modelBadge: 'gemini-4-argon',
    apiBadge: 'thinking_level: "medium" + previous_interaction_id',
    summary:
      'When validateAction() rejects an invalid proposal, the engine chains previous_interaction_id and escalates thinking_level from "low" to "medium" so Argon reasons through the exact rule violation and guides the player in-character.',
    highlights: [
      'Chains previous_interaction_id to preserve stateful turn context without re-sending boilerplate',
      'Escalates thinking_level: "low" → "medium" for deeper constraint diagnosis',
      'Guarantees finalCommittedChanges = {} when preconditions are not met',
    ],
    codeSnippet: `const retry = await ai.interactions.create({
  model: 'gemini-4-argon',
  input: correctionPrompt,
  previous_interaction_id: initialInteraction.id,
  response_format: { type: 'text', mime_type: 'application/json', schema: PROPOSAL_JSON_SCHEMA },
  generation_config: { thinking_level: 'medium' },
});`,
  },
  {
    id: 'stage3d',
    step: 'STEP 04',
    title: 'Rigged 3D Stage & Companion Voice Synthesis',
    subtitle: 'Three.js PBR Backstage Room + Character Audio Feedback',
    modelBadge: 'gemini-3.8-flash-tts',
    apiBadge: 'RIG_* Pivot Empties',
    summary:
      'Verified state transitions immediately drive 3D pivot rigs (RIG_locker_door, RIG_stage_door_L/R), 5 dynamic concert lighting modes, procedural Web Audio SFX, and companion TTS voice synthesis.',
    highlights: [
      'Real-scale 3D backstage green room with 12 raycastable props & rigged characters',
      '5 lighting modes: BACKSTAGE_CRISIS → LOCKER_OPENED → READY_FOR_STAGE → ENDING_A/B',
      'Companion voice synthesis + Web Audio procedural sound effects per ActionType',
    ],
    codeSnippet: `// Rigged pivot doors driven by authoritative WorldState flags
lockerDoorPivot.rotation.y = worldState.lockerUnlocked ? -Math.PI * 0.62 : 0;
stageDoorLeftPivot.rotation.y = worldState.stageDoorOpen ? -Math.PI * 0.55 : 0;`,
  },
  {
    id: 'webtoon',
    step: 'STEP 05',
    title: 'Long-Decode 10-Cut Webtoon Serialization Studio',
    subtitle: 'Single-Pass 10-Cut Storyboard + 10 Art Styles + 2K Strip Export',
    modelBadge: 'gemini-4-argon + gemini-nano-banana-2.1',
    apiBadge: 'thinking_level: "medium" · max_output_tokens: 16384',
    summary:
      'Leverages Gemini 4 Argon Long-Decode generation to synthesize the entire 10-cut vertical-scroll episode in a single pass from the verified playthrough log, paired with 10 Naver Webtoon visual styles and a 2K (2000×12800) stitched PNG export.',
    highlights: [
      'Single-shot 10-cut episode generation (GeneratedWebtoonEpisodeSchema)',
      '10 distinct Naver Webtoon visual presets + AI 4-panel quadrant slicing',
      'One-click 2K (2000×12800 px) single vertical strip PNG download',
    ],
    codeSnippet: `const interaction = await ai.interactions.create({
  model: 'gemini-4-argon',
  input: webtoonStoryboardPrompt,
  response_format: { type: 'text', mime_type: 'application/json', schema: WEBTOON_EPISODE_JSON_SCHEMA },
  generation_config: { thinking_level: 'medium', max_output_tokens: 16384 },
});`,
  },
];

export const VerificationInspector: React.FC<{
  initialTab?: 'traces' | 'architecture';
}> = ({ initialTab = 'traces' }) => {
  const [activeTab, setActiveTab] = useState<'traces' | 'architecture'>(
    initialTab
  );
  const [selectedNodeId, setSelectedNodeId] = useState<string>('director');

  const worldState = useGameStore((s) => s.worldState);
  const verificationHistory = useGameStore((s) => s.verificationHistory);

  const traces =
    verificationHistory.length > 0
      ? verificationHistory
      : worldState?.lastVerificationTrace
        ? [worldState.lastVerificationTrace]
        : [];

  const activeNode =
    PIPELINE_NODES.find((n) => n.id === selectedNodeId) ?? PIPELINE_NODES[0];

  return (
    <div className="space-y-3.5 text-xs">
      {/* Interactive Mode Switcher: Live Trace vs Architecture Walkthrough */}
      <div className="grid grid-cols-2 gap-1.5 p-1 rounded-xl bg-slate-900/90 border border-slate-800">
        <button
          type="button"
          onClick={() => setActiveTab('traces')}
          className={`flex items-center justify-center gap-1.5 py-1.5 px-2 rounded-lg text-[11px] font-semibold transition cursor-pointer ${
            activeTab === 'traces'
              ? 'bg-fuchsia-950/80 text-fuchsia-200 border border-fuchsia-500/40 shadow-sm'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
          <span>실시간 검증 로그 ({traces.length})</span>
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('architecture')}
          className={`flex items-center justify-center gap-1.5 py-1.5 px-2 rounded-lg text-[11px] font-semibold transition cursor-pointer ${
            activeTab === 'architecture'
              ? 'bg-indigo-950/80 text-indigo-200 border border-indigo-400/40 shadow-sm'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <Layers className="w-3.5 h-3.5 text-amber-300" />
          <span>아키텍처 파이프라인</span>
        </button>
      </div>

      {activeTab === 'architecture' ? (
        <div className="space-y-3">
          <div className="p-3 rounded-xl bg-gradient-to-br from-indigo-950/60 to-fuchsia-950/50 border border-indigo-400/30">
            <div className="flex items-center justify-between gap-2 mb-1">
              <div className="flex items-center gap-1.5 text-indigo-200 font-semibold">
                <Sparkles className="w-3.5 h-3.5 text-amber-300" />
                <span>Gemini 4 Argon Architecture Walkthrough</span>
              </div>
              <span className="px-1.5 py-0.5 rounded bg-indigo-900/70 border border-indigo-400/30 font-mono text-[9px] text-indigo-200">
                @google/genai Interactions API
              </span>
            </div>
            <p className="text-[11px] text-slate-300 leading-relaxed">
              아래 파이프라인 단계를 클릭하면 <code className="text-amber-200">gemini-4-argon</code>의 단계별{' '}
              <code className="text-fuchsia-300">thinking_level</code> 에스컬레이션,{' '}
              <code className="text-cyan-300">previous_interaction_id</code> 체이닝, 결정론적 상태 검증기 코드를 확인할 수 있습니다.
            </p>
          </div>

          {/* Interactive Stepper Nodes */}
          <div className="space-y-1.5">
            {PIPELINE_NODES.map((node, index) => {
              const isSelected = node.id === activeNode.id;
              return (
                <button
                  key={node.id}
                  type="button"
                  onClick={() => setSelectedNodeId(node.id)}
                  className={`w-full text-left p-2.5 rounded-xl border transition cursor-pointer flex items-start justify-between gap-2 ${
                    isSelected
                      ? 'bg-slate-900 border-amber-300/60 shadow-md'
                      : 'bg-slate-950/70 border-slate-800/90 hover:border-slate-700'
                  }`}
                >
                  <div className="space-y-0.5 min-w-0">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className="px-1.5 py-0.5 rounded bg-slate-800 font-mono text-[9px] font-bold text-amber-300">
                        {node.step}
                      </span>
                      <span className="font-bold text-slate-100 text-[11px] truncate">
                        {node.title}
                      </span>
                    </div>
                    <div className="text-[10px] text-slate-400 truncate">
                      {node.subtitle}
                    </div>
                  </div>
                  <div className="flex items-center gap-1 shrink-0 mt-0.5">
                    <span className="px-1.5 py-0.5 rounded bg-fuchsia-950/70 border border-fuchsia-500/30 font-mono text-[9px] text-fuchsia-200">
                      {index === 0
                        ? 'low'
                        : index === 1
                          ? 'rule'
                          : index === 2
                            ? 'medium'
                            : index === 3
                              ? '3D+TTS'
                              : '16K out'}
                    </span>
                    <ArrowRight
                      className={`w-3.5 h-3.5 transition ${
                        isSelected
                          ? 'text-amber-300 translate-x-0.5'
                          : 'text-slate-600'
                      }`}
                    />
                  </div>
                </button>
              );
            })}
          </div>

          {/* Selected Node Deep-Dive Card */}
          <div className="p-3 rounded-xl bg-slate-900/95 border border-slate-700/80 space-y-2.5">
            <div className="flex items-center justify-between gap-2 flex-wrap border-b border-slate-800 pb-2">
              <span className="font-mono text-[10px] px-2 py-0.5 rounded bg-fuchsia-950 text-fuchsia-200 border border-fuchsia-500/40 font-semibold">
                {activeNode.modelBadge}
              </span>
              <span className="font-mono text-[10px] px-2 py-0.5 rounded bg-cyan-950 text-cyan-200 border border-cyan-500/40">
                {activeNode.apiBadge}
              </span>
            </div>

            <p className="text-[11px] text-slate-200 leading-relaxed">
              {activeNode.summary}
            </p>

            <ul className="space-y-1 text-[10px] text-slate-300">
              {activeNode.highlights.map((item, idx) => (
                <li key={idx} className="flex items-start gap-1.5">
                  <CheckCircle2 className="w-3 h-3 text-emerald-400 shrink-0 mt-0.5" />
                  <span>{item}</span>
                </li>
              ))}
            </ul>

            <div>
              <div className="text-[9px] uppercase tracking-wider text-slate-400 mb-1 font-mono">
                Implementation Contract
              </div>
              <pre className="p-2.5 rounded-lg bg-slate-950 border border-slate-800 font-mono text-[10px] text-emerald-300 overflow-x-auto leading-relaxed">
                {activeNode.codeSnippet}
              </pre>
            </div>
          </div>

          {/* Model Family Summary Matrix */}
          <div className="p-3 rounded-xl bg-slate-900/80 border border-slate-800 space-y-2">
            <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
              Multi-Model Orchestration Stack
            </div>
            <div className="grid grid-cols-1 gap-1.5 text-[10px]">
              <div className="p-2 rounded bg-slate-950 border border-slate-800 flex items-center justify-between">
                <span className="flex items-center gap-1.5 text-slate-200 font-medium">
                  <Cpu className="w-3.5 h-3.5 text-fuchsia-400" />
                  gemini-4-argon
                </span>
                <span className="font-mono text-fuchsia-300">
                  Story Director + 10-Cut Long-Decode
                </span>
              </div>
              <div className="p-2 rounded bg-slate-950 border border-slate-800 flex items-center justify-between">
                <span className="flex items-center gap-1.5 text-slate-200 font-medium">
                  <BookOpen className="w-3.5 h-3.5 text-amber-300" />
                  gemini-nano-banana-2.1
                </span>
                <span className="font-mono text-amber-200">
                  2K 4-Panel Webtoon Keyframes
                </span>
              </div>
              <div className="p-2 rounded bg-slate-950 border border-slate-800 flex items-center justify-between">
                <span className="flex items-center gap-1.5 text-slate-200 font-medium">
                  <Volume2 className="w-3.5 h-3.5 text-cyan-300" />
                  gemini-3.8-flash-tts + WebAudio
                </span>
                <span className="font-mono text-cyan-200">
                  Character Voice &amp; Stage SFX
                </span>
              </div>
              <div className="p-2 rounded bg-slate-950 border border-slate-800 flex items-center justify-between">
                <span className="flex items-center gap-1.5 text-slate-200 font-medium">
                  <Lock className="w-3.5 h-3.5 text-emerald-400" />
                  validateAction.ts
                </span>
                <span className="font-mono text-emerald-300">
                  Deterministic Precondition Engine
                </span>
              </div>
            </div>
          </div>
        </div>
      ) : (
        <>
          <div className="p-3 rounded-xl bg-gradient-to-br from-fuchsia-950/50 to-indigo-950/50 border border-fuchsia-500/30">
            <div className="flex items-center gap-2 text-fuchsia-300 font-semibold mb-1">
              <ShieldCheck className="w-4 h-4 text-emerald-400" />
              <span>Deterministic Verification &amp; Correction Loop</span>
            </div>
            <p className="text-[11px] text-slate-300 leading-relaxed">
              Gemini 4 Argon (<code className="text-fuchsia-300">gemini-4-argon</code>) proposes structured actions with{' '}
              <code className="text-cyan-300">thinking_level: &quot;low&quot;</code>, while canonical world rules validate every state transition. Rejected proposals chain{' '}
              <code className="text-amber-200">previous_interaction_id</code> and escalate to{' '}
              <code className="text-amber-200">thinking_level: &quot;medium&quot;</code> (up to 2 retries).
            </p>
          </div>

          {/* Live Authoritative World Flags */}
          {worldState && (
            <div className="p-3 rounded-xl bg-slate-900/80 border border-slate-800">
              <div className="flex items-center justify-between mb-2">
                <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                  Canonical World Flags
                </span>
                <span className="font-mono text-[10px] px-2 py-0.5 rounded bg-purple-950 text-purple-300 border border-purple-700/40">
                  Turn #{worldState.turnCount}
                </span>
              </div>
              <div className="grid grid-cols-2 gap-1.5 font-mono text-[11px]">
                <FlagBadge
                  label="cardDiscovered"
                  value={worldState.cardDiscovered}
                />
                <FlagBadge
                  label="hasAccessCard"
                  value={worldState.hasAccessCard}
                />
                <FlagBadge
                  label="lockerUnlocked"
                  value={worldState.lockerUnlocked}
                />
                <FlagBadge
                  label="hasMicrophone"
                  value={worldState.hasMicrophone}
                />
                <FlagBadge
                  label="hanaHasMic"
                  value={worldState.hanaHasMicrophone}
                />
                <FlagBadge
                  label="acousticBackup"
                  value={worldState.acousticBackupApproved}
                />
                <FlagBadge
                  label="stageDoorOpen"
                  value={worldState.stageDoorOpen}
                />
                <div className="px-2 py-1 rounded bg-slate-950/90 border border-slate-800 flex items-center justify-between">
                  <span className="text-slate-400">ending</span>
                  <span className="text-fuchsia-300 font-semibold">
                    {worldState.endingReached}
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* Trace History */}
          {traces.length === 0 ? (
            <div className="p-6 rounded-xl bg-slate-900/50 border border-slate-800/80 text-center text-slate-400">
              <Terminal className="w-6 h-6 mx-auto mb-2 text-slate-500" />
              <p className="font-medium text-slate-300">
                No AI Action Traces Yet
              </p>
              <p className="text-[11px] mt-1">
                Click a 3D object or press the <b className="text-amber-200">[G 규칙 가드 테스트]</b> choice button to inspect the live Gemini 4 Argon verification &amp; correction loop.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {traces.map((trace, idx) => (
                <div
                  key={trace.id || idx}
                  className="p-3 rounded-xl bg-slate-900/90 border border-slate-800 space-y-2.5"
                >
                  <div className="flex items-center justify-between border-b border-slate-800 pb-2 gap-1 flex-wrap">
                    <div className="flex items-center gap-1.5">
                      <Cpu className="w-3.5 h-3.5 text-fuchsia-400" />
                      <span className="font-mono text-[11px] text-fuchsia-300 font-semibold">
                        {trace.modelUsed}
                      </span>
                      <span className="text-[10px] text-slate-500">
                        ({trace.latencyMs}ms)
                      </span>
                    </div>
                    {trace.initialValidation.accepted ? (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-950 text-emerald-300 border border-emerald-500/40">
                        <CheckCircle2 className="w-3 h-3" /> VERIFIED PASS
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-amber-950 text-amber-300 border border-amber-500/40">
                        <RefreshCw className="w-3 h-3" /> REJECTED &amp; CORRECTED
                      </span>
                    )}
                  </div>

                  {/* Interactions API Telemetry Badges (thinking_level & interactionId) */}
                  <div className="flex items-center gap-1.5 flex-wrap font-mono text-[10px]">
                    <span className="px-2 py-0.5 rounded bg-slate-950 border border-slate-800 text-cyan-300">
                      thinking_level:{' '}
                      <b>
                        {trace.correctionAttempts.length > 0
                          ? 'low → medium'
                          : trace.thinkingLevelUsed ?? 'low'}
                      </b>
                    </span>
                    {trace.interactionId && (
                      <span className="px-2 py-0.5 rounded bg-slate-950 border border-slate-800 text-slate-400 truncate max-w-[200px]">
                        id: {trace.interactionId}
                      </span>
                    )}
                  </div>

                  <div>
                    <div className="text-[10px] uppercase tracking-wider text-slate-400 mb-0.5">
                      1. Player Input
                    </div>
                    <div className="p-2 rounded bg-slate-950 border border-slate-800 text-slate-200 font-medium">
                      &ldquo;{trace.playerInput}&rdquo;
                    </div>
                  </div>

                  {trace.initialProposal && (
                    <div>
                      <div className="text-[10px] uppercase tracking-wider text-slate-400 mb-0.5">
                        2. Gemini 4 Argon Initial Proposal (thinking_level: low)
                      </div>
                      <div className="p-2 rounded bg-slate-950 border border-slate-800 font-mono text-[10px] text-cyan-300 overflow-x-auto">
                        <div>
                          actionType: <b>{trace.initialProposal.actionType}</b>{' '}
                          | targetId: <b>{trace.initialProposal.targetId}</b>
                        </div>
                        <div>
                          proposedChanges:{' '}
                          {JSON.stringify(
                            trace.initialProposal.proposedStateChanges
                          )}
                        </div>
                      </div>
                    </div>
                  )}

                  <div>
                    <div className="text-[10px] uppercase tracking-wider text-slate-400 mb-0.5">
                      3. Deterministic Validator Result
                    </div>
                    <div
                      className={`p-2 rounded border text-[11px] ${
                        trace.initialValidation.accepted
                          ? 'bg-emerald-950/30 border-emerald-500/30 text-emerald-200'
                          : 'bg-rose-950/40 border-rose-500/40 text-rose-200'
                      }`}
                    >
                      <div className="flex items-start gap-1.5">
                        {trace.initialValidation.accepted ? (
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0 mt-0.5" />
                        ) : (
                          <XCircle className="w-3.5 h-3.5 text-rose-400 shrink-0 mt-0.5" />
                        )}
                        <span>{trace.initialValidation.explanation}</span>
                      </div>
                    </div>
                  </div>

                  {trace.correctionAttempts.length > 0 && (
                    <div className="space-y-1.5">
                      <div className="text-[10px] uppercase tracking-wider text-amber-300 font-semibold flex items-center justify-between">
                        <span>
                          4. Stateful Self-Correction Loop (
                          {trace.correctionAttempts.length} Retry)
                        </span>
                        <span className="font-mono text-[9px] text-amber-200/90">
                          thinking_level: medium
                        </span>
                      </div>
                      {trace.correctionAttempts.map((attempt) => (
                        <div
                          key={attempt.attemptNumber}
                          className="p-2 rounded bg-amber-950/25 border border-amber-500/30 text-[10px] space-y-1"
                        >
                          <div className="text-amber-200 font-mono flex items-center justify-between flex-wrap gap-1">
                            <span>
                              Retry #{attempt.attemptNumber} → Corrected to{' '}
                              <b>
                                {attempt.correctedProposal?.actionType ??
                                  'FALLBACK'}
                              </b>
                            </span>
                            <span className="px-1.5 py-0.5 rounded bg-amber-950/80 border border-amber-500/40 text-[9px]">
                              thinking: {attempt.thinkingLevel ?? 'medium'}
                            </span>
                          </div>
                          {attempt.previousInteractionId && (
                            <div className="flex items-center gap-1 font-mono text-[9px] text-cyan-300/90">
                              <GitBranch className="w-3 h-3 shrink-0" />
                              <span className="truncate">
                                previous_interaction_id:{' '}
                                {attempt.previousInteractionId}
                              </span>
                            </div>
                          )}
                          {attempt.correctedProposal && (
                            <div className="text-slate-300 italic pt-0.5">
                              &ldquo;{attempt.correctedProposal.npcResponse}
                              &rdquo;
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  )}

                  <div>
                    <div className="text-[10px] uppercase tracking-wider text-slate-400 mb-0.5">
                      5. Committed State Mutation
                    </div>
                    <pre className="p-2 rounded bg-slate-950 border border-slate-800 font-mono text-[10px] text-emerald-300 overflow-x-auto">
                      {Object.keys(trace.finalCommittedChanges).length > 0
                        ? JSON.stringify(trace.finalCommittedChanges, null, 2)
                        : '{} // No state flags mutated (Protected)'}
                    </pre>
                  </div>
                </div>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
};

function FlagBadge({ label, value }: { label: string; value: boolean }) {
  return (
    <div
      className={`px-2 py-1 rounded border flex items-center justify-between ${
        value
          ? 'bg-emerald-950/40 border-emerald-500/40 text-emerald-200'
          : 'bg-slate-950/80 border-slate-800 text-slate-400'
      }`}
    >
      <span className="truncate">{label}</span>
      <span className={value ? 'text-emerald-400 font-bold' : 'text-slate-600'}>
        {value ? 'TRUE' : 'FALSE'}
      </span>
    </div>
  );
}
