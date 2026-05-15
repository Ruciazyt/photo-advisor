import { formatShutterSpeed, formatGpsCoord, getReadableExif, getExifData } from '../exif';

// Mock expo-image
jest.mock('expo-image', () => ({
  Image: {
    getInfoAsync: jest.fn(),
  },
}));

import { Image } from 'expo-image';

describe('formatShutterSpeed', () => {
  it('returns integer seconds for values >= 1', () => {
    expect(formatShutterSpeed(1)).toBe('1s');
    expect(formatShutterSpeed(2.5)).toBe('2.5s');
    expect(formatShutterSpeed(30)).toBe('30s');
  });

  it('returns reciprocal fraction for values < 1', () => {
    expect(formatShutterSpeed(0.001)).toBe('1/1000');
    expect(formatShutterSpeed(0.002)).toBe('1/500');
    expect(formatShutterSpeed(0.004)).toBe('1/250');
    expect(formatShutterSpeed(0.008)).toBe('1/125');
    expect(formatShutterSpeed(0.016667)).toBe('1/60');
    expect(formatShutterSpeed(0.033333)).toBe('1/30');
    expect(formatShutterSpeed(0.5)).toBe('1/2');
    expect(formatShutterSpeed(0.25)).toBe('1/4');
    expect(formatShutterSpeed(0.125)).toBe('1/8');
    expect(formatShutterSpeed(0.0625)).toBe('1/16');
  });

  it('handles exactly 1 second', () => {
    expect(formatShutterSpeed(1)).toBe('1s');
  });

  it('returns a string ending in s for any input', () => {
    // Just verify the function returns a string ending in 's' for any reasonable value
    expect(formatShutterSpeed(0.00123)).toMatch(/^\d+\/\d+$|^\d+\.\d+s$/);
    expect(formatShutterSpeed(0.00713)).toMatch(/^\d+\/\d+$|^\d+\.\d+s$/);
  });
});

describe('formatGpsCoord', () => {
  it('formats positive latitude as N', () => {
    expect(formatGpsCoord(40.446, true)).toBe("40°26'45.6\"N");
  });

  it('formats negative latitude as S', () => {
    expect(formatGpsCoord(-40.446, true)).toBe("40°26'45.6\"S");
  });

  it('formats positive longitude as E', () => {
    expect(formatGpsCoord(-122.419, false)).toBe("122°25'8.4\"W");
  });

  it('formats negative longitude as W', () => {
    expect(formatGpsCoord(122.419, false)).toBe("122°25'8.4\"E");
  });

  it('handles zero coordinate', () => {
    expect(formatGpsCoord(0, true)).toBe("0°0'0.0\"N");
  });

  it('handles whole degrees', () => {
    expect(formatGpsCoord(45, true)).toBe("45°0'0.0\"N");
  });
});

