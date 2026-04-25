import { Outlet, Link, createRootRoute, HeadContent, Scripts } from "@tanstack/react-router";
import { Toaster } from "sonner";

import appCss from "../styles.css?url";

function NotFoundComponent() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="mono text-7xl font-bold text-signal">404</h1>
        <h2 className="mt-4 mono text-xl uppercase tracking-wider text-foreground">Signal Lost</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          That route is not part of this mesh. Return to base.
        </p>
        <div className="mt-6">
          <Link
            to="/"
            className="inline-flex items-center justify-center rounded-md bg-signal px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-signal/90"
          >
            Return home
          </Link>
        </div>
      </div>
    </div>
  );
}

export const Route = createRootRoute({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      {
        name: "viewport",
        content: "width=device-width, initial-scale=1, viewport-fit=cover",
      },
      { name: "theme-color", content: "#1a1f26" },
      { title: "MeshRelay — Offline Disaster Comms" },
      {
        name: "description",
        content:
          "Peer-to-peer mesh messaging for internet shutdowns. QR-based, multi-hop, end-to-end signed. Works fully offline.",
      },
      { name: "author", content: "MeshRelay" },
      { property: "og:title", content: "MeshRelay — Offline Disaster Comms" },
      {
        property: "og:description",
        content:
          "Peer-to-peer mesh messaging for internet shutdowns. QR-based, multi-hop, end-to-end signed.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
    links: [
      { rel: "stylesheet", href: appCss },
      { rel: "manifest", href: "/manifest.webmanifest" },
    ],
  }),
  shellComponent: RootShell,
  component: RootComponent,
  notFoundComponent: NotFoundComponent,
});

function RootShell({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="dark">
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

import { useEffect } from "react";
import { registerSW } from "virtual:pwa-register";

function RootComponent() {
  useEffect(() => {
    if (typeof window !== "undefined" && "serviceWorker" in navigator) {
      registerSW({
        onNeedRefresh() {
          console.log("New content available, click on reload button to update.");
        },
        onOfflineReady() {
          console.log("App ready to work offline");
        },
      });
    }
  }, []);

  return (
    <>
      <Outlet />
      <Toaster theme="dark" position="top-center" richColors closeButton />
    </>
  );
}
