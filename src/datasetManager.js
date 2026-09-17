// SENSORA 2.0 - DATASET MODULE
// Handles Prototype Dataset loading, statistics, rendering first 20 rows, and Real Dataset CSV upload & validation

export class DatasetManager {
  constructor() {
    // State
    this.datasetName = "Synthetic Prototype Dataset";
    this.isPrototype = true;
    this.rawCsvText = "";
    this.headers = [];
    this.rows = [];
    this.totalRows = 0;
    this.totalCols = 0;
    this.missingValuesCount = 0;
    this.floodTypeCounts = {};
    this.riskLevelCounts = {};

    // Cache prototype data once loaded
    this.prototypeCache = null;

    // DOM References
    this.nameEl = document.getElementById("ds-meta-name");
    this.badgeEl = document.getElementById("ds-meta-type-badge");
    this.rowsEl = document.getElementById("ds-stat-rows");
    this.colsEl = document.getElementById("ds-stat-cols");
    this.missingEl = document.getElementById("ds-stat-missing");
    this.floodTypesListEl = document.getElementById("ds-flood-types-list");
    this.riskCatsListEl = document.getElementById("ds-risk-cats-list");
    this.columnsChipsEl = document.getElementById("ds-column-chips");
    this.tableHeadEl = document.getElementById("ds-table-head");
    this.tableBodyEl = document.getElementById("ds-table-body");
    this.tableRowCountEl = document.getElementById("ds-table-row-count");
    this.validationFeedbackEl = document.getElementById("ds-validation-feedback");
    
    // Upload & action elements
    this.fileInputEl = document.getElementById("ds-file-input");
    this.btnUploadEl = document.getElementById("btn-upload-dataset");
    this.btnResetEl = document.getElementById("btn-reset-prototype");
    this.dropzoneEl = document.getElementById("ds-upload-dropzone");

    // Modal elements for expanded table inspection
    this.btnExpandEl = document.getElementById("btn-expand-ds-table");
    this.modalEl = document.getElementById("ds-table-modal");
    this.modalCloseBtn = document.getElementById("btn-close-ds-modal");
    this.modalHeadEl = document.getElementById("ds-modal-table-head");
    this.modalBodyEl = document.getElementById("ds-modal-table-body");
    this.modalTitleEl = document.getElementById("ds-modal-title");

    this.initEvents();
    this.loadPrototypeDataset();
  }

  initEvents() {
    // File upload trigger
    if (this.btnUploadEl && this.fileInputEl) {
      this.btnUploadEl.addEventListener("click", () => {
        this.fileInputEl.click();
      });
    }

    // File input change
    if (this.fileInputEl) {
      this.fileInputEl.addEventListener("change", (e) => {
        const file = e.target.files?.[0];
        if (file) {
          this.handleFileUpload(file);
        }
      });
    }

    // Dropzone drag & drop
    if (this.dropzoneEl) {
      ['dragenter', 'dragover'].forEach(eventName => {
        this.dropzoneEl.addEventListener(eventName, (e) => {
          e.preventDefault();
          e.stopPropagation();
          this.dropzoneEl.classList.add('drag-active');
        });
      });

      ['dragleave', 'drop'].forEach(eventName => {
        this.dropzoneEl.addEventListener(eventName, (e) => {
          e.preventDefault();
          e.stopPropagation();
          this.dropzoneEl.classList.remove('drag-active');
        });
      });

      this.dropzoneEl.addEventListener('drop', (e) => {
        const dt = e.dataTransfer;
        const file = dt?.files?.[0];
        if (file) {
          this.handleFileUpload(file);
        }
      });

      this.dropzoneEl.addEventListener('click', () => {
        if (this.fileInputEl) this.fileInputEl.click();
      });
    }

    // Reset to prototype
    if (this.btnResetEl) {
      this.btnResetEl.addEventListener("click", () => {
        this.restorePrototype();
      });
    }

    // Modal expand/close
    if (this.btnExpandEl && this.modalEl) {
      this.btnExpandEl.addEventListener("click", () => {
        this.openTableModal();
      });
    }

    if (this.modalCloseBtn && this.modalEl) {
      this.modalCloseBtn.addEventListener("click", () => {
        this.modalEl.hidden = true;
      });
    }

    // Close modal on Escape
    window.addEventListener("keydown", (e) => {
      if (e.key === "Escape" && this.modalEl && !this.modalEl.hidden) {
        this.modalEl.hidden = true;
      }
    });
  }