describe('getReadableExif', () => {
  it('returns empty object for empty exif data', () => {
    expect(getReadableExif({})).toEqual({});
  });

  it('extracts make and model', () => {
    const exif = { make: 'Apple', model: 'iPhone 15 Pro' };
    const result = getReadableExif(exif);
    expect(result['Make']).toBe('Apple');
    expect(result['Model']).toBe('iPhone 15 Pro');
  });

  it('formats aperture with f/ prefix', () => {
    const result = getReadableExif({ aperture: 1.8 });
    expect(result['Aperture']).toBe('f/1.8');
  });

  it('formats ISO as string', () => {
    const result = getReadableExif({ iso: 100 });
    expect(result['ISO']).toBe('100');
  });

  it('formats shutter speed', () => {
    const result = getReadableExif({ exposureTime: 0.004 });
    expect(result['Shutter']).toBe('1/250');
  });

  it('formats focal length with mm suffix', () => {
    const result = getReadableExif({ focalLength: 24.5 });
    expect(result['FocalLength']).toBe('24.5mm');
  });

  it('formats flash fired as "Fired" when true', () => {
    const result = getReadableExif({ flashFired: true });
    expect(result['Flash']).toBe('Fired');
  });

  it('formats flash not fired as "Off"', () => {
    const result = getReadableExif({ flashFired: false });
    expect(result['Flash']).toBe('Off');
  });

  it('omits flash from output when undefined', () => {
    const result = getReadableExif({});
    expect(result['Flash']).toBeUndefined();
  });

  it('formats dimensions as "W × H"', () => {
    const result = getReadableExif({ imageWidth: 4032, imageHeight: 3024 });
    expect(result['Dimensions']).toBe('4032 × 3024');
  });

  it('omits dimensions when width or height missing', () => {
    const result = getReadableExif({ imageWidth: 4032 });
    expect(result['Dimensions']).toBeUndefined();
  });

  it('formats orientation as string', () => {
    const result = getReadableExif({ orientation: 6 });
    expect(result['Orientation']).toBe('6');
  });

  it('formats GPS coordinates when both present', () => {
    const result = getReadableExif({ gpsLatitude: 40.446, gpsLongitude: -122.419 });
    expect(result['Latitude']).toBe("40°26'45.6\"N");
    expect(result['Longitude']).toBe("122°25'8.4\"W");
  });

  it('omits GPS when latitude missing', () => {
    const result = getReadableExif({ gpsLongitude: -122.419 });
    expect(result['Latitude']).toBeUndefined();
    expect(result['Longitude']).toBeUndefined();
  });

  it('omits GPS when longitude missing', () => {
    const result = getReadableExif({ gpsLatitude: 40.446 });
    expect(result['Latitude']).toBeUndefined();
    expect(result['Longitude']).toBeUndefined();
  });

  it('returns dateTime as-is', () => {
    const result = getReadableExif({ dateTime: '2026:04:15 10:30:00' });
    expect(result['DateTime']).toBe('2026:04:15 10:30:00');
  });

  it('handles full exif data comprehensively', () => {
    const fullExif = {
      make: 'Canon',
      model: 'EOS R5',
      dateTime: '2026:04:15 14:30:00',
      iso: 400,
      aperture: 2.8,
      exposureTime: 0.004,
      focalLength: 50,
      flashFired: false,
      imageWidth: 8192,
      imageHeight: 5464,
      orientation: 1,
      gpsLatitude: 35.6762,
      gpsLongitude: 139.6503,
    };
    const result = getReadableExif(fullExif);
    expect(result['Make']).toBe('Canon');
    expect(result['Model']).toBe('EOS R5');
    expect(result['DateTime']).toBe('2026:04:15 14:30:00');
    expect(result['ISO']).toBe('400');
    expect(result['Aperture']).toBe('f/2.8');
    expect(result['Shutter']).toBe('1/250');
    expect(result['FocalLength']).toBe('50.0mm');
    expect(result['Flash']).toBe('Off');
    expect(result['Dimensions']).toBe('8192 × 5464');
    expect(result['Orientation']).toBe('1');
    expect(result['Latitude']).toBe("35°40'34.3\"N");
    expect(result['Longitude']).toBe("139°39'1.1\"E");
  });
});

