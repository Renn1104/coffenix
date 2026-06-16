// ==========================================
// SPPK Coffee Supplier Selection - Admin Logic
// ==========================================

// Global Chart Instances
let chartSupplierScores = null;
let chartCriteriaWeights = null;
let chartTopsisScores = null;

// Pagination state
let supplierCurrentPage = 1;
const supplierPageSize = 5;

// Initial Default State
const DEFAULT_CRITERIA = [
    { id: "c1", code: "C1", name: "Aroma", type: "benefit", weight: 0.167 },
    { id: "c2", code: "C2", name: "Flavor", type: "benefit", weight: 0.167 },
    { id: "c3", code: "C3", name: "Aftertaste", type: "benefit", weight: 0.167 },
    { id: "c4", code: "C4", name: "Acidity", type: "benefit", weight: 0.167 },
    { id: "c5", code: "C5", name: "Body", type: "benefit", weight: 0.167 },
    { id: "c6", code: "C6", name: "Balance", type: "benefit", weight: 0.167 }
];

const DEFAULT_AHP_MATRIX = [
    [1.0, 0.5, 1.0, 2.0, 2.0, 1.0],
    [2.0, 1.0, 2.0, 3.0, 3.0, 2.0],
    [1.0, 0.5, 1.0, 2.0, 2.0, 1.0],
    [0.5, 0.33, 0.5, 1.0, 1.0, 0.5],
    [0.5, 0.33, 0.5, 1.0, 1.0, 0.5],
    [1.0, 0.5, 1.0, 2.0, 2.0, 1.0]
];

const DEFAULT_SUPPLIERS = [
    { id: "s1", name: "Gayo Organic Cooperative", alt: "ALT-01", values: { c1: 85, c2: 88, c3: 84, c4: 80, c5: 85, c6: 86 } },
    { id: "s2", name: "Malabar Estate Luwak", alt: "ALT-02", values: { c1: 90, c2: 92, c3: 88, c4: 78, c5: 86, c6: 88 } },
    { id: "s3", name: "Mandheling Jaya Utama", alt: "ALT-03", values: { c1: 82, c2: 85, c3: 82, c4: 84, c5: 88, c6: 84 } },
    { id: "s4", name: "Toraja Sapan Producer", alt: "ALT-04", values: { c1: 86, c2: 84, c3: 80, c4: 88, c5: 82, c6: 80 } },
    { id: "s5", name: "Flores Bajawa Group", alt: "ALT-05", values: { c1: 80, c2: 82, c3: 83, c4: 82, c5: 83, c6: 82 } }
];

// Load core state from Local Storage or set defaults
let criteria = JSON.parse(localStorage.getItem("sppk_criteria")) || DEFAULT_CRITERIA;
let suppliers = JSON.parse(localStorage.getItem("sppk_suppliers")) || DEFAULT_SUPPLIERS;
let ahpMatrix = JSON.parse(localStorage.getItem("sppk_ahp_matrix")) || DEFAULT_AHP_MATRIX;
let historyLogs = JSON.parse(localStorage.getItem("sppk_history")) || [];
let activities = JSON.parse(localStorage.getItem("sppk_activities")) || [
    { text: "Sistem diinisialisasi dengan kriteria kopi default.", time: "Baru saja" }
];
let latestTopsisResults = JSON.parse(localStorage.getItem("sppk_latest_topsis")) || null;
let latestAhpResults = JSON.parse(localStorage.getItem("sppk_latest_ahp")) || null;

// Initialize Admin Interface
document.addEventListener("DOMContentLoaded", () => {
    // Re-initialize Lucide icons
    lucide.createIcons();
    
    // Register Navigation Events
    setupNavigation();
    
    // Initial UI Render
    renderAllViews();
    
    // Register UI interaction events
    registerEvents();
    
    // Perform initial AHP calculation to show consistent weights
    if (!latestAhpResults) {
        calculateAHP();
    } else {
        updateAHPUI(latestAhpResults);
    }
});

// Save current state to local storage
function saveState() {
    localStorage.setItem("sppk_criteria", JSON.stringify(criteria));
    localStorage.setItem("sppk_suppliers", JSON.stringify(suppliers));
    localStorage.setItem("sppk_ahp_matrix", JSON.stringify(ahpMatrix));
    localStorage.setItem("sppk_history", JSON.stringify(historyLogs));
    localStorage.setItem("sppk_activities", JSON.stringify(activities));
}

// Log new activity
function logActivity(text) {
    const time = new Date().toLocaleTimeString("id-ID", { hour: '2-digit', minute: '2-digit' });
    activities.unshift({ text, time });
    if (activities.length > 8) activities.pop();
    saveState();
    renderActivities();
}

// Sidebar toggle/close functions for mobile responsiveness
function toggleSidebar() {
    const sidebar = document.querySelector(".sidebar");
    const overlay = document.getElementById("sidebar-overlay");
    if (sidebar) sidebar.classList.toggle("active");
    if (overlay) overlay.classList.toggle("active");
}

function closeSidebar() {
    const sidebar = document.querySelector(".sidebar");
    const overlay = document.getElementById("sidebar-overlay");
    if (sidebar) sidebar.classList.remove("active");
    if (overlay) overlay.classList.remove("active");
}

// Sidebar panel switching
function setupNavigation() {
    const menuItems = document.querySelectorAll(".sidebar-menu .menu-item");
    const panels = document.querySelectorAll(".content-panel");
    const pageTitle = document.getElementById("page-title");
    
    menuItems.forEach(item => {
        item.addEventListener("click", () => {
            menuItems.forEach(i => i.classList.remove("active"));
            panels.forEach(p => p.classList.remove("active"));
            
            item.classList.add("active");
            const target = item.getAttribute("data-target");
            const activePanel = document.getElementById(target);
            if (activePanel) {
                activePanel.classList.add("active");
            }
            
            // Set Header Title
            const menuText = item.querySelector("a").textContent.trim();
            pageTitle.textContent = menuText;
            
            // Context specific actions
            if (target === "panel-dashboard") {
                renderDashboardCharts();
            } else if (target === "panel-dataset") {
                renderDatasetTable();
            } else if (target === "panel-ranking") {
                renderRankingUI();
            }

            // Close sidebar on mobile
            if (window.innerWidth <= 768) {
                closeSidebar();
            }
        });
    });
}

