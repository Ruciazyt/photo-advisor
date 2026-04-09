import React from 'react';
import { View, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

interface CameraToolbarProps {
  onGallery: () => void;
  onAskAI: () => void;
  onSwitchCamera: () => void;
}

export function CameraToolbar({ onGallery, onAskAI, onSwitchCamera }: CameraToolbarProps) {
  return (
    <View style={styles.toolbar}>
      {/* Left: Gallery */}
      <TouchableOpacity
        style={styles.toolBtn}
        onPress={onGallery}
        activeOpacity={0.7}
      >
        <Ionicons name="images-outline" size={28} color="#fff" />
      </TouchableOpacity>

      {/* Center: Ask AI */}
      <TouchableOpacity
        style={styles.captureBtn}
        onPress={onAskAI}
        activeOpacity={0.7}
      >
        <View style={styles.captureBtnInner} />
      </TouchableOpacity>

      {/* Right: Switch Camera */}
      <TouchableOpacity
        style={styles.toolBtn}
        onPress={onSwitchCamera}
        activeOpacity={0.7}
      >
        <Ionicons name="camera-reverse-outline" size={28} color="#fff" />
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  toolbar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    paddingBottom: 12,
    paddingTop: 20,
    backgroundColor: 'rgba(0,0,0,0.4)',
  },
  toolBtn: {
    width: 50,
    height: 50,
    justifyContent: 'center',
    alignItems: 'center',
  },
  captureBtn: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: '#fff',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 4,
    borderColor: 'rgba(255,255,255,0.5)',
  },
  captureBtnInner: {
    width: 58,
    height: 58,
    borderRadius: 29,
    backgroundColor: '#fff',
  },
});
