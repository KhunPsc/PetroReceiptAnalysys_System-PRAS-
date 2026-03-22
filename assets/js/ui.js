const els = {
  body: document.body,
  dropzone: document.getElementById("dropzone"),
  fileInput: document.getElementById("fileInput"),
  queueList: document.getElementById("queueList"),
  globalStatus: document.getElementById("globalStatus"),
  itemStatus: document.getElementById("itemStatus"),

  btnThemeToggle: document.getElementById("btnThemeToggle"),
  btnOpenSheet: document.getElementById("btnOpenSheet"),

  btnOcrCurrent: document.getElementById("btnOcrCurrent"),
  btnOcrAll: document.getElementById("btnOcrAll"),
  btnAddFiles: document.getElementById("btnAddFiles"),
  btnSaveAllReady: document.getElementById("btnSaveAllReady"),
  btnClearAll: document.getElementById("btnClearAll"),
  btnPrevItem: document.getElementById("btnPrevItem"),
  btnNextItem: document.getElementById("btnNextItem"),

  previewPlaceholder: document.getElementById("previewPlaceholder"),
  previewImageWrap: document.getElementById("previewImageWrap"),
  previewImage: document.getElementById("previewImage"),
  previewPdf: document.getElementById("previewPdf"),
  previewPdfName: document.getElementById("previewPdfName"),

  btnRotateLeft: document.getElementById("btnRotateLeft"),
  btnRotateRight: document.getElementById("btnRotateRight"),
  btnZoomOut: document.getElementById("btnZoomOut"),
  btnZoomIn: document.getElementById("btnZoomIn"),
  btnResetView: document.getElementById("btnResetView"),
  btnPreviewPrevZone: document.getElementById("btnPreviewPrevZone"),
  btnPreviewNextZone: document.getElementById("btnPreviewNextZone"),

  btnCopyOcrText: document.getElementById("btnCopyOcrText"),
  ocrRawText: document.getElementById("ocrRawText"),

  editorEmpty: document.getElementById("editorEmpty"),
  editorPanel: document.getElementById("editorPanel"),
  btnSaveSelected: document.getElementById("btnSaveSelected"),
  btnRemoveSelected: document.getElementById("btnRemoveSelected"),

  countAll: document.getElementById("countAll"),
  countReady: document.getElementById("countReady"),
  countSaved: document.getElementById("countSaved"),
  countError: document.getElementById("countError"),

  fields: {
    tax_invoice: document.getElementById("tax_invoice"),
    tax_id: document.getElementById("tax_id"),
    date: document.getElementById("date"),
    company: document.getElementById("company"),
    fuel_type: document.getElementById("fuel_type"),
    price_per_liter: document.getElementById("price_per_liter"),
    liters: document.getElementById("liters"),
    total_amount: document.getElementById("total_amount"),
    car_plate: document.getElementById("car_plate"),
    mileage: document.getElementById("mileage")
  },

  sumNet: document.getElementById("sumNet"),
  sumVat: document.getElementById("sumVat"),
  sumTotal: document.getElementById("sumTotal"),

  mainToolbar: document.getElementById("mainToolbar"),
  appWorkspace: document.getElementById("appWorkspace"),
  ocrModelRadios: document.querySelectorAll('input[name="ocrModel"]'),

  ocrProgressModal: document.getElementById("ocrProgressModal"),
  ocrProgressText: document.getElementById("ocrProgressText"),
  ocrProgressBar: document.getElementById("ocrProgressBar"),
  btnStopOcr: document.getElementById("btnStopOcr")
};

function applySavedTheme() {
  const saved = localStorage.getItem(THEME_KEY);
  const prefersDark = window.matchMedia && window.matchMedia("(prefers-color-scheme: dark)").matches;
  const isDark = saved ? saved === "dark" : prefersDark;

  document.body.classList.toggle("theme-dark", isDark);
  updateThemeButtonA11y(isDark);
}

