import "./globals.css";
import { Toaster } from "react-hot-toast";

export const metadata = {
  title: "StockApp",
  description: "Aplikasi manajemen stok sederhana",
};

export default function RootLayout({ children }) {
  return (
    <html lang="id">
      <body>
        {children}
        <Toaster
          position="top-right"
          toastOptions={{
            duration: 2500,
            style: {
              border: "1px solid #000",
              padding: "12px 16px",
              color: "#000",
              background: "#fff",
            },
          }}
        />
      </body>
    </html>
  );
}