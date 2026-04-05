import { streamText, stepCountIs, convertToModelMessages } from 'ai';
import { createAnthropic } from '@ai-sdk/anthropic';
import { systemPrompt } from '@/lib/ai/system-prompt';

// Smart Money
import { scoreWallets } from '@/lib/ai/tools/score-wallets';
import { detectClusters } from '@/lib/ai/tools/detect-clusters';
import { smartMoneyDexTrades } from '@/lib/ai/tools/smart-money-dex-trades';
import { smartMoneyPerps } from '@/lib/ai/tools/smart-money-perps';
import { smartMoneyHoldings } from '@/lib/ai/tools/smart-money-holdings';

// Wallet Intelligence
import { walletOverview } from '@/lib/ai/tools/wallet-overview';
import { walletTransactions } from '@/lib/ai/tools/wallet-transactions';
import { walletRelationships } from '@/lib/ai/tools/wallet-relationships';
import { walletCompare } from '@/lib/ai/tools/wallet-compare';

// Token Analysis
import { tokenScreener } from '@/lib/ai/tools/token-screener';
import { tokenInfo } from '@/lib/ai/tools/token-info';
import { tokenFlows } from '@/lib/ai/tools/token-flows';
import { tokenHolders } from '@/lib/ai/tools/token-holders';
import { tokenTrading } from '@/lib/ai/tools/token-trading';
import { explainSignal } from '@/lib/ai/tools/explain-signal';

// Perps
import { perpScreener } from '@/lib/ai/tools/perp-screener';
import { perpLeaderboard } from '@/lib/ai/tools/perp-leaderboard';

// Prediction Markets
import { predictionMarketScreener } from '@/lib/ai/tools/prediction-market-screener';
import { predictionMarketDetail } from '@/lib/ai/tools/prediction-market-detail';

// Trading
import { executeTrade } from '@/lib/ai/tools/execute-trade';
import { bridgeStatus } from '@/lib/ai/tools/bridge-status';

// Alerts & Search
import { manageAlerts } from '@/lib/ai/tools/alerts';
import { searchNansen as searchNansenTool } from '@/lib/ai/tools/search';

export const maxDuration = 120;

const anthropic = createAnthropic({
  baseURL: 'https://api.anthropic.com/v1',
  apiKey: process.env.SS_CLAUDE_KEY || process.env.ANTHROPIC_API_KEY || '',
});
const model = anthropic('claude-sonnet-4-20250514');

const allTools = {
  // Smart Money (5)
  scoreWallets,
  detectClusters,
  smartMoneyDexTrades,
  smartMoneyPerps,
  smartMoneyHoldings,
  // Wallet (4)
  walletOverview,
  walletTransactions,
  walletRelationships,
  walletCompare,
  // Token (6)
  tokenScreener,
  tokenInfo,
  tokenFlows,
  tokenHolders,
  tokenTrading,
  explainSignal,
  // Perps (2)
  perpScreener,
  perpLeaderboard,
  // Prediction Markets (2)
  predictionMarketScreener,
  predictionMarketDetail,
  // Trading (2)
  executeTrade,
  bridgeStatus,
  // Alerts & Search (2)
  manageAlerts,
  searchNansen: searchNansenTool,
};

export async function POST(request: Request) {
  const { messages } = await request.json();
  const modelMessages = await convertToModelMessages(messages, {
    tools: allTools,
  });

  const result = streamText({
    model,
    system: systemPrompt,
    messages: modelMessages,
    tools: allTools,
    stopWhen: stepCountIs(8),
  });

  return result.toUIMessageStreamResponse();
}
