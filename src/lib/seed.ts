/**
 * Fictional starter filesystem. All hosts, IP addresses and personas are
 * invented; IP ranges follow documentation conventions (RFC 5737 / RFC 1918).
 */

export const HOME = '/home/kali';

type SeedEntry = { path: string; content?: string };

const WELCOME = `# Welcome to KALI WEB OS

This is a **simulated** Linux desktop that runs entirely in your browser.
Nothing here touches your real device, and every file lives in this tab's
IndexedDB sandbox.

## What is real
- The filesystem in this app (create, edit, rename, delete — all persisted).
- Your preferences (theme, accent, language, wallpaper).
- The terminal's command interpreter: a safe allowlist, not a real shell.

## What is simulated
- The user "kali", the host "kali-sim", and everything in /etc.
- CPU, RAM, network topology and lab targets.
- Any Linux-looking output. This is NOT a Kali Linux installation.

## Try this
1. Open the Terminal and type: help
2. Read a file: cat ~/Documents/terminal-cheatsheet.md
3. Explore: tree
4. Learn something defensive: open the Cyber Lab app.

Everything is offline-first. Disconnect the network and reload — the OS
still boots, because the service worker caches the app shell.
`;

const CHEATSHEET = `# Terminal cheat sheet (simulated)

Allowed commands only — the interpreter rejects everything else.

  help                 List every supported command
  pwd                  Print the working directory
  ls [-l] [-a] [path]  List directory contents
  cd [path]            Change directory (~, .., /, names)
  mkdir [-p] <name>    Create a directory
  touch <name>         Create an empty file (or refresh its date)
  cat <file...>        Print file contents
  echo <text>          Print text back
  tree [path]          Show the directory tree
  man <command>        Read the simulated manual page
  whoami / hostname    Identity of this simulation
  uname [-a]           Simulated kernel information
  date                 Browser clock, formatted like Linux
  history              Commands you typed in this session
  clear                Clear the screen

Tips
- Use Tab to complete commands and paths.
- Use ArrowUp / ArrowDown to walk through history.
- Ctrl+L clears, Ctrl+C cancels the current line.
- Output is always simulated Linux output.
`;

const LESSON_1 = `# 01 — Linux fundamentals

A Linux system is a tree of directories starting at / (the root).
Everything else is mounted somewhere below it.

Absolute paths start with /        ->  /home/kali/Documents
Relative paths start from where you are -> Documents

Special directories
  ~    your home directory (/home/kali here)
  .    the current directory
  ..   the parent directory
  /    the root of the tree

Practice in the Terminal:
  pwd
  ls -l ~
  cd Lessons
  tree
  cat 01-linux-basics.md

Remember: in KALI WEB OS every command runs inside a sandboxed interpreter.
There is no real shell behind it.
`;

const LESSON_2 = `# 02 — Permissions

Each file has three permission groups: user (u), group (g), other (o).
For every group you can grant read (r), write (w) and execute (x).

  rwxr-xr--   -> user: rwx, group: r-x, other: r--

Numeric notation
  r = 4, w = 2, x = 1
  rwx = 7, r-x = 5, r-- = 4, so rwxr-xr-- = 754

Defensive thinking
- Least privilege: grant only what the task needs.
- World-writable files are a common misconfiguration.
- Setuid binaries deserve an inventory and a review.
- Never paste "chmod 777" into a production system to "fix" permissions.

There is an interactive permission simulator inside the Cyber Lab app.
`;

const LESSON_3 = `# 03 — Networking basics

Addresses
- IPv4 address: 32 bits, written as four octets, e.g. 10.0.42.10
- Private ranges: 10.0.0.0/8, 172.16.0.0/12, 192.168.0.0/16
- Loopback: 127.0.0.1 — the machine talking to itself
- A subnet mask (/24 = 255.255.255.0) separates network and host bits

Common services and default ports
  22 SSH, 53 DNS, 80 HTTP, 443 HTTPS, 3306 MySQL, 5432 PostgreSQL

For defenders
- Know your own inventory before you look at anyone else's.
- Segmentation limits how far a single mistake can spread.
- Encrypted management access (SSH/HTTPS) should be the default.

KALI WEB OS never scans networks. Its Network app only shows information
your browser chooses to expose, plus an invented topology.
`;

