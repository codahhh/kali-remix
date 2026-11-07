import type { ReactNode } from 'react';
import { AlertTriangle } from 'lucide-react';
import { Modal } from './Modal';
import { Button } from './Button';

interface ConfirmDialogProps {
  open: boolean;
  title: string;
  body: string;
  confirmLabel: string;
  cancelLabel: string;
  onConfirm: () => void;
  onCancel: () => void;
  danger?: boolean;
  extra?: ReactNode;
}

export function ConfirmDialog({
  open,
  title,
  body,
  confirmLabel,
  cancelLabel,
  onConfirm,
  onCancel,
  danger = true,
  extra,
}: ConfirmDialogProps): ReactNode {
  return (
    <Modal
      open={open}
      onClose={onCancel}
      title={title}
      closeLabel={cancelLabel}
      size="sm"
      icon={<AlertTriangle className="h-4 w-4" />}
      footer={
        <>
          <Button variant="secondary" onClick={onCancel}>
            {cancelLabel}
          </Button>
          <Button variant={danger ? 'danger' : 'primary'} onClick={onConfirm} data-autofocus>
            {confirmLabel}
          </Button>
        </>
      }
    >
      <p className="text-[13px] leading-relaxed text-text-mid">{body}</p>
      {extra}
    </Modal>
  );
}
