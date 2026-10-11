/**
 * Procedural Web Audio Ambient Engine
 * Synthesizes zero-bandwidth, offline audio soundscapes purely through math and oscillators:
 * - 40Hz Gamma Binaural Beats (216Hz L / 256Hz R for peak cognitive flow)
 * - Procedural Rain (Dual-bandpass noise + random droplet impulse generator)
 * - Ocean Waves (Pink noise modulated by gentle 0.1Hz LFO swell)
 * - Brown Noise (Deep low-frequency Brownian rumble)
 * 
 * Features Multi-Tab Synchronization & Deduplication:
 * Synchronizes active sound state across browser tabs via BroadcastChannel and localStorage.
 * Guarantees exactly ONE audio context runs across all open tabs to eliminate double-audio echoes.
 */

class AmbientAudioEngine {
    constructor() {
        this.ctx = null;
        this.masterGain = null;
        this.activeSound = null;
        this.volume = 0.5;
        this.nodes = [];
        this.dropletInterval = null;
        this.tabId = 'tab_' + Math.random().toString(36).slice(2, 10);
        this.isAudioOwner = false;
        this.channel = null;

        // Hydrate saved sound synchronously so UI on new tabs immediately shows the active soundscape
        try {
            const saved = localStorage.getItem('raeen_ambient_active_sound');
            this.activeSound = (saved && saved !== 'off') ? saved : null;
        } catch (_) {
            this.activeSound = null;
        }

        this._setupCrossTabSync();
    }

    _setupCrossTabSync() {
        if (typeof window === 'undefined') return;

        // BroadcastChannel provides cross-tab messaging
        if (typeof BroadcastChannel !== 'undefined') {
            try {
                this.channel = new BroadcastChannel('raeen_ambient_sync');
                this.channel.onmessage = (event) => {
                    const data = event.data;
                    if (!data) return;

                    switch (data.type) {
                        case 'PLAY_SOUND':
                            if (data.senderTabId !== this.tabId) {
                                // Another tab became the audio owner
                                if (this.isAudioOwner) {
                                    this._stopAudioNodes();
                                    this.isAudioOwner = false;
                                }
                                this.activeSound = data.sound;
                                window.dispatchEvent(new CustomEvent('raeen-ambient-change', {
                                    detail: { sound: data.sound, active: true, volume: this.volume }
                                }));
                            }
                            break;

                        case 'STOP_SOUND':
                            if (this.isAudioOwner) {
                                this._stopAudioNodes();
                                this.isAudioOwner = false;
                            }
                            this.activeSound = null;
                            window.dispatchEvent(new CustomEvent('raeen-ambient-change', {
                                detail: { sound: null, active: false }
                            }));
                            break;

                        case 'PING_AUDIO_OWNER':
                            // A newly opened tab is checking if an active audio owner exists
                            if (this.isAudioOwner && this.activeSound) {
                                try {
                                    this.channel.postMessage({
                                        type: 'PONG_AUDIO_OWNER',
                                        ownerTabId: this.tabId,
                                        sound: this.activeSound,
                                        volume: this.volume
                                    });
                                } catch (_) {}
                            }
                            break;

                        case 'PONG_AUDIO_OWNER':
                            // An active audio owner answered our query
                            this.activeSound = data.sound;
                            this.isAudioOwner = false;
                            window.dispatchEvent(new CustomEvent('raeen-ambient-change', {
                                detail: { sound: data.sound, active: true, volume: data.volume || this.volume }
                            }));
                            break;

                        case 'TRANSFER_AUDIO_LEAD':
                            // The previous owner tab closed; if this tab is visible/focused, take over playback!
                            if (!this.isAudioOwner && data.sound && !document.hidden) {
                                this.play(data.sound, true);
                            }
                            break;
                    }
                };
            } catch (e) {
                console.warn('BroadcastChannel initialization error:', e);
            }
        }

        // On tab unload, transfer audio ownership if this tab was playing
        window.addEventListener('beforeunload', () => {
            if (this.isAudioOwner && this.activeSound && this.channel) {
                try {
                    this.channel.postMessage({
                        type: 'TRANSFER_AUDIO_LEAD',
                        sound: this.activeSound
                    });
                } catch (_) {}
            }
        });

        // Hydrate from localStorage on initialization
        setTimeout(() => {
            this._hydrateState();
        }, 30);
    }

