import { HeadContent, Scripts, createRootRoute, Link } from '@tanstack/react-router'
import { TanStackRouterDevtoolsPanel } from '@tanstack/react-router-devtools'
import { TanStackDevtools } from '@tanstack/react-devtools'
import { ConvexProvider, ConvexReactClient } from 'convex/react'
import { Fuel, Home } from 'lucide-react'
import { SpeedInsights } from '@vercel/speed-insights/react'

import appCss from '../styles.css?url'

const convex = new ConvexReactClient(import.meta.env.VITE_CONVEX_URL || '')

function NotFound() {
  return (
    <div className="min-h-screen bg-background flex items-center justify-center px-4">
      <div className="text-center">
        <div className="mb-8">
          <div className="text-8xl font-bold gradient-text mb-4">404</div>
          <h1 className="text-2xl font-bold text-foreground mb-2">Page Not Found</h1>
          <p className="text-muted-foreground mb-8">
            Sorry, we couldn't find the page you're looking for.
          </p>
        </div>
        <Link
          to="/"
          className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-primary text-primary-foreground hover:opacity-90 transition-all font-medium glow-primary"
        >
          <Home className="w-5 h-5" />
          Go Back Home
        </Link>
      </div>
    </div>
  )
}

export const Route = createRootRoute({
  head: () => ({
    meta: [
      {
        charSet: 'utf-8',
      },
      {
        name: 'viewport',
        content: 'width=device-width, initial-scale=1, viewport-fit=cover',
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
        content: '#0f1419',
      },
      {
        name: 'color-scheme',
        content: 'dark',
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
        content: 'black-translucent',
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

  notFoundComponent: NotFound,
  shellComponent: RootDocument,
})

function RootDocument({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <HeadContent />
      </head>
      <body className="min-h-screen">
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
          <SpeedInsights />
        </ConvexProvider>
        <Scripts />
      </body>
    </html>
  )
}
