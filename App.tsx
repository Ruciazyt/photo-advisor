import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, SafeAreaView, StatusBar } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { HomeScreen } from './src/screens/HomeScreen';
import { CameraScreen } from './src/screens/CameraScreen';
import { FavoritesScreen } from './src/screens/FavoritesScreen';
import { ShootLogScreen } from './src/screens/ShootLogScreen';
import { SettingsScreen } from './src/screens/SettingsScreen';
import { AnalysisHistoryScreen } from './src/screens/AnalysisHistoryScreen';
import { ThemeProvider, useTheme } from './src/contexts/ThemeContext';
import { SettingsProvider } from './src/contexts/SettingsContext';
import { ErrorBoundary } from './src/components/ErrorBoundary';

type Tab = 'home' | 'camera' | 'favorites' | 'log' | 'settings' | 'history';

function AppContent() {
  const [activeTab, setActiveTab] = useState<Tab>('home');
  const { colors } = useTheme();

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.primary }]}>
      <StatusBar barStyle={colors.primary === '#000000' ? 'light-content' : 'dark-content'} backgroundColor={colors.primary} />
      <View style={styles.content}>
        {activeTab === 'home' && (
          <HomeScreen onNavigateToHistory={() => setActiveTab('history')} />
        )}
        {activeTab === 'camera' && <CameraScreen />}
        {activeTab === 'favorites' && <FavoritesScreen />}
        {activeTab === 'log' && <ShootLogScreen />}
        {activeTab === 'settings' && <SettingsScreen onSaved={() => setActiveTab('home')} />}
        {activeTab === 'history' && <AnalysisHistoryScreen onBack={() => setActiveTab('home')} />}
      </View>
      <View style={[styles.tabBar, { backgroundColor: colors.cardBg, borderTopColor: colors.border }]}>
        <TouchableOpacity
          style={styles.tabItem}
          onPress={() => setActiveTab('home')}
          activeOpacity={0.7}
        >
          <Ionicons
            name={activeTab === 'home' ? 'images' : 'images-outline'}
            size={24}
            color={activeTab === 'home' ? colors.accent : colors.textSecondary}
          />
          <Text
            style={[
              styles.tabLabel,
              { color: activeTab === 'home' ? colors.accent : colors.textSecondary },
            ]}
          >
            照片
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.tabItem}
          onPress={() => setActiveTab('camera')}
          activeOpacity={0.7}
        >
          <Ionicons
            name={activeTab === 'camera' ? 'camera' : 'camera-outline'}
            size={24}
            color={activeTab === 'camera' ? colors.accent : colors.textSecondary}
          />
          <Text
            style={[
              styles.tabLabel,
              { color: activeTab === 'camera' ? colors.accent : colors.textSecondary },
            ]}
          >
            相机
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.tabItem}
          onPress={() => setActiveTab('favorites')}
          activeOpacity={0.7}
        >
          <Ionicons
            name={activeTab === 'favorites' ? 'heart' : 'heart-outline'}
            size={24}
            color={activeTab === 'favorites' ? colors.accent : colors.textSecondary}
          />
          <Text
            style={[
              styles.tabLabel,
              { color: activeTab === 'favorites' ? colors.accent : colors.textSecondary },
            ]}
          >
            收藏
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.tabItem}
          onPress={() => setActiveTab('log')}
          activeOpacity={0.7}
        >
          <Ionicons
            name={activeTab === 'log' ? 'newspaper' : 'newspaper-outline'}
            size={24}
            color={activeTab === 'log' ? colors.accent : colors.textSecondary}
          />
          <Text
            style={[
              styles.tabLabel,
              { color: activeTab === 'log' ? colors.accent : colors.textSecondary },
            ]}
          >
            日志
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.tabItem}
          onPress={() => setActiveTab('settings')}
          activeOpacity={0.7}
        >
          <Ionicons
            name={activeTab === 'settings' ? 'settings' : 'settings-outline'}
            size={24}
            color={activeTab === 'settings' ? colors.accent : colors.textSecondary}
          />
          <Text
            style={[
              styles.tabLabel,
              { color: activeTab === 'settings' ? colors.accent : colors.textSecondary },
            ]}
          >
            设置
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.tabItem}
          onPress={() => setActiveTab('history')}
          activeOpacity={0.7}
        >
          <Ionicons
            name={activeTab === 'history' ? 'time' : 'time-outline'}
            size={24}
            color={activeTab === 'history' ? colors.accent : colors.textSecondary}
          />
          <Text
            style={[
              styles.tabLabel,
              { color: activeTab === 'history' ? colors.accent : colors.textSecondary },
            ]}
          >
            历史
          </Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

export default function App() {
  return (
    <ThemeProvider>
      <SettingsProvider>
        <ErrorBoundary>
          <AppContent />
        </ErrorBoundary>
      </SettingsProvider>
    </ThemeProvider>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    flex: 1,
  },
  tabBar: {
    flexDirection: 'row',
    borderTopWidth: 1,
    paddingBottom: 20,
    paddingTop: 8,
  },
  tabItem: {
    flex: 1,
    alignItems: 'center',
    gap: 4,
    paddingVertical: 6,
  },
  tabLabel: {
    fontSize: 12,
  },
});
