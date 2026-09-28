import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from 'react';
import { AppDialog } from '@/components/ui/AppDialog';

export type AppDialogVariant = 'success' | 'error' | 'info';

export type AppDialogState = {
  visible: boolean;
  variant: AppDialogVariant;
  title: string;
  message: string;
  buttonLabel: string;
  secondaryLabel?: string;
  onPrimary?: () => void;
  onSecondary?: () => void;
};

export type ShowConfirmOptions = {
  confirmLabel?: string;
  cancelLabel?: string;
  onConfirm?: () => void;
  onCancel?: () => void;
};

type AppDialogContextValue = {
  dialog: AppDialogState;
  showSuccess: (title: string, message: string) => void;
  showError: (title: string, message: string) => void;
  showInfo: (title: string, message: string) => void;
  showConfirm: (title: string, message: string, options?: ShowConfirmOptions) => void;
  hide: () => void;
};

const INITIAL: AppDialogState = {
  visible: false,
  variant: 'info',
  title: '',
  message: '',
  buttonLabel: 'Entendido',
};

const AppDialogContext = createContext<AppDialogContextValue | null>(null);

export function AppDialogProvider({ children }: { children: ReactNode }) {
  const [dialog, setDialog] = useState<AppDialogState>(INITIAL);

  const hide = useCallback(() => {
    setDialog((prev) => ({ ...prev, visible: false }));
  }, []);

  const show = useCallback((variant: AppDialogVariant, title: string, message: string) => {
    setDialog({
      visible: true,
      variant,
      title,
      message,
      buttonLabel: 'Entendido',
    });
  }, []);

  const showSuccess = useCallback(
    (title: string, message: string) => show('success', title, message),
    [show],
  );

  const showError = useCallback(
    (title: string, message: string) => show('error', title, message),
    [show],
  );

  const showInfo = useCallback(
    (title: string, message: string) => show('info', title, message),
    [show],
  );

  const showConfirm = useCallback((
    title: string,
    message: string,
    options?: ShowConfirmOptions,
  ) => {
    setDialog({
      visible: true,
      variant: 'info',
      title,
      message,
      buttonLabel: options?.confirmLabel ?? 'Confirmar',
      secondaryLabel: options?.cancelLabel ?? 'Cancelar',
      onPrimary: options?.onConfirm,
      onSecondary: options?.onCancel,
    });
  }, []);

  const handlePrimary = useCallback(() => {
    const cb = dialog.onPrimary;
    hide();
    cb?.();
  }, [dialog.onPrimary, hide]);

  const handleSecondary = useCallback(() => {
    const cb = dialog.onSecondary;
    hide();
    cb?.();
  }, [dialog.onSecondary, hide]);

  const value = useMemo<AppDialogContextValue>(
    () => ({ dialog, showSuccess, showError, showInfo, showConfirm, hide }),
    [dialog, showSuccess, showError, showInfo, showConfirm, hide],
  );

  return (
    <AppDialogContext.Provider value={value}>
      {children}
      <AppDialog
        visible={dialog.visible}
        variant={dialog.variant}
        title={dialog.title}
        message={dialog.message}
        buttonLabel={dialog.buttonLabel}
        onClose={dialog.secondaryLabel ? handlePrimary : hide}
        secondaryLabel={dialog.secondaryLabel}
        onSecondary={dialog.secondaryLabel ? handleSecondary : undefined}
      />
    </AppDialogContext.Provider>
  );
}

export function useAppDialog() {
  const ctx = useContext(AppDialogContext);
  if (!ctx) {
    throw new Error('useAppDialog must be used within AppDialogProvider');
  }
  return ctx;
}
