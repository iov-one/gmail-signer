import { Message } from "../types/message";
export declare const createMessageCallback: (callback: (message: Message) => void) => (event: MessageEvent) => void;
