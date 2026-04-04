import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, SafeAreaView, StatusBar } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { HomeScreen } from './src/screens/HomeScreen';
import { CameraScreen } from './src/screens/CameraScreen';
import { SettingsScreen } from './src/screens/SettingsScreen';
import { Colors } from './src/constants/colors';

type Tab = 'home' | 'camera' | 'settings';

export default function App() {
  const [activeTab, setActiveTab] = useState<Tab>('home');

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor={Colors.primary} />
      <View style={styles.content}>
        {activeTab === 'home' && <HomeScreen />}
        {activeTab === 'camera' && <CameraScreen />}
        {activeTab === 'settings' && <SettingsScreen onSaved={() => setActiveTab('home')} />}
      </View>
      <View style={styles.tabBar}>
        <TouchableOpacity
          style={styles.tabItem}
          onPress={() => setActiveTab('home')}
          activeOpacity={0.7}
        >
          <Ionicons
            name={activeTab === 'home' ? 'images' : 'images-outline'}
            size={24}
            color={activeTab === 'home' ? Colors.accent : Colors.textSecondary}
          />
          <Text
            style={[
              styles.tabLabel,
              activeTab === 'home' && styles.tabLabelActive,
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
            color={activeTab === 'camera' ? Colors.accent : Colors.textSecondary}
          />
          <Text
            style={[
              styles.tabLabel,
              activeTab === 'camera' && styles.tabLabelActive,
            ]}
          >
            相机
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
            color={activeTab === 'settings' ? Colors.accent : Colors.textSecondary}
          />
          <Text
            style={[
              styles.tabLabel,
              activeTab === 'settings' && styles.tabLabelActive,
            ]}
          >
            设置
          </Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.primary,
  },
  content: {
    flex: 1,
  },
  tabBar: {
    flexDirection: 'row',
    backgroundColor: Colors.cardBg,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
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
    color: Colors.textSecondary,
    fontSize: 12,
  },
  tabLabelActive: {
    color: Colors.accent,
    fontWeight: '600',
  },
});
