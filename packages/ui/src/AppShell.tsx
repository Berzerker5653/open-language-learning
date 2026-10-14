import type { ReactNode } from "react";
import { PackDirectionProvider } from "./pack-direction.js";

export interface AppShellProps {
  /** Short product name rendered in the banner. */
  productName: string;
  /** Primary navigation entries; labels come from pack/profile data, never hardcoded language content. */
  nav: ReadonlyArray<{ id: string; label: string }>;
  /** Optional interactive route switcher rendered in the banner (buttons owned by the caller). */
  routeNav?: ReactNode;
  /** Main content region. */
  children: ReactNode;
  /**
   * Writing direction of the active language pack's content (ADR-0029), from
   * that pack's manifest `capabilities.rtl`. It reaches only the pack-text
   * containers inside the content region through the direction context; the
   * banner, brand and route navigation stay LTR whatever it says.
   */
  packDirection?: "ltr" | "rtl";
  /** Manifest locale of that pack, applied as `lang` on pack-text elements. */
  packLocale?: string;
}

/**
 * Minimal landmark-based application shell. Uses semantic landmarks so
 * keyboard and screen-reader navigation works from the first commit
 * (docs/11). All visible strings are supplied by callers.
 */
export function AppShell({
  productName,
  nav,
  routeNav,
  children,
  packDirection,
  packLocale,
}: AppShellProps) {
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
        <PackDirectionProvider rtl={packDirection === "rtl"} locale={packLocale}>
          <div className="page">{children}</div>
        </PackDirectionProvider>
      </main>
    </>
  );
}