// Render all views on load
function renderAllViews() {
    renderCriteriaList();
    renderSuppliersList();
    renderActivities();
    updateKPICards();
    renderDashboardCharts();
}

// Update top KPI cards
function updateKPICards() {
    document.getElementById("kpi-suppliers-count").textContent = suppliers.length;
    document.getElementById("kpi-criteria-count").textContent = criteria.length;
    
    // Best supplier KPI
    if (latestTopsisResults && latestTopsisResults.preference_values && suppliers.length > 0) {
        const bestIdx = latestTopsisResults.sorted_indices[0];
        if (bestIdx !== undefined && bestIdx < suppliers.length) {
            document.getElementById("kpi-best-supplier").textContent = suppliers[bestIdx].name;
        } else {
            document.getElementById("kpi-best-supplier").textContent = "-";
        }
    } else {
        document.getElementById("kpi-best-supplier").textContent = "-";
    }
    
    // CR KPI
    const crValSpan = document.getElementById("kpi-cr-value");
    const crColorWrapper = document.getElementById("kpi-cr-color");
    if (latestAhpResults) {
        const cr = latestAhpResults.cr;
        crValSpan.textContent = cr.toFixed(4);
        
        if (cr < 0.1) {
            crColorWrapper.className = "kpi-icon-wrapper success";
        } else {
            crColorWrapper.className = "kpi-icon-wrapper danger";
        }
    } else {
        crValSpan.textContent = "-";
        crColorWrapper.className = "kpi-icon-wrapper danger";
    }
}

// Render Recent Activities
function renderActivities() {
    const container = document.getElementById("activity-log-container");
    container.innerHTML = "";
    activities.forEach(act => {
        container.innerHTML += `
            <li class="activity-item">
                <div class="activity-marker"></div>
                <div class="activity-content">
                    <div class="activity-text">${act.text}</div>
                    <div class="activity-time">${act.time}</div>
                </div>
            </li>
        `;
    });
}

// Render Criteria list
function renderCriteriaList() {
    const tbody = document.getElementById("kriteria-list-body");
    tbody.innerHTML = "";
    
    criteria.forEach((crit, index) => {
        tbody.innerHTML += `
            <tr>
                <td><strong>${crit.code}</strong></td>
                <td>${crit.name}</td>
                <td><span class="badge ${crit.type === 'benefit' ? 'badge-success' : 'badge-danger'}">${crit.type.toUpperCase()}</span></td>
                <td>${(crit.weight || 0).toFixed(4)}</td>
                <td style="text-align: center;">
                    <div style="display:flex; gap:8px; justify-content:center;">
                        <button class="btn btn-secondary" onclick="editCriteria(${index})" style="padding:6px 10px; font-size:0.775rem;">
                            <i data-lucide="edit" style="width:14px; height:14px;"></i> Edit
                        </button>
                        <button class="btn btn-danger" onclick="deleteCriteria(${index})" style="padding:6px 10px; font-size:0.775rem;">
                            <i data-lucide="trash-2" style="width:14px; height:14px;"></i> Hapus
                        </button>
                    </div>
                </td>
            </tr>
        `;
    });
    lucide.createIcons();
}

// Render Supplier Management Panel with search, filter and pagination
function renderSuppliersList() {
    const tbody = document.getElementById("supplier-list-body");
    tbody.innerHTML = "";
    
    const searchQuery = document.getElementById("search-supplier").value.toLowerCase();
    const filterRange = document.getElementById("filter-score-range").value;
    
    // Filter
    let filtered = suppliers.filter(sup => {
        const matchSearch = sup.name.toLowerCase().includes(searchQuery) || sup.alt.toLowerCase().includes(searchQuery);
        
        let hasValues = true;
        criteria.forEach(crit => {
            if (sup.values[crit.id] === undefined || sup.values[crit.id] === "") {
                hasValues = false;
            }
        });
        
        const matchFilter = (filterRange === "all") || 
                            (filterRange === "has-data" && hasValues) || 
                            (filterRange === "no-data" && !hasValues);
                            
        return matchSearch && matchFilter;
    });
    
    // Pagination
    const totalItems = filtered.length;
    const totalPages = Math.ceil(totalItems / supplierPageSize) || 1;
    
    if (supplierCurrentPage > totalPages) supplierCurrentPage = totalPages;
    
    const startIndex = (supplierCurrentPage - 1) * supplierPageSize;
    const endIndex = Math.min(startIndex + supplierPageSize, totalItems);
    
    const pageItems = filtered.slice(startIndex, endIndex);
    
    // Render Rows
    if (pageItems.length === 0) {
        tbody.innerHTML = `<tr><td colspan="${criteria.length + 3}" style="text-align:center; color:var(--muted); padding:24px;">Tidak ada supplier ditemukan.</td></tr>`;
    } else {
        pageItems.forEach(sup => {
            let cellsHtml = "";
            criteria.forEach(crit => {
                const val = sup.values[crit.id];
                cellsHtml += `<td>${val !== undefined && val !== "" ? val : '<span style="color:var(--danger);">Belum diinput</span>'}</td>`;
            });
            
            tbody.innerHTML += `
                <tr>
                    <td><strong>${sup.alt}</strong></td>
                    <td>${sup.name}</td>
                    ${cellsHtml}
                    <td style="text-align: center;">
                        <div style="display:flex; gap:8px; justify-content:center;">
                            <button class="btn btn-secondary" onclick="editSupplier('${sup.id}')" style="padding:6px 10px; font-size:0.775rem;">
                                <i data-lucide="edit" style="width:14px; height:14px;"></i> Edit
                            </button>
                            <button class="btn btn-danger" onclick="deleteSupplier('${sup.id}')" style="padding:6px 10px; font-size:0.775rem;">
                                <i data-lucide="trash-2" style="width:14px; height:14px;"></i> Hapus
                            </button>
                        </div>
                    </td>
                </tr>
            `;
        });
    }
    
    // Update pagination details
    document.getElementById("pagination-info").textContent = `Menampilkan ${totalItems === 0 ? 0 : startIndex + 1}-${endIndex} dari ${totalItems} Supplier`;
    
    const btnPrev = document.getElementById("btn-pagination-prev");
    const btnNext = document.getElementById("btn-pagination-next");
    
    btnPrev.disabled = supplierCurrentPage === 1;
    btnNext.disabled = supplierCurrentPage === totalPages || totalItems === 0;
    
    lucide.createIcons();
}

