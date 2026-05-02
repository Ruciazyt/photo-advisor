import { useSharedValue, withTiming, Easing, runOnJS } from 'react-native-reanimated';
import { useState, useCallback, useRef } from 'react';

export function useToast() {
  const opacity = useSharedValue(0);
  const [message, setMessage] = useState('');
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const clearMessage = useCallback(() => {
    setMessage('');
  }, []);

  const showToast = useCallback((msg: string) => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    setMessage(msg);
    opacity.value = withTiming(1, { duration: 200, easing: Easing.out(Easing.ease) });
    timeoutRef.current = setTimeout(() => {
      opacity.value = withTiming(0, { duration: 200, easing: Easing.in(Easing.ease) });
      runOnJS(clearMessage)();
    }, 1200);
  }, [opacity, clearMessage]);

  return { opacity, toastMessage: message, showToast };
}