// SENSORA 2.0 - SIMULATION ENGINE
// Hydro-meteorological state machine & deterministic flood scenarios

export const STAGES = [
  { id: 0, name: 'NORMAL', label: '1. NORMAL BASELINE' },
  { id: 1, name: 'RAIN_INCREASE', label: '2. INCREASING RAINFALL' },
  { id: 2, name: 'WATER_RISING', label: '3. RISING WATER LEVEL' },
  { id: 3, name: 'FLOOD_DETECTED', label: '4. FLOOD TYPE DETECTED' },
  { id: 4, name: 'RISK_PREDICTED', label: '5. RISK SCORE PREDICTED' },
  { id: 5, name: 'ALERT_GENERATED', label: '6. ALERT GENERATED' },
  { id: 6, name: 'EVACUATION', label: '7. EVACUATION DIRECTIVE' }
];

export const SCENARIOS = {
  slow_saturation: {
    id: 'slow_saturation',
    name: 'Slow Saturation',
    description: 'Prolonged steady rainfall leading to gradual soil saturation and progressive water swelling.',
    modelType: 'Slow Saturation',
    confidence: 93.4,
    rainProfile: [12, 38, 48, 55, 60, 65, 70],
    waterProfile: [1.8, 2.2, 2.8, 3.4, 4.0, 4.6, 5.1],
    soilProfile: [34, 52, 68, 82, 91, 96, 99],
    inflowProfile: [1.2, 2.5, 4.1, 5.8, 7.6, 9.2, 10.5],
    riskScores: [12, 28, 48, 64, 76, 84, 91],
    riskTiers: ['LOW', 'LOW', 'MEDIUM', 'HIGH', 'HIGH', 'CRITICAL', 'CRITICAL']
  },
  cloudburst: {
    id: 'cloudburst',
    name: 'Cloudburst',
    description: 'Sudden extreme precipitation downpour exceeding local catchment drainage capacity.',
    modelType: 'Cloudburst Event',
    confidence: 96.8,
    rainProfile: [14, 65, 115, 138, 120, 95, 75],
    waterProfile: [1.8, 2.4, 3.6, 4.5, 5.2, 5.6, 5.8],
    soilProfile: [32, 45, 62, 79, 88, 92, 94],
    inflowProfile: [1.2, 3.8, 8.5, 13.2, 15.0, 14.1, 12.8],
    riskScores: [14, 38, 68, 85, 93, 97, 98],
    riskTiers: ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL', 'CRITICAL', 'CRITICAL', 'CRITICAL']
  },
  rapid_rise: {
    id: 'rapid_rise',
    name: 'Rapid-Rise Surge',
    description: 'Steep river elevation surge rate (>0.8m/10min) with elevated danger to low-lying households.',
    modelType: 'Rapid-Rise Surge',
    confidence: 95.2,
    rainProfile: [10, 42, 80, 85, 70, 55, 40],
    waterProfile: [1.8, 2.7, 3.9, 4.8, 5.4, 5.7, 5.9],
    soilProfile: [30, 48, 60, 72, 81, 86, 89],
    inflowProfile: [1.1, 4.2, 9.8, 14.6, 16.2, 15.1, 13.5],
    riskScores: [11, 42, 74, 89, 95, 98, 99],
    riskTiers: ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL', 'CRITICAL', 'CRITICAL', 'CRITICAL']
  },
  sudden_upstream: {
    id: 'sudden_upstream',
    name: 'Sudden Upstream Inflow',
    description: 'Massive hydraulic surge originating from upstream reservoir/basin runoff with low local rainfall.',
    modelType: 'Sudden Upstream Inflow',
    confidence: 94.1,
    rainProfile: [12, 18, 22, 25, 24, 20, 18],
    waterProfile: [1.8, 2.5, 3.8, 4.7, 5.3, 5.8, 6.0],
    soilProfile: [33, 36, 40, 46, 52, 56, 58],
    inflowProfile: [1.2, 5.6, 11.8, 17.5, 19.2, 18.0, 16.4],
    riskScores: [12, 35, 71, 88, 94, 98, 99],
    riskTiers: ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL', 'CRITICAL', 'CRITICAL', 'CRITICAL']
  }
};

