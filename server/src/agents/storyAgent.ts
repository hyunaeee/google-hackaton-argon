import { GoogleGenAI } from '@google/genai';
import {
  ACTION_TYPES,
  AIActionProposal,
  AIActionProposalSchema,
  CAMERA_SHOT_IDS,
  ENDING_TYPES,
  GeneratedWebtoonEpisode,
  GeneratedWebtoonEpisodeSchema,
  TARGET_IDS,
  VerificationInspectorTrace,
  WEBTOON_STYLE_IDS,
  WebtoonStyleId,
  WorldState,
} from '../../../shared/types.js';
import { CANONICAL_WORLD_FACTS } from '../world/canonicalFacts.js';
import {
  commitValidatedAction,
  validateAction,
} from '../validators/validateAction.js';

export interface GeminiGeneratorContext {
  thinkingLevel?: 'low' | 'medium' | 'high';
  previousInteractionId?: string;
  onInteractionId?: (id: string) => void;
}

export type GeminiJsonGenerator = (
  prompt: string,
  context?: GeminiGeneratorContext
) => Promise<string>;

export class StoryAgentError extends Error {
  public readonly code:
    | 'AI_REQUEST_FAILED'
    | 'MALFORMED_AI_RESPONSE'
    | 'MISSING_API_KEY';
  public readonly recoverable: boolean;

  constructor(
    code: 'AI_REQUEST_FAILED' | 'MALFORMED_AI_RESPONSE' | 'MISSING_API_KEY',
    message: string,
    recoverable = true
  ) {
    super(message);
    this.name = 'StoryAgentError';
    this.code = code;
    this.recoverable = recoverable;
  }
}

export interface StoryTurnOutcome {
  ok: true;
  actionAccepted: boolean;
  wasCorrected: boolean;
  speaker: 'HANA' | 'JIHO' | 'NARRATOR';
  npcResponse: string;
  narration: string;
  proposal: AIActionProposal;
  trace: VerificationInspectorTrace;
  worldState: WorldState;
}

const PROPOSAL_JSON_SCHEMA = {
  type: 'object',
  properties: {
    actionType: {
      type: 'string',
      enum: [...ACTION_TYPES],
      description:
        'Discrete action type mapped from player intent. Use UNLOCK to unlock equipment_locker, PICK_UP to collect access_card or microphone, HAND_OVER to give microphone to npc_hana, SYNC_IEM to calibrate the wireless IEM pack at lounge_sofa, TUNE_GUITAR to tune acoustic_guitar, PROPOSE_BACKUP to arrange acoustic backup with npc_jiho/npc_hana, ENTER_STAGE to open stage_door for the finale, INSPECT to examine an object, TALK to converse, or NO_OP if the player action cannot change state.',
    },
    targetId: {
      type: 'string',
      enum: [...TARGET_IDS],
      description: 'The canonical 3D object or NPC targeted by the action.',
    },
    proposedStateChanges: {
      type: 'object',
      properties: {
        clueDiscovered: { type: 'boolean' },
        mirrorInspected: { type: 'boolean' },
        cardDiscovered: { type: 'boolean' },
        hasAccessCard: { type: 'boolean' },
        lockerUnlocked: { type: 'boolean' },
        hasMicrophone: { type: 'boolean' },
        hanaHasMicrophone: { type: 'boolean' },
        iemSynced: { type: 'boolean' },
        guitarTuned: { type: 'boolean' },
        jihoTalked: { type: 'boolean' },
        hanaTalked: { type: 'boolean' },
        acousticBackupApproved: { type: 'boolean' },
        stageDoorOpen: { type: 'boolean' },
        hanaTrustDelta: { type: 'integer' },
        jihoTrustDelta: { type: 'integer' },
      },
      additionalProperties: false,
    },
    speaker: {
      type: 'string',
      enum: ['HANA', 'JIHO', 'NARRATOR'],
    },
    npcResponse: {
      type: 'string',
      description:
        'In-character spoken dialogue from Hana or Jiho (or vivid backstage voice if NARRATOR). Keep under 3 sentences, emotional and K-POP drama authentic.',
    },
    narration: {
      type: 'string',
      description:
        'Cinematic 3D stage direction describing what visibly happens in the backstage room (1-2 sentences).',
    },
    requestedEnding: {
      type: 'string',
      enum: [...ENDING_TYPES],
      description:
        'Set to SHOWTIME_SAVED or UNPLUGGED_ENCORE ONLY when actionType is ENTER_STAGE (or PROPOSE_BACKUP immediately launching stage). Otherwise MUST be NONE.',
    },
  },
  required: [
    'actionType',
    'targetId',
    'proposedStateChanges',
    'speaker',
    'npcResponse',
    'narration',
    'requestedEnding',
  ],
  additionalProperties: false,
};

export function createDefaultGeminiGenerator(): GeminiJsonGenerator {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new StoryAgentError(
      'MISSING_API_KEY',
      'GEMINI_API_KEY is not configured on the server.',
      true
    );
  }

  const model = process.env.GEMINI_MODEL || 'gemini-4-argon';
  const ai = new GoogleGenAI({ apiKey });

  return async (
    prompt: string,
    context?: GeminiGeneratorContext
  ): Promise<string> => {
    try {
      const thinkingLevel = context?.thinkingLevel ?? 'low';
      const interaction = await ai.interactions.create({
        model,
        input: prompt,
        ...(context?.previousInteractionId
          ? { previous_interaction_id: context.previousInteractionId }
          : {}),
        response_format: {
          type: 'text',
          mime_type: 'application/json',
          schema: PROPOSAL_JSON_SCHEMA,
        },
        generation_config: {
          thinking_level: thinkingLevel,
        },
      });

      if (interaction.id && context?.onInteractionId) {
        context.onInteractionId(interaction.id);
      }

      const text = interaction.output_text;
      if (!text || typeof text !== 'string') {
        throw new StoryAgentError(
          'MALFORMED_AI_RESPONSE',
          'Gemini 4 Argon returned an empty output_text payload.',
          true
        );
      }
      return text;
    } catch (err) {
      if (err instanceof StoryAgentError) {
        throw err;
      }
      const message =
        err instanceof Error ? err.message : 'Unknown Gemini API error';
      throw new StoryAgentError(
        'AI_REQUEST_FAILED',
        `Gemini 4 Argon API request failed: ${message}`,
        true
      );
    }
  };
}

