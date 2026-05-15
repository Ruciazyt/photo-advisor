/**
 * Tests for EXIF metadata extraction service.
 */
import {
  getExifData,
  formatShutterSpeed,
  formatGpsCoord,
  getReadableExif,
  ExifData,
} from '../services/exif';

// Mock expo-image before importing the service
jest.mock('expo-image', () => {
  const actual = jest.requireActual('expo-image');
  return {
    ...actual,
    Image: {
      ...actual.Image,
      getInfoAsync: jest.fn(),
    },
  };
});

import { Image } from 'expo-image';

const mockGetInfoAsync = Image.getInfoAsync as jest.MockedFunction<typeof Image.getInfoAsync>;

describe('exif service', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('getExifData', () => {
    it('parses EXIF from getInfoAsync response correctly', async () => {
      const mockExif = {
        Make: 'Apple',
        Model: 'iPhone 15 Pro',
        DateTime: '2024:03:15 10:30:00',
        GPSLatitude: 40.4461,
        GPSLongitude: -79.9489,
        ISOSpeedRatings: 100,
        FNumber: 1.8,
        ExposureTime: 0.001,
        FocalLength: 5.76,
        Flash: 0,
        PixelXDimension: 4032,
        PixelYDimension: 3024,
        Orientation: 1,
      };

      mockGetInfoAsync.mockResolvedValueOnce({
        uri: 'file:///test/photo.jpg',
        width: 4032,
        height: 3024,
        mediaType: 'image/jpeg',
        scale: 1,
        exif: mockExif,
      } as any);

      const result = await getExifData('file:///test/photo.jpg');

      expect(result).toEqual({
        make: 'Apple',
        model: 'iPhone 15 Pro',
        dateTime: '2024:03:15 10:30:00',
        gpsLatitude: 40.4461,
        gpsLongitude: -79.9489,
        iso: 100,
        aperture: 1.8,
        shutterSpeed: 0.001,
        focalLength: 5.76,
        exposureTime: 0.001,
        flashFired: false,
        imageWidth: 4032,
        imageHeight: 3024,
        orientation: 1,
      });
    });

    it('returns null when getInfoAsync throws', async () => {
      mockGetInfoAsync.mockRejectedValueOnce(new Error('Failed to read image'));

      const result = await getExifData('file:///bad/photo.jpg');

      expect(result).toBeNull();
    });

    it('returns null when no exif data is present', async () => {
      mockGetInfoAsync.mockResolvedValueOnce({
        uri: 'file:///test/photo.jpg',
        width: 4032,
        height: 3024,
        mediaType: 'image/jpeg',
        scale: 1,
      } as any);

      const result = await getExifData('file:///test/photo.jpg');

      expect(result).toBeNull();
    });

    it('extracts DateTimeOriginal when DateTime is absent', async () => {
      mockGetInfoAsync.mockResolvedValueOnce({
        uri: 'file:///test/photo.jpg',
        width: 4032,
        height: 3024,
        mediaType: 'image/jpeg',
        scale: 1,
        exif: {
          Make: 'Apple',
          DateTimeOriginal: '2024:05:01 14:22:00',
          // no DateTime
        },
      } as any);

      const result = await getExifData('file:///test/photo.jpg');
      expect(result?.dateTime).toBe('2024:05:01 14:22:00');
    });

    it('handles flash fired as bitmask (bit 0)', async () => {
      mockGetInfoAsync.mockResolvedValueOnce({
        uri: 'file:///test/photo.jpg',
        width: 4032,
        height: 3024,
        mediaType: 'image/jpeg',
        scale: 1,
        exif: {
          Flash: 1, // fired
          Make: 'Canon',
        },
      } as any);

      const result = await getExifData('file:///test/photo.jpg');
      expect(result?.flashFired).toBe(true);
    });

    it('handles flash fired as boolean true', async () => {
      mockGetInfoAsync.mockResolvedValueOnce({
        uri: 'file:///test/photo.jpg',
        width: 4032,
        height: 3024,
        mediaType: 'image/jpeg',
        scale: 1,
        exif: {
          Flash: true,
          Make: 'Sony',
        },
      } as any);

      const result = await getExifData('file:///test/photo.jpg');
      expect(result?.flashFired).toBe(true);
    });
  });

  describe('formatShutterSpeed', () => {
    it('formats 1 second', () => {
      expect(formatShutterSpeed(1)).toBe('1s');
    });

    it('formats 0.5 as 1/2', () => {
      expect(formatShutterSpeed(0.5)).toBe('1/2');
    });

    it('formats 0.001 as 1/1000', () => {
      expect(formatShutterSpeed(0.001)).toBe('1/1000');
    });

    it('formats 1/8000 (0.000125) correctly', () => {
      expect(formatShutterSpeed(1 / 8000)).toBe('1/8000');
    });

    it('formats 30 seconds', () => {
      expect(formatShutterSpeed(30)).toBe('30s');
    });

    it('formats 0.004 (1/250)', () => {
      expect(formatShutterSpeed(0.004)).toBe('1/250');
    });
  });

  describe('formatGpsCoord', () => {
    it('formats positive latitude (N)', () => {
      expect(formatGpsCoord(40.4461, true)).toBe("40°26'46.0\"N");
    });

    it('formats negative latitude (S)', () => {
      expect(formatGpsCoord(-33.8688, true)).toBe("33°52'7.7\"S");
    });

    it('formats positive longitude (E)', () => {
      expect(formatGpsCoord(151.2093, false)).toBe("151°12'33.5\"E");
    });

    it('formats negative longitude (W)', () => {
      expect(formatGpsCoord(-79.9489, false)).toBe("79°56'56.0\"W");
    });
  });

  describe('getReadableExif', () => {
    it('produces expected fields', () => {
      const exif: ExifData = {
        make: 'Apple',
        model: 'iPhone 15 Pro',
        dateTime: '2024:03:15 10:30:00',
        gpsLatitude: 40.4461,
        gpsLongitude: -79.9489,
        iso: 100,
        aperture: 1.8,
        exposureTime: 0.001,
        focalLength: 5.76,
        flashFired: false,
        imageWidth: 4032,
        imageHeight: 3024,
        orientation: 1,
      };

      const result = getReadableExif(exif);

      expect(result['Make']).toBe('Apple');
      expect(result['Model']).toBe('iPhone 15 Pro');
      expect(result['DateTime']).toBe('2024:03:15 10:30:00');
      expect(result['ISO']).toBe('100');
      expect(result['Aperture']).toBe('f/1.8');
      expect(result['Shutter']).toBe('1/1000');
      expect(result['FocalLength']).toBe('5.8mm');
      expect(result['Flash']).toBe('Off');
      expect(result['Dimensions']).toBe('4032 × 3024');
      expect(result['Orientation']).toBe('1');
      expect(result['Latitude']).toBe("40°26'46.0\"N");
      expect(result['Longitude']).toBe("79°56'56.0\"W");
    });

    it('omits undefined fields', () => {
      const exif: ExifData = {
        make: 'Apple',
        iso: 200,
      };

      const result = getReadableExif(exif);

      expect(Object.keys(result)).toEqual(['Make', 'ISO']);
    });

    it('handles flash fired true', () => {
      const exif: ExifData = { flashFired: true };
      expect(getReadableExif(exif)['Flash']).toBe('Fired');
    });
  });
});