import { describe, it, expect } from 'vitest';
import { createInitialWorldState } from '../server/src/world/canonicalFacts.js';
import {
  validateAction,
  commitValidatedAction,
} from '../server/src/validators/validateAction.js';
import {
  executeStoryTurn,
  StoryAgentError,
} from '../server/src/agents/storyAgent.js';
import { AIActionProposal } from '../shared/types.js';

describe('FANVERSE Deterministic Verification & Correction Loop Suite', () => {
  // 1. Attempt to unlock the locker without the access card -> rejected
  it('1. rejects unlocking the equipment locker without the VIP Staff Access Card', () => {
    const state = createInitialWorldState();
    const proposal: AIActionProposal = {
      actionType: 'UNLOCK',
      targetId: 'equipment_locker',
      proposedStateChanges: { lockerUnlocked: true },
      speaker: 'JIHO',
      npcResponse: 'Unlocking the locker now!',
      narration: 'The equipment locker swings open.',
      requestedEnding: 'NONE',
    };

    const result = validateAction(state, proposal);
    expect(result.accepted).toBe(false);
    expect(result.errors.some((e) => e.includes('MISSING_ACCESS_CARD'))).toBe(
      true
    );
    expect(result.validatedStateChanges.lockerUnlocked).toBeUndefined();
  });

  // 2. Attempt to collect an inaccessible microphone -> rejected
  it('2. rejects collecting the microphone while the equipment locker is still locked', () => {
    const state = createInitialWorldState();
    const proposal: AIActionProposal = {
      actionType: 'PICK_UP',
      targetId: 'microphone',
      proposedStateChanges: { hasMicrophone: true },
      speaker: 'HANA',
      npcResponse: 'You found my starlight mic!',
      narration: 'You grab the microphone out of thin air.',
      requestedEnding: 'NONE',
    };

    const result = validateAction(state, proposal);
    expect(result.accepted).toBe(false);
    expect(
      result.errors.some((e) =>
        e.includes('MICROPHONE_INACCESSIBLE_LOCKER_LOCKED')
      )
    ).toBe(true);
  });

  // 3. Acquire the access card and unlock the locker -> accepted
  it('3. accepts acquiring the access card from the vanity table and then unlocking the equipment locker', () => {
    const initialState = createInitialWorldState();

    const pickUpCardProposal: AIActionProposal = {
      actionType: 'PICK_UP',
      targetId: 'access_card',
      proposedStateChanges: { cardDiscovered: true, hasAccessCard: true },
      speaker: 'NARRATOR',
      npcResponse: 'You picked up the holographic VIP Staff Access Card.',
      narration:
        'You lift the shimmering VIP Staff Access Card from the vanity tabletop.',
      requestedEnding: 'NONE',
    };

    const cardValidation = validateAction(initialState, pickUpCardProposal);
    expect(cardValidation.accepted).toBe(true);

    const stateWithCard = commitValidatedAction(
      initialState,
      'Pick up the access card on the vanity table',
      pickUpCardProposal,
      cardValidation
    );
    expect(stateWithCard.hasAccessCard).toBe(true);
    expect(stateWithCard.inventory).toContain('access_card');

    const unlockProposal: AIActionProposal = {
      actionType: 'UNLOCK',
      targetId: 'equipment_locker',
      proposedStateChanges: { lockerUnlocked: true },
      speaker: 'JIHO',
      npcResponse: 'Nice! The RFID reader turned green—the locker is open.',
      narration:
        'You tap the VIP Staff Access Card against the locker reader. The LED turns emerald green and the heavy door unlatches.',
      requestedEnding: 'NONE',
    };

    const unlockValidation = validateAction(stateWithCard, unlockProposal);
    expect(unlockValidation.accepted).toBe(true);

    const stateUnlocked = commitValidatedAction(
      stateWithCard,
      'Unlock the equipment locker with the card',
      unlockProposal,
      unlockValidation
    );
    expect(stateUnlocked.lockerUnlocked).toBe(true);
    expect(stateUnlocked.lightingMode).toBe('LOCKER_OPENED');
  });

  // 4. Recover and hand over the microphone -> accepted
  it('4. accepts recovering the microphone from the unlocked locker and handing it over to Hana', () => {
    const unlockedState = {
      ...createInitialWorldState(),
      cardDiscovered: true,
      hasAccessCard: true,
      lockerUnlocked: true,
      inventory: ['access_card' as const],
    };

    const pickUpMicProposal: AIActionProposal = {
      actionType: 'PICK_UP',
      targetId: 'microphone',
      proposedStateChanges: { hasMicrophone: true },
      speaker: 'NARRATOR',
      npcResponse: 'You retrieved Hana’s custom starlight microphone!',
      narration:
        'From the foam cradle inside the locker, you lift the iridescent pearl-lilac microphone.',
      requestedEnding: 'NONE',
    };

    const micValidation = validateAction(unlockedState, pickUpMicProposal);
    expect(micValidation.accepted).toBe(true);

    const stateWithMic = commitValidatedAction(
      unlockedState,
      'Take the microphone from the locker',
      pickUpMicProposal,
      micValidation
    );
    expect(stateWithMic.hasMicrophone).toBe(true);
    expect(stateWithMic.inventory).toContain('microphone');

    const handOverProposal: AIActionProposal = {
      actionType: 'HAND_OVER',
      targetId: 'npc_hana',
      proposedStateChanges: { hanaHasMicrophone: true },
      speaker: 'HANA',
      npcResponse:
        'My starlight mic! Thank you so much—now we can perform our comeback stage!',
      narration:
        'You place the custom microphone into Hana’s hands. Her eyes light up with confidence.',
      requestedEnding: 'NONE',
    };

    const handOverValidation = validateAction(stateWithMic, handOverProposal);
    expect(handOverValidation.accepted).toBe(true);

    const stateHandedOver = commitValidatedAction(
      stateWithMic,
      'Hand the microphone to Hana',
      handOverProposal,
      handOverValidation
    );
    expect(stateHandedOver.hanaHasMicrophone).toBe(true);
    expect(stateHandedOver.hasMicrophone).toBe(false);
    expect(stateHandedOver.inventory).not.toContain('microphone');
    expect(stateHandedOver.lightingMode).toBe('READY_FOR_STAGE');
  });

  // 5. Attempt to trigger the performance without resolving the crisis -> rejected
  it('5. rejects triggering the stage entrance performance before resolving the crisis', () => {
    const state = createInitialWorldState();
    const prematureStageProposal: AIActionProposal = {
      actionType: 'ENTER_STAGE',
      targetId: 'stage_door',
      proposedStateChanges: { stageDoorOpen: true },
      speaker: 'HANA',
      npcResponse: 'Let’s go on stage!',
      narration: 'The stage door opens premature.',
      requestedEnding: 'SHOWTIME_SAVED',
    };

    const validation = validateAction(state, prematureStageProposal);
    expect(validation.accepted).toBe(false);
    expect(
      validation.errors.some((e) =>
        e.includes('CRISIS_UNRESOLVED_CANNOT_ENTER_STAGE')
      )
    ).toBe(true);
  });

  // 6. Trigger a valid alternate acoustic ending -> accepted
  it('6. accepts proposing an alternative acoustic performance and triggering Ending B (UNPLUGGED_ENCORE)', () => {
    const initialState = createInitialWorldState();

    const backupProposal: AIActionProposal = {
      actionType: 'PROPOSE_BACKUP',
      targetId: 'npc_jiho',
      proposedStateChanges: { acousticBackupApproved: true },
      speaker: 'JIHO',
      npcResponse:
        'An unplugged acoustic arrangement with the backstage guitar? That’s brilliant—I’ll re-patch the stage console right now!',
      narration:
        'Jiho grabs the acoustic guitar from its stand and signals the sound desk to configure an intimate unplugged set.',
      requestedEnding: 'NONE',
    };

    const backupValidation = validateAction(initialState, backupProposal);
    expect(backupValidation.accepted).toBe(true);

    const stateBackupReady = commitValidatedAction(
      initialState,
      'Propose an unplugged acoustic performance with Jiho',
      backupProposal,
      backupValidation
    );
    expect(stateBackupReady.acousticBackupApproved).toBe(true);

    const enterStageBProposal: AIActionProposal = {
      actionType: 'ENTER_STAGE',
      targetId: 'stage_door',
      proposedStateChanges: { stageDoorOpen: true },
      speaker: 'HANA',
      npcResponse:
        'Everyone out there is waiting for us. Let’s give them an unforgettable Unplugged Encore!',
      narration:
        'The heavy stage doors swing open to warm golden spotlights as LUMINA steps out for an intimate acoustic stage.',
      requestedEnding: 'UNPLUGGED_ENCORE',
    };

    const stageBValidation = validateAction(
      stateBackupReady,
      enterStageBProposal
    );
    expect(stageBValidation.accepted).toBe(true);

    const finalStateB = commitValidatedAction(
      stateBackupReady,
      'Open the stage door for the acoustic encore',
      enterStageBProposal,
      stageBValidation
    );
    expect(finalStateB.endingReached).toBe('UNPLUGGED_ENCORE');
    expect(finalStateB.stageDoorOpen).toBe(true);
    expect(finalStateB.lightingMode).toBe('ENDING_B_ACOUSTIC');
  });

  // 7. Malformed Gemini response leaves world state unchanged
  it('7. leaves WorldState completely unchanged when Gemini returns a malformed JSON response, and verifies the 2-step correction loop on invalid proposals', async () => {
    const initialState = createInitialWorldState();
    const snapshotBefore = JSON.stringify(initialState);

    await expect(
      executeStoryTurn(initialState, 'Hello Hana', {
        generator: async () => '{not_valid_json: true',
      })
    ).rejects.toThrowError(StoryAgentError);

    expect(JSON.stringify(initialState)).toBe(snapshotBefore);

    // Also verify the Correction Loop when Gemini first proposes an illegal UNLOCK without card, then corrects on retry 1:
    let callCount = 0;
    const observedContexts: Array<{
      thinkingLevel?: string;
      previousInteractionId?: string;
    }> = [];
    const outcome = await executeStoryTurn(
      initialState,
      'Unlock the equipment locker right now!',
      {
        generator: async (_prompt, context) => {
          callCount++;
          observedContexts.push({
            thinkingLevel: context?.thinkingLevel,
            previousInteractionId: context?.previousInteractionId,
          });
          if (callCount === 1) {
            context?.onInteractionId?.('int-argon-initial-001');
            return JSON.stringify({
              actionType: 'UNLOCK',
              targetId: 'equipment_locker',
              proposedStateChanges: { lockerUnlocked: true },
              speaker: 'JIHO',
              npcResponse: 'I unlocked it for you!',
              narration: 'The locker opens magically.',
              requestedEnding: 'NONE',
            });
          }
          context?.onInteractionId?.('int-argon-retry-002');
          return JSON.stringify({
            actionType: 'NO_OP',
            targetId: 'equipment_locker',
            proposedStateChanges: {},
            speaker: 'JIHO',
            npcResponse:
              'Wait—the RFID lock is flashing red! I left the spare VIP Staff Access Card by the vanity mirror.',
            narration:
              'The equipment locker remains securely locked because you do not have the VIP Staff Access Card.',
            requestedEnding: 'NONE',
          });
        },
      }
    );

    expect(callCount).toBe(2);
    expect(observedContexts[0].thinkingLevel).toBe('low');
    expect(observedContexts[1].thinkingLevel).toBe('medium');
    expect(observedContexts[1].previousInteractionId).toBe(
      'int-argon-initial-001'
    );
    expect(outcome.actionAccepted).toBe(false);
    expect(outcome.wasCorrected).toBe(true);
    expect(outcome.worldState.lockerUnlocked).toBe(false);
    expect(outcome.trace.thinkingLevelUsed).toBe('medium');
    expect(outcome.trace.correctionAttempts.length).toBe(1);
    expect(outcome.trace.correctionAttempts[0].thinkingLevel).toBe('medium');
    expect(outcome.trace.correctionAttempts[0].previousInteractionId).toBe(
      'int-argon-initial-001'
    );
    expect(outcome.trace.correctionAttempts[0].validationResult.accepted).toBe(
      true
    );
  });

  // 8. AI request failure returns an explicit recoverable error and does not fake a successful turn
  it('8. throws an explicit recoverable StoryAgentError on AI request failure without faking a successful turn', async () => {
    const initialState = createInitialWorldState();

    try {
      await executeStoryTurn(initialState, 'Talk to Hana', {
        generator: async () => {
          throw new StoryAgentError(
            'AI_REQUEST_FAILED',
            'Simulated network timeout talking to Gemini 4 Argon',
            true
          );
        },
      });
      expect.fail('Expected executeStoryTurn to throw StoryAgentError');
    } catch (err) {
      expect(err).toBeInstanceOf(StoryAgentError);
      const agentErr = err as StoryAgentError;
      expect(agentErr.code).toBe('AI_REQUEST_FAILED');
      expect(agentErr.recoverable).toBe(true);
      expect(initialState.turnCount).toBe(0);
    }
  });
});
