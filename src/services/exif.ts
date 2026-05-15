/**
 * EXIF metadata extraction service.
 * Uses expo-image's Image.getInfoAsync to read EXIF data from photo URIs.
 */
import { Image } from 'expo-image';

export interface ExifData {
  make?: string;
  model?: string;
  dateTime?: string;
  gpsLatitude?: number;
  gpsLongitude?: number;
  iso?: number;
  aperture?: number;
  shutterSpeed?: number;
  focalLength?: number;
  exposureTime?: number;
  flashFired?: boolean;
  imageWidth?: number;
  imageHeight?: number;
  orientation?: number;
}

/** Extract EXIF metadata from a photo URI. Returns null on failure. */
export async function getExifData(uri: string): Promise<ExifData | null> {
  try {
    const info = await Image.getInfoAsync(uri);
    if (!info?.exif) return null;

    const raw = info.exif as Record<string, unknown>;

    // Normalize GPS from different naming conventions
    const gpsLat =
      (raw.GPSLatitude as number | undefined) ??
      (raw.GPSLatitude as number | undefined);
    const gpsLng =
      (raw.GPSLongitude as number | undefined) ??
      (raw.GPSLongitude as number | undefined);

    // Flash: some platforms return a string "FlashDidFire" or number
    let flashFired: boolean | undefined;
    if (raw.Flash !== undefined) {
      if (typeof raw.Flash === 'boolean') {
        flashFired = raw.Flash;
      } else if (typeof raw.Flash === 'number') {
        // Bit 0 = flash fired
        flashFired = (raw.Flash & 1) === 1;
      }
    }

    return {
      make: raw.Make as string | undefined,
      model: raw.Model as string | undefined,
      dateTime: (raw.DateTime as string | undefined) ?? (raw.DateTimeOriginal as string | undefined),
      gpsLatitude: gpsLat,
      gpsLongitude: gpsLng,
      iso: raw.ISOSpeedRatings as number | undefined,
      aperture: raw.FNumber as number | undefined,
      shutterSpeed: raw.ExposureTime as number | undefined,
      focalLength: raw.FocalLength as number | undefined,
      exposureTime: raw.ExposureTime as number | undefined,
      flashFired,
      imageWidth: raw.PixelXDimension as number | undefined ?? (raw.ImageWidth as number | undefined),
      imageHeight: raw.PixelYDimension as number | undefined ?? (raw.ImageLength as number | undefined),
      orientation: raw.Orientation as number | undefined,
    };
  } catch {
    return null;
  }
}

/**
 * Convert a fractional shutter speed to a readable string.
 * e.g. 0.001 → "1/1000", 1 → "1s", 0.5 → "1/2"
 */
export function formatShutterSpeed(value: number): string {
  if (value >= 1) {
    return `${value}s`;
  }
  // Find nearest reciprocal with tolerance
  const rounded = Math.round(1 / value);
  if (Math.abs(1 / rounded - value) < 0.001) {
    return `1/${rounded}`;
  }
  return `${value}s`;
}

/**
 * Format a GPS coordinate as "40°26'46"N".
 * @param coord Coordinate value (positive = N/E, negative = S/W)
 * @param isLatitude True for latitude, false for longitude
 */
export function formatGpsCoord(coord: number, isLatitude: boolean): string {
  const abs = Math.abs(coord);
  const degrees = Math.floor(abs);
  const minutesDecimal = (abs - degrees) * 60;
  const minutes = Math.floor(minutesDecimal);
  const seconds = ((minutesDecimal - minutes) * 60).toFixed(1);

  const direction = isLatitude
    ? coord >= 0 ? 'N' : 'S'
    : coord >= 0 ? 'E' : 'W';

  return `${degrees}°${minutes}'${seconds}"${direction}`;
}

/** Convert raw EXIF data to a human-readable map for UI display. */
export function getReadableExif(exif: ExifData): Record<string, string> {
  const result: Record<string, string> = {};

  if (exif.make) result['Make'] = exif.make;
  if (exif.model) result['Model'] = exif.model;
  if (exif.dateTime) result['DateTime'] = exif.dateTime;
  if (exif.iso) result['ISO'] = String(exif.iso);
  if (exif.aperture != null) result['Aperture'] = `f/${exif.aperture.toFixed(1)}`;
  if (exif.exposureTime != null) result['Shutter'] = formatShutterSpeed(exif.exposureTime);
  if (exif.focalLength != null) result['FocalLength'] = `${exif.focalLength.toFixed(1)}mm`;
  if (exif.flashFired != null) result['Flash'] = exif.flashFired ? 'Fired' : 'Off';
  if (exif.imageWidth && exif.imageHeight)
    result['Dimensions'] = `${exif.imageWidth} × ${exif.imageHeight}`;
  if (exif.orientation) result['Orientation'] = String(exif.orientation);
  if (exif.gpsLatitude != null && exif.gpsLongitude != null) {
    result['Latitude'] = formatGpsCoord(exif.gpsLatitude, true);
    result['Longitude'] = formatGpsCoord(exif.gpsLongitude, false);
  }

  return result;
}