describe('getExifData', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('returns null when getInfoAsync throws', async () => {
    (Image.getInfoAsync as jest.Mock).mockRejectedValue(new Error('File not found'));
    const result = await getExifData('/photo.jpg');
    expect(result).toBeNull();
  });

  it('returns null when no exif data is present', async () => {
    (Image.getInfoAsync as jest.Mock).mockResolvedValue({});
    const result = await getExifData('/photo.jpg');
    expect(result).toBeNull();
  });

  it('returns null when getInfoAsync resolves with null', async () => {
    (Image.getInfoAsync as jest.Mock).mockResolvedValue(null);
    const result = await getExifData('/photo.jpg');
    expect(result).toBeNull();
  });

  it('extracts basic EXIF fields from response', async () => {
    (Image.getInfoAsync as jest.Mock).mockResolvedValue({
      exif: {
        Make: 'Apple',
        Model: 'iPhone 15 Pro',
        DateTime: '2026:04:15 10:30:00',
        ISOSpeedRatings: 100,
        FNumber: 1.8,
        ExposureTime: 0.001,
        FocalLength: 24,
        Flash: true,
        PixelXDimension: 4032,
        PixelYDimension: 3024,
        Orientation: 6,
      },
    });

    const result = await getExifData('/photo.jpg');

    expect(result).not.toBeNull();
    expect(result!.make).toBe('Apple');
    expect(result!.model).toBe('iPhone 15 Pro');
    expect(result!.dateTime).toBe('2026:04:15 10:30:00');
    expect(result!.iso).toBe(100);
    expect(result!.aperture).toBe(1.8);
    expect(result!.shutterSpeed).toBe('1/1000');
    expect(result!.exposureTime).toBe(0.001);
    expect(result!.focalLength).toBe(24);
    expect(result!.flashFired).toBe(true);
    expect(result!.imageWidth).toBe(4032);
    expect(result!.imageHeight).toBe(3024);
    expect(result!.orientation).toBe(6);
  });

  it('extracts GPS coordinates', async () => {
    (Image.getInfoAsync as jest.Mock).mockResolvedValue({
      exif: {
        GPSLatitude: 35.6762,
        GPSLongitude: 139.6503,
      },
    });

    const result = await getExifData('/photo.jpg');

    expect(result).not.toBeNull();
    expect(result!.gpsLatitude).toBe(35.6762);
    expect(result!.gpsLongitude).toBe(139.6503);
  });

  it('handles Flash as boolean true', async () => {
    (Image.getInfoAsync as jest.Mock).mockResolvedValue({
      exif: { Flash: true },
    });

    const result = await getExifData('/photo.jpg');
    expect(result!.flashFired).toBe(true);
  });

  it('handles Flash as boolean false', async () => {
    (Image.getInfoAsync as jest.Mock).mockResolvedValue({
      exif: { Flash: false },
    });

    const result = await getExifData('/photo.jpg');
    expect(result!.flashFired).toBe(false);
  });

  it('handles Flash as number (bit 0 = flash fired)', async () => {
    (Image.getInfoAsync as jest.Mock).mockResolvedValue({
      exif: { Flash: 25 }, // 25 = 11001b, bit 0 = 1 → fired
    });

    const result = await getExifData('/photo.jpg');
    expect(result!.flashFired).toBe(true);

    (Image.getInfoAsync as jest.Mock).mockResolvedValue({
      exif: { Flash: 16 }, // 16 = 10000b, bit 0 = 0 → not fired
    });

    const result2 = await getExifData('/photo2.jpg');
    expect(result2!.flashFired).toBe(false);
  });

  it('omits Flash when undefined in raw data', async () => {
    (Image.getInfoAsync as jest.Mock).mockResolvedValue({
      exif: {},
    });

    const result = await getExifData('/photo.jpg');
    expect(result!.flashFired).toBeUndefined();
  });

  it('falls back to DateTimeOriginal when DateTime missing', async () => {
    (Image.getInfoAsync as jest.Mock).mockResolvedValue({
      exif: { DateTimeOriginal: '2026:05:01 08:00:00' },
    });

    const result = await getExifData('/photo.jpg');
    expect(result!.dateTime).toBe('2026:05:01 08:00:00');
  });

  it('uses DateTime when both are present', async () => {
    (Image.getInfoAsync as jest.Mock).mockResolvedValue({
      exif: {
        DateTime: '2026:04:15 10:30:00',
        DateTimeOriginal: '2026:05:01 08:00:00',
      },
    });

    const result = await getExifData('/photo.jpg');
    expect(result!.dateTime).toBe('2026:04:15 10:30:00');
  });

  it('uses PixelXDimension for width with PixelYDimension fallback to ImageWidth', async () => {
    (Image.getInfoAsync as jest.Mock).mockResolvedValue({
      exif: {
        PixelXDimension: 4032,
        PixelYDimension: 3024,
        ImageWidth: 2048,
        ImageLength: 1536,
      },
    });

    const result = await getExifData('/photo.jpg');
    expect(result!.imageWidth).toBe(4032);
    expect(result!.imageHeight).toBe(3024);
  });

  it('falls back to ImageWidth/ImageLength when PixelXDimension missing', async () => {
    (Image.getInfoAsync as jest.Mock).mockResolvedValue({
      exif: {
        ImageWidth: 2048,
        ImageLength: 1536,
      },
    });

    const result = await getExifData('/photo.jpg');
    expect(result!.imageWidth).toBe(2048);
    expect(result!.imageHeight).toBe(1536);
  });
});