function toggleTheme() {
  const isDark = !document.body.classList.contains("theme-dark");
  document.body.classList.toggle("theme-dark", isDark);
  localStorage.setItem(THEME_KEY, isDark ? "dark" : "light");
  updateThemeButtonA11y(isDark);
}

function updateThemeButtonA11y(isDark) {
  if (!els.btnThemeToggle) return;
  els.btnThemeToggle.setAttribute("aria-pressed", isDark ? "true" : "false");
  els.btnThemeToggle.setAttribute("title", isDark ? "เปลี่ยนเป็น Light mode" : "เปลี่ยนเป็น Dark mode");
}

function renderCounts() {
  els.countAll.textContent = state.items.length;
  els.countReady.textContent = state.items.filter(x => x.status === "ready").length;
  els.countSaved.textContent = state.items.filter(x => x.status === "saved").length;
  els.countError.textContent = state.items.filter(x => x.status === "error").length;
}

function buildQueueThumb(item) {
  const isImage = (item.file.type || "").startsWith("image/");
  if (isImage && item.previewUrl) {
    return `<img class="queue-thumb-large" src="${item.previewUrl}" alt="preview" />`;
  }
  if ((item.file.type || "").includes("pdf") || item.file.name.toLowerCase().endsWith(".pdf")) {
    return `<div class="queue-thumb-pdf-large">📄</div>`;
  }
  return `<div class="queue-thumb-pdf-large">📎</div>`;
}

function renderQueue() {
  if (!state.items.length) {
    els.queueList.innerHTML = `<div class="empty-note">ยังไม่มีไฟล์ในรายการ</div>`;
    return;
  }

  els.queueList.innerHTML = state.items.map(item => {
    const active = item.id === state.selectedId ? "active" : "";
    const savedState = item.status === "saved" ? "saved-state" : "";
    const sizeMb = (item.file.size / (1024 * 1024)).toFixed(2);
    const canProcess = !state.busy && (item.status === "pending" || item.status === "error");

    return `
      <div class="queue-item ${active} ${savedState}" data-id="${item.id}">
        <div class="queue-item-body">
          <div class="queue-preview-panel">
            ${buildQueueThumb(item)}
          </div>
          <div class="queue-main-panel">
            <div class="queue-top">
              <div>
                <div class="queue-name">${escapeHtml(item.file.name)}</div>
                <div class="queue-meta">
                  ${escapeHtml(item.file.type || guessMimeTypeByName(item.file.name))}<br>
                  ${sizeMb} MB
                </div>
              </div>
              <span class="badge ${item.status}">${escapeHtml(statusLabel(item.status))}</span>
            </div>

            ${item.error ? `<div class="queue-meta" style="color:#b91c1c;">${escapeHtml(item.error)}</div>` : ""}

            <div class="queue-actions queue-actions-right">
              <button class="mini-btn process" data-action="process" data-id="${item.id}" ${canProcess ? "" : "disabled"}>ประมวลผล</button>
              <button class="mini-btn select" data-action="select" data-id="${item.id}">เลือก</button>
              <button class="mini-btn remove" data-action="remove" data-id="${item.id}">ลบ</button>
            </div>
          </div>
        </div>
      </div>
    `;
  }).join("");
}

function renderPreview() {
  const item = getSelectedItem();

  if (!item) {
    els.previewPlaceholder.classList.remove("hidden");
    els.previewImageWrap.classList.add("hidden");
    els.previewImageWrap.classList.remove("is-pan-enabled");
    els.previewImageWrap.classList.remove("is-dragging");
    els.previewPdf.classList.add("hidden");
    els.previewPlaceholder.textContent = "ยังไม่ได้เลือกไฟล์";
    return;
  }

  const isImage = (item.file.type || "").startsWith("image/");
  const isPdf = (item.file.type || "").includes("pdf") || item.file.name.toLowerCase().endsWith(".pdf");

  if (isImage) {
    els.previewImage.src = item.previewUrl;
    applyImageTransform(item);
    els.previewPlaceholder.classList.add("hidden");
    els.previewImageWrap.classList.remove("hidden");
    els.previewPdf.classList.add("hidden");
  } else if (isPdf) {
    els.previewPdfName.textContent = item.file.name;
    els.previewPlaceholder.classList.add("hidden");
    els.previewImageWrap.classList.add("hidden");
    els.previewPdf.classList.remove("hidden");
  } else {
    els.previewPlaceholder.classList.remove("hidden");
    els.previewPlaceholder.textContent = item.file.name;
    els.previewImageWrap.classList.add("hidden");
    els.previewImageWrap.classList.remove("is-pan-enabled");
    els.previewPdf.classList.add("hidden");
  }
}

