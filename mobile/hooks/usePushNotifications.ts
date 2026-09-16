import { useEffect, useRef } from 'react';
import { Platform } from 'react-native';
import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import { useRouter } from 'expo-router';
import { CONFIG } from '@/config/config';

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

type RecordatorioNotificationData = {
  type?: 'recordatorio_cliente' | 'recordatorio_tendero';
  creditoId?: string | number;
  clienteId?: string | number;
};

const navigateFromNotificationData = (
  data: RecordatorioNotificationData | undefined,
  router: ReturnType<typeof useRouter>
) => {
  if (!data?.type) return;

  if (data.type === 'recordatorio_cliente' && data.creditoId) {
    router.push({
      pathname: '/creditoDetalle',
      params: { id: String(data.creditoId) },
    } as any);
  } else if (data.type === 'recordatorio_tendero' && data.clienteId) {
    router.push({
      pathname: '/perfilCliente',
      params: {
        id: String(data.clienteId),
        creditoId: data.creditoId ? String(data.creditoId) : '',
      },
    } as any);
  }
};

// El canal debe existir antes de que llegue el primer push: es el que declara
// `defaultChannel` en el plugin expo-notifications de app.json.
const ANDROID_CHANNEL_ID = 'default';

const ensureAndroidNotificationChannel = async () => {
  if (Platform.OS !== 'android') return;

  await Notifications.setNotificationChannelAsync(ANDROID_CHANNEL_ID, {
    name: 'Recordatorios FiadoCheck',
    importance: Notifications.AndroidImportance.MAX,
    lightColor: '#00D09E',
  });
};

export const usePushNotificationListener = () => {
  const router = useRouter();
  const responseListener = useRef<Notifications.EventSubscription | null>(null);

  useEffect(() => {
    if (Platform.OS === 'web') return;

    ensureAndroidNotificationChannel().catch((e) =>
      console.error('Error creando el canal de notificaciones', e)
    );

    Notifications.getLastNotificationResponseAsync().then((response) => {
      if (response?.notification.request.content.data) {
        navigateFromNotificationData(
          response.notification.request.content.data as RecordatorioNotificationData,
          router
        );
      }
    });

    responseListener.current = Notifications.addNotificationResponseReceivedListener((response) => {
      navigateFromNotificationData(
        response.notification.request.content.data as RecordatorioNotificationData,
        router
      );
    });

    return () => {
      responseListener.current?.remove();
    };
  }, [router]);
};

export const registerPushToken = async (authToken: string) => {
  if (Platform.OS === 'web') return;

  try {
    await ensureAndroidNotificationChannel();

    if (!Device.isDevice) {
      console.log('[push] Omitido: no es un dispositivo físico (emulador/simulador).');
      return;
    }

    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;
    console.log('[push] Estado de permiso actual:', existingStatus);
    if (existingStatus !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
      console.log('[push] Estado de permiso tras solicitarlo:', status);
    }
    if (finalStatus !== 'granted') {
      console.log('[push] Permiso de notificaciones NO concedido, no se registra el token.');
      return;
    }

    const pushTokenData = await Notifications.getExpoPushTokenAsync();
    const pushToken = pushTokenData.data;
    console.log('[push] Token obtenido:', pushToken);
    if (!pushToken) return;

    const response = await fetch(`${CONFIG.API_URL}/auth/push-token`, {
      method: 'PUT',
      headers: {
        'Authorization': `Bearer ${authToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ pushToken }),
    });
    console.log('[push] Respuesta del backend al registrar token:', response.status);
  } catch (e) {
    console.error('Error registrando push token', e);
  }
};
