"use client";

import { useEffect, useMemo, useState } from "react";
import { FiChevronDown } from "react-icons/fi";
import AppShell from "@/components/AppShell";
import PopupModal from "@/components/PopupModal";
import { supabase } from "@/lib/supabase";
import {
  formatRupiah,
  formatNumberInput,
  parseFormattedNumber,
} from "@/lib/format";
import { exportToCsv } from "@/lib/exportCsv";
import toast from "react-hot-toast";

function getStockField(unitType) {
  if (unitType === "karton") return "stock_karton";
  if (unitType === "box") return "stock_box";
  return "stock_piece";
}

function getSaleCategoryLabel(value) {
  if (value === "return_damaged") return "Pengembalian Barang Rusak";
  if (value === "normal") return "Penjualan Murni";
  return "-";
}

function getUnitLabel(value) {
  if (value === "karton") return "Karton";
  if (value === "box") return "Box";
  return "Piece";
}

function formatDate(value) {
  if (!value) return "-";

  return new Intl.DateTimeFormat("id-ID", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

function SelectArrow({ small = false }) {
  return (
    <FiChevronDown
      size={small ? 21 : 22}
      className={`pointer-events-none absolute right-5 ${
        small ? "top-[46px]" : "top-[54px]"
      } text-black`}
    />
  );
}

export default function RiwayatPage() {
  const [activeTab, setActiveTab] = useState("transaksi");
  const [transactions, setTransactions] = useState([]);
  const [products, setProducts] = useState([]);
  const [loadingData, setLoadingData] = useState(true);

  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState("semua");
  const [unitFilter, setUnitFilter] = useState("semua");
  const [saleCategoryFilter, setSaleCategoryFilter] = useState("semua");

  const [selectedIds, setSelectedIds] = useState([]);

  const [editModalOpen, setEditModalOpen] = useState(false);
  const [selectedTransaction, setSelectedTransaction] = useState(null);
  const [editForm, setEditForm] = useState({
    type: "purchase",
    sale_category: "",
    unit_type: "piece",
    quantity: "",
    price: "",
    note: "",
  });

  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [transactionToDelete, setTransactionToDelete] = useState(null);
  const [bulkDeleteOpen, setBulkDeleteOpen] = useState(false);

  useEffect(() => {
    fetchAllData();
  }, []);

  async function fetchAllData() {
    setLoadingData(true);
    await Promise.all([fetchTransactions(), fetchProducts()]);
    setLoadingData(false);
  }

  async function fetchTransactions() {
    const { data, error } = await supabase
      .from("transactions")
      .select(
        "id, type, sale_category, unit_type, quantity, price, note, created_at, products(id, name, sku, stock_karton, stock_box, stock_piece)"
      )
      .order("created_at", { ascending: false })
      .limit(100);

    if (error) {
      toast.error("Gagal memuat riwayat transaksi.");
      return;
    }

    setTransactions(data || []);
  }

  async function fetchProducts() {
    const { data, error } = await supabase
      .from("products")
      .select(
        "id, name, sku, stock_karton, stock_box, stock_piece, buy_price, sell_price"
      )
      .order("name", { ascending: true })
      .limit(200);

    if (error) {
      toast.error("Gagal memuat data produk.");
      return;
    }

    setProducts(data || []);
  }

  function toggleSelected(id) {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  }

  function clearSelected() {
    setSelectedIds([]);
  }

  function openEditModal(item) {
    setSelectedTransaction(item);
    setEditForm({
      type: item.type,
      sale_category:
        item.sale_category || (item.type === "sale" ? "normal" : ""),
      unit_type: item.unit_type || "piece",
      quantity: String(item.quantity ?? ""),
      price: formatNumberInput(item.price),
      note: item.note || "",
    });
    setEditModalOpen(true);
  }

  function closeEditModal() {
    setEditModalOpen(false);
    setSelectedTransaction(null);
    setEditForm({
      type: "purchase",
      sale_category: "",
      unit_type: "piece",
      quantity: "",
      price: "",
      note: "",
    });
  }

  function handleEditChange(e) {
    const { name, value } = e.target;

    if (name === "price") {
      setEditForm((prev) => ({
        ...prev,
        price: formatNumberInput(value),
      }));
      return;
    }

    if (name === "type") {
      setEditForm((prev) => ({
        ...prev,
        type: value,
        sale_category: value === "sale" ? prev.sale_category || "normal" : "",
      }));
      return;
    }

    setEditForm((prev) => ({
      ...prev,
      [name]: value,
    }));
  }

  function openDeleteModal(item) {
    setTransactionToDelete(item);
    setDeleteModalOpen(true);
  }

  function closeDeleteModal() {
    setTransactionToDelete(null);
    setDeleteModalOpen(false);
  }

  async function updateStock(product, oldTransaction, newTransaction) {
    let stockKarton = Number(product.stock_karton || 0);
    let stockBox = Number(product.stock_box || 0);
    let stockPiece = Number(product.stock_piece || 0);

    function applyChange(type, unitType, quantity, mode) {
      const qty = Number(quantity || 0);
      const field = getStockField(unitType);

      const sign =
        type === "purchase"
          ? mode === "apply"
            ? 1
            : -1
          : mode === "apply"
          ? -1
          : 1;

      if (field === "stock_karton") stockKarton += sign * qty;
      if (field === "stock_box") stockBox += sign * qty;
      if (field === "stock_piece") stockPiece += sign * qty;
    }

    if (oldTransaction) {
      applyChange(
        oldTransaction.type,
        oldTransaction.unit_type,
        oldTransaction.quantity,
        "rollback"
      );
    }

    if (newTransaction) {
      applyChange(
        newTransaction.type,
        newTransaction.unit_type,
        newTransaction.quantity,
        "apply"
      );
    }

    if (stockKarton < 0 || stockBox < 0 || stockPiece < 0) {
      return { error: "Stok tidak cukup." };
    }

    const { error } = await supabase
      .from("products")
      .update({
        stock_karton: stockKarton,
        stock_box: stockBox,
        stock_piece: stockPiece,
      })
      .eq("id", product.id);

    if (error) return { error: "Gagal memperbarui stok." };

    return { error: null };
  }

  async function confirmDeleteTransaction() {
    const item = transactionToDelete;
    if (!item) return;

    const product = item.products;

    if (!product) {
      toast.error("Produk tidak ditemukan.");
      return;
    }

    const stockResult = await updateStock(product, item, null);

    if (stockResult.error) {
      toast.error(stockResult.error);
      return;
    }

    const { error } = await supabase
      .from("transactions")
      .delete()
      .eq("id", item.id);

    if (error) {
      toast.error("Gagal menghapus transaksi.");
      return;
    }

    toast.success("Transaksi berhasil dihapus.");
    closeDeleteModal();
    clearSelected();
    fetchAllData();
  }

  async function confirmBulkDelete() {
    const selectedTransactions = transactions.filter((item) =>
      selectedIds.includes(item.id)
    );

    for (const item of selectedTransactions) {
      if (!item.products) {
        toast.error("Ada produk yang tidak ditemukan.");
        return;
      }

      const stockResult = await updateStock(item.products, item, null);

      if (stockResult.error) {
        toast.error(stockResult.error);
        return;
      }

      const { error } = await supabase
        .from("transactions")
        .delete()
        .eq("id", item.id);

      if (error) {
        toast.error("Gagal menghapus sebagian transaksi.");
        return;
      }
    }

    toast.success("Transaksi terpilih berhasil dihapus.");
    setBulkDeleteOpen(false);
    clearSelected();
    fetchAllData();
  }

  async function handleSaveEdit(e) {
    e.preventDefault();

    if (!selectedTransaction) return;

    const product = selectedTransaction.products;
    const newQuantity = Number(editForm.quantity);

    if (!product) {
      toast.error("Produk tidak ditemukan.");
      return;
    }

    if (newQuantity <= 0) {
      toast.error("Jumlah harus lebih dari 0.");
      return;
    }

    const newTransaction = {
      type: editForm.type,
      sale_category:
        editForm.type === "sale" ? editForm.sale_category || "normal" : null,
      unit_type: editForm.unit_type,
      quantity: newQuantity,
    };

    const stockResult = await updateStock(
      product,
      selectedTransaction,
      newTransaction
    );

    if (stockResult.error) {
      toast.error(stockResult.error);
      return;
    }

    const { error } = await supabase
      .from("transactions")
      .update({
        type: newTransaction.type,
        sale_category: newTransaction.sale_category,
        unit_type: newTransaction.unit_type,
        quantity: newTransaction.quantity,
        price: parseFormattedNumber(editForm.price),
        note: editForm.note.trim() || null,
      })
      .eq("id", selectedTransaction.id);

    if (error) {
      toast.error("Gagal memperbarui transaksi.");
      return;
    }

    toast.success("Transaksi berhasil diperbarui.");
    closeEditModal();
    clearSelected();
    fetchAllData();
  }

  const filteredTransactions = useMemo(() => {
    return transactions.filter((item) => {
      const keyword = search.toLowerCase().trim();

      const matchesSearch =
        keyword === "" ||
        item.products?.name?.toLowerCase().includes(keyword) ||
        item.products?.sku?.toLowerCase().includes(keyword) ||
        item.note?.toLowerCase().includes(keyword) ||
        String(item.quantity).includes(keyword) ||
        String(item.price).includes(keyword) ||
        formatDate(item.created_at).toLowerCase().includes(keyword) ||
        (item.type === "sale" &&
          getSaleCategoryLabel(item.sale_category)
            .toLowerCase()
            .includes(keyword));

      const matchesType = typeFilter === "semua" || item.type === typeFilter;
      const matchesUnit =
        unitFilter === "semua" || item.unit_type === unitFilter;
      const matchesSaleCategory =
        typeFilter !== "sale" ||
        saleCategoryFilter === "semua" ||
        item.sale_category === saleCategoryFilter;

      return matchesSearch && matchesType && matchesUnit && matchesSaleCategory;
    });
  }, [transactions, search, typeFilter, unitFilter, saleCategoryFilter]);

  const filteredProducts = useMemo(() => {
    return products.filter((product) => {
      const keyword = search.toLowerCase().trim();

      return (
        keyword === "" ||
        product.name?.toLowerCase().includes(keyword) ||
        product.sku?.toLowerCase().includes(keyword) ||
        String(product.stock_karton ?? "").includes(keyword) ||
        String(product.stock_box ?? "").includes(keyword) ||
        String(product.stock_piece ?? "").includes(keyword) ||
        String(product.buy_price ?? "").includes(keyword) ||
        String(product.sell_price ?? "").includes(keyword)
      );
    });
  }, [products, search]);

  function handleExportTransactions() {
    if (filteredTransactions.length === 0) {
      toast.error("Tidak ada transaksi untuk diekspor.");
      return;
    }

    exportToCsv(
      "riwayat-transaksi.csv",
      filteredTransactions.map((item) => ({
        tanggal: formatDate(item.created_at),
        produk: item.products?.name || "-",
        jenis: item.type === "purchase" ? "Pembelian" : "Penjualan",
        kategori:
          item.type === "sale" ? getSaleCategoryLabel(item.sale_category) : "-",
        unit: getUnitLabel(item.unit_type),
        jumlah: item.quantity,
        harga: item.price,
        catatan: item.note || "-",
      }))
    );
  }

  function handleExportProducts() {
    if (filteredProducts.length === 0) {
      toast.error("Tidak ada produk untuk diekspor.");
      return;
    }

    exportToCsv(
      "riwayat-produk.csv",
      filteredProducts.map((item) => ({
        nama_produk: item.name,
        sku: item.sku || "-",
        karton: item.stock_karton,
        box: item.stock_box,
        piece: item.stock_piece,
        harga_beli: item.buy_price,
        harga_jual: item.sell_price,
      }))
    );
  }

  return (
    <>
      <AppShell
        title="Riwayat"
        subtitle="Lihat riwayat transaksi maupun data produk."
        rightContent={
          <div className="flex flex-wrap gap-3">
            <button
              type="button"
              onClick={handleExportTransactions}
              className="rounded-2xl bg-black px-5 py-3 text-lg font-semibold text-white transition-all duration-300 hover:-translate-y-0.5 hover:shadow-lg"
            >
              Export Transaksi
            </button>

            <button
              type="button"
              onClick={handleExportProducts}
              className="rounded-2xl border border-black bg-white px-5 py-3 text-lg font-semibold text-black transition-all duration-300 hover:-translate-y-0.5 hover:bg-black hover:!text-white hover:shadow-lg"
            >
              Export Produk
            </button>
          </div>
        }
      >
        <div className="mb-6 flex flex-wrap gap-3">
          <button
            type="button"
            onClick={() => {
              setActiveTab("transaksi");
              clearSelected();
            }}
            className={`rounded-2xl px-5 py-3 text-lg font-semibold transition-all duration-300 ${
              activeTab === "transaksi"
                ? "bg-black text-white shadow-md"
                : "border border-black bg-white text-black hover:bg-black hover:text-white"
            }`}
          >
            Riwayat Transaksi
          </button>

          <button
            type="button"
            onClick={() => {
              setActiveTab("produk");
              clearSelected();
            }}
            className={`rounded-2xl px-5 py-3 text-lg font-semibold transition-all duration-300 ${
              activeTab === "produk"
                ? "bg-black text-white shadow-md"
                : "border border-black bg-white text-black hover:bg-black hover:text-white"
            }`}
          >
            Riwayat Produk
          </button>
        </div>

        <section className="mb-6 rounded-3xl border border-black/10 bg-white p-6 shadow-sm">
          <h2 className="mb-5 text-3xl font-bold text-black">
            Pencarian & Filter
          </h2>

          <div className="grid gap-5 md:grid-cols-4">
            <div className="md:col-span-2">
              <label className="mb-2 block text-lg font-semibold text-black">
                Cari Data
              </label>

              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder={
                  activeTab === "transaksi"
                    ? "Cari nama produk, catatan, harga..."
                    : "Cari nama produk, SKU, stok, harga..."
                }
                className="h-16 w-full rounded-2xl border border-black/20 px-5 text-lg text-black outline-none"
              />
            </div>

            {activeTab === "transaksi" && (
              <>
                <div className="relative">
                  <label className="mb-2 block text-lg font-semibold text-black">
                    Jenis
                  </label>

                  <select
                    value={typeFilter}
                    onChange={(e) => {
                      setTypeFilter(e.target.value);
                      if (e.target.value !== "sale") {
                        setSaleCategoryFilter("semua");
                      }
                    }}
                    className="h-16 w-full appearance-none rounded-2xl border border-black/20 px-5 pr-12 text-lg text-black outline-none"
                  >
                    <option value="semua">Semua Jenis</option>
                    <option value="purchase">Pembelian</option>
                    <option value="sale">Penjualan</option>
                  </select>

                  <SelectArrow />
                </div>

                <div className="relative">
                  <label className="mb-2 block text-lg font-semibold text-black">
                    Unit
                  </label>

                  <select
                    value={unitFilter}
                    onChange={(e) => setUnitFilter(e.target.value)}
                    className="h-16 w-full appearance-none rounded-2xl border border-black/20 px-5 pr-12 text-lg text-black outline-none"
                  >
                    <option value="semua">Semua Unit</option>
                    <option value="karton">Karton</option>
                    <option value="box">Box</option>
                    <option value="piece">Piece</option>
                  </select>

                  <SelectArrow />
                </div>
              </>
            )}
          </div>

          {activeTab === "transaksi" && typeFilter === "sale" && (
            <div className="mt-5 max-w-sm">
              <div className="relative">
                <label className="mb-2 block text-lg font-semibold text-black">
                  Kategori Penjualan
                </label>

                <select
                  value={saleCategoryFilter}
                  onChange={(e) => setSaleCategoryFilter(e.target.value)}
                  className="h-16 w-full appearance-none rounded-2xl border border-black/20 px-5 pr-12 text-lg text-black outline-none"
                >
                  <option value="semua">Semua Kategori</option>
                  <option value="normal">Penjualan Murni</option>
                  <option value="return_damaged">
                    Pengembalian Barang Rusak
                  </option>
                </select>

                <SelectArrow />
              </div>
            </div>
          )}
        </section>

        {activeTab === "transaksi" && selectedIds.length > 0 && (
          <div className="mb-4 flex flex-wrap items-center gap-3 rounded-2xl border border-black bg-white p-4">
            <p className="text-lg font-semibold text-black">
              {selectedIds.length} transaksi dipilih
            </p>

            <button
              type="button"
              onClick={() => setBulkDeleteOpen(true)}
              className="rounded-2xl bg-black px-5 py-3 font-semibold text-white transition-all duration-300 hover:-translate-y-0.5 hover:shadow-lg"
            >
              Hapus Terpilih
            </button>

            <button
              type="button"
              onClick={clearSelected}
              className="rounded-2xl border border-black px-5 py-3 font-semibold text-black transition-all duration-300 hover:bg-black hover:text-white"
            >
              Batal
            </button>
          </div>
        )}

        {activeTab === "transaksi" ? (
          <section className="rounded-3xl border border-black/10 bg-white p-6 shadow-sm">
            <h2 className="mb-5 text-4xl font-bold text-black">
              Riwayat Transaksi
            </h2>

            <div className="hidden overflow-x-auto md:block">
              <table className="w-full min-w-[1050px]">
                <thead>
                  <tr className="bg-[#efe5d1]">
                    {[
                      "Pilih",
                      "Tanggal",
                      "Produk",
                      "Jenis",
                      "Kategori",
                      "Unit",
                      "Jumlah",
                      "Harga",
                      "Aksi",
                    ].map((header) => (
                      <th
                        key={header}
                        className="px-4 py-3 text-left text-lg font-bold text-black"
                      >
                        {header}
                      </th>
                    ))}
                  </tr>
                </thead>

                <tbody>
                  {loadingData ? (
                    <tr>
                      <td
                        colSpan={9}
                        className="px-4 py-6 text-center text-base text-black"
                      >
                        Memuat data...
                      </td>
                    </tr>
                  ) : filteredTransactions.length === 0 ? (
                    <tr>
                      <td
                        colSpan={9}
                        className="px-4 py-6 text-center text-base text-black"
                      >
                        Tidak ada data yang cocok
                      </td>
                    </tr>
                  ) : (
                    filteredTransactions.map((item) => (
                      <tr
                        key={item.id}
                        className="transition-colors duration-300 hover:bg-[#faf7ef]"
                      >
                        <td className="border-b border-black/10 px-4 py-3">
                          <input
                            type="checkbox"
                            checked={selectedIds.includes(item.id)}
                            onChange={() => toggleSelected(item.id)}
                          />
                        </td>

                        <td className="border-b border-black/10 px-4 py-3 text-base text-black">
                          {formatDate(item.created_at)}
                        </td>

                        <td className="border-b border-black/10 px-4 py-3 text-base text-black">
                          {item.products?.name || "-"}
                        </td>

                        <td className="border-b border-black/10 px-4 py-3 text-base text-black">
                          {item.type === "purchase"
                            ? "Pembelian"
                            : "Penjualan"}
                        </td>

                        <td className="border-b border-black/10 px-4 py-3 text-base text-black">
                          {item.type === "sale"
                            ? getSaleCategoryLabel(item.sale_category)
                            : "-"}
                        </td>

                        <td className="border-b border-black/10 px-4 py-3 text-base text-black">
                          {getUnitLabel(item.unit_type)}
                        </td>

                        <td className="border-b border-black/10 px-4 py-3 text-base text-black">
                          {item.quantity}
                        </td>

                        <td className="border-b border-black/10 px-4 py-3 text-base text-black">
                          {formatRupiah(item.price)}
                        </td>

                        <td className="border-b border-black/10 px-4 py-3 text-base text-black">
                          <div className="flex gap-2">
                            <button
                              type="button"
                              onClick={() => openEditModal(item)}
                              className="rounded-xl bg-black px-4 py-2 text-sm font-semibold text-white transition-all duration-300 hover:-translate-y-0.5 hover:shadow-md"
                            >
                              Edit
                            </button>

                            <button
                              type="button"
                              onClick={() => openDeleteModal(item)}
                              className="rounded-xl border border-black bg-white px-4 py-2 text-sm font-semibold text-black transition-all duration-300 hover:bg-black hover:text-white hover:shadow-md"
                            >
                              Hapus
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            <div className="grid gap-4 md:hidden">
              {loadingData ? (
                <p className="rounded-2xl border border-black/10 p-5 text-center text-black">
                  Memuat data...
                </p>
              ) : filteredTransactions.length === 0 ? (
                <p className="rounded-2xl border border-black/10 p-5 text-center text-black">
                  Tidak ada data yang cocok
                </p>
              ) : (
                filteredTransactions.map((item) => (
                  <div
                    key={item.id}
                    className="rounded-3xl border border-black/10 bg-white p-5 shadow-sm"
                  >
                    <div className="mb-4 flex items-start justify-between gap-3">
                      <div>
                        <h3 className="text-2xl font-bold text-black">
                          {item.products?.name || "-"}
                        </h3>
                        <p className="text-sm text-black">
                          {formatDate(item.created_at)}
                        </p>
                      </div>

                      <input
                        type="checkbox"
                        checked={selectedIds.includes(item.id)}
                        onChange={() => toggleSelected(item.id)}
                        className="mt-2"
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-3 text-black">
                      <div className="rounded-2xl bg-[#f7f1e4] p-3">
                        <p className="text-sm font-semibold">Jenis</p>
                        <p className="text-base font-bold">
                          {item.type === "purchase"
                            ? "Pembelian"
                            : "Penjualan"}
                        </p>
                      </div>

                      <div className="rounded-2xl bg-[#f7f1e4] p-3">
                        <p className="text-sm font-semibold">Unit</p>
                        <p className="text-base font-bold">
                          {getUnitLabel(item.unit_type)}
                        </p>
                      </div>

                      <div className="rounded-2xl bg-[#f7f1e4] p-3">
                        <p className="text-sm font-semibold">Jumlah</p>
                        <p className="text-base font-bold">{item.quantity}</p>
                      </div>

                      <div className="rounded-2xl bg-[#f7f1e4] p-3">
                        <p className="text-sm font-semibold">Harga</p>
                        <p className="text-base font-bold">
                          {formatRupiah(item.price)}
                        </p>
                      </div>
                    </div>

                    {item.type === "sale" && (
                      <p className="mt-3 text-black">
                        Kategori: {getSaleCategoryLabel(item.sale_category)}
                      </p>
                    )}

                    {item.note && (
                      <p className="mt-3 text-black">Catatan: {item.note}</p>
                    )}

                    <div className="mt-4 flex gap-2">
                      <button
                        type="button"
                        onClick={() => openEditModal(item)}
                        className="flex-1 rounded-2xl bg-black px-4 py-3 font-semibold text-white"
                      >
                        Edit
                      </button>

                      <button
                        type="button"
                        onClick={() => openDeleteModal(item)}
                        className="flex-1 rounded-2xl border border-black bg-white px-4 py-3 font-semibold text-black"
                      >
                        Hapus
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </section>
        ) : (
          <section className="rounded-3xl border border-black/10 bg-white p-6 shadow-sm">
            <h2 className="mb-5 text-4xl font-bold text-black">
              Riwayat Produk
            </h2>

            <div className="hidden overflow-x-auto md:block">
              <table className="w-full min-w-[950px]">
                <thead>
                  <tr className="bg-[#efe5d1]">
                    {[
                      "Nama Produk",
                      "SKU",
                      "Karton",
                      "Box",
                      "Piece",
                      "Harga Beli",
                      "Harga Jual",
                    ].map((header) => (
                      <th
                        key={header}
                        className="px-4 py-3 text-left text-lg font-bold text-black"
                      >
                        {header}
                      </th>
                    ))}
                  </tr>
                </thead>

                <tbody>
                  {loadingData ? (
                    <tr>
                      <td
                        colSpan={7}
                        className="px-4 py-6 text-center text-base text-black"
                      >
                        Memuat data...
                      </td>
                    </tr>
                  ) : filteredProducts.length === 0 ? (
                    <tr>
                      <td
                        colSpan={7}
                        className="px-4 py-6 text-center text-base text-black"
                      >
                        Tidak ada data yang cocok
                      </td>
                    </tr>
                  ) : (
                    filteredProducts.map((product) => (
                      <tr
                        key={product.id}
                        className="transition-colors duration-300 hover:bg-[#faf7ef]"
                      >
                        <td className="border-b border-black/10 px-4 py-3 text-base text-black">
                          {product.name}
                        </td>
                        <td className="border-b border-black/10 px-4 py-3 text-base text-black">
                          {product.sku || "-"}
                        </td>
                        <td className="border-b border-black/10 px-4 py-3 text-base text-black">
                          {product.stock_karton ?? 0}
                        </td>
                        <td className="border-b border-black/10 px-4 py-3 text-base text-black">
                          {product.stock_box ?? 0}
                        </td>
                        <td className="border-b border-black/10 px-4 py-3 text-base text-black">
                          {product.stock_piece ?? 0}
                        </td>
                        <td className="border-b border-black/10 px-4 py-3 text-base text-black">
                          {formatRupiah(product.buy_price)}
                        </td>
                        <td className="border-b border-black/10 px-4 py-3 text-base text-black">
                          {formatRupiah(product.sell_price)}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            <div className="grid gap-4 md:hidden">
              {loadingData ? (
                <p className="rounded-2xl border border-black/10 p-5 text-center text-black">
                  Memuat data...
                </p>
              ) : filteredProducts.length === 0 ? (
                <p className="rounded-2xl border border-black/10 p-5 text-center text-black">
                  Tidak ada data yang cocok
                </p>
              ) : (
                filteredProducts.map((product) => (
                  <div
                    key={product.id}
                    className="rounded-3xl border border-black/10 bg-white p-5 shadow-sm"
                  >
                    <div className="mb-4">
                      <h3 className="text-2xl font-bold text-black">
                        {product.name}
                      </h3>
                      <p className="text-base text-black">
                        SKU: {product.sku || "-"}
                      </p>
                    </div>

                    <div className="grid grid-cols-3 gap-3 text-black">
                      <div className="rounded-2xl bg-[#f7f1e4] p-3">
                        <p className="text-sm font-semibold">Karton</p>
                        <p className="text-xl font-bold">
                          {product.stock_karton ?? 0}
                        </p>
                      </div>

                      <div className="rounded-2xl bg-[#f7f1e4] p-3">
                        <p className="text-sm font-semibold">Box</p>
                        <p className="text-xl font-bold">
                          {product.stock_box ?? 0}
                        </p>
                      </div>

                      <div className="rounded-2xl bg-[#f7f1e4] p-3">
                        <p className="text-sm font-semibold">Piece</p>
                        <p className="text-xl font-bold">
                          {product.stock_piece ?? 0}
                        </p>
                      </div>
                    </div>

                    <div className="mt-4 grid gap-2 text-black">
                      <p>Harga Beli: {formatRupiah(product.buy_price)}</p>
                      <p>Harga Jual: {formatRupiah(product.sell_price)}</p>
                    </div>
                  </div>
                ))
              )}
            </div>
          </section>
        )}
      </AppShell>

      {editModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
          <div className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-3xl bg-white p-6 shadow-2xl">
            <div className="mb-5 flex items-center justify-between">
              <h3 className="text-3xl font-bold text-black">
                Edit Transaksi
              </h3>

              <button
                type="button"
                onClick={closeEditModal}
                className="rounded-xl border border-black px-4 py-2 text-sm font-semibold text-black transition-all duration-300 hover:bg-black hover:text-white"
              >
                Tutup
              </button>
            </div>

            <form
              onSubmit={handleSaveEdit}
              className="grid gap-4 md:grid-cols-2"
            >
              <div className="relative">
                <label className="mb-2 block text-base font-semibold text-black">
                  Jenis Transaksi
                </label>
                <select
                  name="type"
                  value={editForm.type}
                  onChange={handleEditChange}
                  className="h-14 w-full appearance-none rounded-2xl border border-black/20 px-4 pr-12 text-lg text-black outline-none"
                >
                  <option value="purchase">Pembelian</option>
                  <option value="sale">Penjualan</option>
                </select>
                <SelectArrow small />
              </div>

              <div className="relative">
                <label className="mb-2 block text-base font-semibold text-black">
                  Unit
                </label>
                <select
                  name="unit_type"
                  value={editForm.unit_type}
                  onChange={handleEditChange}
                  className="h-14 w-full appearance-none rounded-2xl border border-black/20 px-4 pr-12 text-lg text-black outline-none"
                >
                  <option value="karton">Karton</option>
                  <option value="box">Box</option>
                  <option value="piece">Piece</option>
                </select>
                <SelectArrow small />
              </div>

              {editForm.type === "sale" && (
                <div className="relative md:col-span-2">
                  <label className="mb-2 block text-base font-semibold text-black">
                    Kategori Penjualan
                  </label>
                  <select
                    name="sale_category"
                    value={editForm.sale_category}
                    onChange={handleEditChange}
                    className="h-14 w-full appearance-none rounded-2xl border border-black/20 px-4 pr-12 text-lg text-black outline-none"
                  >
                    <option value="normal">Penjualan Murni</option>
                    <option value="return_damaged">
                      Pengembalian Barang Rusak
                    </option>
                  </select>
                  <SelectArrow small />
                </div>
              )}

              <div>
                <label className="mb-2 block text-base font-semibold text-black">
                  Jumlah
                </label>
                <input
                  type="number"
                  name="quantity"
                  value={editForm.quantity}
                  onChange={handleEditChange}
                  placeholder="Jumlah"
                  className="h-14 w-full rounded-2xl border border-black/20 px-4 text-lg text-black outline-none"
                  required
                />
              </div>

              <div>
                <label className="mb-2 block text-base font-semibold text-black">
                  Harga
                </label>
                <input
                  type="text"
                  name="price"
                  value={editForm.price}
                  onChange={handleEditChange}
                  placeholder="Harga"
                  className="h-14 w-full rounded-2xl border border-black/20 px-4 text-lg text-black outline-none"
                />
              </div>

              <div className="md:col-span-2">
                <label className="mb-2 block text-base font-semibold text-black">
                  Catatan
                </label>
                <textarea
                  name="note"
                  value={editForm.note}
                  onChange={handleEditChange}
                  placeholder="Catatan"
                  rows={4}
                  className="w-full rounded-2xl border border-black/20 px-4 py-4 text-lg text-black outline-none"
                />
              </div>

              <div className="flex gap-3 md:col-span-2">
                <button
                  type="submit"
                  className="rounded-2xl bg-black px-5 py-3 text-lg font-semibold text-white transition-all duration-300 hover:-translate-y-0.5 hover:shadow-lg"
                >
                  Simpan Perubahan
                </button>

                <button
                  type="button"
                  onClick={closeEditModal}
                  className="rounded-2xl border border-black bg-white px-5 py-3 text-lg font-semibold text-black transition-all duration-300 hover:bg-black hover:text-white"
                >
                  Batal
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <PopupModal
        open={deleteModalOpen}
        title="Hapus Transaksi"
        message="Transaksi ini akan dihapus."
        confirmText="Hapus"
        cancelText="Batal"
        onConfirm={confirmDeleteTransaction}
        onCancel={closeDeleteModal}
        variant="danger"
      />

      <PopupModal
        open={bulkDeleteOpen}
        title="Hapus Transaksi Terpilih"
        message={`${selectedIds.length} transaksi akan dihapus.`}
        confirmText="Hapus Semua"
        cancelText="Batal"
        onConfirm={confirmBulkDelete}
        onCancel={() => setBulkDeleteOpen(false)}
        variant="danger"
      />
    </>
  );
}