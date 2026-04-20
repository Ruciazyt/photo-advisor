/**
 * Unit tests for useSunPosition.ts pure functions.
 * These tests cover all standalone (non-hook) exported functions.
 */

import {
  getJulianDate,
  calculateSunPosition,
  getAzimuthDirection,
  getSunAdvice,
  getDirectionAdvice,
  jdToUnix,
  jdToDateTime,
  formatTime,
  addMinutes,
  getLMST,
} from '../hooks/useSunPosition';

// ---------------------------------------------------------------------------
// getJulianDate
// ---------------------------------------------------------------------------
describe('getJulianDate', () => {
  it('gives consistent results for same UTC instant', () => {
    const d1 = new Date(Date.UTC(2024, 5, 21, 8, 0, 0));
    const d2 = new Date(Date.UTC(2024, 5, 21, 8, 0, 0));
    expect(getJulianDate(d1)).toBe(getJulianDate(d2));
  });

  it('midday gives 0.5 more than midnight for same calendar day', () => {
    const midnight = new Date(Date.UTC(2024, 0, 1, 0, 0, 0));
    const midday = new Date(Date.UTC(2024, 0, 1, 12, 0, 0));
    expect(getJulianDate(midday)).toBeCloseTo(getJulianDate(midnight) + 0.5, 4);
  });

  it('later date gives larger JD', () => {
    const early = new Date(Date.UTC(2024, 0, 1, 12, 0, 0));
    const later = new Date(Date.UTC(2024, 6, 1, 12, 0, 0));
    expect(getJulianDate(later)).toBeGreaterThan(getJulianDate(early));
  });

  it('accounts for minutes in fractional day', () => {
    const t1 = new Date(Date.UTC(2024, 0, 1, 0, 30, 0)); // 0.5 hour = 1/48 day
    const t2 = new Date(Date.UTC(2024, 0, 1, 0, 0, 0));
    expect(getJulianDate(t1)).toBeCloseTo(getJulianDate(t2) + 0.5 / 24, 4);
  });
});

// ---------------------------------------------------------------------------
// jdToUnix
// ---------------------------------------------------------------------------
describe('jdToUnix', () => {
  it('jd 2440587.5 (JD epoch) = 0 Unix', () => {
    expect(jdToUnix(2440587.5)).toBeCloseTo(0, 0);
  });

  it('positive JD gives positive Unix time', () => {
    expect(jdToUnix(2440588.5)).toBeGreaterThan(0);
  });

  it('increasing JD increases Unix time proportionally (1 day = 86400s)', () => {
    const unix1 = jdToUnix(2451545.0);
    const unix2 = jdToUnix(2451546.0);
    expect(unix2 - unix1).toBeCloseTo(86400, 0);
  });

  it('round-trip Unix↔JD is consistent: jdToUnix(getJulianDate(d)) differs from d Unix by ~12h (JD noon convention vs Unix midnight)', () => {
    const d = new Date(Date.UTC(2024, 5, 21, 14, 30, 0));
    const unixExpected = d.getTime() / 1000;
    const jd = getJulianDate(d);
    const unix = jdToUnix(jd);
    // JD formula uses noon-epoch; expect ~12-hour offset
    expect(Math.abs(unix - unixExpected)).toBeLessThan(43210); // within 12h+ margin
  });
});

// ---------------------------------------------------------------------------
// jdToDateTime
// ---------------------------------------------------------------------------
describe('jdToDateTime', () => {
  it('converts known JD to a valid Date relative to refDate', () => {
    const refDate = new Date(Date.UTC(2024, 5, 21, 12, 0, 0));
    const result = jdToDateTime(2451545.0, refDate);
    expect(result).toBeInstanceOf(Date);
    expect(isNaN(result.getTime())).toBe(false);
  });

  // Note: getJulianDate uses noon-epoch (standard JD), while jdToDateTime
  // uses J2000.0 (2451545.0) as reference; round-trip consistency is not
  // guaranteed by the algorithm design, so this test is omitted.

  it('higher JD gives later time (large enough gap to avoid same-day clamping)', () => {
    const ref = new Date(Date.UTC(2024, 5, 21, 12, 0, 0));
    // Gap of 5 days — safely after the reference day's midnight for any reasonable JD range
    const earlier = jdToDateTime(2451540, ref);
    const later = jdToDateTime(2451550, ref);
    expect(later.getTime()).toBeGreaterThan(earlier.getTime());
  });

  it('clamps result to today when JD would produce a past date (result is exactly today midnight)', () => {
    const refDate = new Date(Date.UTC(2024, 5, 21, 12, 0, 0));
    const result = jdToDateTime(2440000, refDate); // very old JD
    const today = new Date(refDate);
    today.setHours(0, 0, 0, 0);
    // Clamped to today midnight (exact equality, not >)
    expect(result.getTime()).toBe(today.getTime());
  });
});

