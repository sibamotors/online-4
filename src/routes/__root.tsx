import { QueryCache, QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { createRootRoute, HeadContent, Outlet, Scripts } from "@tanstack/react-router";
import { useState } from "react";
import { Toaster } from "sonner";
import { ThemeProvider } from "@/components/theme-provider";
import { I18nBridge } from "@/components/i18n-bridge";
import { ConferenceProvider } from "@/components/conference-provider";
import { PwaRegister } from "@/components/pwa-register";
import { LocalSessionProvider } from "@/lib/local-session";
import { LanguageProvider } from "@/lib/i18n";
import { APP_NAME, APP_TAGLINE } from "@/lib/constants";
import appCss from "../styles.css?url";

export const Route = createRootRoute({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1" },
      { title: APP_NAME },
      { name: "description", content: APP_TAGLINE },
      { name: "theme-color", content: "#111111" },
      { property: "og:title", content: APP_NAME },
      { property: "og:description", content: APP_TAGLINE },
      { property: "og:type", content: "website" },
    ],
    links: [
      { rel: "icon", type: "image/svg+xml", href: "/favicon.svg" },
      { rel: "stylesheet", href: appCss },
      { rel: "apple-touch-icon", href: "/icons/apple-touch-180.png" },
      { rel: "manifest", href: "/manifest.webmanifest" },
    ],
  }),
  component: RootDocument,
});

function handleQueryError(error: unknown) {
  if (typeof window === "undefined") return;
  if (error instanceof Error && error.message.includes("AUTH_REQUIRED") && window.location.pathname !== "/login") {
    window.location.assign("/login");
  }
}

function RootDocument() {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        queryCache: new QueryCache({ onError: handleQueryError }),
        defaultOptions: {
          queries: { staleTime: 8_000, retry: 1, refetchOnWindowFocus: false },
        },
      }),
  );

  return (
    <html lang="fa" dir="rtl" suppressHydrationWarning data-theme="ink" data-accent="blue" data-font="vazirmatn" data-scheme="dark">
      <head>
        <HeadContent />
      </head>
      <body className="antialiased">
        <a href="#main" className="skip-link">
          پرش به محتوا
        </a>
        <LanguageProvider>
          <PwaRegister />
          <I18nBridge />
          <LocalSessionProvider>
            <QueryClientProvider client={queryClient}>
              <ThemeProvider>
                <ConferenceProvider>
                  <Outlet />
                </ConferenceProvider>
                <Toaster position="top-center" richColors />
              </ThemeProvider>
            </QueryClientProvider>
          </LocalSessionProvider>
        </LanguageProvider>
        <Scripts />
      </body>
    </html>
  );
}
