import type { ReactNode } from "react";

export interface AppShellProps {
  /** Short product name rendered in the banner. */
  productName: string;
  /** Primary navigation entries; labels come from pack/profile data, never hardcoded language content. */
  nav: ReadonlyArray<{ id: string; label: string }>;
  /** Main content region. */
  children: ReactNode;
}

/**
 * Minimal landmark-based application shell. Uses semantic landmarks so
 * keyboard and screen-reader navigation works from the first commit
 * (docs/11). All visible strings are supplied by callers.
 */
export function AppShell({ productName, nav, children }: AppShellProps) {
  return (
    <>
      <a href="#main">Skip to main content</a>
      <header>
        <span>{productName}</span>
        <nav aria-label="Primary">
          <ul>
            {nav.map((item) => (
              <li key={item.id}>
                <a href={`#${item.id}`}>{item.label}</a>
              </li>
            ))}
          </ul>
        </nav>
      </header>
      <main id="main">{children}</main>
    </>
  );
}
