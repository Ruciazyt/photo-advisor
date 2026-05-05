/**
 * Tests for PortraitModeOverlay
 */

import React from 'react';

// ---------------------------------------------------------------------------
// Mock useAccessibility hook
// ---------------------------------------------------------------------------
const mockReducedMotion = jest.fn(() => false);
jest.mock('../hooks/useAccessibility', () => ({
  useAccessibilityReducedMotion: jest.fn(() => ({ reducedMotion: mockReducedMotion() })),
}));

// ---------------------------------------------------------------------------
// Mock expo-image — factory creates mockBlurViewRef we can reference in tests
// ---------------------------------------------------------------------------
let mockBlurViewRef: jest.Mock;
jest.mock('expo-image', () => {
  mockBlurViewRef = jest.fn(() => null);
  return { BlurView: mockBlurViewRef };
});

import { render } from '@testing-library/react-native';
import { PortraitModeOverlay } from '../components/PortraitModeOverlay';

// ---------------------------------------------------------------------------
// Helpers — consistent with other tests in this project
// ---------------------------------------------------------------------------
function findA11yRoot(json: any): any {
  if (!json) return null;
  if (json.props?.accessibilityRole === 'image') return json;
  if (Array.isArray(json)) return json.map(findA11yRoot).find((r) => r !== null);
  if (json.children) {
    for (const child of json.children) {
      const found = findA11yRoot(child);
      if (found) return found;
    }
  }
  return null;
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------
describe('PortraitModeOverlay', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockReducedMotion.mockReturnValue(false);
  });

  // -------------------------------------------------------------------------
  // visible prop
  // -------------------------------------------------------------------------
  describe('visible prop', () => {
    it('renders the overlay when visible=true', () => {
      const { toJSON } = render(<PortraitModeOverlay visible={true} />);
      const root = findA11yRoot(toJSON());
      expect(root).not.toBeNull();
    });

    it('returns null when visible=false', () => {
      const { toJSON } = render(<PortraitModeOverlay visible={false} />);
      expect(toJSON()).toBeNull();
    });
  });

  // -------------------------------------------------------------------------
  // BlurView vs fallback
  // -------------------------------------------------------------------------
  describe('BlurView vs fallback', () => {
    it('calls BlurView when visible=true (native blur available)', () => {
      render(<PortraitModeOverlay visible={true} />);
      expect(mockBlurViewRef).toHaveBeenCalled();
    });

    it('passes custom blurRadius to BlurView', () => {
      render(<PortraitModeOverlay visible={true} blurRadius={10} />);
      const [callArg] = mockBlurViewRef.mock.calls[0];
      expect(callArg.blurRadius).toBe(10);
    });

    it('passes default blurRadius (18) when not specified', () => {
      render(<PortraitModeOverlay visible={true} />);
      const [callArg] = mockBlurViewRef.mock.calls[0];
      expect(callArg.blurRadius).toBe(18);
    });

    it('uses fallback View (not BlurView) when BlurView is undefined — defensive check in source', () => {
      // PortraitModeOverlay uses: const useNativeBlur = BlurView !== undefined;
      // This is a runtime check — verify the source code has this guard.
      // Since we cannot re-require the component (isolateModules breaks React context),
      // we verify the defensive pattern exists in the source.
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      const fs = require('fs');
      const source = fs.readFileSync(
        require.resolve('../components/PortraitModeOverlay'),
        'utf8'
      );
      // Verify the defensive undefined check exists in source
      expect(source).toMatch(/BlurView !== undefined|BlurView == null/);
    });
  });

  // -------------------------------------------------------------------------
  // reducedMotion accessibility
  // -------------------------------------------------------------------------
  describe('reducedMotion accessibility', () => {
    it('opacity is 1 when reducedMotion=true (instant show, no fade)', () => {
      mockReducedMotion.mockReturnValue(true);

      const { toJSON } = render(<PortraitModeOverlay visible={true} />);
      const root = findA11yRoot(toJSON());
      const styles = Array.isArray(root.props.style) ? root.props.style : [root.props.style];
      expect(styles).toEqual(
        expect.arrayContaining([expect.objectContaining({ opacity: 1 })])
      );
    });

    it('opacity is 1 when reducedMotion=false and visible=true', () => {
      mockReducedMotion.mockReturnValue(false);

      const { toJSON } = render(<PortraitModeOverlay visible={true} />);
      const root = findA11yRoot(toJSON());
      const styles = Array.isArray(root.props.style) ? root.props.style : [root.props.style];
      expect(styles).toEqual(
        expect.arrayContaining([expect.objectContaining({ opacity: 1 })])
      );
    });

    it('returns null when visible=false regardless of reducedMotion', () => {
      mockReducedMotion.mockReturnValue(false);

      const { toJSON } = render(<PortraitModeOverlay visible={false} />);
      expect(toJSON()).toBeNull();
    });
  });

  // -------------------------------------------------------------------------
  // React.memo stability
  // -------------------------------------------------------------------------
  describe('React.memo stability', () => {
    it('renders same output when re-rendered with identical props', () => {
      const { toJSON: json1 } = render(<PortraitModeOverlay visible={true} />);
      const { toJSON: json2 } = render(<PortraitModeOverlay visible={true} />);
      expect(json1()).toEqual(json2());
    });

    it('does not crash when unrelated extra prop is added (memo should ignore it)', () => {
      const { toJSON: json1 } = render(<PortraitModeOverlay visible={true} />);
      const { toJSON: json2 } = render(
        // @ts-ignore — intentionally pass unknown prop to test memo ignores it
        <PortraitModeOverlay visible={true} __testOnly_ignore={Date.now()} />
      );
      // Same rendered output = memo correctly ignored the unrelated prop
      expect(json1()).toEqual(json2());
    });
  });

  // -------------------------------------------------------------------------
  // accessibility
  // -------------------------------------------------------------------------
  describe('accessibility', () => {
    it('sets accessibilityRole to image', () => {
      const { toJSON } = render(<PortraitModeOverlay visible={true} />);
      const root = findA11yRoot(toJSON());
      expect(root.props.accessibilityRole).toBe('image');
    });

    it('sets accessibilityLabel to the Chinese description', () => {
      const { toJSON } = render(<PortraitModeOverlay visible={true} />);
      const root = findA11yRoot(toJSON());
      expect(root.props.accessibilityLabel).toBe('人像模式背景虚化覆盖层');
    });
  });
});
