/**
 * Tests for SceneTagOverlay component
 */

import React from 'react';
import { render } from '@testing-library/react-native';
import { SceneTagOverlay } from '../components/SceneTagOverlay';

describe('SceneTagOverlay', () => {
  it('renders nothing when tag is null', () => {
    const { toJSON } = render(
      <SceneTagOverlay tag={null} visible={true} />
    );
    expect(toJSON()).toBeNull();
  });

  it('renders nothing when tag is empty string', () => {
    const { toJSON } = render(
      <SceneTagOverlay tag="" visible={true} />
    );
    expect(toJSON()).toBeNull();
  });

  it('renders nothing when tag is empty string even with visible=false', () => {
    const { toJSON } = render(
      <SceneTagOverlay tag="" visible={false} />
    );
    expect(toJSON()).toBeNull();
  });

  it('renders the tag text when visible=true and tag is set', () => {
    const { getByText } = render(
      <SceneTagOverlay tag="风光" visible={true} />
    );
    expect(getByText('风光')).toBeTruthy();
  });

  it('renders the tag text for different scene types', () => {
    const { getByText: getByText1, rerender } = render(
      <SceneTagOverlay tag="人像" visible={true} />
    );
    expect(getByText1('人像')).toBeTruthy();

    rerender(<SceneTagOverlay tag="美食" visible={true} />);
    expect(getByText1('美食')).toBeTruthy();

    rerender(<SceneTagOverlay tag="夜景" visible={true} />);
    expect(getByText1('夜景')).toBeTruthy();
  });

  it('renders camera emoji label alongside the tag', () => {
    const { getByText } = render(
      <SceneTagOverlay tag="风光" visible={true} />
    );
    // The badge includes a camera emoji
    expect(getByText('📷')).toBeTruthy();
    expect(getByText('风光')).toBeTruthy();
  });

  it('applies pill-shaped badge style', () => {
    const { toJSON } = render(
      <SceneTagOverlay tag="微距" visible={true} />
    );
    const tree = toJSON();
    expect(tree).toBeTruthy();
    const json = JSON.stringify(tree);
    // Should have borderRadius styling for pill shape
    expect(json).toContain('borderRadius');
    // Should have dark semi-transparent background
    expect(json).toContain('rgba');
    // Should have absolute positioning
    expect(json).toContain('position');
  });

  it('renders as a container with absolute positioning', () => {
    const { toJSON } = render(
      <SceneTagOverlay tag="建筑" visible={true} />
    );
    const tree = toJSON();
    expect(tree).toBeTruthy();
    const json = JSON.stringify(tree);
    expect(json).toContain('"position"');
    expect(json).toContain('"absolute"');
  });
});
