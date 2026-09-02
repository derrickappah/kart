export default function manifest() {
  return {
    name: 'KART | Campus Marketplace',
    short_name: 'KART',
    description: 'The premium marketplace for students.',
    start_url: '/',
    display: 'fullscreen',
    display_override: ['fullscreen', 'standalone', 'minimal-ui', 'browser'],
    orientation: 'portrait',
    background_color: '#ffffff',
    theme_color: '#000000',
    icons: [
      {
        src: '/icon.png',
        sizes: '192x192',
        type: 'image/png',
        purpose: 'any',
      },
      {
        src: '/icon.png',
        sizes: '192x192',
        type: 'image/png',
        purpose: 'maskable',
      },
      {
        src: '/icon.png',
        sizes: '512x512',
        type: 'image/png',
        purpose: 'any',
      },
      {
        src: '/icon.png',
        sizes: '512x512',
        type: 'image/png',
        purpose: 'maskable',
      },
    ],
  };
}