function renderRawText() {
  const item = getSelectedItem();
  els.ocrRawText.value = item ? (item.rawText || "") : "";
}

function renderEditor() {
  const item = getSelectedItem();

  if (!item) {
    els.editorEmpty.classList.remove("hidden");
    els.editorPanel.classList.add("hidden");
    return;
  }

  els.editorEmpty.classList.add("hidden");
  els.editorPanel.classList.remove("hidden");

  fillEditor(item.formData);
  updateSummary(item.formData);
}

function fillEditor(data) {
  els.fields.tax_invoice.value = data.tax_invoice ?? "-";
  els.fields.tax_id.value = data.tax_id ?? "-";
  els.fields.date.value = data.date ?? "-";
  els.fields.company.value = data.company ?? "-";
  els.fields.fuel_type.value = data.fuel_type ?? "-";
  els.fields.price_per_liter.value = data.price_per_liter ?? 0;
  els.fields.liters.value = data.liters ?? 0;
  els.fields.total_amount.value = data.total_amount ?? 0;
  els.fields.car_plate.value = data.car_plate ?? "-";
  els.fields.mileage.value = data.mileage ?? "-";
}

function updateButtons() {
  const selected = getSelectedItem();
  const hasItems = state.items.length > 0;
  const isSingle = state.items.length === 1;
  const isMulti = state.items.length > 1;
  const hasReady = state.items.some(x => x.status === "ready");
  const canViewImage = selected && (selected.file.type || "").startsWith("image/");

  if (hasItems && isSingle) {
    els.btnOcrCurrent.classList.remove("hidden");
    els.btnOcrAll.classList.add("hidden");
  } else if (hasItems) {
    els.btnOcrCurrent.classList.add("hidden");
    els.btnOcrAll.classList.remove("hidden");
  } else {
    els.btnOcrCurrent.classList.remove("hidden");
    els.btnOcrAll.classList.add("hidden");
  }

  els.btnOcrCurrent.disabled = state.busy || !selected;
  els.btnOcrAll.disabled = state.busy || !hasItems;
  els.btnAddFiles.disabled = state.busy;
  els.btnSaveSelected.disabled = state.busy || !selected;
  els.btnSaveAllReady.disabled = state.busy || !hasReady;
  if (hasReady && isMulti) {
    els.btnSaveAllReady.classList.remove("hidden");
  } else {
    els.btnSaveAllReady.classList.add("hidden");
  }
  els.btnRemoveSelected.disabled = state.busy || !selected;
  els.btnClearAll.disabled = state.busy || !hasItems;
  if (els.btnPrevItem) els.btnPrevItem.disabled = state.busy || !hasItems || state.items.length < 2;
  if (els.btnNextItem) els.btnNextItem.disabled = state.busy || !hasItems || state.items.length < 2;

  els.btnRotateLeft.disabled = state.busy || !canViewImage;
  els.btnRotateRight.disabled = state.busy || !canViewImage;
  els.btnZoomIn.disabled = state.busy || !canViewImage;
  els.btnZoomOut.disabled = state.busy || !canViewImage;
  els.btnResetView.disabled = state.busy || !canViewImage;
  if (els.btnPreviewPrevZone) els.btnPreviewPrevZone.disabled = state.busy || !hasItems || state.items.length < 2;
  if (els.btnPreviewNextZone) els.btnPreviewNextZone.disabled = state.busy || !hasItems || state.items.length < 2;

  els.btnCopyOcrText.disabled = !selected || !(selected.rawText || "");
}

