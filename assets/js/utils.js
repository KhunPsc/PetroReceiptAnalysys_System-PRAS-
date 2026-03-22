function toNumberSafe(v) {
  if (v === null || v === undefined || v === "") return 0;
  const s = String(v).replace(/,/g, "").trim();
  const n = Number(s);
  return Number.isFinite(n) ? n : 0;
}

function sanitizeText(v, fallback="-") {
  const s = (v ?? "").toString().trim();
  return s || fallback;
}

function round2(n) {
  const x = Number(n || 0);
  return Math.round((x + Number.EPSILON) * 100) / 100;
}

function round3(n) {
  const x = Number(n || 0);
  return Math.round((x + Number.EPSILON) * 1000) / 1000;
}

function formatNumber(n) {
  return Number(n || 0).toLocaleString("th-TH", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  });
}

function randomId() {
  return "id_" + Math.random().toString(36).slice(2) + Date.now().toString(36);
}

function guessMimeTypeByName(name) {
  const n = String(name || "").toLowerCase();
  if (n.endsWith(".png")) return "image/png";
  if (n.endsWith(".jpg") || n.endsWith(".jpeg")) return "image/jpeg";
  if (n.endsWith(".webp")) return "image/webp";
  if (n.endsWith(".heic")) return "image/heic";
  if (n.endsWith(".pdf")) return "application/pdf";
  return "application/octet-stream";
}

function escapeHtml(str) {
  return String(str || "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function fileToBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result || "";
      const base64 = String(result).split(",")[1] || "";
      resolve(base64);
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

function normalizeCodeString(v) {
  return String(v ?? '').trim();
}

function normalizeTaxIdInput(v) {
  return String(v ?? '').replace(/\D/g, '');
}

function resolveCompanyByTaxIdFrontend(taxId) {
  const id = normalizeTaxIdInput(taxId);
  return KNOWN_COMPANY_BY_TAX_ID[id] || "";
}

function statusLabel(status) {
  switch (status) {
    case "pending": return "รอ OCR";
    case "processing": return "กำลังทำงาน";
    case "ready": return "พร้อมบันทึก";
    case "saved": return "บันทึกแล้ว";
    case "error": return "ผิดพลาด";
    default: return status;
  }
}

function defaultFormData() {
  return {
    tax_invoice: "-",
    tax_id: "-",
    date: "-",
    company: "-",
    fuel_type: "-",
    price_per_liter: 0,
    liters: 0,
    total_amount: 0,
    car_plate: "-",
    mileage: "-"
  };
}

function normalizeFormData(data = {}) {
  return {
    tax_invoice: normalizeCodeString(data.tax_invoice),
    tax_id: normalizeTaxIdInput(data.tax_id),
    date: sanitizeText(data.date),
    company: sanitizeText(data.company),
    fuel_type: sanitizeText(data.fuel_type),
    price_per_liter: toNumberSafe(data.price_per_liter),
    liters: toNumberSafe(data.liters),
    total_amount: toNumberSafe(data.total_amount),
    car_plate: sanitizeText(data.car_plate),
    mileage: sanitizeText(data.mileage)
  };
}
