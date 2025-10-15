/**
 * @license
 * Copyright 2025 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import { GoogleGenAI, Chat } from '@google/genai';
import { marked } from 'marked';

const API_KEY = process.env.API_KEY;

// DOM elements
const chatContainer = document.getElementById('chat-container') as HTMLDivElement;
const chatForm = document.getElementById('chat-form') as HTMLFormElement;
const chatInput = document.getElementById('chat-input') as HTMLInputElement;
const sendButton = chatForm.querySelector('button') as HTMLButtonElement;

async function main() {
  if (!API_KEY) {
    chatContainer.innerHTML = `<p class="error"><strong>Error:</strong> API key not found. Please set the API_KEY environment variable.</p>`;
    chatForm.style.display = 'none';
    return;
  }

  const ai = new GoogleGenAI({ apiKey: API_KEY });
  const chat: Chat = ai.chats.create({
    model: 'gemini-2.5-flash',
  });

  chatForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const message = chatInput.value.trim();
    if (!message) return;

    // Clear input and disable form
    chatInput.value = '';
    chatInput.disabled = true;
    sendButton.disabled = true;

    // Append user message
    appendMessage('user', message);

    // Append model message container with loading indicator
    const modelMessageElement = appendMessage('model', '<div class="loading"><span></span><span></span><span></span></div>', true);
    chatContainer.scrollTop = chatContainer.scrollHeight;

    try {
      const responseStream = await chat.sendMessageStream({ message });
      let fullResponseText = '';
      let isFirstChunk = true;
      
      for await (const chunk of responseStream) {
        if (isFirstChunk) {
            modelMessageElement.innerHTML = ''; // Clear loading indicator
            isFirstChunk = false;
        }
        fullResponseText += chunk.text;
        modelMessageElement.innerHTML = await marked.parse(fullResponseText);
        chatContainer.scrollTop = chatContainer.scrollHeight;
      }
    } catch (error) {
      console.error(error);
      const errorMessage = (error instanceof Error) ? error.message : 'Unknown error';
      modelMessageElement.innerHTML = `<p class="error">Sorry, something went wrong: ${errorMessage}</p>`;
    } finally {
      // Re-enable form
      chatInput.disabled = false;
      sendButton.disabled = false;
      chatInput.focus();
      chatContainer.scrollTop = chatContainer.scrollHeight;
    }
  });
}

function appendMessage(sender: 'user' | 'model', content: string, isHtml: boolean = false): HTMLDivElement {
  const messageElement = document.createElement('div');
  messageElement.classList.add('message', `${sender}-message`);
  
  if (isHtml) {
    messageElement.innerHTML = content;
  } else {
    // Sanitize user input by setting textContent
    messageElement.textContent = content;
  }
  
  chatContainer.appendChild(messageElement);
  return messageElement;
}

main().catch(console.error);
