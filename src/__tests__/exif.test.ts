import { getExifData, formatShutterSpeed, formatGpsCoord, getReadableExif } from '../services/exif';
import type { ExifData } from '../services/exif';

// Mock expo-image inline (same pattern as other tests in the project)
jest.mock('expo-image', () => ({
  Image: {
    getInfoAsync: jest.fn(),
  },
}));

import { Image } from 'expo-image';

const mockGetInfoAsync = Image.getInfoAsync as jest.Mock;

beforeEach(() => {
  jest.clearAllMocks();
});

// ---------------------------------------------------------------------------
// getExifData
// ---------------------------------------------------------------------------

describe('getExifData', () => {
  it('parses full EXIF response correctly (happy path)', async () => {
    mockGetInfoAsync.mockResolvedValueOnce({
      width: 4032,
      height: 3024,
      exif: {
        Make: 'Apple',
        Model: 'iPhone 15 Pro',
        DateTime: '2026:05:15 10:30:00',
        GPSLatitude: 40.446,
        GPSLatitudeRef: 'N',
        GPSLongitude: -122.419,
        GPSLongitudeRef: 'W',
        ISOSpeedRatings: 100,
        FNumber: 1.78,
        ExposureTime: 0.001,
        FocalLength: 6.765,
        Flash: 15,
        Orientation: 1,
      },
    });

    const result = await getExifData('file:///photo.jpg');
    expect(result).not.toBeNull();

    const exif = result as ExifData;
    expect(exif.make).toBe('Apple');
    expect(exif.model).toBe('iPhone 15 Pro');
    expect(exif.dateTime).toBe('2026:05:15 10:30:00');
    expect(exif.gpsLatitude).toBeCloseTo(40.446, 4);
    expect(exif.gpsLongitude).toBeCloseTo(-122.419, 4);
    expect(exif.iso).toBe(100);
    expect(exif.aperture).toBe(1.78);
    expect(exif.exposureTime).toBe(0.001);
    expect(exif.flashFired).toBe(true);
    expect(exif.imageWidth).toBe(4032);
    expect(exif.imageHeight).toBe(3024);
    expect(exif.orientation).toBe(1);
  });

  it('returns null when getInfoAsync throws', async () => {
    mockGetInfoAsync.mockRejectedValueOnce(new Error('Failed to read image'));
    const result = await getExifData('file:///broken.jpg');
    expect(result).toBeNull();
  });

  it('returns null when no exif data is present', async () => {
    mockGetInfoAsync.mockResolvedValueOnce({ width: 1920, height: 1080 });
    const result = await getExifData('file:///no-exif.jpg');
    expect(result).toBeNull();
  });

  it('returns null when getInfoAsync returns null', async () => {
    mockGetInfoAsync.mockResolvedValueOnce(null);
    const result = await getExifData('file:///null.jpg');
    expect(result).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// formatShutterSpeed
// ---------------------------------------------------------------------------

describe('formatShutterSpeed', () => {
  it('formats 1 as "1s"', () => {
    expect(formatShutterSpeed(1)).toBe('1s');
  });

  it('formats 0.5 as "1/2"', () => {
    expect(formatShutterSpeed(0.5)).toBe('1/2');
  });

  it('formats 0.001 as "1/1000"', () => {
    expect(formatShutterSpeed(0.001)).toBe('1/1000');
  });

  it('formats 1/8000 ≈ 0.000125 as "1/8000"', () => {
    expect(formatShutterSpeed(1 / 8000)).toBe('1/8000');
  });

  it('formats 30 as "30s"', () => {
    expect(formatShutterSpeed(30)).toBe('30s');
  });

  it('formats intermediate values correctly', () => {
    expect(formatShutterSpeed(0.008)).toBe('1/125');
    expect(formatShutterSpeed(0.016667)).toBe('1/60');
  });
});

// ---------------------------------------------------------------------------
// formatGpsCoord
// ---------------------------------------------------------------------------

describe('formatGpsCoord', () => {
  it('formats positive latitude as N', () => {
    const result = formatGpsCoord(40.446, true);
    expect(result).toContain('N');
    expect(result).not.toContain('S');
  });

  it('formats negative latitude as S', () => {
    const result = formatGpsCoord(-40.446, true);
    expect(result).toContain('S');
    expect(result).not.toContain('N');
  });

  it('formats positive longitude as E', () => {
    const result = formatGpsCoord(116.407, false);
    expect(result).toContain('E');
    expect(result).not.toContain('W');
  });

  it('formats negative longitude as W', () => {
    const result = formatGpsCoord(-122.419, false);
    expect(result).toContain('W');
    expect(result).not.toContain('E');
  });

  it('outputs degrees, minutes, seconds with direction', () => {
    const result = formatGpsCoord(40.446, true);
    expect(result).toMatch(/\d+°\d+'\d+\.\d+"/);
    expect(result).toMatch(/[NS]/);
  });
});

// ---------------------------------------------------------------------------
// getReadableExif
// ---------------------------------------------------------------------------

describe('getReadableExif', () => {
  it('produces expected fields for a full ExifData object', () => {
    const exif: ExifData = {
      make: 'Canon',
      model: 'EOS R5',
      dateTime: '2026-05-15T10:30:00',
      iso: 400,
      aperture: 2.8,
      exposureTime: 0.004,
      focalLength: 50,
      flashFired: false,
      imageWidth: 8192,
      imageHeight: 5464,
      gpsLatitude: 40.446,
      gpsLongitude: -122.419,
    };

    const readable = getReadableExif(exif);

    expect(readable['Make']).toBe('Canon');
    expect(readable['Model']).toBe('EOS R5');
    expect(readable['DateTime']).toBe('2026-05-15T10:30:00');
    expect(readable['ISO']).toBe('400');
    expect(readable['Aperture']).toBe('f/2.8');
    expect(readable['Shutter']).toBe('1/250');
    expect(readable['FocalLength']).toBe('50.0mm');
    expect(readable['Flash']).toBe('Off');
    expect(readable['Dimensions']).toBe('8192 × 5464');
    expect(readable['Latitude']).toBeDefined();
    expect(readable['Longitude']).toBeDefined();
  });

  it('omits undefined fields', () => {
    const exif: ExifData = { make: 'Nikon', model: 'Z8', iso: 200 };
    const readable = getReadableExif(exif);
    expect(Object.keys(readable)).toHaveLength(3);
    expect(readable['Make']).toBe('Nikon');
    expect(readable['ISO']).toBe('200');
    expect(readable['Flash']).toBeUndefined();
  });

  it('handles null gps coordinates', () => {
    const exif: ExifData = { make: 'Sony', model: 'A7IV', gpsLatitude: null, gpsLongitude: null };
    const readable = getReadableExif(exif);
    expect(readable['Latitude']).toBeUndefined();
    expect(readable['Longitude']).toBeUndefined();
  });

  it('reports flash fired as "Fired" when true', () => {
    const readable = getReadableExif({ flashFired: true });
    expect(readable['Flash']).toBe('Fired');
  });

  it('omits flash when undefined', () => {
    const readable = getReadableExif({});
    expect(readable['Flash']).toBeUndefined();
  });
});