    _hydrateState() {
        try {
            const savedSound = localStorage.getItem('raeen_ambient_active_sound');
            if (savedSound && savedSound !== 'off') {
                this.activeSound = savedSound;
                window.dispatchEvent(new CustomEvent('raeen-ambient-change', {
                    detail: { sound: savedSound, active: true, volume: this.volume }
                }));

                // Query other tabs to see if audio is already playing
                if (this.channel) {
                    this.channel.postMessage({ type: 'PING_AUDIO_OWNER', senderTabId: this.tabId });
                }
            }
        } catch (_) {}
    }

    getActiveSound() {
        if (this.activeSound) return this.activeSound;
        try {
            return localStorage.getItem('raeen_ambient_active_sound') || null;
        } catch (_) {
            return null;
        }
    }

    init() {
        if (!this.ctx) {
            const AudioCtx = window.AudioContext || window.webkitAudioContext;
            if (!AudioCtx) return false;
            this.ctx = new AudioCtx();
            this.masterGain = this.ctx.createGain();
            this.masterGain.gain.setValueAtTime(this.volume, this.ctx.currentTime);
            this.masterGain.connect(this.ctx.destination);
        }
        if (this.ctx.state === 'suspended') {
            this.ctx.resume();
        }
        return true;
    }

    setVolume(val) {
        this.volume = Math.max(0, Math.min(1, val));
        if (this.masterGain && this.ctx) {
            this.masterGain.gain.linearRampToValueAtTime(this.volume, this.ctx.currentTime + 0.1);
        }
    }

    _stopAudioNodes() {
        if (this.dropletInterval) {
            clearInterval(this.dropletInterval);
            this.dropletInterval = null;
        }

        if (this.masterGain && this.ctx) {
            try {
                this.masterGain.gain.linearRampToValueAtTime(0.001, this.ctx.currentTime + 0.2);
            } catch (_) {}
        }

        const currentNodes = [...this.nodes];
        this.nodes = [];
        setTimeout(() => {
            currentNodes.forEach(n => {
                try {
                    if (n.stop) n.stop();
                    if (n.disconnect) n.disconnect();
                } catch (_) {}
            });
        }, 220);
    }

    stop() {
        this.isAudioOwner = false;
        this.activeSound = null;
        try {
            localStorage.removeItem('raeen_ambient_active_sound');
        } catch (_) {}

        if (this.channel) {
            try {
                this.channel.postMessage({
                    type: 'STOP_SOUND',
                    senderTabId: this.tabId
                });
            } catch (_) {}
        }

        this._stopAudioNodes();

        window.dispatchEvent(new CustomEvent('raeen-ambient-change', {
            detail: { sound: null, active: false }
        }));
    }

    play(soundType, isTransfer = false) {
        if (!soundType || soundType === 'off') {
            this.stop();
            return false;
        }

        // Toggle off if clicking the already active sound (whether this tab is the audio host or a connected tab)
        if (!isTransfer && this.activeSound === soundType) {
            this.stop();
            return false;
        }

        if (!this.init()) return false;

        // Stop any previous local audio nodes immediately
        this._stopAudioNodes();

        this.isAudioOwner = true;
        this.activeSound = soundType;
        try {
            localStorage.setItem('raeen_ambient_active_sound', soundType);
        } catch (_) {}

        // Notify all other tabs so they stop duplicate playback & update their UI
        if (this.channel) {
            try {
                this.channel.postMessage({
                    type: 'PLAY_SOUND',
                    sound: soundType,
                    senderTabId: this.tabId
                });
            } catch (_) {}
        }

        setTimeout(() => {
            if (!this.isAudioOwner || this.activeSound !== soundType) return;
            if (!this.ctx || !this.masterGain) return;

            this.masterGain.gain.setValueAtTime(0.001, this.ctx.currentTime);
            this.masterGain.gain.linearRampToValueAtTime(this.volume, this.ctx.currentTime + 0.6);

            switch (soundType) {
                case 'binaural':
                    this._buildBinauralBeats();
                    break;
                case 'rain':
                    this._buildProceduralRain();
                    break;
                case 'waves':
                    this._buildOceanWaves();
                    break;
                case 'brown_noise':
                    this._buildBrownNoise();
                    break;
                default:
                    this.stop();
                    return;
            }

            window.dispatchEvent(new CustomEvent('raeen-ambient-change', {
                detail: { sound: soundType, active: true, volume: this.volume }
            }));
        }, 150);

        return true;
    }

