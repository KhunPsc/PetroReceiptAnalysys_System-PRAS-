const state = {
  items: [],
  selectedId: null,
  busy: false
};

function init() {
  applySavedTheme();
  bindEvents();
  renderAll();
}

function bindEvents() {
  els.fileInput.addEventListener("change", async (e) => {
    await addFiles(Array.from(e.target.files || []));
    els.fileInput.value = "";
  });

  els.dropzone.addEventListener("dragover", (e) => {
    e.preventDefault();
    els.dropzone.classList.add("is-dragover");
  });

  els.dropzone.addEventListener("dragleave", () => {
    els.dropzone.classList.remove("is-dragover");
  });

  els.dropzone.addEventListener("drop", async (e) => {
    e.preventDefault();
    els.dropzone.classList.remove("is-dragover");
    await addFiles(Array.from(e.dataTransfer.files || []));
  });

  els.btnThemeToggle.addEventListener("click", toggleTheme);

  els.btnOcrCurrent.addEventListener("click", () => {
    const item = getSelectedItem();
    if (item) ocrItem(item.id);
  });

  els.btnOcrSelected.addEventListener("click", () => {
    const item = getSelectedItem();
    if (item) ocrItem(item.id);
  });

  els.btnOcrAll.addEventListener("click", ocrAllItems);
  els.btnSaveSelected.addEventListener("click", saveSelectedItem);
  els.btnSaveAllReady.addEventListener("click", saveAllReadyItems);
  els.btnRemoveSelected.addEventListener("click", removeSelectedItem);
  els.btnClearAll.addEventListener("click", clearAllItems);

  Object.entries(els.fields).forEach(([key, input]) => {
    input.addEventListener("input", () => {
      const item = getSelectedItem();
      if (!item) return;

      if (["price_per_liter", "liters", "total_amount"].includes(key)) {
        item.formData[key] = toNumberSafe(input.value);
      } else if (key === "tax_invoice") {
        item.formData[key] = normalizeCodeString(input.value);
      } else if (key === "tax_id") {
        const cleaned = normalizeTaxIdInput(input.value);
        input.value = cleaned;
        item.formData[key] = cleaned;

        const mappedCompany = resolveCompanyByTaxIdFrontend(cleaned);
        if (mappedCompany) {
          const currentCompany = (els.fields.company.value || "").trim();
          if (!currentCompany || currentCompany === "-") {
            els.fields.company.value = mappedCompany;
            item.formData.company = mappedCompany;
          }
        }
      } else {
        item.formData[key] = sanitizeText(input.value);
      }

      updateSummary(item.formData);
    });
  });

  els.btnRotateLeft.addEventListener("click", () => adjustRotation(-90));
  els.btnRotateRight.addEventListener("click", () => adjustRotation(90));
  els.btnZoomOut.addEventListener("click", () => adjustScale(-0.1));
  els.btnZoomIn.addEventListener("click", () => adjustScale(0.1));
  els.btnResetView.addEventListener("click", resetViewTransform);

  els.btnCopyOcrText.addEventListener("click", async () => {
    const item = getSelectedItem();
    if (!item || !item.rawText) return;
    try {
      await navigator.clipboard.writeText(item.rawText);
      showItemStatus("คัดลอกข้อความ OCR แล้ว", "success");
    } catch (err) {
      showItemStatus("คัดลอกไม่สำเร็จ: " + err.message, "error");
    }
  });
}

async function addFiles(files) {
  if (!files.length) return;

  const maxSize = 10 * 1024 * 1024;
  const validFiles = files.filter(f => f.size <= maxSize);

  if (!validFiles.length) {
    showGlobalStatus("ไม่มีไฟล์ที่ใช้งานได้ หรือไฟล์ใหญ่เกิน 10MB", "warn");
    return;
  }

  for (const file of validFiles) {
    const base64 = await fileToBase64(file);
    state.items.push({
      id: randomId(),
      requestId: randomId(),
      file,
      fileData: {
        name: file.name,
        type: file.type || guessMimeTypeByName(file.name),
        size: file.size,
        data: base64
      },
      previewUrl: file.type.startsWith("image/") ? URL.createObjectURL(file) : "",
      status: "pending",
      error: "",
      formData: defaultFormData(),
      rawText: "",
      ocrDone: false,
      saveResult: null,
      view: {
        rotation: 0,
        scale: 1
      }
    });
  }

  if (!state.selectedId && state.items.length) {
    state.selectedId = state.items[0].id;
  }

  renderAll();
  showGlobalStatus(`เพิ่มไฟล์แล้ว ${validFiles.length} ไฟล์`, "success");
}