// Render Dataset View
function renderDatasetTable() {
    const headerRow = document.getElementById("dataset-header-row");
    const tbody = document.getElementById("dataset-body-rows");
    
    headerRow.innerHTML = "<th>Supplier</th><th>Alternatif</th>";
    criteria.forEach(crit => {
        headerRow.innerHTML += `<th>${crit.name} (${crit.code})</th>`;
    });
    
    tbody.innerHTML = "";
    if (suppliers.length === 0) {
        tbody.innerHTML = `<tr><td colspan="${criteria.length + 2}" style="text-align:center; padding:24px; color:var(--muted);">Belum ada data supplier.</td></tr>`;
    } else {
        suppliers.forEach(sup => {
            let cells = "";
            criteria.forEach(crit => {
                const val = sup.values[crit.id];
                cells += `<td>${val !== undefined && val !== "" ? val : '-'}</td>`;
            });
            tbody.innerHTML += `
                <tr>
                    <td><strong>${sup.name}</strong></td>
                    <td>${sup.alt}</td>
                    ${cells}
                </tr>
            `;
        });
    }
}

// Render AHP input forms (Matrix vs Sliders)
function renderAHPInputs() {
    const slidersView = document.getElementById("ahp-sliders-view");
    slidersView.innerHTML = "";
    
    const size = criteria.length;
    let comparisonsCount = 0;
    
    // 1. Generate Sliders
    for (let i = 0; i < size; i++) {
        for (let j = i + 1; j < size; j++) {
            comparisonsCount++;
            const val = ahpMatrix[i][j];
            let sliderVal = 0;
            
            // Map comparison value (1-9 and reciprocals) to slider value (-8 to 8)
            if (val > 1) {
                sliderVal = val - 1; // e.g. 3 maps to 2
            } else if (val < 1) {
                sliderVal = -(Math.round(1 / val) - 1); // e.g. 0.33 maps to -2
            }
            
            slidersView.innerHTML += `
                <div class="ahp-compare-row" data-row="${i}" data-col="${j}">
                    <div class="compare-crit-label left">${criteria[i].name}</div>
                    <div class="compare-slider-container">
                        <input type="range" class="compare-slider" min="-8" max="8" value="${sliderVal}" 
                               oninput="handleSliderChange(this, ${i}, ${j})">
                        <span class="compare-value-display" id="display-slider-${i}-${j}">Sama Penting</span>
                    </div>
                    <div class="compare-crit-label right">${criteria[j].name}</div>
                </div>
            `;
            updateSliderDisplayLabel(sliderVal, i, j);
        }
    }
    
    // 2. Generate Matrix Input Grid
    const matrixGrid = document.getElementById("matrix-grid-container");
    matrixGrid.innerHTML = "";
    
    // CSS Grid Template Columns setup
    matrixGrid.style.gridTemplateColumns = `120px repeat(${size}, 1fr)`;
    
    // Row Header
    matrixGrid.innerHTML += `<div class="matrix-header-cell">Kriteria</div>`;
    criteria.forEach(crit => {
        matrixGrid.innerHTML += `<div class="matrix-header-cell">${crit.code}</div>`;
    });
    
    // Matrix rows
    for (let i = 0; i < size; i++) {
        // Label
        matrixGrid.innerHTML += `<div class="matrix-header-cell">${criteria[i].name} (${criteria[i].code})</div>`;
        for (let j = 0; j < size; j++) {
            const isDiagonal = (i === j);
            const isLowerTriangle = (i > j);
            const val = ahpMatrix[i][j];
            
            if (isDiagonal) {
                matrixGrid.innerHTML += `
                    <div class="matrix-cell" style="background-color: var(--muted-light); color: var(--muted); font-weight:700;">
                        1.00
                    </div>
                `;
            } else if (isLowerTriangle) {
                matrixGrid.innerHTML += `
                    <div class="matrix-cell" style="background-color: var(--muted-light); color: var(--muted);">
                        <input type="text" id="matrix-cell-${i}-${j}" value="${val.toFixed(2)}" disabled>
                    </div>
                `;
            } else {
                // Upper triangle editables
                matrixGrid.innerHTML += `
                    <div class="matrix-cell matrix-input-cell">
                        <input type="number" step="any" min="0.11" max="9" id="matrix-cell-${i}-${j}" 
                               value="${val.toFixed(2)}" onchange="handleMatrixCellChange(this, ${i}, ${j})">
                    </div>
                `;
            }
        }
    }
}

// Handle slider changes and sync matrix
function handleSliderChange(slider, row, col) {
    const val = parseInt(slider.value);
    updateSliderDisplayLabel(val, row, col);
    
    let matrixVal = 1.0;
    if (val > 0) {
        matrixVal = 1 / (val + 1); // col is more important, so cell [row][col] is 1 / scale
    } else if (val < 0) {
        matrixVal = Math.abs(val) + 1; // row is more important, so cell [row][col] is scale
    }
    
    ahpMatrix[row][col] = matrixVal;
    ahpMatrix[col][row] = 1 / matrixVal;
    
    // Sync Matrix cell input if rendered
    const cellInput = document.getElementById(`matrix-cell-${row}-${col}`);
    if (cellInput) cellInput.value = matrixVal.toFixed(2);
    
    const lowerInput = document.getElementById(`matrix-cell-${col}-${row}`);
    if (lowerInput) lowerInput.value = (1 / matrixVal).toFixed(2);
}

// Update slider visual badges
function updateSliderDisplayLabel(val, row, col) {
    const display = document.getElementById(`display-slider-${row}-${col}`);
    if (!display) return;
    
    if (val === 0) {
        display.textContent = "Sama Penting (1)";
        display.style.backgroundColor = "var(--primary-light)";
        display.style.color = "var(--primary)";
    } else if (val < 0) {
        const score = Math.abs(val) + 1;
        display.textContent = `Lebih Penting (${score})`;
        display.style.backgroundColor = "var(--success-light)";
        display.style.color = "var(--success)";
    } else {
        const score = val + 1;
        display.textContent = `Kurang Penting (1/${score})`;
        display.style.backgroundColor = "var(--warning-light)";
        display.style.color = "var(--warning)";
    }
}

