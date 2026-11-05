import type { BaseChatModel } from "@langchain/core/language_models/chat_models";
import type { ChatModel } from "./ChatModel";

export class LangChainChatModel implements ChatModel {
    constructor(private readonly model: BaseChatModel) {}

    async invoke(prompt: string): Promise<string> {
        const res = await this.model.invoke(prompt);
        if (typeof res.content === "string") {
            return res.content
        } else {
            return JSON.stringify(res.content)
        }
    }
}