// SENSORA 2.0 - DIGITAL TWIN VIEW
// Schematic vector environment, dynamic hydrology visuals, rain particles, and household markers

export class DigitalTwinView {
  constructor(containerId, onHouseholdClick) {
    this.container = document.getElementById(containerId);
    this.canvas = document.getElementById('weather-canvas');
    this.ctx = this.canvas ? this.canvas.getContext('2d') : null;
    this.svg = document.getElementById('schematic-svg');
    this.onHouseholdClick = onHouseholdClick;

    // Elements
    this.riverWater = document.getElementById('river-water');
    this.riverDepthText = document.getElementById('svg-river-depth-text');
    this.soilOverlay = document.getElementById('soil-moisture-overlay');
    this.floodPlain = document.getElementById('flood-plain-zone');
    this.floodHazard = document.getElementById('flood-hazard-line');
    this.evacRoutes = document.getElementById('evacuation-routes');
    
    // Station LEDs
    this.ledRain = document.getElementById('sensor-rain-led');
    this.ledWater = document.getElementById('sensor-water-led');
    this.ledSoil = document.getElementById('sensor-soil-led');

    // Packets
    this.packetRain = document.getElementById('packet-rain');
    this.packetWater = document.getElementById('packet-water');
    this.packetSoil = document.getElementById('packet-soil');

    // Particles system for rainfall
    this.drops = [];
    this.maxDrops = 180;
    this.rainIntensity = 12.0;
    this.isReducedMotion = false;

    this.initCanvas();
    this.initHouseholds();
    this.initDataPackets();
    this.animateRain = this.animateRain.bind(this);
    requestAnimationFrame(this.animateRain);

    window.addEventListener('resize', () => this.initCanvas());
  }

  initCanvas() {
    if (!this.canvas) return;
    const rect = this.canvas.getBoundingClientRect();
    this.canvas.width = rect.width;
    this.canvas.height = rect.height;

    this.drops = [];
    for (let i = 0; i < this.maxDrops; i++) {
      this.drops.push({
        x: Math.random() * this.canvas.width,
        y: Math.random() * this.canvas.height,
        length: 8 + Math.random() * 12,
        speed: 4 + Math.random() * 6,
        opacity: 0.15 + Math.random() * 0.3
      });
    }
  }

