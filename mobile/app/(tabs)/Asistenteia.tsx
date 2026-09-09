import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  StatusBar,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Stack, useFocusEffect, router } from 'expo-router';
import { useCallback, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { ChevronLeft, Bell, Bot, Send } from 'lucide-react-native';
import { HeaderIconButton } from '@/components/HeaderIconButton';
import { asistenteIAStyles as styles } from '@/constants/Asistenteia.styles';
import { COLORS } from '@/constants/colors';
import { useAsistenteIA } from '@/hooks/Useasistenteia';

export default function AsistenteIAScreen() {
  const [token, setToken] = useState<string | null>(null);
  const [idTendero, setIdTendero] = useState('');

  useFocusEffect(
    useCallback(() => {
      AsyncStorage.getItem('token').then(setToken);
      AsyncStorage.getItem('tendero').then((raw) => {
        if (!raw) {
          setIdTendero('');
          return;
        }
        try {
          const tendero = JSON.parse(raw);
          setIdTendero(String(tendero.id_tendero ?? ''));
        } catch {
          setIdTendero('');
        }
      });
    }, []),
  );

  const {
    mensajes,
    input,
    setInput,
    loading,
    scrollRef,
    handleEnviar,
    handleCancelar,
    handleSugerencia,
  } = useAsistenteIA(token ?? '', idTendero);

  if (token === null) {
    return (
      <SafeAreaView style={styles.safe}>
        <ActivityIndicator size="large" color={COLORS.primary} style={{ marginTop: 60 }} />
      </SafeAreaView>
    );
  }

  return (
    <>
      <Stack.Screen options={{ headerShown: false }} />
      <SafeAreaView style={styles.safe}>
        <StatusBar barStyle="light-content" backgroundColor={COLORS.primary} />

        <View style={styles.header}>
          <HeaderIconButton
            icon={ChevronLeft}
            label="Volver"
            onPress={handleCancelar}
            color={COLORS.primary}
            style={styles.backBtn}
          />
          <View style={styles.headerCenter}>
            <Text style={styles.headerTitle}>Asistente IA</Text>
            <Text style={styles.headerSubtitle}>Pregunta sobre tu negocio</Text>
          </View>
          <HeaderIconButton
            icon={Bell}
            label="Avisos"
            onPress={() => router.push('/notificaciones' as any)}
            color={COLORS.primary}
            style={styles.bellBtn}
          />
        </View>

        <KeyboardAvoidingView
          style={styles.body}
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          keyboardVerticalOffset={0}
        >
          <ScrollView
            ref={scrollRef}
            style={styles.chat}
            contentContainerStyle={styles.chatContent}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
          >
            {mensajes.map((msg) => {
              if (msg.tipo === 'bot') {
                return (
                  <View key={msg.id} style={styles.botRow}>
                    <View style={styles.botAvatar}>
                      <Bot size={20} color={COLORS.white} strokeWidth={2} />
                    </View>
                    <View style={styles.botBubble}>
                      <Text style={styles.botText}>{msg.texto}</Text>
                    </View>
                  </View>
                );
              }

              if (msg.tipo === 'sugerencias') {
                return (
                  <View key={msg.id} style={styles.sugerenciasRow}>
                    {(msg.opciones ?? []).map((op) => (
                      <TouchableOpacity
                        key={op}
                        style={styles.sugerenciaChip}
                        onPress={() => handleSugerencia(op)}
                        activeOpacity={0.7}
                      >
                        <Text style={styles.sugerenciaText}>{op}</Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                );
              }

              return (
                <View key={msg.id} style={styles.userRow}>
                  <View style={styles.userBubble}>
                    <Text style={styles.userText}>{msg.texto}</Text>
                  </View>
                </View>
              );
            })}

            {loading && (
              <View style={styles.botRow}>
                <View style={styles.botAvatar}>
                  <Bot size={20} color={COLORS.white} strokeWidth={2} />
                </View>
                <View style={[styles.botBubble, styles.botBubbleLoading]}>
                  <ActivityIndicator size="small" color={COLORS.primary} />
                  <Text style={styles.typingText}>Pensando...</Text>
                </View>
              </View>
            )}
          </ScrollView>

          <View style={styles.inputWrapper}>
            <View style={styles.divider} />
            <View style={styles.inputRow}>
              <TextInput
                style={styles.textInput}
                placeholder="Escribe tu pregunta..."
                placeholderTextColor={COLORS.textMuted}
                value={input}
                onChangeText={setInput}
                multiline
                returnKeyType="send"
                onSubmitEditing={handleEnviar}
              />
              <TouchableOpacity
                style={[styles.sendBtn, (!input.trim() || loading) && styles.sendBtnDisabled]}
                onPress={handleEnviar}
                disabled={!input.trim() || loading}
                activeOpacity={0.85}
                accessibilityRole="button"
                accessibilityLabel="Enviar mensaje"
              >
                <Send size={20} color={COLORS.white} strokeWidth={2.5} />
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </>
  );
}
