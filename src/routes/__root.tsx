import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  Outlet,
  Link,
  createRootRouteWithContext,
  useRouter,
  HeadContent,
  Scripts,
} from "@tanstack/react-router";
import { useEffect, type ReactNode } from "react";

import appCss from "../styles.css?url";
import { reportLovableError } from "../lib/lovable-error-reporting";

function NotFoundComponent() {
  return (
    <div className="flex min-h-[70vh] items-center justify-center px-4">
      <div className="max-w-md text-center">
        <h1 className="display text-7xl text-alert">404</h1>
        <h2 className="display mt-4 text-2xl">This address doesn't exist</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          The page you're looking for has moved or was never built.
        </p>
        <div className="mt-6">
          <Link
            to="/"
            className="inline-flex items-center justify-center border-2 border-signal bg-signal px-5 py-2.5 text-sm font-bold uppercase tracking-widest text-primary-foreground"
          >
            Back to the map
          </Link>
        </div>
      </div>
    </div>
  );
}

function ErrorComponent({ error, reset }: { error: Error; reset: () => void }) {
  console.error(error);
  const router = useRouter();
  useEffect(() => {
    reportLovableError(error, { boundary: "tanstack_root_error_component" });
  }, [error]);

  return (
    <div className="flex min-h-[70vh] items-center justify-center px-4">
      <div className="max-w-md text-center">
        <h1 className="display text-3xl">This page didn't load</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Something went wrong. Try again or head back to the map.
        </p>
        <div className="mt-6 flex flex-wrap justify-center gap-2">
          <button
            onClick={() => {
              router.invalidate();
              reset();
            }}
            className="border-2 border-signal bg-signal px-5 py-2.5 text-sm font-bold uppercase tracking-widest text-primary-foreground"
          >
            Try again
          </button>
          <a
            href="/"
            className="border-2 border-border px-5 py-2.5 text-sm font-bold uppercase tracking-widest text-foreground"
          >
            Go home
          </a>
        </div>
      </div>
    </div>
  );
}

export const Route = createRootRouteWithContext<{ queryClient: QueryClient }>()({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1" },
      { title: "HOUSEOPOLY — London's housing crisis, in numbers you can move" },
      {
        name: "description",
        content:
          "An interactive experience built on real London data: temporary accommodation, empty council homes, repairs and the cost of housing decisions.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
    links: [
      { rel: "stylesheet", href: appCss },
      { rel: "preconnect", href: "https://fonts.googleapis.com" },
      { rel: "preconnect", href: "https://fonts.gstatic.com", crossOrigin: "anonymous" },
      {
        rel: "stylesheet",
        href: "https://fonts.googleapis.com/css2?family=Anton&family=Space+Grotesk:wght@400;500;700&family=Silkscreen:wght@400;700&display=swap",
      },
      { rel: "icon", href: "/favicon.ico", type: "image/x-icon" },
    ],
  }),
  shellComponent: RootShell,
  component: RootComponent,
  notFoundComponent: NotFoundComponent,
  errorComponent: ErrorComponent,
});

function RootShell({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <head>
        <HeadContent />
      </head>
      <body>
        {children}
        <Scripts />
      </body>
    </html>
  );
}

const NAV = [
  { to: "/", label: "The picture" },
  { to: "/explore", label: "Explore" },
  { to: "/auction", label: "Play" },
  
  { to: "/sources", label: "Sources" },
] as const;

function Wordmark() {
  return (
    <span className="flex items-center gap-2.5">
      <span
        aria-hidden="true"
        className="grid h-8 w-8 place-items-center border-2 border-signal bg-signal text-primary-foreground"
      >
        <span className="display text-lg leading-none">H</span>
      </span>
      <span className="display text-xl tracking-[0.04em]">HOUSEOPOLY</span>
    </span>
  );
}

function RootComponent() {
  const { queryClient } = Route.useRouteContext();

  return (
    <QueryClientProvider client={queryClient}>
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-50 focus:border-2 focus:border-signal focus:bg-background focus:px-4 focus:py-2"
      >
        Skip to content
      </a>
      <header className="sticky top-0 z-40 border-b-2 border-border bg-background/95 backdrop-blur">
        <div className="mx-auto flex max-w-[1400px] flex-wrap items-center justify-between gap-3 px-4 py-3 md:px-8">
          <Link to="/" aria-label="HOUSEOPOLY home">
            <Wordmark />
          </Link>
          <nav aria-label="Main" className="flex flex-wrap items-center gap-1">
            {NAV.map((item) => (
              <Link
                key={item.to}
                to={item.to}
                className="border-2 border-transparent px-3 py-1.5 text-xs font-bold uppercase tracking-[0.16em] text-muted-foreground transition-colors hover:text-foreground"
                activeProps={{ className: "border-signal text-signal" }}
                activeOptions={{ exact: item.to === "/" }}
              >
                {item.label}
              </Link>
            ))}
          </nav>
        </div>
      </header>
      <main id="main" tabIndex={-1}>
        {/* Required: nested routes render here. Removing <Outlet /> breaks all child routes. */}
        <Outlet />
      </main>
      <footer className="mt-24 border-t-2 border-border">
        <div className="mx-auto flex max-w-[1400px] flex-col gap-4 px-4 py-10 md:flex-row md:items-end md:justify-between md:px-8">
          <div>
            <Wordmark />
            <p className="mt-3 max-w-sm text-sm text-muted-foreground">
              Public data. Open assumptions. Difficult choices. Not affiliated with any board game.
            </p>
          </div>
          <div className="flex flex-col gap-1 text-xs text-muted-foreground md:text-right">
            <Link to="/sources" className="text-signal">
              Sources ↗
            </Link>
            <span>Snapshot 2024–25 · Model 1.0</span>
          </div>
        </div>
      </footer>
    </QueryClientProvider>
  );
}
