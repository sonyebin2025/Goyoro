/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

// Custom Web Audio API synthesizer for GOYO-RO smart-app sound effects.
// Bypasses browser strict asset restrictions and works offline/persistently.

class SoundEffectsManager {
  private ctx: AudioContext | null = null;

  private initCtx() {
    if (!this.ctx) {
      try {
        const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
        if (AudioCtx) {
          this.ctx = new AudioCtx();
        }
      } catch (e) {
        console.error('Failed to initialize AudioContext:', e);
      }
    }
    // Resume context if suspended due to touch-start browser requirements
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume().catch((err) => console.log('Audio resume error:', err));
    }
  }

  // 1. Sleek minimal mechanical button click
  playClick() {
    this.initCtx();
    if (!this.ctx) return;

    try {
      const now = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.connect(gain);
      gain.connect(this.ctx.destination);

      osc.type = 'triangle';
      // Fast pitch drop resembles physical wooden toggle or subtle tap
      osc.frequency.setValueAtTime(260, now);
      osc.frequency.exponentialRampToValueAtTime(80, now + 0.05);

      gain.gain.setValueAtTime(0.12, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.05);

      osc.start(now);
      osc.stop(now + 0.06);
    } catch (e) {
      console.warn('Audio click failed:', e);
    }
  }

  // 2. Beautiful rising success arpeggio for rewards / hatches
  playSuccess() {
    this.initCtx();
    if (!this.ctx) return;

    try {
      const now = this.ctx.currentTime;
      // High harmony notes (C5, E5, G5, A5, C6)
      const folder = [523.25, 659.25, 783.99, 880.00, 1046.50];

      folder.forEach((note, idx) => {
        const trigTime = now + idx * 0.07;
        const osc = this.ctx!.createOscillator();
        const subOsc = this.ctx!.createOscillator();
        const gain = this.ctx!.createGain();

        osc.connect(gain);
        subOsc.connect(gain);
        gain.connect(this.ctx!.destination);

        // Warm sparkling blend
        osc.type = 'sine';
        osc.frequency.setValueAtTime(note, trigTime);

        subOsc.type = 'triangle';
        subOsc.frequency.setValueAtTime(note / 2, trigTime); // sub-octave layer for warmth

        gain.gain.setValueAtTime(0, trigTime);
        gain.gain.linearRampToValueAtTime(0.08, trigTime + 0.02);
        gain.gain.exponentialRampToValueAtTime(0.001, trigTime + 0.22);

        osc.start(trigTime);
        subOsc.start(trigTime);

        osc.stop(trigTime + 0.25);
        subOsc.stop(trigTime + 0.25);
      });
    } catch (e) {
      console.warn('Audio success failed:', e);
    }
  }

  // 3. Banggu character's signature "Cow moo~" (방구 음매~ 소리)
  // Synthesized using parallel oscillators (sawtooth/triangle) + frequency envelope + bandpass filter sweep
  playCowMoo() {
    this.initCtx();
    if (!this.ctx) return;

    try {
      const now = this.ctx.currentTime;
      const duration = 1.2;

      const osc1 = this.ctx.createOscillator();
      const osc2 = this.ctx.createOscillator();
      const filter = this.ctx.createBiquadFilter();
      const gainComp = this.ctx.createGain();

      osc1.connect(filter);
      osc2.connect(filter);
      filter.connect(gainComp);
      gainComp.connect(this.ctx.destination);

      // Low pitch corresponding to Korean cattle (한우 - thick vocal)
      osc1.type = 'sawtooth';
      osc2.type = 'triangle';

      // Pitch sweep logic: "우음매에에에~"
      // Low starts at 105Hz, drops, rises to 125Hz, then settles back down to 88Hz
      const startPitch = 105;
      osc1.frequency.setValueAtTime(startPitch, now);
      osc1.frequency.linearRampToValueAtTime(130, now + 0.18);
      osc1.frequency.exponentialRampToValueAtTime(115, now + 0.6);
      osc1.frequency.linearRampToValueAtTime(80, now + duration);

      osc2.frequency.setValueAtTime(startPitch + 1, now); // Detune oscillator for rich chorus
      osc2.frequency.linearRampToValueAtTime(131, now + 0.18);
      osc2.frequency.exponentialRampToValueAtTime(116, now + 0.6);
      osc2.frequency.linearRampToValueAtTime(81, now + duration);

      // Bandpass filter acts like nasal formant filter ("ooo" vowel to "aaa" vowel sweep)
      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(650, now);
      filter.frequency.exponentialRampToValueAtTime(320, now + 0.4);
      filter.frequency.linearRampToValueAtTime(180, now + duration);
      filter.Q.setValueAtTime(4.0, now);

      // Amplitude Envelope matching cow sound
      gainComp.gain.setValueAtTime(0.001, now);
      gainComp.gain.linearRampToValueAtTime(0.24, now + 0.15); // Quick swell
      gainComp.gain.linearRampToValueAtTime(0.20, now + 0.5);  // Sustained rumble
      gainComp.gain.exponentialRampToValueAtTime(0.001, now + duration); // Smooth fade

      osc1.start(now);
      osc2.start(now);

      osc1.stop(now + duration + 0.1);
      osc2.stop(now + duration + 0.1);
    } catch (e) {
      console.warn('Audio cow moo failed:', e);
    }
  }
}

export const sounds = new SoundEffectsManager();
