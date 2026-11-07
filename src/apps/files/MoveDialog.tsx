import { useEffect, useState, type ReactNode } from 'react';
import { ChevronUp, Folder, FolderInput } from 'lucide-react';
import { Modal } from '../../components/ui/Modal';
import { Button } from '../../components/ui/Button';
import { listDir, type FsTree } from '../../lib/fs';
import { joinPath, normalizePath, parentPath, tildify } from '../../lib/paths';
import type { Translator } from '../../lib/i18n';

interface MoveDialogProps {
  open: boolean;
  tree: FsTree;
  sourcePath: string;
  startDir: string;
  t: Translator;
  onCancel: () => void;
  onConfirm: (destinationDir: string) => void;
}

export function MoveDialog({
  open,
  tree,
  sourcePath,
  startDir,
  t,
  onCancel,
  onConfirm,
}: MoveDialogProps): ReactNode {
  const [dir, setDir] = useState(startDir);
  const sourceIsDir = tree[sourcePath]?.type === 'dir';

  useEffect(() => {
    if (open) setDir(startDir);
  }, [open, startDir]);

  const invalid =
    normalizePath(dir) === parentPath(sourcePath) ||
    (sourceIsDir && (normalizePath(dir) === sourcePath || normalizePath(dir).startsWith(sourcePath + '/')));
  const folders = tree[dir] ? listDir(tree, dir).filter((node) => node.type === 'dir') : [];

  return (
    <Modal
      open={open}
      onClose={onCancel}
      title={t('files.moveTitle', { name: sourcePath.slice(sourcePath.lastIndexOf('/') + 1) })}
      description={t('files.moveHint')}
      closeLabel={t('common.cancel')}
      size="md"
      icon={<FolderInput className="h-4 w-4" />}
      footer={
        <>
          <Button variant="secondary" onClick={onCancel}>
            {t('common.cancel')}
          </Button>
          <Button
            variant="primary"
            disabled={invalid}
            onClick={() => onConfirm(dir)}
            icon={<FolderInput />}
          >
            {t('common.move')}
          </Button>
        </>
      }
    >
      <div className="space-y-3">
        <div className="flex items-center gap-2">
          <Button
            size="sm"
            variant="secondary"
            disabled={dir === '/'}
            onClick={() => setDir(parentPath(dir))}
            icon={<ChevronUp />}
          >
            {t('common.up')}
          </Button>
          <div className="min-w-0 flex-1 truncate rounded-lg border border-surface-line bg-surface-soft px-2.5 py-1.5 font-mono text-[11px] text-text-mid">
            {tildify(dir)}
          </div>
        </div>

        <div className="max-h-64 space-y-1 overflow-y-auto rounded-xl border border-surface-line bg-surface-soft/40 p-1.5 kali-scroll">
          {folders.length === 0 ? (
            <p className="px-2 py-4 text-center text-xs text-text-low">{t('files.empty')}</p>
          ) : (
            folders.map((folder) => (
              <button
                key={folder.path}
                type="button"
                onClick={() => setDir(folder.path)}
                className="flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-left text-[13px] text-text-mid transition hover:bg-surface-hover hover:text-text-hi focus-ring"
              >
                <Folder className="h-4 w-4 shrink-0 text-sky-300" aria-hidden="true" />
                <span className="truncate">{folder.name}</span>
              </button>
            ))
          )}
        </div>
        {invalid ? (
          <p className="text-xs text-amber-300">
            {sourceIsDir
              ? t('terminal.cannotMoveIntoSelf')
              : t('files.nameTaken')}
          </p>
        ) : null}
        <p className="text-[11px] text-text-low">
          {t('files.location', { path: joinPath(dir, sourcePath.slice(sourcePath.lastIndexOf('/') + 1)) })}
        </p>
      </div>
    </Modal>
  );
}
