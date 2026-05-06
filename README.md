# NasiyaSale
Decentralized peer-to-peer credit marketplace for DUR token on Optimism Mainnet.

## Smart Contracts
- **CreditSale**: `0x86808FFD1204C2BD9Ad5B79022968D11408d3efc`
- **PrivateTimeLockVault**: `0x1B1F96f30B8F6265a299000Ab23862c35a41B4a9`

Both contracts are verified on Optimism Etherscan.

## Tokens
| Token | Address | Decimals | Role |
|-------|---------|----------|------|
| DUR | `0xf2f471dd1fBD278e54a81af7D5a22E3a38eA43Ff` | 18 | Trading |
| BLT | `0xEac1b253E553E28c48535ed738dAB70204B5D28B` | 18 | Collateral |
| USDC | `0x0b2C639c533813f4Aa9D7837CAf62653d097Ff85` | 6 | Payment/Collateral |
| USDT | `0x94b008aA00579c1307B0EF2c499aD98a8ce58e58` | 6 | Collateral |
| WBTC | `0x68f180fcCe6836688e9084f035309E29Bf0A2095` | 8 | Collateral |
| WETH | `0x4200000000000000000000000000000000000006` | 18 | Collateral |

## Tokenomics
| Token | Total Supply | Locked | Circulating | Price |
|-------|-------------|--------|-------------|-------|
| DUR | 100,000,000 | 90% | 10% | ~$0.01 |
| BLT | 100,000,000 | 90% | 10% | ~$1.00 |

Lock Schedule:
- 80M DUR + 80M BLT — locked for 10+ years
- 10M DUR + 10M BLT — locked for 3 years

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
| Network | Optimism Mainnet |
| Oracle | Uniswap V4 StateView |
| Wallet | MetaMask, WalletConnect v2 |
| Realtime | Firebase Realtime Database |

## Getting Started
```bash
npm install --legacy-peer-deps
npm start
```

Open `http://localhost:3000` in your browser.

## Links
- Website: https://nasiyasale.vercel.app
- Telegram: https://t.me/nasiyasale
- Network: Optimism Mainnet (Chain ID: 10)

## License
MIT