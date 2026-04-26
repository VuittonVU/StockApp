import Link from "next/link";

export default function AuthCard({
  title,
  buttonText,
  footerText,
  footerLinkText,
  footerHref,
  children,
}) {
  return (
    <div className="w-full max-w-md rounded-3xl border border-black/10 bg-white p-8 shadow-xl">
      <div className="mb-8 flex items-center gap-3">
        <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-black text-xl font-bold text-white">
          S
        </div>
        <div>
          <p className="text-sm text-black">Simple Inventory</p>
          <h1 className="text-3xl font-bold text-black">StockApp</h1>
        </div>
      </div>

      <h2 className="mb-8 text-center text-5xl font-bold text-black">{title}</h2>

      {children}

      <button className="mt-6 w-full rounded-2xl bg-green-500 px-4 py-4 text-xl font-semibold text-white transition hover:bg-green-600">
        {buttonText}
      </button>

      <p className="mt-6 text-center text-lg text-black">
        {footerText}{" "}
        <Link href={footerHref} className="font-semibold text-black underline">
          {footerLinkText}
        </Link>
      </p>
    </div>
  );
}