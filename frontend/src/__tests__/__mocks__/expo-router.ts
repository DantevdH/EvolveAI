// Mock for expo-router
const mockRouter = {
  push: jest.fn(),
  replace: jest.fn(),
  back: jest.fn(),
  canGoBack: jest.fn(() => false),
};

export const useRouter = () => mockRouter;
export const useSegments = () => [];
export const usePathname = () => '/';

