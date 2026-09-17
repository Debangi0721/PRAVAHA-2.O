// SENSORA 2.0 - SYNCHRONIZED TELEMETRY CHARTS
// Ultra-lightweight, 60fps Canvas 2D charts synchronized with the hydrology simulation

export class TelemetryCharts {
  constructor() {
    this.rainCanvas = document.getElementById('canvas-chart-rain');
    this.riverCanvas = document.getElementById('canvas-chart-river');
    this.riseCanvas = document.getElementById('canvas-chart-rise');
    this.riskCanvas = document.getElementById('canvas-chart-risk');
    this.soilCanvas = document.getElementById('canvas-chart-soil');

    this.rainValText = document.getElementById('chart-val-rain');
    this.riverValText = document.getElementById('chart-val-river');
    this.riseValText = document.getElementById('chart-val-rise');
    this.riskValText = document.getElementById('chart-val-risk');
    this.soilValText = document.getElementById('chart-val-soil');

    // Historical buffers (last 28 telemetry points)
    this.bufferLength = 28;
    this.rainHistory = new Array(this.bufferLength).fill(12);
    this.riverHistory = new Array(this.bufferLength).fill(1.82);
    this.riseHistory = new Array(this.bufferLength).fill(0.04);
    this.riskHistory = new Array(this.bufferLength).fill(14);
    this.soilHistory = new Array(this.bufferLength).fill(34);

    this.initAllCharts();

    window.addEventListener('resize', () => {
      this.initAllCharts();
      this.renderAll();
    });
  }

  initAllCharts() {
    this.initChart(this.rainCanvas);
    this.initChart(this.riverCanvas);
    this.initChart(this.riseCanvas);
    this.initChart(this.riskCanvas);
    this.initChart(this.soilCanvas);
  }

  initChart(canvas) {
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const dpr = window.devicePixelRatio || 1;
    const w = rect.width > 0 ? rect.width : 400;
    const h = rect.height > 0 ? rect.height : 85;
    canvas.width = Math.round(w * dpr);
    canvas.height = Math.round(h * dpr);
  }

  reset() {
    this.rainHistory = new Array(this.bufferLength).fill(12);
    this.riverHistory = new Array(this.bufferLength).fill(1.82);
    this.riseHistory = new Array(this.bufferLength).fill(0.04);
    this.riskHistory = new Array(this.bufferLength).fill(14);
    this.soilHistory = new Array(this.bufferLength).fill(34);
    this.renderAll();
  }

  update(param1, param2, param3, param4, param5, param6, param7, param8) {
    let rainfall = 12.0;
    let waterLevel = 1.82;
    let riseRate = 0.04;
    let riskScore = 14;
    let riskTier = 'LOW';
    let soilMoisture = 34.0;
    let model2RiskLevel = null;
    let model2RiskProbability = null;

    if (typeof param1 === 'object' && param1 !== null) {
      rainfall = Number(param1.rainfall ?? 12.0);
      waterLevel = Number(param1.waterLevel ?? 1.82);
      riseRate = Number(param1.riseRate ?? 0.04);
      riskScore = Number(param1.riskScore ?? 14);
      riskTier = param1.riskTier || 'LOW';
      soilMoisture = Number(param1.soilMoisture ?? 34.0);
      model2RiskLevel = param1.model2RiskLevel || null;
      model2RiskProbability = param1.model2RiskProbability ?? null;
    } else {
      rainfall = Number(param1 ?? 12.0);
      waterLevel = Number(param2 ?? 1.82);
      riseRate = Number(param3 ?? 0.04);
      riskScore = Number(param4 ?? 14);
      riskTier = param5 || 'LOW';
      soilMoisture = Number(param6 ?? 34.0);
      model2RiskLevel = param7 || null;
      model2RiskProbability = param8 ?? null;
    }

    // Determine effective risk metric
    const effectiveRiskTier = model2RiskLevel || riskTier || 'LOW';
    const effectiveRiskProb = (model2RiskProbability !== null && model2RiskProbability !== undefined && model2RiskProbability > 0)
      ? Number(model2RiskProbability)
      : Math.min(100, Math.max(0, riskScore));

    // Push new values to historical rolling buffers
    this.rainHistory.shift();
    this.rainHistory.push(rainfall);

    this.riverHistory.shift();
    this.riverHistory.push(waterLevel);

    this.riseHistory.shift();
    this.riseHistory.push(riseRate);

    this.riskHistory.shift();
    this.riskHistory.push(effectiveRiskProb);

    this.soilHistory.shift();
    this.soilHistory.push(soilMoisture);

    // Update text labels
    if (this.rainValText) {
      this.rainValText.textContent = `${rainfall.toFixed(1)} mm/h`;
    }
    if (this.riverValText) {
      this.riverValText.textContent = `${waterLevel.toFixed(2)} m`;
    }
    if (this.riseValText) {
      const sign = riseRate >= 0 ? '+' : '';
      this.riseValText.textContent = `${sign}${riseRate.toFixed(2)} m/h`;
    }
    if (this.riskValText) {
      this.riskValText.textContent = `${effectiveRiskTier} (${Math.round(effectiveRiskProb)}%)`;
      if (effectiveRiskTier === 'CRITICAL') {
        this.riskValText.style.color = '#ef4444';
      } else if (effectiveRiskTier === 'HIGH') {
        this.riskValText.style.color = '#f97316';
      } else if (effectiveRiskTier === 'MEDIUM') {
        this.riskValText.style.color = '#f59e0b';
      } else {
        this.riskValText.style.color = '#22c55e';
      }
    }
    if (this.soilValText) {
      this.soilValText.textContent = `${soilMoisture.toFixed(1)}%`;
    }

    // Render all canvases
    this.renderAll();
  }