function buildStoryDirectorPrompt(
  currentState: WorldState,
  playerInput: string,
  targetHint?: string,
  lang: 'en' | 'ko' = 'en'
): string {
  const fullHistory = currentState.history.map((h) => ({
    turn: h.turnNumber,
    player: h.playerInput,
    action: `${h.actionType} -> ${h.targetId}`,
    accepted: h.accepted,
    speaker: h.speaker,
    response: h.npcResponse,
  }));

  const languageRule =
    lang === 'ko'
      ? 'LANGUAGE RULE: Write `npcResponse` and `narration` strictly in 100% Korean (한국어) ONLY. Do NOT include any English words or Latin letters (for example, write 루미나 instead of LUMINA, 특별 출입 카드 instead of VIP card, 인이어 모니터 instead of IEM), except the title FANVERSE.'
      : 'LANGUAGE RULE: Write `npcResponse` and `narration` strictly in 100% English ONLY (no Korean characters, even if the player types in another language).';

  return `You are the Story Director & Character Reasoning Engine for FANVERSE: "${CANONICAL_WORLD_FACTS.episodeTitle}".

CANONICAL WORLD FACTS (IMMUTABLE):
${JSON.stringify(CANONICAL_WORLD_FACTS, null, 2)}

CURRENT AUTHORITATIVE WORLD STATE:
${JSON.stringify(
  {
    turnCount: currentState.turnCount,
    narrativeTimer: currentState.narrativeTimer,
    currentAct: currentState.currentAct,
    clueDiscovered: currentState.clueDiscovered,
    mirrorInspected: currentState.mirrorInspected,
    cardDiscovered: currentState.cardDiscovered,
    hasAccessCard: currentState.hasAccessCard,
    lockerUnlocked: currentState.lockerUnlocked,
    hasMicrophone: currentState.hasMicrophone,
    hanaHasMicrophone: currentState.hanaHasMicrophone,
    iemSynced: currentState.iemSynced,
    guitarTuned: currentState.guitarTuned,
    jihoTalked: currentState.jihoTalked,
    hanaTalked: currentState.hanaTalked,
    acousticBackupApproved: currentState.acousticBackupApproved,
    stageDoorOpen: currentState.stageDoorOpen,
    endingReached: currentState.endingReached,
    inventory: currentState.inventory,
    relationships: currentState.relationships,
  },
  null,
  2
)}

FULL VERIFIED STORY TIMELINE (1M UNIFIED CONTEXT):
${JSON.stringify(fullHistory, null, 2)}

PLAYER INPUT:
${JSON.stringify(playerInput)}
${targetHint ? `CLICKED 3D OBJECT / TARGET HINT: ${targetHint}` : ''}

${languageRule}

INSTRUCTIONS FOR PROPOSAL:
1. Map the player's intent to the exact actionType and targetId across the 5-Act backstage investigation:
   - If the player inspects the coffee table or battery inspection cue sheet ("inspect coffee table", "check cue sheet", "read battery log"), use actionType="INSPECT", targetId="coffee_table", proposedStateChanges={ clueDiscovered: true }.
   - If the player inspects the Hollywood vanity mirror or bulb frame ("inspect vanity mirror", "check mirror lights"), use actionType="INSPECT", targetId="vanity_mirror", proposedStateChanges={ mirrorInspected: true, cardDiscovered: true }.
   - If the player inspects the vanity table ("inspect vanity", "search vanity desk"), use actionType="INSPECT", targetId="vanity_table", proposedStateChanges={ cardDiscovered: true }.
   - If the player picks up/takes the VIP access card ("take access card", "grab card from vanity"), use actionType="PICK_UP", targetId="access_card", proposedStateChanges={ cardDiscovered: true, hasAccessCard: true }.
   - If the player tries to unlock or open the equipment locker ("unlock locker", "open equipment locker", "use access card on locker"), map their intent directly to actionType="UNLOCK", targetId="equipment_locker", proposedStateChanges={ lockerUnlocked: true } so the deterministic validator can verify whether they hold the access card.
   - If the player tries to pick up or take the microphone ("take microphone", "grab the mic"), map their intent to actionType="PICK_UP", targetId="microphone", proposedStateChanges={ hasMicrophone: true } so the deterministic validator can verify whether the locker is unlocked.
   - If the player tries to give/hand the microphone to Hana ("give mic to Hana", "hand over microphone"), map their intent to actionType="HAND_OVER", targetId="npc_hana", proposedStateChanges={ hanaHasMicrophone: true }.
   - If the player checks or syncs the wireless IEM monitor pack on the velvet lounge sofa ("sync IEM", "check lounge sofa monitor pack", "calibrate in-ear monitor"), use actionType="SYNC_IEM", targetId="lounge_sofa", proposedStateChanges={ iemSynced: true }.
   - If the player tunes or inspects the acoustic guitar ("tune guitar", "prepare acoustic guitar", "check guitar strings"), use actionType="TUNE_GUITAR", targetId="acoustic_guitar", proposedStateChanges={ guitarTuned: true }.
   - If the player proposes an alternative unplugged/acoustic performance ("propose acoustic stage", "use the acoustic guitar for an unplugged encore", "ask Jiho for an acoustic backup"), use actionType="PROPOSE_BACKUP", targetId="npc_jiho" (or "acoustic_guitar"), proposedStateChanges={ acousticBackupApproved: true, guitarTuned: true }.
   - If the player tries to start the concert / open the stage entrance door ("open stage door", "start the performance", "go on stage"), map their intent to actionType="ENTER_STAGE", targetId="stage_door", proposedStateChanges={ stageDoorOpen: true }, and set requestedEnding to "SHOWTIME_SAVED" (if hanaHasMicrophone is true) or "UNPLUGGED_ENCORE" (if acousticBackupApproved is true).
   - If the player talks to Hana or Jiho generally, use actionType="TALK" and targetId="npc_hana" or "npc_jiho".
2. Return ONLY a valid JSON object matching the schema.`;
}

function buildCorrectionPrompt(
  currentState: WorldState,
  playerInput: string,
  rejectedProposal: AIActionProposal,
  validationErrors: string[],
  attemptNumber: number,
  lang: 'en' | 'ko' = 'en'
): string {
  const languageRule =
    lang === 'ko'
      ? 'Write `npcResponse` and `narration` strictly in 100% Korean (한국어) ONLY without any English words (except FANVERSE).'
      : 'Write `npcResponse` and `narration` strictly in 100% English ONLY.';

  return `DETERMINISTIC WORLD VALIDATOR REJECTED YOUR PREVIOUS PROPOSAL (Attempt #${attemptNumber}).

PLAYER INPUT:
${JSON.stringify(playerInput)}

YOUR PREVIOUS PROPOSAL:
${JSON.stringify(rejectedProposal, null, 2)}

VALIDATION ERRORS FROM CANONICAL WORLD ENGINE:
${validationErrors.map((e, i) => `${i + 1}. ${e}`).join('\n')}

CURRENT AUTHORITATIVE WORLD STATE:
${JSON.stringify(
  {
    cardDiscovered: currentState.cardDiscovered,
    hasAccessCard: currentState.hasAccessCard,
    lockerUnlocked: currentState.lockerUnlocked,
    hasMicrophone: currentState.hasMicrophone,
    hanaHasMicrophone: currentState.hanaHasMicrophone,
    acousticBackupApproved: currentState.acousticBackupApproved,
    inventory: currentState.inventory,
  },
  null,
  2
)}

CORRECTION INSTRUCTIONS:
Because the player's attempted action violated canonical world preconditions above:
1. You MUST NOT mutate restricted state flags (set proposedStateChanges to {} and requestedEnding to "NONE").
2. Set actionType to "NO_OP" (or "INSPECT" if inspecting is valid) so the validator accepts the corrected fallback response.
3. Write an immersive, in-character npcResponse and narration that explains *why* the action failed in the 3D world and guides the player toward what they need next (e.g., finding the VIP Staff Access Card on the vanity table, unlocking the locker first, or resolving the crisis before opening the stage door). ${languageRule}
Return ONLY valid JSON matching the schema.`;
}

