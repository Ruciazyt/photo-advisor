import { Image } from 'expo-image';

export interface ExifData {
  make?: string;
  model?: string;
  dateTime?: string;
  gpsLatitude?: number;
  gpsLongitude?: number;
  iso?: number;
  aperture?: number;
  shutterSpeed?: string;
  focalLength?: number;
  exposureTime?: number;
  flashFired?: boolean;
  imageWidth?: number;
  imageHeight?: number;
  orientation?: number;
}

type RawExif = {
  Make?: string;
  Model?: string;
  DateTime?: string;
  DateTimeOriginal?: string;
  CreateDate?: string;
  GPSLatitude?: number | number[];
  GPSLatitudeRef?: string;
  GPSLongitude?: number | number[];
  GPSLongitudeRef?: string;
  ISOSpeedRatings?: number | number[];
  FNumber?: number | string;
  ApertureValue?: number | string;
  ExposureTime?: number | string;
  FocalLength?: number | string;
  Flash?: boolean | number;
  PixelXDimension?: number;
  PixelYDimension?: number;
  ImageWidth?: number;
  ImageLength?: number;
  Orientation?: number;
};

function parseRational(raw: unknown): number | undefined {
  if (raw == null) return undefined;
  if (typeof raw === 'number') return raw;
  if (typeof raw === 'string') {
    const parts = raw.split('/');
    if (parts.length === 2) {
      const num = parseFloat(parts[0]);
      const den = parseFloat(parts[1]);
      if (!isNaN(num) && !isNaN(den) && den !== 0) return num / den;
    }
    const parsed = parseFloat(raw);
    if (!isNaN(parsed)) return parsed;
  }
  return undefined;
}

function parseIso(raw: unknown): number | undefined {
  if (raw == null) return undefined;
  if (typeof raw === 'number') return raw;
  if (Array.isArray(raw) && raw.length > 0) {
    const first = raw[0];
    return typeof first === 'number' ? first : parseInt(String(first), 10) || undefined;
  }
  return undefined;
}

function parseFlashFired(raw: unknown): boolean | undefined {
  if (raw == null) return undefined;
  if (typeof raw === 'boolean') return raw;
  if (typeof raw === 'number') return (raw & 1) !== 0;
  return undefined;
}

function parseGpsCoord(raw: unknown, ref: unknown): number | undefined {
  if (raw == null) return undefined;

  const isNegative = typeof ref === 'string' && (ref === 'S' || ref === 'W');

  if (typeof raw === 'number') {
    // If already negative, keep as-is (the sign is intrinsic)
    if (raw < 0) return raw;
    // Positive raw value: flip sign only when Ref indicates S/W
    return isNegative ? -raw : raw;
  }

  if (Array.isArray(raw) && raw.length >= 3) {
    const den = raw.length >= 4 ? raw[3] : 1;
    const degrees = raw[0] / den + (raw[1] / den) / 60 + (raw[2] / den) / 3600;
    return isNegative ? -degrees : degrees;
  }

  return undefined;
}

export function formatShutterSpeed(value: number): string {
  if (value >= 1) {
    return `${value}s`;
  }

  const standardSpeeds = [1, 1 / 2, 1 / 4, 1 / 8, 1 / 16, 1 / 15, 1 / 30, 1 / 60, 1 / 125, 1 / 250, 1 / 500, 1 / 1000, 1 / 2000, 1 / 4000, 1 / 8000];

  let closest = standardSpeeds[0];
  let minDiff = Math.abs(value - closest);
  for (const speed of standardSpeeds) {
    const diff = Math.abs(value - speed);
    if (diff < minDiff) {
      minDiff = diff;
      closest = speed;
    }
  }

  if (closest >= 1) return `${closest}s`;
  const denominator = Math.round(1 / closest);
  return `1/${denominator}`;
}

export function formatGpsCoord(coord: number, isLatitude: boolean): string {
  const abs = Math.abs(coord);
  const deg = Math.floor(abs);
  const minFloat = (abs - deg) * 60;
  const min = Math.floor(minFloat);
  const secFloat = (minFloat - min) * 60;
  const minStr = min === 0 ? '0' : String(min);
  const sec = secFloat.toFixed(1);

  const direction = isLatitude
    ? (coord >= 0 ? 'N' : 'S')
    : (coord >= 0 ? 'E' : 'W');

  return `${deg}°${minStr}'${sec}"${direction}`;
}

export async function getExifData(uri: string): Promise<ExifData | null> {
  try {
    const info = await Image.getInfoAsync(uri);
    if (!info) return null;

    const exif = info.exif as RawExif | undefined;
    if (!exif) return null;

    const exposureTime = parseRational(exif.ExposureTime);

    const width = (info.width ?? exif.PixelXDimension ?? exif.ImageWidth) as number | undefined;
    const height = (info.height ?? exif.PixelYDimension ?? exif.ImageLength) as number | undefined;

    return {
      make: exif.Make,
      model: exif.Model,
      dateTime: exif.DateTime ?? exif.DateTimeOriginal ?? exif.CreateDate,
      gpsLatitude: parseGpsCoord(exif.GPSLatitude, exif.GPSLatitudeRef),
      gpsLongitude: parseGpsCoord(exif.GPSLongitude, exif.GPSLongitudeRef),
      iso: parseIso(exif.ISOSpeedRatings),
      aperture: parseRational(exif.FNumber ?? exif.ApertureValue),
      exposureTime,
      shutterSpeed: exposureTime != null ? formatShutterSpeed(exposureTime) : undefined,
      focalLength: parseRational(exif.FocalLength),
      flashFired: parseFlashFired(exif.Flash),
      imageWidth: width,
      imageHeight: height,
      orientation: exif.Orientation,
    };
  } catch {
    return null;
  }
}

export function getReadableExif(exif: ExifData): Record<string, string> {
  const result: Record<string, string> = {};

  if (exif.make) result['Make'] = exif.make;
  if (exif.model) result['Model'] = exif.model;
  if (exif.dateTime) result['DateTime'] = exif.dateTime;
  if (exif.iso) result['ISO'] = String(exif.iso);
  if (exif.aperture) result['Aperture'] = `f/${exif.aperture.toFixed(1)}`;
  if (exif.exposureTime != null) result['Exposure'] = formatShutterSpeed(exif.exposureTime);
  if (exif.exposureTime != null) result['Shutter'] = formatShutterSpeed(exif.exposureTime);
  if (exif.focalLength) result['FocalLength'] = `${exif.focalLength.toFixed(1)}mm`;
  if (exif.flashFired !== undefined) result['Flash'] = exif.flashFired ? 'Fired' : 'Off';
  if (exif.imageWidth && exif.imageHeight) result['Dimensions'] = `${exif.imageWidth} × ${exif.imageHeight}`;
  if (exif.orientation != null) result['Orientation'] = String(exif.orientation);
  if (exif.gpsLatitude != null && exif.gpsLongitude != null) {
    result['Latitude'] = formatGpsCoord(exif.gpsLatitude, true);
    result['Longitude'] = formatGpsCoord(exif.gpsLongitude, false);
  }

  return result;
}