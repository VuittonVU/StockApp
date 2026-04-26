"use client";

import { useEffect, useState } from "react";
import AppShell from "@/components/AppShell";
import SummaryCard from "@/components/SummaryCard";
import DashboardChart from "@/components/DashboardChart";
import { supabase } from "@/lib/supabase";
import toast from "react-hot-toast";

export default function DashboardPage() {
  const [products, setProducts] = useState([]);
  const [transactions, setTransactions] = useState([]);
  const [chartData, setChartData] = useState([]);

  useEffect(() => {
    fetchData();
  }, []);

  async function fetchData() {
    const { data: pData, error: pError } = await supabase
      .from("products")
      .select("*");

    const { data: tData, error: tError } = await supabase
      .from("transactions")
      .select("*");

    if (pError || tError) {
      toast.error("Gagal memuat dashboard.");
      return;
    }

    setProducts(pData || []);
    setTransactions(tData || []);

    generateChart(tData || []);
  }

  function generateChart(data) {
    const map = {};

    data.forEach((item) => {
      if (item.type !== "sale") return;

      const date = new Date(item.created_at).toLocaleDateString("id-ID");

      if (!map[date]) map[date] = 0;
      map[date] += Number(item.price || 0);
    });

    const result = Object.keys(map).map((date) => ({
      date,
      total: map[date],
    }));

    setChartData(result);
  }

  function getEstimatedPiece(product) {
    return (
      (product.stock_karton || 0) *
        (product.box_per_karton || 1) *
        (product.piece_per_box || 1) +
      (product.stock_box || 0) * (product.piece_per_box || 1) +
      (product.stock_piece || 0)
    );
  }

  const totalProduk = products.length;
  const totalTransaksi = transactions.length;

  const totalPenjualan = transactions
    .filter((t) => t.type === "sale")
    .reduce((sum, t) => sum + Number(t.price || 0), 0);

  const lowStockProducts = products.filter(
    (p) => getEstimatedPiece(p) <= (p.low_stock_piece_limit || 0)
  );

  return (
    <AppShell
      title="Dashboard"
      subtitle="Ringkasan performa stok dan penjualan"
    >
      <div className="grid gap-6">
        {/* SUMMARY */}
        <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
          <SummaryCard title="Total Produk" value={totalProduk} />
          <SummaryCard title="Total Transaksi" value={totalTransaksi} />
          <SummaryCard title="Total Penjualan" value={totalPenjualan} />
          <SummaryCard
            title="Stok Rendah"
            value={lowStockProducts.length}
          />
        </div>

        {/* CHART */}
        <DashboardChart data={chartData} />

        {/* LOW STOCK WARNING */}
        <div className="rounded-3xl border border-black/10 bg-white p-6 shadow-sm">
          <h2 className="mb-4 text-3xl font-bold text-black">
            Produk Stok Rendah
          </h2>

          {lowStockProducts.length === 0 ? (
            <p className="text-lg text-black">Semua stok aman 👍</p>
          ) : (
            <div className="grid gap-3">
              {lowStockProducts.map((p) => (
                <div
                  key={p.id}
                  className="rounded-2xl border border-black p-4"
                >
                  <p className="text-xl font-semibold text-black">
                    {p.name}
                  </p>
                  <p className="text-black">
                    Sisa: {getEstimatedPiece(p)} piece
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </AppShell>
  );
}