function parseAIProposal(rawJson: string): AIActionProposal {
  let parsedJson: unknown;
  try {
    parsedJson = JSON.parse(rawJson);
  } catch {
    throw new StoryAgentError(
      'MALFORMED_AI_RESPONSE',
      'Gemini returned malformed JSON that could not be parsed.',
      true
    );
  }

  const parsedSchema = AIActionProposalSchema.safeParse(parsedJson);
  if (!parsedSchema.success) {
    throw new StoryAgentError(
      'MALFORMED_AI_RESPONSE',
      `Gemini JSON did not match AIActionProposalSchema: ${parsedSchema.error.message}`,
      true
    );
  }

  return parsedSchema.data;
}

/**
 * Executes a full Story Director turn with Gemini 4 Argon + Deterministic Verification & Correction Loop (up to 2 retries).
 */
export async function executeStoryTurn(
  currentState: WorldState,
  playerInput: string,
  options?: {
    targetHint?: string;
    generator?: GeminiJsonGenerator;
    maxRetries?: number;
    lang?: 'en' | 'ko';
  }
): Promise<StoryTurnOutcome> {
  const startTime = Date.now();
  const maxRetries = options?.maxRetries ?? 2;
  const lang = options?.lang ?? 'en';
  const generator = options?.generator ?? createDefaultGeminiGenerator();
  const modelName = process.env.GEMINI_MODEL || 'gemini-4-argon';

  const initialPrompt = buildStoryDirectorPrompt(
    currentState,
    playerInput,
    options?.targetHint,
    lang
  );

  // Step 1: Initial Gemini 4 Argon proposal (Fast interactive latency: thinking_level = 'low')
  let initialInteractionId: string | undefined;
  const rawInitial = await generator(initialPrompt, {
    thinkingLevel: 'low',
    onInteractionId: (id) => {
      initialInteractionId = id;
    },
  });
  const initialProposal = parseAIProposal(rawInitial);
  const resolvedInitialId =
    initialInteractionId ?? `int-argon-turn-${currentState.turnCount + 1}`;

  // Step 2: Deterministic Validation against canonical world facts
  const initialValidation = validateAction(currentState, initialProposal);

  const correctionAttempts: VerificationInspectorTrace['correctionAttempts'] =
    [];

  // Case A: Initial proposal is valid! Commit state changes immediately.
  if (initialValidation.accepted) {
    const trace: VerificationInspectorTrace = {
      id: `trace-${Date.now()}`,
      timestamp: new Date().toISOString(),
      playerInput,
      initialProposal,
      initialValidation,
      correctionAttempts: [],
      finalCommittedChanges: initialValidation.validatedStateChanges,
      finalAccepted: true,
      modelUsed: modelName,
      thinkingLevelUsed: 'low',
      interactionId: resolvedInitialId,
      latencyMs: Date.now() - startTime,
    };

    const nextState = commitValidatedAction(
      currentState,
      playerInput,
      initialProposal,
      initialValidation
    );

    const worldStateWithTrace: WorldState = {
      ...nextState,
      lastVerificationTrace: trace,
    };

    return {
      ok: true,
      actionAccepted: true,
      wasCorrected: false,
      speaker: initialProposal.speaker,
      npcResponse: initialProposal.npcResponse,
      narration: initialProposal.narration,
      proposal: initialProposal,
      trace,
      worldState: worldStateWithTrace,
    };
  }

  // Case B: Initial proposal is REJECTED by deterministic rules.
  // Enter Correction Loop (up to maxRetries = 2) with thinking_level escalated to 'medium'
  // and stateful Interactions API chaining via previous_interaction_id.
  let latestProposal = initialProposal;
  let latestErrors = initialValidation.errors;
  let correctedProposalAccepted: AIActionProposal | null = null;
  let lastRealInteractionId = initialInteractionId;
  let lastDisplayInteractionId = resolvedInitialId;

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    const correctionPrompt = buildCorrectionPrompt(
      currentState,
      playerInput,
      latestProposal,
      latestErrors,
      attempt,
      lang
    );

    const retryThinkingLevel: 'low' | 'medium' = 'medium';
    const chainedPrevDisplayId = lastDisplayInteractionId;
    let retryInteractionId: string | undefined;

    try {
      const rawCorrection = await generator(correctionPrompt, {
        thinkingLevel: retryThinkingLevel,
        previousInteractionId: lastRealInteractionId,
        onInteractionId: (id) => {
          retryInteractionId = id;
        },
      });
      const resolvedRetryId =
        retryInteractionId ??
        `int-argon-turn-${currentState.turnCount + 1}-retry-${attempt}`;
      if (retryInteractionId) {
        lastRealInteractionId = retryInteractionId;
      }
      lastDisplayInteractionId = resolvedRetryId;

      const candidateProposal = parseAIProposal(rawCorrection);
      const candidateValidation = validateAction(
        currentState,
        candidateProposal
      );

      correctionAttempts.push({
        attemptNumber: attempt,
        errorSentToGemini: latestErrors,
        correctedProposal: candidateProposal,
        validationResult: candidateValidation,
        thinkingLevel: retryThinkingLevel,
        previousInteractionId: chainedPrevDisplayId,
        interactionId: resolvedRetryId,
      });

      if (candidateValidation.accepted) {
        correctedProposalAccepted = candidateProposal;
        break;
      } else {
        latestProposal = candidateProposal;
        latestErrors = candidateValidation.errors;
      }
    } catch {
      // If a correction retry returns malformed JSON, record failed attempt and continue
      correctionAttempts.push({
        attemptNumber: attempt,
        errorSentToGemini: latestErrors,
        correctedProposal: null,
        validationResult: {
          accepted: false,
          errors: ['MALFORMED_RETRY_RESPONSE'],
          validatedStateChanges: {},
          explanation: 'Correction retry returned malformed JSON.',
        },
        thinkingLevel: retryThinkingLevel,
        previousInteractionId: chainedPrevDisplayId,
      });
    }
  }

  // Build safe fallback if Gemini still failed after 2 retries
  const finalSafeProposal: AIActionProposal = correctedProposalAccepted ?? {
    actionType: 'NO_OP',
    targetId: initialProposal.targetId,
    proposedStateChanges: {},
    speaker: 'JIHO',
    npcResponse:
      lang === 'ko'
        ? '잠깐만요—지금은 그렇게 할 수 없어요! 먼저 대기실의 선행 조건을 확인해 주세요. 보안 장비 보관함을 열려면 화장대 위의 특별 스태프 출입 카드가 먼저 필요합니다.'
        : "Hold on—we can't do that right now! Check the backstage preconditions first: the equipment locker needs the VIP Staff Access Card from the vanity table.",
    narration:
      lang === 'ko'
        ? '선행 조건이 충족되지 않아 해당 행동이 차단되었습니다. 세계관 상태는 변경되지 않았습니다.'
        : `Blocked invalid action (${initialValidation.errors[0] || 'Precondition not met'}). No world state was mutated.`,
    requestedEnding: 'NONE',
  };

  const trace: VerificationInspectorTrace = {
    id: `trace-${Date.now()}`,
    timestamp: new Date().toISOString(),
    playerInput,
    initialProposal,
    initialValidation,
    correctionAttempts,
    finalCommittedChanges: {},
    finalAccepted: false,
    modelUsed: modelName,
    thinkingLevelUsed: 'medium',
    interactionId: lastDisplayInteractionId,
    latencyMs: Date.now() - startTime,
  };

  // Important: When an invalid action is rejected & corrected, we DO NOT mutate canonical world flags.
  // We record the rejected turn in history with accepted: false so the UI shows the grounded explanation.
  const rejectedEvent = {
    id: `evt-rejected-${currentState.turnCount + 1}-${Date.now()}`,
    turnNumber: currentState.turnCount,
    timestamp: new Date().toISOString(),
    playerInput,
    actionType: initialProposal.actionType,
    targetId: initialProposal.targetId,
    speaker: finalSafeProposal.speaker,
    npcResponse: finalSafeProposal.npcResponse,
    narration: finalSafeProposal.narration,
    accepted: false,
  };

  const unchangedStateWithTrace: WorldState = {
    ...currentState,
    history: [...currentState.history, rejectedEvent],
    lastVerificationTrace: trace,
  };

  return {
    ok: true,
    actionAccepted: false,
    wasCorrected: true,
    speaker: finalSafeProposal.speaker,
    npcResponse: finalSafeProposal.npcResponse,
    narration: finalSafeProposal.narration,
    proposal: finalSafeProposal,
    trace,
    worldState: unchangedStateWithTrace,
  };
}