    /**
     * 40Hz Gamma Binaural Beats
     * Left ear: 216Hz sine carrier
     * Right ear: 256Hz sine carrier (216 + 40Hz)
     */
    _buildBinauralBeats() {
        const leftOsc = this.ctx.createOscillator();
        const rightOsc = this.ctx.createOscillator();
        const leftPanner = this.ctx.createStereoPanner ? this.ctx.createStereoPanner() : null;
        const rightPanner = this.ctx.createStereoPanner ? this.ctx.createStereoPanner() : null;

        leftOsc.type = 'sine';
        leftOsc.frequency.setValueAtTime(216, this.ctx.currentTime);

        rightOsc.type = 'sine';
        rightOsc.frequency.setValueAtTime(256, this.ctx.currentTime);

        // Add soft pink background bed for soothing sound
        const bufferSize = this.ctx.sampleRate * 2;
        const noiseBuffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
        const output = noiseBuffer.getChannelData(0);
        let b0 = 0, b1 = 0, b2 = 0;
        for (let i = 0; i < bufferSize; i++) {
            const white = Math.random() * 2 - 1;
            b0 = 0.99886 * b0 + white * 0.0555179;
            b1 = 0.99332 * b1 + white * 0.0750759;
            b2 = 0.96900 * b2 + white * 0.1538520;
            output[i] = (b0 + b1 + b2) * 0.04;
        }

        const bedSource = this.ctx.createBufferSource();
        bedSource.buffer = noiseBuffer;
        bedSource.loop = true;

        const bedFilter = this.ctx.createBiquadFilter();
        bedFilter.type = 'lowpass';
        bedFilter.frequency.setValueAtTime(320, this.ctx.currentTime);

        bedSource.connect(bedFilter);
        bedFilter.connect(this.masterGain);
        bedSource.start();

        if (leftPanner && rightPanner) {
            leftPanner.pan.setValueAtTime(-1, this.ctx.currentTime);
            rightPanner.pan.setValueAtTime(1, this.ctx.currentTime);

            leftOsc.connect(leftPanner);
            leftPanner.connect(this.masterGain);

            rightOsc.connect(rightPanner);
            rightPanner.connect(this.masterGain);
        } else {
            leftOsc.connect(this.masterGain);
            rightOsc.connect(this.masterGain);
        }

        leftOsc.start();
        rightOsc.start();

        this.nodes.push(leftOsc, rightOsc, bedSource, bedFilter);
        if (leftPanner) this.nodes.push(leftPanner, rightPanner);
    }

