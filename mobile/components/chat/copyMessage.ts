import { Alert, Share } from 'react-native';

type ClipboardModule = {
  setStringAsync: (text: string) => Promise<void>;
};

function loadClipboard(): ClipboardModule | null {
  try {
    const clipboard = require('expo-clipboard') as ClipboardModule;
    if (typeof clipboard.setStringAsync !== 'function') return null;
    return clipboard;
  } catch {
    return null;
  }
}

export async function copyToClipboard(text: string): Promise<boolean> {
  const value = text.trim();
  if (!value) return false;

  const clipboard = loadClipboard();
  if (clipboard) {
    try {
      await clipboard.setStringAsync(value);
      return true;
    } catch {
      // Native missing or setStringAsync failed — fall through.
    }
  }

  try {
    await Share.share({ message: value });
    return true;
  } catch {
    Alert.alert('Mensaje', value);
    return false;
  }
}
