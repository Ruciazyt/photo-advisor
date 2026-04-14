import { AccessibilityProps, AccessibilityState } from 'react-native';

/**
 * Returns accessibility props for a TouchableOpacity button.
 * Adds screen-reader labels, hints, and role based on context.
 */
export function useAccessibilityButton(opts: {
  label: string;
  hint?: string;
  enabled?: boolean;
  /** 'button' | 'menuitem' | 'tab' | 'adjustable' */
  role?: AccessibilityProps['accessibilityRole'];
}): Record<string, unknown> {
  const { label, hint, enabled = true, role = 'button' } = opts;

  const accessibilityState: AccessibilityState = {
    disabled: !enabled,
  };

  const props: Record<string, unknown> = {
    accessibilityLabel: label,
    accessibilityRole: role,
    accessibilityState,
  };

  if (hint) {
    props.accessibilityHint = hint;
  }

  return props;
}
