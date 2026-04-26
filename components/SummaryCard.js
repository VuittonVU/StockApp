export default function SummaryCard({ title, value }) {
  return (
    <div className="min-w-[160px] rounded-3xl border border-black/10 bg-white p-5 shadow-sm transition-all duration-300 hover:-translate-y-1 hover:border-black hover:bg-black hover:text-white hover:shadow-lg">
      <p className="text-xl transition-colors duration-300">{title}</p>
      <h3 className="mt-2 text-5xl font-bold transition-colors duration-300">
        {value}
      </h3>
    </div>
  );
}