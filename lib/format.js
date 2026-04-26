export function formatRupiah(value) {
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    maximumFractionDigits: 0,
  }).format(Number(value) || 0);
}

export function formatNumberInput(value) {
  const onlyDigits = String(value || "").replace(/\D/g, "");
  if (!onlyDigits) return "";
  return new Intl.NumberFormat("id-ID").format(Number(onlyDigits));
}

export function parseFormattedNumber(value) {
  return Number(String(value || "").replace(/\D/g, "")) || 0;
}