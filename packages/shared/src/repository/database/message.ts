/**
 * Represents a message in a call.
 */
export interface Message {
  id: string;
  role: 'agent' | 'customer';
  content: string;
}
