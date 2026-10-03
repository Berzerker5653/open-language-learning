import type { ReactNode } from "react";

export interface AppShellProps {
  /** Short product name rendered in the banner. */
  productName: string;
  /** Primary navigation entries; labels come from pack/profile data, never hardcoded language content. */
  nav: ReadonlyArray<{ id: string; label: string }>;
  /** Optional interactive route switcher rendered in the banner (buttons owned by the caller). */
  routeNav?: ReactNode;
  /** Main content region. */
  children: ReactNode;
}

/**
 * Minimal landmark-based application shell. Uses semantic landmarks so
 * keyboard and screen-reader navigation works from the first commit
 * (docs/11). All visible strings are supplied by callers.
 */
export function AppShell({ productName, nav, routeNav, children }: AppShellProps) {
  return (
    <>
      <a href="#main">Skip to main content</a>
      <header>
        <div className="shell-bar">
          <span className="brand">{productName}</span>
          {nav.length > 0 && (
            <nav aria-label="Primary">
              <ul>
                {nav.map((item) => (
                  <li key={item.id}>
                    <a href={`#${item.id}`}>{item.label}</a>
                  </li>
                ))}
              </ul>
            </nav>
          )}
          {routeNav}
        </div>
      </header>
      <main id="main">
        <div className="page">{children}</div>
      </main>
    </>
  );
}
