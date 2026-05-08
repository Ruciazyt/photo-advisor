const mockImpactAsync = jest.fn();
const mockNotificationAsync = jest.fn();

module.exports = {
  impactAsync: mockImpactAsync,
  notificationAsync: mockNotificationAsync,
  ImpactFeedbackStyle: {
    Light: 'light',
    Medium: 'medium',
    Heavy: 'heavy',
  },
  NotificationFeedbackType: {
    Success: 'success',
    Warning: 'warning',
    Error: 'error',
  },
};