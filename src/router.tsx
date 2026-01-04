// src/router.tsx
import { createRouter } from '@tanstack/react-router'
import { routeTree } from './routeTree.gen'

function NotFound() {
    return (
        <div className="flex flex-col items-center justify-center min-h-screen gap-4">
            <h1 className="text-4xl font-bold">404</h1>
            <p className="text-lg text-foreground/70">Page non trouvée</p>
            <a href="/" className="text-primary hover:underline">
                Retour à l'accueil
            </a>
        </div>
    )
}

export function getRouter() {
    const router = createRouter({
        routeTree,
        scrollRestoration: true,
        defaultNotFoundComponent: NotFound,
    })
    return router
}
