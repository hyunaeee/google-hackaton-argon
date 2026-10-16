import { WorldState } from '../../../shared/types.js';

export const CANONICAL_WORLD_FACTS = {
  episodeId: 'EP01_FIVE_MINUTES_BEFORE_SHOWTIME',
  episodeTitle: 'Episode 01 — Five Minutes Before Showtime',
  groupName: 'LUMINA',
  setting:
    'VIP Backstage Dressing Room at LUMINA’s sold-out comeback concert, five minutes before opening stage.',
  acts: [
    'ACT 1 (05:00): Backstage Crisis — Talk to Hana & inspect the Coffee Table production cue sheet.',
    'ACT 2 (04:00): Clue & Security Key — Consult Stage Manager Jiho, inspect the Hollywood Vanity Mirror, and collect the VIP Staff Access Card.',
    'ACT 3 (03:00): Equipment Recovery or Acoustic Pivot — Unlock the Flight-Case Equipment Locker, retrieve the Starlight Mic, sync the In-Ear Monitor (IEM) on the Lounge Sofa, or tune the Backstage Acoustic Guitar.',
    'ACT 4 (01:00): Final Standby — Hand the Starlight Microphone to Hana (Ending A route) or finalize the Unplugged Encore arrangement with Jiho & Hana (Ending B route).',
    'ACT 5 (00:00): Showtime Finale — Open the Main Stage Entrance Door to launch LUMINA’s comeback stage.',
  ],
  characters: {
    hana: {
      id: 'npc_hana',
      name: 'Hana',
      role: 'Lead Vocalist of LUMINA',
      personality:
        'Nervous but fiercely determined. Deeply cares about her fans and wants the comeback concert to succeed. Appreciates genuine help.',
      knowledge: [
        'Her custom pearl-lilac starlight wireless microphone is missing right before the opening stage.',
        'Her In-Ear Monitor (IEM) pack on the velvet lounge sofa also needs a quick frequency sync check.',
        'She does NOT know exact locker details of where the microphone was moved, only that stage crew checked equipment earlier.',
        'She cannot perform the main choreography stage with the missing custom microphone until the player retrieves and hands it to her.',
        'If the player and Jiho arrange an unplugged acoustic performance with the tuned backstage guitar, she is willing and excited to sing an intimate acoustic encore for the fans.',
      ],
    },
    jiho: {
      id: 'npc_jiho',
      name: 'Jiho',
      role: 'Lead Stage Manager',
      personality:
        'Professional, technical, and stressed by the five-minute countdown. Respects observant helpers and clear communication.',
      knowledge: [
        'Hana’s custom wireless microphone was placed inside the vertical tour flight-case equipment locker (equipment_locker) for a pre-show RF & battery inspection.',
        'The equipment locker is electronically locked and requires the holographic VIP Staff Access Card (access_card) to open.',
        'He left a spare VIP Staff Access Card near the Hollywood mirror on the vanity table (vanity_table) during lighting checks, and noted it on the coffee table cue sheet (coffee_table).',
        'He can immediately re-patch the stage audio console for an Alternative Unplugged Acoustic Performance (Ending B: Unplugged Encore) using the backstage acoustic guitar (acoustic_guitar) if the player proposes this backup solution.',
      ],
    },
  },
  immutableRules: [
    'The missing microphone (microphone) is inside the equipment locker (equipment_locker).',
    'A staff access card (access_card) is on the vanity table (vanity_table) near the Hollywood mirror.',
    'The equipment locker requires the access card in player inventory to unlock.',
    'The microphone cannot be collected before the equipment locker is unlocked.',
    'Hana cannot use the missing microphone until the player retrieves it and hands it over to her.',
    'Jiho can organize an alternative acoustic performance if the player proposes this backup solution.',
    'The stage entrance door (stage_door) can only trigger a final concert ending after the crisis is resolved (either Hana has her microphone for Ending A, or the acoustic backup is approved for Ending B).',
  ],
} as const;

export function createInitialWorldState(lang: 'en' | 'ko' = 'en'): WorldState {
  const isKo = lang === 'ko';
  return {
    episodeId: CANONICAL_WORLD_FACTS.episodeId,
    episodeTitle: isKo
      ? '제1화 — 개막 5분 전'
      : CANONICAL_WORLD_FACTS.episodeTitle,
    currentAct: 1,
    turnCount: 0,
    narrativeTimer: '05:00',
    clueDiscovered: false,
    mirrorInspected: false,
    cardDiscovered: false,
    hasAccessCard: false,
    lockerUnlocked: false,
    hasMicrophone: false,
    hanaHasMicrophone: false,
    iemSynced: false,
    guitarTuned: false,
    jihoTalked: false,
    hanaTalked: false,
    acousticBackupApproved: false,
    stageDoorOpen: false,
    endingReached: 'NONE',
    lightingMode: 'BACKSTAGE_CRISIS',
    relationships: {
      hanaTrust: 55,
      jihoTrust: 50,
    },
    inventory: [],
    history: [
      {
        id: 'evt-init-0',
        turnNumber: 0,
        timestamp: new Date().toISOString(),
        playerInput: isKo ? '[이야기 시작]' : '[EPISODE START]',
        actionType: 'NO_OP',
        targetId: 'room',
        speaker: 'HANA',
        npcResponse: isKo
          ? '잠깐만요—아까 대기실 모니터 옮기는 걸 도와주신 특별 출입증 당첨 팬분 맞으시죠? 제발 도와주세요, 루미나 컴백 첫 무대까지 5분밖에 안 남았는데 제 전용 별빛 무선 마이크가 감쪽같이 사라졌어요!'
          : "Wait—you're the VIP fan pass winner who helped carry the standby monitors, right? Please, we have five minutes until LUMINA's comeback stage and my custom starlight mic has vanished!",
        narration: isKo
          ? '제1막 — 개막 5분 전을 알리는 홀로그램 초시계가 깜빡이는 가운데, 루미나의 대기실 곳곳에 자홍빛과 청록빛 비상 경고등이 긴박하게 맥동합니다.'
          : 'ACT 1 — Neon magenta and cyan warning lights pulse across LUMINA’s backstage dressing room as the 05:00 holographic countdown clock ticks.',
        accepted: true,
        milestoneTag: 'CRISIS_START',
      },
    ],
    lastVerificationTrace: null,
  };
}