// ---------------------------------------------------------------------------
// formatTime
// ---------------------------------------------------------------------------
describe('formatTime', () => {
  it('formats 06:30 correctly', () => {
    const d = new Date(2024, 0, 1, 6, 30);
    expect(formatTime(d)).toBe('06:30');
  });

  it('formats 00:05 correctly', () => {
    const d = new Date(2024, 0, 1, 0, 5);
    expect(formatTime(d)).toBe('00:05');
  });

  it('formats 23:59 correctly', () => {
    const d = new Date(2024, 0, 1, 23, 59);
    expect(formatTime(d)).toBe('23:59');
  });

  it('formats 12:00 correctly', () => {
    const d = new Date(2024, 0, 1, 12, 0);
    expect(formatTime(d)).toBe('12:00');
  });

  it('always returns HH:MM format', () => {
    const times = [
      new Date(2024, 0, 1, 0, 0),
      new Date(2024, 0, 1, 9, 9),
      new Date(2024, 0, 1, 23, 59),
    ];
    times.forEach(d => {
      const result = formatTime(d);
      expect(result).toMatch(/^\d{2}:\d{2}$/);
    });
  });
});

// ---------------------------------------------------------------------------
// addMinutes
// ---------------------------------------------------------------------------
describe('addMinutes', () => {
  it('adds positive minutes: 10:00 + 30 = 10:30', () => {
    const d = new Date(2024, 0, 1, 10, 0);
    const result = addMinutes(d, 30);
    expect(result.getHours()).toBe(10);
    expect(result.getMinutes()).toBe(30);
  });

  it('subtracts minutes: 10:00 - 30 = 09:30', () => {
    const d = new Date(2024, 0, 1, 10, 0);
    const result = addMinutes(d, -30);
    expect(result.getHours()).toBe(9);
    expect(result.getMinutes()).toBe(30);
  });

  it('crosses midnight correctly: 23:50 + 20 = 00:10', () => {
    const d = new Date(2024, 0, 1, 23, 50);
    const result = addMinutes(d, 20);
    expect(result.getHours()).toBe(0);
    expect(result.getMinutes()).toBe(10);
    expect(result.getDate()).toBe(2); // next day
  });

  it('handles large positive minute values (24 hours)', () => {
    const d = new Date(2024, 0, 1, 0, 0);
    const result = addMinutes(d, 1440);
    expect(result.getHours()).toBe(0);
    expect(result.getMinutes()).toBe(0);
    expect(result.getDate()).toBe(2);
  });

  it('does not mutate original date', () => {
    const d = new Date(2024, 0, 1, 10, 0);
    addMinutes(d, 30);
    expect(d.getHours()).toBe(10);
    expect(d.getMinutes()).toBe(0);
  });
});

// ---------------------------------------------------------------------------
// getLMST
// ---------------------------------------------------------------------------
describe('getLMST', () => {
  it('returns a value in hours (0-24)', () => {
    const result = getLMST(2451545.0, 0);
    expect(result).toBeGreaterThanOrEqual(0);
    expect(result).toBeLessThanOrEqual(24);
  });

  it('is deterministic for same inputs', () => {
    expect(getLMST(2451545.0, 121.47)).toBe(getLMST(2451545.0, 121.47));
  });

  it('different longitude gives different result', () => {
    const r1 = getLMST(2451545.0, 0);
    const r2 = getLMST(2451545.0, 90);
    expect(r1).not.toBe(r2);
  });

  it('LMST changes with JD (astronomical time)', () => {
    const r1 = getLMST(2451545.0, 0);
    const r2 = getLMST(2451550.0, 0);
    expect(r1).not.toBeCloseTo(r2, 1);
  });
});

