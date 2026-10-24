import type { MetadataRoute } from 'next';
import { BRAND } from '@/lib/brand';

export default function manifest(): MetadataRoute.Manifest {
  return {
    id: '/',
    name: `${BRAND.name} — ${BRAND.tagline}`,
    short_name: BRAND.name,
    description: BRAND.description,
    start_url: '/',
    scope: '/',
    display: 'standalone',
    display_override: ['window-controls-overlay', 'standalone'],
    orientation: 'any',
    background_color: '#070910',
    theme_color: '#070910',
    lang: 'en',
    dir: 'ltr',
    categories: ['games', 'entertainment'],
    prefer_related_applications: false,
    launch_handler: { client_mode: 'navigate-existing' },
    icons: [
      {
        src: '/icons/icon-192.png',
        sizes: '192x192',
        type: 'image/png',
        purpose: 'any',
      },
      {
        src: '/icons/icon-512.png',
        sizes: '512x512',
        type: 'image/png',
        purpose: 'any',
      },
      {
        src: '/icons/icon-1024.png',
        sizes: '1024x1024',
        type: 'image/png',
        purpose: 'any',
      },
      {
        src: '/icons/icon-maskable-192.png',
        sizes: '192x192',
        type: 'image/png',
        purpose: 'maskable',
      },
      {
        src: '/icons/icon-maskable-512.png',
        sizes: '512x512',
        type: 'image/png',
        purpose: 'maskable',
      },
    ],
    shortcuts: [
      {
        name: 'Create a room',
        short_name: 'Create',
        description: 'Start a fresh SketchRush room.',
        url: '/#play',
        icons: [{ src: '/icons/shortcut-96.png', sizes: '96x96', type: 'image/png' }],
      },
      {
        name: 'How to play',
        short_name: 'Rules',
        description: 'Learn the loop before the timer starts.',
        url: '/#how-it-works',
        icons: [{ src: '/icons/shortcut-96.png', sizes: '96x96', type: 'image/png' }],
      },
    ],
  };
}