function clearAllItems() {
  state.items.forEach(item => {
    if (item.previewUrl) URL.revokeObjectURL(item.previewUrl);
  });
  state.items = [];
  state.selectedId = null;
  clearGlobalStatus();
  clearItemStatus();
  renderAll();
}

function removeSelectedItem() {
  const item = getSelectedItem();
  if (!item) return;
  if (item.previewUrl) URL.revokeObjectURL(item.previewUrl);

  const idx = state.items.findIndex(x => x.id === item.id);
  if (idx >= 0) state.items.splice(idx, 1);

  state.selectedId = state.items[Math.max(0, idx - 1)]?.id || state.items[0]?.id || null;
  clearItemStatus();
  renderAll();
}

async function ocrItem(itemId) {
  const item = state.items.find(x => x.id === itemId);
  if (!item) return;

  showWorkspace();
  try {
    setBusy(true);
    item.status = "processing";
    item.error = "";
    renderAll();

    showItemStatus(`กำลังอ่าน OCR: ${item.file.name}`, "info");

    // --- PREPROCESS IMAGE ---
    let payloadToOcr = item.fileData;
    if (item.file.type.startsWith("image/")) {
      try {
        showItemStatus(`กำลังเตรียมรูปภาพ (Preprocessing)...`, "info");
        const processedBase64 = await Preprocessor.process(item.fileData.data, {
          grayscale: true,
          contrast: 1.4,
          threshold: 128,
          scale: 1.2
        });
        payloadToOcr = { ...item.fileData, data: processedBase64 };
      } catch (err) {
        console.warn("Preprocessing failed, using original image", err);
      }
    }

    const result = await callBackendPost({
      action: "ocr",
      requestId: item.requestId,
      payload: payloadToOcr
    });

    if (!result.success) {
      throw new Error(result.error || "OCR ไม่สำเร็จ");
    }

    item.rawText = result.raw_text || "";
    item.formData = normalizeFormData(result.data || {});
    item.ocrDone = true;
    item.status = "ready";
    item.error = "";

    renderAll();
    showItemStatus(`OCR สำเร็จ: ${item.file.name}\nตรวจสอบข้อมูลแล้วกดยืนยันบันทึกได้เลย`, "success");
  } catch (err) {
    console.error(err);
    item.status = "error";
    item.error = err.message || String(err);
    renderAll();
    showItemStatus(`OCR ล้มเหลว: ${item.file.name}\n${item.error}`, "error");
  } finally {
    setBusy(false);
  }
}

async function ocrAllItems() {
  if (!state.items.length) return;
  const targets = state.items.filter(item => item.status === "pending" || item.status === "error");

  if (!targets.length) {
    showGlobalStatus("ไม่มีไฟล์ที่ต้อง OCR เพิ่ม", "warn");
    return;
  }

  setBusy(true);
  clearGlobalStatus();

  try {
    for (let i = 0; i < targets.length; i++) {
      const item = targets[i];
      state.selectedId = item.id;
      renderAll();
      showGlobalStatus(`กำลัง OCR (${i + 1}/${targets.length}) : ${item.file.name}`, "info");
      await ocrItem(item.id);
    }
    showGlobalStatus("OCR ครบทุกไฟล์ที่เลือกแล้ว", "success");
  } finally {
    setBusy(false);
    renderAll();
  }
}

async function saveSelectedItem() {
  const item = getSelectedItem();
  if (!item) return;
  await saveItem(item.id);
}