export const INITIAL_HOUSEHOLDS = [
  {
    id: 'H001',
    name: 'Riverside East',
    elevation: 2.1, // meters above datum
    distance: 45,   // meters from riverbank
    vulnerability: 'High',
    vulnWeight: 1.35,
    description: 'Single-story timber residence; elderly occupants.'
  },
  {
    id: 'H002',
    name: 'Lower Meadow',
    elevation: 3.4,
    distance: 85,
    vulnerability: 'Medium',
    vulnWeight: 1.15,
    description: 'Two-story masonry house; family with children.'
  },
  {
    id: 'H003',
    name: 'South Bend Farm',
    elevation: 4.8,
    distance: 140,
    vulnerability: 'Medium',
    vulnWeight: 1.05,
    description: 'Agricultural compound; livestock and farm assets.'
  },
  {
    id: 'H004',
    name: 'Mid Ridge Hamlet',
    elevation: 7.2,
    distance: 220,
    vulnerability: 'Low',
    vulnWeight: 0.85,
    description: 'Elevated plinth structure; solid drainage.'
  },
  {
    id: 'H005',
    name: 'Hillside View',
    elevation: 12.8,
    distance: 360,
    vulnerability: 'Low',
    vulnWeight: 0.65,
    description: 'High ground residential unit; natural runoff buffer.'
  }
];

export class SimEngine {
  constructor() {
    this.currentScenarioKey = 'cloudburst';
    this.currentStageIndex = 0;
    this.isPlaying = false;
    this.speedMultiplier = 1.0;

    // Simulation state values (smoothly interpolated)
    this.rainfall = 12.0;       // mm/h
    this.waterLevel = 1.82;     // m
    this.prevWaterLevel = 1.82;
    this.riseRate = 0.04;       // m/h
    this.soilMoisture = 34.0;   // %
    this.inflow = 1.2;          // m3/s
    this.riskScore = 14;        // 0 - 100
    this.riskTier = 'LOW';
    this.model2RiskLevel = 'LOW';
    this.model2RiskProbability = 48;
    this.floodType = 'MONITORING';
    this.confidence = 0;

    // Household risk assessments
    this.households = JSON.parse(JSON.stringify(INITIAL_HOUSEHOLDS));
    this.updateHouseholdRisks();

    const ftMap = {
      cloudburst: 'Cloudburst',
      rapid_rise: 'Rapid-Rise',
      slow_saturation: 'Slow Saturation',
      sudden_upstream: 'Sudden Upstream'
    };

    // Send initial environmental baseline data to Model 2
    this.sendToModel2({
      rainfall: this.rainfall,
      waterLevel: this.waterLevel,
      riseRate: this.riseRate,
      soilMoisture: this.soilMoisture,
      floodType: ftMap[this.currentScenarioKey] || SCENARIOS[this.currentScenarioKey].modelType
    });

    // Listeners
    this.listeners = [];
    this.telemetryListeners = [];

    // Animation / tick tracking
    this.lastTickTime = performance.now();
    this.lastTelemetryTime = performance.now();
    this.stageElapsedTime = 0;
    this.stageDuration = 4500; // ms per stage at 1x speed

    // Start tick loop
    this.tick = this.tick.bind(this);
    requestAnimationFrame(this.tick);
  }

  subscribe(listener) {
    this.listeners.push(listener);
    // Initial emit
    listener(this.getState());
  }

  subscribeTelemetry(listener) {
    this.telemetryListeners.push(listener);
    listener(this.getState());
  }

  notify() {
    const state = this.getState();
    for (const fn of this.listeners) {
      fn(state);
    }
  }

  notifyTelemetry() {
    const state = this.getState();
    for (const fn of this.telemetryListeners) {
      fn(state);
    }
  }

  getState() {
    const scenario = SCENARIOS[this.currentScenarioKey];
    return {
      scenarioKey: this.currentScenarioKey,
      scenarioName: scenario.name,
      scenarioDesc: scenario.description,
      stageIndex: this.currentStageIndex,
      stage: STAGES[this.currentStageIndex],
      isPlaying: this.isPlaying,
      speed: this.speedMultiplier,
      rainfall: this.rainfall,
      waterLevel: this.waterLevel,
      riseRate: this.riseRate,
      soilMoisture: this.soilMoisture,
      inflow: this.inflow,
      riskScore: this.riskScore,
      riskTier: this.riskTier,
      model2RiskLevel: this.model2RiskLevel,
      model2RiskProbability: this.model2RiskProbability,
      floodType: this.currentStageIndex >= 3 ? scenario.modelType : 'MONITORING',
      confidence: this.currentStageIndex >= 3 ? scenario.confidence : 0,
      households: this.households,
      alertActive: this.currentStageIndex >= 5,
      evacActive: this.currentStageIndex >= 6
    };
  }

  setScenario(key) {
    if (!SCENARIOS[key]) return;
    this.currentScenarioKey = key;
    this.applyStageValues(this.currentStageIndex);
    this.notify();
    this.notifyTelemetry();
  }