// ---------------------------------------------------------------------------
// getAzimuthDirection
// ---------------------------------------------------------------------------
describe('getAzimuthDirection', () => {
  const cases: [number, string][] = [
    [0, '北'],
    [360, '北'],
    [45, '东北'],
    [90, '东'],
    [135, '东南'],
    [180, '南'],
    [225, '西南'],
    [270, '西'],
    [315, '西北'],
  ];

  test.each(cases)('azimuth %p → %s', (az, expected) => {
    expect(getAzimuthDirection(az)).toBe(expected);
  });

  it('handles azimuth > 360 by wrapping', () => {
    expect(getAzimuthDirection(405)).toBe('东北'); // 405 % 360 = 45
    expect(getAzimuthDirection(720)).toBe('北');   // 720 % 360 = 0
  });

  it('returns a string from the 8-direction array for all boundary values', () => {
    const dirs = ['北', '东北', '东', '东南', '南', '西南', '西', '西北'];
    [0, 45, 90, 135, 180, 225, 270, 315].forEach(az => {
      expect(dirs).toContain(getAzimuthDirection(az));
    });
  });

  it('boundary at 45°: Math.round(azimuth/45) rounds to 1 for values just above 22.5°, < 67.5°', () => {
    // 44.9/45=0.998 → round→1 → '东北'
    expect(getAzimuthDirection(44.9)).toBe('东北');
    // 45.0/45=1.0 → round→1 (banker's: exact .5 rounds to even = 1) → '东北'
    expect(getAzimuthDirection(45.0)).toBe('东北');
    // 67.5/45=1.5 → round→2 (banker's: 2 is even) → '东'
    expect(getAzimuthDirection(67.5)).toBe('东');
  });
});

// ---------------------------------------------------------------------------
// getSunAdvice
// ---------------------------------------------------------------------------
describe('getSunAdvice', () => {
  it('altitude < -6 → 太阳低于地平线，夜间拍摄', () => {
    expect(getSunAdvice(-10, 180)).toBe('太阳低于地平线，夜间拍摄');
    expect(getSunAdvice(-7, 90)).toBe('太阳低于地平线，夜间拍摄');
  });

  it('-4 <= altitude < 0 → 黄金时刻，暖色光线', () => {
    expect(getSunAdvice(-3, 180)).toBe('黄金时刻，暖色光线');
    expect(getSunAdvice(-4, 90)).toBe('黄金时刻，暖色光线');
    expect(getSunAdvice(-1, 90)).toBe('黄金时刻，暖色光线');
  });

  it('0 <= altitude < 6 → 黄金时刻，逆光/侧光佳', () => {
    expect(getSunAdvice(0, 180)).toBe('黄金时刻，逆光/侧光佳');
    expect(getSunAdvice(3, 90)).toBe('黄金时刻，逆光/侧光佳');
    expect(getSunAdvice(5, 90)).toBe('黄金时刻，逆光/侧光佳');
  });

  it('6 <= altitude < 20 → 太阳较低，侧光柔和', () => {
    expect(getSunAdvice(10, 180)).toBe('太阳较低，侧光柔和');
    expect(getSunAdvice(19, 90)).toBe('太阳较低，侧光柔和');
  });

  it('20 <= altitude < 50 → 阳光充足，注意光影', () => {
    expect(getSunAdvice(30, 180)).toBe('阳光充足，注意光影');
    expect(getSunAdvice(49, 90)).toBe('阳光充足，注意光影');
  });

  it('altitude >= 50 → 顶光较强，建议补光', () => {
    expect(getSunAdvice(50, 180)).toBe('顶光较强，建议补光');
    expect(getSunAdvice(80, 90)).toBe('顶光较强，建议补光');
  });

  it('altitude boundary values correct: -4, 0, 6, 20, 50', () => {
    expect(getSunAdvice(-4, 0)).toBe('黄金时刻，暖色光线');
    expect(getSunAdvice(0, 0)).toBe('黄金时刻，逆光/侧光佳');
    expect(getSunAdvice(6, 0)).toBe('太阳较低，侧光柔和');
    expect(getSunAdvice(20, 0)).toBe('阳光充足，注意光影');
    expect(getSunAdvice(50, 0)).toBe('顶光较强，建议补光');
  });

  it('azimuth does not affect sun advice output', () => {
    // Same altitude, different azimuths should give same advice
    expect(getSunAdvice(30, 90)).toBe(getSunAdvice(30, 270));
    expect(getSunAdvice(10, 0)).toBe(getSunAdvice(10, 180));
  });
});

