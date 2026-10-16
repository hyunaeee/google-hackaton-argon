import {
  AIActionProposal,
  InventoryItem,
  ValidationResult,
  WorldState,
} from '../../../shared/types.js';

function clampTrust(value: number): number {
  return Math.max(0, Math.min(100, value));
}

function computeNextAct(state: Partial<WorldState>): number {
  if (
    state.endingReached === 'SHOWTIME_SAVED' ||
    state.endingReached === 'UNPLUGGED_ENCORE'
  ) {
    return 5;
  }
  if (state.hanaHasMicrophone || state.acousticBackupApproved) {
    return 4;
  }
  if (state.lockerUnlocked || state.hasMicrophone || state.guitarTuned) {
    return 3;
  }
  if (
    state.hasAccessCard ||
    state.cardDiscovered ||
    state.jihoTalked ||
    state.clueDiscovered
  ) {
    return 2;
  }
  return 1;
}

function computeNextNarrativeTimer(
  current: string,
  changes: Partial<WorldState>
): string {
  if (
    changes.endingReached === 'SHOWTIME_SAVED' ||
    changes.endingReached === 'UNPLUGGED_ENCORE'
  ) {
    return '00:00 — ON AIR';
  }
  if (changes.hanaHasMicrophone || changes.acousticBackupApproved) {
    return '01:00';
  }
  if (changes.hasMicrophone || changes.iemSynced) {
    return '02:00';
  }
  if (changes.lockerUnlocked || changes.guitarTuned) {
    return '03:00';
  }
  if (changes.hasAccessCard) {
    return '03:45';
  }
  if (
    changes.cardDiscovered ||
    changes.clueDiscovered ||
    changes.mirrorInspected ||
    changes.jihoTalked ||
    changes.hanaTalked
  ) {
    return '04:20';
  }
  return current;
}

/**
 * Deterministic verification engine for FANVERSE Episode 01.
 * Never relies solely on Gemini's judgment — enforces canonical world physics and story preconditions.
 */
