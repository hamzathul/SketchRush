import { ImageResponse } from 'next/og';
import { SITE_URL } from '@/lib/brand';

const SITE_HOST = SITE_URL.replace(/^https?:\/\//, '').replace(/\/$/, '');

export const alt = 'SketchRush — Draw badly. Guess brilliantly.';
export const size = {
  width: 1200,
  height: 630,
};
export const contentType = 'image/png';

export default function OpengraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          position: 'relative',
          overflow: 'hidden',
          padding: '60px 64px',
          background: 'linear-gradient(135deg, #0c1222 0%, #070910 55%, #0a101b 100%)',
          color: '#eef1f8',
        }}
      >
        <div
          style={{
            position: 'absolute',
            top: -180,
            right: -90,
            width: 500,
            height: 500,
            borderRadius: 9999,
            background: 'rgba(139, 92, 246, 0.22)',
          }}
        />
        <div
          style={{
            position: 'absolute',
            bottom: -220,
            left: -120,
            width: 460,
            height: 460,
            borderRadius: 9999,
            background: 'rgba(34, 211, 238, 0.13)',
          }}
        />
        <div
          style={{
            position: 'absolute',
            top: 250,
            right: 110,
            width: 200,
            height: 200,
            borderRadius: 9999,
            background: 'rgba(184, 243, 107, 0.08)',
          }}
        />

        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%' }}>
          <div style={{ display: 'flex', alignItems: 'center' }}>
            <div
              style={{
                width: 64,
                height: 64,
                borderRadius: 18,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                background: 'linear-gradient(135deg, #b8f36b, #22d3ee)',
                color: '#08110b',
                fontSize: 38,
                fontWeight: 700,
              }}
            >
              S
            </div>
            <div style={{ marginLeft: 18, fontSize: 34, fontWeight: 700, letterSpacing: -1 }}>SketchRush</div>
          </div>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              border: '1px solid rgba(255, 255, 255, 0.12)',
              background: 'rgba(255, 255, 255, 0.05)',
              borderRadius: 999,
              padding: '10px 18px',
              fontSize: 16,
              color: '#8b94a9',
            }}
          >
            FREE · NO SIGNUP
          </div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', marginTop: 10 }}>
          <div style={{ fontSize: 78, fontWeight: 700, letterSpacing: -3, lineHeight: 1.02 }}>Draw badly.</div>
          <div
            style={{
              fontSize: 78,
              fontWeight: 700,
              letterSpacing: -3,
              lineHeight: 1.02,
              color: '#b8f36b',
            }}
          >
            Guess brilliantly.
          </div>
          <div style={{ marginTop: 20, maxWidth: 760, fontSize: 25, lineHeight: 1.35, color: '#8b94a9' }}>
            The free multiplayer drawing game for game nights, classrooms and group chats.
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%' }}>
          <div style={{ display: 'flex' }}>
            {['2–16 players', '6-character rooms', 'Desktop + mobile'].map((label) => (
              <div
                key={label}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  marginRight: 12,
                  border: '1px solid rgba(255, 255, 255, 0.1)',
                  background: 'rgba(255, 255, 255, 0.04)',
                  borderRadius: 999,
                  padding: '9px 16px',
                  fontSize: 16,
                  color: '#8b94a9',
                }}
              >
                {label}
              </div>
            ))}
          </div>
          <div style={{ display: 'flex', alignItems: 'center', fontSize: 20, fontWeight: 600, color: '#b8f36b' }}>
            {SITE_HOST}
          </div>
        </div>
      </div>
    ),
    {
      ...size,
    },
  );
}
