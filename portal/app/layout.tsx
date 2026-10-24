import type { ReactNode } from "react";

export const metadata = { title: "Mock Vendor Portal", description: "Demo portal for ReconAgent. Not a real vendor." };

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body style={{ fontFamily: "system-ui, sans-serif", maxWidth: 560, margin: "48px auto", padding: "0 16px" }}>
        {children}
      </body>
    </html>
  );
}
