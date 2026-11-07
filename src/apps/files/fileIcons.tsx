import {
  Braces,
  File,
  FileCode2,
  FileText,
  Folder,
  Image,
  ScrollText,
  Terminal,
  type LucideIcon,
} from 'lucide-react';
import { extensionOf } from '../../lib/paths';

export function iconForFile(path: string, isDir: boolean): { Icon: LucideIcon; className: string } {
  if (isDir) return { Icon: Folder, className: 'text-sky-300' };
  const ext = extensionOf(path);
  switch (ext) {
    case 'md':
    case 'markdown':
      return { Icon: FileText, className: 'text-teal-200' };
    case 'log':
      return { Icon: ScrollText, className: 'text-amber-300' };
    case 'json':
      return { Icon: Braces, className: 'text-violet-300' };
    case 'sh':
    case 'bash':
      return { Icon: Terminal, className: 'text-emerald-300' };
    case 'ts':
    case 'tsx':
    case 'js':
    case 'jsx':
    case 'py':
      return { Icon: FileCode2, className: 'text-sky-300' };
    case 'png':
    case 'jpg':
    case 'jpeg':
    case 'svg':
    case 'webp':
      return { Icon: Image, className: 'text-fuchsia-300' };
    default:
      return { Icon: File, className: 'text-text-mid' };
  }
}

export function humanFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KiB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MiB`;
}