// Handle Direct Matrix Cell Input Change
function handleMatrixCellChange(input, row, col) {
    let val = parseFloat(input.value);
    if (isNaN(val) || val <= 0) {
        val = 1.0;
        input.value = "1.00";
    }
    
    ahpMatrix[row][col] = val;
    ahpMatrix[col][row] = 1 / val;
    
    // Update lower triangle cell display
    const lowerInput = document.getElementById(`matrix-cell-${col}-${row}`);
    if (lowerInput) lowerInput.value = (1 / val).toFixed(2);
    
    // Sync slider value
    let sliderVal = 0;
    if (val > 1) {
        sliderVal = -Math.round(val - 1); // row is more important, slider slides left (-)
    } else if (val < 1) {
        sliderVal = Math.round(1 / val) - 1; // col is more important, slider slides right (+)
    }
    
    const sliders = document.querySelectorAll(".compare-slider");
    sliders.forEach(slider => {
        const prow = parseInt(slider.closest(".ahp-compare-row").getAttribute("data-row"));
        const pcol = parseInt(slider.closest(".ahp-compare-row").getAttribute("data-col"));
        if (prow === row && pcol === col) {
            slider.value = sliderVal;
            updateSliderDisplayLabel(sliderVal, row, col);
        }
    });
}

// Setup Event Listeners
function registerEvents() {
    // Search Supplier
    document.getElementById("search-supplier").addEventListener("input", () => {
        supplierCurrentPage = 1;
        renderSuppliersList();
    });
    
    // Filter Supplier
    document.getElementById("filter-score-range").addEventListener("change", () => {
        supplierCurrentPage = 1;
        renderSuppliersList();
    });
    
    // Pagination buttons
    document.getElementById("btn-pagination-prev").addEventListener("click", () => {
        if (supplierCurrentPage > 1) {
            supplierCurrentPage--;
            renderSuppliersList();
        }
    });
    
    document.getElementById("btn-pagination-next").addEventListener("click", () => {
        supplierCurrentPage++;
        renderSuppliersList();
    });
    
    // Criteria Modal Button Save
    document.getElementById("btn-save-kriteria").addEventListener("click", saveCriteria);
    document.getElementById("btn-add-kriteria").addEventListener("click", () => {
        document.getElementById("criteria-index").value = "";
        document.getElementById("form-kriteria").reset();
        document.getElementById("modal-kriteria-title").textContent = "Tambah Kriteria";
        
        // Auto assign C code
        const nextCodeNum = criteria.length + 1;
        document.getElementById("criteria-code").value = `C${nextCodeNum}`;
        openModal("modal-kriteria");
    });
    
    // Supplier Modal Save
    document.getElementById("btn-save-supplier").addEventListener("click", saveSupplierData);
    document.getElementById("btn-add-supplier").addEventListener("click", () => {
        document.getElementById("supplier-id").value = "";
        document.getElementById("form-supplier").reset();
        document.getElementById("modal-supplier-title").textContent = "Tambah Supplier";
        
        // Auto assign alternative code
        const nextAltNum = suppliers.length + 1;
        document.getElementById("supplier-alt").value = `ALT-${nextAltNum < 10 ? '0' + nextAltNum : nextAltNum}`;
        
        renderSupplierModalCriteriaFields();
        openModal("modal-supplier");
    });
    
    // AHP view toggles
    document.getElementById("btn-ahp-view-sliders").addEventListener("click", () => {
        document.getElementById("ahp-sliders-view").style.display = "flex";
        document.getElementById("ahp-matrix-view").style.display = "none";
        document.getElementById("btn-ahp-view-sliders").className = "btn btn-primary";
        document.getElementById("btn-ahp-view-matrix").className = "btn btn-secondary";
    });
    
    document.getElementById("btn-ahp-view-matrix").addEventListener("click", () => {
        document.getElementById("ahp-sliders-view").style.display = "none";
        document.getElementById("ahp-matrix-view").style.display = "block";
        document.getElementById("btn-ahp-view-sliders").className = "btn btn-secondary";
        document.getElementById("btn-ahp-view-matrix").className = "btn btn-primary";
    });
    
    // AHP Action Buttons
    document.getElementById("btn-reset-ahp").addEventListener("click", () => {
        const size = criteria.length;
        ahpMatrix = Array(size).fill(0).map(() => Array(size).fill(1.0));
        saveState();
        renderAHPInputs();
        logActivity("Mengatur ulang comparison matrix AHP.");
    });
    
    document.getElementById("btn-calculate-ahp").addEventListener("click", calculateAHP);
    
    // TOPSIS trigger
    document.getElementById("btn-run-topsis").addEventListener("click", runTOPSIS);
    
    // CSV Download
    document.getElementById("btn-download-dataset").addEventListener("click", downloadDatasetCSV);

    // Mobile sidebar events
    const btnHamburger = document.getElementById("btn-hamburger");
    const sidebarOverlay = document.getElementById("sidebar-overlay");
    if (btnHamburger) btnHamburger.addEventListener("click", toggleSidebar);
    if (sidebarOverlay) sidebarOverlay.addEventListener("click", closeSidebar);
}

// Render Criteria dynamic inputs inside the Supplier popup
function renderSupplierModalCriteriaFields(supplierData = null) {
    const container = document.getElementById("supplier-criteria-inputs-container");
    container.innerHTML = "";
    
    criteria.forEach(crit => {
        const val = supplierData && supplierData.values ? supplierData.values[crit.id] : "";
        container.innerHTML += `
            <div class="form-group">
                <label class="form-label">${crit.name} (${crit.code}) [${crit.type}]</label>
                <input type="number" min="1" max="100" class="form-input supplier-crit-input" 
                       data-crit-id="${crit.id}" value="${val}" placeholder="Nilai 1 - 100" required>
            </div>
        `;
    });
}

// Open/Close Modals
function openModal(id) {
    document.getElementById(id).classList.add("active");
}

function closeModal(id) {
    document.getElementById(id).classList.remove("active");
}

