import type { Lang } from '../../lib/types';

export interface LocalizedText {
  en: string;
  fr: string;
}

export interface ManExample {
  cmd: string;
  text: LocalizedText;
}

export interface ManPage {
  name: string;
  synopsis: string;
  summary: LocalizedText;
  description: LocalizedText;
  options: Array<{ flag: string; text: LocalizedText }>;
  examples: ManExample[];
  seeAlso?: string[];
}

export function pick(text: LocalizedText, lang: Lang): string {
  return text[lang] ?? text.en;
}

/**
 * Every manual page describes the *simulation*. They are not copies of real
 * GNU manuals and they do not imply any host access.
 */
export const MAN_PAGES: Record<string, ManPage> = {
  help: {
    name: 'help',
    synopsis: 'help [command]',
    summary: { en: 'List the allow-listed commands (simulation).', fr: 'Liste les commandes autorisées (simulation).' },
    description: {
      en: 'Prints every command that the KALI WEB OS interpreter accepts. With a command name, prints that command’s usage and a short example.',
      fr: 'Affiche toutes les commandes acceptées par l’interpréteur KALI WEB OS. Avec un nom de commande, affiche son utilisation et un exemple court.',
    },
    options: [],
    examples: [
      { cmd: 'help', text: { en: 'List all allowed commands.', fr: 'Liste toutes les commandes autorisées.' } },
      { cmd: 'help ls', text: { en: 'Show usage for ls.', fr: 'Affiche l’utilisation de ls.' } },
    ],
    seeAlso: ['man'],
  },
  clear: {
    name: 'clear',
    synopsis: 'clear',
    summary: { en: 'Clear the terminal output.', fr: 'Efface la sortie du terminal.' },
    description: {
      en: 'Removes everything currently displayed in this terminal window. Your command history is preserved and can be recalled with the up arrow.',
      fr: 'Supprime tout ce qui est affiché dans cette fenêtre de terminal. L’historique des commandes est conservé et rappelable avec la flèche haut.',
    },
    options: [],
    examples: [{ cmd: 'clear', text: { en: 'Empty the screen.', fr: 'Vide l’écran.' } }],
  },
  pwd: {
    name: 'pwd',
    synopsis: 'pwd',
    summary: { en: 'Print the current virtual directory.', fr: 'Affiche le dossier virtuel courant.' },
    description: {
      en: 'Writes the absolute path of the current working directory inside the simulated filesystem.',
      fr: 'Écrit le chemin absolu du dossier courant dans le système de fichiers simulé.',
    },
    options: [],
    examples: [{ cmd: 'pwd', text: { en: 'Usually prints /home/kali.', fr: 'Affiche généralement /home/kali.' } }],
    seeAlso: ['cd', 'ls'],
  },
  ls: {
    name: 'ls',
    synopsis: 'ls [-l] [-a] [-h] [path]',
    summary: { en: 'List virtual directory contents.', fr: 'Liste le contenu d’un dossier virtuel.' },
    description: {
      en: 'Lists the entries of the simulated directory. Directories are printed with a trailing slash to make the simulation easier to read. Hidden entries (names starting with a dot) are only shown with -a.',
      fr: 'Liste les entrées du dossier simulé. Les dossiers sont affichés avec un « / » final pour rendre la simulation plus lisible. Les entrées cachées (commençant par un point) ne s’affichent qu’avec -a.',
    },
    options: [
      { flag: '-l', text: { en: 'Long format: mode, owner, size, date, name.', fr: 'Format long : droits, propriétaire, taille, date, nom.' } },
      { flag: '-a', text: { en: 'Include dotfiles and . / ..', fr: 'Inclut les fichiers cachés et . / ..' } },
      { flag: '-h', text: { en: 'Human-readable sizes with -l.', fr: 'Tailles lisibles avec -l.' } },
    ],
    examples: [
      { cmd: 'ls', text: { en: 'List the current directory.', fr: 'Liste le dossier courant.' } },
      { cmd: 'ls -la ~', text: { en: 'Long list of the home directory.', fr: 'Liste longue du dossier personnel.' } },
    ],
    seeAlso: ['cd', 'tree'],
  },
  cd: {
    name: 'cd',
    synopsis: 'cd [path]',
    summary: { en: 'Change the virtual working directory.', fr: 'Change le dossier de travail virtuel.' },
    description: {
      en: 'Moves around the simulated filesystem. Without an argument it returns to /home/kali. "cd -" returns to the previous directory.',
      fr: 'Se déplace dans le système de fichiers simulé. Sans argument, retourne dans /home/kali. « cd - » revient au dossier précédent.',
    },
    options: [
      { flag: '~', text: { en: 'Home directory (/home/kali).', fr: 'Dossier personnel (/home/kali).' } },
      { flag: '..', text: { en: 'Parent directory.', fr: 'Dossier parent.' } },
      { flag: '-', text: { en: 'Previous directory.', fr: 'Dossier précédent.' } },
    ],
    examples: [
      { cmd: 'cd Lessons', text: { en: 'Enter the Lessons folder.', fr: 'Entrer dans le dossier Lessons.' } },
      { cmd: 'cd ..', text: { en: 'Go one level up.', fr: 'Remonter d’un niveau.' } },
    ],
    seeAlso: ['pwd', 'ls'],
  },
  mkdir: {
    name: 'mkdir',
    synopsis: 'mkdir [-p] <name...>',
    summary: { en: 'Create virtual directories.', fr: 'Crée des dossiers virtuels.' },
    description: {
      en: 'Creates one or more directories in the simulated filesystem. Unlike a real system, permissions are simulated and always allow the operation.',
      fr: 'Crée un ou plusieurs dossiers dans le système de fichiers simulé. Contrairement à un vrai système, les permissions sont simulées et autorisent toujours l’opération.',
    },
    options: [
      { flag: '-p', text: { en: 'Create missing parents, ignore existing dirs.', fr: 'Crée les parents manquants, ignore les dossiers existants.' } },
    ],
    examples: [
      { cmd: 'mkdir reports', text: { en: 'Create a folder named reports.', fr: 'Créer un dossier nommé reports.' } },
      { cmd: 'mkdir -p ~/a/b/c', text: { en: 'Create a nested path.', fr: 'Créer un chemin imbriqué.' } },
    ],
    seeAlso: ['touch', 'ls'],
  },
  touch: {
    name: 'touch',
    synopsis: 'touch <file...>',
    summary: { en: 'Create empty virtual files or refresh their date.', fr: 'Crée des fichiers vides ou actualise leur date.' },
    description: {
      en: 'Creates empty files in the simulated filesystem. When the file already exists, its modification date is refreshed instead.',
      fr: 'Crée des fichiers vides dans le système de fichiers simulé. Si le fichier existe déjà, sa date de modification est actualisée.',
    },
    options: [],
    examples: [
      { cmd: 'touch notes.txt', text: { en: 'Create notes.txt in the current folder.', fr: 'Créer notes.txt dans le dossier courant.' } },
    ],
    seeAlso: ['mkdir', 'cat'],
  },
  cat: {
    name: 'cat',
    synopsis: 'cat <file...>',
    summary: { en: 'Print virtual file contents.', fr: 'Affiche le contenu de fichiers virtuels.' },
    description: {
      en: 'Prints the contents of one or more simulated text files. Very long files are truncated in the terminal buffer to keep the UI responsive; open them in the Text Editor to read everything.',
      fr: 'Affiche le contenu d’un ou plusieurs fichiers texte simulés. Les fichiers très longs sont tronqués dans le terminal pour garder l’interface réactive ; ouvrez-les dans l’éditeur pour tout lire.',
    },
    options: [],
    examples: [
      { cmd: 'cat ~/Documents/welcome.md', text: { en: 'Read the welcome file.', fr: 'Lire le fichier de bienvenue.' } },
      { cmd: 'cat /etc/hostname', text: { en: 'Read the simulated hostname file.', fr: 'Lire le fichier de nom d’hôte simulé.' } },
    ],
    seeAlso: ['ls', 'man'],
  },
  echo: {
    name: 'echo',
    synopsis: 'echo [-n] [text...]',
    summary: { en: 'Print text back to the terminal.', fr: 'Réaffiche du texte dans le terminal.' },
    description: {
      en: 'Writes its arguments to standard output. Quotes are parsed by the interpreter but no shell expansion, command substitution or variable interpolation is performed.',
      fr: 'Écrit ses arguments sur la sortie standard. Les guillemets sont interprétés, mais aucune expansion de shell, substitution de commande ou variable n’est effectuée.',
    },
    options: [{ flag: '-n', text: { en: 'Do not append a newline.', fr: 'Ne pas ajouter de retour à la ligne.' } }],
    examples: [
      { cmd: 'echo "hello world"', text: { en: 'Print hello world.', fr: 'Afficher hello world.' } },
      { cmd: 'echo $HOME', text: { en: 'Prints the literal text $HOME — no expansion.', fr: 'Affiche littéralement $HOME — sans expansion.' } },
    ],
  },
  whoami: {
    name: 'whoami',
    synopsis: 'whoami',
    summary: { en: 'Print the simulated user name.', fr: 'Affiche l’utilisateur simulé.' },
    description: {
      en: 'Prints "kali", the fictional user of this simulation. This is not your real operating-system account.',
      fr: 'Affiche « kali », l’utilisateur fictif de cette simulation. Ce n’est pas votre compte système réel.',
    },
    options: [],
    examples: [{ cmd: 'whoami', text: { en: 'Prints kali.', fr: 'Affiche kali.' } }],
    seeAlso: ['hostname', 'uname'],
  },
  hostname: {
    name: 'hostname',
    synopsis: 'hostname',
    summary: { en: 'Print the simulated host name.', fr: 'Affiche le nom d’hôte simulé.' },
    description: {
      en: 'Prints "kali-sim", the fictional host name of the simulation. Your browser does not expose the real device name to web pages.',
      fr: 'Affiche « kali-sim », le nom d’hôte fictif de la simulation. Votre navigateur n’expose pas le nom réel de l’appareil aux pages web.',
    },
    options: [],
    examples: [{ cmd: 'hostname', text: { en: 'Prints kali-sim.', fr: 'Affiche kali-sim.' } }],
  },
  uname: {
    name: 'uname',
    synopsis: 'uname [-a] [-s] [-r] [-m] [-n] [-o]',
    summary: { en: 'Print simulated kernel information.', fr: 'Affiche des informations de noyau simulées.' },
    description: {
      en: 'Prints a fictional kernel identification for the simulation. The values are invented and are not read from your device or browser.',
      fr: 'Affiche une identification de noyau fictive pour la simulation. Les valeurs sont inventées et ne proviennent ni de votre appareil ni du navigateur.',
    },
    options: [
      { flag: '-a', text: { en: 'Print everything.', fr: 'Tout afficher.' } },
      { flag: '-s', text: { en: 'Kernel name.', fr: 'Nom du noyau.' } },
      { flag: '-r', text: { en: 'Kernel release.', fr: 'Version du noyau.' } },
      { flag: '-m', text: { en: 'Machine architecture.', fr: 'Architecture machine.' } },
      { flag: '-n', text: { en: 'Host name.', fr: 'Nom d’hôte.' } },
      { flag: '-o', text: { en: 'Operating system.', fr: 'Système d’exploitation.' } },
    ],
    examples: [
      { cmd: 'uname -a', text: { en: 'Full simulated identification.', fr: 'Identification simulée complète.' } },
    ],
  },
  date: {
    name: 'date',
    synopsis: 'date [-u]',
    summary: { en: 'Print the browser clock in Linux format.', fr: 'Affiche l’horloge du navigateur au format Linux.' },
    description: {
      en: 'Formats the current time from the browser clock. This is real time — the only "system" value this simulation reads from your device, because the browser provides it.',
      fr: 'Formate l’heure actuelle depuis l’horloge du navigateur. C’est l’heure réelle — la seule valeur « système » que la simulation lit, car le navigateur la fournit.',
    },
    options: [{ flag: '-u', text: { en: 'Use UTC instead of local time.', fr: 'Utiliser UTC au lieu de l’heure locale.' } }],
    examples: [{ cmd: 'date -u', text: { en: 'Print the UTC timestamp.', fr: 'Afficher l’horodatage UTC.' } }],
  },
  history: {
    name: 'history',
    synopsis: 'history',
    summary: { en: 'List commands typed in this session.', fr: 'Liste les commandes saisies dans cette session.' },
    description: {
      en: 'Shows the numbered command history of this terminal window. It exists only in memory for this session and is never uploaded anywhere.',
      fr: 'Affiche l’historique numéroté de cette fenêtre de terminal. Il reste en mémoire pour la session et n’est jamais envoyé nulle part.',
    },
    options: [],
    examples: [{ cmd: 'history', text: { en: 'Show history.', fr: 'Afficher l’historique.' } }],
    seeAlso: ['help'],
  },
  tree: {
    name: 'tree',
    synopsis: 'tree [path]',
    summary: { en: 'Print the virtual directory tree.', fr: 'Affiche l’arborescence virtuelle.' },
    description: {
      en: 'Draws a compact ASCII tree of the simulated filesystem, starting at the given path (or the current directory).',
      fr: 'Dessine une arborescence ASCII compacte du système de fichiers simulé, à partir du chemin donné (ou du dossier courant).',
    },
    options: [],
    examples: [
      { cmd: 'tree ~/Lessons', text: { en: 'Tree of the lessons folder.', fr: 'Arborescence du dossier des leçons.' } },
    ],
    seeAlso: ['ls'],
  },
  man: {
    name: 'man',
    synopsis: 'man <command>',
    summary: { en: 'Read the simulated manual pages.', fr: 'Lire les pages de manuel simulées.' },
    description: {
      en: 'Displays a manual page from the KALI WEB OS simulation. These pages are original documentation for the simulation and are not copies of real man pages.',
      fr: 'Affiche une page de manuel de la simulation KALI WEB OS. Ces pages sont une documentation originale de la simulation, pas des copies de pages réelles.',
    },
    options: [],
    examples: [
      { cmd: 'man ls', text: { en: 'Read the ls page.', fr: 'Lire la page de ls.' } },
      { cmd: 'man man', text: { en: 'Very meta.', fr: 'Très méta.' } },
    ],
    seeAlso: ['help'],
  },
};

export const MAN_ORDER = Object.keys(MAN_PAGES);

export function hasManPage(name: string): boolean {
  return Object.hasOwn(MAN_PAGES, name);
}
