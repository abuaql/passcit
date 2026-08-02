import type { Metadata } from "next";
import { WifiOff } from "lucide-react";
import { EmptyState } from "@/components/ui/empty-state";

export const metadata: Metadata = { title: "You're offline" };

// Served by the service worker as the fallback for any navigation that
// fails while offline and has no cached version of its own. Deliberately
// outside src/app/(app) — this must render with no auth check, since a
// signed-out state is exactly when the network is also most likely to
// have just dropped mid-navigation.
export default function OfflinePage() {
  return (
    <div className="flex min-h-screen items-center justify-center p-4">
      <div className="w-full max-w-md">
        <EmptyState
          icon={WifiOff}
          title="You're offline"
          description="It looks like you've lost your connection. Pages you've already visited may still be available — check the menu, or try reconnecting."
          action={
            // A plain <a> rather than next/link, deliberately: this page is
            // shown when the network is unavailable, and Link's client-side
            // navigation still has to reach the server for data. A full
            // document request either succeeds (connection is back) or fails
            // with the browser's own offline error, instead of leaving a
            // half-navigated client state. The rule can't see that context.
            // eslint-disable-next-line @next/next/no-html-link-for-pages
            <a
              href="/"
              className="inline-flex items-center justify-center rounded-2xl bg-primary px-6 py-2.5 text-sm font-semibold text-primary-foreground hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background"
            >
              Try again
            </a>
          }
        />
      </div>
    </div>
  );
}
