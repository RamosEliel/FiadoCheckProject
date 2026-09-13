import { useCallback, useState } from 'react';

export type AppDialogVariant = 'success' | 'error' | 'info';

export type AppDialogState = {
  visible: boolean;
  variant: AppDialogVariant;
  title: string;
  message: string;
};

const INITIAL: AppDialogState = {
  visible: false,
  variant: 'info',
  title: '',
  message: '',
};

export function useAppDialog() {
  const [dialog, setDialog] = useState<AppDialogState>(INITIAL);

  const hide = useCallback(() => {
    setDialog((prev) => ({ ...prev, visible: false }));
  }, []);

  const show = useCallback((variant: AppDialogVariant, title: string, message: string) => {
    setDialog({ visible: true, variant, title, message });
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

  return { dialog, showSuccess, showError, showInfo, hide };
}
