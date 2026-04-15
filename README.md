NasiyaSale
> Decentralized installment trading platform for DUR token on Optimism Mainnet
![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)
![Network: Optimism](https://img.shields.io/badge/Network-Optimism%20Mainnet-red.svg)
[![Audit: Pending](https://img.shields.io/badge/Audit-Pending-orange.svg)]()
Overview
NasiyaSale is a fully decentralized platform that allows users to buy and sell DUR tokens on credit (installment basis). All transactions are executed through smart contracts with no intermediaries or administrators.
Website: nasiyasale.vercel.app
Contracts
Contract	Address	Network
NasiyaSale (CreditSaleV4)	`0x7569bfE19a083172b4a02E2accc8a35Cf1f703EA`	Optimism Mainnet
Vault (PrivateTimeLockVault)	`0x1B1F96f30B8F6265a299000Ab23862c35a41B4a9`	Optimism Mainnet
Both contracts are verified on Optimism Etherscan.
Tokens
Token	Address	Decimals	Role
DUR	`0xf2f471dd1fBD278e54a81af7D5a22E3a38eA43Ff`	18	Trading
BLT	`0xEac1b253E553E28c48535ed738dAB70204B5D28B`	18	Collateral
USDC	`0x0b2C639c533813f4Aa9D7837CAf62653d097Ff85`	6	Payment/Collateral
USDT	`0x94b008aA00579c1307B0EF2c499aD98a8ce58e58`	6	Collateral
WBTC	`0x68f180fcCe6836688e9084f035309E29Bf0A2095`	8	Collateral
WETH	`0x4200000000000000000000000000000000000006`	18	Collateral
Tokenomics
Token	Total Supply	Locked	Circulating	Price
DUR	100,000,000	90%	10%	~$0.01
BLT	100,000,000	90%	10%	~$1.00
Lock Schedule:
80M DUR + 80M BLT — locked for 10+ years
10M DUR + 10M BLT — locked for 3 years
All locked tokens are verifiable onchain at nasiyasale.vercel.app/vault
How It Works
Listing Types
Type	Creator	Collateral	Function
Seller — Collateral	Seller (sends DUR)	Buyer provides	`postListingCollateralSell`
Buyer — Collateral	Buyer (sends collateral)	At listing time	`postListingCollateralBuy`
Seller — No Collateral	Seller (sends DUR)	None (BL required)	`postListingNoCollateralSell`
Buyer — No Collateral	Buyer	None (BL required)	`postListingNoCollateralBuy`
Business Level (BL) System
BL is a trust level between buyer and seller, stored separately for each pair.
Collateral deal paid: `BL += DUR amount / 10`
No-collateral deal paid: `BL += DUR amount`
Deal not paid: `BL = 0`
No-collateral listing requires: `BL >= DUR * 10`
Collateral Flow
Seller deposits DUR and posts listing with collateral mask
Buyer selects collateral token and approves listing
Collateral is locked in contract, DUR sent to buyer
Buyer pays USDC within deadline → collateral returned, BL increases
If not paid → seller claims collateral, buyer BL reset to 0
Security
ReentrancyGuard — all state-changing functions protected
Price snapshot — collateral prices locked at listing time (flash loan protection)
mulDiv — 512-bit intermediate calculations (overflow-safe oracle math)
No admin functions — contract is fully autonomous
Audit — security audit in progress via Optimism Audit Grant
Tech Stack
Component	Technology
Smart Contracts	Solidity ^0.8.34, OpenZeppelin
Frontend	React 18, ethers.js v6
Hosting	Vercel
Network	Optimism Mainnet
Oracle	Uniswap V4 StateView
Wallet	MetaMask, WalletConnect v2
Realtime	Firebase Realtime Database
Vault Features
ERC-20 token locking with configurable unlock time
Uniswap V4 LP NFT locking
NFT rebalancing (new NFT must be worth 95%+ of old)
Emergency withdrawal (unlock time + 48 hours)
Real-time price oracle (BLT/USDC, DUR/USDC)
Community
Telegram: t.me/nasiyasale
Website: nasiyasale.vercel.app
License
MIT
