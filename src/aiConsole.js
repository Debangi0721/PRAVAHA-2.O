// SENSORA 2.0 - AI CONSOLE & MODEL PREDICTORS
// Handles stage-synchronized AI inference logging, Model 1 flood classification, and Model 2 risk gauge meter

export class AIConsole {
  constructor(onSkip) {
    this.feedEl = document.getElementById('ai-stages-feed');
    this.btnSkip = document.getElementById('btn-skip-ai');
    this.onSkip = onSkip;

    // Model 1 elements
    this.m1Analyzing = document.getElementById('m1-analyzing-pill');
    this.m1Result = document.getElementById('m1-result-pill');
    this.m1TypeText = document.getElementById('m1-flood-type-text');
    this.m1ConfVal = document.getElementById('m1-confidence-val');

    // Model 2 elements
    this.gaugeMeter = document.getElementById('gauge-meter-fill');
    this.gaugeScore = document.getElementById('gauge-score-text');
    this.gaugeTier = document.getElementById('gauge-tier-badge');
    this.m2RiskLevelVal = document.getElementById('m2-risk-level-val');
    this.m2ProbabilityVal = document.getElementById('m2-probability-val');

    this.lastRenderedStage = -1;
    this.lastScenarioKey = null;

    if (this.btnSkip) {
      this.btnSkip.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        this.finishInferenceImmediately();
      });
    }

    this.renderInitialFeed();
  }

  renderInitialFeed() {
    this.lastRenderedStage = -1;
    if (!this.feedEl) return;
    this.feedEl.innerHTML = `
      <div class="ai-stage-item done">
        <span class="stage-state">✓</span>
        <span class="stage-name">Telemetry baseline initialized</span>
        <span class="stage-ms">0ms</span>
      </div>
      <div class="ai-stage-item active">
        <span class="stage-spinner"></span>
        <span class="stage-name">Monitoring hydro-meteorological data stream...</span>
        <span class="stage-ms">Live</span>
      </div>
    `;
  }

  getStageSteps(stageIndex, state) {
    const steps = [];

    // Step 0: Baseline
    steps.push({
      done: true,
      text: 'Telemetry baseline initialized',
      ms: '0ms'
    });

    if (stageIndex === 0) {
      steps.push({
        done: false,
        text: 'Monitoring hydro-meteorological data stream...',
        ms: 'Live'
      });
      return steps;
    }

    // Step 1: Precipitation surge
    steps.push({
      done: stageIndex > 1,
      text: `Sensor stream: Rain surge detected (${state.rainfall ? state.rainfall.toFixed(1) : '14.0'} mm/h)`,
      ms: '42ms'
    });

    if (stageIndex === 1) {
      steps.push({
        done: false,
        text: 'Preprocessing stream & Kalman anomaly filtering...',
        ms: 'Live'
      });
      return steps;
    }

    // Step 2: Rising Water
    steps.push({
      done: stageIndex > 2,
      text: `Feature extraction: Rise rate (+${state.riseRate ? state.riseRate.toFixed(2) : '0.45'} m/h)`,
      ms: '65ms'
    });

    if (stageIndex === 2) {
      steps.push({
        done: false,
        text: `Evaluating soil moisture saturation (${state.soilMoisture ? state.soilMoisture.toFixed(0) : '65'}%)...`,
        ms: 'Live'
      });
      return steps;
    }

    // Step 3: Model 1 Classification
    const floodName = (state.floodType && state.floodType !== 'MONITORING') ? state.floodType : 'Cloudburst Event';
    const confStr = state.confidence ? state.confidence.toFixed(1) : '96.8';
    steps.push({
      done: stageIndex > 3,
      text: `Model 1 (Random Forest): Identified ${floodName.toUpperCase()} (${confStr}%)`,
      ms: '118ms'
    });

    if (stageIndex === 3) {
      steps.push({
        done: false,
        text: 'Running Model 2 (Hydro-Net) Risk Prediction...',
        ms: 'Live'
      });
      return steps;
    }

    // Step 4: Model 2 Risk Prediction
    const m2Level = state.model2RiskLevel || state.riskTier || 'HIGH';
    const m2Prob = state.model2RiskProbability !== undefined ? Math.round(state.model2RiskProbability) : 85;
    steps.push({
      done: stageIndex > 4,
      text: `Model 2 (Random Forest): Risk Level: ${m2Level} | Risk Probability: ${m2Prob}%`,
      ms: '94ms'
    });

    if (stageIndex === 4) {
      steps.push({
        done: false,
        text: 'Evaluating household vulnerability matrix (5 localities)...',
        ms: 'Live'
      });
      return steps;
    }

    // Step 5: Household Assessment & Alert Generation
    steps.push({
      done: stageIndex > 5,
      text: 'Household Risk Matrix: High inundation threat calculated',
      ms: '54ms'
    });

    if (stageIndex === 5) {
      steps.push({
        done: false,
        text: 'Transmitting emergency warning dispatches (Siren/SMS)...',
        ms: 'Live'
      });
      return steps;
    }

    // Step 6: Evacuation Directive
    steps.push({
      done: true,
      text: 'Emergency protocols active: Multi-channel warnings dispatched',
      ms: '38ms'
    });
    steps.push({
      done: true,
      text: 'Dynamic evacuation active: Safe Shelter Alpha (+480m)',
      ms: '82ms'
    });

    return steps;
  }

  updateFeedForStage(state) {
    if (!this.feedEl) return;

    const steps = this.getStageSteps(state.stageIndex, state);
    this.feedEl.innerHTML = '';

    steps.forEach((step) => {
      const item = document.createElement('div');
      item.className = `ai-stage-item ${step.done ? 'done' : 'active'}`;
      item.innerHTML = `
        ${step.done ? '<span class="stage-state">✓</span>' : '<span class="stage-spinner"></span>'}
        <span class="stage-name">${step.text}</span>
        <span class="stage-ms">${step.ms}</span>
      `;
      this.feedEl.appendChild(item);
    });

    this.feedEl.scrollTop = this.feedEl.scrollHeight;
  }

  finishInferenceImmediately() {
    if (this.onSkip) {
      this.onSkip();
    }
  }

  render(state) {
    // 1. Update AI Reasoning stages feed whenever stage or scenario updates
    if (this.lastRenderedStage !== state.stageIndex || this.lastScenarioKey !== state.scenarioKey) {
      this.lastRenderedStage = state.stageIndex;
      this.lastScenarioKey = state.scenarioKey;
      this.updateFeedForStage(state);
    }

    // 2. Model 1: Flood Type Detection
    if (state.stageIndex >= 3) {
      if (this.m1Analyzing) this.m1Analyzing.hidden = true;
      if (this.m1Result) this.m1Result.hidden = false;
      if (this.m1TypeText) this.m1TypeText.textContent = state.floodType.toUpperCase();
      if (this.m1ConfVal) this.m1ConfVal.textContent = `${state.confidence.toFixed(1)}%`;
    } else {
      if (this.m1Analyzing) this.m1Analyzing.hidden = false;
      if (this.m1Result) this.m1Result.hidden = true;
    }

    // 3. Model 2: Risk Level & Radial Gauge
    const m2Level = state.model2RiskLevel || state.riskTier || 'LOW';
    const m2Prob = state.model2RiskProbability !== undefined ? state.model2RiskProbability : (state.riskScore || 0);
    this.updateRiskGauge(m2Prob, m2Level);
  }

  updateRiskGauge(prob, level) {
    const roundedProb = Math.round(prob);
    const probStr = `${roundedProb}%`;

    if (this.gaugeScore) {
      this.gaugeScore.textContent = probStr;
    }

    if (this.gaugeTier) {
      this.gaugeTier.className = `risk-tier-badge tier-${level.toLowerCase()}`;
      if (this.m2RiskLevelVal) {
        this.m2RiskLevelVal.textContent = level;
      } else {
        this.gaugeTier.textContent = `Risk Level: ${level}`;
      }
    }

    if (this.m2ProbabilityVal) {
      this.m2ProbabilityVal.textContent = probStr;
    }

    if (this.gaugeMeter) {
      // Arc circumference is ~188px
      const clampedProb = Math.max(0, Math.min(100, prob));
      const offset = 188 - (clampedProb / 100) * 188;
      this.gaugeMeter.style.strokeDashoffset = offset.toString();

      // Stroke color based on risk level
      if (level === 'CRITICAL') {
        this.gaugeMeter.setAttribute('stroke', '#ef4444');
      } else if (level === 'HIGH') {
        this.gaugeMeter.setAttribute('stroke', '#f97316');
      } else if (level === 'MEDIUM') {
        this.gaugeMeter.setAttribute('stroke', '#f59e0b');
      } else {
        this.gaugeMeter.setAttribute('stroke', '#22c55e');
      }
    }
  }
}
