// LexAI — App Icon (Next.js 14 App Router)
// This file auto-generates /favicon.ico via Next.js ImageResponse
import { ImageResponse } from 'next/og';

export const runtime = 'edge';
export const size = { width: 32, height: 32 };
export const contentType = 'image/png';

export default function Icon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: 32,
          height: 32,
          background: '#022448',
          borderRadius: 6,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: 20,
          fontWeight: 800,
          color: '#ffe088',
          fontFamily: 'sans-serif',
        }}
      >
        L
      </div>
    ),
    { ...size }
  );
}