const LESSON_4 = `# 04 — Log analysis

A log line is evidence. Read it as: who, what, when, where, result.

Example (fictional):
  Jul 12 09:14:02 gw-sim sshd[4211]: Failed password for invalid user admin
  from 203.0.113.24 port 51022 ssh2

What matters
- A burst of failures from one source in a short window.
- Successful logins right after many failures (possible success after guessing).
- Logins from unusual hours or unusual source networks.
- Accounts that were disabled but still appear active.

What does NOT prove an attack
- A single failure: users mistype passwords.
- An unfamiliar IP: it may be a legitimate partner network.

There is a guided log exercise in the Cyber Lab. Every entry is fictional.
`;

const LESSON_5 = `# 05 — Defensive security

Defense is a set of habits, not a single tool.

1. Patch deliberately: track versions, read advisories, roll out in stages.
2. Least privilege: separate accounts, minimal sudo, service accounts locked down.
3. Detection: keep logs, centralize them, alert on a few high-value signals.
4. Backups: 3 copies, 2 media, 1 offsite — and restore drills.
5. Segmentation: a compromised kiosk should not reach the database.
6. Documentation: an unknown asset is an unmanaged risk.
7. Humans: phishing-resistant authentication and simple reporting paths.

This lesson set is educational and deliberately non-offensive: no exploitation,
no credential theft, no evasion. Practice defensively.
`;

const AUTH_LOG = `Jul 12 08:59:12 kali-sim systemd-logind[812]: New session 4 of user kali.
Jul 12 09:02:44 kali-sim sshd[4201]: Accepted publickey for kali from 10.0.42.15 port 44210 ssh2
Jul 12 09:04:09 kali-sim sshd[4202]: Accepted password for labuser from 10.0.42.18 port 44312 ssh2
Jul 12 09:11:31 kali-sim sshd[4207]: Failed password for invalid user admin from 203.0.113.24 port 51022 ssh2
Jul 12 09:11:39 kali-sim sshd[4208]: Failed password for invalid user admin from 203.0.113.24 port 51026 ssh2
Jul 12 09:11:47 kali-sim sshd[4209]: Failed password for invalid user root from 203.0.113.24 port 51030 ssh2
Jul 12 09:11:58 kali-sim sshd[4210]: Failed password for invalid user oracle from 203.0.113.24 port 51033 ssh2
Jul 12 09:12:05 kali-sim sshd[4211]: connection closed by authenticating user 203.0.113.24 [preauth]
Jul 12 09:31:02 kali-sim sudo[4310]:    kali : TTY=pts/0 ; PWD=/home/kali ; USER=root ; COMMAND=/usr/bin/apt update
Jul 12 10:04:55 kali-sim sshd[4402]: Accepted publickey for kali from 10.0.42.15 port 45122 ssh2
Jul 12 10:42:10 kali-sim systemd[1]: Started Daily apt download activities.
Jul 12 11:15:37 kali-sim sshd[4510]: Failed password for labuser from 10.0.42.55 port 39110 ssh2
Jul 12 11:15:52 kali-sim sshd[4511]: Accepted password for labuser from 10.0.42.55 port 39116 ssh2
Jul 12 12:02:19 kali-sim cron[4611]: (root) CMD (run-parts /etc/cron.hourly)
Jul 12 13:40:02 kali-sim kernel: [ 5541.220431] eth0: link up, 1000 Mbps, full duplex
`;

const WEB_LOG = `10.0.42.15 - - [12/Jul/2026:09:00:02 +0000] "GET / HTTP/1.1" 200 1043
10.0.42.15 - - [12/Jul/2026:09:00:03 +0000] "GET /assets/app.css HTTP/1.1" 200 8812
10.0.42.18 - - [12/Jul/2026:09:02:11 +0000] "GET /login HTTP/1.1" 200 2210
203.0.113.24 - - [12/Jul/2026:09:22:40 +0000] "GET /wp-login.php HTTP/1.1" 404 512
203.0.113.24 - - [12/Jul/2026:09:22:41 +0000] "GET /.env HTTP/1.1" 404 512
203.0.113.24 - - [12/Jul/2026:09:22:43 +0000] "GET /admin HTTP/1.1" 404 512
10.0.42.40 - - [12/Jul/2026:10:10:10 +0000] "GET /reports/weekly HTTP/1.1" 200 9932
10.0.42.40 - - [12/Jul/2026:10:10:12 +0000] "GET /reports/weekly/export HTTP/1.1" 403 221
`;