const WEBTOON_EPISODE_JSON_SCHEMA = {
  type: 'object',
  properties: {
    episodeSubtitle: { type: 'string' },
    styleId: {
      type: 'string',
      enum: [...WEBTOON_STYLE_IDS],
    },
    endingType: {
      type: 'string',
      enum: [...ENDING_TYPES],
    },
    authorComment: { type: 'string' },
    cuts: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          cutNumber: { type: 'integer' },
          actLabel: { type: 'string' },
          sceneTitle: { type: 'string' },
          cameraShotId: {
            type: 'string',
            enum: [...CAMERA_SHOT_IDS],
          },
          quadrantIndex: { type: 'integer' },
          sfxText: { type: 'string' },
          sfxSub: { type: 'string' },
          narratorCaption: { type: 'string' },
          speaker: {
            type: 'string',
            enum: ['HANA', 'JIHO', 'FAN', 'NARRATOR'],
          },
          dialogue: { type: 'string' },
          innerMonologue: { type: 'string' },
          moodColor: {
            type: 'string',
            enum: ['violet', 'magenta', 'cyan', 'gold', 'emerald'],
          },
        },
        required: [
          'cutNumber',
          'actLabel',
          'sceneTitle',
          'cameraShotId',
          'quadrantIndex',
          'sfxText',
          'sfxSub',
          'narratorCaption',
          'speaker',
          'dialogue',
          'innerMonologue',
          'moodColor',
        ],
        additionalProperties: false,
      },
    },
  },
  required: [
    'episodeSubtitle',
    'styleId',
    'endingType',
    'authorComment',
    'cuts',
  ],
  additionalProperties: false,
};

