/**
 * Welcome messages for the chat modal
 * Returns a different message each day (consistent throughout the day)
 */

const WELCOME_MESSAGES = [
  "Hey {username}! 👋 What can I help you crush today? 💪",
  "Hey {username}! 👋 Ready to level up? What do you need? 🚀",
  "What's up, {username}! 👋 What's on your mind? 💪",
  "Hey {username}! 👋 Let's make today count. What can I help with? 🔥",
  "Hey {username}! 👋 What's the move? 💪",
  "Hey {username}! 👋 I'm here to help you reach your goals. What's up? 🎯",
  "Hey {username}! 👋 Let's do this. What do you need? 💪",
  "Hey {username}! 👋 What can I help you with today? 💪",
  "Yo {username}! 👋 What's good? How can I help? 💪",
  "Hey {username}! 👋 Time to get after it. What do you need? 🔥",
  "What's up, {username}! 👋 Let's make progress. What's on your mind? 💪",
  "Hey {username}! 👋 Ready to push forward? What can I help with? 🚀",
  "Hey {username}! 👋 Let's turn today into a win. What's up? 💪",
  "Hey {username}! 👋 What challenge can we tackle today? 🎯",
  "Hey {username}! 👋 Time to level up. What do you need? 💪",
  "What's up, {username}! 👋 Let's make it happen. How can I help? 🔥",
  "Hey {username}! 👋 Ready to crush it? What's on your mind? 💪",
  "Hey {username}! 👋 Let's build something great today. What do you need? 🚀",
  "Hey {username}! 👋 What's the plan? How can I help? 💪",
  "Hey {username}! 👋 Let's make today legendary. What's up? 🔥",
];

/**
 * Get a welcome message for the chat modal
 * Returns a different message each day (consistent throughout the day)
 * @param username - User's username to insert into the message
 * @returns A welcome message string
 */
export function getChatWelcomeMessage(username?: string): string {
  // Get the day of the year (0-365) to use as index
  // This ensures the same message is shown throughout the day
  const today = new Date();
  const startOfYear = new Date(today.getFullYear(), 0, 0);
  const dayOfYear = Math.floor((today.getTime() - startOfYear.getTime()) / (1000 * 60 * 60 * 24));
  
  // Use day of year modulo number of messages to cycle through them
  const messageIndex = dayOfYear % WELCOME_MESSAGES.length;
  const selectedMessage = WELCOME_MESSAGES[messageIndex];
  
  // Replace {username} placeholder with actual username or fallback
  const displayName = username || 'there';
  return selectedMessage.replace('{username}', displayName);
}

