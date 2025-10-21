export const generateInvoiceNumber = (): string => {
  const now = new Date();
  return `INV-${now.getFullYear()}${String(now.getMonth() + 1).padStart(
    2,
    "0"
  )}${String(now.getDate()).padStart(2, "0")}-${Date.now()}`;
};

export const formatRupiah = (value: number): string =>
  `Rp ${value.toLocaleString("id-ID")}`;