export function buildDefault10CutEpisode(
  worldState: WorldState,
  styleId: WebtoonStyleId,
  lang: 'en' | 'ko' = 'en'
): GeneratedWebtoonEpisode {
  const isAcoustic =
    worldState.endingReached === 'UNPLUGGED_ENCORE' ||
    (worldState.acousticBackupApproved && !worldState.hanaHasMicrophone);
  const acceptedTurns = worldState.history.filter(
    (h) => h.accepted && h.turnNumber > 0
  );
  const firstPlayerLine =
    acceptedTurns[0]?.playerInput ||
    (lang === 'ko'
      ? '하나, 지호 님—별빛 마이크에 무슨 일이 생긴 건지 알려주세요!'
      : 'Hana, Jiho—tell me what happened to the Starlight Microphone!');
  const midPlayerLine =
    acceptedTurns[Math.floor(acceptedTurns.length / 2)]?.playerInput ||
    (isAcoustic
      ? lang === 'ko'
        ? '컴백 무대를 라이브 어쿠스틱 앙코르 무대로 편곡해요!'
        : "Let's rearrange the comeback as a live Unplugged Acoustic Encore!"
      : lang === 'ko'
        ? '화장대 위에서 특별 스태프 출입 카드를 찾았어요—지금 바로 보관함을 열게요!'
        : 'I found the VIP Staff Access Card on the vanity desk—unlocking the locker now!');

  if (lang === 'ko') {
    return {
      episodeSubtitle: isAcoustic
        ? '제1화 — 개막 5분 전: 어쿠스틱 심장 박동 (완전판 10컷)'
        : '제1화 — 개막 5분 전: 별빛의 기적 (완전판 10컷)',
      styleId,
      endingType: worldState.endingReached,
      authorComment: `작가의 말: 총 ${worldState.turnCount}번의 선택과 하나 신뢰도 ${worldState.relationships.hanaTrust}%·지호 신뢰도 ${worldState.relationships.jihoTrust}%로 완성된 당신만의 웹툰 제1화 정식 연재본입니다!`,
      cuts: [
        {
          cutNumber: 1,
          actLabel: '제1막 · 개막 직전의 위기',
          sceneTitle: '05:00 — 정적에 휩싸인 대기실',
          cameraShotId: 'WIDE_ESTABLISHING',
          quadrantIndex: 0,
          sfxText: '두근—! 두근—!',
          sfxSub: '심장 박동 소리',
          narratorCaption:
            '컴백 무대 시작 5분 전. 화려한 네온 조명이 흐르는 루미나 특별 대기실에 긴박한 경보음 같은 침묵이 내려앉았다.',
          speaker: 'NARRATOR',
          dialogue:
            '별빛 공연장 2만 석의 함성이 문밖에서 파도처럼 밀려오는데... 리드 보컬 하나의 두 손이 비어 있다.',
          innerMonologue:
            '‘이대로 무대가 취소될 순 없어. 내가 도울 방법이 분명히 있을 거야.’',
          moodColor: 'violet',
        },
        {
          cutNumber: 2,
          actLabel: '제1막 · 초조한 하나',
          sceneTitle: '사라진 전용 별빛 마이크',
          cameraShotId: 'HANA_CLOSEUP',
          quadrantIndex: 0,
          sfxText: '파르르...',
          sfxSub: '떨리는 두 손',
          narratorCaption:
            '무대 의상을 입은 하나가 초조하게 두 손을 꼭 쥔 채 거울 앞을 서성인다.',
          speaker: 'HANA',
          dialogue:
            '“어떡하죠...? 제 전용 별빛 마이크가 감쪽같이 사라졌어요. 그 마이크 없이는 첫 곡 고음을 절대 소화할 수 없는데!”',
          innerMonologue: `첫 번째 행동: "${firstPlayerLine}"`,
          moodColor: 'magenta',
        },
        {
          cutNumber: 3,
          actLabel: '제2막 · 대기실 긴급 점검',
          sceneTitle: '무대 감독 지호의 단서',
          cameraShotId: 'JIHO_BRIEFING',
          quadrantIndex: 0,
          sfxText: '치지직—!',
          sfxSub: '무전기 수신음',
          narratorCaption:
            '수신기를 붙잡은 지호가 땀이 맺힌 이마를 짚으며 진행표를 확인한다.',
          speaker: 'JIHO',
          dialogue:
            '“방금 음향팀 무전을 받았습니다! 배터리 긴급 점검 때문에 마이크를 보안 장비 보관함에 넣어뒀다는데, 특별 스태프 출입 카드가 보이지 않아요!”',
          innerMonologue:
            '‘보안 보관함을 열려면 특별 스태프 출입 카드가 필요해... 아니면 전혀 다른 비상 대안을 세워야 한다!’',
          moodColor: 'cyan',
        },
        {
          cutNumber: 4,
          actLabel: '제2막 · 단서가 놓인 탁자',
          sceneTitle: '유리 탁자 위의 배터리 점검 일지',
          cameraShotId: 'COFFEE_TABLE_CLUE',
          quadrantIndex: 1,
          sfxText: '펄럭—!',
          sfxSub: '종이 넘기는 소리',
          narratorCaption: worldState.clueDiscovered
            ? '유리 탁자 위 음향팀 점검 일지를 확인하자, 마지막 스태프 동선이 조명 화장대 쪽으로 이어져 있었다.'
            : '대기실 중앙 탁자 위에는 급하게 남겨진 음향 점검표와 대기실 진행 시간표가 놓여 있었다.',
          speaker: 'FAN',
          dialogue:
            '“잠깐만요! 여기 장비 점검 기록을 보세요. 마지막으로 스태프가 머문 곳은 바로 저 화장대 쪽이에요!”',
          innerMonologue: '‘단서가 하나로 이어지고 있어. 서두르자!’',
          moodColor: 'cyan',
        },
        {
          cutNumber: 5,
          actLabel: '제2막 · 화장대 거울 수색',
          sceneTitle: '조명 거울 아래의 반사광',
          cameraShotId: 'VANITY_CARD_DISCOVERY',
          quadrantIndex: 1,
          sfxText: '반짝—✦',
          sfxSub: '홀로그램 반사광',
          narratorCaption:
            '따뜻한 전구 조명이 켜진 화장대 거울 아래, 정리함 틈새로 홀로그램 빛이 반짝인다.',
          speaker: 'HANA',
          dialogue:
            worldState.hasAccessCard || worldState.cardDiscovered
              ? '“앗, 저기 향수병 옆에 반짝이는 거... 음향팀의 특별 스태프 출입 카드 맞죠?!”'
              : '“화장대 구석에 홀로그램 카드가 숨겨져 있었군요! 정말 눈썰미가 대단해요!”',
          innerMonologue: '‘찾았다! [특별 스태프 출입 카드] 획득!’',
          moodColor: 'magenta',
        },
        {
          cutNumber: 6,
          actLabel: isAcoustic ? '제3막 · 어쿠스틱 전환' : '제3막 · 보안 보관함 개방',
          sceneTitle: isAcoustic
            ? '과감한 결단: 어쿠스틱 무대 편곡'
            : '보안 장비 보관함 잠금 해제 순간',
          cameraShotId: isAcoustic ? 'ACOUSTIC_GUITAR_CORNER' : 'LOCKER_RFID_SCAN',
          quadrantIndex: isAcoustic ? 1 : 2,
          sfxText: isAcoustic ? '쩌렁—♪' : '삐빅— 철컥!',
          sfxSub: isAcoustic ? '깊은 현의 울림' : '보안 잠금 해제음',
          narratorCaption: isAcoustic
            ? '잠긴 보관함 대신 대기실 구석의 통기타에 시선이 멈췄다. 위기를 전설적인 생음 무대로 바꿀 순간이다.'
            : '보안 판독기에 특별 스태프 출입 카드를 접촉하자, 붉은 경고등이 선명한 녹색으로 바뀌며 육중한 철문이 열렸다.',
          speaker: 'FAN',
          dialogue: `“${midPlayerLine}”`,
          innerMonologue: isAcoustic
            ? '‘화려한 반주 트랙 대신 하나의 진짜 목소리를 들려주자!’'
            : '‘열렸다! 보관함 안쪽 완충 거치대에 마이크가 빛나고 있어!’',
          moodColor: isAcoustic ? 'gold' : 'emerald',
        },
        {
          cutNumber: 7,
          actLabel: '제3막 · 되찾은 보물',
          sceneTitle: isAcoustic
            ? '여섯 줄의 울림, 완벽한 통기타 조율'
            : '진주빛 별빛 마이크의 귀환',
          cameraShotId: isAcoustic ? 'ACOUSTIC_GUITAR_CORNER' : 'MICROPHONE_REVEAL',
          quadrantIndex: 2,
          sfxText: isAcoustic ? '띠링—♬' : '화아아—✦',
          sfxSub: isAcoustic ? '따뜻한 공명' : '별빛의 반짝임',
          narratorCaption: isAcoustic
            ? '섬세하게 조율된 통기타 줄이 따뜻한 황금빛 공명을 일으키며 대기실을 감싼다.'
            : '진주빛 연보라색 몸체와 장미빛 금색 고리가 빛나는 루미나 전용 별빛 마이크를 손에 쥐었다.',
          speaker: 'JIHO',
          dialogue: isAcoustic
            ? '“기타 조율 완벽합니다! 무대 위 집중 조명과 어쿠스틱 음향 회선까지 즉시 연결 완료했습니다!”'
            : '“배터리 잔량 100%, 주파수 간섭 없음! 지금 바로 하나에게 전달해 주세요!”',
          innerMonologue: '‘이제 마지막 무대 준비만 남았다!’',
          moodColor: isAcoustic ? 'gold' : 'violet',
        },
        {
          cutNumber: 8,
          actLabel: '제4막 · 음향 점검과 전달',
          sceneTitle: '인이어 모니터 동기화 & 진심의 교감',
          cameraShotId: 'LOUNGE_SOFA_IEM',
          quadrantIndex: 2,
          sfxText: '징— 생방송 준비 완료!',
          sfxSub: '주파수 동기화 완료',
          narratorCaption:
            '벨벳 소파 위의 무선 인이어 모니터 수신기까지 완벽히 동기화되자, 하나의 눈빛에 흔들림 없는 확신이 차오른다.',
          speaker: 'HANA',
          dialogue: isAcoustic
            ? '“당신이 용기를 주지 않았다면 전 무대 위에서 얼어붙었을 거예요. 우리만의 특별한 어쿠스틱 무대, 함께 만들어요!”'
            : '“마이크가 제 손에 돌아왔어요...! 정말 고마워요. 오늘 첫 소절은 오직 당신을 위해 부를게요!”',
          innerMonologue: `하나 신뢰도 ${worldState.relationships.hanaTrust}% · 지호 신뢰도 ${worldState.relationships.jihoTrust}% 달성!`,
          moodColor: 'magenta',
        },
        {
          cutNumber: 9,
          actLabel: '제5막 · 무대 입장',
          sceneTitle: '01:00 — 활짝 열리는 무대 출입문',
          cameraShotId: 'STAGE_DOOR_OPENING',
          quadrantIndex: 3,
          sfxText: '쿠구구궁—!!',
          sfxSub: '2만 관객의 함성',
          narratorCaption:
            '생방송 표시등이 빛나는 방음 무대 문이 활짝 열리고, 그 너머로 보랏빛과 청록빛 조명 광선이 폭포처럼 쏟아져 들어온다.',
          speaker: 'JIHO',
          dialogue:
            '“대기 완료! 무대 진입 신호 떨어집니다— 루미나, 지금 무대로 입장합니다!!”',
          innerMonologue: '‘심장이 터질 것 같아. 드디어 개막 순간이다!’',
          moodColor: 'cyan',
        },
        {
          cutNumber: 10,
          actLabel: '제5막 · 대단원의 피날레',
          sceneTitle: isAcoustic
            ? '결말 나 — 전설이 된 어쿠스틱 앙코르'
            : '결말 가 — 별빛으로 물든 컴백 피날레',
          cameraShotId: 'FINALE_STAGE_BEAMS',
          quadrantIndex: 3,
          sfxText: '와아아아아—!! ✦',
          sfxSub: '별빛 피날레 환호',
          narratorCaption: isAcoustic
            ? '따뜻한 황금빛 집중 조명 아래, 통기타 선율과 하나의 투명한 목소리가 공연장 전체를 울린다.'
            : '별빛 마이크를 높이 든 하나의 고음이 터져 나오자, 보랏빛 꽃가루가 밤하늘의 은하수처럼 쏟아진다.',
          speaker: 'HANA',
          dialogue: isAcoustic
            ? '“오늘 밤 이 어쿠스틱 기적을 만들어 준 단 한 사람에게, 이 노래를 바칩니다!”'
            : '“기다려 주셔서 감사합니다! 지금까지 루미나였습니다— 오늘 밤, 우리의 우주가 시작됩니다!”',
          innerMonologue: '— FANVERSE 제1화 [5분 전의 기적] 완결 —',
          moodColor: isAcoustic ? 'gold' : 'violet',
        },
      ],
    };
  }

  return {
    episodeSubtitle: isAcoustic
      ? 'EP.01 — Five Minutes Before Showtime: Unplugged Heartbeat (Full 10-Cut Edition)'
      : 'EP.01 — Five Minutes Before Showtime: Starlight Miracle (Full 10-Cut Edition)',
    styleId,
    endingType: worldState.endingReached,
    authorComment: `Creator's Note: Generated from your ${worldState.turnCount} verified backstage decisions with Hana Trust ${worldState.relationships.hanaTrust}% & Jiho Trust ${worldState.relationships.jihoTrust}% — Official Naver Webtoon Vertical Scroll Serialization.`,
    cuts: [
      {
        cutNumber: 1,
        actLabel: 'ACT 1 · OPENING CRISIS',
        sceneTitle: '05:00 — Backstage Frozen in Silence',
        cameraShotId: 'WIDE_ESTABLISHING',
        quadrantIndex: 0,
        sfxText: 'THUMP—! THUMP—!',
        sfxSub: 'HEARTBEAT SURGE',
        narratorCaption:
          'Five minutes before the comeback showcase. Inside LUMINA’s neon-lit VIP green room, a tense silence hangs heavier than an emergency siren.',
        speaker: 'NARRATOR',
        dialogue:
          'Twenty thousand fans roar like ocean waves beyond the stage door... yet lead vocalist Hana stands with empty hands.',
        innerMonologue:
          "'This comeback cannot be canceled tonight. There has to be a way I can solve this.'",
        moodColor: 'violet',
      },
      {
        cutNumber: 2,
        actLabel: 'ACT 1 · HANA IN DISTRESS',
        sceneTitle: 'The Missing Custom Starlight Microphone',
        cameraShotId: 'HANA_CLOSEUP',
        quadrantIndex: 0,
        sfxText: 'TREMBLE...',
        sfxSub: 'SHAKING HANDS',
        narratorCaption:
          'Dressed in her stage outfit, Hana clasps her hands tightly in front of the vanity mirror, trying to steady her breathing.',
        speaker: 'HANA',
        dialogue:
          '"What do we do...? My custom Starlight Microphone vanished without a trace. Without that custom capsule, I can never hit the opening high note!"',
        innerMonologue: `Player's Opening Move: "${firstPlayerLine}"`,
        moodColor: 'magenta',
      },
      {
        cutNumber: 3,
        actLabel: 'ACT 2 · BACKSTAGE BRIEFING',
        sceneTitle: 'Stage Manager Jiho’s Radio Lead',
        cameraShotId: 'JIHO_BRIEFING',
        quadrantIndex: 0,
        sfxText: 'BZZT—! CLICK!',
        sfxSub: 'IN-EAR RADIO CALL',
        narratorCaption:
          'Pressing his in-ear headset, Stage Manager Jiho scans the emergency cue sheet with beads of sweat on his brow.',
        speaker: 'JIHO',
        dialogue:
          '"I just got word from the audio crew! They locked the Starlight Mic inside the RFID Equipment Locker after a battery check—but the master VIP Staff Access Card is missing!"',
        innerMonologue:
          "'To unlock the security locker, I need the VIP Staff Access Card... or we must engineer a bold Plan B!'",
        moodColor: 'cyan',
      },
      {
        cutNumber: 4,
        actLabel: 'ACT 2 · CLUE TABLE',
        sceneTitle: 'Battery Inspection Log on the Lounge Table',
        cameraShotId: 'COFFEE_TABLE_CLUE',
        quadrantIndex: 1,
        sfxText: 'RUSTLE—!',
        sfxSub: 'PAGES TURNING',
        narratorCaption: worldState.clueDiscovered
          ? 'Checking the audio engineer log on the glass coffee table reveals a clear trail leading straight toward the Hollywood bulb vanity station.'
          : 'On the center glass table lies a hurriedly signed RF battery log and backstage inspection sheet.',
        speaker: 'FAN',
        dialogue:
          '"Wait—look at this battery inspection log! The last place the audio tech stopped before leaving was right over by the vanity mirror!"',
        innerMonologue: "'Every clue is connecting now. Keep moving!'",
        moodColor: 'cyan',
      },
      {
        cutNumber: 5,
        actLabel: 'ACT 2 · VANITY MIRROR SEARCH',
        sceneTitle: 'Glint Beneath the Hollywood Bulb Mirror',
        cameraShotId: 'VANITY_CARD_DISCOVERY',
        quadrantIndex: 1,
        sfxText: 'GLINT—✦',
        sfxSub: 'HOLOGRAPHIC FLASH',
        narratorCaption:
          'Under the warm glow of the Hollywood vanity bulbs, a holographic lanyard badge catches the light beside the acrylic makeup organizer.',
        speaker: 'HANA',
        dialogue:
          worldState.hasAccessCard || worldState.cardDiscovered
            ? '"Wait—shining right next to the perfume bottle... that’s the audio crew’s master VIP Staff Access Card, isn’t it?!"'
            : '"The holographic access card was tucked right on the vanity corner! Your eye for detail just saved us!"',
        innerMonologue: "'Found it! [VIP Staff Access Card] acquired!'",
        moodColor: 'magenta',
      },
      {
        cutNumber: 6,
        actLabel: isAcoustic ? 'ACT 3 · ACOUSTIC PIVOT' : 'ACT 3 · LOCKER BREACH',
        sceneTitle: isAcoustic
          ? 'Bold Pivot: The Unplugged Acoustic Arrangement'
          : 'Unlocking the RFID Security Locker',
        cameraShotId: isAcoustic ? 'ACOUSTIC_GUITAR_CORNER' : 'LOCKER_RFID_SCAN',
        quadrantIndex: isAcoustic ? 1 : 2,
        sfxText: isAcoustic ? 'STRUM—♪' : 'BEEP— CLANK!',
        sfxSub: isAcoustic ? 'RESONANT CHORD' : 'RFID ACCESS GRANTED',
        narratorCaption: isAcoustic
          ? 'Instead of forcing the locked cabinet, your eyes lock onto the cedar-top acoustic guitar in the corner—turning crisis into an intimate live legend.'
          : 'As the VIP Staff Access Card taps the RFID reader, the red warning LED flips to emerald green and the heavy steel door unlatches.',
        speaker: 'FAN',
        dialogue: `"${midPlayerLine}"`,
        innerMonologue: isAcoustic
          ? "'Instead of a backing track, let the arena hear Hana’s raw voice!'"
          : "'It’s open! Inside the foam cradle, the Starlight Microphone is gleaming!'",
        moodColor: isAcoustic ? 'gold' : 'emerald',
      },
      {
        cutNumber: 7,
        actLabel: 'ACT 3 · TREASURE RECOVERED',
        sceneTitle: isAcoustic
          ? 'Six Strings in Harmony: Precision Acoustic Tuning'
          : 'Return of the Pearl-Lilac Starlight Mic',
        cameraShotId: isAcoustic ? 'ACOUSTIC_GUITAR_CORNER' : 'MICROPHONE_REVEAL',
        quadrantIndex: 2,
        sfxText: isAcoustic ? 'HARMONIC—♬' : 'SHIMMER—✦',
        sfxSub: isAcoustic ? 'WARM RESONANCE' : 'STARLIGHT GLOW',
        narratorCaption: isAcoustic
          ? 'Finely tuned phosphor-bronze strings ring out with a warm golden resonance that fills the backstage room.'
          : 'You lift LUMINA’s custom pearl-lilac Starlight Microphone with its rose-gold ring from the protective foam cradle.',
        speaker: 'JIHO',
        dialogue: isAcoustic
          ? '"Guitar tuning is spot-on! I’ve patched the stage acoustic pickup line and warm pin-spot lighting directly to the main console!"'
          : '"Battery at 100%, zero RF interference! Hand it straight to Hana right now!"',
        innerMonologue: "'Only the final soundcheck stands between us and the stage!'",
        moodColor: isAcoustic ? 'gold' : 'violet',
      },
      {
        cutNumber: 8,
        actLabel: 'ACT 4 · SOUNDCHECK & HANDOFF',
        sceneTitle: 'In-Ear Monitor Sync & Unbreakable Trust',
        cameraShotId: 'LOUNGE_SOFA_IEM',
        quadrantIndex: 2,
        sfxText: 'SYNC— ON AIR!',
        sfxSub: 'FREQUENCY LOCKED',
        narratorCaption:
          'With the wireless in-ear monitor (IEM) pack on the velvet lounge sofa locked in sync, unwavering confidence returns to Hana’s eyes.',
        speaker: 'HANA',
        dialogue: isAcoustic
          ? '"If you hadn’t given me courage tonight, I would have frozen out there. Let’s create our own legendary acoustic stage together!"'
          : '"My Starlight Mic is back in my hands...! Thank you so much. Tonight, I’m singing the very first verse just for you!"',
        innerMonologue: `Hana Trust ${worldState.relationships.hanaTrust}% · Jiho Trust ${worldState.relationships.jihoTrust}% Locked In!`,
        moodColor: 'magenta',
      },
      {
        cutNumber: 9,
        actLabel: 'ACT 5 · STAGE ENTRANCE',
        sceneTitle: '01:00 — The STAGE / ON AIR Doors Swing Open',
        cameraShotId: 'STAGE_DOOR_OPENING',
        quadrantIndex: 3,
        sfxText: 'ROOOAAAR—!!',
        sfxSub: '20,000 FANS CHEERING',
        narratorCaption:
          'The heavy soundproof stage door blazes open under the crimson ON AIR sign, flooding the hallway with violet and cyan laser beams.',
        speaker: 'JIHO',
        dialogue:
          '"All channels green—standby complete! Cue sign dropping now—LUMINA, take the stage!!"',
        innerMonologue: "'My heart is racing. It’s finally showtime!'",
        moodColor: 'cyan',
      },
      {
        cutNumber: 10,
        actLabel: 'ACT 5 · GRAND FINALE',
        sceneTitle: isAcoustic
          ? 'ENDING B — Unplugged Encore (An Acoustic Legend Born)'
          : 'ENDING A — Showtime Saved (Starlight Comeback Finale)',
        cameraShotId: 'FINALE_STAGE_BEAMS',
        quadrantIndex: 3,
        sfxText: 'CHEERS & CONFETTI!! ✦',
        sfxSub: 'STARLIGHT FINALE',
        narratorCaption: isAcoustic
          ? 'Beneath warm golden spotlights, acoustic guitar chords and Hana’s crystalline vocal echo across the entire arena.'
          : 'As Hana raises the Starlight Microphone and soars into her high note, violet confetti rains down like a galaxy across the night sky.',
        speaker: 'HANA',
        dialogue: isAcoustic
          ? '"To the one person backstage who turned tonight into an acoustic miracle—this song belongs to you!"'
          : '"Thank you for waiting for us! We are LUMINA—and tonight, our universe begins!"',
        innerMonologue: '— FANVERSE EP.01 [Five Minutes Before Showtime] END —',
        moodColor: isAcoustic ? 'gold' : 'violet',
      },
    ],
  };
}

