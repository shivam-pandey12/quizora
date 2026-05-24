"use client";

import { createPortal } from "react-dom";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

interface ConfirmDialogProps {
  open: boolean;
  title: string;
  description: string;
  confirmLabel?: string;
  loading?: boolean;
  onCancel: () => void;
  onConfirm: () => void;
}

export function ConfirmDialog({
  open,
  title,
  description,
  confirmLabel = "Confirm",
  loading,
  onCancel,
  onConfirm
}: ConfirmDialogProps) {
  if (!open) return null;

  const dialog = (
    <div
      aria-modal="true"
      className="fixed inset-0 z-[100] flex min-h-dvh items-center justify-center bg-foreground/25 p-4 backdrop-blur-sm"
      role="dialog"
    >
      <Card className="w-full max-w-md p-6 shadow-glow">
        <h2 className="text-2xl font-semibold">{title}</h2>
        <p className="mt-3 text-sm leading-6 text-muted-foreground">{description}</p>
        <div className="mt-6 flex flex-col-reverse justify-end gap-3 sm:flex-row">
          <Button disabled={loading} onClick={onCancel} type="button" variant="secondary">
            Cancel
          </Button>
          <Button disabled={loading} onClick={onConfirm} type="button" variant="danger">
            {loading ? "Working..." : confirmLabel}
          </Button>
        </div>
      </Card>
    </div>
  );

  return createPortal(dialog, document.body);
}
