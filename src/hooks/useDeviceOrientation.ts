import { useState, useEffect, useRef, useCallback } from 'react';
import { Accelerometer, AccelerometerMeasurement } from 'expo-sensors';
import { EventSubscription } from 'expo-modules-core';

export interface DeviceOrientation {
  pitch: number; // forward/backward tilt in degrees (-90 to 90)
  roll: number;  // left/right tilt in degrees (-180 to 180)
}

const GRAVITY = 9.81;

function computeOrientation({ x, y, z }: AccelerometerMeasurement): DeviceOrientation {
  // pitch: rotation around X-axis (front/back tilt)
  // roll: rotation around Y-axis (left/right tilt)
  const pitch = Math.atan2(-x, Math.sqrt(y * y + z * z)) * (180 / Math.PI);
  const roll = Math.atan2(y, z) * (180 / Math.PI);
  return { pitch, roll };
}

export function useDeviceOrientation(updateIntervalMs = 100) {
  const [orientation, setOrientation] = useState<DeviceOrientation>({ pitch: 0, roll: 0 });
  const [available, setAvailable] = useState(true);
  const subscriptionRef = useRef<EventSubscription | null>(null);

  useEffect(() => {
    Accelerometer.isAvailableAsync().then((isAvailable) => {
      setAvailable(isAvailable);
      if (!isAvailable) return;
    });

    if (available) {
      Accelerometer.setUpdateInterval(updateIntervalMs);
      subscriptionRef.current = Accelerometer.addListener((measurement) => {
        setOrientation(computeOrientation(measurement));
      });
    }

    return () => {
      subscriptionRef.current?.remove();
    };
  }, [available, updateIntervalMs]);

  return { orientation, available };
}