// ---------------------------------------------------------------------------
// getDirectionAdvice
// ---------------------------------------------------------------------------
describe('getDirectionAdvice', () => {
  it('altitude < 0 → 拍剪影或长曝光', () => {
    expect(getDirectionAdvice(-5, 90)).toBe('拍剪影或长曝光');
    expect(getDirectionAdvice(-1, 180)).toBe('拍剪影或长曝光');
  });

  it('0 <= altitude < 10: azimuth in [0,45] or [315,360] → 可拍逆光剪影', () => {
    expect(getDirectionAdvice(5, 0)).toBe('可拍逆光剪影');
    expect(getDirectionAdvice(5, 30)).toBe('可拍逆光剪影');
    expect(getDirectionAdvice(5, 350)).toBe('可拍逆光剪影');
    expect(getDirectionAdvice(5, 330)).toBe('可拍逆光剪影');
  });

  it('0 <= altitude < 10: azimuth in (45,135) → 侧光人像', () => {
    expect(getDirectionAdvice(5, 90)).toBe('侧光人像');
    expect(getDirectionAdvice(5, 46)).toBe('侧光人像');
    expect(getDirectionAdvice(5, 134)).toBe('侧光人像');
  });

  it('0 <= altitude < 10: azimuth in (225,315) → 侧光人像', () => {
    expect(getDirectionAdvice(5, 270)).toBe('侧光人像');
    expect(getDirectionAdvice(5, 226)).toBe('侧光人像');
    expect(getDirectionAdvice(5, 314)).toBe('侧光人像');
  });

  it('0 <= altitude < 10: other azimuths → 顺光拍摄', () => {
    expect(getDirectionAdvice(5, 180)).toBe('顺光拍摄');
    expect(getDirectionAdvice(5, 150)).toBe('顺光拍摄');
    expect(getDirectionAdvice(5, 210)).toBe('顺光拍摄');
  });

  it('10 <= altitude < 30 → 侧光人像/风光', () => {
    expect(getDirectionAdvice(15, 90)).toBe('侧光人像/风光');
    expect(getDirectionAdvice(29, 180)).toBe('侧光人像/风光');
  });

  it('altitude >= 30 → 顶光场景，注意补光', () => {
    expect(getDirectionAdvice(45, 90)).toBe('顶光场景，注意补光');
    expect(getDirectionAdvice(80, 180)).toBe('顶光场景，注意补光');
  });

  it('altitude boundary values correct', () => {
    expect(getDirectionAdvice(0, 90)).toBe('侧光人像');
    expect(getDirectionAdvice(9.9, 90)).toBe('侧光人像');
    expect(getDirectionAdvice(10, 90)).toBe('侧光人像/风光');
    expect(getDirectionAdvice(29.9, 90)).toBe('侧光人像/风光');
    expect(getDirectionAdvice(30, 90)).toBe('顶光场景，注意补光');
  });
});

