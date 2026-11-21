# REMOTE-ACCESS-SURVEY-2026-11 — how users reach their own instance from outside

Decision 2026-11-21 (owner asked for alternatives survey before locking Tailscale). Sources: 2026 mesh-VPN licensing comparison (wz-it), Cloudflare-vs-Tailscale architecture analyses (cloudflarezerotrust.org, dev.to, rakibulinux, homelabhaven), community threads.

## Decision
1. **Primary: Tailscale.** WireGuard mesh, E2E-encrypted payloads (control plane holds only public keys; DERP relays cannot decrypt); free Personal plan ~6 users/unlimited devices; first-class iOS/Android clients; CGNAT-safe. Fits the project rule that no third party ever sees learner data.
2. **Advanced appendix: Headscale** (BSD-3 self-hosted Tailscale control plane, ~45K stars Nov 2026) for users who want zero vendor dependency; same clients, self-maintained.
3. **BANNED in our docs (marked unsafe-for-default, never recommended):** Cloudflare Tunnel / Access as primary path (edge TLS termination = Cloudflare sees plaintext; hostname publicly resolvable + probeable; cert-transparency permanence); Tailscale Funnel (public exposure, beta, no identity). Publishing is a different product decision, not remote self-access.
4. Runner-up noted: NetBird (fully open-source AGPL control plane, WireGuard) — acceptable alternative, smaller ecosystem; ZeroTier rejected (layer-2 custom protocol, split licensing); raw WireGuard rejected (setup burden contradicts easy-setup goal).

## Product shape (cards)
- Settings wizard: 'Connect my phone' — detect Tailscale (or walk install), QR pairing to join the user's tailnet, show the https ts.net serve URL (tailscale serve gives real HTTPS certs with zero public exposure).
- LAN one-click toggle + pairing PIN (separate earlier decision) remains the zero-install fallback.
- Docs card REMOTE-ACCESS-DOCS-001 carries the user guide (Tailscale path primary, Headscale appendix, explicit DO-NOT-DO box for public publishing).