  // Load the default 5,000 row synthetic prototype CSV
  async loadPrototypeDataset() {
    try {
      this.showValidationMessage("Loading Synthetic Prototype Dataset (5,000 rows)...", "info");
      
      // Try fetching from public/data or data URL
      let response = await fetch("/data/flood_dataset.csv");
      if (!response.ok) {
        response = await fetch("data/flood_dataset.csv");
      }
      
      if (!response.ok) {
        throw new Error(`HTTP error ${response.status} loading prototype CSV`);
      }

      const csvText = await response.text();
      this.parseAndApplyDataset("Synthetic Prototype Dataset", csvText, true);
      
      // Cache for quick reset
      this.prototypeCache = csvText;
      this.showValidationMessage("✓ Synthetic Prototype Dataset loaded (5,000 rows, 14 correlated features).", "success");
    } catch (err) {
      console.error("Error loading prototype dataset:", err);
      this.showValidationMessage(`Warning: Could not fetch /data/flood_dataset.csv directly (${err.message}). Generating fallback data...`, "warning");
      this.generateInlineFallbackPrototype();
    }
  }

  // Robust CSV parser
  parseCSV(text) {
    const lines = text.split(/\r?\n/).filter(line => line.trim().length > 0);
    if (lines.length === 0) {
      return { headers: [], rows: [] };
    }

    // Simple robust regex tokenizer for CSV values
    const parseLine = (line) => {
      const result = [];
      let cur = '';
      let inQuotes = false;
      for (let i = 0; i < line.length; i++) {
        const char = line[i];
        if (char === '"') {
          if (inQuotes && line[i + 1] === '"') {
            cur += '"';
            i++;
          } else {
            inQuotes = !inQuotes;
          }
        } else if (char === ',' && !inQuotes) {
          result.push(cur.trim());
          cur = '';
        } else {
          cur += char;
        }
      }
      result.push(cur.trim());
      return result;
    };

    const headers = parseLine(lines[0]);
    const rows = [];

    for (let i = 1; i < lines.length; i++) {
      const parsedRow = parseLine(lines[i]);
      // Only add if row has content
      if (parsedRow.length > 0 && parsedRow.some(cell => cell !== '')) {
        rows.push(parsedRow);
      }
    }

    return { headers, rows };
  }