function getSelectedOcrModel() {
  if (!els.ocrModelRadios || !els.ocrModelRadios.length) {
    return "gemini-2.5-flash";
  }
  const selected = Array.from(els.ocrModelRadios).find(r => r.checked);
  return selected ? selected.value : "gemini-2.5-flash";
}

function applyImageTransform(item) {
  if (!item) return;
  const x = item.view.panX || 0;
  const y = item.view.panY || 0;
  const canPan = (item.view.scale || 1) > 1;
  els.previewImageWrap.classList.toggle("is-pan-enabled", canPan);
  els.previewImage.style.transform = `translate(${x}px, ${y}px) rotate(${item.view.rotation || 0}deg) scale(${item.view.scale || 1})`;
}

function showGlobalStatus(message, type = "info") {
  els.globalStatus.className = `status-panel ${type}`;
  els.globalStatus.textContent = message;
}

function clearGlobalStatus() {
  els.globalStatus.className = "status-panel";
  els.globalStatus.textContent = "";
}

function showItemStatus(message, type = "info") {
  els.itemStatus.className = `status-panel ${type}`;
  els.itemStatus.textContent = message;
}

function clearItemStatus() {
  els.itemStatus.className = "status-panel";
  els.itemStatus.textContent = "";
}

function showOcrProgressModal(current, total, fileName, statusText) {
  const ratio = total > 0 ? Math.min(100, Math.max(0, Math.round((current / total) * 100))) : 0;
  els.ocrProgressText.textContent = `ไฟล์ ${current}/${total}: ${fileName || "-"}\n${statusText || "กำลังประมวลผล..."}`;
  els.ocrProgressBar.style.width = `${ratio}%`;
  els.ocrProgressModal.classList.remove("hidden");
}

function hideOcrProgressModal() {
  els.ocrProgressModal.classList.add("hidden");
  els.ocrProgressBar.style.width = "0%";
  els.ocrProgressText.textContent = "กำลังเริ่มต้น...";
}

function updateSummary(formData) {
  const total = toNumberSafe(formData?.total_amount);
  const net = round2(total / 1.07);
  const vat = round2(total - net);
  els.sumNet.textContent = formatNumber(net);
  els.sumVat.textContent = formatNumber(vat);
  els.sumTotal.textContent = formatNumber(total);
}

function renderAll() {
  renderCounts();
  renderQueue();
  renderPreview();
  renderRawText();
  renderEditor();
  updateButtons();

  if (state.items.length > 0) {
    els.mainToolbar.classList.remove("hidden");
  } else {
    els.mainToolbar.classList.add("hidden");
    els.appWorkspace.classList.add("hidden");
  }
}

function showWorkspace() {
  els.appWorkspace.classList.remove("hidden");
}

function initQueueListeners() {
  els.queueList.addEventListener("click", (e) => {
    const btn = e.target.closest("[data-action]");
    if (btn) {
      e.stopPropagation();
      const action = btn.dataset.action;
      const id = btn.dataset.id;

      if (action === "select") {
        state.selectedId = id;
        clearItemStatus();
        renderAll();
        return;
      }

      if (action === "process") {
        if (!state.busy) ocrItem(id);
        return;
      }

      if (action === "remove") {
        const item = state.items.find(x => x.id === id);
        if (!item) return;
        if (item.previewUrl) URL.revokeObjectURL(item.previewUrl);
        state.items = state.items.filter(x => x.id !== id);
        if (state.selectedId === id) {
          state.selectedId = state.items[0]?.id || null;
        }
        renderAll();
        return;
      }
    }

    const card = e.target.closest(".queue-item");
    if (card) {
      state.selectedId = card.dataset.id;
      clearItemStatus();
      renderAll();
    }
  });
}
