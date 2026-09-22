import { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Keyboard,
  KeyboardAvoidingView,
  ListRenderItem,
  Platform,
  StatusBar,
  View,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { Stack, router, useFocusEffect } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  ActionBanner,
  ChatComposer,
  ChatHeader,
  MessageBubble,
  SuggestionChips,
  TypingIndicator,
  WelcomeState,
} from '@/components/chat';
import type { Mensaje } from '@/components/chat/types';
import { asistenteIAStyles as styles } from '@/constants/Asistenteia.styles';
import { COLORS } from '@/constants/colors';
import { SUGERENCIAS_INICIALES, useAsistenteIA } from '@/hooks/Useasistenteia';

const IOS_HEADER_OFFSET = 64;

export default function AsistenteIAScreen() {
  const insets = useSafeAreaInsets();
  const [token, setToken] = useState<string | null>(null);
  const [idTendero, setIdTendero] = useState('');
  const [keyboardHeight, setKeyboardHeight] = useState(0);

  useFocusEffect(
    useCallback(() => {
      let active = true;

      Promise.all([AsyncStorage.getItem('token'), AsyncStorage.getItem('tendero')])
        .then(([storedToken, raw]) => {
          if (!active) return;
          setToken(storedToken ?? '');
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
        })
        .catch(() => {
          if (!active) return;
          setToken('');
          setIdTendero('');
        });

      return () => {
        active = false;
      };
    }, []),
  );

  const {
    mensajes,
    input,
    setInput,
    loading,
    scrollRef,
    actionBanner,
    handleEnviar,
    handleSugerencia,
    clearChat,
    retryLast,
  } = useAsistenteIA(token ?? '', idTendero);

  useEffect(() => {
    const showEvent = Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow';
    const hideEvent = Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide';

    const onShow = (e: { endCoordinates: { height: number } }) => {
      setKeyboardHeight(e.endCoordinates.height);
      requestAnimationFrame(() => {
        scrollRef.current?.scrollToEnd({ animated: true });
      });
    };
    const onHide = () => setKeyboardHeight(0);

    const showSub = Keyboard.addListener(showEvent, onShow);
    const hideSub = Keyboard.addListener(hideEvent, onHide);
    return () => {
      showSub.remove();
      hideSub.remove();
    };
  }, [scrollRef]);

  const hasUserMessage = mensajes.some((msg) => msg.tipo === 'usuario');
  const listData = hasUserMessage
    ? mensajes.filter((msg) => msg.id !== 'welcome-chips' && msg.id !== 'welcome-bot')
    : [];
  const welcomeOpciones =
    mensajes.find((msg) => msg.tipo === 'sugerencias')?.opciones ?? SUGERENCIAS_INICIALES;

  const keyboardOpen = keyboardHeight > 0;
  const composerBottom = keyboardOpen
    ? 8
    : 12 + (Platform.OS === 'android' ? Math.min(insets.bottom, 12) : 0);

  const confirmNewChat = () => {
    if (!hasUserMessage) return;

    Alert.alert(
      'Nueva conversación',
      'Se perderá el historial de esta sesión. ¿Quieres empezar de nuevo?',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Empezar de nuevo',
          style: 'destructive',
          onPress: () => {
            void clearChat();
          },
        },
      ],
    );
  };

  const renderItem: ListRenderItem<Mensaje> = ({ item, index }) => {
    const prev = listData[index - 1];
    const grouped = prev?.tipo === item.tipo && item.tipo !== 'sugerencias';

    if (item.tipo === 'sugerencias') {
      return (
        <SuggestionChips
          opciones={item.opciones ?? []}
          onSelect={handleSugerencia}
          disabled={loading}
        />
      );
    }

    const isLastItem = index === listData.length - 1;

    return (
      <MessageBubble
        mensaje={item}
        grouped={grouped}
        onRetry={item.esError && isLastItem && !loading ? retryLast : undefined}
      />
    );
  };

  const placeholder = loading
    ? 'Esperando respuesta…'
    : hasUserMessage
      ? 'Escribe tu pregunta…'
      : 'Pregunta sobre tu cartera…';

  if (token === null) {
    return (
      <SafeAreaView style={styles.safe} edges={['top']}>
        <ActivityIndicator size="large" color={COLORS.white} style={{ marginTop: 60 }} />
      </SafeAreaView>
    );
  }

  return (
    <>
      <Stack.Screen options={{ headerShown: false }} />
      <SafeAreaView style={styles.safe} edges={['top']}>
        <StatusBar barStyle="light-content" backgroundColor={COLORS.primary} />
        <ChatHeader
          loading={loading}
          onBell={() => router.push('/notificaciones' as any)}
          onNewChat={confirmNewChat}
        />

        <KeyboardAvoidingView
          style={styles.body}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          keyboardVerticalOffset={Platform.OS === 'ios' ? IOS_HEADER_OFFSET : 0}
        >
          <View
            style={[
              styles.bodyInner,
              Platform.OS === 'android' ? { paddingBottom: keyboardHeight } : null,
            ]}
          >
            {actionBanner?.visible ? <ActionBanner mensaje={actionBanner.mensaje} /> : null}

            <FlatList
              ref={scrollRef}
              style={styles.chat}
              data={listData}
              keyExtractor={(item) => item.id}
              renderItem={renderItem}
              contentContainerStyle={styles.chatContent}
              showsVerticalScrollIndicator={false}
              keyboardShouldPersistTaps="handled"
              keyboardDismissMode="interactive"
              extraData={loading}
              onContentSizeChange={() => scrollRef.current?.scrollToEnd({ animated: true })}
              ListHeaderComponent={
                hasUserMessage ? null : (
                  <WelcomeState
                    opciones={welcomeOpciones}
                    onSelect={handleSugerencia}
                    disabled={loading}
                  />
                )
              }
              ListFooterComponent={loading ? <TypingIndicator /> : null}
            />

            <ChatComposer
              value={input}
              onChange={setInput}
              onSend={handleEnviar}
              loading={loading}
              placeholder={placeholder}
              bottomInset={composerBottom}
            />
          </View>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </>
  );
}