  setSpeed(multiplier) {
    this.speedMultiplier = Math.max(0.25, Math.min(10, multiplier));
    this.notify();
    this.notifyTelemetry();
  }

  play() {
    this.isPlaying = true;
    this.lastTickTime = performance.now();
    this.notify();
    this.notifyTelemetry();
  }

  pause() {
    this.isPlaying = false;
    this.notify();
    this.notifyTelemetry();
  }

  togglePlay() {
    if (this.isPlaying) {
      this.pause();
    } else {
      this.play();
    }
  }

  restart() {
    this.setStage(0);
    this.isPlaying = false;
    this.notify();
    this.notifyTelemetry();
  }

  stepNext() {
    if (this.currentStageIndex < STAGES.length - 1) {
      this.setStage(this.currentStageIndex + 1);
    }
  }

  stepPrev() {
    if (this.currentStageIndex > 0) {
      this.setStage(this.currentStageIndex - 1);
    }
  }

  setStage(stageIdx) {
    const clamped = Math.max(0, Math.min(STAGES.length - 1, stageIdx));
    this.currentStageIndex = clamped;
    this.stageElapsedTime = 0;
    this.applyStageValues(clamped);
    this.notify();
    this.notifyTelemetry();
  }

  applyStageValues(idx) {
    const s = SCENARIOS[this.currentScenarioKey];
    this.prevWaterLevel = this.waterLevel;
    this.rainfall = s.rainProfile[idx];
    this.waterLevel = s.waterProfile[idx];
    this.soilMoisture = s.soilProfile[idx];
    this.inflow = s.inflowProfile[idx];
    this.riskScore = s.riskScores[idx];
    this.riskTier = s.riskTiers[idx];
    
    // Calculate rate of rise (m/hr)
    if (idx === 0) {
      this.riseRate = 0.04;
    } else {
      const delta = (this.waterLevel - s.waterProfile[idx - 1]);
      this.riseRate = Math.max(0.05, Number((delta * 2.2).toFixed(2)));
    }

    if (idx >= 3) {
      this.floodType = s.modelType;
      this.confidence = s.confidence;
    } else {
      this.floodType = 'MONITORING';
      this.confidence = 0;
    }

    this.updateHouseholdRisks();

    const ftMap = {
      cloudburst: 'Cloudburst',
      rapid_rise: 'Rapid-Rise',
      slow_saturation: 'Slow Saturation',
      sudden_upstream: 'Sudden Upstream'
    };

    // Simulation Data → Model 2 → Risk Level & Probability
    this.sendToModel2({
      rainfall: this.rainfall,
      waterLevel: this.waterLevel,
      riseRate: this.riseRate,
      soilMoisture: this.soilMoisture,
      floodType: ftMap[this.currentScenarioKey] || s.modelType
    });
  }

