"use client";

import * as React from "react";
import { HeroUIProvider } from "@heroui/system";
import { useRouter } from "@tanstack/react-router";
import { ThemeProvider as NextThemesProvider } from "next-themes";
import type { ThemeProviderProps } from "next-themes";

export interface ProvidersProps {
    children: React.ReactNode;
    themeProps?: ThemeProviderProps;
}

export function Providers({ children, themeProps }: ProvidersProps) {
    const router = useRouter();

    return (
        <HeroUIProvider navigate={(path) => router.navigate({ to: path })}>
            <NextThemesProvider {...themeProps}>{children}</NextThemesProvider>
        </HeroUIProvider>
    );
}
