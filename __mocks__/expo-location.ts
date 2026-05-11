/**
 * Mock for expo-location.
 *
 * Pattern matches __mocks__/expo-sensors.js: mock functions are created at
 * module level WITHOUT .mockImplementation() so that tests can call
 * .mockResolvedValue() / .mockRejectedValue() after jest.clearAllMocks()
 * and have it take effect.
 *
 * The jest-expo preset auto-mocks expo-modules-core native modules, but
 * calling jest.mock('expo-location') in a test file overrides that with
 * this manual mock.
 */

const mockRequestForegroundPermissionsAsync = jest.fn();
const mockGetCurrentPositionAsync = jest.fn();
const mockReverseGeocodeAsync = jest.fn();

export const Location = {
  requestForegroundPermissionsAsync: mockRequestForegroundPermissionsAsync,
  getCurrentPositionAsync: mockGetCurrentPositionAsync,
  reverseGeocodeAsync: mockReverseGeocodeAsync,
  Accuracy: {
    Low: 3,
    Balanced: 3,
    High: 4,
    Best: 4,
  },
};

export {
  mockRequestForegroundPermissionsAsync,
  mockGetCurrentPositionAsync,
  mockReverseGeocodeAsync,
};
