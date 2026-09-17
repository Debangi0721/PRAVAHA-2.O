// SENSORA 2.0 - HOUSEHOLD-LEVEL RISK MODULE
// Calculates personalized household risk based on Model 2 risk prediction + household information.

export class HouseholdRiskModule {
  constructor(options = {}) {
    // Current household input parameters
    this.distance = 85;       // meters
    this.elevation = 3.4;     // meters
    this.vulnerability = 'MEDIUM'; // 'LOW' | 'MEDIUM' | 'HIGH'
    this.activePresetId = 'H002';

    // Model 2 baseline state
    this.model2RiskLevel = 'LOW';
    this.model2RiskProbability = 48;
    this.waterLevel = 1.82;

    this.initEventListeners();
    this.recalculateAndRender();
  }

  initEventListeners() {
    // 1. Distance Inputs & Range Sliders
    const distInputs = document.querySelectorAll('.hr-sync-dist');
    const distRanges = document.querySelectorAll('.hr-sync-range-dist');

    distInputs.forEach(input => {
      input.addEventListener('input', (e) => {
        const val = Math.max(10, Math.min(500, parseFloat(e.target.value) || 10));
        this.distance = val;
        this.syncDistInputs(val);
        this.clearActivePreset();
        this.recalculateAndRender();
      });
    });

    distRanges.forEach(range => {
      range.addEventListener('input', (e) => {
        const val = parseFloat(e.target.value);
        this.distance = val;
        this.syncDistInputs(val);
        this.clearActivePreset();
        this.recalculateAndRender();
      });
    });

    // 2. Elevation Inputs & Range Sliders
    const elevInputs = document.querySelectorAll('.hr-sync-elev');
    const elevRanges = document.querySelectorAll('.hr-sync-range-elev');

    elevInputs.forEach(input => {
      input.addEventListener('input', (e) => {
        const val = Math.max(0.5, Math.min(25, parseFloat(e.target.value) || 0.5));
        this.elevation = val;
        this.syncElevInputs(val);
        this.clearActivePreset();
        this.recalculateAndRender();
      });
    });

    elevRanges.forEach(range => {
      range.addEventListener('input', (e) => {
        const val = parseFloat(e.target.value);
        this.elevation = val;
        this.syncElevInputs(val);
        this.clearActivePreset();
        this.recalculateAndRender();
      });
    });

    // 3. Vulnerability Selectors
    const vulnSelects = document.querySelectorAll('.hr-sync-vuln');
    vulnSelects.forEach(select => {
      select.addEventListener('change', (e) => {
        this.vulnerability = e.target.value.toUpperCase();
        this.syncVulnInputs(this.vulnerability);
        this.clearActivePreset();
        this.recalculateAndRender();
      });
    });

    // 4. Household Presets
    const presetPills = document.querySelectorAll('.hr-preset-pill');
    presetPills.forEach(pill => {
      pill.addEventListener('click', () => {
        const hid = pill.dataset.houseId;
        this.applyPreset(hid);
      });
    });
  }

  syncDistInputs(val) {
    document.querySelectorAll('.hr-sync-dist').forEach(el => { el.value = val; });
    document.querySelectorAll('.hr-sync-range-dist').forEach(el => { el.value = val; });
  }

  syncElevInputs(val) {
    document.querySelectorAll('.hr-sync-elev').forEach(el => { el.value = val; });
    document.querySelectorAll('.hr-sync-range-elev').forEach(el => { el.value = val; });
  }

  syncVulnInputs(val) {
    document.querySelectorAll('.hr-sync-vuln').forEach(el => { el.value = val; });
  }

  clearActivePreset() {
    this.activePresetId = 'custom';
    document.querySelectorAll('.hr-preset-pill').forEach(p => {
      p.classList.toggle('active', p.dataset.houseId === 'custom');
    });
  }

  applyPreset(presetId) {
    const presets = {
      H001: { distance: 45, elevation: 2.1, vulnerability: 'HIGH' },
      H002: { distance: 85, elevation: 3.4, vulnerability: 'MEDIUM' },
      H003: { distance: 140, elevation: 4.8, vulnerability: 'MEDIUM' },
      H004: { distance: 220, elevation: 7.2, vulnerability: 'LOW' },
      H005: { distance: 360, elevation: 12.8, vulnerability: 'LOW' }
    };

    if (presetId === 'custom') {
      this.clearActivePreset();
      return;
    }

    if (presets[presetId]) {
      const p = presets[presetId];
      this.distance = p.distance;
      this.elevation = p.elevation;
      this.vulnerability = p.vulnerability;
      this.activePresetId = presetId;

      this.syncDistInputs(p.distance);
      this.syncElevInputs(p.elevation);
      this.syncVulnInputs(p.vulnerability);

      document.querySelectorAll('.hr-preset-pill').forEach(pill => {
        pill.classList.toggle('active', pill.dataset.houseId === presetId);
      });

      this.recalculateAndRender();
    }
  }

  /**
   * Set inputs externally (e.g. from schematic pin or list row click)
   */
  setHouseholdInputs({ distance, elevation, vulnerability, houseId }) {
    if (distance !== undefined) {
      this.distance = Number(distance);
      this.syncDistInputs(this.distance);
    }
    if (elevation !== undefined) {
      this.elevation = Number(elevation);
      this.syncElevInputs(this.elevation);
    }
    if (vulnerability !== undefined) {
      this.vulnerability = String(vulnerability).toUpperCase();
      this.syncVulnInputs(this.vulnerability);
    }
    if (houseId) {
      this.activePresetId = houseId;
      document.querySelectorAll('.hr-preset-pill').forEach(pill => {
        pill.classList.toggle('active', pill.dataset.houseId === houseId);
      });
    }

    this.recalculateAndRender();
  }

