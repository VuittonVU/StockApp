import AuthGuard from "@/components/AuthGuard";
import Navbar from "@/components/Navbar";

export default function AppShell({ title, subtitle, children, rightContent }) {
  return (
    <AuthGuard>
      <main className="min-h-screen bg-[#f7f1e4]">
        <Navbar />

        <section className="mx-auto max-w-[1600px] px-6 py-10">
          <div className="mb-10 flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
            <div>
              <h1 className="text-5xl font-bold text-black md:text-7xl">
                {title}
              </h1>

              {subtitle && (
                <p className="mt-4 text-xl text-black md:text-2xl">
                  {subtitle}
                </p>
              )}
            </div>

            {rightContent && <div>{rightContent}</div>}
          </div>

          {children}
        </section>
      </main>
    </AuthGuard>
  );
}