// Show Custom Confirmation Modal
function showConfirm(message, callback) {
    document.getElementById("confirm-message").textContent = message;
    
    // Remove old event listeners from yes button
    const btnYes = document.getElementById("btn-confirm-yes");
    const newBtnYes = btnYes.cloneNode(true);
    btnYes.parentNode.replaceChild(newBtnYes, btnYes);
    
    newBtnYes.addEventListener("click", () => {
        callback();
        closeModal("modal-confirm");
    });
    
    openModal("modal-confirm");
}

// Save/Update Criteria
function saveCriteria() {
    const code = document.getElementById("criteria-code").value.trim().toUpperCase();
    const name = document.getElementById("criteria-name").value.trim();
    const type = document.getElementById("criteria-type").value;
    const indexVal = document.getElementById("criteria-index").value;
    
    if (!code || !name) {
        alert("Kode dan Nama kriteria wajib diisi.");
        return;
    }
    
    if (indexVal === "") {
        // Add new
        const id = "c_" + Date.now();
        criteria.push({ id, code, name, type, weight: 0.0 });
        
        // Resize comparison matrix
        const oldSize = ahpMatrix.length;
        const newSize = oldSize + 1;
        const newMatrix = Array(newSize).fill(0).map(() => Array(newSize).fill(1.0));
        
        for (let i = 0; i < oldSize; i++) {
            for (let j = 0; j < oldSize; j++) {
                newMatrix[i][j] = ahpMatrix[i][j];
            }
        }
        ahpMatrix = newMatrix;
        
        logActivity(`Menambahkan kriteria baru: ${name} (${code})`);
    } else {
        // Edit existing
        const idx = parseInt(indexVal);
        const oldName = criteria[idx].name;
        criteria[idx].code = code;
        criteria[idx].name = name;
        criteria[idx].type = type;
        
        logActivity(`Mengubah kriteria: ${oldName} menjadi ${name}`);
    }
    
    saveState();
    closeModal("modal-kriteria");
    renderCriteriaList();
    renderAHPInputs();
    updateKPICards();
}

// Trigger Edit Criteria
window.editCriteria = function(idx) {
    document.getElementById("criteria-index").value = idx;
    document.getElementById("criteria-code").value = criteria[idx].code;
    document.getElementById("criteria-name").value = criteria[idx].name;
    document.getElementById("criteria-type").value = criteria[idx].type;
    document.getElementById("modal-kriteria-title").textContent = "Edit Kriteria";
    openModal("modal-kriteria");
};

// Trigger Delete Criteria
window.deleteCriteria = function(idx) {
    if (criteria.length <= 1) {
        alert("Minimal harus terdapat 1 kriteria di dalam sistem.");
        return;
    }
    
    showConfirm(`Apakah Anda yakin ingin menghapus kriteria "${criteria[idx].name}"? Semua data nilai kriteria ini pada supplier akan hilang dan perbandingan AHP akan direset.`, () => {
        const deletedName = criteria[idx].name;
        const deletedId = criteria[idx].id;
        
        // Delete criterion
        criteria.splice(idx, 1);
        
        // Delete column/row in AHP Comparison Matrix
        ahpMatrix.splice(idx, 1);
        ahpMatrix.forEach(row => row.splice(idx, 1));
        
        // Remove values from suppliers
        suppliers.forEach(sup => {
            delete sup.values[deletedId];
        });
        
        logActivity(`Menghapus kriteria: ${deletedName}`);
        saveState();
        renderCriteriaList();
        renderSuppliersList();
        renderAHPInputs();
        updateKPICards();
    });
};

// Save Supplier details
function saveSupplierData() {
    const name = document.getElementById("supplier-name").value.trim();
    const alt = document.getElementById("supplier-alt").value.trim().toUpperCase();
    const idVal = document.getElementById("supplier-id").value;
    
    if (!name || !alt) {
        alert("Nama Supplier dan Alternatif wajib diisi.");
        return;
    }
    
    // Parse criteria values
    const values = {};
    let allFilled = true;
    const inputElements = document.querySelectorAll(".supplier-crit-input");
    
    inputElements.forEach(inp => {
        const critId = inp.getAttribute("data-crit-id");
        const val = parseFloat(inp.value);
        if (isNaN(val) || val < 1 || val > 100) {
            allFilled = false;
        }
        values[critId] = val;
    });
    
    if (!allFilled) {
        alert("Silakan isi semua nilai kriteria dengan rentang 1 - 100.");
        return;
    }
    
    if (idVal === "") {
        // Add new
        const id = "s_" + Date.now();
        suppliers.push({ id, name, alt, values });
        logActivity(`Menambahkan supplier baru: ${name}`);
    } else {
        // Edit existing
        const sup = suppliers.find(s => s.id === idVal);
        if (sup) {
            sup.name = name;
            sup.alt = alt;
            sup.values = values;
            logActivity(`Mengubah data supplier: ${name}`);
        }
    }
    
    // Clear stale TOPSIS results to prevent index mismatch crashes
    latestTopsisResults = null;
    localStorage.removeItem("sppk_latest_topsis");
    
    saveState();
    closeModal("modal-supplier");
    renderSuppliersList();
    updateKPICards();
    renderDashboardCharts();
    renderRankingUI();
}

// Trigger Edit Supplier
window.editSupplier = function(id) {
    const sup = suppliers.find(s => s.id === id);
    if (!sup) return;
    
    document.getElementById("supplier-id").value = sup.id;
    document.getElementById("supplier-name").value = sup.name;
    document.getElementById("supplier-alt").value = sup.alt;
    document.getElementById("modal-supplier-title").textContent = "Edit Supplier";
    
    renderSupplierModalCriteriaFields(sup);
    openModal("modal-supplier");
};

// Trigger Delete Supplier
window.deleteSupplier = function(id) {
    const sup = suppliers.find(s => s.id === id);
    if (!sup) return;
    
    showConfirm(`Apakah Anda yakin ingin menghapus supplier "${sup.name}"?`, () => {
        suppliers = suppliers.filter(s => s.id !== id);
        logActivity(`Menghapus supplier: ${sup.name}`);
        
        // Clear stale TOPSIS results to prevent index mismatch crashes
        latestTopsisResults = null;
        localStorage.removeItem("sppk_latest_topsis");
        
        saveState();
        renderSuppliersList();
        updateKPICards();
        renderDashboardCharts();
        renderRankingUI();
    });
};

