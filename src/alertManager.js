// SENSORA 2.0 - ALERT MANAGER & SIMULATED COMMUNICATIONS
// Handles emergency broadcast overlays, multi-channel dispatch simulation, and synthesized warning tones

export class AlertManager {
  constructor() {
    this.panel = document.getElementById('emergency-alert-panel');
    this.dismissBtn = document.getElementById('btn-dismiss-alert');
    this.audioBtn = document.getElementById('btn-audio-toggle');
    this.audioLabel = document.getElementById('audio-label');
    this.alertBadgeType = document.getElementById('alert-badge-type');

    // Content fields
    this.floodTypeVal = document.getElementById('alert-flood-type-val');
    this.riskLevelVal = document.getElementById('alert-risk-level-val');
    this.directiveText = document.getElementById('alert-directive-text');
    this.headlineText = document.getElementById('alert-headline-text');

    // Dispatch items
    this.dispSms = document.getElementById('disp-sms');
    this.dispVoice = document.getElementById('disp-voice');
    this.dispSiren = document.getElementById('disp-siren');
    this.dispDispatch = document.getElementById('disp-dispatch');

    // Audio context (Web Audio API)
    this.audioEnabled = false;
    this.audioCtx = null;
    this.sirenOscillator = null;
    this.sirenGain = null;
    this.isDismissedManually = false;
    this.isExpanded = false;
    this.lastAlertSignature = '';

    if (this.panel) {
      this.panel.addEventListener('click', (event) => {
        if (event.target.closest('#btn-dismiss-alert')) return;
        this.isExpanded = true;
        this.panel.classList.add('is-expanded');
      });
    }

    if (this.dismissBtn) {
      this.dismissBtn.addEventListener('click', () => {
        this.hide();
        this.isDismissedManually = true;
      });
    }

    if (this.audioBtn) {
      this.audioBtn.addEventListener('click', () => {
        this.toggleAudio();
      });
    }
  }

  toggleAudio() {
    this.audioEnabled = !this.audioEnabled;
    if (this.audioLabel) {
      this.audioLabel.textContent = this.audioEnabled ? 'Siren: On' : 'Siren: Off';
    }
    if (this.audioBtn) {
      if (this.audioEnabled) {
        this.audioBtn.classList.add('active');
        if (!this.audioCtx) {
          const AudioContextClass = window.AudioContext || window.webkitAudioContext;
          if (AudioContextClass) this.audioCtx = new AudioContextClass();
        }
      } else {
        this.audioBtn.classList.remove('active');
        this.stopTone();
      }
    }
  }

  playWarningTone() {
    if (!this.audioEnabled || !this.audioCtx) return;
    try {
      if (this.audioCtx.state === 'suspended') {
        this.audioCtx.resume();
      }

      if (this.sirenOscillator) return; // already playing

      const osc = this.audioCtx.createOscillator();
      const gain = this.audioCtx.createGain();

      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(440, this.audioCtx.currentTime);
      // Soft wailing modulation
      osc.frequency.linearRampToValueAtTime(780, this.audioCtx.currentTime + 0.6);
      osc.frequency.linearRampToValueAtTime(440, this.audioCtx.currentTime + 1.2);

      gain.gain.setValueAtTime(0.04, this.audioCtx.currentTime); // Keep very soft and gentle

      osc.connect(gain);
      gain.connect(this.audioCtx.destination);
      osc.start();

      this.sirenOscillator = osc;
      this.sirenGain = gain;
    } catch (err) {
      console.warn('Audio tone could not be played:', err);
    }
  }

  stopTone() {
    if (this.sirenOscillator) {
      try {
        this.sirenOscillator.stop();
        this.sirenOscillator.disconnect();
      } catch (e) {
        // ignore
      }
      this.sirenOscillator = null;
    }
  }

  getAlertMode(state) {
    const tier = (state.riskTier || state.model2RiskLevel || 'LOW').toUpperCase();

    if (tier === 'LOW') {
      return {
        show: false,
        badge: 'Normal',
        headline: 'NORMAL MONITORING STATUS',
        directive: 'Continue routine monitoring and maintain standard operational awareness.'
      };
    }

    if (tier === 'MEDIUM') {
      return {
        show: true,
        badge: '⚠ WARNING',
        headline: 'WARNING: RISK LEVEL RISING',
        directive: 'Increase monitoring and readiness for potential flood impacts in low-lying areas.'
      };
    }

    if (tier === 'HIGH') {
      return {
        show: true,
        badge: '⚠ HIGH RISK ALERT',
        headline: 'HIGH RISK ALERT: INUNDATION THREAT DETECTED',
        directive: 'Prepare for rapid response and restrict access to vulnerable lowland settlements.'
      };
    }

    return {
      show: true,
      badge: '🚨 EMERGENCY ALERT',
      headline: 'MANDATORY EVACUATION DIRECTIVE IN EFFECT',
      directive: 'IMMEDIATELY EVACUATE LOWLAND SETTLEMENTS TO SHELTER ALPHA (ELEVATION +480m). FOLLOW GREEN ARROW CORRIDORS.'
    };
  }

  update(state) {
    const alertMode = this.getAlertMode(state);
    const shouldShow = alertMode.show || state.stageIndex >= 5 || state.riskTier === 'CRITICAL';

    if (shouldShow) {
      if (!this.isDismissedManually) {
        this.show(state, alertMode);
      }
      if (this.audioEnabled) {
        this.playWarningTone();
      }
    } else {
      this.hide();
      this.stopTone();
      this.isDismissedManually = false;
    }
  }

  show(state, alertMode = this.getAlertMode(state)) {
    if (!this.panel) return;

    const alertSignature = `${alertMode.badge}|${state.riskTier || 'LOW'}`;
    if (this.lastAlertSignature !== alertSignature) {
      this.isExpanded = false;
      this.lastAlertSignature = alertSignature;
    }

    this.panel.hidden = false;
    this.panel.classList.toggle('is-expanded', this.isExpanded);

    if (this.floodTypeVal) {
      this.floodTypeVal.textContent = (state.floodType || 'RAPID INUNDATION').toUpperCase();
    }
    if (this.riskLevelVal) {
      this.riskLevelVal.textContent = `${state.riskTier || 'LOW'} (SCORE ${Math.round(state.riskScore || 0)}/100)`;
    }
    if (this.alertBadgeType) {
      this.alertBadgeType.textContent = alertMode.badge;
    }
    if (this.headlineText) {
      this.headlineText.textContent = alertMode.headline;
    }
    if (this.directiveText) {
      this.directiveText.textContent = alertMode.directive;
    }

    // Animate simulated communications checklist
    this.animateChecklist();
  }

  animateChecklist() {
    const items = [this.dispSms, this.dispVoice, this.dispSiren, this.dispDispatch];
    items.forEach((item, index) => {
      if (!item) return;
      item.style.opacity = '0';
      item.style.transform = 'translateX(-10px)';
      setTimeout(() => {
        item.style.transition = 'all 0.3s ease';
        item.style.opacity = '1';
        item.style.transform = 'translateX(0)';
      }, 100 + index * 180);
    });
  }

  hide() {
    if (!this.panel) return;
    this.panel.hidden = true;
    this.panel.classList.remove('is-expanded');
    this.isExpanded = false;
    this.stopTone();
  }
}
