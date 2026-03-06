import type { Metadata, Viewport } from "next";

export const metadata: Metadata = {
  title: "사이니지 메신저",
  description: "디지털 사이니지 긴급 알림 전송",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "사이니지",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  themeColor: "#0d9488",
};

export default function MobileLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-gradient-to-br from-teal-500 to-cyan-600">
      {children}
    </div>
  );
}
