import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Bell, Bot, MessageSquarePlus } from 'lucide-react-native';
import { COLORS } from '@/constants/colors';
import { AppFonts } from '@/constants/theme';

type Props = {
  loading: boolean;
  onBell: () => void;
  onNewChat: () => void;
};

export function ChatHeader({ loading, onBell, onNewChat }: Props) {
  const status = loading ? 'Pensando…' : 'En línea';

  return (
    <View style={styles.header}>
      <TouchableOpacity
        onPress={onNewChat}
        style={styles.iconBtn}
        activeOpacity={0.75}
        accessibilityRole="button"
        accessibilityLabel="Nueva conversación"
      >
        <MessageSquarePlus size={20} color={COLORS.primary} strokeWidth={2.2} />
      </TouchableOpacity>

      <View style={styles.center} accessible accessibilityLabel={`Asistente IA, ${status}`}>
        <View style={styles.titleRow}>
          <View style={styles.avatarWrap}>
            <View style={styles.avatar}>
              <Bot size={16} color={COLORS.white} strokeWidth={2.2} />
            </View>
            <View style={[styles.dot, loading && styles.dotBusy]} />
          </View>
          <View>
            <Text style={styles.title}>Asistente IA</Text>
            <Text style={styles.subtitle}>{status}</Text>
          </View>
        </View>
      </View>

      <TouchableOpacity
        onPress={onBell}
        style={styles.iconBtn}
        activeOpacity={0.75}
        accessibilityRole="button"
        accessibilityLabel="Notificaciones"
      >
        <Bell size={20} color={COLORS.primary} strokeWidth={2} />
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: 16,
    backgroundColor: COLORS.primary,
  },
  iconBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    borderWidth: 1.5,
    borderColor: 'rgba(255,255,255,0.4)',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.white,
  },
  center: {
    flex: 1,
    alignItems: 'center',
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  avatarWrap: {
    width: 32,
    height: 32,
  },
  avatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(255,255,255,0.22)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.45)',
  },
  dot: {
    position: 'absolute',
    right: -1,
    bottom: -1,
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#B9F6CA',
    borderWidth: 2,
    borderColor: COLORS.primary,
  },
  dotBusy: {
    backgroundColor: '#FFE082',
  },
  title: {
    fontSize: 17,
    color: COLORS.white,
    fontFamily: AppFonts.bold,
  },
  subtitle: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.88)',
    marginTop: 1,
    fontFamily: AppFonts.regular,
  },
});
