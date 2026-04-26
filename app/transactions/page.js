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
import toast from "react-hot-toast";

const TRANSACTION_DRAFT_KEY = "stockapp_transaction_draft";

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

function SelectArrow() {
  return (
    <FiChevronDown
      size={22}
      className="pointer-events-none absolute right-5 top-[54px] text-black"
    />
  );
}

function FieldError({ message }) {
  if (!message) return null;
  return <p className="mt-2 text-sm font-semibold text-red-600">{message}</p>;
}

export default function TransactionsPage() {
  const [products, setProducts] = useState([]);
  const [transactions, setTransactions] = useState([]);
  const [selectedIds, setSelectedIds] = useState([]);

  const [productSearch, setProductSearch] = useState("");
  const [showProductDropdown, setShowProductDropdown] = useState(false);
  const [draftLoaded, setDraftLoaded] = useState(false);

  const emptyForm = {
    product_id: "",
    type: "purchase",
    sale_category: "",
    unit_type: "piece",
    quantity: "",
    price: "",
    note: "",
  };

  const [form, setForm] = useState(emptyForm);
  const [editForm, setEditForm] = useState(emptyForm);

  const [errors, setErrors] = useState({});
  const [editErrors, setEditErrors] = useState({});

  const [editModalOpen, setEditModalOpen] = useState(false);
  const [selectedTransaction, setSelectedTransaction] = useState(null);

  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [transactionToDelete, setTransactionToDelete] = useState(null);
  const [bulkDeleteOpen, setBulkDeleteOpen] = useState(false);

  const [loading, setLoading] = useState(false);
  const [loadingData, setLoadingData] = useState(true);

  useEffect(() => {
    const savedDraft = localStorage.getItem(TRANSACTION_DRAFT_KEY);

    if (savedDraft) {
      try {
        const draft = JSON.parse(savedDraft);
        setForm(draft.form || emptyForm);
        setProductSearch(draft.productSearch || "");
      } catch {
        localStorage.removeItem(TRANSACTION_DRAFT_KEY);
      }
    }

    setDraftLoaded(true);
    fetchAllData();
  }, []);

  useEffect(() => {
    if (!draftLoaded) return;

    const hasDraft =
      Object.values(form).some((value) => value !== "") || productSearch !== "";

    if (hasDraft) {
      localStorage.setItem(
        TRANSACTION_DRAFT_KEY,
        JSON.stringify({
          form,
          productSearch,
        })
      );
    } else {
      localStorage.removeItem(TRANSACTION_DRAFT_KEY);
    }
  }, [form, productSearch, draftLoaded]);

  const filteredProducts = useMemo(() => {
    return products.filter((product) =>
      product.name.toLowerCase().includes(productSearch.toLowerCase())
    );
  }, [products, productSearch]);

  function clearSelected() {
    setSelectedIds([]);
  }

  async function fetchAllData() {
    setLoadingData(true);
    await Promise.all([fetchProducts(), fetchTransactions()]);
    setLoadingData(false);
  }

  async function fetchProducts() {
    const { data, error } = await supabase
      .from("products")
      .select("id, name, stock_karton, stock_box, stock_piece")
      .order("name", { ascending: true })
      .limit(200);

    if (error) {
      toast.error("Gagal memuat produk.");
      return;
    }

    setProducts(data || []);
  }

  async function fetchTransactions() {
    const { data, error } = await supabase
      .from("transactions")
      .select(
        "id, type, sale_category, unit_type, quantity, price, note, created_at, products(id, name, stock_karton, stock_box, stock_piece)"
      )
      .order("created_at", { ascending: false })
      .limit(100);

    if (error) {
      toast.error("Gagal memuat transaksi.");
      return;
    }

    setTransactions(data || []);
  }

  function validateTransaction(data, isEdit = false) {
    const nextErrors = {};

    if (!isEdit && !data.product_id) {
      nextErrors.product_id = "Produk wajib dipilih.";
    }

    if (!data.quantity || Number(data.quantity) <= 0) {
      nextErrors.quantity = "Jumlah harus lebih dari 0.";
    }

    if (parseFormattedNumber(data.price) < 0) {
      nextErrors.price = "Harga tidak boleh minus.";
    }

    if (data.type === "sale" && !data.sale_category) {
      nextErrors.sale_category = "Kategori penjualan wajib dipilih.";
    }

    return nextErrors;
  }

  function clearError(name, setter) {
    setter((prev) => ({ ...prev, [name]: "" }));
  }

  function handleChange(e) {
    const { name, value } = e.target;

    if (name === "price") {
      setForm((prev) => ({ ...prev, price: formatNumberInput(value) }));
      clearError(name, setErrors);
      return;
    }

    if (name === "type") {
      setForm((prev) => ({
        ...prev,
        type: value,
        sale_category: value === "sale" ? "normal" : "",
      }));
      setErrors((prev) => ({ ...prev, type: "", sale_category: "" }));
      return;
    }

    setForm((prev) => ({ ...prev, [name]: value }));
    clearError(name, setErrors);
  }

  function handleEditChange(e) {
    const { name, value } = e.target;

    if (name === "price") {
      setEditForm((prev) => ({ ...prev, price: formatNumberInput(value) }));
      clearError(name, setEditErrors);
      return;
    }

    if (name === "type") {
      setEditForm((prev) => ({
        ...prev,
        type: value,
        sale_category: value === "sale" ? prev.sale_category || "normal" : "",
      }));
      setEditErrors((prev) => ({ ...prev, type: "", sale_category: "" }));
      return;
    }

    setEditForm((prev) => ({ ...prev, [name]: value }));
    clearError(name, setEditErrors);
  }

  function toggleSelected(id) {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
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
      return { error: "Stok tidak cukup untuk transaksi ini." };
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

  async function handleSubmit(e) {
    e.preventDefault();

    const nextErrors = validateTransaction(form, false);
    setErrors(nextErrors);

    if (Object.keys(nextErrors).length > 0) {
      toast.error("Cek lagi data transaksi.");
      return;
    }

    const selectedProduct = products.find(
      (item) => item.id === Number(form.product_id)
    );

    if (!selectedProduct) {
      toast.error("Produk tidak ditemukan.");
      return;
    }

    const newTransaction = {
      type: form.type,
      sale_category:
        form.type === "sale" ? form.sale_category || "normal" : null,
      unit_type: form.unit_type,
      quantity: Number(form.quantity),
    };

    setLoading(true);

    const stockResult = await updateStock(selectedProduct, null, newTransaction);

    if (stockResult.error) {
      setLoading(false);
      toast.error(stockResult.error);
      return;
    }

    const { error } = await supabase.from("transactions").insert([
      {
        product_id: Number(form.product_id),
        type: newTransaction.type,
        sale_category: newTransaction.sale_category,
        unit_type: newTransaction.unit_type,
        quantity: newTransaction.quantity,
        price: parseFormattedNumber(form.price),
        note: form.note.trim() || null,
      },
    ]);

    setLoading(false);

    if (error) {
      toast.error("Gagal menyimpan transaksi.");
      return;
    }

    toast.success("Transaksi berhasil disimpan.");
    localStorage.removeItem(TRANSACTION_DRAFT_KEY);
    setForm(emptyForm);
    setErrors({});
    setProductSearch("");
    setShowProductDropdown(false);
    clearSelected();
    fetchAllData();
  }

  function openEditModal(item) {
    setSelectedTransaction(item);
    setEditForm({
      product_id: "",
      type: item.type,
      sale_category:
        item.sale_category || (item.type === "sale" ? "normal" : ""),
      unit_type: item.unit_type || "piece",
      quantity: String(item.quantity || ""),
      price: formatNumberInput(item.price),
      note: item.note || "",
    });
    setEditErrors({});
    setEditModalOpen(true);
  }

  function closeEditModal() {
    setSelectedTransaction(null);
    setEditModalOpen(false);
    setEditForm(emptyForm);
    setEditErrors({});
  }

  async function handleSaveEdit(e) {
    e.preventDefault();

    if (!selectedTransaction) return;

    const nextErrors = validateTransaction(editForm, true);
    setEditErrors(nextErrors);

    if (Object.keys(nextErrors).length > 0) {
      toast.error("Cek lagi data transaksi.");
      return;
    }

    const product = selectedTransaction.products;

    if (!product) {
      toast.error("Produk tidak ditemukan.");
      return;
    }

    const newTransaction = {
      type: editForm.type,
      sale_category:
        editForm.type === "sale" ? editForm.sale_category || "normal" : null,
      unit_type: editForm.unit_type,
      quantity: Number(editForm.quantity),
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

  function openDeleteModal(item) {
    setTransactionToDelete(item);
    setDeleteModalOpen(true);
  }

  function closeDeleteModal() {
    setTransactionToDelete(null);
    setDeleteModalOpen(false);
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

  function TransactionForm({
    data,
    onChange,
    formErrors,
    onSubmit,
    submitText,
    isEdit = false,
  }) {
    return (
      <form onSubmit={onSubmit} className="grid gap-5">
        {!isEdit && (
          <div className="relative">
            <label className="mb-2 block text-lg font-semibold text-black">
              Produk
            </label>

            <input
              type="text"
              value={productSearch}
              onChange={(e) => {
                setProductSearch(e.target.value);
                setShowProductDropdown(true);
                setForm((prev) => ({ ...prev, product_id: "" }));
                setErrors((prev) => ({ ...prev, product_id: "" }));
              }}
              onFocus={() => setShowProductDropdown(true)}
              placeholder="Cari produk..."
              className="h-16 w-full rounded-2xl border border-black/20 px-5 text-lg text-black outline-none"
            />

            {showProductDropdown && (
              <div className="absolute z-40 mt-2 max-h-64 w-full overflow-y-auto rounded-2xl border border-black/10 bg-white shadow-xl">
                {filteredProducts.length === 0 ? (
                  <div className="px-5 py-4 text-lg text-black">
                    Produk tidak ditemukan
                  </div>
                ) : (
                  filteredProducts.map((product) => (
                    <button
                      key={product.id}
                      type="button"
                      onClick={() => {
                        setForm((prev) => ({
                          ...prev,
                          product_id: String(product.id),
                        }));
                        setProductSearch(product.name);
                        setShowProductDropdown(false);
                        setErrors((prev) => ({ ...prev, product_id: "" }));
                      }}
                      className="block w-full px-5 py-4 text-left text-lg text-black transition-colors duration-200 hover:bg-[#f7f1e4]"
                    >
                      {product.name}
                    </button>
                  ))
                )}
              </div>
            )}

            <FieldError message={formErrors.product_id} />
          </div>
        )}

        <div className="grid gap-5 md:grid-cols-2">
          <div className="relative">
            <label className="mb-2 block text-lg font-semibold text-black">
              Jenis Transaksi
            </label>
            <select
              name="type"
              value={data.type}
              onChange={onChange}
              className="h-16 w-full appearance-none rounded-2xl border border-black/20 px-5 pr-12 text-lg text-black outline-none"
            >
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
              name="unit_type"
              value={data.unit_type}
              onChange={onChange}
              className="h-16 w-full appearance-none rounded-2xl border border-black/20 px-5 pr-12 text-lg text-black outline-none"
            >
              <option value="karton">Karton</option>
              <option value="box">Box</option>
              <option value="piece">Piece</option>
            </select>
            <SelectArrow />
          </div>
        </div>

        {data.type === "sale" && (
          <div className="relative">
            <label className="mb-2 block text-lg font-semibold text-black">
              Kategori Penjualan
            </label>
            <select
              name="sale_category"
              value={data.sale_category}
              onChange={onChange}
              className="h-16 w-full appearance-none rounded-2xl border border-black/20 px-5 pr-12 text-lg text-black outline-none"
            >
              <option value="normal">Penjualan Murni</option>
              <option value="return_damaged">Pengembalian Barang Rusak</option>
            </select>
            <SelectArrow />
            <FieldError message={formErrors.sale_category} />
          </div>
        )}

        <div className="grid gap-5 md:grid-cols-2">
          <div>
            <label className="mb-2 block text-lg font-semibold text-black">
              Jumlah
            </label>
            <input
              type="number"
              name="quantity"
              value={data.quantity}
              onChange={onChange}
              placeholder="Contoh: 10"
              className="h-16 w-full rounded-2xl border border-black/20 px-5 text-lg text-black outline-none"
              required
            />
            <FieldError message={formErrors.quantity} />
          </div>

          <div>
            <label className="mb-2 block text-lg font-semibold text-black">
              Harga
            </label>
            <input
              type="text"
              name="price"
              value={data.price}
              onChange={onChange}
              placeholder="Contoh: 200.000"
              className="h-16 w-full rounded-2xl border border-black/20 px-5 text-lg text-black outline-none"
            />
            <FieldError message={formErrors.price} />
          </div>
        </div>

        <div>
          <label className="mb-2 block text-lg font-semibold text-black">
            Catatan
          </label>
          <textarea
            name="note"
            value={data.note}
            onChange={onChange}
            placeholder="Catatan opsional"
            rows={5}
            className="w-full rounded-2xl border border-black/20 px-5 py-4 text-lg text-black outline-none"
          />
        </div>

        <button
          type="submit"
          disabled={loading}
          className="h-16 rounded-2xl bg-black px-6 text-xl font-semibold text-white transition-all duration-300 hover:-translate-y-0.5 hover:shadow-lg disabled:opacity-60"
        >
          {loading ? "Menyimpan..." : submitText}
        </button>
      </form>
    );
  }

  return (
    <>
      <AppShell
        title="Transaksi"
        subtitle="Catat pembelian dan penjualan berdasarkan karton, box, atau piece."
      >
        <div className="grid gap-6">
          <section className="rounded-3xl border border-black/10 bg-white p-8 shadow-sm">
            <h2 className="mb-2 text-4xl font-bold text-black">
              Tambah Transaksi
            </h2>

            <p className="mb-8 text-lg text-black">
              Isi data transaksi dengan cepat dan rapi.
            </p>

            <TransactionForm
              data={form}
              onChange={handleChange}
              formErrors={errors}
              onSubmit={handleSubmit}
              submitText="Simpan Transaksi"
            />
          </section>

          {selectedIds.length > 0 && (
            <div className="flex flex-wrap items-center gap-3 rounded-2xl border border-black bg-white p-4">
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

          <section className="rounded-3xl border border-black/10 bg-white p-6 shadow-sm">
            <h2 className="mb-5 text-4xl font-bold text-black">
              Transaksi Terbaru
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
                  ) : transactions.length === 0 ? (
                    <tr>
                      <td
                        colSpan={9}
                        className="px-4 py-6 text-center text-base text-black"
                      >
                        Belum ada transaksi
                      </td>
                    </tr>
                  ) : (
                    transactions.map((item) => (
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
                              className="rounded-xl bg-black px-4 py-2 text-sm font-semibold text-white"
                            >
                              Edit
                            </button>
                            <button
                              type="button"
                              onClick={() => openDeleteModal(item)}
                              className="rounded-xl border border-black bg-white px-4 py-2 text-sm font-semibold text-black transition-all duration-300 hover:bg-black hover:text-white"
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
          </section>
        </div>
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

            <TransactionForm
              data={editForm}
              onChange={handleEditChange}
              formErrors={editErrors}
              onSubmit={handleSaveEdit}
              submitText="Simpan Perubahan"
              isEdit
            />
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