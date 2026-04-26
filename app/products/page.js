"use client";

import { useEffect, useRef, useState } from "react";
import * as XLSX from "xlsx";
import AppShell from "@/components/AppShell";
import SummaryCard from "@/components/SummaryCard";
import PopupModal from "@/components/PopupModal";
import { supabase } from "@/lib/supabase";
import {
  formatRupiah,
  formatNumberInput,
  parseFormattedNumber,
} from "@/lib/format";
import toast from "react-hot-toast";

const PRODUCT_DRAFT_KEY = "stockapp_product_draft";

export default function ProductsPage() {
  const fileInputRef = useRef(null);

  const [products, setProducts] = useState([]);
  const [summary, setSummary] = useState({
    totalProduk: 0,
    totalKarton: 0,
    totalBox: 0,
    totalPiece: 0,
  });

  const emptyForm = {
    name: "",
    sku: "",
    stock_karton: "",
    stock_box: "",
    stock_piece: "",
    buy_price: "",
    sell_price: "",
  };

  const [productForm, setProductForm] = useState(emptyForm);
  const [editForm, setEditForm] = useState(emptyForm);
  const [selectedProduct, setSelectedProduct] = useState(null);

  const [errors, setErrors] = useState({});
  const [editErrors, setEditErrors] = useState({});

  const [editModalOpen, setEditModalOpen] = useState(false);
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [productToDelete, setProductToDelete] = useState(null);

  const [loading, setLoading] = useState(false);
  const [importing, setImporting] = useState(false);

  useEffect(() => {
    const savedDraft = localStorage.getItem(PRODUCT_DRAFT_KEY);

    if (savedDraft) {
      try {
        setProductForm(JSON.parse(savedDraft));
      } catch {
        localStorage.removeItem(PRODUCT_DRAFT_KEY);
      }
    }

    fetchProducts();
  }, []);

  useEffect(() => {
    const hasDraft = Object.values(productForm).some((value) => value !== "");

    if (hasDraft) {
      localStorage.setItem(PRODUCT_DRAFT_KEY, JSON.stringify(productForm));
    } else {
      localStorage.removeItem(PRODUCT_DRAFT_KEY);
    }
  }, [productForm]);

  async function fetchProducts() {
    const { data, error } = await supabase
      .from("products")
      .select(
        "id, name, sku, stock_karton, stock_box, stock_piece, buy_price, sell_price, created_at"
      )
      .order("name", { ascending: true })
      .limit(200);

    if (error) {
      toast.error("Gagal memuat produk.");
      return;
    }

    const list = data || [];

    setProducts(list);
    setSummary({
      totalProduk: list.length,
      totalKarton: list.reduce(
        (sum, item) => sum + Number(item.stock_karton || 0),
        0
      ),
      totalBox: list.reduce(
        (sum, item) => sum + Number(item.stock_box || 0),
        0
      ),
      totalPiece: list.reduce(
        (sum, item) => sum + Number(item.stock_piece || 0),
        0
      ),
    });
  }

  function validateProduct(form) {
    const nextErrors = {};

    if (!form.name.trim()) {
      nextErrors.name = "Nama produk wajib diisi.";
    }

    if (Number(form.stock_karton || 0) < 0) {
      nextErrors.stock_karton = "Stok karton tidak boleh minus.";
    }

    if (Number(form.stock_box || 0) < 0) {
      nextErrors.stock_box = "Stok box tidak boleh minus.";
    }

    if (Number(form.stock_piece || 0) < 0) {
      nextErrors.stock_piece = "Stok piece tidak boleh minus.";
    }

    if (parseFormattedNumber(form.buy_price) < 0) {
      nextErrors.buy_price = "Harga beli tidak boleh minus.";
    }

    if (parseFormattedNumber(form.sell_price) < 0) {
      nextErrors.sell_price = "Harga jual tidak boleh minus.";
    }

    return nextErrors;
  }

  function handleFormChange(setter, errorSetter) {
    return function (e) {
      const { name, value } = e.target;

      if (name === "buy_price" || name === "sell_price") {
        setter((prev) => ({ ...prev, [name]: formatNumberInput(value) }));
      } else {
        setter((prev) => ({ ...prev, [name]: value }));
      }

      errorSetter((prev) => ({ ...prev, [name]: "" }));
    };
  }

  function buildPayload(form) {
    return {
      name: form.name.trim(),
      sku: form.sku.trim() || null,
      stock_karton: Number(form.stock_karton) || 0,
      stock_box: Number(form.stock_box) || 0,
      stock_piece: Number(form.stock_piece) || 0,
      buy_price: parseFormattedNumber(form.buy_price),
      sell_price: parseFormattedNumber(form.sell_price),
    };
  }

  async function handleAddProduct(e) {
    e.preventDefault();

    const nextErrors = validateProduct(productForm);
    setErrors(nextErrors);

    if (Object.keys(nextErrors).length > 0) {
      toast.error("Cek lagi data produk.");
      return;
    }

    setLoading(true);

    const { error } = await supabase
      .from("products")
      .insert([buildPayload(productForm)]);

    setLoading(false);

    if (error) {
      if (error.message?.includes("products_user_id_sku_key")) {
        toast.error("SKU sudah digunakan.");
      } else {
        toast.error("Gagal menambah produk.");
      }
      return;
    }

    toast.success("Produk berhasil ditambahkan.");
    localStorage.removeItem(PRODUCT_DRAFT_KEY);
    setProductForm(emptyForm);
    setErrors({});
    fetchProducts();
  }

  function openEditModal(product) {
    setSelectedProduct(product);
    setEditForm({
      name: product.name || "",
      sku: product.sku || "",
      stock_karton: String(product.stock_karton ?? 0),
      stock_box: String(product.stock_box ?? 0),
      stock_piece: String(product.stock_piece ?? 0),
      buy_price: formatNumberInput(product.buy_price),
      sell_price: formatNumberInput(product.sell_price),
    });
    setEditErrors({});
    setEditModalOpen(true);
  }

  function closeEditModal() {
    setSelectedProduct(null);
    setEditModalOpen(false);
    setEditForm(emptyForm);
    setEditErrors({});
  }

  async function handleSaveEdit(e) {
    e.preventDefault();

    if (!selectedProduct) return;

    const nextErrors = validateProduct(editForm);
    setEditErrors(nextErrors);

    if (Object.keys(nextErrors).length > 0) {
      toast.error("Cek lagi data produk.");
      return;
    }

    const { error } = await supabase
      .from("products")
      .update(buildPayload(editForm))
      .eq("id", selectedProduct.id);

    if (error) {
      if (error.message?.includes("products_user_id_sku_key")) {
        toast.error("SKU sudah digunakan.");
      } else {
        toast.error("Gagal memperbarui produk.");
      }
      return;
    }

    toast.success("Produk berhasil diperbarui.");
    closeEditModal();
    fetchProducts();
  }

  function openDeleteModal(product) {
    setProductToDelete(product);
    setDeleteModalOpen(true);
  }

  function closeDeleteModal() {
    setProductToDelete(null);
    setDeleteModalOpen(false);
  }

  async function confirmDeleteProduct() {
    if (!productToDelete) return;

    const { error } = await supabase
      .from("products")
      .delete()
      .eq("id", productToDelete.id);

    if (error) {
      toast.error("Gagal menghapus produk.");
      return;
    }

    toast.success("Produk berhasil dihapus.");
    closeDeleteModal();
    fetchProducts();
  }

  function normalizeImportRow(row) {
    const name =
      row.name ||
      row.nama_produk ||
      row.nama ||
      row["Nama Produk"] ||
      row["nama produk"] ||
      "";

    const sku = row.sku || row.SKU || row.kode || row["Kode SKU"] || "";

    return {
      name: String(name).trim(),
      sku: String(sku || "").trim() || null,
      stock_karton: Number(row.stock_karton || row.karton || row.Karton || 0),
      stock_box: Number(row.stock_box || row.box || row.Box || 0),
      stock_piece: Number(row.stock_piece || row.piece || row.Piece || 0),
      buy_price: Number(
        String(row.buy_price || row.harga_beli || row["Harga Beli"] || 0)
          .replace(/\./g, "")
          .replace(/,/g, "")
      ),
      sell_price: Number(
        String(row.sell_price || row.harga_jual || row["Harga Jual"] || 0)
          .replace(/\./g, "")
          .replace(/,/g, "")
      ),
    };
  }

  function handleDownloadTemplate() {
  const templateData = [
    {
      name: "Contoh Produk A",
      sku: "SKU-001",
      karton: 10,
      box: 5,
      piece: 20,
      harga_beli: 100000,
      harga_jual: 120000,
    },
    {
      name: "Contoh Produk B",
      sku: "SKU-002",
      karton: 3,
      box: 8,
      piece: 15,
      harga_beli: 50000,
      harga_jual: 75000,
    },
  ];

  const worksheet = XLSX.utils.json_to_sheet(templateData);
  const workbook = XLSX.utils.book_new();

  XLSX.utils.book_append_sheet(workbook, worksheet, "Template Produk");
  XLSX.writeFile(workbook, "template-import-produk.xlsx");
}

  async function handleImportFile(e) {
    const file = e.target.files?.[0];
    if (!file) return;

    setImporting(true);

    try {
      const buffer = await file.arrayBuffer();
      const workbook = XLSX.read(buffer, { type: "array" });
      const sheetName = workbook.SheetNames[0];
      const sheet = workbook.Sheets[sheetName];
      const rows = XLSX.utils.sheet_to_json(sheet);

      const cleanedRows = rows
        .map(normalizeImportRow)
        .filter((row) => row.name);

      if (cleanedRows.length === 0) {
        toast.error("File tidak punya data produk valid.");
        return;
      }

      const invalidRow = cleanedRows.find(
        (row) =>
          row.stock_karton < 0 ||
          row.stock_box < 0 ||
          row.stock_piece < 0 ||
          row.buy_price < 0 ||
          row.sell_price < 0
      );

      if (invalidRow) {
        toast.error("Ada angka minus di file.");
        return;
      }

      const { error } = await supabase.from("products").insert(cleanedRows);

      if (error) {
        if (error.message?.includes("products_user_id_sku_key")) {
          toast.error("Ada SKU yang sudah digunakan.");
        } else {
          toast.error("Gagal import produk.");
        }
        return;
      }

      toast.success(`${cleanedRows.length} produk berhasil diimport.`);
      fetchProducts();
    } catch {
      toast.error("Format file tidak terbaca.");
    } finally {
      setImporting(false);
      e.target.value = "";
    }
  }

  function FieldError({ message }) {
    if (!message) return null;
    return <p className="mt-2 text-sm font-semibold text-red-600">{message}</p>;
  }

  function ProductForm({
    form,
    setForm,
    formErrors,
    setFormErrors,
    onSubmit,
    submitText,
  }) {
    return (
      <form onSubmit={onSubmit} className="grid gap-5">
        <div className="grid gap-5 md:grid-cols-2">
          <div>
            <label className="mb-2 block text-lg font-semibold text-black">
              Nama Produk
            </label>
            <input
              type="text"
              name="name"
              value={form.name}
              onChange={handleFormChange(setForm, setFormErrors)}
              placeholder="Contoh: Laptop Dell"
              className="h-16 w-full rounded-2xl border border-black/20 px-5 text-lg text-black outline-none"
              required
            />
            <FieldError message={formErrors.name} />
          </div>

          <div>
            <label className="mb-2 block text-lg font-semibold text-black">
              SKU
            </label>
            <input
              type="text"
              name="sku"
              value={form.sku}
              onChange={handleFormChange(setForm, setFormErrors)}
              placeholder="Contoh: DL-1234"
              className="h-16 w-full rounded-2xl border border-black/20 px-5 text-lg text-black outline-none"
            />
          </div>
        </div>

        <div className="grid gap-5 md:grid-cols-3">
          <div>
            <label className="mb-2 block text-lg font-semibold text-black">
              Stok Karton
            </label>
            <input
              type="number"
              name="stock_karton"
              value={form.stock_karton}
              onChange={handleFormChange(setForm, setFormErrors)}
              placeholder="0"
              className="h-16 w-full rounded-2xl border border-black/20 px-5 text-lg text-black outline-none"
            />
            <FieldError message={formErrors.stock_karton} />
          </div>

          <div>
            <label className="mb-2 block text-lg font-semibold text-black">
              Stok Box
            </label>
            <input
              type="number"
              name="stock_box"
              value={form.stock_box}
              onChange={handleFormChange(setForm, setFormErrors)}
              placeholder="0"
              className="h-16 w-full rounded-2xl border border-black/20 px-5 text-lg text-black outline-none"
            />
            <FieldError message={formErrors.stock_box} />
          </div>

          <div>
            <label className="mb-2 block text-lg font-semibold text-black">
              Stok Piece
            </label>
            <input
              type="number"
              name="stock_piece"
              value={form.stock_piece}
              onChange={handleFormChange(setForm, setFormErrors)}
              placeholder="0"
              className="h-16 w-full rounded-2xl border border-black/20 px-5 text-lg text-black outline-none"
            />
            <FieldError message={formErrors.stock_piece} />
          </div>
        </div>

        <div className="grid gap-5 md:grid-cols-2">
          <div>
            <label className="mb-2 block text-lg font-semibold text-black">
              Harga Beli
            </label>
            <input
              type="text"
              name="buy_price"
              value={form.buy_price}
              onChange={handleFormChange(setForm, setFormErrors)}
              placeholder="Contoh: 200.000"
              className="h-16 w-full rounded-2xl border border-black/20 px-5 text-lg text-black outline-none"
            />
            <FieldError message={formErrors.buy_price} />
          </div>

          <div>
            <label className="mb-2 block text-lg font-semibold text-black">
              Harga Jual
            </label>
            <input
              type="text"
              name="sell_price"
              value={form.sell_price}
              onChange={handleFormChange(setForm, setFormErrors)}
              placeholder="Contoh: 250.000"
              className="h-16 w-full rounded-2xl border border-black/20 px-5 text-lg text-black outline-none"
            />
            <FieldError message={formErrors.sell_price} />
          </div>
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
        title="Manajemen Produk"
        subtitle="Kelola data produk dan stok dengan rapi."
        rightContent={
          <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
            <SummaryCard title="Total Produk" value={summary.totalProduk} />
            <SummaryCard title="Total Karton" value={summary.totalKarton} />
            <SummaryCard title="Total Box" value={summary.totalBox} />
            <SummaryCard title="Total Piece" value={summary.totalPiece} />
          </div>
        }
      >
        <div className="grid gap-6">
          <section className="rounded-3xl border border-black/10 bg-white p-8 shadow-sm">
            <div className="mb-8 flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
              <div>
                <h2 className="text-4xl font-bold text-black">
                  Tambah Produk
                </h2>
                <p className="mt-2 text-lg text-black">
                  Isi data produk, stok, dan harga dengan lengkap.
                </p>
              </div>

              <div className="flex flex-wrap gap-3">
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".csv,.xls,.xlsx"
                  onChange={handleImportFile}
                  className="hidden"
                />

                <button
                  type="button"
                  onClick={handleDownloadTemplate}
                  className="rounded-2xl bg-black px-5 py-3 text-lg font-semibold text-white transition-all duration-300 hover:-translate-y-0.5 hover:shadow-lg"
                >
                  Download Template Import
                </button>

                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={importing}
                  className="rounded-2xl border border-black bg-white px-5 py-3 text-lg font-semibold text-black transition-all duration-300 hover:bg-black hover:text-white disabled:opacity-60"
                >
                  {importing ? "Mengimport..." : "Import CSV/XLS"}
                </button>
              </div>
            </div>

            <ProductForm
              form={productForm}
              setForm={setProductForm}
              formErrors={errors}
              setFormErrors={setErrors}
              onSubmit={handleAddProduct}
              submitText="Tambah Produk"
            />
          </section>

          <section className="rounded-3xl border border-black/10 bg-white p-6 shadow-sm">
            <h2 className="mb-5 text-4xl font-bold text-black">
              Daftar Produk
            </h2>

            <div className="hidden overflow-x-auto md:block">
              <table className="w-full min-w-[1050px]">
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
                  {products.length === 0 ? (
                    <tr>
                      <td
                        colSpan={8}
                        className="px-4 py-6 text-center text-base text-black"
                      >
                        Belum ada produk
                      </td>
                    </tr>
                  ) : (
                    products.map((product) => (
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
                        <td className="border-b border-black/10 px-4 py-3 text-base text-black">
                          <div className="flex gap-2">
                            <button
                              type="button"
                              onClick={() => openEditModal(product)}
                              className="rounded-xl bg-black px-4 py-2 text-sm font-semibold text-white transition-all duration-300 hover:-translate-y-0.5 hover:shadow-md"
                            >
                              Edit
                            </button>

                            <button
                              type="button"
                              onClick={() => openDeleteModal(product)}
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
              {products.length === 0 ? (
                <p className="rounded-2xl border border-black/10 p-5 text-center text-black">
                  Belum ada produk
                </p>
              ) : (
                products.map((product) => (
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

                    <div className="mt-4 flex gap-2">
                      <button
                        type="button"
                        onClick={() => openEditModal(product)}
                        className="flex-1 rounded-2xl bg-black px-4 py-3 font-semibold text-white"
                      >
                        Edit
                      </button>

                      <button
                        type="button"
                        onClick={() => openDeleteModal(product)}
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
        </div>
      </AppShell>

      {editModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
          <div className="max-h-[90vh] w-full max-w-3xl overflow-y-auto rounded-3xl bg-white p-6 shadow-2xl">
            <div className="mb-5 flex items-center justify-between">
              <h3 className="text-3xl font-bold text-black">Edit Produk</h3>

              <button
                type="button"
                onClick={closeEditModal}
                className="rounded-xl border border-black px-4 py-2 text-sm font-semibold text-black transition-all duration-300 hover:bg-black hover:text-white"
              >
                Tutup
              </button>
            </div>

            <ProductForm
              form={editForm}
              setForm={setEditForm}
              formErrors={editErrors}
              setFormErrors={setEditErrors}
              onSubmit={handleSaveEdit}
              submitText="Simpan Perubahan"
            />
          </div>
        </div>
      )}

      <PopupModal
        open={deleteModalOpen}
        title="Hapus Produk"
        message={`Produk "${productToDelete?.name || ""}" akan dihapus.`}
        confirmText="Hapus"
        cancelText="Batal"
        onConfirm={confirmDeleteProduct}
        onCancel={closeDeleteModal}
        variant="danger"
      />
    </>
  );
}