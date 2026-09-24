import { lazy, Suspense } from "react";

// Only `vite` (dev server) runs in development mode; `vite build` is always "production" mode, even
// when NODE_ENV=development leaks into the build environment — which is what shipped the devtools
// panel to the deployed site. Lazy, so the devtools code isn't even in the production bundle.
const ReactQueryDevtools =
  import.meta.env.MODE === "development"
    ? lazy(() =>
        import("@tanstack/react-query-devtools").then((m) => ({ default: m.ReactQueryDevtools }))
      )
    : null;

const QueryDevtools = () =>
  ReactQueryDevtools && (
    <Suspense fallback={null}>
      <ReactQueryDevtools initialIsOpen={false} />
    </Suspense>
  );

export default QueryDevtools;
