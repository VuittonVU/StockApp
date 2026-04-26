function formatRupiah(value) {
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    maximumFractionDigits: 0,
  }).format(Number(value) || 0);
}

export default function ProductTable({ products }) {
  return (
    <div className="rounded-3xl border border-black/10 bg-white/80 p-5 shadow-sm">
      <h2 className="mb-5 text-4xl font-bold text-black">Daftar Produk</h2>

      <div className="overflow-x-auto">
        <table className="w-full min-w-[760px] border-separate border-spacing-0 overflow-hidden rounded-2xl">
          <thead>
            <tr className="bg-[#efe5d1]">
              <th className="px-5 py-4 text-left text-xl font-bold text-black">Nama Produk</th>
              <th className="px-5 py-4 text-left text-xl font-bold text-black">SKU</th>
              <th className="px-5 py-4 text-left text-xl font-bold text-black">Stok</th>
              <th className="px-5 py-4 text-left text-xl font-bold text-black">Harga Beli</th>
              <th className="px-5 py-4 text-left text-xl font-bold text-black">Harga Jual</th>
              <th className="px-5 py-4 text-left text-xl font-bold text-black">Aksi</th>
            </tr>
          </thead>

          <tbody>
            {products.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-5 py-6 text-center text-lg text-black">
                  Belum ada produk
                </td>
              </tr>
            ) : (
              products.map((product) => (
                <tr key={product.id} className="bg-white">
                  <td className="border-b border-black/10 px-5 py-4 text-lg text-black">
                    {product.name}
                  </td>
                  <td className="border-b border-black/10 px-5 py-4 text-lg text-black">
                    {product.sku || "-"}
                  </td>
                  <td className="border-b border-black/10 px-5 py-4 text-lg text-black">
                    {product.stock}
                  </td>
                  <td className="border-b border-black/10 px-5 py-4 text-lg text-black">
                    {formatRupiah(product.buy_price)}
                  </td>
                  <td className="border-b border-black/10 px-5 py-4 text-lg text-black">
                    {formatRupiah(product.sell_price)}
                  </td>
                  <td className="border-b border-black/10 px-5 py-4 text-lg text-black">
                    ✏️ 🗑️
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}