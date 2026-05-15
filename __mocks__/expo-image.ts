import { Image } from 'expo-image';

export const getInfoAsync = jest.fn();

export class MockImageRef {
  width = 4032;
  height = 3024;
  scale = 1;
  mediaType = 'image/jpeg';
}

Image.getInfoAsync = getInfoAsync;