  renderAll() {
    // 1. Rainfall Chart (0 to 150 mm/h)
    this.renderChart(this.rainCanvas, this.rainHistory, 0, 150, '#38bdf8', 'rgba(56, 189, 248, 0.15)', [
      { val: 60, color: '#f59e0b', label: 'HEAVY' },
      { val: 100, color: '#ef4444', label: 'TORRENT' }
    ]);

    // 2. River Level Chart (1.0 to 6.5 m)
    this.renderChart(this.riverCanvas, this.riverHistory, 1.0, 6.5, '#22c55e', 'rgba(34, 197, 94, 0.15)', [
      { val: 3.2, color: '#f59e0b', label: 'WARN 3.2m' },
      { val: 4.6, color: '#ef4444', label: 'DANGER 4.6m' }
    ]);

    // 3. Water Level Rise Rate Chart (0.0 to 2.5 m/h)
    this.renderChart(this.riseCanvas, this.riseHistory, 0.0, 2.5, '#f59e0b', 'rgba(245, 158, 11, 0.15)', [
      { val: 0.8, color: '#ef4444', label: 'SURGE 0.8m/h' }
    ]);

    // 4. Flood Risk Level & Probability Chart (0 to 100%)
    this.renderChart(this.riskCanvas, this.riskHistory, 0, 100, '#ef4444', 'rgba(239, 68, 68, 0.15)', [
      { val: 40, color: '#f59e0b', label: 'MED 40%' },
      { val: 75, color: '#ef4444', label: 'CRIT 75%' }
    ]);

    // 5. Soil Saturation Chart (0 to 100%)
    this.renderChart(this.soilCanvas, this.soilHistory, 0, 100, '#a855f7', 'rgba(168, 85, 247, 0.15)', [
      { val: 85, color: '#ef4444', label: 'SATURATED' }
    ]);
  }

  renderChart(canvas, data, minVal, maxVal, lineColor, fillColor, thresholds = []) {
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const w = canvas.width;
    const h = canvas.height;
    if (w <= 0 || h <= 0) return;

    ctx.clearRect(0, 0, w, h);

    const padTop = 10;
    const padBottom = 10;
    const chartHeight = Math.max(10, h - padTop - padBottom);
    const stepX = w / Math.max(1, data.length - 1);

    // Draw horizontal grid lines
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.05)';
    ctx.lineWidth = 1;
    for (let i = 1; i <= 3; i++) {
      const y = padTop + (chartHeight / 4) * i;
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(w, y);
      ctx.stroke();
    }

    // Draw threshold guidelines
    thresholds.forEach(th => {
      const normY = (th.val - minVal) / (maxVal - minVal);
      const y = padTop + chartHeight * (1 - Math.max(0, Math.min(1, normY)));
      ctx.save();
      ctx.strokeStyle = th.color;
      ctx.lineWidth = 1.2;
      ctx.setLineDash([4, 4]);
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(w, y);
      ctx.stroke();

      ctx.fillStyle = th.color;
      ctx.font = '10px monospace';
      ctx.fillText(th.label, w - 75, y - 3);
      ctx.restore();
    });

    // Draw area fill
    ctx.beginPath();
    for (let i = 0; i < data.length; i++) {
      const normVal = (data[i] - minVal) / (maxVal - minVal);
      const x = i * stepX;
      const y = padTop + chartHeight * (1 - Math.max(0, Math.min(1, normVal)));
      if (i === 0) {
        ctx.moveTo(x, y);
      } else {
        ctx.lineTo(x, y);
      }
    }
    ctx.lineTo(w, h);
    ctx.lineTo(0, h);
    ctx.closePath();
    ctx.fillStyle = fillColor;
    ctx.fill();

    // Draw stroke line
    ctx.beginPath();
    for (let i = 0; i < data.length; i++) {
      const normVal = (data[i] - minVal) / (maxVal - minVal);
      const x = i * stepX;
      const y = padTop + chartHeight * (1 - Math.max(0, Math.min(1, normVal)));
      if (i === 0) {
        ctx.moveTo(x, y);
      } else {
        ctx.lineTo(x, y);
      }
    }
    ctx.strokeStyle = lineColor;
    ctx.lineWidth = 2;
    ctx.stroke();

    // Draw end pulsing point
    const lastVal = data[data.length - 1];
    const lastNorm = (lastVal - minVal) / (maxVal - minVal);
    const lastX = w;
    const lastY = padTop + chartHeight * (1 - Math.max(0, Math.min(1, lastNorm)));

    ctx.beginPath();
    ctx.arc(lastX - 3, lastY, 4, 0, Math.PI * 2);
    ctx.fillStyle = '#ffffff';
    ctx.fill();
    ctx.beginPath();
    ctx.arc(lastX - 3, lastY, 7, 0, Math.PI * 2);
    ctx.strokeStyle = lineColor;
    ctx.lineWidth = 1.5;
    ctx.stroke();
  }
}
