const mockAddListener = jest.fn(() => ({ remove: jest.fn() }));
const mockRemove = jest.fn();
const mockSetUpdateInterval = jest.fn();
const mockIsAvailableAsync = jest.fn();

module.exports = {
  Accelerometer: {
    isAvailableAsync: mockIsAvailableAsync,
    setUpdateInterval: mockSetUpdateInterval,
    addListener: mockAddListener,
  },
};
