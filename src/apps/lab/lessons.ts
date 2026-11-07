import type { LocalizedText } from '../../lib/localized';

export type LabIcon = 'linux' | 'permissions' | 'network' | 'logs' | 'defense';
export type LabExercise = 'permissions' | 'logs' | null;

export interface LessonSection {
  heading: LocalizedText;
  body: LocalizedText;
  bullets?: LocalizedText[];
  compare?: { left: LocalizedText; right: LocalizedText };
}

export interface QuizQuestion {
  id: string;
  prompt: LocalizedText;
  options: LocalizedText[];
  correct: number;
  explanation: LocalizedText;
}

export interface Lesson {
  id: string;
  number: number;
  icon: LabIcon;
  level: 'beginner' | 'intermediate';
  minutes: number;
  title: LocalizedText;
  summary: LocalizedText;
  sections: LessonSection[];
  exercise: LabExercise;
  terminalTask?: { command: string; text: LocalizedText };
  questions: QuizQuestion[];
}

export const LESSONS: Lesson[] = [
  {
    id: 'linux-basics',
    number: 1,
    icon: 'linux',
    level: 'beginner',
    minutes: 6,
    title: { en: 'Linux fundamentals', fr: 'Fondamentaux de Linux' },
    summary: {
      en: 'Navigate a Linux filesystem: the root tree, absolute and relative paths, and the three commands you will use every day.',
      fr: 'Parcourez une arborescence Linux : la racine, les chemins absolus et relatifs, et les trois commandes du quotidien.',
    },
    sections: [
      {
        heading: { en: 'Everything hangs from /', fr: 'Tout part de /' },
        body: {
          en: 'A Linux system is a single tree of directories. The top of the tree is written / and is called the root. Device files, configuration, programs and your personal files all live somewhere below it.',
          fr: 'Un système Linux est une arborescence unique de dossiers. Le sommet s’écrit / et s’appelle la racine. Fichiers de périphériques, configuration, programmes et fichiers personnels vivent tous en dessous.',
        },
        bullets: [
          { en: '/home/kali — your personal files (called ~ in a shell)', fr: '/home/kali — vos fichiers personnels (noté ~ dans un shell)' },
          { en: '/etc — configuration files', fr: '/etc — fichiers de configuration' },
          { en: '/var/log — logs written by services', fr: '/var/log — journaux écrits par les services' },
          { en: '/tmp — temporary files', fr: '/tmp — fichiers temporaires' },
        ],
      },
      {
        heading: { en: 'Absolute vs relative paths', fr: 'Chemins absolus et relatifs' },
        body: {
          en: 'An absolute path starts at / and works from anywhere. A relative path is interpreted from your current directory. The special names . (here), .. (parent) and ~ (home) are shortcuts, not magic.',
          fr: 'Un chemin absolu part de / et fonctionne depuis n’importe où. Un chemin relatif est interprété depuis le dossier courant. Les noms spéciaux . (ici), .. (parent) et ~ (personnel) sont des raccourcis, pas de la magie.',
        },
        compare: {
          left: { en: '/home/kali/Documents/welcome.md', fr: '/home/kali/Documents/welcome.md' },
          right: { en: 'cd Documents   →   cat welcome.md', fr: 'cd Documents   →   cat welcome.md' },
        },
      },
      {
        heading: { en: 'Three commands worth memorising', fr: 'Trois commandes à retenir' },
        body: {
          en: 'pwd prints where you are, ls lists what is here, and cd moves you somewhere else. Everything else builds on that vocabulary. In KALI WEB OS these commands are safe simulations — they never leave the browser.',
          fr: 'pwd affiche où vous êtes, ls liste ce qui s’y trouve et cd vous déplace. Tout le reste s’appuie sur ce vocabulaire. Dans KALI WEB OS, ces commandes sont des simulations sûres — elles ne quittent jamais le navigateur.',
        },
      },
    ],
    exercise: null,
    terminalTask: { command: 'ls -la ~', text: { en: 'List your home directory with hidden entries.', fr: 'Listez votre dossier personnel avec les entrées cachées.' } },
    questions: [
      {
        id: 'lb-1',
        prompt: { en: 'Which path is absolute?', fr: 'Quel chemin est absolu ?' },
        options: [
          { en: 'Documents/notes.txt', fr: 'Documents/notes.txt' },
          { en: '/etc/hostname', fr: '/etc/hostname' },
          { en: '../logs/auth.log', fr: '../logs/auth.log' },
          { en: '~/Documents', fr: '~/Documents' },
        ],
        correct: 1,
        explanation: {
          en: 'Absolute paths begin with / — they are valid from any working directory. ~ is expanded by the shell, so it behaves like an absolute path but is usually described as shell expansion.',
          fr: 'Les chemins absolus commencent par / — ils sont valides depuis n’importe quel dossier. ~ est étendu par le shell : il se comporte comme un absolu, mais relève de l’expansion du shell.',
        },
      },
      {
        id: 'lb-2',
        prompt: { en: 'You are in /home/kali/Lessons and type cd .. — where are you?', fr: 'Vous êtes dans /home/kali/Lessons et tapez cd .. — où êtes-vous ?' },
        options: [
          { en: '/', fr: '/' },
          { en: '/home/kali', fr: '/home/kali' },
          { en: '/home', fr: '/home' },
          { en: 'The home directory of the previous user', fr: 'Le dossier personnel de l’utilisateur précédent' },
        ],
        correct: 1,
        explanation: {
          en: '.. means "the parent of the current directory". /home/kali/Lessons → /home/kali.',
          fr: '.. signifie « le parent du dossier courant ». /home/kali/Lessons → /home/kali.',
        },
      },
    ],
  },
  {
    id: 'permissions',
    number: 2,
    icon: 'permissions',
    level: 'beginner',
    minutes: 8,
    title: { en: 'Permissions & least privilege', fr: 'Permissions et moindre privilège' },
    summary: {
      en: 'Read the nine permission bits, convert them to numbers, and apply least privilege instead of "chmod 777 everything".',
      fr: 'Lisez les neuf bits de permissions, convertissez-les en chiffres et appliquez le moindre privilège plutôt que « chmod 777 ».',
    },
    sections: [
      {
        heading: { en: 'Nine bits, three groups', fr: 'Neuf bits, trois groupes' },
        body: {
          en: 'Every file carries permissions for its owner (u), its group (g) and everyone else (o). Each group has read (r), write (w) and execute (x) bits, displayed as a string such as rwxr-x---.',
          fr: 'Chaque fichier porte des permissions pour son propriétaire (u), son groupe (g) et tous les autres (o). Chaque groupe possède les bits lecture (r), écriture (w) et exécution (x), affichés sous forme de chaîne comme rwxr-x---.',
        },
        bullets: [
          { en: 'r = 4, w = 2, x = 1 — add them per group', fr: 'r = 4, w = 2, x = 1 — additionnez-les par groupe' },
          { en: 'rwx = 7, rw- = 6, r-x = 5, r-- = 4', fr: 'rwx = 7, rw- = 6, r-x = 5, r-- = 4' },
          { en: 'rwxr-x--- = 750, rw-r----- = 640, rw-r--r-- = 644', fr: 'rwxr-x--- = 750, rw-r----- = 640, rw-r--r-- = 644' },
        ],
      },
      {
        heading: { en: 'Why 777 is a red flag', fr: 'Pourquoi 777 est un signal d’alerte' },
        body: {
          en: 'Mode 777 lets every account on the system modify and execute the file. On a shared server that is an invitation to tampering. Fix the actual ownership problem instead of opening the file to the world.',
          fr: 'Le mode 777 permet à tous les comptes du système de modifier et d’exécuter le fichier. Sur un serveur partagé, c’est une invitation à la falsification. Corrigez le vrai problème de propriété au lieu d’ouvrir le fichier au monde.',
        },
      },
      {
        heading: { en: 'Least privilege in practice', fr: 'Le moindre privilège en pratique' },
        body: {
          en: 'Ask three questions: who must read this? who must change it? does it need to be executable at all? Most configuration and report files need neither world read nor execute. Audit setuid binaries and world-writable directories regularly.',
          fr: 'Posez trois questions : qui doit lire ceci ? qui doit le modifier ? doit-il être exécutable ? La plupart des fichiers de configuration et de rapports n’ont besoin ni d’être lisibles par tous ni d’être exécutables. Auditez régulièrement les binaires setuid et les dossiers modifiables par tous.',
        },
      },
    ],
    exercise: 'permissions',
    terminalTask: { command: 'cat ~/Lessons/02-permissions.md', text: { en: 'Read the permissions lesson file in the virtual filesystem.', fr: 'Lisez la leçon sur les permissions dans le système de fichiers virtuel.' } },
    questions: [
      {
        id: 'perm-1',
        prompt: { en: 'What does mode 640 allow?', fr: 'Que permet le mode 640 ?' },
        options: [
          { en: 'Owner read/write, group read, others nothing', fr: 'Propriétaire lecture/écriture, groupe lecture, autres rien' },
          { en: 'Everyone read and write', fr: 'Tout le monde lecture et écriture' },
          { en: 'Owner read only, group write', fr: 'Propriétaire lecture seule, groupe écriture' },
          { en: 'Owner execute, group read', fr: 'Propriétaire exécution, groupe lecture' },
        ],
        correct: 0,
        explanation: {
          en: '6 = rw- for the owner, 4 = r-- for the group, 0 = --- for others. It is a common choice for files only a team may read.',
          fr: '6 = rw- pour le propriétaire, 4 = r-- pour le groupe, 0 = --- pour les autres. C’est un choix courant pour des fichiers lisibles seulement par une équipe.',
        },
      },
      {
        id: 'perm-2',
        prompt: { en: 'A web server cannot read its own content files. What is the safest fix?', fr: 'Un serveur web ne peut pas lire ses fichiers. Quelle est la correction la plus sûre ?' },
        options: [
          { en: 'chmod 777 on the whole directory', fr: 'chmod 777 sur tout le dossier' },
          { en: 'Give read access to the service account that runs the server', fr: 'Donner l’accès en lecture au compte de service qui exécute le serveur' },
          { en: 'Run the web server as root', fr: 'Exécuter le serveur web en root' },
          { en: 'Make the files executable by everyone', fr: 'Rendre les fichiers exécutables par tous' },
        ],
        correct: 1,
        explanation: {
          en: 'Granting the minimum access to the specific service account solves the problem without exposing the files to every user. Running a service as root or using 777 increases the blast radius.',
          fr: 'Accorder l’accès minimal au compte de service concerné résout le problème sans exposer les fichiers à tous. Exécuter le service en root ou utiliser 777 augmente l’impact en cas d’incident.',
        },
      },
    ],
  },
  {
    id: 'network-basics',
    number: 3,
    icon: 'network',
    level: 'beginner',
    minutes: 7,
    title: { en: 'Networking concepts', fr: 'Concepts réseau' },
    summary: {
      en: 'Addresses, private ranges, ports and segmentation — the vocabulary defenders use to reason about reachability.',
      fr: 'Adresses, plages privées, ports et segmentation — le vocabulaire des défenseurs pour raisonner sur l’accessibilité.',
    },
    sections: [
      {
        heading: { en: 'Addresses identify interfaces, not people', fr: 'Les adresses identifient des interfaces, pas des personnes' },
        body: {
          en: 'An IPv4 address is 32 bits, written as four numbers from 0 to 255. A /24 mask means "the first three octets are the network, the last one is the host". DHCP leases addresses for a while, so an address is rarely proof of identity.',
          fr: 'Une adresse IPv4 fait 32 bits, écrite en quatre nombres de 0 à 255. Un masque /24 signifie « les trois premiers octets sont le réseau, le dernier est l’hôte ». Le DHCP attribue les adresses temporairement : une adresse n’est presque jamais une preuve d’identité.',
        },
        bullets: [
          { en: '10.0.0.0/8, 172.16.0.0/12, 192.168.0.0/16 — private ranges', fr: '10.0.0.0/8, 172.16.0.0/12, 192.168.0.0/16 — plages privées' },
          { en: '127.0.0.1 — loopback, the machine itself', fr: '127.0.0.1 — boucle locale, la machine elle-même' },
          { en: '203.0.113.0/24 — documentation range; never a real target', fr: '203.0.113.0/24 — plage de documentation ; jamais une cible réelle' },
        ],
      },
      {
        heading: { en: 'Ports are doors', fr: 'Les ports sont des portes' },
        body: {
          en: 'A port number selects a service on a host. 22 is usually SSH, 80 HTTP, 443 HTTPS, 53 DNS. Knowing the default port is useful, but only the listening socket matters: services can be moved to any port.',
          fr: 'Un numéro de port sélectionne un service sur un hôte. 22 est souvent SSH, 80 HTTP, 443 HTTPS, 53 DNS. Connaître les ports par défaut est utile, mais seule la socket en écoute compte : un service peut écouter sur n’importe quel port.',
        },
      },
      {
        heading: { en: 'Segmentation limits mistakes', fr: 'La segmentation limite les erreurs' },
        body: {
          en: 'Put databases, management interfaces and user workstations on different segments. A firewall policy between them means one compromised laptop cannot reach everything. A browser cannot see any of this: it cannot scan your LAN, read ARP tables or run ping. KALI WEB OS never pretends otherwise.',
          fr: 'Placez bases de données, interfaces d’administration et postes utilisateurs sur des segments différents. Une politique de pare-feu entre eux évite qu’un portable compromis atteigne tout. Un navigateur ne voit rien de tout cela : il ne peut ni analyser votre réseau local, ni lire les tables ARP, ni exécuter ping. KALI WEB OS ne prétend pas le contraire.',
        },
      },
    ],
    exercise: null,
    terminalTask: { command: 'cat /etc/hosts', text: { en: 'Inspect the fictional host table of this simulation.', fr: 'Inspectez la table d’hôtes fictive de cette simulation.' } },
    questions: [
      {
        id: 'net-1',
        prompt: { en: 'Which address is in a private IPv4 range?', fr: 'Quelle adresse appartient à une plage IPv4 privée ?' },
        options: [
          { en: '203.0.113.24', fr: '203.0.113.24' },
          { en: '10.0.42.20', fr: '10.0.42.20' },
          { en: '127.0.0.1', fr: '127.0.0.1' },
          { en: '198.51.100.7', fr: '198.51.100.7' },
        ],
        correct: 1,
        explanation: {
          en: '10.0.0.0/8 is private. 203.0.113.0/24 and 198.51.100.0/24 are documentation ranges, and 127.0.0.0/8 is loopback — all three are non-routable, but not "private" in the DHCP sense.',
          fr: '10.0.0.0/8 est privée. 203.0.113.0/24 et 198.51.100.0/24 sont des plages de documentation, et 127.0.0.0/8 est la boucle locale — toutes non routables sur Internet, mais pas « privées » au sens DHCP.',
        },
      },
      {
        id: 'net-2',
        prompt: { en: 'A laptop and a database are on the same flat network. What reduces the impact of a compromised laptop?', fr: 'Un portable et une base de données sont sur le même réseau plat. Qu’est-ce qui réduit l’impact d’un portable compromis ?' },
        options: [
          { en: 'Moving the database to an isolated segment with firewall rules', fr: 'Placer la base sur un segment isolé avec des règles de pare-feu' },
          { en: 'Changing the laptop wallpaper', fr: 'Changer le fond d’écran du portable' },
          { en: 'Using a longer Wi-Fi password only', fr: 'Utiliser uniquement un mot de passe Wi-Fi plus long' },
          { en: 'Disabling logging to save disk space', fr: 'Désactiver les journaux pour économiser du disque' },
        ],
        correct: 0,
        explanation: {
          en: 'Segmentation plus default-deny rules constrains lateral movement. Longer Wi-Fi passwords help authentication but do nothing once an endpoint is compromised.',
          fr: 'La segmentation et des règles de refus par défaut limitent les déplacements latéraux. Un mot de passe Wi-Fi plus long aide l’authentification mais ne sert à rien une fois un poste compromis.',
        },
      },
    ],
  },
  {
    id: 'log-analysis',
    number: 4,
    icon: 'logs',
    level: 'intermediate',
    minutes: 9,
    title: { en: 'Log analysis for defenders', fr: 'Analyse de journaux pour défenseurs' },
    summary: {
      en: 'Read a log line as evidence, spot repeated failures from one source, and separate suspicion from proof.',
      fr: 'Lisez une ligne de journal comme une preuve, repérez les échecs répétés d’une même source et distinguez soupçon et preuve.',
    },
    sections: [
      {
        heading: { en: 'Anatomy of a line', fr: 'Anatomie d’une ligne' },
        body: {
          en: 'A typical SSH line contains a timestamp, host, service and process id, then the event. Ask: who, what, when, where and what was the result? A failed login is not an incident on its own; a pattern is.',
          fr: 'Une ligne SSH typique contient un horodatage, l’hôte, le service et le PID, puis l’événement. Demandez-vous : qui, quoi, quand, où et quel résultat ? Un échec isolé n’est pas un incident ; un motif l’est.',
        },
      },
      {
        heading: { en: 'Signals worth escalating', fr: 'Signaux à escalader' },
        body: {
          en: 'Repeated failures for several usernames from one address in a short window. A success immediately after many failures. Access at an unusual hour from an unusual network. A disabled account that still appears in logs.',
          fr: 'Des échecs répétés sur plusieurs comptes depuis une même adresse en peu de temps. Un succès juste après de nombreux échecs. Un accès à une heure ou depuis un réseau inhabituel. Un compte désactivé qui apparaît encore dans les journaux.',
        },
      },
      {
        heading: { en: 'Correlation beats panic', fr: 'La corrélation plutôt que la panique' },
        body: {
          en: 'Cross-check application logs, authentication logs and firewall logs before drawing a conclusion. NTP matters: timestamps from different hosts are only comparable if their clocks agree. Document what you observed, what you inferred and what you still do not know.',
          fr: 'Croisez journaux applicatifs, journaux d’authentification et journaux de pare-feu avant de conclure. NTP compte : des horodatages d’hôtes différents ne sont comparables que si leurs horloges sont synchronisées. Documentez ce que vous avez observé, ce que vous en déduisez et ce qui reste inconnu.',
        },
      },
    ],
    exercise: 'logs',
    terminalTask: { command: 'cat ~/Logs/auth.log', text: { en: 'Read the fictional authentication log and look for a pattern.', fr: 'Lisez le journal d’authentification fictif et cherchez un motif.' } },
    questions: [
      {
        id: 'log-1',
        prompt: { en: 'Six failed SSH logins for different usernames from 203.0.113.24 in 40 seconds. What is the most reasonable first step?', fr: 'Six échecs SSH sur des comptes différents depuis 203.0.113.24 en 40 secondes. Quelle est la première étape la plus raisonnable ?' },
        options: [
          { en: 'Ignore it: failed logins are always noise', fr: 'Ignorer : les échecs sont toujours du bruit' },
          { en: 'Investigate the pattern and check whether any login succeeded', fr: 'Examiner le motif et vérifier si une connexion a réussi' },
          { en: 'Reset every user password immediately without review', fr: 'Réinitialiser tous les mots de passe sans examen' },
          { en: 'Block the whole internet permanently', fr: 'Bloquer définitivement tout Internet' },
        ],
        correct: 1,
        explanation: {
          en: 'The pattern is suspicious but not proof. Verify success/failure, source reputation, exposed services and account state before acting. Blocking may follow, but only after understanding the event.',
          fr: 'Le motif est suspect mais pas une preuve. Vérifiez les succès/échecs, la source, les services exposés et l’état des comptes avant d’agir. Un blocage peut suivre, mais après compréhension.',
        },
      },
      {
        id: 'log-2',
        prompt: { en: 'Which detail most helps you correlate logs from two different servers?', fr: 'Quel détail aide le plus à corréler les journaux de deux serveurs différents ?' },
        options: [
          { en: 'Their matching file sizes', fr: 'La taille identique des fichiers' },
          { en: 'Synchronised timestamps (NTP)', fr: 'Des horodatages synchronisés (NTP)' },
          { en: 'The number of lines in each file', fr: 'Le nombre de lignes de chaque fichier' },
          { en: 'The colour of the log viewer', fr: 'La couleur de la visionneuse de journaux' },
        ],
        correct: 1,
        explanation: {
          en: 'Without a shared time base, ordering events across hosts is guesswork. NTP synchronisation makes correlation defensible.',
          fr: 'Sans base de temps commune, ordonner les événements entre hôtes relève de la devinette. La synchronisation NTP rend la corrélation défendable.',
        },
      },
    ],
  },
  {
    id: 'defensive-security',
    number: 5,
    icon: 'defense',
    level: 'intermediate',
    minutes: 8,
    title: { en: 'Defensive security habits', fr: 'Habitudes de sécurité défensive' },
    summary: {
      en: 'Patch management, backups you have actually restored, detection, segmentation and a calm incident routine.',
      fr: 'Gestion des correctifs, sauvegardes réellement restaurées, détection, segmentation et routine d’incident sereine.',
    },
    sections: [
      {
        heading: { en: 'Foundations before tools', fr: 'Les fondations avant les outils' },
        body: {
          en: 'Inventories, patching, least privilege, backups and segmentation prevent more incidents than any single product. An unknown asset is an unmanaged risk; an untested backup is a hope, not a plan.',
          fr: 'Inventaires, correctifs, moindre privilège, sauvegardes et segmentation préviennent plus d’incidents que n’importe quel produit. Un actif inconnu est un risque non géré ; une sauvegarde non testée est un espoir, pas un plan.',
        },
        bullets: [
          { en: '3 copies, 2 media, 1 offsite — and restore drills', fr: '3 copies, 2 supports, 1 hors site — et des exercices de restauration' },
          { en: 'MFA that resists phishing (passkeys, hardware keys)', fr: 'MFA résistante au hameçonnage (clés d’accès, clés matérielles)' },
          { en: 'Centralised logs with a few high-quality alerts', fr: 'Journaux centralisés avec quelques alertes de qualité' },
        ],
      },
      {
        heading: { en: 'A simple incident routine', fr: 'Une routine d’incident simple' },
        body: {
          en: 'Confirm, contain, preserve evidence, eradicate, recover, then write down what happened. Avoid rebooting or wiping a suspicious machine before capturing volatile evidence, and talk to the people who own the service.',
          fr: 'Confirmez, contenir, préserver les preuves, éradiquer, restaurer, puis documentez. Évitez de redémarrer ou d’effacer une machine suspecte avant d’avoir capturé les preuves volatiles, et parlez aux personnes responsables du service.',
        },
      },
      {
        heading: { en: 'What this lab will never do', fr: 'Ce que ce laboratoire ne fera jamais' },
        body: {
          en: 'KALI WEB OS teaches defence only. There is no exploitation, credential theft, malware, persistence, evasion, scanning or attack automation — and every machine, address and log here is invented.',
          fr: 'KALI WEB OS enseigne uniquement la défense. Aucune exploitation, vol d’identifiants, malware, persistance, furtivité, analyse réseau ou automatisation d’attaque — et chaque machine, adresse et journal ici est inventé.',
        },
      },
    ],
    exercise: null,
    terminalTask: { command: 'tree ~/Lessons', text: { en: 'Review the lesson tree in the simulated filesystem.', fr: 'Parcourez l’arborescence des leçons du système simulé.' } },
    questions: [
      {
        id: 'def-1',
        prompt: { en: 'A backup job reports success every night. What is missing?', fr: 'Une sauvegarde réussit chaque nuit. Que manque-t-il ?' },
        options: [
          { en: 'Nothing, success is enough', fr: 'Rien, le succès suffit' },
          { en: 'A restore test from the backup', fr: 'Un test de restauration depuis la sauvegarde' },
          { en: 'A bigger backup disk', fr: 'Un disque de sauvegarde plus gros' },
          { en: 'More backup software', fr: 'Plus de logiciels de sauvegarde' },
        ],
        correct: 1,
        explanation: {
          en: 'A backup only has value if it can be restored. Test restores on a schedule and measure how long they take.',
          fr: 'Une sauvegarde n’a de valeur que si elle peut être restaurée. Testez les restaurations régulièrement et mesurez leur durée.',
        },
      },
      {
        id: 'def-2',
        prompt: { en: 'Which action belongs to containment?', fr: 'Quelle action relève du confinement ?' },
        options: [
          { en: 'Isolating an affected host from the network', fr: 'Isoler un hôte affecté du réseau' },
          { en: 'Writing the post-incident report', fr: 'Rédiger le rapport post-incident' },
          { en: 'Installing a new firewall next year', fr: 'Installer un nouveau pare-feu l’an prochain' },
          { en: 'Re-imaging every laptop in the company', fr: 'Réinstaller tous les portables de l’entreprise' },
        ],
        correct: 0,
        explanation: {
          en: 'Containment limits spread. The report comes last; widescale re-imaging without evidence is not a containment decision.',
          fr: 'Le confinement limite la propagation. Le rapport vient à la fin ; une réinstallation massive sans preuve n’est pas une décision de confinement.',
        },
      },
    ],
  },
];

