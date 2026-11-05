export interface ChatModel {
    invoke(prompt: string): Promise<string>
}