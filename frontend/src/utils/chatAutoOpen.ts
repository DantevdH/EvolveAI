let handler: (() => void) | null = null;

export const registerChatAutoOpenHandler = (fn: () => void) => {
  handler = fn;
};

export const unregisterChatAutoOpenHandler = () => {
  handler = null;
};

export const triggerChatAutoOpen = () => {
  try {
    handler && handler();
  } catch (e) {
    // swallow errors - caller can log if needed
  }
};

export default {
  registerChatAutoOpenHandler,
  unregisterChatAutoOpenHandler,
  triggerChatAutoOpen,
};


