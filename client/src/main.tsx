import { trpc } from "@/lib/trpc";
import { UNAUTHED_ERR_MSG } from "@shared/const";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { httpBatchLink, TRPCClientError } from "@trpc/client";
import { createRoot } from "react-dom/client";
import superjson from "superjson";
import App from "./App";
import { getLoginUrl } from "./const";
import "./index.css";

// ─── Silent token refresh ─────────────────────────────────────────────────
// Multiple concurrent 401s share ONE refresh call to avoid race conditions.
let refreshPromise: Promise<boolean> | null = null;
let refreshCount = 0;

async function attemptSilentRefresh(): Promise<boolean> {
  // Deduplication: if a refresh is already in flight, wait for it
  if (refreshPromise) {
    return refreshPromise;
  }

  refreshPromise = (async () => {
    // Rate-limit: max 3 refresh attempts, then give up
    if (refreshCount >= 3) return false;
    refreshCount++;

    try {
      const res = await fetch("/api/auth/refresh", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
      });
      if (!res.ok) return false;

      console.debug("[Auth] Token refreshed silently");
      return true;
    } catch {
      return false;
    } finally {
      // Clear the promise so future calls create a fresh one
      refreshPromise = null;
    }
  })();

  return refreshPromise;
}

async function fetchWithAuth(
  input: RequestInfo | URL,
  init?: RequestInit
): Promise<Response> {
  let res = await globalThis.fetch(input, {
    ...(init ?? {}),
    credentials: "include",
  });

  // 401 → session expired → try silent refresh → retry once
  if (res.status === 401) {
    const refreshed = await attemptSilentRefresh();
    if (refreshed) {
      res = await globalThis.fetch(input, {
        ...(init ?? {}),
        credentials: "include",
      });
    }
  }

  return res;
}

// ─── Query / Mutation client ──────────────────────────────────────────────

const queryClient = new QueryClient();

const redirectToLoginIfUnauthorized = (error: unknown) => {
  if (!(error instanceof TRPCClientError)) return;
  if (typeof window === "undefined") return;

  const isUnauthorized = error.message === UNAUTHED_ERR_MSG;

  if (!isUnauthorized) return;

  window.location.href = getLoginUrl();
};

queryClient.getQueryCache().subscribe(event => {
  if (event.type === "updated" && event.action.type === "error") {
    const error = event.query.state.error;
    // Only redirect to login for UNAUTHORIZED errors, not for other errors
    // Other errors should be handled by individual components
    if (error?.message === UNAUTHED_ERR_MSG) {
      redirectToLoginIfUnauthorized(error);
    }
    console.error("[API Query Error]", error);
  }
});

queryClient.getMutationCache().subscribe(event => {
  if (event.type === "updated" && event.action.type === "error") {
    const error = event.mutation.state.error;
    redirectToLoginIfUnauthorized(error);
    console.error("[API Mutation Error]", error);
  }
});

const trpcClient = trpc.createClient({
  links: [
    httpBatchLink({
      url: "/api/trpc",
      transformer: superjson,
      fetch: fetchWithAuth,
    }),
  ],
});

createRoot(document.getElementById("root")!).render(
  <trpc.Provider client={trpcClient} queryClient={queryClient}>
    <QueryClientProvider client={queryClient}>
      <App />
    </QueryClientProvider>
  </trpc.Provider>
);
