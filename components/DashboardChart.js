"use client";

import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
} from "recharts";

export default function DashboardChart({ data }) {
  return (
    <div className="rounded-3xl border border-black/10 bg-white p-6 shadow-sm">
      <h2 className="mb-4 text-3xl font-bold text-black">
        Grafik Penjualan
      </h2>

      <div className="h-[300px]">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data}>
            <CartesianGrid strokeDasharray="3 3" />

            <XAxis dataKey="date" />
            <YAxis />

            <Tooltip />

            <Line
              type="monotone"
              dataKey="total"
              stroke="#000"
              strokeWidth={3}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}