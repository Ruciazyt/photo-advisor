export type BubblePosition = 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right' | 'center';

export interface BubbleItem {
  id: number;
  text: string;
  position: BubblePosition;
}
