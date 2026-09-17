// SENSORA 2.0 - PIPELINE FLOW
// Controls the step-by-step visual data transmission pipeline from field sensors to personalized early warning alert

export class PipelineFlow {
  constructor() {
    this.nodes = [
      { id: 'node-sensor', arrow: 'arrow-1' },
      { id: 'node-preprocess', arrow: 'arrow-2' },
      { id: 'node-model1', arrow: 'arrow-3' },
      { id: 'node-model2', arrow: 'arrow-4' },
      { id: 'node-households', arrow: 'arrow-5' },
      { id: 'node-alert', arrow: null }
    ];

    this.activeStep = 0;
    this.timer = null;
  }

  updateStage(stageIndex) {
    // Map simulation stage (0 to 6) to active pipeline nodes
    // Stage 0: Sensors transmitting
    // Stage 1: Preprocessing & telemetry surge
    // Stage 2: Feature extraction
    // Stage 3: Model 1 active
    // Stage 4: Model 2 active
    // Stage 5: Households personalized
    // Stage 6: Alert dispatched

    const activeNodeIndex = Math.min(this.nodes.length - 1, stageIndex);
    this.highlightNodesUpTo(activeNodeIndex);
  }

  highlightNodesUpTo(targetIndex) {
    this.nodes.forEach((item, idx) => {
      const nodeEl = document.getElementById(item.id);
      const arrowEl = item.arrow ? document.getElementById(item.arrow) : null;

      if (!nodeEl) return;

      if (idx <= targetIndex) {
        nodeEl.classList.add('active-packet');
      } else {
        nodeEl.classList.remove('active-packet');
      }

      if (arrowEl) {
        if (idx < targetIndex) {
          arrowEl.classList.add('flow-active');
        } else {
          arrowEl.classList.remove('flow-active');
        }
      }
    });
  }

  reset() {
    this.highlightNodesUpTo(0);
  }
}