  initHouseholds() {
    const housePins = this.svg.querySelectorAll('.household-pin');
    housePins.forEach(pin => {
      const houseId = pin.getAttribute('data-id');
      pin.addEventListener('click', (e) => {
        e.stopPropagation();
        if (this.onHouseholdClick) {
          this.onHouseholdClick(houseId, pin);
        }
      });
      pin.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          if (this.onHouseholdClick) {
            this.onHouseholdClick(houseId, pin);
          }
        }
      });
    });
  }

  initDataPackets() {
    // Data packet transmission along bus lines (Requirement D)
    this.packetProgress = 0;
  }

  setReducedMotion(enabled) {
    this.isReducedMotion = enabled;
    if (enabled && this.ctx) {
      this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    }
  }

  render(state) {
    const riskTier = (state.riskTier || state.model2RiskLevel || 'LOW').toUpperCase();
    const riskFactor = riskTier === 'CRITICAL' ? 1.2 : riskTier === 'HIGH' ? 0.9 : riskTier === 'MEDIUM' ? 0.5 : 0.1;
    this.rainIntensity = state.rainfall * (1 + riskFactor * 0.4);

    // 1. Update River Visuals & Depth label
    if (this.riverDepthText) {
      this.riverDepthText.textContent = `LEVEL: ${state.waterLevel.toFixed(2)}m | ${state.inflow.toFixed(1)} m³/s`;
    }

    // River water expansion and coloring based on risk / level
    if (this.riverWater) {
      if (state.waterLevel > 4.2 || riskTier === 'HIGH' || riskTier === 'CRITICAL') {
        this.riverWater.setAttribute('fill', 'url(#riverGradFlood)');
      } else {
        this.riverWater.setAttribute('fill', 'url(#riverGradNormal)');
      }
    }

    // 2. Flood Inundation Overlay (Requirement J: flooded/unsafe areas)
    if (this.floodPlain && this.floodHazard) {
      // Inundation starts becoming visible past 2.8m, fully visible at >4.8m
      const floodOpacity = Math.max(0, Math.min(0.95, ((state.waterLevel - 2.5) / 2.8) + (riskFactor * 0.2)));
      this.floodPlain.style.opacity = floodOpacity.toString();
      this.floodHazard.style.opacity = (floodOpacity * 1.2).toString();
      
      // Expand inundation polygon downwards/outwards
      const scaleY = 1 + floodOpacity * 0.25;
      this.floodPlain.setAttribute('transform', `scale(1, ${scaleY}) translate(0, ${-20 * floodOpacity})`);
    }

    // 3. Soil Saturation Overlay (Requirement C: ground gradually becomes saturated)
    if (this.soilOverlay) {
      const soilOpacity = Math.max(0.08, Math.min(0.65, (state.soilMoisture / 100) + (riskFactor * 0.15)));
      this.soilOverlay.setAttribute('opacity', soilOpacity.toString());
      if (state.soilMoisture > 85 || riskTier === 'HIGH' || riskTier === 'CRITICAL') {
        this.soilOverlay.setAttribute('fill', '#0284c7'); // Saturated waterlogging blue
      } else {
        this.soilOverlay.setAttribute('fill', '#3b82f6');
      }
    }

    // 4. Sensor Stations Status LEDs
    if (this.ledRain) {
      if (state.rainfall > 70) {
        this.ledRain.setAttribute('fill', '#ef4444');
      } else if (state.rainfall > 35) {
        this.ledRain.setAttribute('fill', '#f59e0b');
      } else {
        this.ledRain.setAttribute('fill', '#0ea5e9');
      }
    }

    if (this.ledWater) {
      if (state.waterLevel >= 4.6) {
        this.ledWater.setAttribute('fill', '#ef4444');
      } else if (state.waterLevel >= 3.2) {
        this.ledWater.setAttribute('fill', '#f59e0b');
      } else {
        this.ledWater.setAttribute('fill', '#22c55e');
      }
    }

    if (this.ledSoil) {
      if (state.soilMoisture > 85) {
        this.ledSoil.setAttribute('fill', '#ef4444');
      } else if (state.soilMoisture > 65) {
        this.ledSoil.setAttribute('fill', '#f59e0b');
      } else {
        this.ledSoil.setAttribute('fill', '#22c55e');
      }
    }

    // 5. Update Households Risk Indicators (Requirement H)
    if (state.households) {
      for (const h of state.households) {
        const dot = document.getElementById(`house-dot-${h.id}`);
        if (dot) {
          dot.className.baseVal = `house-risk-dot dot-${h.riskLevel.toLowerCase()}`;
        }
      }
    }

    // 6. Evacuation Guidance Routes (Requirement J)
    if (this.evacRoutes) {
      if (state.evacActive || riskTier === 'CRITICAL' || riskTier === 'HIGH') {
        this.evacRoutes.style.opacity = '1';
      } else {
        this.evacRoutes.style.opacity = '0';
      }
    }

    // 7. Data packet flow animation along telemetry bus lines (Requirement D)
    this.updateDataPackets(state);
  }

  updateDataPackets(state) {
    if (this.isReducedMotion) return;

    this.packetProgress = (this.packetProgress + 0.015 * state.speed) % 1;

    // Bus line 1: Rain Gauge (190, 260) -> Central Gateway (500, 60)
    if (this.packetRain) {
      const rx = 190 + (500 - 190) * this.packetProgress;
      const ry = 260 + (60 - 260) * this.packetProgress;
      this.packetRain.setAttribute('cx', rx);
      this.packetRain.setAttribute('cy', ry);
    }

    // Bus line 2: Water Radar (480, 430) -> Central Gateway (500, 60)
    if (this.packetWater) {
      const prog2 = (this.packetProgress + 0.33) % 1;
      const wx = 480 + (500 - 480) * prog2;
      const wy = 430 + (60 - 430) * prog2;
      this.packetWater.setAttribute('cx', wx);
      this.packetWater.setAttribute('cy', wy);
    }

    // Bus line 3: Soil Probe (730, 360) -> Central Gateway (500, 60)
    if (this.packetSoil) {
      const prog3 = (this.packetProgress + 0.66) % 1;
      const sx = 730 + (500 - 730) * prog3;
      const sy = 360 + (60 - 360) * prog3;
      this.packetSoil.setAttribute('cx', sx);
      this.packetSoil.setAttribute('cy', sy);
    }
  }

  animateRain() {
    if (!this.isReducedMotion && this.ctx && this.canvas) {
      this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

      // Determine active particle count based on rain intensity
      const activeCount = Math.min(
        this.maxDrops,
        Math.max(15, Math.floor((this.rainIntensity / 100) * this.maxDrops))
      );

      const speedFactor = 1 + (this.rainIntensity / 100) * 2;
      this.ctx.strokeStyle = 'rgba(186, 230, 253, 0.45)';
      this.ctx.lineWidth = 1.2;

      for (let i = 0; i < activeCount; i++) {
        const drop = this.drops[i];
        if (!drop) continue;

        this.ctx.beginPath();
        this.ctx.moveTo(drop.x, drop.y);
        // Slight wind shear slant
        this.ctx.lineTo(drop.x - 1.5, drop.y + drop.length);
        this.ctx.stroke();

        drop.y += drop.speed * speedFactor;
        drop.x -= 0.6;

        if (drop.y > this.canvas.height) {
          drop.y = -drop.length;
          drop.x = Math.random() * (this.canvas.width + 100);
        }
      }
    }

    requestAnimationFrame(this.animateRain);
  }
}
