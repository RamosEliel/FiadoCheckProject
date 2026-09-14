import { useEffect, useRef, useState } from 'react';
import { View, Text, TouchableOpacity, Pressable, StyleSheet } from 'react-native';
import { Bot, RefreshCw } from 'lucide-react-native';
import { COLORS } from '@/constants/colors';
import { AppFonts } from '@/constants/theme';
import { RichMessageText } from './RichMessageText';
import { copyToClipboard } from './copyMessage';
import { hapticLight } from './haptic';
import type { Mensaje } from './types';

type Props = {
  mensaje: Mensaje;
  grouped?: boolean;
  onRetry?: () => void;
};

const formatTime = (ts?: number) => {
  if (!ts) return '';
  return new Date(ts).toLocaleTimeString('es-CO', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  });
};

export function MessageBubble({ mensaje, grouped = false, onRetry }: Props) {
  const [copied, setCopied] = useState(false);
  const copiedTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isUser = mensaje.tipo === 'usuario';
  const texto = mensaje.texto ?? '';
  const time = formatTime(mensaje.createdAt);
  const isError = Boolean(mensaje.esError);

  useEffect(() => {
    return () => {
      if (copiedTimerRef.current) clearTimeout(copiedTimerRef.current);
    };
  }, []);

  const handleLongPress = async () => {
    hapticLight();
    const ok = await copyToClipboard(texto);
    if (!ok) return;
    setCopied(true);
    if (copiedTimerRef.current) clearTimeout(copiedTimerRef.current);
    copiedTimerRef.current = setTimeout(() => setCopied(false), 1600);
  };

  const timeLabel = copied ? 'Copiado' : time;

  if (isUser) {
    return (
      <View style={[styles.userRow, grouped && styles.grouped]}>
        <Pressable
          style={styles.userBubble}
          onLongPress={handleLongPress}
          delayLongPress={350}
          accessibilityRole="text"
          accessibilityLabel={`Tu mensaje: ${texto}`}
          accessibilityHint="Mantén presionado para copiar"
        >
          <RichMessageText text={texto} style={styles.userText} />
          {timeLabel ? <Text style={styles.userTime}>{timeLabel}</Text> : null}
        </Pressable>
      </View>
    );
  }

  return (
    <View style={[styles.botRow, grouped && styles.grouped]}>
      {grouped ? (
        <View style={styles.avatarSpacer} />
      ) : (
        <View style={styles.botAvatar}>
          <Bot size={18} color={COLORS.white} strokeWidth={2.2} />
        </View>
      )}
      <Pressable
        style={[styles.botBubble, isError && styles.botBubbleError]}
        onLongPress={handleLongPress}
        delayLongPress={350}
        accessibilityRole="text"
        accessibilityLabel={`Mensaje del asistente: ${texto}`}
        accessibilityHint="Mantén presionado para copiar"
      >
        <RichMessageText
          text={texto}
          style={[styles.botText, isError && styles.botTextError]}
        />
        {timeLabel ? <Text style={styles.botTime}>{timeLabel}</Text> : null}
        {isError && onRetry ? (
          <TouchableOpacity
            style={styles.retryBtn}
            onPress={() => {
              hapticLight();
              onRetry();
            }}
            activeOpacity={0.8}
            accessibilityRole="button"
            accessibilityLabel="Reintentar último mensaje"
          >
            <RefreshCw size={14} color={COLORS.primary} strokeWidth={2.4} />
            <Text style={styles.retryText}>Reintentar</Text>
          </TouchableOpacity>
        ) : null}
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  grouped: {
    marginTop: -4,
  },
  botRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 10,
    maxWidth: '88%',
  },
  avatarSpacer: {
    width: 34,
    flexShrink: 0,
  },
  botAvatar: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: COLORS.primary,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  botBubble: {
    flexShrink: 1,
    backgroundColor: COLORS.white,
    borderRadius: 20,
    borderBottomLeftRadius: 6,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderWidth: 1,
    borderColor: '#E4EEE9',
    shadowColor: '#000',
    shadowOpacity: 0.06,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
    elevation: 4,
  },
  botBubbleError: {
    borderColor: '#F5C2C2',
    backgroundColor: '#FFF8F8',
  },
  botText: {
    fontSize: 15,
    color: COLORS.text,
    lineHeight: 22,
    fontFamily: AppFonts.regular,
  },
  botTextError: {
    color: '#7A2E2E',
  },
  botTime: {
    marginTop: 6,
    fontSize: 11,
    color: COLORS.textMuted,
    fontFamily: AppFonts.regular,
    alignSelf: 'flex-end',
  },
  retryBtn: {
    marginTop: 10,
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: COLORS.white,
    borderWidth: 1,
    borderColor: COLORS.primary,
    borderRadius: 50,
    paddingHorizontal: 12,
    paddingVertical: 7,
  },
  retryText: {
    fontSize: 13,
    color: COLORS.primary,
    fontFamily: AppFonts.semiBold,
  },
  userRow: {
    alignItems: 'flex-end',
    alignSelf: 'flex-end',
    maxWidth: '82%',
  },
  userBubble: {
    backgroundColor: COLORS.primary,
    borderRadius: 20,
    borderBottomRightRadius: 6,
    paddingHorizontal: 16,
    paddingVertical: 12,
    shadowColor: '#000',
    shadowOpacity: 0.06,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
    elevation: 4,
  },
  userText: {
    fontSize: 15,
    color: COLORS.white,
    lineHeight: 22,
    fontFamily: AppFonts.regular,
  },
  userTime: {
    marginTop: 6,
    fontSize: 11,
    color: 'rgba(255,255,255,0.8)',
    fontFamily: AppFonts.regular,
    alignSelf: 'flex-end',
  },
});