export function validateAction(
  currentState: WorldState,
  proposal: AIActionProposal
): ValidationResult {
  const errors: string[] = [];
  const validatedChanges: Partial<WorldState> = {};

  const { actionType, targetId, proposedStateChanges, requestedEnding } =
    proposal;

  const hasCardNow =
    currentState.hasAccessCard ||
    currentState.inventory.includes('access_card');
  const hasMicNow =
    currentState.hasMicrophone || currentState.inventory.includes('microphone');

  // 0. Guard against illegal side-channel state mutations in proposedStateChanges
  if (
    proposedStateChanges.lockerUnlocked === true &&
    !currentState.lockerUnlocked &&
    actionType !== 'UNLOCK'
  ) {
    errors.push(
      'ILLEGAL_STATE_MUTATION: Cannot set lockerUnlocked=true without performing an UNLOCK action on equipment_locker.'
    );
  }

  if (
    proposedStateChanges.hasMicrophone === true &&
    !currentState.hasMicrophone &&
    !(actionType === 'PICK_UP' && targetId === 'microphone')
  ) {
    errors.push(
      'ILLEGAL_STATE_MUTATION: Cannot acquire the microphone without a valid PICK_UP action targeting microphone.'
    );
  }

  if (
    proposedStateChanges.hanaHasMicrophone === true &&
    !currentState.hanaHasMicrophone &&
    actionType !== 'HAND_OVER'
  ) {
    errors.push(
      'ILLEGAL_STATE_MUTATION: Cannot give Hana the microphone without a valid HAND_OVER action.'
    );
  }

  if (
    proposedStateChanges.stageDoorOpen === true &&
    !currentState.stageDoorOpen &&
    actionType !== 'ENTER_STAGE'
  ) {
    errors.push(
      'ILLEGAL_STATE_MUTATION: Cannot open the stage door without an ENTER_STAGE action.'
    );
  }

  // 1. Validate specific actionType rules
  switch (actionType) {
    case 'UNLOCK': {
      if (targetId !== 'equipment_locker' && targetId !== 'access_card') {
        errors.push(
          `INVALID_UNLOCK_TARGET: Cannot unlock '${targetId}'. Only 'equipment_locker' can be unlocked.`
        );
      }
      if (!hasCardNow) {
        errors.push(
          'MISSING_ACCESS_CARD: The equipment locker is electronically locked and requires the VIP Staff Access Card (access_card) from the vanity table.'
        );
      }
      if (currentState.lockerUnlocked) {
        errors.push(
          'LOCKER_ALREADY_UNLOCKED: The equipment locker is already unlocked and open.'
        );
      }
      if (errors.length === 0) {
        validatedChanges.lockerUnlocked = true;
        validatedChanges.lightingMode = 'LOCKER_OPENED';
      }
      break;
    }

    case 'PICK_UP': {
      if (
        targetId === 'access_card' ||
        targetId === 'vanity_table' ||
        targetId === 'vanity_mirror'
      ) {
        if (hasCardNow) {
          errors.push(
            'CARD_ALREADY_COLLECTED: You already collected the VIP Staff Access Card.'
          );
        } else {
          validatedChanges.cardDiscovered = true;
          validatedChanges.hasAccessCard = true;
          const nextInv: InventoryItem[] = [...currentState.inventory];
          if (!nextInv.includes('access_card')) {
            nextInv.push('access_card');
          }
          validatedChanges.inventory = nextInv;
        }
      } else if (targetId === 'microphone' || targetId === 'equipment_locker') {
        if (!currentState.lockerUnlocked) {
          errors.push(
            'MICROPHONE_INACCESSIBLE_LOCKER_LOCKED: The custom microphone is locked inside the equipment locker. You must unlock the equipment locker with the access card first.'
          );
        } else if (hasMicNow || currentState.hanaHasMicrophone) {
          errors.push(
            'MICROPHONE_ALREADY_RECOVERED: The custom microphone has already been retrieved from the locker.'
          );
        } else {
          validatedChanges.hasMicrophone = true;
          const nextInv: InventoryItem[] = [...currentState.inventory];
          if (!nextInv.includes('microphone')) {
            nextInv.push('microphone');
          }
          validatedChanges.inventory = nextInv;
        }
      } else if (targetId === 'lounge_sofa') {
        validatedChanges.iemSynced = true;
        const nextInv: InventoryItem[] = [...currentState.inventory];
        if (!nextInv.includes('iem_pack')) {
          nextInv.push('iem_pack');
        }
        validatedChanges.inventory = nextInv;
      } else {
        errors.push(
          `ITEM_NOT_COLLECTIBLE: '${targetId}' cannot be picked up into inventory. Collectible items are 'access_card', 'microphone', and 'iem_pack'.`
        );
      }
      break;
    }

    case 'SYNC_IEM': {
      validatedChanges.iemSynced = true;
      validatedChanges.relationships = {
        hanaTrust: clampTrust(currentState.relationships.hanaTrust + 10),
        jihoTrust: clampTrust(currentState.relationships.jihoTrust + 10),
      };
      break;
    }

    case 'TUNE_GUITAR': {
      validatedChanges.guitarTuned = true;
      validatedChanges.relationships = {
        hanaTrust: clampTrust(currentState.relationships.hanaTrust + 10),
        jihoTrust: clampTrust(currentState.relationships.jihoTrust + 12),
      };
      break;
    }

    case 'HAND_OVER': {
      if (!hasMicNow) {
        errors.push(
          'MISSING_MICROPHONE_TO_HAND_OVER: You cannot hand over the custom microphone to Hana because you have not collected it yet.'
        );
      } else if (currentState.hanaHasMicrophone) {
        errors.push(
          'MICROPHONE_ALREADY_HANDED_OVER: Hana already has her custom microphone.'
        );
      } else {
        validatedChanges.hasMicrophone = false;
        validatedChanges.hanaHasMicrophone = true;
        validatedChanges.hanaTalked = true;
        validatedChanges.lightingMode = 'READY_FOR_STAGE';
        validatedChanges.inventory = currentState.inventory.filter(
          (item) => item !== 'microphone'
        );
        validatedChanges.relationships = {
          hanaTrust: clampTrust(currentState.relationships.hanaTrust + 25),
          jihoTrust: clampTrust(currentState.relationships.jihoTrust + 15),
        };
      }
      break;
    }

    case 'PROPOSE_BACKUP': {
      validatedChanges.guitarTuned = true;
      validatedChanges.acousticBackupApproved = true;
      validatedChanges.jihoTalked = true;
      validatedChanges.hanaTalked = true;
      validatedChanges.lightingMode = 'READY_FOR_STAGE';
      validatedChanges.relationships = {
        hanaTrust: clampTrust(currentState.relationships.hanaTrust + 15),
        jihoTrust: clampTrust(currentState.relationships.jihoTrust + 25),
      };
      if (requestedEnding === 'UNPLUGGED_ENCORE') {
        validatedChanges.stageDoorOpen = true;
        validatedChanges.endingReached = 'UNPLUGGED_ENCORE';
        validatedChanges.lightingMode = 'ENDING_B_ACOUSTIC';
      }
      break;
    }

    case 'ENTER_STAGE': {
      const canDoEndingA = currentState.hanaHasMicrophone;
      const canDoEndingB = currentState.acousticBackupApproved;

      if (!canDoEndingA && !canDoEndingB) {
        errors.push(
          'CRISIS_UNRESOLVED_CANNOT_ENTER_STAGE: You cannot start the performance yet! Either recover Hana’s custom microphone and hand it to her (Ending A), or propose an unplugged acoustic backup arrangement with Jiho (Ending B).'
        );
      } else if (requestedEnding === 'SHOWTIME_SAVED' && !canDoEndingA) {
        errors.push(
          'ENDING_A_REQUIRES_MICROPHONE: Cannot trigger Ending A (Showtime Saved) because Hana does not have her custom microphone.'
        );
      } else if (requestedEnding === 'UNPLUGGED_ENCORE' && !canDoEndingB) {
        errors.push(
          'ENDING_B_REQUIRES_ACOUSTIC_BACKUP: Cannot trigger Ending B (Unplugged Encore) because the acoustic backup has not been arranged with Jiho.'
        );
      } else {
        validatedChanges.stageDoorOpen = true;
        if (
          canDoEndingA &&
          (requestedEnding === 'SHOWTIME_SAVED' || requestedEnding === 'NONE')
        ) {
          validatedChanges.endingReached = 'SHOWTIME_SAVED';
          validatedChanges.lightingMode = 'ENDING_A_CONCERT';
        } else {
          validatedChanges.endingReached = 'UNPLUGGED_ENCORE';
          validatedChanges.lightingMode = 'ENDING_B_ACOUSTIC';
        }
      }
      break;
    }

    case 'INSPECT': {
      if (targetId === 'vanity_table' || targetId === 'access_card') {
        validatedChanges.cardDiscovered = true;
      } else if (targetId === 'vanity_mirror') {
        validatedChanges.mirrorInspected = true;
        validatedChanges.cardDiscovered = true;
        validatedChanges.relationships = {
          hanaTrust: clampTrust(currentState.relationships.hanaTrust + 5),
          jihoTrust: currentState.relationships.jihoTrust,
        };
      } else if (targetId === 'coffee_table') {
        validatedChanges.clueDiscovered = true;
        validatedChanges.relationships = {
          hanaTrust: currentState.relationships.hanaTrust,
          jihoTrust: clampTrust(currentState.relationships.jihoTrust + 8),
        };
      } else if (targetId === 'lounge_sofa') {
        validatedChanges.iemSynced = true;
        validatedChanges.relationships = {
          hanaTrust: clampTrust(currentState.relationships.hanaTrust + 8),
          jihoTrust: clampTrust(currentState.relationships.jihoTrust + 5),
        };
      } else if (targetId === 'acoustic_guitar') {
        validatedChanges.guitarTuned = true;
      }
      break;
    }

    case 'TALK': {
      if (targetId === 'npc_hana') {
        validatedChanges.hanaTalked = true;
        const delta = proposedStateChanges.hanaTrustDelta ?? 5;
        validatedChanges.relationships = {
          hanaTrust: clampTrust(
            currentState.relationships.hanaTrust +
              Math.max(-10, Math.min(15, delta))
          ),
          jihoTrust: currentState.relationships.jihoTrust,
        };
      } else if (targetId === 'npc_jiho') {
        validatedChanges.jihoTalked = true;
        const delta = proposedStateChanges.jihoTrustDelta ?? 5;
        validatedChanges.relationships = {
          hanaTrust: currentState.relationships.hanaTrust,
          jihoTrust: clampTrust(
            currentState.relationships.jihoTrust +
              Math.max(-10, Math.min(15, delta))
          ),
        };
      }
      break;
    }

    case 'NO_OP': {
      break;
    }
  }

  // 2. Check if requestedEnding was set on a non-ending action
  if (
    requestedEnding !== 'NONE' &&
    actionType !== 'ENTER_STAGE' &&
    !(actionType === 'PROPOSE_BACKUP' && requestedEnding === 'UNPLUGGED_ENCORE')
  ) {
    errors.push(
      `ENDING_REQUIRES_STAGE_ACTION: Cannot trigger ending '${requestedEnding}' during action '${actionType}'. Player must resolve the crisis and enter the stage.`
    );
  }

  if (errors.length > 0) {
    return {
      accepted: false,
      errors,
      validatedStateChanges: {},
      explanation: `Action '${actionType}' on '${targetId}' rejected by deterministic rules: ${errors.join(' | ')}`,
    };
  }

  const mergedPreview = {
    ...currentState,
    ...validatedChanges,
  };

  const nextTimer = computeNextNarrativeTimer(
    currentState.narrativeTimer,
    mergedPreview
  );
  if (nextTimer !== currentState.narrativeTimer) {
    validatedChanges.narrativeTimer = nextTimer;
  }

  validatedChanges.currentAct = computeNextAct(mergedPreview);

  return {
    accepted: true,
    errors: [],
    validatedStateChanges: validatedChanges,
    explanation: `Action '${actionType}' on '${targetId}' verified against canonical world rules.`,
  };
}

