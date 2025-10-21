import Button from "@/components/Button";

interface InvoiceListProps {
  data: any[];
  onRefresh: () => void;
}

export default function InvoiceList({ data }: InvoiceListProps) {
  if (!data.length) {
    return <p className="text-gray-500">Belum ada faktur yang dibuat.</p>;
  }

  return (
    <table className="w-full border-collapse border border-gray-300 bg-white shadow">
      <thead className="bg-gray-100">
        <tr>
          <th className="border p-2">No Faktur</th>
          <th className="border p-2">Pelanggan</th>
          <th className="border p-2">Lokasi</th>
          <th className="border p-2">Total</th>
          <th className="border p-2">Tanggal</th>
          <th className="border p-2">Aksi</th>
        </tr>
      </thead>
      <tbody>
        {data.map((inv) => (
          <tr key={inv.id} className="text-sm">
            <td className="border p-2">{inv.invoiceNumber}</td>
            <td className="border p-2">{inv.customer?.name || "-"}</td>
            <td className="border p-2">{inv.location?.name || "-"}</td>
            <td className="border p-2">
              Rp {Number(inv.totalAmount).toLocaleString("id-ID")}
            </td>
            <td className="border p-2">
              {new Date(inv.createdAt).toLocaleDateString("id-ID")}
            </td>
            <td className="border p-2 text-center">
              <Button
                onClick={() =>
                  window.open(`/report/invoices/${inv.id}`, "_blank")
                }
                className="bg-gray-700 text-white hover:bg-gray-600 text-sm px-3 py-1"
              >
                Cetak
              </Button>
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
