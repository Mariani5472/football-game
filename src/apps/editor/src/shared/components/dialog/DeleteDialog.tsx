import { AlertTriangle } from "lucide-react";
import { ConfirmDialog } from "./ConfirmDialog";

interface DeleteDialogProps {
  open: boolean;
  entityName: string;
  onConfirm: () => void;
  onClose: () => void;
}

export function DeleteDialog({
  open,
  entityName,
  onConfirm,
  onClose,
}: DeleteDialogProps) {
  return (
    <ConfirmDialog
      open={open}
      title="Delete entity"
      description={`This will permanently remove "${entityName}" from the current world.`}
      confirmLabel="Delete"
      onConfirm={onConfirm}
      onClose={onClose}
    >
      <div className="flex gap-3 rounded-xl border border-amber-400/10 bg-amber-400/5 p-4">
        <AlertTriangle size={17} className="mt-0.5 shrink-0 text-amber-300" />
        <p className="text-xs leading-5 text-slate-400">
          Check the entity dependencies before deleting it. Related records may
          block the operation.
        </p>
      </div>
    </ConfirmDialog>
  );
}