// Calculate Criteria Weights using AHP API
async function calculateAHP() {
    try {
        const response = await fetch('/api/calculate-ahp', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ matrix: ahpMatrix })
        });
        
        if (!response.ok) {
            const err = await response.json();
            throw new Error(err.error || "Gagal menghitung AHP.");
        }
        
        const results = await response.json();
        latestAhpResults = results;
        localStorage.setItem("sppk_latest_ahp", JSON.stringify(results));
        
        // Update criteria weights in state
        criteria.forEach((crit, i) => {
            crit.weight = results.weights[i];
        });
        saveState();
        
        updateAHPUI(results);
        renderCriteriaList();
        updateKPICards();
        renderDashboardCharts();
        
        logActivity(`Melakukan perhitungan bobot kriteria AHP (CR: ${results.cr.toFixed(4)}).`);
        
    } catch (e) {
        alert("Error: " + e.message);
    }
}

// Update AHP visual results in UI
function updateAHPUI(results) {
    const badgeContainer = document.getElementById("ahp-badge-container");
    const warningBox = document.getElementById("ahp-warning-box");
    
    if (results.cr >= 0.1) {
        badgeContainer.innerHTML = `<span class="badge badge-danger">TIDAK KONSISTEN</span>`;
        warningBox.innerHTML = `
            <div class="alert alert-danger">
                <i data-lucide="alert-octagon" class="alert-icon"></i>
                <div>
                    <div class="alert-title">Consistency Ratio (CR) &ge; 0.1</div>
                    Nilai CR tidak konsisten. Silakan perbaiki matriks perbandingan kepentingan kriteria.
                </div>
            </div>
        `;
    } else {
        badgeContainer.innerHTML = `<span class="badge badge-success">KONSISTEN</span>`;
        warningBox.innerHTML = `
            <div class="alert alert-success">
                <i data-lucide="check-circle" class="alert-icon"></i>
                <div>
                    <div class="alert-title">Consistency Ratio (CR) &lt; 0.1</div>
                    Matriks perbandingan konsisten dan valid untuk digunakan sebagai bobot kriteria.
                </div>
            </div>
        `;
    }
    
    // Display lambda, CI, CR
    document.getElementById("ahp-val-lambda").textContent = results.lambda_max.toFixed(4);
    document.getElementById("ahp-val-ci").textContent = results.ci.toFixed(4);
    document.getElementById("ahp-val-cr").textContent = results.cr.toFixed(4) + ` (${results.cr >= 0.1 ? 'Inkonsisten' : 'Konsisten'})`;
    
    // Show details section
    document.getElementById("ahp-results-section").style.display = "grid";
    
    // Render AHP Normalization Table
    const normTable = document.getElementById("table-ahp-normalization");
    normTable.innerHTML = "";
    
    // Headers
    let headerHtml = "<thead><tr><th>Kriteria</th>";
    criteria.forEach(crit => {
        headerHtml += `<th>${crit.code}</th>`;
    });
    headerHtml += "</tr></thead>";
    normTable.innerHTML += headerHtml;
    
    // Rows
    let normBodyHtml = "<tbody>";
    results.normalized_matrix.forEach((row, i) => {
        let cells = `<td><strong>${criteria[i].name} (${criteria[i].code})</strong></td>`;
        row.forEach(val => {
            cells += `<td>${val.toFixed(4)}</td>`;
        });
        normBodyHtml += `<tr>${cells}</tr>`;
    });
    normBodyHtml += "</tbody>";
    normTable.innerHTML += normBodyHtml;
    
    // Priority vector and consistency measure table
    const vectorBody = document.getElementById("ahp-vector-body");
    vectorBody.innerHTML = "";
    criteria.forEach((crit, i) => {
        vectorBody.innerHTML += `
            <tr>
                <td><strong>${crit.name} (${crit.code})</strong></td>
                <td style="color:var(--primary); font-weight:700;">${results.weights[i].toFixed(4)}</td>
                <td>${results.weighted_sum[i].toFixed(4)}</td>
                <td>${results.consistency_vector[i].toFixed(4)}</td>
            </tr>
        `;
    });
    
    lucide.createIcons();
}

// Run TOPSIS ranking algorithm via API
async function runTOPSIS() {
    // 1. Validation
    if (!latestAhpResults || latestAhpResults.cr >= 0.1) {
        alert("Perhitungan tidak dapat dilakukan karena matriks kriteria AHP belum konsisten (CR >= 0.1). Silakan perbaiki di menu Kelola Kriteria.");
        return;
    }
    
    if (suppliers.length < 2) {
        alert("Harap masukkan minimal 2 supplier untuk melakukan perangkingan TOPSIS.");
        return;
    }
    
    // Filter suppliers who don't have all criteria filled
    const readySuppliers = [];
    let missingData = false;
    
    suppliers.forEach(sup => {
        let isReady = true;
        criteria.forEach(crit => {
            if (sup.values[crit.id] === undefined || sup.values[crit.id] === "") {
                isReady = false;
            }
        });
        if (isReady) {
            readySuppliers.push(sup);
        } else {
            missingData = true;
        }
    });
    
    if (readySuppliers.length < 2) {
        alert("Minimal harus ada 2 supplier yang sudah melengkapi input nilai kriteria untuk dihitung.");
        return;
    }
    
    if (missingData) {
        showConfirm("Terdapat beberapa supplier yang belum lengkap mengisi nilai kriteria. Lanjutkan perhitungan hanya untuk supplier yang datanya lengkap?", () => {
            executeTopsis(readySuppliers);
        });
    } else {
        executeTopsis(readySuppliers);
    }
}