    /**
     * Procedural Rain Generator
     */
    _buildProceduralRain() {
        const bufferSize = this.ctx.sampleRate * 2;
        const noiseBuffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
        const output = noiseBuffer.getChannelData(0);
        for (let i = 0; i < bufferSize; i++) {
            output[i] = Math.random() * 2 - 1;
        }

        const rainSource = this.ctx.createBufferSource();
        rainSource.buffer = noiseBuffer;
        rainSource.loop = true;

        const bandpass = this.ctx.createBiquadFilter();
        bandpass.type = 'bandpass';
        bandpass.frequency.setValueAtTime(1200, this.ctx.currentTime);
        bandpass.Q.setValueAtTime(0.8, this.ctx.currentTime);

        const lowpass = this.ctx.createBiquadFilter();
        lowpass.type = 'lowpass';
        lowpass.frequency.setValueAtTime(2800, this.ctx.currentTime);

        const rainGain = this.ctx.createGain();
        rainGain.gain.setValueAtTime(0.35, this.ctx.currentTime);

        rainSource.connect(bandpass);
        bandpass.connect(lowpass);
        lowpass.connect(rainGain);
        rainGain.connect(this.masterGain);
        rainSource.start();

        this.nodes.push(rainSource, bandpass, lowpass, rainGain);

        // Droplet random impulses
        this.dropletInterval = setInterval(() => {
            if (!this.ctx || this.activeSound !== 'rain') return;
            const drop = this.ctx.createOscillator();
            const dropGain = this.ctx.createGain();
            const now = this.ctx.currentTime;
            const freq = 1400 + Math.random() * 1600;

            drop.type = 'sine';
            drop.frequency.setValueAtTime(freq, now);
            drop.frequency.exponentialRampToValueAtTime(freq * 0.4, now + 0.08);

            dropGain.gain.setValueAtTime(0.04 * Math.random(), now);
            dropGain.gain.exponentialRampToValueAtTime(0.0001, now + 0.08);

            drop.connect(dropGain);
            dropGain.connect(this.masterGain);

            drop.start(now);
            drop.stop(now + 0.09);
        }, 120);
    }

    /**
     * Ocean Waves: Pink noise modulated by low-frequency oscillation
     */
    _buildOceanWaves() {
        const bufferSize = this.ctx.sampleRate * 2;
        const noiseBuffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
        const output = noiseBuffer.getChannelData(0);
        let b0 = 0, b1 = 0, b2 = 0;
        for (let i = 0; i < bufferSize; i++) {
            const white = Math.random() * 2 - 1;
            b0 = 0.99886 * b0 + white * 0.0555179;
            b1 = 0.99332 * b1 + white * 0.0750759;
            b2 = 0.96900 * b2 + white * 0.1538520;
            output[i] = (b0 + b1 + b2) * 0.12;
        }

        const waveSource = this.ctx.createBufferSource();
        waveSource.buffer = noiseBuffer;
        waveSource.loop = true;

        const waveFilter = this.ctx.createBiquadFilter();
        waveFilter.type = 'lowpass';
        waveFilter.frequency.setValueAtTime(350, this.ctx.currentTime);

        // LFO to modulate wave swell
        const lfo = this.ctx.createOscillator();
        const lfoGain = this.ctx.createGain();
        lfo.type = 'sine';
        lfo.frequency.setValueAtTime(0.12, this.ctx.currentTime); // ~8 second wave cycle
        lfoGain.gain.setValueAtTime(250, this.ctx.currentTime);

        lfo.connect(lfoGain);
        lfoGain.connect(waveFilter.frequency);

        waveSource.connect(waveFilter);
        waveFilter.connect(this.masterGain);

        waveSource.start();
        lfo.start();

        this.nodes.push(waveSource, waveFilter, lfo, lfoGain);
    }

    /**
     * Deep Brown Noise (Brownian / 1/f^2)
     */
    _buildBrownNoise() {
        const bufferSize = this.ctx.sampleRate * 2;
        const noiseBuffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
        const output = noiseBuffer.getChannelData(0);
        let lastOut = 0.0;
        for (let i = 0; i < bufferSize; i++) {
            const white = Math.random() * 2 - 1;
            output[i] = (lastOut + (0.02 * white)) / 1.02;
            lastOut = output[i];
            output[i] *= 3.5;
        }

        const brownSource = this.ctx.createBufferSource();
        brownSource.buffer = noiseBuffer;
        brownSource.loop = true;

        const brownFilter = this.ctx.createBiquadFilter();
        brownFilter.type = 'lowpass';
        brownFilter.frequency.setValueAtTime(450, this.ctx.currentTime);

        brownSource.connect(brownFilter);
        brownFilter.connect(this.masterGain);
        brownSource.start();

        this.nodes.push(brownSource, brownFilter);
    }
}

export const AmbientAudio = new AmbientAudioEngine();