export function commitValidatedAction(
  currentState: WorldState,
  playerInput: string,
  proposal: AIActionProposal,
  validation: ValidationResult
): WorldState {
  if (!validation.accepted) {
    return currentState;
  }

  const nextTurn = currentState.turnCount + 1;
  let milestoneTag: 'CRISIS_START' | 'KEY_ACTION' | 'ENDING_MOMENT' | undefined;

  if (
    validation.validatedStateChanges.endingReached === 'SHOWTIME_SAVED' ||
    validation.validatedStateChanges.endingReached === 'UNPLUGGED_ENCORE'
  ) {
    milestoneTag = 'ENDING_MOMENT';
  } else if (
    validation.validatedStateChanges.lockerUnlocked ||
    validation.validatedStateChanges.hanaHasMicrophone ||
    validation.validatedStateChanges.acousticBackupApproved ||
    validation.validatedStateChanges.hasAccessCard ||
    validation.validatedStateChanges.iemSynced ||
    validation.validatedStateChanges.clueDiscovered
  ) {
    milestoneTag = 'KEY_ACTION';
  }

  const nextEvent = {
    id: `evt-${nextTurn}-${Date.now()}`,
    turnNumber: nextTurn,
    timestamp: new Date().toISOString(),
    playerInput,
    actionType: proposal.actionType,
    targetId: proposal.targetId,
    speaker: proposal.speaker,
    npcResponse: proposal.npcResponse,
    narration: proposal.narration,
    accepted: true,
    milestoneTag,
  };

  return {
    ...currentState,
    ...validation.validatedStateChanges,
    turnCount: nextTurn,
    history: [...currentState.history, nextEvent],
  };
}
