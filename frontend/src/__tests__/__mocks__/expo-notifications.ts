// Mock for expo-notifications
const expoNotifications = {
  setNotificationHandler: jest.fn(),
  scheduleNotificationAsync: jest.fn(),
  cancelScheduledNotificationAsync: jest.fn(),
  getAllScheduledNotificationsAsync: jest.fn().mockResolvedValue([]),
  requestPermissionsAsync: jest.fn().mockResolvedValue({ status: 'granted' }),
  getPermissionsAsync: jest.fn().mockResolvedValue({ status: 'granted' }),
};

export default expoNotifications;
export const setNotificationHandler = expoNotifications.setNotificationHandler;
export const scheduleNotificationAsync = expoNotifications.scheduleNotificationAsync;
export const cancelScheduledNotificationAsync = expoNotifications.cancelScheduledNotificationAsync;
export const getAllScheduledNotificationsAsync = expoNotifications.getAllScheduledNotificationsAsync;
export const requestPermissionsAsync = expoNotifications.requestPermissionsAsync;
export const getPermissionsAsync = expoNotifications.getPermissionsAsync;