async function saveItem(itemId) {
  const item = state.items.find(x => x.id === itemId);
  if (!item) return;

  try {
    setBusy(true);
    syncFormToItem(item);
    showItemStatus(`กำลังบันทึก: ${item.file.name}`, "info");

    const result = await callBackendPost({
      action: "save",
      requestId: item.requestId,
      validatedData: item.formData,
      fileData: item.fileData
    });

    if (!result.success) {
      throw new Error(result.error || "บันทึกข้อมูลไม่สำเร็จ");
    }

    item.status = "saved";
    item.error = "";
    item.saveResult = result;

    renderAll();
    showItemStatus(
      `บันทึกสำเร็จ: ${item.file.name}\nแถวที่บันทึก: ${result.row || "-"}`
      + (result.requestId ? `\nrequestId: ${result.requestId}` : ""),
      "success"
    );

    selectNextActionable();
  } catch (err) {
    console.error(err);
    item.status = "error";
    item.error = err.message || String(err);
    renderAll();
    showItemStatus(`บันทึกล้มเหลว: ${item.file.name}\n${item.error}`, "error");
  } finally {
    setBusy(false);
  }
}

async function saveAllReadyItems() {
  const targets = state.items.filter(item => item.status === "ready");

  if (!targets.length) {
    showGlobalStatus("ไม่มีไฟล์ที่พร้อมบันทึก", "warn");
    return;
  }

  setBusy(true);

  try {
    for (let i = 0; i < targets.length; i++) {
      const item = targets[i];
      state.selectedId = item.id;
      renderAll();
      showGlobalStatus(`กำลังบันทึก (${i + 1}/${targets.length}) : ${item.file.name}`, "info");
      await saveItem(item.id);
    }
    showGlobalStatus("บันทึกครบทุกไฟล์ที่พร้อมแล้ว", "success");
  } finally {
    setBusy(false);
    renderAll();
  }
}

async function callBackendPost(bodyObj) {
  if (!SCRIPT_URL || SCRIPT_URL.includes("PASTE_YOUR_APPS_SCRIPT_WEB_APP_URL_HERE")) {
    throw new Error("กรุณาใส่ SCRIPT_URL ในโค้ดก่อนใช้งาน");
  }

  const resp = await fetch(SCRIPT_URL, {
    method: "POST",
    headers: {
      "Content-Type": "text/plain;charset=utf-8"
    },
    body: JSON.stringify(bodyObj),
    redirect: "follow"
  });

  const text = await resp.text();

  let parsed;
  try {
    parsed = JSON.parse(text);
  } catch (err) {
    throw new Error("Backend ไม่ได้ส่ง JSON กลับมา: " + text);
  }

  return parsed;
}

function adjustRotation(delta) {
  const item = getSelectedItem();
  if (!item) return;
  item.view.rotation = (item.view.rotation + delta) % 360;
  applyImageTransform(item);
}

function adjustScale(delta) {
  const item = getSelectedItem();
  if (!item) return;
  const next = Math.max(0.2, Math.min(4, (item.view.scale || 1) + delta));
  item.view.scale = round3(next);
  applyImageTransform(item);
}

function resetViewTransform() {
  const item = getSelectedItem();
  if (!item) return;
  item.view.rotation = 0;
  item.view.scale = 1;
  applyImageTransform(item);
}

function getSelectedItem() {
  return state.items.find(x => x.id === state.selectedId) || null;
}

function setBusy(flag) {
  state.busy = !!flag;
  updateButtons();
}

function syncFormToItem(item) {
  const taxId = normalizeTaxIdInput(els.fields.tax_id.value);
  let company = sanitizeText(els.fields.company.value);

  const mappedCompany = resolveCompanyByTaxIdFrontend(taxId);
  if (mappedCompany && (!company || company === "-")) {
    company = mappedCompany;
    els.fields.company.value = mappedCompany;
  }

  item.formData = {
    tax_invoice: normalizeCodeString(els.fields.tax_invoice.value),
    tax_id: taxId,
    date: sanitizeText(els.fields.date.value),
    company: company,
    fuel_type: sanitizeText(els.fields.fuel_type.value),
    price_per_liter: toNumberSafe(els.fields.price_per_liter.value),
    liters: toNumberSafe(els.fields.liters.value),
    total_amount: toNumberSafe(els.fields.total_amount.value),
    car_plate: sanitizeText(els.fields.car_plate.value),
    mileage: sanitizeText(els.fields.mileage.value)
  };
}

function selectNextActionable() {
  const next = state.items.find(x => x.status === "ready" || x.status === "pending" || x.status === "error");
  if (next) {
    state.selectedId = next.id;
    renderAll();
  }
}

// Start Application
init();
