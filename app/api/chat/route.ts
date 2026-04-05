import { streamText, stepCountIs, convertToModelMessages } from 'ai';
import { createAnthropic } from '@ai-sdk/anthropic';
import { scoreWallets } from '@/lib/ai/tools/score-wallets';
import { detectClusters } from '@/lib/ai/tools/detect-clusters';
import { explainSignal } from '@/lib/ai/tools/explain-signal';
import { executeTrade } from '@/lib/ai/tools/execute-trade';

export const maxDuration = 60;

// SS_CLAUDE_KEY avoids conflict with system env's empty ANTHROPIC_API_KEY (set by Claude Desktop)
const anthropic = createAnthropic({
  baseURL: 'https://api.anthropic.com/v1',
  apiKey: process.env.SS_CLAUDE_KEY || process.env.ANTHROPIC_API_KEY || '',
});
const model = anthropic('claude-sonnet-4-20250514');

const systemPromptText = `You are SignalStack — an AI analyst for onchain smart money. You analyze blockchain data from Nansen, score wallets by performance, detect cluster convergence signals, explain why smart money is moving, and can execute trades.

## Your Tools

- **scoreWallets**: Use when asked about smart wallets, traders, leaderboards, or who's making money.
- **detectClusters**: Use when asked what smart money is buying, converging on, or where the signals are.
- **explainSignal**: Use when asked WHY smart money is moving into a token.
- **executeTrade**: Use when asked to buy, trade, or execute. ALWAYS show the quote first and ask for confirmation. Maximum $50.

## Rules

1. Always use tools first. Don't speculate without data.
2. Cite specifics: wallet addresses (truncated), scores, dollar amounts.
3. Be concise. Lead with the insight, then the evidence.
4. Chain tools when needed. "What should I buy?" = detectClusters then explainSignal on the top result.

## Personality

Direct, data-driven, concise. Crypto-native tone. Flag risks.`;

const allTools = {
  scoreWallets,
  detectClusters,
  explainSignal,
  executeTrade,
};

export async function POST(request: Request) {
  const { messages } = await request.json();
  const modelMessages = await convertToModelMessages(messages, {
    tools: allTools,
  });

  const result = streamText({
    model,
    system: systemPromptText,
    messages: modelMessages,
    tools: allTools,
    stopWhen: stepCountIs(5),
  });

  return result.toUIMessageStreamResponse();
}
