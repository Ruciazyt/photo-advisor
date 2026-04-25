import React from 'react';
import { Text, TouchableOpacity } from 'react-native';
import { useAccessibilityButton } from '../hooks/useAccessibility';
import { FOCUS_ZONES } from './FocusGuideOverlay';

export interface FocusZoneButtonProps {
  zone: (typeof FOCUS_ZONES)[number];
  style: object;
  labelStyle: object;
  subStyle: object;
  onPress: () => void;
}

export function FocusZoneButton({ zone, style, labelStyle, subStyle, onPress }: FocusZoneButtonProps) {
  const a11yProps = useAccessibilityButton({
    label: `对焦区域：${zone.label}`,
    hint:
      zone.label === '远景'
        ? '切换到远景对焦（无穷远），适合风景和建筑'
        : zone.label === '标准'
        ? '切换到标准对焦（约3米），适合人文和抓拍'
        : '切换到近拍对焦（约0.5米），适合微距和特写',
    role: 'button',
    enabled: true,
  });
  return (
    <TouchableOpacity
      style={style}
      onPress={onPress}
      activeOpacity={0.7}
      {...a11yProps}
    >
      <Text style={labelStyle}>{zone.label}</Text>
      <Text style={subStyle}>{zone.sub}</Text>
    </TouchableOpacity>
  );
}
