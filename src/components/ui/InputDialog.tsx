import { useEffect, useId, useState, type ReactNode } from 'react';
import { Modal } from './Modal';
import { Button } from './Button';

interface InputDialogProps {
  open: boolean;
  title: string;
  label: string;
  initialValue?: string;
  placeholder?: string;
  confirmLabel: string;
  cancelLabel: string;
  error?: string | null;
  hint?: string;
  onConfirm: (value: string) => void;
  onCancel: () => void;
}

export function InputDialog({
  open,
  title,
  label,
  initialValue = '',
  placeholder,
  confirmLabel,
  cancelLabel,
  error,
  hint,
  onConfirm,
  onCancel,
}: InputDialogProps): ReactNode {
  const [value, setValue] = useState(initialValue);
  const inputId = useId();
  const errorId = useId();

  useEffect(() => {
    if (open) setValue(initialValue);
  }, [open, initialValue]);

  return (
    <Modal
      open={open}
      title={title}
      onClose={onCancel}
      closeLabel={cancelLabel}
      footer={
        <>
          <Button variant="secondary" onClick={onCancel}>
            {cancelLabel}
          </Button>
          <Button variant="primary" onClick={() => onConfirm(value)}>
            {confirmLabel}
          </Button>
        </>
      }
    >
      <form
        onSubmit={(event) => {
          event.preventDefault();
          onConfirm(value);
        }}
        className="space-y-2"
      >
        <label htmlFor={inputId} className="block text-xs font-medium uppercase tracking-wide text-text-low">
          {label}
        </label>
        <input
          id={inputId}
          value={value}
          autoFocus
          data-autofocus
          spellCheck={false}
          autoCapitalize="off"
          autoComplete="off"
          onChange={(event) => setValue(event.target.value)}
          placeholder={placeholder}
          aria-invalid={error ? true : undefined}
          aria-describedby={error ? errorId : undefined}
          className="h-10 w-full rounded-lg border border-surface-line bg-surface-soft px-3 text-sm text-text-hi outline-none transition focus:border-accent/60 focus:bg-surface-hover"
        />
        {hint && !error ? <p className="text-xs text-text-low">{hint}</p> : null}
        {error ? (
          <p id={errorId} role="alert" className="text-xs text-rose-400">
            {error}
          </p>
        ) : null}
        <button type="submit" className="hidden" aria-hidden="true" tabIndex={-1} />
      </form>
    </Modal>
  );
}
