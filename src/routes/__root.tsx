/// <reference types="vite/client" />
import type { ReactNode } from 'react'
import {
  Outlet,
  createRootRoute,
  HeadContent,
  Scripts,
} from '@tanstack/react-router'
import clsx from 'clsx'

import { Providers } from '@/components/providers'
import { Navbar } from '@/components/navbar'
import { fontSans } from '@/config/fonts'

import appCss from '../styles.css?url'

export const Route = createRootRoute({
  head: () => ({
    meta: [
      { charSet: 'utf-8' },
      { name: 'viewport', content: 'width=device-width, initial-scale=1' },
      { title: 'PDF AutoFillr' },
      { name: 'description', content: 'AI-powered PDF Autofill tool' },
    ],
    links: [
      { rel: 'stylesheet', href: appCss },
      { rel: 'preconnect', href: 'https://fonts.googleapis.com' },
      { rel: 'preconnect', href: 'https://fonts.gstatic.com', crossOrigin: 'anonymous' },
      { rel: 'stylesheet', href: 'https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap' },
    ],
  }),
  component: RootComponent,
})

function RootComponent() {
  return (
    <RootDocument>
      <Providers themeProps={{ attribute: 'class', defaultTheme: 'dark' }}>
        <div
          className={clsx(
            'min-h-screen text-foreground bg-background font-sans antialiased',
            fontSans.variable
          )}
        >
          <div className="relative flex flex-col h-screen">
            <Navbar />
            <main className="container mx-auto max-w-7xl pt-16 px-6 h-[calc(100vh-4rem)]">
              <Outlet />
            </main>
          </div>
        </div>
      </Providers>
    </RootDocument>
  )
}

function RootDocument({ children }: Readonly<{ children: ReactNode }>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <HeadContent />
      </head>
      <body>
        {children}
        <Scripts />
      </body>
    </html>
  )
}
