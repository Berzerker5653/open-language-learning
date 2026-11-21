# REMOTE-ACCESS-DOCS-001 — acceptance dry run (2026-11-21)

Goal from the card: follow the guide's steps end-to-end on a second device via
the tailnet already in place, record URLs used (redacted), no secrets in docs.

## Setup

- Desktop side: GamingPC (`gamingpc`), tailscale 1.x on /usr/sbin/tailscale.
  Tailnet devices per `tailscale status`: gamingpc (linux), omarchy (linux,
  active), cachyos-x8664, hunters-s24-ultra (android — **offline at dry-run
  time**), laptop (offline 18d).
- Stand-in for serve mode: `python3 -m http.server 8788` in a scratch dir
  (WEB-SERVE-001's lane was uncommitted sibling WIP at dry-run time; the
  guide's mechanics — tailscale serve, LAN + firewall, HTTPS semantics — are
  identical whatever runs on the port).
- `sudo tailscale serve --bg --https=443 8788` → serve config active
  (serve config requires root; turned off and verified at the end).

## Probes from the second device (omarchy, active tailnet peer)

| path in the guide | URL used (redacted) | result |
| --- | --- | --- |
| ts.net HTTPS (step 5) | `https://gamingpc.taila…d.ts.net/` | 200, exact body match (`curl` from omarchy) |
| tailnet IP (sanity) | `http://100.77.9.119:8788/` | 200 |
| MagicDNS (sanity) | `http://gamingpc:8788/` | 200 (machine has a resolved/NetworkManager health warning — MagicDNS still worked) |
| LAN fallback | `http://192.168.4.69:8788/` | **000 blocked** (UFW active, default deny; ping OK) |
| LAN after firewall rule | same URL | **200** after `sudo ufw allow from 192.168.4.0/22 to any port 8788 proto tcp` |

## Environment restored after the run

- `sudo tailscale serve --https=443 off` → `tailscale serve status` = "No serve config".
- Stand-in http.server process killed.
- All test firewall rules deleted; `ufw status numbered` back to the exact
  8 pre-existing rules (4 sunshine, 8088 Azbuka, 8791, 8793); zero 8788 rows
  in `/etc/ufw/user.rules`.
- One mishap recorded honestly: a `ufw --force delete 1` mid-cleanup was aimed
  at the wrong rule number; re-inspection showed rules [1]-[9] intact (UFW
  `delete deny 8788`-inserted rules were already gone from the earlier
  `deny` addition), and the three 8788 rows were then deleted bottom-up and
  re-verified. No pre-existing rule was lost.

## Phone leg

hunters-s24-ultra is enrolled in the tailnet (android, seen 5h prior), proving
the guide's phone-join steps produce a real device row; it was offline during
the dry run, so the fetch leg ran from omarchy. This is the one leg a human
should redo on the physical phone (release-day owner pass), and the guide's
"verified" section says so in plain words.