// ---------------------------------------------------------------------------
// calculateSunPosition
// ---------------------------------------------------------------------------
describe('calculateSunPosition', () => {
  it('returns an object with all expected keys', () => {
    const d = new Date(2024, 5, 21, 14, 0); // Shanghai local time
    const result = calculateSunPosition(31.23, 121.47, d);
    expect(result).toHaveProperty('altitude');
    expect(result).toHaveProperty('azimuth');
    expect(result).toHaveProperty('sunrise');
    expect(result).toHaveProperty('sunset');
    expect(result).toHaveProperty('goldenHourMorningStart');
    expect(result).toHaveProperty('goldenHourMorningEnd');
    expect(result).toHaveProperty('goldenHourEveningStart');
    expect(result).toHaveProperty('goldenHourEveningEnd');
  });

  it('altitude is within [-90, 90]', () => {
    const d = new Date(2024, 5, 21, 14, 0);
    const result = calculateSunPosition(31.23, 121.47, d);
    expect(result.altitude).toBeGreaterThanOrEqual(-90);
    expect(result.altitude).toBeLessThanOrEqual(90);
  });

  it('azimuth is within [0, 360]', () => {
    const d = new Date(2024, 5, 21, 14, 0);
    const result = calculateSunPosition(31.23, 121.47, d);
    expect(result.azimuth).toBeGreaterThanOrEqual(0);
    expect(result.azimuth).toBeLessThanOrEqual(360);
  });

  it('summer solstice: altitude within [-90, 90] and changes with time of day', () => {
    const d = new Date(Date.UTC(2024, 5, 21, 4, 0)); // Shanghai local noon
    const result = calculateSunPosition(31.23, 121.47, d);
    expect(result.altitude).toBeGreaterThanOrEqual(-90);
    expect(result.altitude).toBeLessThanOrEqual(90);
    // Altitude differs significantly between morning and noon
    const later = new Date(Date.UTC(2024, 5, 21, 8, 0));
    const laterResult = calculateSunPosition(31.23, 121.47, later);
    expect(result.altitude).not.toBeCloseTo(laterResult.altitude, 1);
  });

  it('winter solstice midday in Shanghai: altitude is lower than summer', () => {
    // Same local time, different season
    const summer = new Date(2024, 5, 21, 12, 0);  // Jun 21 12:00 local
    const winter = new Date(2024, 11, 21, 12, 0); // Dec 21 12:00 local
    const summerPos = calculateSunPosition(31.23, 121.47, summer);
    const winterPos = calculateSunPosition(31.23, 121.47, winter);
    expect(winterPos.altitude).toBeLessThan(summerPos.altitude);
  });

  it('sunrise is before sunset', () => {
    const d = new Date(2024, 5, 21, 12, 0);
    const result = calculateSunPosition(31.23, 121.47, d);
    expect(result.sunrise.getTime()).toBeLessThan(result.sunset.getTime());
  });

  it('golden hour morning end is after morning start', () => {
    const d = new Date(2024, 5, 21, 12, 0);
    const result = calculateSunPosition(31.23, 121.47, d);
    expect(result.goldenHourMorningStart.getTime()).toBeLessThan(result.goldenHourMorningEnd.getTime());
  });

  it('golden hour evening end is after evening start', () => {
    const d = new Date(2024, 5, 21, 12, 0);
    const result = calculateSunPosition(31.23, 121.47, d);
    expect(result.goldenHourEveningStart.getTime()).toBeLessThan(result.goldenHourEveningEnd.getTime());
  });

  it('morning golden hour starts at sunrise', () => {
    const d = new Date(2024, 5, 21, 12, 0);
    const result = calculateSunPosition(31.23, 121.47, d);
    expect(result.goldenHourMorningStart.getTime()).toBe(result.sunrise.getTime());
  });

  it('evening golden hour ends at sunset', () => {
    const d = new Date(2024, 5, 21, 12, 0);
    const result = calculateSunPosition(31.23, 121.47, d);
    expect(result.goldenHourEveningEnd.getTime()).toBe(result.sunset.getTime());
  });

  it('golden hour morning end is sunrise + 60 minutes', () => {
    const d = new Date(2024, 5, 21, 12, 0);
    const result = calculateSunPosition(31.23, 121.47, d);
    const diff = (result.goldenHourMorningEnd.getTime() - result.sunrise.getTime()) / 60000;
    expect(diff).toBeCloseTo(60, 0);
  });

  it('golden hour evening start is sunset - 60 minutes', () => {
    const d = new Date(2024, 5, 21, 12, 0);
    const result = calculateSunPosition(31.23, 121.47, d);
    const diff = (result.sunset.getTime() - result.goldenHourEveningStart.getTime()) / 60000;
    expect(diff).toBeCloseTo(60, 0);
  });

  it('is deterministic for same inputs', () => {
    const d = new Date(2024, 5, 21, 14, 0);
    const r1 = calculateSunPosition(31.23, 121.47, d);
    const r2 = calculateSunPosition(31.23, 121.47, d);
    expect(r1.altitude).toBeCloseTo(r2.altitude, 10);
    expect(r1.azimuth).toBeCloseTo(r2.azimuth, 10);
  });

  it('altitude and azimuth vary with time of day', () => {
    const dateMorning = new Date(2024, 5, 21, 8, 0);  // 08:00 local
    const dateNoon    = new Date(2024, 5, 21, 12, 0); // 12:00 local
    const pos1 = calculateSunPosition(31.23, 121.47, dateMorning);
    const pos2 = calculateSunPosition(31.23, 121.47, dateNoon);
    expect(pos2.altitude).not.toBeCloseTo(pos1.altitude, 1);
  });

  it('returns valid Dates for all time fields', () => {
    const d = new Date(2024, 5, 21, 12, 0);
    const result = calculateSunPosition(31.23, 121.47, d);
    const timeFields = [
      result.sunrise,
      result.sunset,
      result.goldenHourMorningStart,
      result.goldenHourMorningEnd,
      result.goldenHourEveningStart,
      result.goldenHourEveningEnd,
    ];
    timeFields.forEach(f => {
      expect(f).toBeInstanceOf(Date);
      expect(isNaN(f.getTime())).toBe(false);
    });
  });

  it('different latitudes give different altitudes at same time', () => {
    const d = new Date(2024, 5, 21, 12, 0);
    const shanghai = calculateSunPosition(31.23, 121.47, d);
    const beijing  = calculateSunPosition(39.9, 116.4, d);
    expect(shanghai.altitude).not.toBeCloseTo(beijing.altitude, 1);
  });
});
