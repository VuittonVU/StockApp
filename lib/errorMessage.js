export function getErrorMessage(error, fallback = "Terjadi kesalahan.") {
  const raw = String(error?.message || "").toLowerCase();

  if (raw.includes("invalid login credentials")) {
    return "Email atau kata sandi salah.";
  }

  if (raw.includes("email not confirmed")) {
    return "Email belum diverifikasi.";
  }

  if (raw.includes("duplicate key")) {
    return "Data yang sama sudah ada.";
  }

  if (raw.includes("violates row-level security")) {
    return "Akses ditolak. Silakan login ulang.";
  }

  if (raw.includes("network")) {
    return "Koneksi bermasalah. Coba lagi.";
  }

  return fallback;
}