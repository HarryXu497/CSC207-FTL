import type { Message } from 'src/entities';

const MAX_RECENT_MESSAGES = 4;
const MAX_TOPIC_CHARACTERS = 300;
const MAX_MESSAGE_CHARACTERS = 500;

/** Builds a bounded search query without changing the history used by the LLM prompt. */
export function buildSimulationRetrievalQuery(
  topic: string,
  history: readonly Pick<Message, 'role' | 'content'>[],
): string {
  const topicText = topic.trim().slice(0, MAX_TOPIC_CHARACTERS);
  const recentMessages = history.slice(-MAX_RECENT_MESSAGES).flatMap(({ role, content }) => {
    const text = content.trim().slice(-MAX_MESSAGE_CHARACTERS);
    return text ? [`${role.toUpperCase()}: ${text}`] : [];
  });

  return [topicText ? `Topic: ${topicText}` : '', ...recentMessages].filter(Boolean).join('\n');
}