  /**
   * Called on simulation state update
   * Updates base Model 2 risk prediction and current water level
   */
  updateState(state) {
    if (state.model2RiskLevel) {
      this.model2RiskLevel = state.model2RiskLevel;
    } else if (state.riskTier) {
      this.model2RiskLevel = state.riskTier;
    }

    if (state.model2RiskProbability !== undefined) {
      this.model2RiskProbability = state.model2RiskProbability;
    }

    if (state.waterLevel !== undefined) {
      this.waterLevel = state.waterLevel;
    }

    this.recalculateAndRender();
  }

  /**
   * Calculate personalized household risk score & tier
   * using Model 2 risk as the base + household inputs
   */
  calculateHouseholdRisk() {
    // 1. Base Model 2 Risk Mapping
    const m2BaseMap = {
      LOW: 20,
      MEDIUM: 48,
      HIGH: 74,
      CRITICAL: 92
    };
    const m2Base = m2BaseMap[this.model2RiskLevel] || 25;

    // Blend with Model 2 probability for smooth continuous scaling
    const baseScore = Math.round(m2Base * 0.6 + (this.model2RiskProbability || m2Base) * 0.4);

    // 2. Elevation Margin Factor (relative to current river water level)
    const waterFreeboard = this.elevation - this.waterLevel;
    let elevationAdjustment = 0;
    if (waterFreeboard < 0) {
      // Submerged or negative freeboard
      elevationAdjustment = +35;
    } else if (waterFreeboard < 0.5) {
      elevationAdjustment = +25;
    } else if (waterFreeboard < 1.2) {
      elevationAdjustment = +12;
    } else if (waterFreeboard > 4.0) {
      elevationAdjustment = -25;
    } else if (waterFreeboard > 2.5) {
      elevationAdjustment = -15;
    }

    // 3. Distance from River Channel Factor
    let distanceAdjustment = 0;
    if (this.distance < 50) {
      distanceAdjustment = +20;
    } else if (this.distance < 100) {
      distanceAdjustment = +10;
    } else if (this.distance < 200) {
      distanceAdjustment = 0;
    } else if (this.distance < 300) {
      distanceAdjustment = -10;
    } else {
      distanceAdjustment = -20;
    }

    // 4. Vulnerability Level Multiplier
    const vulnMultiplierMap = {
      LOW: 0.85,
      MEDIUM: 1.0,
      HIGH: 1.25
    };
    const vulnMultiplier = vulnMultiplierMap[this.vulnerability] || 1.0;

    // Combined Personalized Risk Score
    const rawScore = (baseScore + elevationAdjustment + distanceAdjustment) * vulnMultiplier;
    const personalScore = Math.max(5, Math.min(100, Math.round(rawScore)));

    // Categorize Household Risk: LOW / MEDIUM / HIGH / CRITICAL
    let householdRisk = 'LOW';
    if (personalScore >= 80) {
      householdRisk = 'CRITICAL';
    } else if (personalScore >= 60) {
      householdRisk = 'HIGH';
    } else if (personalScore >= 30) {
      householdRisk = 'MEDIUM';
    } else {
      householdRisk = 'LOW';
    }

    return {
      model2Result: this.model2RiskLevel,
      model2Probability: Math.round(this.model2RiskProbability),
      householdRisk,
      personalScore,
      waterFreeboard: waterFreeboard.toFixed(2),
      breakdown: {
        baseScore,
        elevationAdjustment,
        distanceAdjustment,
        vulnMultiplier
      }
    };
  }

  recalculateAndRender() {
    const result = this.calculateHouseholdRisk();

    // 1. Show Flood Risk: [Model 2 result]
    document.querySelectorAll('.hr-sync-flood-risk, #hr-flood-risk-val').forEach(el => {
      el.textContent = result.model2Result;
      el.className = `hr-risk-value hr-sync-flood-risk tier-${result.model2Result.toLowerCase()}`;
    });

    // 2. Show Household Risk: LOW / MEDIUM / HIGH / CRITICAL
    document.querySelectorAll('.hr-sync-household-risk, #hr-household-risk-val').forEach(el => {
      el.textContent = result.householdRisk;
      el.className = `hr-risk-value hr-sync-household-risk tier-${result.householdRisk.toLowerCase()}`;
    });

    // Score and breakdown displays
    document.querySelectorAll('.hr-sync-score, #hr-score-val').forEach(el => {
      el.textContent = `${result.personalScore}/100`;
    });

    const eSign = result.breakdown.elevationAdjustment >= 0 ? `+${result.breakdown.elevationAdjustment}` : `${result.breakdown.elevationAdjustment}`;
    const dSign = result.breakdown.distanceAdjustment >= 0 ? `+${result.breakdown.distanceAdjustment}` : `${result.breakdown.distanceAdjustment}`;
    const breakdownText = `Model 2 Base: ${result.breakdown.baseScore} | Elev: ${eSign} | Dist: ${dSign} | Vuln: ${result.breakdown.vulnMultiplier}x`;

    document.querySelectorAll('.hr-sync-breakdown, #hr-breakdown-text').forEach(el => {
      el.textContent = breakdownText;
    });

    return result;
  }
}
