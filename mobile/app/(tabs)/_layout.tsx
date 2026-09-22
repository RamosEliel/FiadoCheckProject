import { Tabs, useFocusEffect } from 'expo-router';
import React, { useCallback, useState } from 'react';
import { ActivityIndicator, View } from 'react-native';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { Bot } from 'lucide-react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

import { HapticTab } from '@/components/haptic-tab';
import { AppDialog } from '@/components/ui/AppDialog';
import { AppFonts, Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { COLORS } from '@/constants/colors';
import { useAppDialog } from '@/hooks/useAppDialog';
import { useConsumeLoginWelcome } from '@/hooks/useConsumeLoginWelcome';

export default function TabLayout() {
  const colorScheme = useColorScheme();
  const palette = Colors[colorScheme ?? 'light'].palette ?? Colors.light.palette;
  const [isTendero, setIsTendero] = useState<boolean | null>(null);
  const { dialog, showSuccess, hide } = useAppDialog();
  useConsumeLoginWelcome('tabs', showSuccess);

  useFocusEffect(
    useCallback(() => {
      let active = true;

      const checkRole = async () => {
        try {
          const [tenderoRaw, usuarioRaw] = await Promise.all([
            AsyncStorage.getItem('tendero'),
            AsyncStorage.getItem('usuario'),
          ]);

          if (!active) return;

          if (usuarioRaw) {
            const user = JSON.parse(usuarioRaw);
            if (user.id_rol == 2) {
              setIsTendero(false);
              return;
            }
            if (user.id_rol == 1) {
              setIsTendero(true);
              return;
            }
          }

          if (tenderoRaw && tenderoRaw !== 'null') {
            setIsTendero(true);
            return;
          }

          setIsTendero(false);
        } catch {
          if (active) setIsTendero(false);
        }
      };

      checkRole();
      return () => { active = false; };
    }, [])
  );

  return (
    <>
    {isTendero === null ? (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: COLORS.primary }}>
        <ActivityIndicator size="large" color={COLORS.white} />
      </View>
    ) : (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: palette.primary,
        tabBarInactiveTintColor: palette.textMuted,
        headerShown: false,
        tabBarButton: HapticTab,
        tabBarStyle: {
          backgroundColor: palette.tabBarBg ?? palette.surface,
          borderTopWidth: 0,
          elevation: 0,
          height: 72,
          paddingTop: 10,
          paddingBottom: 12,
        },
        tabBarLabelStyle: {
          fontSize: 11,
          marginTop: 6,
          fontFamily: AppFonts.regular,
        },
      }}>

      <Tabs.Screen
        name="dashboard"
        options={{
          title: 'Inicio',
          href: isTendero ? undefined : null,
          tabBarIcon: ({ color }) => <MaterialIcons size={26} name="home" color={color} />,
        }}
      />
      <Tabs.Screen
        name="clientes"
        options={{
          title: 'Clientes',
          href: isTendero ? undefined : null,
          tabBarIcon: ({ color }) => <MaterialIcons size={26} name="people" color={color} />,
        }}
      />
      <Tabs.Screen
        name="Asistenteia"
        options={{
          title: 'Asistente',
          href: isTendero ? undefined : null,
          tabBarIcon: ({ color }) => <Bot size={24} color={color} strokeWidth={2} />,
          tabBarHideOnKeyboard: true,
        }}
      />

      <Tabs.Screen
        name="vistaUsuario"
        options={{
          title: 'Inicio',
          href: !isTendero ? undefined : null,
          tabBarIcon: ({ color }) => <MaterialIcons size={26} name="home" color={color} />,
        }}
      />
      <Tabs.Screen
        name="avisos"
        options={{
          title: 'Avisos',
          href: !isTendero ? undefined : null,
          tabBarIcon: ({ color }) => <MaterialIcons size={26} name="notifications-none" color={color} />,
        }}
      />
      <Tabs.Screen
        name="tiendas"
        options={{
          title: 'Tiendas',
          href: !isTendero ? undefined : null,
          tabBarIcon: ({ color }) => <MaterialIcons size={26} name="storefront" color={color} />,
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: isTendero ? 'Más' : 'Perfil',
          tabBarIcon: ({ color }) => (
            <MaterialIcons size={26} name={isTendero ? 'apps' : 'person-outline'} color={color} />
          ),
        }}
      />

      <Tabs.Screen name="pagos" options={{ href: null }} />
      <Tabs.Screen name="reportes" options={{ href: null }} />
      <Tabs.Screen name="Analitica" options={{ href: null }} />
      <Tabs.Screen name="perfilCliente" options={{ href: null }} />
    </Tabs>
    )}
    <AppDialog
      visible={dialog.visible}
      variant={dialog.variant}
      title={dialog.title}
      message={dialog.message}
      onClose={hide}
    />
    </>
  );
}
