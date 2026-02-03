import { HeadContent, Scripts, createRootRoute } from '@tanstack/react-router'
import { TanStackRouterDevtoolsPanel } from '@tanstack/react-router-devtools'
import { TanStackDevtools } from '@tanstack/react-devtools'
import { ConvexProvider, ConvexReactClient } from 'convex/react'

import appCss from '../styles.css?url'

const convex = new ConvexReactClient(import.meta.env.VITE_CONVEX_URL || '')

export const Route = createRootRoute({
  head: () => ({
    meta: [
      {
        charSet: 'utf-8',
      },
      {
        name: 'viewport',
        content: 'width=device-width, initial-scale=1',
      },
      {
        title: 'Fuel Finder - Compare UK Petrol & Diesel Prices Near You',
      },
      {
        name: 'description',
        content: 'Find the cheapest petrol and diesel prices near you in the UK. Compare fuel prices from local stations, save money, and get real-time fuel price updates.',
      },
      {
        name: 'keywords',
        content: 'fuel prices, petrol prices, diesel prices, UK fuel finder, cheap petrol, cheap diesel, fuel stations near me, compare fuel prices',
      },
      {
        name: 'author',
        content: 'Fuel Finder',
      },
      {
        name: 'theme-color',
        content: '#2563eb',
      },
      // Open Graph / Facebook
      {
        property: 'og:type',
        content: 'website',
      },
      {
        property: 'og:title',
        content: 'Fuel Finder - Compare UK Petrol & Diesel Prices',
      },
      {
        property: 'og:description',
        content: 'Find the cheapest petrol and diesel prices near you in the UK. Compare fuel prices and save money.',
      },
      {
        property: 'og:site_name',
        content: 'Fuel Finder',
      },
      // Twitter
      {
        name: 'twitter:card',
        content: 'summary_large_image',
      },
      {
        name: 'twitter:title',
        content: 'Fuel Finder - Compare UK Petrol & Diesel Prices',
      },
      {
        name: 'twitter:description',
        content: 'Find the cheapest petrol and diesel prices near you in the UK.',
      },
      // PWA
      {
        name: 'apple-mobile-web-app-capable',
        content: 'yes',
      },
      {
        name: 'apple-mobile-web-app-status-bar-style',
        content: 'default',
      },
      {
        name: 'apple-mobile-web-app-title',
        content: 'Fuel Finder',
      },
    ],
    links: [
      {
        rel: 'stylesheet',
        href: appCss,
      },
      {
        rel: 'icon',
        type: 'image/svg+xml',
        href: '/favicon.svg',
      },
      {
        rel: 'icon',
        type: 'image/x-icon',
        href: '/favicon.ico',
      },
      {
        rel: 'apple-touch-icon',
        sizes: '180x180',
        href: '/apple-touch-icon.png',
      },
      {
        rel: 'manifest',
        href: '/manifest.json',
      },
    ],
  }),

  shellComponent: RootDocument,
})

function RootDocument({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <HeadContent />
      </head>
      <body>
        <ConvexProvider client={convex}>
          {children}
          <TanStackDevtools
            config={{
              position: 'bottom-right',
            }}
            plugins={[
              {
                name: 'Tanstack Router',
                render: <TanStackRouterDevtoolsPanel />,
              },
            ]}
          />
        </ConvexProvider>
        <Scripts />
      </body>
    </html>
  )
}