  async sendToModel2(envData) {
    const payload = {
      rainfall_mm: envData.rainfall,
      rainfall_intensity_mm_hr: envData.rainfall,
      rainfall_duration_hr: (this.currentStageIndex + 1) * 0.5,
      water_level_m: envData.waterLevel,
      water_level_rise_rate_m_hr: envData.riseRate,
      water_level_acceleration_m_hr2: 0.1,
      soil_moisture_percent: envData.soilMoisture,
      saturation_index: Number((envData.soilMoisture / 100).toFixed(2)),
      elevation_m: 5.0,
      distance_from_river_m: 100.0,
      vulnerability_level: 'MEDIUM',
      flood_type: envData.floodType || 'Cloudburst'
    };

    try {
      const res = await fetch('http://127.0.0.1:5000/api/model2/predict', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      if (res.ok) {
        const data = await res.json();
        if (data && data.risk_level) {
          this.model2RiskLevel = data.risk_level;
          this.riskTier = data.risk_level;
          const probs = data.probabilities || {};
          const rawProb = data.risk_probability !== undefined
            ? data.risk_probability
            : (probs[data.risk_level] !== undefined ? probs[data.risk_level] : 0);
          this.model2RiskProbability = Number(rawProb);
          console.log('[Simulation Data → Model 2 Output]:', {
            riskLevel: this.model2RiskLevel,
            riskProbability: this.model2RiskProbability
          });
          this.notify();
          this.notifyTelemetry();
          return {
            riskLevel: this.model2RiskLevel,
            riskProbability: this.model2RiskProbability
          };
        }
      }
    } catch (err) {
      console.warn('Simulation Data to Model 2 call:', err.message);
    }
    return null;
  }

  updateHouseholdRisks() {
    // Calculate individual household risk based on river level, elevation, distance and vulnerability
    for (const h of this.households) {
      // Depth margin: how close water level is to house elevation
      const elevationMargin = h.elevation - (this.waterLevel - 1.5);
      
      let baseRisk = this.riskScore;
      if (elevationMargin < 0.3) {
        baseRisk += 35;
      } else if (elevationMargin < 0.8) {
        baseRisk += 20;
      } else if (elevationMargin > 2.5) {
        baseRisk -= 25;
      }

      // Distance factor
      if (h.distance < 60) {
        baseRisk += 15;
      } else if (h.distance > 200) {
        baseRisk -= 20;
      }

      const personalScore = Math.max(5, Math.min(100, Math.round(baseRisk * h.vulnWeight)));
      h.personalScore = personalScore;

      if (personalScore < 30) {
        h.riskLevel = 'LOW';
        h.evacStatus = 'STANDBY';
      } else if (personalScore < 60) {
        h.riskLevel = 'MEDIUM';
        h.evacStatus = 'ADVISORY';
      } else if (personalScore < 80) {
        h.riskLevel = 'HIGH';
        h.evacStatus = 'PREPARE';
      } else {
        h.riskLevel = 'CRITICAL';
        h.evacStatus = 'EVACUATE';
      }
    }
  }

  interpolateTelemetry(progress) {
    const s = SCENARIOS[this.currentScenarioKey];
    if (!s) return;
    const idx = this.currentStageIndex;
    const nextIdx = Math.min(STAGES.length - 1, idx + 1);

    const R0 = s.rainProfile[idx];
    const R1 = s.rainProfile[nextIdx];
    const W0 = s.waterProfile[idx];
    const W1 = s.waterProfile[nextIdx];
    const SM0 = s.soilProfile[idx];
    const SM1 = s.soilProfile[nextIdx];
    const Q0 = s.inflowProfile[idx];
    const Q1 = s.inflowProfile[nextIdx];
    const Risk0 = s.riskScores[idx];
    const Risk1 = s.riskScores[nextIdx];

    // Smooth sinusoidal easing
    const ease = progress < 0.5 ? 2 * progress * progress : 1 - Math.pow(-2 * progress + 2, 2) / 2;
    const nowSec = performance.now() / 1000;
    const rainJitter = Math.sin(nowSec * 3.5) * 0.25;
    const waterJitter = Math.sin(nowSec * 2.8) * 0.008;

    this.rainfall = Math.max(0, Number((R0 + (R1 - R0) * ease + rainJitter).toFixed(1)));
    this.waterLevel = Math.max(1.0, Number((W0 + (W1 - W0) * ease + waterJitter).toFixed(2)));
    this.soilMoisture = Math.max(0, Math.min(100, Number((SM0 + (SM1 - SM0) * ease).toFixed(1))));
    this.inflow = Math.max(0, Number((Q0 + (Q1 - Q0) * ease).toFixed(1)));
    this.riskScore = Math.max(0, Math.min(100, Math.round(Risk0 + (Risk1 - Risk0) * ease)));

    // Calculate dynamic rise rate
    const currentRise = idx === 0 && nextIdx === 0
      ? 0.04
      : Math.max(0.04, Number(((W1 - W0) * 2.2).toFixed(2)));
    this.riseRate = Number(Math.max(0.02, currentRise * (0.85 + 0.3 * ease) + Math.sin(nowSec * 4.2) * 0.01).toFixed(2));

    if (!this.model2RiskLevel) {
      if (this.riskScore < 30) this.riskTier = 'LOW';
      else if (this.riskScore < 60) this.riskTier = 'MEDIUM';
      else if (this.riskScore < 85) this.riskTier = 'HIGH';
      else this.riskTier = 'CRITICAL';
    }
  }

  tick(now) {
    const delta = now - this.lastTickTime;
    this.lastTickTime = now;

    if (this.isPlaying) {
      this.stageElapsedTime += delta * this.speedMultiplier;

      const progress = Math.min(1, Math.max(0, this.stageElapsedTime / this.stageDuration));
      this.interpolateTelemetry(progress);

      // Check if should advance to next stage
      if (this.stageElapsedTime >= this.stageDuration) {
        this.stageElapsedTime = 0;
        if (this.currentStageIndex < STAGES.length - 1) {
          this.setStage(this.currentStageIndex + 1);
        } else {
          // Reached end of simulation
          this.isPlaying = false;
          this.notify();
          this.notifyTelemetry();
        }
      } else {
        // High-frequency live telemetry stream at ~10 Hz (every 100ms)
        if (now - this.lastTelemetryTime >= 100) {
          this.lastTelemetryTime = now;
          this.notifyTelemetry();
        }
      }
    }

    requestAnimationFrame(this.tick);
  }
}
