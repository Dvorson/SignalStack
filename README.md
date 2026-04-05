# SignalStack

AI-powered smart money intelligence built on the [Nansen CLI](https://github.com/nansen-ai/nansen-cli).

Ask questions in plain English. SignalStack scores wallets, detects cluster convergence signals, explains why smart money is moving, and can execute trades on Solana.

![Landing](public/screenshots/landing.png)

## How It Works

SignalStack is a conversational AI agent with four specialized tools powered by Nansen's onchain analytics:

**Wallet Scoring** - Pulls smart money netflow data via `nansen-cli`, cross-references wallet activity across top tokens, and computes a composite score based on PnL (40%), win rate (35%), and consistency (25%).

![Wallet Leaderboard](public/screenshots/wallet-leaderboard.png)

**Cluster Detection** - Identifies tokens where 3+ high-scoring smart money wallets are accumulating within a time window. Signal strength is computed from wallet count and average score. Conviction is rated HIGH/MEDIUM/LOW.

**Signal Explanation** - Gathers wallet profiles, volume data, and token metrics to explain WHY smart money is converging on a token. The AI synthesizes a thesis from the raw data.

![Cluster Signals](public/screenshots/cluster-signals.png)

**Trade Execution** - Quotes and executes DEX swaps on Solana via Nansen's trading API. Maximum $50 per trade with slippage guardrails.

## Architecture

```
User (chat) --> Claude (tool-use)
                 |-- scoreWallets --> nansen-cli smart-money + profiler
                 |-- detectClusters --> netflow convergence analysis
                 |-- explainSignal --> wallet profiles + token metrics
                 |-- executeTrade --> nansen-cli swap (Solana)
```

- **Frontend**: Next.js 16, Tailwind v4, AI SDK v6 (`useChat` + `sendMessage`)
- **AI**: Claude Sonnet 4 with tool-use via `@ai-sdk/anthropic`
- **Data**: Nansen CLI programmatic API (`nansen-cli/src/api.js`) - direct import, no shell-out
- **Demo mode**: Realistic mock data from actual Nansen API responses for zero-credit demos

## Nansen CLI Integration

SignalStack imports `NansenAPI` directly from `nansen-cli/src/api.js` for programmatic access:

- `smartMoneyNetflow()` - Token-level smart money flows with trader counts
- `tokenWhoBoughtSold()` - Wallet addresses and volumes per token
- `addressPnlSummary()` - Per-wallet PnL, win rate, and trade count
- `tokenInformation()` - Token metadata, market cap, sectors

API responses validated against real Nansen data (PUMP, BONK, WOJAK, TRIPLET, BUTTCOIN on Solana).

## Setup

```bash
# Clone
git clone https://github.com/Dvorson/SignalStack.git
cd SignalStack

# Install
pnpm install

# Configure
cp .env.local.example .env.local
# Add your ANTHROPIC_API_KEY (required)
# Add NANSEN_API_KEY (optional, demo mode works without it)

# Run
pnpm dev
```

Open http://localhost:3000 and ask a question like:
- "Who are the smartest wallets on Solana?"
- "What tokens are smart money converging on?"
- "Why is smart money buying PUMP?"

## Tech Stack

- [Next.js 16](https://nextjs.org) with Turbopack
- [Tailwind CSS v4](https://tailwindcss.com)
- [AI SDK v6](https://sdk.vercel.ai) with `@ai-sdk/anthropic`
- [Nansen CLI](https://github.com/nansen-ai/nansen-cli) for onchain data
- [Claude Sonnet 4](https://anthropic.com) for reasoning and tool-use
