export type MessageData = {
  id: number;
  role: string;
  content: string;
  createdAt: string;
};

export const messages: MessageData[] = [
  {
    id: 1,
    role: 'Customer',
    createdAt: new Date().toDateString(),
    content:
      'Hi, I’m having an issue with my subscription upgrade. I’ve been trying for the past hour and nothing is working.',
  },
  {
    id: 2,
    role: 'Agent',
    createdAt: new Date().toDateString(),
    content:
      'I’m sorry to hear that, I can definitely help. Which plan are you trying to upgrade to?',
  },
  {
    id: 3,
    role: 'Customer',
    createdAt: new Date().toDateString(),
    content:
      'I am trying to upgrade to the Pro plan, but every time I click the button it just gives me an error message.',
  },
  {
    id: 4,
    role: 'Agent',
    createdAt: new Date().toDateString(),
    content:
      'I see. Let me check that for you. Have you tried clearing your browser cache or using a different browser?',
  },
  {
    id: 5,
    role: 'Customer',
    createdAt: new Date().toDateString(),
    content: 'I already tried that! It keeps giving me an error. Why is this so complicated?',
  },
  {
    id: 6,
    role: 'Agent',
    createdAt: new Date().toDateString(),
    content:
      'This issue isn’t something customers usually encounter. To get around the issue, I can upgrade you to the Pro plan from the administrators end. I’ll just use the card you have on file.',
  },
  {
    id: 7,
    role: 'Customer',
    createdAt: new Date().toDateString(),
    content: 'I suppose that works-',
  },
  {
    id: 8,
    role: 'Agent',
    createdAt: new Date().toDateString(),
    content: 'What is your account number?',
  },
];