// Execute TOPSIS Calculation API call
async function executeTopsis(readySuppliers) {
    // 2. Prepare payload
    const decision_matrix = readySuppliers.map(sup => {
        return criteria.map(crit => sup.values[crit.id]);
    });
    const weights = criteria.map(crit => crit.weight);
    const criteria_types = criteria.map(crit => crit.type);
    const alternatives = readySuppliers.map(sup => sup.name);
    
    try {
        const response = await fetch('/api/calculate-topsis', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ decision_matrix, weights, criteria_types, alternatives })
        });
        
        if (!response.ok) {
            const err = await response.json();
            throw new Error(err.error || "Gagal menghitung TOPSIS.");
        }
        
        const results = await response.json();
        latestTopsisResults = results;
        localStorage.setItem("sppk_latest_topsis", JSON.stringify(results));
        
        // Add to history log
        const bestIdx = results.sorted_indices[0];
        const bestSup = readySuppliers[bestIdx];
        const timestamp = new Date().toLocaleString("id-ID");
        
        historyLogs.unshift({
            timestamp,
            cr: latestAhpResults.cr,
            bestSupplier: bestSup.name,
            bestScore: results.preference_values[bestIdx]
        });
        if (historyLogs.length > 5) historyLogs.pop();
        
        saveState();
        
        // Display Results
        displayTopsisResults(results, readySuppliers);
        updateKPICards();
        renderDashboardCharts();
        
        logActivity(`Menghitung ranking TOPSIS dengan ${readySuppliers.length} supplier. Pemenang: ${bestSup.name}.`);
        
    } catch (e) {
        alert("Error: " + e.message);
    }
}

// Display TOPSIS calculation stages
function displayTopsisResults(results, readySuppliers) {
    document.getElementById("topsis-results-container").style.display = "block";
    
    // 1. Leaderboard Podium Top 3
    const podiumContainer = document.getElementById("leaderboard-podium");
    podiumContainer.innerHTML = "";
    
    const count = readySuppliers.length;
    const sorted = results.sorted_indices;
    
    // Setup first 3 indices
    const firstIdx = sorted[0];
    const secondIdx = count > 1 ? sorted[1] : null;
    const thirdIdx = count > 2 ? sorted[2] : null;
    
    // Left: Juara 2
    if (secondIdx !== null) {
        const score = results.preference_values[secondIdx];
        podiumContainer.innerHTML += `
            <div class="podium-place place-2">
                <div class="podium-avatar">🥈</div>
                <div class="podium-card">
                    <div class="podium-title" title="${readySuppliers[secondIdx].name}">${readySuppliers[secondIdx].name}</div>
                    <div class="podium-score">V: ${score.toFixed(4)}</div>
                    <div class="podium-block">2</div>
                </div>
            </div>
        `;
    } else {
        podiumContainer.innerHTML += `<div class="podium-place place-2"></div>`;
    }
    
    // Center: Juara 1
    if (firstIdx !== null) {
        const score = results.preference_values[firstIdx];
        podiumContainer.innerHTML += `
            <div class="podium-place place-1">
                <div class="podium-avatar">🥇</div>
                <div class="podium-card">
                    <div class="podium-title" title="${readySuppliers[firstIdx].name}">${readySuppliers[firstIdx].name}</div>
                    <div class="podium-score" style="color:var(--primary); font-weight:700;">V: ${score.toFixed(4)}</div>
                    <div class="badge badge-success" style="margin-bottom: 12px;"><i data-lucide="award" style="width:12px; height:12px; margin-right:4px;"></i> Terbaik</div>
                    <div class="podium-block">1</div>
                </div>
            </div>
        `;
    }
    
    // Right: Juara 3
    if (thirdIdx !== null) {
        const score = results.preference_values[thirdIdx];
        podiumContainer.innerHTML += `
            <div class="podium-place place-3">
                <div class="podium-avatar">🥉</div>
                <div class="podium-card">
                    <div class="podium-title" title="${readySuppliers[thirdIdx].name}">${readySuppliers[thirdIdx].name}</div>
                    <div class="podium-score">V: ${score.toFixed(4)}</div>
                    <div class="podium-block">3</div>
                </div>
            </div>
        `;
    } else {
        podiumContainer.innerHTML += `<div class="podium-place place-3"></div>`;
    }
    
    // 2. Rankings Table
    const tbody = document.getElementById("topsis-rank-body");
    tbody.innerHTML = "";
    
    sorted.forEach((origIdx, orderIdx) => {
        const rank = results.ranks[origIdx];
        const sup = readySuppliers[origIdx];
        const score = results.preference_values[origIdx];
        
        let rankBadge = `${rank}`;
        if (rank === 1) rankBadge = "🏆 1";
        else if (rank === 2) rankBadge = "🥈 2";
        else if (rank === 3) rankBadge = "🥉 3";
        
        tbody.innerHTML += `
            <tr>
                <td style="text-align: center; font-weight: 700;">${rankBadge}</td>
                <td><strong>${sup.name}</strong></td>
                <td>${sup.alt}</td>
                <td style="color:var(--primary); font-weight:700;">${score.toFixed(4)}</td>
                <td style="text-align: center;">
                    ${rank === 1 ? '<span class="badge badge-success">Rekomendasi Utama</span>' : '<span class="badge badge-primary">Dipertimbangkan</span>'}
                </td>
            </tr>
        `;
    });
    
    // 3. Step calculations breakdown
    // Step 1: Decision
    renderMathTable("math-step-decision", results.decision_matrix, readySuppliers);
    
    // Step 2: Normalization
    renderMathTable("math-step-normalization", results.normalized_matrix, readySuppliers);
    
    // Step 3: Weighted normalization
    renderMathTable("math-step-weighted", results.weighted_matrix, readySuppliers);
    
    // Step 4: Ideals
    const idealHeader = document.querySelector(".math-ideal-headers");
    idealHeader.setAttribute("colspan", criteria.length);
    
    const idealBody = document.getElementById("math-step-ideals");
    idealBody.innerHTML = "";
    
    let idealPosCells = "";
    let idealNegCells = "";
    results.ideal_positive.forEach(val => {
        idealPosCells += `<td style="font-weight:700; color:var(--success);">${val.toFixed(4)}</td>`;
    });
    results.ideal_negative.forEach(val => {
        idealNegCells += `<td style="font-weight:700; color:var(--danger);">${val.toFixed(4)}</td>`;
    });
    
    idealBody.innerHTML += `
        <tr>
            <td><strong>Solusi Ideal Positif (A+)</strong></td>
            ${idealPosCells}
        </tr>
        <tr>
            <td><strong>Solusi Ideal Negatif (A-)</strong></td>
            ${idealNegCells}
        </tr>
    `;
    
    // Step 5: Separations
    const separationBody = document.getElementById("math-step-separation");
    separationBody.innerHTML = "";
    readySuppliers.forEach((sup, i) => {
        separationBody.innerHTML += `
            <tr>
                <td><strong>${sup.name}</strong></td>
                <td>${sup.alt}</td>
                <td>${results.distance_positive[i].toFixed(4)}</td>
                <td>${results.distance_negative[i].toFixed(4)}</td>
            </tr>
        `;
    });
    
    // 4. Render TOPSIS Scores Bar Chart
    const labels = sorted.map(idx => readySuppliers[idx].name);
    const dataValues = sorted.map(idx => results.preference_values[idx]);
    
    renderTopsisBarChart(labels, dataValues);
    
    // 5. History table
    renderHistoryTable();
    
    lucide.createIcons();
}

