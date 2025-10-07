import { Button, ButtonProps } from '@repo/ui';
import { FC, ReactNode } from 'react';

type ConfirmPopoverProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: () => void;
  title?: string;
  confirmText?: string;
  cancelText?: string;
  confirmVariant?: ButtonProps['variant'];
  cancelVariant?: ButtonProps['variant'];
  children: ReactNode;
  additionalActions?: ReactNode;
};

export const ConfirmPopover: FC<ConfirmPopoverProps> = ({
  open,
  onOpenChange,
  onConfirm,
  title = 'Are you sure?',
  confirmText = 'Delete',
  cancelText = 'Cancel',
  confirmVariant = 'destructive',
  cancelVariant = 'ghost',
  children,
  additionalActions,
}) => {
  return (
    <div className="relative">
      <div onClick={() => onOpenChange(!open)}>
        {children}
      </div>
      {open && (
        <>
          {/* Backdrop */}
          <div 
            className="fixed inset-0 z-40 bg-black/30" 
            onClick={() => onOpenChange(false)}
          />
          {/* Modal */}
          <div className="absolute z-50 mt-2 p-4 bg-white border rounded-lg shadow-lg min-w-[250px]">
            <p className="pb-2 text-sm font-medium md:text-base">{title}</p>
            <div className="flex flex-row gap-1">
              <Button
                variant={confirmVariant}
                onClick={e => {
                  onConfirm();
                  e.stopPropagation();
                }}
              >
                {confirmText}
              </Button>
              <Button
                variant={cancelVariant}
                onClick={e => {
                  onOpenChange(false);
                  e.stopPropagation();
                }}
              >
                {cancelText}
              </Button>
              {additionalActions}
            </div>
          </div>
        </>
      )}
    </div>
  );
};