  // Handle uploaded user CSV file
  handleFileUpload(file) {
    if (!file) return;

    // Validate file type
    const fileName = file.name || "uploaded_dataset.csv";
    if (!fileName.toLowerCase().endsWith(".csv") && file.type !== "text/csv") {
      this.showValidationMessage(`Invalid file format: "${fileName}". Please upload a valid CSV file (.csv).`, "error");
      return;
    }

    // Validate file size (< 25 MB)
    if (file.size > 25 * 1024 * 1024) {
      this.showValidationMessage(`File too large (${(file.size / (1024 * 1024)).toFixed(1)} MB). Limit is 25 MB.`, "error");
      return;
    }

    this.showValidationMessage(`Validating and parsing "${fileName}"...`, "info");

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const content = e.target.result;
        if (!content || typeof content !== 'string') {
          throw new Error("File appears to be empty or corrupted.");
        }

        const { headers, rows } = this.parseCSV(content);

        // Validation checks
        if (headers.length === 0) {
          throw new Error("CSV file does not contain a valid header row.");
        }
        if (rows.length === 0) {
          throw new Error("CSV file contains headers but 0 data rows.");
        }

        // Apply dataset
        this.parseAndApplyDataset(fileName, content, false);

        // Show success notification
        this.showValidationMessage(
          `✓ Valid CSV dataset uploaded: "${fileName}" with ${rows.length.toLocaleString()} rows and ${headers.length} columns. First 20 rows rendered.`,
          "success"
        );

        if (this.btnResetEl) {
          this.btnResetEl.hidden = false;
        }
      } catch (err) {
        console.error("CSV parse error:", err);
        this.showValidationMessage(`Upload Validation Failed: ${err.message}`, "error");
      }
    };

    reader.onerror = () => {
      this.showValidationMessage(`Error reading file "${fileName}".`, "error");
    };

    reader.readAsText(file);
  }

  // Restore the prototype dataset
  restorePrototype() {
    if (this.prototypeCache) {
      this.parseAndApplyDataset("Synthetic Prototype Dataset", this.prototypeCache, true);
      this.showValidationMessage("✓ Restored Synthetic Prototype Dataset (5,000 rows).", "success");
      if (this.btnResetEl) this.btnResetEl.hidden = true;
      if (this.fileInputEl) this.fileInputEl.value = "";
    } else {
      this.loadPrototypeDataset();
    }
  }

  // Main processing pipeline for any dataset (prototype or uploaded)
  parseAndApplyDataset(name, csvText, isPrototype = false) {
    this.datasetName = name;
    this.isPrototype = isPrototype;
    this.rawCsvText = csvText;

    const { headers, rows } = this.parseCSV(csvText);
    this.headers = headers;
    this.rows = rows;
    this.totalRows = rows.length;
    this.totalCols = headers.length;

    // Calculate missing values
    let missingCount = 0;
    const floodTypeIdx = headers.findIndex(h => h.toLowerCase() === 'flood_type');
    const riskLevelIdx = headers.findIndex(h => h.toLowerCase() === 'risk_level');

    this.floodTypeCounts = {};
    this.riskLevelCounts = {
      'LOW': 0,
      'MEDIUM': 0,
      'HIGH': 0,
      'CRITICAL': 0
    };

    for (let r = 0; r < rows.length; r++) {
      const row = rows[r];
      // Check each expected column cell
      for (let c = 0; c < headers.length; c++) {
        const val = row[c];
        if (val === undefined || val === null || val === "" || val.toLowerCase() === "nan" || val.toLowerCase() === "null") {
          missingCount++;
        }
      }

      // Tally flood type
      if (floodTypeIdx !== -1 && row[floodTypeIdx]) {
        const ft = row[floodTypeIdx].trim();
        this.floodTypeCounts[ft] = (this.floodTypeCounts[ft] || 0) + 1;
      }

      // Tally risk level
      if (riskLevelIdx !== -1 && row[riskLevelIdx]) {
        const rl = row[riskLevelIdx].trim().toUpperCase();
        this.riskLevelCounts[rl] = (this.riskLevelCounts[rl] || 0) + 1;
      }
    }

    this.missingValuesCount = missingCount;

    // Update UI components
    this.renderMetaAndStats();
    this.renderCategories();
    this.renderColumnChips();
    this.renderTablePreview();
  }

  // Render Dataset Name, Total Rows, Total Cols, Missing Values
  renderMetaAndStats() {
    if (this.nameEl) {
      this.nameEl.textContent = this.datasetName;
    }

    if (this.badgeEl) {
      if (this.isPrototype) {
        this.badgeEl.textContent = "SYNTHETIC PROTOTYPE";
        this.badgeEl.className = "ds-badge ds-badge-prototype";
      } else {
        this.badgeEl.textContent = "REAL UPLOADED";
        this.badgeEl.className = "ds-badge ds-badge-uploaded";
      }
    }

    if (this.rowsEl) {
      this.rowsEl.textContent = this.totalRows.toLocaleString();
    }

    if (this.colsEl) {
      this.colsEl.textContent = this.totalCols.toLocaleString();
    }

    if (this.missingEl) {
      this.missingEl.textContent = this.missingValuesCount.toLocaleString();
      if (this.missingValuesCount === 0) {
        this.missingEl.className = "stat-num text-success";
      } else {
        this.missingEl.className = "stat-num text-warning";
      }
    }

    if (this.tableRowCountEl) {
      const previewRows = Math.min(20, this.totalRows);
      this.tableRowCountEl.textContent = `Showing 1–${previewRows} of ${this.totalRows.toLocaleString()} rows`;
    }
  }

  // Render Flood Types and Risk Categories
  renderCategories() {
    // 1. Flood Types
    if (this.floodTypesListEl) {
      this.floodTypesListEl.innerHTML = "";
      const ftKeys = Object.keys(this.floodTypeCounts);

      if (ftKeys.length === 0) {
        this.floodTypesListEl.innerHTML = `<span class="ds-empty-tag">No "flood_type" column found</span>`;
      } else {
        ftKeys.forEach(ft => {
          const count = this.floodTypeCounts[ft];
          const pct = this.totalRows > 0 ? ((count / this.totalRows) * 100).toFixed(1) : 0;
          const tag = document.createElement("div");
          tag.className = "category-chip category-flood";
          tag.innerHTML = `
            <span class="chip-name">${ft}</span>
            <span class="chip-count">${count.toLocaleString()}</span>
            <span class="chip-pct">${pct}%</span>
          `;
          this.floodTypesListEl.appendChild(tag);
        });
      }
    }

    // 2. Risk Categories
    if (this.riskCatsListEl) {
      this.riskCatsListEl.innerHTML = "";
      const rkKeys = Object.keys(this.riskLevelCounts).filter(k => this.riskLevelCounts[k] > 0);

      if (rkKeys.length === 0) {
        this.riskCatsListEl.innerHTML = `<span class="ds-empty-tag">No "risk_level" column found</span>`;
      } else {
        // Standard ordered: LOW, MEDIUM, HIGH, CRITICAL, then others
        const order = ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'];
        const sortedKeys = [...new Set([...order.filter(k => this.riskLevelCounts[k] > 0), ...rkKeys])];

        sortedKeys.forEach(rk => {
          const count = this.riskLevelCounts[rk] || 0;
          const pct = this.totalRows > 0 ? ((count / this.totalRows) * 100).toFixed(1) : 0;
          const tierClass = rk.toLowerCase();
          const tag = document.createElement("div");
          tag.className = `category-chip category-risk tier-${tierClass}`;
          tag.innerHTML = `
            <span class="chip-indicator"></span>
            <span class="chip-name">${rk}</span>
            <span class="chip-count">${count.toLocaleString()}</span>
            <span class="chip-pct">${pct}%</span>
          `;
          this.riskCatsListEl.appendChild(tag);
        });
      }
    }
  }

  // Render Detected Column Names as tags
  renderColumnChips() {
    if (!this.columnsChipsEl) return;
    this.columnsChipsEl.innerHTML = "";

    this.headers.forEach((colName, idx) => {
      const chip = document.createElement("span");
      chip.className = "col-chip";
      chip.innerHTML = `<span class="col-num">${idx + 1}</span> ${colName}`;
      this.columnsChipsEl.appendChild(chip);
    });
  }

  // Render the first 20 rows in the preview table
  renderTablePreview() {
    const previewRows = this.rows.slice(0, 20);

    // Render in inline dock table
    this.populateTableDOM(this.tableHeadEl, this.tableBodyEl, previewRows);

    // Also populate modal table if open
    if (this.modalEl && !this.modalEl.hidden) {
      this.populateTableDOM(this.modalHeadEl, this.modalBodyEl, previewRows);
    }
  }

  populateTableDOM(headEl, bodyEl, rowsData) {
    if (!headEl || !bodyEl) return;

    // 1. Table Headers
    headEl.innerHTML = "";
    const trHead = document.createElement("tr");

    // Index header
    const thIdx = document.createElement("th");
    thIdx.className = "col-idx-header";
    thIdx.textContent = "#";
    trHead.appendChild(thIdx);

    this.headers.forEach(headerText => {
      const th = document.createElement("th");
      th.textContent = headerText;
      th.title = headerText;
      trHead.appendChild(th);
    });
    headEl.appendChild(trHead);

    // 2. Table Rows (first 20 rows)
    bodyEl.innerHTML = "";

    const riskIdx = this.headers.findIndex(h => h.toLowerCase() === 'risk_level');
    const floodTypeIdx = this.headers.findIndex(h => h.toLowerCase() === 'flood_type');

    rowsData.forEach((row, rowIdx) => {
      const tr = document.createElement("tr");
      tr.className = rowIdx % 2 === 0 ? "ds-row-even" : "ds-row-odd";

      // Row number
      const tdIdx = document.createElement("td");
      tdIdx.className = "col-idx-cell";
      tdIdx.textContent = (rowIdx + 1).toString();
      tr.appendChild(tdIdx);

      row.forEach((cellVal, colIdx) => {
        const td = document.createElement("td");
        const valStr = cellVal !== undefined && cellVal !== null ? cellVal : "";

        // Format risk level cell with stylized badge
        if (colIdx === riskIdx) {
          const tier = valStr.toUpperCase();
          const badge = document.createElement("span");
          badge.className = `table-risk-badge badge-${tier.toLowerCase()}`;
          badge.textContent = tier || "-";
          td.appendChild(badge);
        } else if (colIdx === floodTypeIdx) {
          // Format flood type
          const badge = document.createElement("span");
          badge.className = "table-ft-badge";
          badge.textContent = valStr || "-";
          td.appendChild(badge);
        } else {
          td.textContent = valStr;
        }

        tr.appendChild(td);
      });

      bodyEl.appendChild(tr);
    });
  }

  // Show status / validation messages
  showValidationMessage(msg, type = "info") {
    if (!this.validationFeedbackEl) return;
    this.validationFeedbackEl.textContent = msg;
    this.validationFeedbackEl.className = `ds-validation-box validation-${type}`;
  }

  // Expand table modal
  openTableModal() {
    if (!this.modalEl) return;
    this.modalEl.hidden = false;
    if (this.modalTitleEl) {
      this.modalTitleEl.textContent = `${this.datasetName} — First 20 Rows Preview`;
    }
    const previewRows = this.rows.slice(0, 20);
    this.populateTableDOM(this.modalHeadEl, this.modalBodyEl, previewRows);
  }

  // Fallback in memory if HTTP fetch is blocked in environment
  generateInlineFallbackPrototype() {
    const headers = [
      "timestamp", "rainfall_mm", "rainfall_intensity_mm_hr", "rainfall_duration_hr",
      "water_level_m", "water_level_rise_rate_m_hr", "water_level_acceleration_m_hr2",
      "soil_moisture_percent", "saturation_index", "elevation_m", "distance_from_river_m",
      "vulnerability_level", "flood_type", "risk_level"
    ];
    const types = ["Slow Saturation", "Cloudburst", "Rapid-Rise", "Sudden Upstream"];
    const rows = [];
    for (let i = 0; i < 5000; i++) {
      const ft = types[i % 4];
      const risk = i % 5 === 0 ? "CRITICAL" : i % 3 === 0 ? "HIGH" : i % 2 === 0 ? "MEDIUM" : "LOW";
      rows.push([
        `2026-07-01 ${String(Math.floor(i / 60) % 24).padStart(2, '0')}:${String(i % 60).padStart(2, '0')}:00`,
        (50 + (i % 200) * 1.2).toFixed(1),
        (10 + (i % 90) * 0.9).toFixed(1),
        (2 + (i % 24) * 0.5).toFixed(1),
        (1.5 + (i % 50) * 0.08).toFixed(2),
        (0.05 + (i % 20) * 0.04).toFixed(2),
        (-0.1 + (i % 15) * 0.02).toFixed(2),
        (40 + (i % 55) * 0.9).toFixed(1),
        (0.35 + (i % 60) * 0.01).toFixed(3),
        (15 + (i % 120) * 1.1).toFixed(1),
        (30 + (i % 500) * 1.5).toFixed(1),
        i % 4 === 0 ? "CRITICAL" : i % 3 === 0 ? "HIGH" : "MEDIUM",
        ft,
        risk
      ]);
    }
    const csvContent = [headers.join(","), ...rows.map(r => r.join(","))].join("\n");
    this.parseAndApplyDataset("Synthetic Prototype Dataset", csvContent, true);
  }
}