// Dynamic helper to render calculation tables in steps accordion
function renderMathTable(tableId, dataMatrix, readySuppliers) {
    const table = document.getElementById(tableId);
    table.innerHTML = "";
    
    // Headers
    let headerHtml = "<thead><tr><th>Supplier</th><th>Alternatif</th>";
    criteria.forEach(crit => {
        headerHtml += `<th>${crit.code}</th>`;
    });
    headerHtml += "</tr></thead>";
    table.innerHTML += headerHtml;
    
    // Rows
    let bodyHtml = "<tbody>";
    dataMatrix.forEach((row, i) => {
        let cells = `<td><strong>${readySuppliers[i].name}</strong></td><td>${readySuppliers[i].alt}</td>`;
        row.forEach(val => {
            cells += `<td>${val.toFixed(4)}</td>`;
        });
        bodyHtml += `<tr>${cells}</tr>`;
    });
    bodyHtml += "</tbody>";
    table.innerHTML += bodyHtml;
}

// History table rendering
function renderHistoryTable() {
    const tbody = document.getElementById("history-rank-body");
    tbody.innerHTML = "";
    if (historyLogs.length === 0) {
        tbody.innerHTML = `<tr><td colspan="4" style="text-align:center; padding:16px; color:var(--muted);">Belum ada riwayat perhitungan.</td></tr>`;
    } else {
        historyLogs.forEach(h => {
            tbody.innerHTML += `
                <tr>
                    <td>${h.timestamp}</td>
                    <td><span class="badge ${h.cr < 0.1 ? 'badge-success' : 'badge-danger'}">CR: ${h.cr.toFixed(4)}</span></td>
                    <td><strong>${h.bestSupplier}</strong></td>
                    <td style="color:var(--primary); font-weight:700;">${h.bestScore.toFixed(4)}</td>
                </tr>
            `;
        });
    }
}

// Render TOPSIS side bar chart in the results section
function renderTopsisBarChart(labels, values) {
    const ctx = document.getElementById('chart-topsis-scores').getContext('2d');
    if (chartTopsisScores) chartTopsisScores.destroy();
    
    chartTopsisScores = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: labels,
            datasets: [{
                label: 'Skor Preferensi (Vi)',
                data: values,
                backgroundColor: 'rgba(37, 99, 235, 0.85)',
                borderColor: 'rgb(37, 99, 235)',
                borderWidth: 1.5,
                borderRadius: 6
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: { legend: { display: false } },
            scales: {
                y: { min: 0, max: 1, ticks: { stepSize: 0.2 } }
            }
        }
    });
}

// Render dashboard home charts (Bar + Pie)
function renderDashboardCharts() {
    const supCtx = document.getElementById('chart-supplier-scores');
    const critCtx = document.getElementById('chart-criteria-weights');
    
    if (!supCtx || !critCtx) return;
    
    // 1. Supplier Scores
    const labels = [];
    const scores = [];
    
    if (latestTopsisResults && latestTopsisResults.preference_values && suppliers.length > 0) {
        latestTopsisResults.sorted_indices.forEach(idx => {
            if (idx < suppliers.length) {
                labels.push(suppliers[idx].name);
                scores.push(latestTopsisResults.preference_values[idx]);
            }
        });
    } else {
        // Fallback or empty state
        suppliers.forEach(s => {
            labels.push(s.name);
            scores.push(0);
        });
    }
    
    if (chartSupplierScores) chartSupplierScores.destroy();
    chartSupplierScores = new Chart(supCtx.getContext('2d'), {
        type: 'bar',
        data: {
            labels: labels,
            datasets: [{
                label: 'Skor Preferensi',
                data: scores,
                backgroundColor: 'rgba(37, 99, 235, 0.8)',
                borderRadius: 8,
                barThickness: 24
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: { legend: { display: false } },
            scales: {
                y: { min: 0, max: 1, grid: { color: '#f1f5f9' } },
                x: { grid: { display: false } }
            }
        }
    });
    
    // 2. Criteria Weights
    const critLabels = criteria.map(c => c.name);
    const critWeights = criteria.map(c => c.weight || 0.1667);
    
    if (chartCriteriaWeights) chartCriteriaWeights.destroy();
    chartCriteriaWeights = new Chart(critCtx.getContext('2d'), {
        type: 'doughnut',
        data: {
            labels: critLabels,
            datasets: [{
                data: critWeights,
                backgroundColor: [
                    '#2563eb', // blue
                    '#3b82f6', // blue-light
                    '#10b981', // emerald
                    '#f59e0b', // amber
                    '#ef4444', // red
                    '#8b5cf6'  // violet
                ],
                borderWidth: 2
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: { position: 'bottom', labels: { boxWidth: 12, padding: 12 } }
            }
        }
    });
}

// Render Ranking UI (displays current results if calculated)
function renderRankingUI() {
    if (latestTopsisResults) {
        displayTopsisResults(latestTopsisResults, suppliers);
    } else {
        document.getElementById("topsis-results-container").style.display = "none";
    }
}

// Download local storage decision matrix as CSV
function downloadDatasetCSV() {
    let csvContent = "data:text/csv;charset=utf-8,";
    
    // Header
    let headers = ["Supplier", "Alternatif"];
    criteria.forEach(c => headers.push(`${c.name} (${c.code})`));
    csvContent += headers.join(",") + "\r\n";
    
    // Rows
    suppliers.forEach(s => {
        let row = [s.name, s.alt];
        criteria.forEach(c => row.push(s.values[c.id] || ""));
        csvContent += row.join(",") + "\r\n";
    });
    
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", "coffee_supplier_dataset.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
}

// Trigger initial forms load on page load
renderAHPInputs();