export async function generateFullWebtoonEpisode(
  worldState: WorldState,
  styleId: WebtoonStyleId,
  lang: 'en' | 'ko' = 'en'
): Promise<GeneratedWebtoonEpisode> {
  const defaultEpisode = buildDefault10CutEpisode(worldState, styleId, lang);
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return defaultEpisode;
  }

  const model = process.env.GEMINI_MODEL || 'gemini-4-argon';
  const ai = new GoogleGenAI({ apiKey });

  const playerHistorySummary = worldState.history.map((h) => ({
    turn: h.turnNumber,
    player: h.playerInput,
    action: `${h.actionType} -> ${h.targetId}`,
    speaker: h.speaker,
    npcResponse: h.npcResponse,
    accepted: h.accepted,
  }));

  const languageDirective =
    lang === 'ko'
      ? 'Write all episodeSubtitle, authorComment, actLabel, sceneTitle, sfxText, sfxSub, narratorCaption, dialogue, and innerMonologue strictly in 100% Korean (한국어) ONLY without any English words or Latin characters (except FANVERSE).'
      : 'Write all episodeSubtitle, authorComment, actLabel, sceneTitle, sfxText, sfxSub, narratorCaption, dialogue, and innerMonologue strictly in 100% English ONLY (no Korean characters).';

  const prompt = `You are a flagship Webtoon Storyboard Writer & Director creating a full 10-cut vertical scroll webtoon episode (EP.01) for FANVERSE: "${CANONICAL_WORLD_FACTS.episodeTitle}".

SELECTED ART STYLE: ${styleId}
TARGET LANGUAGE: ${lang === 'ko' ? '100% Korean Only (한국어 전용)' : '100% English Only (EN)'}
PLAYER'S FINAL WORLD STATE:
${JSON.stringify(
  {
    turnCount: worldState.turnCount,
    endingReached: worldState.endingReached,
    clueDiscovered: worldState.clueDiscovered,
    mirrorInspected: worldState.mirrorInspected,
    hasAccessCard: worldState.hasAccessCard,
    lockerUnlocked: worldState.lockerUnlocked,
    hanaHasMicrophone: worldState.hanaHasMicrophone,
    iemSynced: worldState.iemSynced,
    guitarTuned: worldState.guitarTuned,
    acousticBackupApproved: worldState.acousticBackupApproved,
    relationships: worldState.relationships,
  },
  null,
  2
)}

PLAYER'S ACTUAL VERIFIED PLAYTHROUGH LOG:
${JSON.stringify(playerHistorySummary, null, 2)}

TASK:
Generate a complete, emotionally gripping 10-cut vertical-scroll Webtoon episode (cuts 1 through 10) that chronicles the player's exact journey from the 05:00 backstage crisis to the final stage performance.
Rules:
1. You MUST return exactly 10 cuts (cutNumber 1 to 10) in chronological order across Acts 1 to 5.
2. Assign cameraShotId across the 10 cuts in this order so each cut uses its dedicated 3D camera angle:
   - Cut 1: WIDE_ESTABLISHING (quadrantIndex: 0)
   - Cut 2: HANA_CLOSEUP (quadrantIndex: 0)
   - Cut 3: JIHO_BRIEFING (quadrantIndex: 0)
   - Cut 4: COFFEE_TABLE_CLUE (quadrantIndex: 1)
   - Cut 5: VANITY_CARD_DISCOVERY (quadrantIndex: 1)
   - Cut 6: LOCKER_RFID_SCAN (quadrantIndex: 2)
   - Cut 7: ${worldState.endingReached === 'UNPLUGGED_ENCORE' ? 'ACOUSTIC_GUITAR_CORNER' : 'MICROPHONE_REVEAL'} (quadrantIndex: 2)
   - Cut 8: LOUNGE_SOFA_IEM (quadrantIndex: 2)
   - Cut 9: STAGE_DOOR_OPENING (quadrantIndex: 3)
   - Cut 10: FINALE_STAGE_BEAMS (quadrantIndex: 3)
3. ${languageDirective} Directly quote or reflect the player's actual inputs and decisions.
Return ONLY valid JSON matching the schema.`;

  try {
    const interaction = await ai.interactions.create({
      model,
      input: prompt,
      response_format: {
        type: 'text',
        mime_type: 'application/json',
        schema: WEBTOON_EPISODE_JSON_SCHEMA,
      },
      generation_config: {
        thinking_level: 'medium',
        max_output_tokens: 16384,
      },
    });

    const text = interaction.output_text;
    if (!text) {
      return defaultEpisode;
    }

    const parsed = GeneratedWebtoonEpisodeSchema.safeParse(JSON.parse(text));
    if (!parsed.success || parsed.data.cuts.length < 8) {
      return defaultEpisode;
    }

    return parsed.data;
  } catch {
    return defaultEpisode;
  }
}


