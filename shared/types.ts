import { z } from 'zod';

export const ACTION_TYPES = [
  'INSPECT',
  'TALK',
  'PICK_UP',
  'UNLOCK',
  'HAND_OVER',
  'PROPOSE_BACKUP',
  'SYNC_IEM',
  'TUNE_GUITAR',
  'ENTER_STAGE',
  'NO_OP',
] as const;

export type ActionType = (typeof ACTION_TYPES)[number];

export const TARGET_IDS = [
  'vanity_table',
  'vanity_mirror',
  'access_card',
  'equipment_locker',
  'microphone',
  'stage_door',
  'npc_hana',
  'npc_jiho',
  'acoustic_guitar',
  'lounge_sofa',
  'coffee_table',
  'room',
] as const;

export type TargetId = (typeof TARGET_IDS)[number];

export const ENDING_TYPES = [
  'NONE',
  'SHOWTIME_SAVED',
  'UNPLUGGED_ENCORE',
] as const;

export type EndingType = (typeof ENDING_TYPES)[number];

export const LIGHTING_MODES = [
  'BACKSTAGE_CRISIS',
  'LOCKER_OPENED',
  'READY_FOR_STAGE',
  'ENDING_A_CONCERT',
  'ENDING_B_ACOUSTIC',
] as const;

export type LightingMode = (typeof LIGHTING_MODES)[number];

export const INVENTORY_ITEMS = ['access_card', 'microphone', 'iem_pack'] as const;
export type InventoryItem = (typeof INVENTORY_ITEMS)[number];

export const WEBTOON_STYLE_IDS = [
  'ORIGINAL_3D',
  'NAVER_ROMANCE_IDOL',
  'NAVER_KPOP_DEMON_HUNTERS',
  'NAVER_HIGHTEEN_POP',
  'NAVER_SHOWBIZ_DRAMA',
  'NAVER_YOUTH_DRAMA',
  'NAVER_RETRO_PURE',
  'NAVER_CLEAN_MINIMAL',
  'NAVER_ACTION_MANHWA',
  'NAVER_DYNAMIC_BRUSH',
  'NAVER_NOIR_STAGE',
] as const;

export type WebtoonStyleId = (typeof WEBTOON_STYLE_IDS)[number];

export const CAMERA_SHOT_IDS = [
  'WIDE_ESTABLISHING',
  'HANA_CLOSEUP',
  'JIHO_BRIEFING',
  'COFFEE_TABLE_CLUE',
  'VANITY_CARD_DISCOVERY',
  'LOCKER_RFID_SCAN',
  'MICROPHONE_REVEAL',
  'LOUNGE_SOFA_IEM',
  'ACOUSTIC_GUITAR_CORNER',
  'STAGE_DOOR_OPENING',
  'FINALE_STAGE_BEAMS',
] as const;

export type CameraShotId = (typeof CAMERA_SHOT_IDS)[number];

export const WebtoonCutSchema = z.object({
  cutNumber: z.number().int().min(1).max(12),
  actLabel: z.string().min(1),
  sceneTitle: z.string().min(1),
  cameraShotId: z.enum(CAMERA_SHOT_IDS),
  quadrantIndex: z.number().int().min(0).max(3),
  sfxText: z.string().min(1),
  sfxSub: z.string().min(1),
  narratorCaption: z.string().min(1),
  speaker: z.enum(['HANA', 'JIHO', 'FAN', 'NARRATOR']),
  dialogue: z.string().min(1),
  innerMonologue: z.string().min(1),
  moodColor: z.enum(['violet', 'magenta', 'cyan', 'gold', 'emerald']),
  imageUrl: z.string().optional(),
  imagePrompt: z.string().optional(),
});

export type WebtoonCut = z.infer<typeof WebtoonCutSchema>;

export const GeneratedWebtoonEpisodeSchema = z.object({
  episodeSubtitle: z.string().min(1),
  styleId: z.enum(WEBTOON_STYLE_IDS),
  endingType: z.enum(ENDING_TYPES),
  authorComment: z.string().min(1),
  cuts: z.array(WebtoonCutSchema).min(6).max(12),
});

