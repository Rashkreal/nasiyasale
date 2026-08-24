# NasiyaSale
Decentralized peer-to-peer credit marketplace on Arbitrum One — the frontend
that unifies two independent smart-contract systems, each with its own repo,
into one app:

- **[creditsale-contracts](https://github.com/Rashkreal/creditsale-contracts)** — the DUR-token credit marketplace (`CreditSale` + `PrivateTimeLockVault`)
- **[ListingMarket](https://github.com/Rashkreal/ListingMarket)** — the peer-to-peer WBTC credit market

## Smart Contracts (Arbitrum One)
- **CreditSale** (verified): [`0x61a011ca9a21Ec4073fA7E20448cbec86958B182`](https://arbiscan.io/address/0x61a011ca9a21Ec4073fA7E20448cbec86958B182#code) — see [creditsale-contracts](https://github.com/Rashkreal/creditsale-contracts) for source
- **PrivateTimeLockVault**: [`0x334ABa8643C7B7C97d5CeF5b73991e2af7D43462`](https://arbiscan.io/address/0x334ABa8643C7B7C97d5CeF5b73991e2af7D43462#code)
- **ListingMarket** (WBTC credit market, separate module): [`0x3F405B4203540474Cd8E45AFbdEa63Ea9d6c187e`](https://arbiscan.io/address/0x3F405B4203540474Cd8E45AFbdEa63Ea9d6c187e#code) — see [ListingMarket](https://github.com/Rashkreal/ListingMarket) for source

## Tokens
| Token | Address | Decimals | Role |
|-------|---------|----------|------|
| DUR | `0x92E1EbD0Cfac092047AB4a69B6E6a8ECA0687e26` | 18 | Trading |
| USDC | `0xaf88d065e77c8cC2239327C5EDb3A432268e5831` | 6 | Payment |
| WBTC | `0x2f2a2543B76A4166549F7aaB2e75Bef0aefC5B0f` | 8 | Collateral |
| WETH | `0x82aF49447D8a07e3bd95BD0d56f35241523fBab1` | 18 | Collateral |

## Tokenomics
DUR total supply: 100,000,000. Most of the supply is locked in
`PrivateTimeLockVault` (streamed + time-locked positions); the current
circulating figure and live DUR price (read on-chain from a Uniswap V4
pool via `StateView`) are shown on the [Tokenomics
page](https://nasiyasale.vercel.app/tokenomics) rather than duplicated
here, since they change over time.

## How It Works
NasiyaSale allows users to buy and sell DUR tokens on credit — with or without collateral. All transactions are executed through smart contracts with no intermediaries or administrators.

### Business Level (BL) System
- Collateral deal paid: `BL += DUR amount / 10`
- No-collateral deal paid: `BL += DUR amount`
- Deal not paid: `BL = 0`
- No-collateral listing requires: `BL >= DUR * 10`

## Security
- ReentrancyGuard on all state-changing functions
- Price snapshot at listing time (flash loan protection)
- 512-bit mulDiv for overflow-safe oracle math
- No admin functions — fully autonomous contract
- Security audit in progress

## Tech Stack
| Component | Technology |
|-----------|-----------|
| Smart Contracts | Solidity ^0.8.34, OpenZeppelin |
| Frontend | React 18, ethers.js v6 |
| Hosting | Vercel |
| Network | Arbitrum One |
| Oracle | Chainlink + Uniswap V4 StateView |
| Wallet | MetaMask, WalletConnect v2 |
| Realtime | Firebase Realtime Database |

## Getting Started
```bash
npm install --legacy-peer-deps
npm start
```

Open http://localhost:3000 in your browser.

## Links
- Website: https://nasiyasale.vercel.app
- Telegram: https://t.me/nasiyasale
- Network: Arbitrum One (Chain ID: 42161)

## License
MIT
