import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  Outlet,
  Link,
  createRootRouteWithContext,
  useRouter,
  HeadContent,
  Scripts,
} from "@tanstack/react-router";

import appCss from "../styles.css?url";
import { Sidebar } from "@/components/sidebar";
import { Toaster } from "@/components/ui/sonner";
import { ThemeControls } from "@/components/theme-controls";
import { GlobalSearch, GlobalSearchTrigger } from "@/components/global-search";
import { useState } from "react";
import { Menu } from "lucide-react";

function NotFoundComponent() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="text-7xl font-bold text-foreground">404</h1>
        <h2 className="mt-4 text-xl font-semibold text-foreground">Page not found</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          The page you're looking for doesn't exist or has been moved.
        </p>
        <div className="mt-6">
          <Link
            to="/"
            className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
          >
            Go home
          </Link>
        </div>
      </div>
    </div>
  );
}

function ErrorComponent({ error, reset }: { error: Error; reset: () => void }) {
  console.error(error);
  const router = useRouter();

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="text-xl font-semibold tracking-tight text-foreground">
          This page didn't load
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Something went wrong on our end. You can try refreshing or head back home.
        </p>
        <div className="mt-6 flex flex-wrap justify-center gap-2">
          <button
            onClick={() => {
              router.invalidate();
              reset();
            }}
            className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
          >
            Try again
          </button>
          <a
            href="/"
            className="inline-flex items-center justify-center rounded-md border border-input bg-background px-4 py-2 text-sm font-medium text-foreground transition-colors hover:bg-accent"
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
      { title: "Ranking da Super Liga" },
      { name: "description", content: "Keep track of every champions of you save" },
      { name: "author", content: "FMDataLab" },
      { property: "og:title", content: "Ranking da Super Liga" },
      { property: "og:description", content: "Keep track of every champions of you save" },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "twitter:site", content: "@FMDataLab" },
      { name: "twitter:title", content: "Ranking da Super Liga" },
      { name: "twitter:description", content: "Keep track of every champions of you save" },
      { property: "og:image", content: "https://pub-bb2e103a32db4e198524a2e9ed8f35b4.r2.dev/94d55538-b6e2-4c98-aae1-2acb0ff2b3c6/id-preview-d127dbe5--f5434d03-8c47-44c8-932d-25c91440ff31.lovable.app-1778423013472.png" },
      { name: "twitter:image", content: "https://pub-bb2e103a32db4e198524a2e9ed8f35b4.r2.dev/94d55538-b6e2-4c98-aae1-2acb0ff2b3c6/id-preview-d127dbe5--f5434d03-8c47-44c8-932d-25c91440ff31.lovable.app-1778423013472.png" },
    ],
    links: [
      {
        rel: "stylesheet",
        href: appCss,
      },
    ],
  }),
  shellComponent: RootShell,
  component: RootComponent,
  notFoundComponent: NotFoundComponent,
  errorComponent: ErrorComponent,
});

function RootShell({ children }: { children: React.ReactNode }) {
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

function RootComponent() {
  const { queryClient } = Route.useRouteContext();

  return (
    <QueryClientProvider client={queryClient}>
      <AppShell />
    </QueryClientProvider>
  );
}

const SITE_NAV = [
  { label: "Dashboard", to: "/dashboard/Dashboard_Clubes" },
  { label: "Hall of Fame", to: "/hall-of-fame" },
  { label: "Timeline", to: "/timeline" },
  { label: "Comparador", to: "/comparador/clubes" },
  { label: "Head-to-Head", to: "/h2h" },
  { label: "Domínio", to: "/dominio" },
  { label: "Scouting", to: "/scouting" },
];

function AppShell() {
  const [mobileOpen, setMobileOpen] = useState(false);
  return (
    <div className="flex min-h-screen bg-background text-foreground">
      <div className="hidden md:block"><Sidebar /></div>
      {mobileOpen && (
        <div className="fixed inset-0 z-40 md:hidden" onClick={() => setMobileOpen(false)}>
          <div className="absolute inset-0 bg-black/60" />
          <div className="absolute inset-y-0 left-0 z-50" onClick={(e) => e.stopPropagation()}>
            <Sidebar onNavigate={() => setMobileOpen(false)} />
          </div>
        </div>
      )}
      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-40 border-b border-violet-500/20 bg-[#09061f]/95 px-5 py-3 backdrop-blur-2xl supports-[backdrop-filter]:bg-[#09061f]/95 md:px-8 shadow-[0_0_40px_-20px_rgba(167,139,250,0.25)]">
          <div className="mx-auto flex w-full max-w-[1280px] flex-wrap items-center gap-3">
            <Link to="/" className="inline-flex items-center gap-3 rounded-full border border-violet-500/20 bg-[#110a2e]/95 px-4 py-2 text-white shadow-[0_0_30px_rgba(167,139,250,0.18)] transition hover:bg-violet-500/15">
              <span className="flex h-9 w-9 items-center justify-center rounded-full bg-gradient-to-br from-violet-600 via-indigo-700 to-slate-900 text-white shadow-md shadow-purple-500/20">F</span>
              <span className="font-display text-base font-semibold tracking-tight text-slate-100">FMDataLab</span>
            </Link>
            <nav className="hidden flex-1 items-center justify-center gap-2 md:flex">
              {SITE_NAV.map((item) => (
                <Link
                  key={item.label}
                  to={item.to}
                  className="rounded-full px-3 py-2 text-sm font-medium text-slate-300 transition hover:bg-violet-500/10 hover:text-white"
                >
                  {item.label}
                </Link>
              ))}
            </nav>
            <div className="ml-auto flex items-center gap-3">
              <GlobalSearchTrigger />
              <div className="hidden items-center gap-2 rounded-full border border-violet-500/20 bg-violet-500/10 px-4 py-2 text-sm text-violet-100 md:flex shadow-[0_0_26px_-12px_rgba(167,139,250,0.2)]">
                <span className="h-2.5 w-2.5 rounded-full bg-violet-300" />
                Live scouting
              </div>
              <ThemeControls />
              <button onClick={() => setMobileOpen(true)} className="inline-flex h-11 w-11 items-center justify-center rounded-full border border-white/10 bg-[#0d1222] text-violet-200 transition hover:bg-white/10 md:hidden">
                <Menu className="h-5 w-5" />
              </button>
            </div>
          </div>
        </header>
        <main className="flex-1 overflow-x-hidden p-5 text-[15px] md:p-8"><Outlet /></main>
      </div>
      <Toaster richColors position="top-right" />
      <GlobalSearch />
    </div>
  );
}