export type GeneratedWebtoonEpisode = z.infer<
  typeof GeneratedWebtoonEpisodeSchema
>;

export const ProposedStateChangesSchema = z.object({
  clueDiscovered: z.boolean().optional(),
  mirrorInspected: z.boolean().optional(),
  cardDiscovered: z.boolean().optional(),
  hasAccessCard: z.boolean().optional(),
  lockerUnlocked: z.boolean().optional(),
  hasMicrophone: z.boolean().optional(),
  hanaHasMicrophone: z.boolean().optional(),
  iemSynced: z.boolean().optional(),
  guitarTuned: z.boolean().optional(),
  jihoTalked: z.boolean().optional(),
  hanaTalked: z.boolean().optional(),
  acousticBackupApproved: z.boolean().optional(),
  stageDoorOpen: z.boolean().optional(),
  hanaTrustDelta: z.number().int().min(-20).max(30).optional(),
  jihoTrustDelta: z.number().int().min(-20).max(30).optional(),
});

export type ProposedStateChanges = z.infer<typeof ProposedStateChangesSchema>;

export const AIActionProposalSchema = z.object({
  actionType: z.enum(ACTION_TYPES),
  targetId: z.enum(TARGET_IDS),
  proposedStateChanges: ProposedStateChangesSchema,
  speaker: z.enum(['HANA', 'JIHO', 'NARRATOR']),
  npcResponse: z.string().min(1),
  narration: z.string().min(1),
  requestedEnding: z.enum(ENDING_TYPES).default('NONE'),
});

export type AIActionProposal = z.infer<typeof AIActionProposalSchema>;

export interface ValidationResult {
  accepted: boolean;
  errors: string[];
  validatedStateChanges: Partial<WorldState>;
  explanation: string;
}

export interface VerificationInspectorTrace {
  id: string;
  timestamp: string;
  playerInput: string;
  initialProposal: AIActionProposal | null;
  initialValidation: ValidationResult;
  correctionAttempts: Array<{
    attemptNumber: number;
    errorSentToGemini: string[];
    correctedProposal: AIActionProposal | null;
    validationResult: ValidationResult;
    thinkingLevel?: 'low' | 'medium' | 'high';
    previousInteractionId?: string;
    interactionId?: string;
  }>;
  finalCommittedChanges: Partial<WorldState>;
  finalAccepted: boolean;
  modelUsed: string;
  thinkingLevelUsed?: 'low' | 'medium' | 'high';
  interactionId?: string;
  latencyMs: number;
}

export interface StoryEventRecord {
  id: string;
  turnNumber: number;
  timestamp: string;
  playerInput: string;
  actionType: ActionType;
  targetId: TargetId;
  speaker: 'HANA' | 'JIHO' | 'NARRATOR';
  npcResponse: string;
  narration: string;
  accepted: boolean;
  milestoneTag?: 'CRISIS_START' | 'KEY_ACTION' | 'ENDING_MOMENT';
}

export interface WorldState {
  episodeId: string;
  episodeTitle: string;
  currentAct: number;
  turnCount: number;
  narrativeTimer: string;
  clueDiscovered: boolean;
  mirrorInspected: boolean;
  cardDiscovered: boolean;
  hasAccessCard: boolean;
  lockerUnlocked: boolean;
  hasMicrophone: boolean;
  hanaHasMicrophone: boolean;
  iemSynced: boolean;
  guitarTuned: boolean;
  jihoTalked: boolean;
  hanaTalked: boolean;
  acousticBackupApproved: boolean;
  stageDoorOpen: boolean;
  endingReached: EndingType;
  lightingMode: LightingMode;
  relationships: {
    hanaTrust: number;
    jihoTrust: number;
  };
  inventory: InventoryItem[];
  history: StoryEventRecord[];
  lastVerificationTrace: VerificationInspectorTrace | null;
}