export interface LogLine {
  id: string;
  text: string;
  suspicious: boolean;
  explanation: LocalizedText;
}

/** Fictional log entries used by the log-analysis drill. */
export const LOG_DRILL: LogLine[] = [
  {
    id: 'log-a',
    text: 'Jul 12 09:02:44 kali-sim sshd[4201]: Accepted publickey for kali from 10.0.42.15 port 44210 ssh2',
    suspicious: false,
    explanation: {
      en: 'Routine key-based login from the workstation subnet.',
      fr: 'Connexion habituelle par clé depuis le sous-réseau des postes.',
    },
  },
  {
    id: 'log-b',
    text: 'Jul 12 09:11:31 kali-sim sshd[4207]: Failed password for invalid user admin from 203.0.113.24 port 51022 ssh2',
    suspicious: true,
    explanation: {
      en: 'First failure from an external documentation-range address against a guessed account name.',
      fr: 'Premier échec depuis une adresse externe de documentation sur un nom de compte deviné.',
    },
  },
  {
    id: 'log-c',
    text: 'Jul 12 09:11:47 kali-sim sshd[4209]: Failed password for invalid user root from 203.0.113.24 port 51030 ssh2',
    suspicious: true,
    explanation: {
      en: 'Same source, another username, 16 seconds later — the pattern is what matters.',
      fr: 'Même source, autre compte, 16 secondes plus tard — c’est le motif qui compte.',
    },
  },
  {
    id: 'log-d',
    text: 'Jul 12 09:11:58 kali-sim sshd[4210]: Failed password for invalid user oracle from 203.0.113.24 port 51033 ssh2',
    suspicious: true,
    explanation: {
      en: 'A third account in under 30 seconds from one address. Escalate for investigation.',
      fr: 'Un troisième compte en moins de 30 secondes depuis une même adresse. À escalader.',
    },
  },
  {
    id: 'log-e',
    text: 'Jul 12 10:04:55 kali-sim sshd[4402]: Accepted publickey for kali from 10.0.42.15 port 45122 ssh2',
    suspicious: false,
    explanation: {
      en: 'Another expected key login from the same trusted workstation.',
      fr: 'Autre connexion par clé attendue depuis le même poste de confiance.',
    },
  },
  {
    id: 'log-f',
    text: 'Jul 12 12:02:19 kali-sim cron[4611]: (root) CMD (run-parts /etc/cron.hourly)',
    suspicious: false,
    explanation: {
      en: 'Normal scheduled maintenance. It is noisy, but it is not an authentication event.',
      fr: 'Maintenance planifiée normale. Bruyant, mais sans rapport avec l’authentification.',
    },
  },
];

export const PERMISSION_EXERCISE = {
  fileName: 'quarterly-report.txt',
  recommendedMode: 0o640,
} as const;
