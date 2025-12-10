import React from 'react';
//@ts-ignore
import { QuestionsStepProps } from '../../types/onboarding';
//@ts-ignore
import { ChatQuestionsPage } from '../../components/shared/chat';

export const QuestionsStep: React.FC<QuestionsStepProps> = (props) => {
  // Use the new ChatQuestionsPage component which provides a futuristic chat interface
  // similar to ChatModal but as a full-page component instead of a modal
  return (
    <ChatQuestionsPage
      {...props}
      showHeader={true}
    />
  );
};
