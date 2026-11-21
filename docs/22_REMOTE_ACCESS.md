# 22 — Using LTS from your phone (remote access, done safely)

You can use the app from your phone or another computer without copying anything
or exposing anything publicly. There are two safe paths:

- **Tailscale (recommended)** — works from anywhere, even when your phone is on
  mobile data; no ports opened, no public URL.
- **Home Wi-Fi fallback** — one toggle in Settings, nothing to install, works
  only while both devices are on the same network.

Do **not** use a public tunnel to reach your own instance. The box below
explains why in one paragraph.

## The recommended path: Tailscale

Tailscale builds a private, end-to-end-encrypted network between *your own*
devices. Traffic between your phone and your computer is encrypted with
WireGuard; the Tailscale service only coordinates keys — it never sees your
learner data, and neither does anyone else on the internet, because your
devices are invisible from outside. The Personal plan is free for a handful of
users with unlimited devices.

Setup, desktop + phone, about five minutes:

1. **Install Tailscale on the computer that runs LTS** — download it from
   tailscale.com or your distribution's software center.
2. **Install the Tailscale app on your phone** — Apple App Store or Google Play.
3. **Sign in to both with the same account.** That single step is the whole
   pairing: your phone can now see the computer, wherever each of them is.
   (If the computer's sign-in asks for a browser and you don't have one there,
   the sign-in screen shows a QR code — scan it with the phone's Tailscale app.)
4. **Open LTS → Settings → "Connect my phone."** The app detects Tailscale and
   shows an address that looks like
   `https://<your-computer>.<your-network>.ts.net/`.
5. **Type that address into your phone's browser.** It is a real HTTPS address
   with a real certificate, so the browser treats it as a secure page: the
   microphone works, and the page is still reachable only from your own
   devices. No router settings, no firewall holes, no port forwarding — the
   encrypted tunnel takes care of everything.

You can check the pairing at any time: the Tailscale app (or
`tailscale status` on the computer) lists your devices; both should show as
connected.

## Fallback: your home Wi-Fi (LAN toggle + pairing PIN)

If you don't want to install anything and both devices are at home:

1. Open LTS → Settings and turn on **local-network access**. The app shows an
   address like `http://192.168.x.x:<port>/` and a short **pairing PIN**.
2. On your phone, connected to the *same* Wi-Fi, open that address in the
   browser and enter the PIN when asked. The PIN pairs that device so you can
   reconnect without re-entering it.
3. Two honest caveats:
   - The browser blocks microphone features on plain `http://` addresses
     (that is a browser rule, not an app bug). Speaking and listening
     activities show as unavailable there — use the Tailscale path above for
     those.
   - If the page simply won't load, your computer's firewall is probably
     blocking the app's port. Allow that port **from your local network only**
     — for example, on machines using UFW:
     `sudo ufw allow from <your-lan-range> to any port <the-app-port> proto tcp`.
     (Verified 2026-11-21: on a machine with UFW enabled, a LAN probe went from
     blocked to working the moment such a rule was added — and stopped working
     again when it was removed.)

## DO NOT publish your instance

> **Never use Cloudflare Tunnel/Access or Tailscale Funnel as a way to "reach
> my LTS from outside."** Both *publish* your app to the public internet, which
> is a different — and for us, unsafe — thing than remote access to your own
> devices. A Cloudflare Tunnel terminates TLS at Cloudflare's edge, so their
> servers sit in the middle of everything you send (including learner data),
> and the hostname becomes publicly resolvable and permanently listed in
> certificate transparency logs, where automated scanners find it within
> minutes. Tailscale Funnel skips identity entirely — anyone with the link can
> reach the page. Publishing an instance to third parties is a separate
> product decision that has never been made (see
> `docs/18_PUBLIC_CLAIMS_AND_SCOPE.md`); nothing in this guide requires it, and
> a private tailnet never needs a public URL.

## Appendix (advanced, self-maintained): Headscale

Headscale is a free, open-source control plane that speaks the Tailscale
protocol — you run Tailscale's own client apps, but sign in to *your* server
instead of Tailscale's service. It suits users who want zero vendor
dependency; the honest label is that **you are then the sysadmin**: if your
Headscale machine goes offline, new devices can't join and key renewals stall
until it returns.

A one-page sketch:

1. Run Headscale (a single Go binary, BSD-3 licensed) on any always-on Linux
   machine at home — a mini-PC or NAS works.
2. Give it a HTTPS address you control (a reverse proxy like Caddy with a
   Let's Encrypt certificate is the usual route).
3. On each device, the normal Tailscale client signs in with
   `tailscale up --login-server=https://<your-headscale-address>`.
4. Everything else in this guide is identical: same apps, same
   `tailscale serve`, same `https://…ts.net`-style private URLs served to your
   own devices.

This appendix deliberately does not pretend that self-hosting is easy; the
upstream Headscale docs are the authority, and the hosted Tailscale service
above is the supported path.

## How this guide was verified

The exact Tailscale and LAN steps above were dry-run on a real tailnet on
2026-11-21: a served page was fetched from a second device over the private
HTTPS URL, the tailnet IP, and the MagicDNS name (all succeeded), and over the
plain LAN IP — which was blocked by the host firewall until the LAN-scoped
rule described above was added, and blocked again after its removal. Redacted
URLs and the probe log: `state/evidence/REMOTE-ACCESS-DOCS-001/dry-run.md`.
The phone used for the walkthrough steps is enrolled in the same tailnet; it
was offline at dry-run time, so the fetch leg ran from a second computer on
the network instead.
