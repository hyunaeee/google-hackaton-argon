import type { ActionType, EndingType } from '../../../shared/types';

class FanverseSoundEngine {
  private ctx: AudioContext | null = null;
  public soundEnabled = true;
  public voiceEnabled = false;

  private getContext(): AudioContext | null {
    if (!this.soundEnabled || typeof window === 'undefined') return null;
    if (!this.ctx) {
      const AudioCtx =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext?: typeof AudioContext })
          .webkitAudioContext;
      if (AudioCtx) {
        this.ctx = new AudioCtx();
      }
    }
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume().catch(() => {});
    }
    return this.ctx;
  }

  private playTone(
    freq: number,
    startOffset: number,
    duration: number,
    type: OscillatorType = 'sine',
    gainPeak = 0.12
  ) {
    const ctx = this.getContext();
    if (!ctx) return;
    const now = ctx.currentTime + startOffset;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, now);
    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.exponentialRampToValueAtTime(gainPeak, now + 0.015);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + duration);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(now);
    osc.stop(now + duration + 0.02);
  }

  public playActionSfx(
    actionType: ActionType,
    accepted: boolean,
    endingReached: EndingType = 'NONE'
  ) {
    if (!this.soundEnabled) return;

    // 1. Rejected by Deterministic Validator -> Security Buzzer
    if (!accepted) {
      this.playTone(195, 0, 0.14, 'sawtooth', 0.11);
      this.playTone(155, 0.16, 0.22, 'sawtooth', 0.12);
      return;
    }

    // 2. Stage Finale Fanfare (Ending A vs Ending B)
    if (actionType === 'ENTER_STAGE' || endingReached !== 'NONE') {
      if (endingReached === 'UNPLUGGED_ENCORE') {
        // Warm 6-string acoustic guitar arpeggio (E major 9th)
        const notes = [164.81, 246.94, 329.63, 415.3, 493.88, 659.25, 739.99];
        notes.forEach((f, idx) => {
          this.playTone(f, idx * 0.09, 0.95, 'triangle', 0.13);
        });
      } else {
        // K-POP Starlight Synth Finale Chord Progression
        const chord = [523.25, 659.25, 783.99, 1046.5, 1318.5];
        chord.forEach((f, idx) => {
          this.playTone(f, idx * 0.06, 0.85, 'sawtooth', 0.08);
          this.playTone(f * 1.5, idx * 0.06 + 0.03, 0.75, 'sine', 0.07);
        });
      }
      return;
    }

    switch (actionType) {
      case 'UNLOCK':
        // RFID scan beep + emerald solenoid latch unlock
        this.playTone(1318.5, 0, 0.09, 'sine', 0.12);
        this.playTone(1760.0, 0.1, 0.14, 'sine', 0.14);
        this.playTone(880.0, 0.24, 0.28, 'triangle', 0.1);
        break;
      case 'PICK_UP':
        // Holographic item shimmer chime
        this.playTone(587.33, 0, 0.12, 'sine', 0.11);
        this.playTone(880.0, 0.08, 0.16, 'sine', 0.12);
        this.playTone(1174.66, 0.16, 0.26, 'triangle', 0.12);
        break;
      case 'SYNC_IEM':
        // 648.55 MHz RF frequency lock tone
        this.playTone(648.55, 0, 0.12, 'sine', 0.1);
        this.playTone(972.8, 0.12, 0.12, 'sine', 0.1);
        this.playTone(1297.1, 0.24, 0.25, 'sine', 0.13);
        break;
      case 'TUNE_GUITAR':
      case 'PROPOSE_BACKUP': {
        // Plucked acoustic guitar chord strum
        const guitarStrings = [164.81, 220.0, 293.66, 369.99, 493.88, 659.25];
        guitarStrings.forEach((f, i) => {
          this.playTone(f, i * 0.045, 0.55, 'triangle', 0.11);
        });
        break;
      }
      case 'HAND_OVER':
        // Warm trust surge chord
        this.playTone(523.25, 0, 0.18, 'sine', 0.11);
        this.playTone(659.25, 0.08, 0.22, 'sine', 0.12);
        this.playTone(1046.5, 0.16, 0.35, 'triangle', 0.14);
        break;
      default:
        // Subtle UI inspect/talk pulse
        this.playTone(740.0, 0, 0.08, 'sine', 0.07);
        break;
    }
  }

  public speakCharacterLine(
    speaker: 'HANA' | 'JIHO' | 'NARRATOR',
    text: string
  ) {
    if (
      !this.voiceEnabled ||
      typeof window === 'undefined' ||
      !('speechSynthesis' in window)
    ) {
      return;
    }
    try {
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(text);
      const hasKorean = /[ㄱ-ㅎ|ㅏ-ㅣ|가-힣]/.test(text);
      utterance.lang = hasKorean ? 'ko-KR' : 'en-US';
      if (speaker === 'HANA') {
        utterance.pitch = 1.22;
        utterance.rate = 1.04;
      } else if (speaker === 'JIHO') {
        utterance.pitch = 0.92;
        utterance.rate = 1.08;
      } else {
        utterance.pitch = 1.0;
        utterance.rate = 1.0;
      }
      window.speechSynthesis.speak(utterance);
    } catch {
      // Ignore speech synthesis errors on unsupported browsers
    }
  }
}

export const soundEngine = new FanverseSoundEngine();
