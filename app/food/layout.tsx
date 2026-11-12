import type { Metadata, Viewport } from 'next';
import './food.css';

export const metadata: Metadata = {
  title: '어흐~동 · 메뉴판',
  description: '한 번 보면 어~흐, 한 입 먹으면 어흐어~흐 — 어흐~동 QR 주문',
};
export const viewport: Viewport = { width: 'device-width', initialScale: 1, maximumScale: 1, viewportFit: 'cover', themeColor: '#EBE7E3' };

export default function FoodLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      {/* eslint-disable-next-line @next/next/no-page-custom-font */}
      <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Jua&display=swap" precedence="default" />
      <div className="ef-body">{children}</div>
    </>
  );
}
