import React from 'react';
import { View, StyleSheet } from 'react-native';
import { ModeSelector } from './ModeSelector';
import { CameraToolbar } from './CameraToolbar';

interface CameraControlsProps {
  selectedMode: 'photo' | 'scan' | 'video' | 'portrait';
  onModeChange: (mode: 'photo' | 'scan' | 'video' | 'portrait') => void;
  onGallery: () => void;
  onAskAI: () => void;
  onSwitchCamera: () => void;
  isRecording?: boolean;
  onStartRecording?: () => void;
  onStopRecording?: () => void;
}

export function CameraControls({
  selectedMode,
  onModeChange,
  onGallery,
  onAskAI,
  onSwitchCamera,
  isRecording,
  onStartRecording,
  onStopRecording,
}: CameraControlsProps) {
  return (
    <View style={styles.wrapper}>
      <ModeSelector selectedMode={selectedMode} onModeChange={onModeChange} />
      <CameraToolbar
        onGallery={onGallery}
        onAskAI={onAskAI}
        onSwitchCamera={onSwitchCamera}
        selectedMode={selectedMode}
        isRecording={isRecording}
        onStartRecording={onStartRecording}
        onStopRecording={onStopRecording}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    flex: 1,
    justifyContent: 'flex-end',
  },
});
