
export interface ChatMessage {
  id: string;
  role: 'user' | 'model';
  text: string;
  imageUrl?: string;
  isError?: boolean;
  sourceLinks?: Array<{
    title: string;
    uri: string;
  }>;
}

export interface Task {
  id: string;
  text: string;
  completed: boolean;
  createdAt: number;
}

export enum AppMode {
  CHAT = 'CHAT',
  IMAGE_GEN = 'IMAGE_GEN'
}
