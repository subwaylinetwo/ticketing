import type { Metadata, Viewport } from 'next';
import './food.css';

export const metadata: Metadata = {
  title: '어흐동 · 음식발기',
  description: '한 번 보면 어흐, 한 입 맛보면 어흐어흐 — 어흐동 QR 주문',
};
export const viewport: Viewport = { width: 'device-width', initialScale: 1, maximumScale: 1, viewportFit: 'cover', themeColor: '#F5EEDF' };

export default function FoodLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      {/* eslint-disable-next-line @next/next/no-page-custom-font */}
      <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Song+Myung&display=swap" precedence="default" />
      <div className="ef-body">{children}</div>
    </>
  );
}
