"use client";

import React from 'react';
import { AlertTriangle, Trash2 } from 'lucide-react';
import { Modal } from './Modal';
import { Button } from './Button';
import { STRINGS } from '@/src/constants/strings';

export interface ConfirmDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => Promise<void> | void;
  title?: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  variant?: 'danger' | 'destructive' | 'warning' | 'primary';
  isLoading?: boolean;
}

export function ConfirmDialog({
  isOpen,
  onClose,
  onConfirm,
  title = STRINGS.dialogs.confirmTitle,
  message,
  confirmLabel = STRINGS.dialogs.confirmDelete,
  cancelLabel = STRINGS.dialogs.confirmCancel,
  variant = 'danger',
  isLoading = false,
}: ConfirmDialogProps) {
  const isDanger = variant === 'danger' || variant === 'destructive';

  return (
    <Modal isOpen={isOpen} onClose={onClose} maxWidth="sm" showCloseButton={false}>
      <div className="flex flex-col items-center text-center">
        <div
          className={`w-14 h-14 rounded-2xl flex items-center justify-center mb-4 ${
            isDanger ? 'bg-rose-50 text-rose-600 border border-rose-100' : 'bg-amber-50 text-amber-600 border border-amber-100'
          }`}
        >
          {isDanger ? (
            <Trash2 className="w-7 h-7" />
          ) : (
            <AlertTriangle className="w-7 h-7" />
          )}
        </div>

        <h3 className="text-base font-bold text-slate-900 tracking-tight mb-2">
          {title}
        </h3>

        <p className="text-xs text-slate-500 font-medium leading-relaxed mb-6 px-2">
          {message}
        </p>

        <div className="flex items-center gap-3 w-full">
          <Button
            variant="outline"
            className="flex-1"
            onClick={onClose}
            disabled={isLoading}
          >
            {cancelLabel}
          </Button>

          <Button
            variant={isDanger ? 'destructive' : 'primary'}
            className="flex-1"
            onClick={onConfirm}
            isLoading={isLoading}
          >
            {confirmLabel}
          </Button>
        </div>
      </div>
    </Modal>
  );
}

export default ConfirmDialog;