const HOSTS = `127.0.0.1        localhost
127.0.1.1        kali-sim
10.0.42.1        gw-sim.lab.local   gw-sim
10.0.42.10       files.lab.local    files
10.0.42.20       web.lab.local      web
10.0.42.30       db.lab.local       db
10.0.42.15       ws-01.lab.local    ws-01
# All addresses are fictional lab addresses (RFC 1918 / RFC 5737).
`;

const OS_RELEASE = `PRETTY_NAME="KALI WEB OS (browser simulation)"
NAME="Kali Web OS Simulation"
VERSION_ID="1.0"
VERSION="1.0 (simulated)"
ID=kali-web-os
ID_LIKE=debian
HOME_URL="about:blank"
SUPPORT_URL="about:blank"
BUG_REPORT_URL="about:blank"
`;

const MOTD = `The programs included with this simulation are entirely fictional.
This is a browser sandbox inspired by a Linux desktop — not a real
Kali Linux installation and not connected to any operating system.

Welcome to KALI WEB OS.
`;

const SYSTEM_LOG = `Jul 12 08:58:01 kali-sim kernel: [    0.000000] Linux version 6.6.9-sim (lab@sim) #1 SMP PREEMPT_DYNAMIC
Jul 12 08:58:02 kali-sim kernel: [    0.412090] Memory: 2048M available (simulated)
Jul 12 08:58:03 kali-sim systemd[1]: Reached target Local File Systems.
Jul 12 08:58:04 kali-sim systemd[1]: Started Simulation Shell (safe interpreter).
Jul 12 08:58:05 kali-sim systemd[1]: Reached target Multi-User System.
Jul 12 09:02:10 kali-sim NetworkManager[640]: <info> [dhcp] state changed: bound (10.0.42.15/24)
Jul 12 09:02:11 kali-sim firewalld[712]: INFO: default zone set to drop
Jul 12 09:02:12 kali-sim auditd[755]: simulation audit daemon started (no host access)
Jul 12 09:31:02 kali-sim sudo[4310]: pam_unix(sudo:session): session opened for user root by kali(uid=1000)
`;

const NOTES = `Lab notes — week 28

- Reviewed firewall rules on gw-sim. Default zone is drop, which is good.
- TODO: document the backup restore procedure and actually schedule a drill.
- The weekly report export returns 403 for labuser. Investigate the role mapping.
- Reminder: all hosts and IPs in these notes are fictional.
`;

export const seedEntries: SeedEntry[] = [
  { path: '/home/kali' },
  { path: '/home/kali/Documents' },
  { path: '/home/kali/Documents/welcome.md', content: WELCOME },
  { path: '/home/kali/Documents/terminal-cheatsheet.md', content: CHEATSHEET },
  { path: '/home/kali/Lessons' },
  { path: '/home/kali/Lessons/01-linux-basics.md', content: LESSON_1 },
  { path: '/home/kali/Lessons/02-permissions.md', content: LESSON_2 },
  { path: '/home/kali/Lessons/03-networking-basics.md', content: LESSON_3 },
  { path: '/home/kali/Lessons/04-log-analysis.md', content: LESSON_4 },
  { path: '/home/kali/Lessons/05-defensive-security.md', content: LESSON_5 },
  { path: '/home/kali/Logs' },
  { path: '/home/kali/Logs/auth.log', content: AUTH_LOG },
  { path: '/home/kali/Logs/web-access.log', content: WEB_LOG },
  { path: '/home/kali/projects' },
  { path: '/home/kali/projects/notes.txt', content: NOTES },
  { path: '/home/kali/Downloads' },
  { path: '/home/kali/Pictures' },
  { path: '/etc' },
  { path: '/etc/hostname', content: 'kali-sim\n' },
  { path: '/etc/hosts', content: HOSTS },
  { path: '/etc/os-release', content: OS_RELEASE },
  { path: '/etc/motd', content: MOTD },
  { path: '/var' },
  { path: '/var/log' },
  { path: '/var/log/system.log', content: SYSTEM_LOG },
  { path: '/tmp' },
  { path: '/opt' },
  { path: '/opt/README', content: 'Optional software lives here in a real system.\nThis directory is simulated and empty.\n' },
];
