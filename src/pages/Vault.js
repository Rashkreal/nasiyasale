import { useState, useEffect, useCallback, useRef } from "react";
import { ethers } from "ethers";
import toast from "react-hot-toast";
import { useWeb3 } from "../hooks/useWeb3";
import { useLang } from "../hooks/useLang";
import { useLocation, useNavigate } from "react-router-dom";
import { Lock, Unlock, AlertTriangle, RefreshCw, Search, Zap, Shield, ArrowDownToLine, Copy } from "lucide-react";

// ─── Konstantalar (Arbitrum One) ────────────────────────────────────────────
const VAULT_ADDRESS    = "0x334ABa8643C7B7C97d5CeF5b73991e2af7D43462";
const OWNER_ADDRESS    = "0x0e86d8afaa0B77D732d89BD5ceC3dC9003b321dA";
const POSITION_MANAGER = "0xd88F38F930b7952f2DB2432Cb002E7abbF3dD869";
const RPC              = "https://rpc.ankr.com/arbitrum/e531710028d0852baae1e1de9993017d4025b2d30d21d0ac5f812150724416b5";
const RPC_BACKUP       = "https://arb1.arbitrum.io/rpc";

const TOKENS = {
  DUR:  { address: "0x92E1EbD0Cfac092047AB4a69B6E6a8ECA0687e26", decimals: 18, symbol: "DUR",  name: "Durvodik"         },
  USDC: { address: "0xaf88d065e77c8cC2239327C5EDb3A432268e5831", decimals: 6,  symbol: "USDC", name: "USD Coin"         },
  WBTC: { address: "0x2f2a2543B76A4166549F7aaB2e75Bef0aefC5B0f", decimals: 8,  symbol: "WBTC", name: "Wrapped Bitcoin"  },
};
const TOKEN_LIST    = Object.values(TOKENS);
const TOKEN_BY_ADDR = Object.fromEntries(TOKEN_LIST.map(t => [t.address.toLowerCase(), t]));

const VAULT_ABI = [{"inputs":[],"stateMutability":"nonpayable","type":"constructor"},{"inputs":[{"internalType":"uint256","name":"lockId","type":"uint256"},{"internalType":"uint256","name":"availableAt","type":"uint256"}],"name":"EmergencyNotReady","type":"error"},{"inputs":[{"internalType":"string","name":"reason","type":"string"}],"name":"InvalidNFT","type":"error"},{"inputs":[{"internalType":"string","name":"reason","type":"string"}],"name":"InvalidUnlockTime","type":"error"},{"inputs":[{"internalType":"uint256","name":"lockId","type":"uint256"}],"name":"LockAlreadyDone","type":"error"},{"inputs":[{"internalType":"uint256","name":"lockId","type":"uint256"}],"name":"LockNotFound","type":"error"},{"inputs":[{"internalType":"uint256","name":"lockId","type":"uint256"},{"internalType":"uint256","name":"unlockTimestamp","type":"uint256"}],"name":"LockStillActive","type":"error"},{"inputs":[{"internalType":"uint256","name":"nftLockId","type":"uint256"},{"internalType":"uint256","name":"availableAt","type":"uint256"}],"name":"NFTEmergencyNotReady","type":"error"},{"inputs":[{"internalType":"uint256","name":"nftLockId","type":"uint256"}],"name":"NFTLockAlreadyDone","type":"error"},{"inputs":[{"internalType":"uint256","name":"nftLockId","type":"uint256"}],"name":"NFTLockNotFound","type":"error"},{"inputs":[{"internalType":"uint256","name":"nftLockId","type":"uint256"},{"internalType":"uint256","name":"unlockTimestamp","type":"uint256"}],"name":"NFTLockStillActive","type":"error"},{"inputs":[],"name":"NotOwner","type":"error"},{"inputs":[],"name":"NotPositionManager","type":"error"},{"inputs":[{"internalType":"uint256","name":"streamId","type":"uint256"}],"name":"NothingToWithdraw","type":"error"},{"inputs":[],"name":"ReentrancyGuardReentrantCall","type":"error"},{"inputs":[{"internalType":"address","name":"token","type":"address"}],"name":"SafeERC20FailedOperation","type":"error"},{"inputs":[{"internalType":"uint256","name":"streamId","type":"uint256"}],"name":"StreamAlreadyDone","type":"error"},{"inputs":[{"internalType":"uint256","name":"streamId","type":"uint256"},{"internalType":"uint256","name":"availableAt","type":"uint256"}],"name":"StreamEmergencyNotReady","type":"error"},{"inputs":[{"internalType":"uint256","name":"streamId","type":"uint256"}],"name":"StreamNotFound","type":"error"},{"inputs":[],"name":"TokenNotAllowed","type":"error"},{"inputs":[],"name":"ZeroAmount","type":"error"},{"anonymous":false,"inputs":[{"indexed":true,"internalType":"uint256","name":"lockId","type":"uint256"},{"indexed":true,"internalType":"address","name":"token","type":"address"},{"indexed":false,"internalType":"uint256","name":"amount","type":"uint256"},{"indexed":false,"internalType":"uint256","name":"depositTime","type":"uint256"},{"indexed":false,"internalType":"uint256","name":"unlockTimestamp","type":"uint256"},{"indexed":false,"internalType":"uint256","name":"emergencyAvailableAt","type":"uint256"}],"name":"Deposited","type":"event"},{"anonymous":false,"inputs":[{"indexed":true,"internalType":"uint256","name":"lockId","type":"uint256"},{"indexed":true,"internalType":"address","name":"token","type":"address"},{"indexed":false,"internalType":"uint256","name":"amount","type":"uint256"},{"indexed":true,"internalType":"address","name":"to","type":"address"}],"name":"EmergencyWithdrawn","type":"event"},{"anonymous":false,"inputs":[{"indexed":true,"internalType":"uint256","name":"nftLockId","type":"uint256"},{"indexed":true,"internalType":"uint256","name":"tokenId","type":"uint256"},{"indexed":false,"internalType":"uint128","name":"liquidity","type":"uint128"},{"indexed":false,"internalType":"uint256","name":"usdcAmount","type":"uint256"},{"indexed":false,"internalType":"uint256","name":"unlockTimestamp","type":"uint256"}],"name":"NFTDeposited","type":"event"},{"anonymous":false,"inputs":[{"indexed":true,"internalType":"uint256","name":"nftLockId","type":"uint256"},{"indexed":true,"internalType":"uint256","name":"tokenId","type":"uint256"},{"indexed":true,"internalType":"address","name":"to","type":"address"}],"name":"NFTEmergencyWithdrawn","type":"event"},{"anonymous":false,"inputs":[{"indexed":true,"internalType":"uint256","name":"oldNftLockId","type":"uint256"},{"indexed":false,"internalType":"uint256","name":"oldTokenId","type":"uint256"},{"indexed":true,"internalType":"uint256","name":"newNftLockId","type":"uint256"},{"indexed":false,"internalType":"uint256","name":"newTokenId","type":"uint256"}],"name":"NFTRebalanced","type":"event"},{"anonymous":false,"inputs":[{"indexed":true,"internalType":"uint256","name":"nftLockId","type":"uint256"},{"indexed":true,"internalType":"uint256","name":"tokenId","type":"uint256"},{"indexed":true,"internalType":"address","name":"to","type":"address"}],"name":"NFTWithdrawn","type":"event"},{"anonymous":false,"inputs":[{"indexed":true,"internalType":"uint256","name":"streamId","type":"uint256"},{"indexed":true,"internalType":"address","name":"token","type":"address"},{"indexed":false,"internalType":"uint256","name":"totalAmount","type":"uint256"},{"indexed":false,"internalType":"uint256","name":"startTime","type":"uint256"},{"indexed":false,"internalType":"uint256","name":"endTime","type":"uint256"},{"indexed":false,"internalType":"uint256","name":"emergencyAvailableAt","type":"uint256"}],"name":"StreamDeposited","type":"event"},{"anonymous":false,"inputs":[{"indexed":true,"internalType":"uint256","name":"streamId","type":"uint256"},{"indexed":true,"internalType":"address","name":"token","type":"address"},{"indexed":false,"internalType":"uint256","name":"amount","type":"uint256"},{"indexed":true,"internalType":"address","name":"to","type":"address"}],"name":"StreamEmergencyWithdrawn","type":"event"},{"anonymous":false,"inputs":[{"indexed":true,"internalType":"uint256","name":"streamId","type":"uint256"},{"indexed":true,"internalType":"address","name":"token","type":"address"},{"indexed":false,"internalType":"uint256","name":"amount","type":"uint256"},{"indexed":false,"internalType":"uint256","name":"totalWithdrawn","type":"uint256"},{"indexed":true,"internalType":"address","name":"to","type":"address"}],"name":"StreamWithdrawn","type":"event"},{"anonymous":false,"inputs":[{"indexed":true,"internalType":"uint256","name":"lockId","type":"uint256"},{"indexed":true,"internalType":"address","name":"token","type":"address"},{"indexed":false,"internalType":"uint256","name":"amount","type":"uint256"},{"indexed":true,"internalType":"address","name":"to","type":"address"}],"name":"Withdrawn","type":"event"},{"stateMutability":"payable","type":"fallback"},{"inputs":[],"name":"DUR","outputs":[{"internalType":"address","name":"","type":"address"}],"stateMutability":"view","type":"function"},{"inputs":[],"name":"DUR_POOL_ID","outputs":[{"internalType":"bytes32","name":"","type":"bytes32"}],"stateMutability":"view","type":"function"},{"inputs":[],"name":"OWNER","outputs":[{"internalType":"address","name":"","type":"address"}],"stateMutability":"view","type":"function"},{"inputs":[],"name":"POSITION_MANAGER","outputs":[{"internalType":"contract IPositionManager","name":"","type":"address"}],"stateMutability":"view","type":"function"},{"inputs":[],"name":"STATE_VIEW","outputs":[{"internalType":"contract IStateView","name":"","type":"address"}],"stateMutability":"view","type":"function"},{"inputs":[],"name":"USDC","outputs":[{"internalType":"address","name":"","type":"address"}],"stateMutability":"view","type":"function"},{"inputs":[],"name":"WBTC","outputs":[{"internalType":"address","name":"","type":"address"}],"stateMutability":"view","type":"function"},{"inputs":[{"internalType":"address","name":"token","type":"address"},{"internalType":"uint256","name":"amount","type":"uint256"},{"internalType":"uint256","name":"unlockTimestamp","type":"uint256"}],"name":"deposit","outputs":[{"internalType":"uint256","name":"lockId","type":"uint256"}],"stateMutability":"nonpayable","type":"function"},{"inputs":[{"internalType":"uint256","name":"tokenId","type":"uint256"},{"internalType":"uint256","name":"unlockTimestamp","type":"uint256"}],"name":"depositNFT","outputs":[{"internalType":"uint256","name":"nftLockId","type":"uint256"}],"stateMutability":"nonpayable","type":"function"},{"inputs":[{"internalType":"address","name":"token","type":"address"},{"internalType":"uint256","name":"amount","type":"uint256"},{"internalType":"uint256","name":"startTimestamp","type":"uint256"},{"internalType":"uint256","name":"endTimestamp","type":"uint256"}],"name":"depositStream","outputs":[{"internalType":"uint256","name":"streamId","type":"uint256"}],"stateMutability":"nonpayable","type":"function"},{"inputs":[{"internalType":"uint256","name":"lockId","type":"uint256"}],"name":"emergencyWithdraw","outputs":[],"stateMutability":"nonpayable","type":"function"},{"inputs":[{"internalType":"uint256","name":"nftLockId","type":"uint256"}],"name":"emergencyWithdrawNFT","outputs":[],"stateMutability":"nonpayable","type":"function"},{"inputs":[{"internalType":"uint256","name":"streamId","type":"uint256"}],"name":"emergencyWithdrawStream","outputs":[],"stateMutability":"nonpayable","type":"function"},{"inputs":[{"internalType":"address","name":"token","type":"address"}],"name":"getActiveLocksByToken","outputs":[{"components":[{"internalType":"uint256","name":"id","type":"uint256"},{"internalType":"address","name":"token","type":"address"},{"internalType":"uint256","name":"amount","type":"uint256"},{"internalType":"uint256","name":"depositTime","type":"uint256"},{"internalType":"uint256","name":"unlockTimestamp","type":"uint256"},{"internalType":"enum PrivateTimeLockVault.LockStatus","name":"status","type":"uint8"}],"internalType":"struct PrivateTimeLockVault.LockEntry[]","name":"","type":"tuple[]"}],"stateMutability":"view","type":"function"},{"inputs":[],"name":"getActiveNFTLocks","outputs":[{"components":[{"internalType":"uint256","name":"id","type":"uint256"},{"internalType":"uint256","name":"tokenId","type":"uint256"},{"internalType":"uint128","name":"liquidity","type":"uint128"},{"internalType":"uint256","name":"usdcAmount","type":"uint256"},{"internalType":"uint256","name":"depositTime","type":"uint256"},{"internalType":"uint256","name":"unlockTimestamp","type":"uint256"},{"internalType":"enum PrivateTimeLockVault.NFTLockStatus","name":"status","type":"uint8"}],"internalType":"struct PrivateTimeLockVault.NFTLockEntry[]","name":"","type":"tuple[]"}],"stateMutability":"view","type":"function"},{"inputs":[],"name":"getActiveStreams","outputs":[{"components":[{"internalType":"uint256","name":"id","type":"uint256"},{"internalType":"address","name":"token","type":"address"},{"internalType":"uint256","name":"totalAmount","type":"uint256"},{"internalType":"uint256","name":"withdrawnAmount","type":"uint256"},{"internalType":"uint256","name":"startTime","type":"uint256"},{"internalType":"uint256","name":"endTime","type":"uint256"},{"internalType":"enum PrivateTimeLockVault.StreamStatus","name":"status","type":"uint8"}],"internalType":"struct PrivateTimeLockVault.StreamEntry[]","name":"","type":"tuple[]"}],"stateMutability":"view","type":"function"},{"inputs":[],"name":"getAllBalances","outputs":[{"internalType":"uint256","name":"durBalance","type":"uint256"},{"internalType":"uint256","name":"wbtcBalance","type":"uint256"},{"internalType":"uint256","name":"usdcBalance","type":"uint256"}],"stateMutability":"view","type":"function"},{"inputs":[],"name":"getAllNFTLocks","outputs":[{"components":[{"internalType":"uint256","name":"id","type":"uint256"},{"internalType":"uint256","name":"tokenId","type":"uint256"},{"internalType":"uint128","name":"liquidity","type":"uint128"},{"internalType":"uint256","name":"usdcAmount","type":"uint256"},{"internalType":"uint256","name":"depositTime","type":"uint256"},{"internalType":"uint256","name":"unlockTimestamp","type":"uint256"},{"internalType":"enum PrivateTimeLockVault.NFTLockStatus","name":"status","type":"uint8"}],"internalType":"struct PrivateTimeLockVault.NFTLockEntry[]","name":"","type":"tuple[]"}],"stateMutability":"view","type":"function"},{"inputs":[],"name":"getAllStreams","outputs":[{"components":[{"internalType":"uint256","name":"id","type":"uint256"},{"internalType":"address","name":"token","type":"address"},{"internalType":"uint256","name":"totalAmount","type":"uint256"},{"internalType":"uint256","name":"withdrawnAmount","type":"uint256"},{"internalType":"uint256","name":"startTime","type":"uint256"},{"internalType":"uint256","name":"endTime","type":"uint256"},{"internalType":"enum PrivateTimeLockVault.StreamStatus","name":"status","type":"uint8"}],"internalType":"struct PrivateTimeLockVault.StreamEntry[]","name":"","type":"tuple[]"}],"stateMutability":"view","type":"function"},{"inputs":[{"internalType":"address","name":"token","type":"address"}],"name":"getAllowance","outputs":[{"internalType":"uint256","name":"","type":"uint256"}],"stateMutability":"view","type":"function"},{"inputs":[{"internalType":"uint256","name":"lockId","type":"uint256"}],"name":"getLock","outputs":[{"components":[{"internalType":"uint256","name":"id","type":"uint256"},{"internalType":"address","name":"token","type":"address"},{"internalType":"uint256","name":"amount","type":"uint256"},{"internalType":"uint256","name":"depositTime","type":"uint256"},{"internalType":"uint256","name":"unlockTimestamp","type":"uint256"},{"internalType":"enum PrivateTimeLockVault.LockStatus","name":"status","type":"uint8"}],"internalType":"struct PrivateTimeLockVault.LockEntry","name":"","type":"tuple"}],"stateMutability":"view","type":"function"},{"inputs":[{"internalType":"uint256","name":"lockId","type":"uint256"}],"name":"getLockTimeInfo","outputs":[{"internalType":"bool","name":"isUnlocked","type":"bool"},{"internalType":"bool","name":"isEmergencyReady","type":"bool"},{"internalType":"uint256","name":"secondsToUnlock","type":"uint256"},{"internalType":"uint256","name":"secondsToEmergency","type":"uint256"}],"stateMutability":"view","type":"function"},{"inputs":[{"internalType":"address","name":"token","type":"address"}],"name":"getLocksByToken","outputs":[{"components":[{"internalType":"uint256","name":"id","type":"uint256"},{"internalType":"address","name":"token","type":"address"},{"internalType":"uint256","name":"amount","type":"uint256"},{"internalType":"uint256","name":"depositTime","type":"uint256"},{"internalType":"uint256","name":"unlockTimestamp","type":"uint256"},{"internalType":"enum PrivateTimeLockVault.LockStatus","name":"status","type":"uint8"}],"internalType":"struct PrivateTimeLockVault.LockEntry[]","name":"","type":"tuple[]"}],"stateMutability":"view","type":"function"},{"inputs":[{"internalType":"uint256","name":"nftLockId","type":"uint256"}],"name":"getNFTLock","outputs":[{"components":[{"internalType":"uint256","name":"id","type":"uint256"},{"internalType":"uint256","name":"tokenId","type":"uint256"},{"internalType":"uint128","name":"liquidity","type":"uint128"},{"internalType":"uint256","name":"usdcAmount","type":"uint256"},{"internalType":"uint256","name":"depositTime","type":"uint256"},{"internalType":"uint256","name":"unlockTimestamp","type":"uint256"},{"internalType":"enum PrivateTimeLockVault.NFTLockStatus","name":"status","type":"uint8"}],"internalType":"struct PrivateTimeLockVault.NFTLockEntry","name":"","type":"tuple"}],"stateMutability":"view","type":"function"},{"inputs":[{"internalType":"uint256","name":"nftLockId","type":"uint256"}],"name":"getNFTLockTimeInfo","outputs":[{"internalType":"bool","name":"isUnlocked","type":"bool"},{"internalType":"bool","name":"isEmergencyReady","type":"bool"},{"internalType":"uint256","name":"secondsToUnlock","type":"uint256"},{"internalType":"uint256","name":"secondsToEmergency","type":"uint256"}],"stateMutability":"view","type":"function"},{"inputs":[{"internalType":"uint256","name":"tokenId","type":"uint256"}],"name":"getNFTValueUSDC","outputs":[{"internalType":"uint256","name":"","type":"uint256"}],"stateMutability":"view","type":"function"},{"inputs":[{"internalType":"address","name":"token","type":"address"}],"name":"getRealBalance","outputs":[{"internalType":"uint256","name":"","type":"uint256"}],"stateMutability":"view","type":"function"},{"inputs":[{"internalType":"uint256","name":"streamId","type":"uint256"}],"name":"getStream","outputs":[{"components":[{"internalType":"uint256","name":"id","type":"uint256"},{"internalType":"address","name":"token","type":"address"},{"internalType":"uint256","name":"totalAmount","type":"uint256"},{"internalType":"uint256","name":"withdrawnAmount","type":"uint256"},{"internalType":"uint256","name":"startTime","type":"uint256"},{"internalType":"uint256","name":"endTime","type":"uint256"},{"internalType":"enum PrivateTimeLockVault.StreamStatus","name":"status","type":"uint8"}],"internalType":"struct PrivateTimeLockVault.StreamEntry","name":"","type":"tuple"}],"stateMutability":"view","type":"function"},{"inputs":[{"internalType":"uint256","name":"streamId","type":"uint256"}],"name":"getStreamTimeInfo","outputs":[{"internalType":"bool","name":"isFullyUnlocked","type":"bool"},{"internalType":"bool","name":"isEmergencyReady","type":"bool"},{"internalType":"uint256","name":"secondsToEnd","type":"uint256"},{"internalType":"uint256","name":"secondsToEmergency","type":"uint256"},{"internalType":"uint256","name":"unlocked","type":"uint256"},{"internalType":"uint256","name":"withdrawable","type":"uint256"}],"stateMutability":"view","type":"function"},{"inputs":[],"name":"getWithdrawalAddress","outputs":[{"internalType":"address","name":"","type":"address"}],"stateMutability":"view","type":"function"},{"inputs":[{"internalType":"address","name":"operator","type":"address"},{"internalType":"address","name":"","type":"address"},{"internalType":"uint256","name":"","type":"uint256"},{"internalType":"bytes","name":"","type":"bytes"}],"name":"onERC721Received","outputs":[{"internalType":"bytes4","name":"","type":"bytes4"}],"stateMutability":"view","type":"function"},{"inputs":[{"internalType":"uint256","name":"oldNftLockId","type":"uint256"},{"internalType":"uint256","name":"newTokenId","type":"uint256"}],"name":"rebalanceNFT","outputs":[],"stateMutability":"nonpayable","type":"function"},{"inputs":[{"internalType":"address","name":"","type":"address"}],"name":"streamBalance","outputs":[{"internalType":"uint256","name":"","type":"uint256"}],"stateMutability":"view","type":"function"},{"inputs":[{"internalType":"address","name":"token","type":"address"}],"name":"syncBalance","outputs":[],"stateMutability":"nonpayable","type":"function"},{"inputs":[],"name":"totalLocks","outputs":[{"internalType":"uint256","name":"","type":"uint256"}],"stateMutability":"view","type":"function"},{"inputs":[],"name":"totalNFTLocks","outputs":[{"internalType":"uint256","name":"","type":"uint256"}],"stateMutability":"view","type":"function"},{"inputs":[],"name":"totalStreams","outputs":[{"internalType":"uint256","name":"","type":"uint256"}],"stateMutability":"view","type":"function"},{"inputs":[{"internalType":"uint256","name":"streamId","type":"uint256"}],"name":"unlockedAmount","outputs":[{"internalType":"uint256","name":"","type":"uint256"}],"stateMutability":"view","type":"function"},{"inputs":[{"internalType":"address","name":"","type":"address"}],"name":"vaultBalance","outputs":[{"internalType":"uint256","name":"","type":"uint256"}],"stateMutability":"view","type":"function"},{"inputs":[{"internalType":"uint256","name":"lockId","type":"uint256"}],"name":"withdraw","outputs":[],"stateMutability":"nonpayable","type":"function"},{"inputs":[{"internalType":"uint256","name":"nftLockId","type":"uint256"}],"name":"withdrawNFT","outputs":[],"stateMutability":"nonpayable","type":"function"},{"inputs":[{"internalType":"uint256","name":"streamId","type":"uint256"}],"name":"withdrawStream","outputs":[],"stateMutability":"nonpayable","type":"function"},{"inputs":[{"internalType":"uint256","name":"streamId","type":"uint256"}],"name":"withdrawableAmount","outputs":[{"internalType":"uint256","name":"","type":"uint256"}],"stateMutability":"view","type":"function"},{"stateMutability":"payable","type":"receive"}];

const ERC20_ABI = [
  "function approve(address spender, uint256 amount) returns (bool)",
  "function allowance(address owner, address spender) view returns (uint256)",
  "function balanceOf(address account) view returns (uint256)",
];

// ─── Yordamchilar ────────────────────────────────────────────────────────────
const formatAmt = (val, dec) => {
  try {
    const n = Number(ethers.formatUnits(val, dec));
    if (n === 0) return "—";
    if (n < 0.0001) return "<0.0001";
    if (n < 1) return n.toFixed(4);
    if (n < 1000) return n.toFixed(2);
    if (n < 1000000) return (n / 1000).toFixed(2) + "K";
    return (n / 1000000).toFixed(2) + "M";
  } catch { return "—"; }
};

const formatDate = (ts) => {
  if (!ts) return "—";
  return new Date(Number(ts) * 1000).toLocaleDateString("uz", {
    year: "numeric", month: "short", day: "numeric", hour: "2-digit", minute: "2-digit"
  });
};

// +60 sekund zaxira
const daysToUnlockTs = (days) =>
  Math.floor(Date.now() / 1000) + Number(days) * 86400 + 300;

// ─── Vault Styles ────────────────────────────────────────────────────────────
const vaultStyles = `
@import url('https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@400;500;600;700&display=swap');

.vault-wrap { font-family: var(--font-sans, "DM Sans", sans-serif); }

/* Lock list */
.lock-list { display: flex; flex-direction: column; gap: 8px; }

.lock-row {
  background: var(--bg-card, #1a1f2e);
  border: 1px solid var(--border, #2a3040);
  border-radius: 12px;
  padding: 16px 20px;
  display: grid;
  grid-template-columns: 60px 1.2fr 160px 140px 130px auto;
  align-items: center;
  gap: 16px;
  transition: all 0.2s;
}
.lock-row:hover {
  border-color: rgba(0,212,170,0.2);
  background: var(--bg-card-hover, #222840);
}
.lock-row.unlocked {
  border-color: rgba(0,212,170,0.35);
  box-shadow: 0 0 12px rgba(0,212,170,0.1);
}

.lock-id {
  font-family: 'JetBrains Mono', var(--font-mono, monospace);
  font-size: 15px;
  font-weight: 700;
  color: var(--accent, #00d4aa);
}

.lock-amount {
  font-family: 'JetBrains Mono', var(--font-mono, monospace);
  font-size: 15px;
  font-weight: 600;
  color: var(--text-primary, #e8edf5);
}

.lock-time {
  font-size: 12px;
  color: var(--text-secondary, #8892a8);
}

.lock-countdown {
  font-family: 'JetBrains Mono', var(--font-mono, monospace);
  font-size: 13px;
  font-weight: 600;
}
.lock-countdown.expired { color: var(--accent, #00d4aa); }
.lock-countdown.active  { color: var(--warning, #f59e0b); }

.lock-actions { display: flex; gap: 6px; flex-wrap: wrap; }

/* Token badge */
.token-badge {
  display: inline-flex;
  align-items: center;
  padding: 4px 10px;
  border-radius: 999px;
  font-size: 12px;
  font-weight: 700;
  font-family: 'JetBrains Mono', var(--font-mono, monospace);
}
.token-badge.dur  { background: rgba(0,212,170,0.12);  color: #00d4aa; }
.token-badge.usdc { background: rgba(38,118,230,0.12); color: #2676e6; }
.token-badge.wbtc { background: rgba(247,147,26,0.12); color: #f7931a; }

/* Status badge */
.status-badge {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  padding: 4px 10px;
  border-radius: 999px;
  font-size: 11px;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}
.status-badge.active    { background: rgba(0,212,170,0.12);  color: #00d4aa; }
.status-badge.withdrawn { background: rgba(107,114,128,0.15); color: #6b7280; }
.status-badge.emergency { background: rgba(245,158,11,0.12); color: #f59e0b; }
.status-badge.unlocked  { background: rgba(16,185,129,0.12); color: #10b981; }
.status-dot { width:6px; height:6px; border-radius:50%; background:currentColor; flex-shrink:0; }

/* Pulse glow */
@keyframes pulse-glow {
  0%,100% { box-shadow: 0 0 0 0 rgba(0,212,170,0.4); }
  50%      { box-shadow: 0 0 12px 4px rgba(0,212,170,0.2); }
}
.pulse-glow { animation: pulse-glow 2s ease-in-out infinite; }

/* Buttons */
.btn {
  font-family: var(--font-sans, "DM Sans", sans-serif);
  font-size: 13px; font-weight: 600;
  padding: 10px 18px;
  border-radius: 8px;
  border: 1px solid transparent;
  cursor: pointer;
  display: inline-flex; align-items: center; justify-content: center; gap: 6px;
  transition: all 0.2s; white-space: nowrap;
}
.btn:disabled { opacity: 0.4; cursor: not-allowed; }
.btn-primary {
  background: var(--accent, #00d4aa);
  color: #0a0e17;
  border-color: var(--accent, #00d4aa);
}
.btn-primary:hover:not(:disabled) { background: #00f0c0; }
.btn-danger {
  background: rgba(239,68,68,0.12);
  color: #ef4444;
  border-color: rgba(239,68,68,0.3);
}
.btn-danger:hover:not(:disabled) { background: rgba(239,68,68,0.2); }
.btn-ghost {
  background: transparent;
  color: var(--text-secondary, #8892a8);
  border-color: var(--border, #2a3040);
}
.btn-ghost:hover:not(:disabled) {
  background: var(--bg-card, #1a1f2e);
  color: var(--text-primary, #e8edf5);
}
.btn-sm { padding: 6px 12px; font-size: 12px; }

/* Spinner */
.spinner {
  border: 2px solid var(--border, #2a3040);
  border-top-color: var(--accent, #00d4aa);
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
}
@keyframes spin { to { transform: rotate(360deg); } }

/* Balance grid */
.balance-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(140px, 1fr));
  gap: 8px;
}
.balance-item {
  display: flex; align-items: center; justify-content: space-between;
  padding: 10px 14px;
  background: var(--bg-input, #0d1117);
  border-radius: 8px;
  border: 1px solid var(--border, #2a3040);
}
.balance-amount {
  font-family: 'JetBrains Mono', monospace;
  font-size: 13px; font-weight: 700;
  color: var(--text-primary, #e8edf5);
}

/* Stat grid */
.stat-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(160px,1fr)); gap: 12px; }
.stat-card {
  background: var(--bg-card, #1a1f2e);
  border: 1px solid var(--border, #2a3040);
  border-radius: 12px; padding: 18px 20px;
  position: relative; overflow: hidden;
}
.stat-card::before {
  content:''; position:absolute; top:0; left:0; right:0; height:2px;
  background: linear-gradient(135deg,#00d4aa,#00a3ff); opacity:0; transition:opacity 0.3s;
}
.stat-card:hover::before { opacity:1; }
.stat-label {
  font-size: 11px; color: var(--text-muted, #4a5568);
  font-weight: 600; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 8px;
}
.stat-value {
  font-family: 'JetBrains Mono', monospace;
  font-size: 22px; font-weight: 700; color: var(--text-primary, #e8edf5);
}
.stat-value.accent { color: var(--accent, #00d4aa); }

/* Card */
.card {
  background: var(--bg-card, #1a1f2e);
  border: 1px solid var(--border, #2a3040);
  border-radius: 12px; padding: 20px;
}
.card-header { display:flex; align-items:center; justify-content:space-between; margin-bottom:16px; }
.card-title { font-size:14px; font-weight:700; color:var(--text-primary,#e8edf5); }

/* Form */
.form-group { margin-bottom: 16px; }
.form-label {
  display: block; font-size: 11px; font-weight: 600;
  color: var(--text-secondary, #8892a8);
  margin-bottom: 6px; text-transform: uppercase; letter-spacing: 0.5px;
}
.form-input, .form-select {
  width: 100%; padding: 12px 14px;
  background: var(--bg-input, #0d1117);
  border: 1px solid var(--border, #2a3040);
  border-radius: 8px; color: var(--text-primary, #e8edf5);
  font-family: 'JetBrains Mono', monospace; font-size: 14px;
  transition: border-color 0.2s; outline: none; box-sizing: border-box;
}
.form-input:focus, .form-select:focus {
  border-color: #00d4aa;
  box-shadow: 0 0 0 3px rgba(0,212,170,0.12);
}
.form-input::placeholder { color: var(--text-muted, #4a5568); }
.form-select {
  appearance: none; cursor: pointer;
  background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%234a5568' stroke-width='2'%3E%3Cpolyline points='6 9 12 15 18 9'%3E%3C/polyline%3E%3C/svg%3E");
  background-repeat: no-repeat; background-position: right 14px center; padding-right: 36px;
}
.form-hint { font-size: 11px; color: var(--text-muted, #4a5568); margin-top: 4px; }

/* Empty */
.empty-state { text-align:center; padding:48px 20px; color:var(--text-muted,#4a5568); }
.loading-center { display:flex; align-items:center; justify-content:center; padding:48px; }

/* Page header */
.page-header {
  display: flex; align-items: center; justify-content: space-between;
  margin-bottom: 24px; flex-wrap: wrap; gap: 12px;
}
.page-title { font-size: 22px; font-weight: 700; letter-spacing: -0.3px; }
.page-actions { display: flex; gap: 8px; flex-wrap: wrap; align-items: center; }

/* Animate */
@keyframes fadeIn { from { opacity:0; transform:translateY(8px); } to { opacity:1; transform:translateY(0); } }
.animate-in { animation: fadeIn 0.3s ease-out; }

/* Mini sidebar */
.vault-layout { display: flex; gap: 0; min-height: 400px; }
.vault-sidebar {
  width: 200px; flex-shrink: 0;
  background: var(--bg-card, #1a1f2e);
  border: 1px solid var(--border, #2a3040);
  border-radius: 12px;
  padding: 12px 8px;
  margin-right: 20px;
  height: fit-content;
  position: sticky;
  top: 80px;
}
.vault-nav-item {
  display: flex; align-items: center; gap: 10px;
  padding: 10px 12px; border-radius: 8px;
  font-size: 13px; font-weight: 500;
  color: var(--text-secondary, #8892a8);
  cursor: pointer; transition: all 0.2s;
  border: none; background: transparent; width: 100%;
  text-align: left;
}
.vault-nav-item:hover {
  background: rgba(0,212,170,0.06);
  color: var(--text-primary, #e8edf5);
}
.vault-nav-item.active {
  background: rgba(0,212,170,0.1);
  color: var(--accent, #00d4aa);
}
.vault-nav-item svg { flex-shrink: 0; }
.vault-nav-divider { height: 1px; background: var(--border, #2a3040); margin: 8px 0; }
.vault-content { flex: 1; min-width: 0; }

@media (max-width: 768px) {
  .vault-layout { flex-direction: column; }
  .vault-sidebar {
    width: 100%; margin-right: 0; margin-bottom: 16px;
    display: flex; flex-direction: row; flex-wrap: wrap;
    gap: 4px; padding: 8px; position: static;
  }
  .vault-nav-item { width: auto; flex: 1; justify-content: center; font-size: 11px; padding: 8px 6px; }
}

/* Mobile */
@media (max-width: 768px) {
  .lock-row { grid-template-columns: 1fr; gap: 8px; padding: 14px; }
  .lock-actions { flex-direction: column; }
  .lock-actions .btn { width: 100%; padding: 12px; }
  .stat-grid { grid-template-columns: 1fr 1fr; }
  .balance-grid { grid-template-columns: 1fr; }
}
@media (max-width: 480px) {
  .stat-grid { grid-template-columns: 1fr; }
}
`;

// ─── DepositForm ─────────────────────────────────────────────────────────────
function DepositForm({ signer, provider, account, onSuccess, approveMode }) {
  const { t } = useLang();
  const [selectedToken, setSelectedToken] = useState(TOKEN_LIST[0]);
  const [amount,        setAmount]        = useState("");
  const [lockDays,      setLockDays]      = useState("");
  const [walletBalance, setWalletBalance] = useState(0n);
  const [allowance,     setAllowance]     = useState(0n);
  const [approving,     setApproving]     = useState(false);
  const [depositing,    setDepositing]    = useState(false);

  const fetchBal = useCallback(async () => {
    if (!account) return;
    try {
      const p = signer || provider;
      if (!p) return;
      const erc20 = new ethers.Contract(selectedToken.address, ERC20_ABI, p);
      const [bal, allow] = await Promise.all([
        erc20.balanceOf(account),
        erc20.allowance(account, VAULT_ADDRESS),
      ]);
      setWalletBalance(bal);
      setAllowance(allow);
    } catch {}
  }, [account, signer, provider, selectedToken]);

  useEffect(() => { fetchBal(); }, [fetchBal]);

  const rawAmount = (() => {
    try {
      if (!amount || isNaN(Number(amount))) return 0n;
      return ethers.parseUnits(amount, selectedToken.decimals);
    } catch { return 0n; }
  })();

  const unlockTs = (() => {
    const d = parseInt(lockDays);
    if (!d || d < 1) return 0;
    return Math.floor(Date.now() / 1000) + d * 86400 + 300;
  })();

  const needsApproval = rawAmount > 0n && allowance < rawAmount;
  const hasBalance    = rawAmount > 0n && walletBalance >= rawAmount;

  const previewDate = lockDays && Number(lockDays) >= 1
    ? new Date(Date.now() + Number(lockDays) * 86400000).toLocaleDateString("uz", {
        year: "numeric", month: "short", day: "numeric"
      })
    : null;

  const handleApprove = async () => {
    if (!signer) return toast.error(t("vaultWalletNotConnected"));
    setApproving(true);
    try {
      const erc20 = new ethers.Contract(selectedToken.address, ERC20_ABI, signer);
      // Approve miqdori: approveMode ga ko'ra (1, 10, 100, yoki cheksiz)
      let approveAmount;
      if (approveMode === "max") {
        approveAmount = ethers.MaxUint256;
      } else {
        approveAmount = rawAmount * BigInt(approveMode || 1);
      }
      toast.loading(t("vaultApproving"), { id: "approve" });
      const tx = await erc20.approve(VAULT_ADDRESS, approveAmount);
      await tx.wait();
      toast.success(t("vaultApproveSuccess"), { id: "approve" });
      await fetchBal();
    } catch (err) {
      console.error("Approve error:", err);
      const reason = err?.revert?.args?.[0] || err?.reason || err?.shortMessage || "Approve xato";
      toast.error(reason, { id: "approve" });
    } finally {
      setApproving(false);
    }
  };

  const handleDeposit = async () => {
    if (!signer) return toast.error(t("vaultWalletNotConnected"));
    if (rawAmount === 0n) return toast.error(t("vaultEnterAmount"));
    if (unlockTs === 0) return toast.error(t("vaultEnterDays"));
    if (!hasBalance) return toast.error(t("vaultInsufficientBalance"));
    setDepositing(true);
    try {
      const vault = new ethers.Contract(VAULT_ADDRESS, VAULT_ABI, signer);
      toast.loading(t("vaultLocking"), { id: "deposit" });
      const tx = await vault.deposit(selectedToken.address, rawAmount, unlockTs);
      await tx.wait();
      toast.success(`${selectedToken.symbol} ${lockDays} ${t("vaultLockSuccess")}`, { id: "deposit" });
      setAmount(""); setLockDays("");
      await fetchBal();
      if (onSuccess) onSuccess();
    } catch (err) {
      console.error("Deposit error:", err);
      const reason = err?.revert?.args?.[0]
        || err?.reason
        || err?.data?.message
        || err?.error?.message
        || err?.shortMessage
        || err?.message
        || t("vaultUnknownError");
      toast.error(reason, { id: "deposit" });
    } finally {
      setDepositing(false);
    }
  };

  return (
    <div>
      <div className="form-group">
        <label className="form-label">Token</label>
        <select className="form-select" value={selectedToken.symbol}
          onChange={e => {
            const tk = TOKEN_LIST.find(t => t.symbol === e.target.value);
            if (tk) setSelectedToken(tk);
          }}>
          {TOKEN_LIST.map(tk => (
            <option key={tk.symbol} value={tk.symbol}>{tk.symbol} — {tk.name}</option>
          ))}
        </select>
      </div>

      <div className="form-group">
        <label className="form-label">{t("vaultAmount")}</label>
        <input className="form-input" type="text" placeholder={t("vaultAmount") + ": 80000000"}
          value={amount} onChange={e => setAmount(e.target.value)} />
        <div className="form-hint">
          {t("vaultBalance") + ":"} {formatAmt(walletBalance, selectedToken.decimals)} {selectedToken.symbol}
          {walletBalance > 0n && (
            <span style={{ color: "var(--accent)", cursor: "pointer", marginLeft: 8 }}
              onClick={() => setAmount(ethers.formatUnits(walletBalance, selectedToken.decimals))}>
              MAX
            </span>
          )}
        </div>
      </div>

      <div className="form-group">
        <label className="form-label">{t("vaultNFTDays")}</label>
        <input className="form-input" type="number" min="1" placeholder="3650"
          value={lockDays} onChange={e => setLockDays(e.target.value)} />
        {previewDate && (
          <div className="form-hint">
            {t("vaultUnlockDate") + ":"} <span style={{ color: "var(--accent)" }}>{previewDate}</span>
          </div>
        )}
      </div>

      {rawAmount > 0n && !hasBalance && (
        <div style={{ padding: "10px 14px", background: "var(--danger-dim)", borderRadius: 8,
          color: "var(--danger)", fontSize: 13, marginBottom: 12, display: "flex", alignItems: "center", gap: 8 }}>
          <AlertTriangle size={14} /> {t("vaultInsufficientBalance")}
        </div>
      )}

      {needsApproval ? (
        <button className="btn btn-primary" style={{ width: "100%" }}
          onClick={handleApprove} disabled={approving || !hasBalance}>
          {approving ? <div className="spinner" style={{ width: 16, height: 16 }} /> : null}
          Approve {selectedToken.symbol}
        </button>
      ) : (
        <button className="btn btn-primary" style={{ width: "100%" }}
          onClick={handleDeposit}
          disabled={depositing || !hasBalance || rawAmount === 0n || unlockTs === 0}>
          {depositing
            ? <div className="spinner" style={{ width: 16, height: 16 }} />
            : <ArrowDownToLine size={16} />}
          {t("vaultLockBtn")}
        </button>
      )}
    </div>
  );
}

// ─── Asosiy komponent ────────────────────────────────────────────────────────
export default function Vault() {
  const { account, signer, provider } = useWeb3();
  const { t } = useLang();
  const isOwner = account?.toLowerCase() === OWNER_ADDRESS.toLowerCase();
  const location = useLocation();
  const navigate = useNavigate();
  const activeTab = new URLSearchParams(location.search).get('tab') || 'statistika';
  const setActiveTab = (tab) => navigate('/vault?tab=' + tab);

  const [loading,        setLoading]        = useState(true);
  const [balances,       setBalances]       = useState(null);
  const [locks,          setLocks]          = useState([]);
  const [nftLocks,       setNftLocks]       = useState([]);
  const [totalL,         setTotalL]         = useState(0);
  const [totalN,         setTotalN]         = useState(0);
  const [withdrawalAddr, setWithdrawalAddr] = useState("");
  const [txLoading,      setTxLoading]      = useState({});
  const [search,         setSearch]         = useState("");
  const [now,            setNow]            = useState(Math.floor(Date.now() / 1000));
  const [depositNFTId,   setDepositNFTId]   = useState("");
  const [depositNFTDays, setDepositNFTDays] = useState("");
  const [rebalanceOld,   setRebalanceOld]   = useState("");
  const [rebalanceNew,   setRebalanceNew]   = useState("");
  const [syncToken,      setSyncToken]      = useState("DUR");
  const [approveMode,    setApproveMode]    = useState("max");
  const [streams,        setStreams]         = useState([]);
  const [streamToken,    setStreamToken]     = useState("DUR");
  const [streamAmount,   setStreamAmount]    = useState("");
  const [streamStartDays,setStreamStartDays] = useState("");
  const [streamEndDays,  setStreamEndDays]   = useState("");
  const timerRef = useRef(null);

  // Live clock
  useEffect(() => {
    timerRef.current = setInterval(() => setNow(Math.floor(Date.now() / 1000)), 1000);
    return () => clearInterval(timerRef.current);
  }, []);

  // ── Ma'lumot yuklash ───────────────────────────────────────────────────────
  const load = useCallback(async () => {
    setLoading(true);
    try {
      // Asosiy RPC sinab ko'rish, xato bo'lsa backup
      let p;
      try {
        p = new ethers.JsonRpcProvider(RPC, undefined, { batchMaxCount: 1 });
        await p.getBlockNumber();
      } catch {
        p = new ethers.JsonRpcProvider(RPC_BACKUP, undefined, { batchMaxCount: 1 });
      }
      const vault = new ethers.Contract(VAULT_ADDRESS, VAULT_ABI, p);

      const [bals, totalLocks, totalNFTs] = await Promise.all([
        vault.getAllBalances(),
        vault.totalLocks(),
        vault.totalNFTLocks(),
      ]);
      setBalances(bals);
      setTotalL(Number(totalLocks));
      setTotalN(Number(totalNFTs));

      try { setWithdrawalAddr(await vault.getWithdrawalAddress()); } catch {}

      const lockArr = [];
      for (let i = 0; i < Number(totalLocks); i++) {
        for (let _try = 0; _try < 3; _try++) {
          try {
            const [lock, ti] = await Promise.all([vault.getLock(i), vault.getLockTimeInfo(i)]);
            lockArr.push({
              id: i,
              token: lock.token,
              amount: lock.amount,
              depositTime: lock.depositTime,
              unlockTimestamp: lock.unlockTimestamp,
              status: lock.status,
              ti,
            });
            break;
          } catch { if (_try < 2) await new Promise(r => setTimeout(r, 500)); }
        }
      }
      setLocks(lockArr);

      const nftArr = [];
      for (let i = 0; i < Number(totalNFTs); i++) {
        for (let _try = 0; _try < 3; _try++) {
          try {
            const [nft, ti] = await Promise.all([vault.getNFTLock(i), vault.getNFTLockTimeInfo(i)]);
            let usdcValue = null;
            // Faqat faol NFT lar uchun USDC qiymatini olish
            if (Number(nft.status) === 0) {
              try {
                usdcValue = await vault.getNFTValueUSDC(nft.tokenId);
              } catch {}
            }
            nftArr.push({
              id: i,
              tokenId: nft.tokenId,
              liquidity: nft.liquidity,
              depositTime: nft.depositTime,
              unlockTimestamp: nft.unlockTimestamp,
              status: nft.status,
              usdcValue,
              ti,
            });
            break;
          } catch { if (_try < 2) await new Promise(r => setTimeout(r, 500)); }
        }
      }
      setNftLocks(nftArr);
      try {
        const totalStreams = await vault.totalStreams();
        const streamArr = [];
        for (let i = 0; i < Number(totalStreams); i++) {
          for (let _try = 0; _try < 3; _try++) {
            try {
              const [stream, ti] = await Promise.all([vault.getStream(i), vault.getStreamTimeInfo(i)]);
              streamArr.push({
                id: i,
                token: stream.token,
                totalAmount: stream.totalAmount,
                withdrawnAmount: stream.withdrawnAmount,
                startTime: stream.startTime,
                endTime: stream.endTime,
                status: stream.status,
                ti,
              });
              break;
            } catch { if (_try < 2) await new Promise(r => setTimeout(r, 500)); }
          }
        }
        setStreams(streamArr);
      } catch {}
    } catch (err) {
      console.error(err);
      toast.error(t("vaultLoadError"));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  // ── Write vault ──────────────────────────────────────────────────────────────
  const getWriteVault = () => {
    if (!signer) { toast.error(t("vaultWalletNotConnected")); return null; }
    return new ethers.Contract(VAULT_ADDRESS, VAULT_ABI, signer);
  };

  const withTx = async (key, fn) => {
    setTxLoading(prev => ({ ...prev, [key]: true }));
    try { await fn(); load(); }
    catch (err) {
      console.error("TX error:", err);
      const reason = err?.revert?.args?.[0]
        || err?.reason
        || err?.data?.message
        || err?.error?.message
        || err?.shortMessage
        || err?.message
        || t("vaultUnknownError");
      toast.error(reason, { id: key });
    }
    finally { setTxLoading(prev => ({ ...prev, [key]: false })); }
  };

  const handleWithdraw = (lockId) => withTx(`w${lockId}`, async () => {
    const v = getWriteVault(); if (!v) return;
    toast.loading(t("vaultWithdrawing"), { id: `w${lockId}` });
    await (await v.withdraw(lockId)).wait();
    toast.success(t("vaultSuccess"), { id: `w${lockId}` });
  });

  const handleEmergency = (lockId) => withTx(`e${lockId}`, async () => {
    const v = getWriteVault(); if (!v) return;
    toast.loading("Emergency...", { id: `e${lockId}` });
    await (await v.emergencyWithdraw(lockId)).wait();
    toast.success(t("vaultSuccess"), { id: `e${lockId}` });
  });

  const handleWithdrawNFT = (id) => withTx(`wn${id}`, async () => {
    const v = getWriteVault(); if (!v) return;
    toast.loading(t("vaultNFTWithdrawing"), { id: `wn${id}` });
    await (await v.withdrawNFT(id)).wait();
    toast.success(t("vaultNFTWithdrawn"), { id: `wn${id}` });
  });

  const handleEmergencyNFT = (id) => withTx(`en${id}`, async () => {
    const v = getWriteVault(); if (!v) return;
    toast.loading("Emergency NFT...", { id: `en${id}` });
    await (await v.emergencyWithdrawNFT(id)).wait();
    toast.success(t("vaultSuccess"), { id: `en${id}` });
  });

  const handleDepositNFT = () => withTx("depositNFT", async () => {
    if (!depositNFTId || !depositNFTDays) throw new Error("NFT ID va kun soni kiriting");
    const v = getWriteVault(); if (!v) return;

    // Position Manager ga approve
    const posMgr = new ethers.Contract(POSITION_MANAGER, [
      "function approve(address to, uint256 tokenId)",
      "function getApproved(uint256 tokenId) view returns (address)",
    ], signer);

    const approved = await posMgr.getApproved(depositNFTId);
    if (approved.toLowerCase() !== VAULT_ADDRESS.toLowerCase()) {
      toast.loading(t("vaultNFTApproving"), { id: "depositNFT" });
      await (await posMgr.approve(VAULT_ADDRESS, depositNFTId)).wait();
    }

    const unlockTs = daysToUnlockTs(depositNFTDays);
    toast.loading(t("vaultNFTLocking"), { id: "depositNFT" });
    await (await v.depositNFT(depositNFTId, unlockTs)).wait();
    toast.success(`NFT ${depositNFTDays} ${t("vaultNFTLocked")}`, { id: "depositNFT" });
    setDepositNFTId(""); setDepositNFTDays("");
  });

  const handleRebalance = () => withTx("rebalance", async () => {
    if (!rebalanceOld || !rebalanceNew) throw new Error("Lock ID va NFT ID kiriting");
    const v = getWriteVault(); if (!v) return;

    // Yangi NFT ni approve qilish
    const posMgr = new ethers.Contract(POSITION_MANAGER, [
      "function approve(address to, uint256 tokenId)",
      "function getApproved(uint256 tokenId) view returns (address)",
    ], signer);

    const approved = await posMgr.getApproved(rebalanceNew);
    if (approved.toLowerCase() !== VAULT_ADDRESS.toLowerCase()) {
      toast.loading(t("vaultNFTApproving"), { id: "rebalance" });
      await (await posMgr.approve(VAULT_ADDRESS, rebalanceNew)).wait();
    }

    toast.loading(t("vaultRebalancing"), { id: "rebalance" });
    await (await v.rebalanceNFT(rebalanceOld, rebalanceNew)).wait();
    toast.success(t("vaultRebalanceSuccess"), { id: "rebalance" });
    setRebalanceOld(""); setRebalanceNew("");
  });

  const handleDepositStream = () => withTx("depositStream", async () => {
    if (!streamAmount || !streamEndDays) throw new Error("Token, miqdor va tugash kunini kiriting");
    const v = getWriteVault();
    if (!v) return;
    const token = TOKEN_LIST.find(t => t.symbol === streamToken);
    if (!token) throw new Error("Token topilmadi");

    const startD = Number(streamStartDays) || 0;   // bo'sh bo'lsa 0 = darhol boshlanadi
    const endD   = Number(streamEndDays);
    if (endD <= startD) throw new Error("Tugash kuni boshlanishdan katta bo'lishi kerak");
    if (endD - startD < 1) throw new Error("Vesting davri kamida 1 kun bo'lishi kerak");

    const amtRaw = ethers.parseUnits(streamAmount, token.decimals);
    const nowSec = Math.floor(Date.now() / 1000);
    // startD = 0 bo'lsa, startTs = now (kontrakt buni block.timestamp ga clamp qiladi)
    const startTs = startD === 0 ? nowSec : nowSec + startD * 86400;
    // endTs uchun +300 bufer (kontrakt end >= start + 1 kun talab qiladi)
    const endTs   = nowSec + endD * 86400 + 300;

    const erc20 = new ethers.Contract(token.address, ["function approve(address,uint256) external returns(bool)", "function allowance(address,address) view returns(uint256)"], signer);
    const allowance = await erc20.allowance(await signer.getAddress(), VAULT_ADDRESS);
    if (allowance < amtRaw) {
      toast.loading("Approve...", { id: "depositStream" });
      await (await erc20.approve(VAULT_ADDRESS, amtRaw)).wait();
    }
    toast.loading("Stream lock...", { id: "depositStream" });
    await (await v.depositStream(token.address, amtRaw, startTs, endTs)).wait();
    toast.success("Stream tuzildi!", { id: "depositStream" });
    setStreamAmount(""); setStreamStartDays(""); setStreamEndDays("");
  });

  const handleWithdrawStream = (id) => withTx("ws" + id, async () => {
    const v = getWriteVault();
    if (!v) return;
    await (await v.withdrawStream(id)).wait();
    toast.success("Stream yechildi!");
  });

  const handleEmergencyStream = (id) => withTx("es" + id, async () => {
    const v = getWriteVault();
    if (!v) return;
    await (await v.emergencyWithdrawStream(id)).wait();
    toast.success("Emergency stream yechildi!");
  });

  const handleSyncBalance = () => withTx("sync", async () => {
    const v = getWriteVault(); if (!v) return;
    const token = TOKENS[syncToken];
    toast.loading(t("vaultSyncing"), { id: "sync" });
    await (await v.syncBalance(token.address)).wait();
    toast.success(t("vaultSyncSuccess"), { id: "sync" });
  });

  // Barcha tokenlar uchun Vault ga berilgan approve larni bekor qilish (0 ga tushirish)
  const handleRevokeAll = () => withTx("revokeAll", async () => {
    if (!signer) { toast.error(t("vaultWalletNotConnected")); return; }
    const owner = await signer.getAddress();
    // Qaysi tokenlarda allowance > 0 ekanini aniqlash
    const toRevoke = [];
    for (const tk of TOKEN_LIST) {
      try {
        const erc20 = new ethers.Contract(tk.address, ERC20_ABI, signer);
        const allow = await erc20.allowance(owner, VAULT_ADDRESS);
        if (allow > 0n) toRevoke.push(tk);
      } catch {}
    }
    if (toRevoke.length === 0) {
      toast.success("Bekor qilinadigan approve yo'q", { id: "revokeAll" });
      return;
    }
    let done = 0;
    for (const tk of toRevoke) {
      toast.loading(`${tk.symbol} bekor qilinmoqda (${done + 1}/${toRevoke.length})...`, { id: "revokeAll" });
      const erc20 = new ethers.Contract(tk.address, ERC20_ABI, signer);
      await (await erc20.approve(VAULT_ADDRESS, 0)).wait();
      done++;
    }
    toast.success(`${done} ta approve bekor qilindi`, { id: "revokeAll" });
  });

  // ── Countdown ──────────────────────────────────────────────────────────────
  const emergencyCountdown = (secs) => {
    const s = Number(secs);
    if (s <= 0) return t("vaultReady");
    const h = Math.floor(s / 3600);
    const m = Math.floor((s % 3600) / 60);
    const sec = s % 60;
    if (h > 0) return h + "s " + m + "d " + sec + "sek";
    return m + "d " + sec + "sek";
  };

  const countdown = (unlockTs, status) => {
    if (Number(status) !== 0) return "—";
    const diff = Number(unlockTs) - now;
    if (diff <= 0) return "✓ Ochilgan";
    const d = Math.floor(diff / 86400);
    const h = Math.floor((diff % 86400) / 3600);
    const m = Math.floor((diff % 3600) / 60);
    const s = diff % 60;
    if (d > 0) return `${d}k ${h}s ${m}d`;
    if (h > 0) return `${h}s ${m}d ${s}`;
    return `${m}d ${s}`;
  };

  const activeLocks    = locks.filter(l => Number(l.status) === 0);
  const historyLocks   = locks.filter(l => Number(l.status) !== 0);
  const activeNFTLocks = nftLocks.filter(n => Number(n.status) === 0);
  const historyNFTLocks = nftLocks.filter(n => Number(n.status) !== 0);

  // ── Filter ──────────────────────────────────────────────────────────────────
  const filteredLocks = activeLocks.filter(l => {
    if (search) {
      const token = TOKEN_BY_ADDR[l.token?.toLowerCase()];
      const sym   = token?.symbol?.toLowerCase() || "";
      const q     = search.toLowerCase();
      if (!String(l.id).includes(q) && !sym.includes(q)) return false;
    }
    return true;
  });

  // ── Render ────────────────────────────────────────────────────────────────────
  if (loading) {
    return <><style>{vaultStyles}</style><div className="loading-center"><div className="spinner" style={{width:28,height:28}} /></div></>;
  }

  const renderStatistika = () => (
    <>
      <div className="stat-grid" style={{marginBottom:24}}>
        <div className="stat-card"><div className="stat-label">{t("vaultActiveLocks")}</div><div className="stat-value accent">{activeLocks.length}</div></div>
        <div className="stat-card"><div className="stat-label">{t("vaultFaolNFTLocks")}</div><div className="stat-value accent">{activeNFTLocks.length}</div></div>
        <div className="stat-card"><div className="stat-label">{t("vaultTokenHistory")}</div><div className="stat-value">{historyLocks.length + historyNFTLocks.length}</div></div>
        <div className="stat-card">
          <div className="stat-label">{t("vaultTitle")}</div>
          <div style={{fontFamily:"var(--font-mono)",fontSize:10,color:"var(--text-secondary)",marginTop:4,wordBreak:"break-all"}}>
            {VAULT_ADDRESS.slice(0,10)}...{VAULT_ADDRESS.slice(-6)}
          </div>
        </div>
      </div>
      {balances && (
        <div className="card" style={{marginBottom:24}}>
          <div className="card-header">
            <div className="card-title">
              <Shield size={16} style={{display:"inline",marginRight:8,verticalAlign:-2}} />
              {t("vaultBalances")}
            </div>
          </div>
          <div className="balance-grid">
            {TOKEN_LIST.filter(tk => isOwner || tk.symbol === "DUR").map(tk => {
              const bal = tk.symbol === "DUR" ? balances.durBalance
                        : tk.symbol === "USDC" ? balances.usdcBalance
                        : tk.symbol === "WBTC" ? balances.wbtcBalance : 0n;
              return (
                <div className="balance-item" key={tk.symbol}>
                  <span className={"token-badge " + tk.symbol.toLowerCase()}>{tk.symbol}</span>
                  <span className="balance-amount">{formatAmt(bal, tk.decimals)}</span>
                </div>
              );
            })}
          </div>
        </div>
      )}
      <div className="card" style={{borderColor:"rgba(0,212,170,0.15)"}}>
        <div style={{display:"flex",gap:12,alignItems:"flex-start"}}>
          <Lock size={18} style={{color:"var(--accent)",flexShrink:0,marginTop:2}} />
          <p style={{fontSize:13,color:"var(--text-secondary)",lineHeight:1.6}}>
            {t("vaultInfo")}
            {withdrawalAddr && (
              <> {" "}
                <strong style={{color:"var(--accent)",fontFamily:"var(--font-mono)",fontSize:11}}>
                  {withdrawalAddr.slice(0,8)}...{withdrawalAddr.slice(-6)}
                </strong> {t("vaultWithdrawalAddr")}
              </>
            )}
          </p>
        </div>
      </div>
    </>
  );

  const renderLocklar = () => (
    <>
      <div className="page-header" style={{marginBottom:16}}>
        <h2 style={{fontSize:16,fontWeight:700}}>
          {t("vaultActiveLocksList")}
          <span style={{marginLeft:8,fontSize:12,color:"var(--text-muted)",fontFamily:"var(--font-mono)",fontWeight:400}}>
            {filteredLocks.length}{t("vaultCount")}
          </span>
        </h2>
        <div className="page-actions">
          <div style={{position:"relative"}}>
            <Search size={13} style={{position:"absolute",left:10,top:"50%",transform:"translateY(-50%)",color:"var(--text-muted)"}} />
            <input type="text" className="form-input" placeholder={t("vaultSearch")}
              value={search} onChange={e => setSearch(e.target.value)}
              style={{paddingLeft:32,width:160,height:36,fontSize:12}} />
          </div>
        </div>
      </div>
      {filteredLocks.length === 0 ? (
        <div className="empty-state"><Lock size={40} /><p>{t("vaultNoLocks")}</p></div>
      ) : (
        <div className="lock-list">
          {filteredLocks
            .filter(lock => {
              if (isOwner) return true;
              const token = TOKEN_BY_ADDR[lock.token?.toLowerCase()];
              return token?.symbol === "DUR";
            })
            .map(lock => {
            const token = TOKEN_BY_ADDR[lock.token?.toLowerCase()];
            const sym = token?.symbol || "???";
            const dec = token?.decimals || 18;
            const st = Number(lock.status);
            const ti = lock.ti;
            const isActive = st === 0;
            const isUnlocked = now >= Number(lock.unlockTimestamp);
            const isEmergencyReady = now >= Number(lock.unlockTimestamp) + 48 * 3600;
            const cd = countdown(lock.unlockTimestamp, st);
            const statusLabel = st === 0 ? (isUnlocked ? t("vaultUnlocked") : t("vaultActive")) : st === 1 ? t("vaultWithdrawn") : t("vaultEmergency");
            const statusClass = st === 0 ? (isUnlocked ? "unlocked" : "active") : st === 1 ? "withdrawn" : "emergency";
            return (
              <div key={lock.id} className={"lock-row" + (isActive && isUnlocked ? " unlocked pulse-glow" : "")}>
                <div className="lock-id">#{lock.id}</div>
                <div>
                  <span className={"token-badge " + sym.toLowerCase()}>{sym}</span>
                  <span className="lock-amount" style={{marginLeft:10}}>{formatAmt(lock.amount, dec)}</span>
                </div>
                <div className="lock-time">
                  <div style={{fontSize:11,color:"var(--text-muted)",marginBottom:2}}>{t("vaultUnlockDate")}</div>
                  <div>{formatDate(lock.unlockTimestamp)}</div>
                </div>
                <div>
                  <div className={"lock-countdown " + (isActive && isUnlocked ? "expired" : "active")}>{cd}</div>
                  {isActive && isUnlocked && !isEmergencyReady && ti && (
                    <div style={{fontSize:10,color:"var(--warning)",marginTop:2}}>
                      {t("vaultEmergencyIn")} {emergencyCountdown(ti.secondsToEmergency)}
                    </div>
                  )}
                  {isActive && isEmergencyReady && (
                    <div style={{fontSize:10,color:"#ef4444",marginTop:2}}>{t("vaultEmergencyReady")}</div>
                  )}
                </div>
                <div>
                  <span className={"status-badge " + statusClass}>
                    <span className="status-dot" />{statusLabel}
                  </span>
                </div>
                <div className="lock-actions">
                  {isActive && isOwner && isUnlocked && (
                    <button className="btn btn-primary btn-sm" onClick={() => handleWithdraw(lock.id)} disabled={!!txLoading["w" + lock.id]}>
                      {txLoading["w" + lock.id] ? <div className="spinner" style={{width:14,height:14}} /> : <Unlock size={13} />}
                      Yechish
                    </button>
                  )}
                  {isActive && isOwner && isEmergencyReady && (
                    <button className="btn btn-danger btn-sm" onClick={() => handleEmergency(lock.id)} disabled={!!txLoading["e" + lock.id]}>
                      {txLoading["e" + lock.id] ? <div className="spinner" style={{width:14,height:14}} /> : <Zap size={13} />}
                      Emergency
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </>
  );

  const renderNFT = () => (
    <>
      <h2 style={{fontSize:16,fontWeight:700,marginBottom:16}}>
        {t("vaultFaolNFTLocks")}
        <span style={{marginLeft:8,fontSize:12,color:"var(--text-muted)",fontFamily:"var(--font-mono)",fontWeight:400}}>
          {activeNFTLocks.length}{t("vaultCount")}
        </span>
      </h2>
      {activeNFTLocks.length === 0 ? (
        <div className="empty-state"><Lock size={40} /><p>{t("vaultFaolNFTLockYoq")}</p></div>
      ) : (
        <div className="lock-list">
          {activeNFTLocks.map(nft => {
            const st = Number(nft.status);
            const isUnlocked = now >= Number(nft.unlockTimestamp);
            const isEmergencyReady = now >= Number(nft.unlockTimestamp) + 48 * 3600;
            const statusLabel = st === 0 ? (isUnlocked ? t("vaultUnlocked") : t("vaultActive")) : st === 1 ? t("vaultWithdrawn") : st === 2 ? t("vaultEmergency") : t("vaultRebalanced");
            const statusClass = st === 0 ? (isUnlocked ? "unlocked" : "active") : st === 1 ? "withdrawn" : "emergency";
            return (
              <div key={nft.id} className={"lock-row" + (st === 0 && isUnlocked ? " unlocked pulse-glow" : "")}>
                <div className="lock-id">#{nft.id}</div>
                <div>
                  <span className="token-badge" style={{background:"rgba(99,102,241,0.12)",color:"#818cf8"}}>
                    DUR/USDC NFT
                  </span>
                  <span style={{marginLeft:10,fontSize:12,color:"var(--text-secondary)",fontFamily:"var(--font-mono)"}}>
                    #{Number(nft.tokenId)}
                  </span>
                </div>
                <div className="lock-time">
                  <div style={{fontSize:11,color:"var(--text-muted)",marginBottom:2}}>{t("vaultUnlockDate")}</div>
                  <div>{formatDate(nft.unlockTimestamp)}</div>
                </div>
                <div>
                  <div className={"lock-countdown " + (st === 0 && isUnlocked ? "expired" : "active")}>
                    {countdown(nft.unlockTimestamp, st)}
                  </div>
                  {st === 0 && isUnlocked && !isEmergencyReady && (
                    <div style={{fontSize:10,color:"var(--warning)",marginTop:2}}>
                      {t("vaultEmergencyIn")} {emergencyCountdown(Math.max(0, Number(nft.unlockTimestamp) + 48*3600 - now))}
                    </div>
                  )}
                  {st === 0 && isEmergencyReady && (
                    <div style={{fontSize:10,color:"#ef4444",marginTop:2}}>{t("vaultEmergencyReady")}</div>
                  )}
                </div>
                <div>
                  <span className={"status-badge " + statusClass}>
                    <span className="status-dot" />{statusLabel}
                  </span>
                </div>
                <div className="lock-actions">
                  {st === 0 && isOwner && (
                    <button className="btn btn-ghost btn-sm" onClick={() => {
                      setRebalanceOld(String(nft.id));
                      setActiveTab("sozlamalar");
                      toast.success(`Lock #${nft.id} ${t("vaultRebalanceSelected")}`);
                    }}>
                      <RefreshCw size={13} /> Rebalance
                    </button>
                  )}
                  {st === 0 && isOwner && isUnlocked && (
                    <button className="btn btn-primary btn-sm" onClick={() => handleWithdrawNFT(nft.id)}>
                      <Unlock size={13} /> Yechish
                    </button>
                  )}
                  {st === 0 && isOwner && isEmergencyReady && (
                    <button className="btn btn-danger btn-sm" onClick={() => handleEmergencyNFT(nft.id)}>
                      <Zap size={13} /> Emergency
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </>
  );

  const renderStream = () => (
    <>
      <div className="page-header" style={{marginBottom:16}}>
        <h2 style={{fontSize:16,fontWeight:700}}>Streamlar</h2>
      </div>
      {streams.filter(s => Number(s.status) === 0).length === 0 ? (
        <div className="empty-state"><Zap size={40}/><p>Faol stream yoq</p></div>
      ) : (
        <div className="lock-list">
          {streams.filter(s => Number(s.status) === 0).map(s => {
            const token = TOKEN_BY_ADDR[s.token?.toLowerCase()];
            const sym = token?.symbol || "???";
            const dec = token?.decimals || 18;
            const withdrawable = s.ti?.withdrawable || 0n;
            const isEmergencyReady = s.ti?.isEmergencyReady || false;
            return (
              <div key={s.id} className="lock-row">
                <div className="lock-id">#{s.id}</div>
                <div>
                  <span className={"token-badge " + sym.toLowerCase()}>{sym}</span>
                  <span className="lock-amount" style={{marginLeft:10}}>{formatAmt(s.totalAmount, dec)}</span>
                </div>
                <div className="lock-time">
                  <div style={{fontSize:11,color:"var(--text-muted)",marginBottom:2}}>Boshlanish</div>
                  <div>{formatDate(s.startTime)}</div>
                  <div style={{fontSize:11,color:"var(--text-muted)",marginBottom:2,marginTop:6}}>Tugash</div>
                  <div>{formatDate(s.endTime)}</div>
                </div>
                <div>
                  <div style={{fontSize:11,color:"var(--text-muted)"}}>Qolgan</div>
                  <div style={{fontSize:13,color:"var(--text-primary)",fontFamily:"var(--font-mono)"}}>{formatAmt(BigInt(s.totalAmount) - BigInt(s.withdrawnAmount), dec)} {sym}</div>
                  <div style={{fontSize:11,color:"var(--text-muted)",marginTop:6}}>Yechish mumkin</div>
                  <div style={{fontSize:13,color:"var(--success)"}}>{formatAmt(withdrawable, dec)} {sym}</div>
                  {!isEmergencyReady && s.ti && Number(s.ti.secondsToEmergency) > 0 && (
                    <div style={{fontSize:10,color:"var(--warning)",marginTop:6}}>
                      Emergency: {emergencyCountdown(s.ti.secondsToEmergency)}
                    </div>
                  )}
                  {isEmergencyReady && (
                    <div style={{fontSize:10,color:"#ef4444",marginTop:6}}>Emergency tayyor</div>
                  )}
                </div>
                <div className="lock-actions">
                  {isOwner && BigInt(withdrawable) > 0n && (
                    <button className="btn btn-primary btn-sm" onClick={() => handleWithdrawStream(s.id)} disabled={!!txLoading["ws"+s.id]}>
                      {txLoading["ws"+s.id] ? <div className="spinner" style={{width:14,height:14}}/> : <Unlock size={13}/>}
                      Yechish
                    </button>
                  )}
                  {isOwner && isEmergencyReady && (
                    <button className="btn btn-danger btn-sm" onClick={() => handleEmergencyStream(s.id)} disabled={!!txLoading["es"+s.id]}>
                      {txLoading["es"+s.id] ? <div className="spinner" style={{width:14,height:14}}/> : <Zap size={13}/>}
                      Emergency
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
      {isOwner && (
        <div className="card" style={{marginTop:24}}>
          <div className="card-title" style={{marginBottom:16}}>Yangi stream tuzish</div>
          <div style={{display:"flex",gap:8,flexWrap:"wrap",alignItems:"flex-end"}}>
            <select className="form-input" style={{width:120}} value={streamToken} onChange={e => setStreamToken(e.target.value)}>
              {TOKEN_LIST.map(t => <option key={t.symbol} value={t.symbol}>{t.symbol}</option>)}
            </select>
            <input className="input" type="number" placeholder="Miqdor" value={streamAmount} onChange={e => setStreamAmount(e.target.value)} style={{width:140}} />
            <input className="input" type="number" min="0" placeholder="Boshlanish (kun, cliff)" value={streamStartDays} onChange={e => setStreamStartDays(e.target.value)} style={{width:160}} />
            <input className="input" type="number" min="1" placeholder="Tugash (kun)" value={streamEndDays} onChange={e => setStreamEndDays(e.target.value)} style={{width:120}} />
            <button className="btn btn-primary" onClick={handleDepositStream} disabled={!!txLoading.depositStream}>
              {txLoading.depositStream ? <div className="spinner" style={{width:14,height:14}}/> : <Lock size={13}/>}
              Stream tuzish
            </button>
          </div>
          <div style={{fontSize:11,color:"var(--text-muted)",marginTop:8,lineHeight:1.5}}>
            Boshlanish (cliff) — necha kundan keyin ochila boshlasin (0 yoki bo'sh = darhol).
            Tugash — necha kunda to'liq ochilsin. Ikkalasi orasida chiziqli ochiladi.
          </div>
          {streamEndDays && Number(streamEndDays) >= 1 && (
            <div style={{fontSize:12,color:"var(--text-muted)",marginTop:6}}>
              {(Number(streamStartDays) || 0) > 0 && (
                <>Cliff: {new Date(Date.now() + (Number(streamStartDays)||0)*86400000).toLocaleDateString("uz")} gacha 0%, keyin ochila boshlaydi. <br/></>
              )}
              To'liq ochilish: {new Date(Date.now() + Number(streamEndDays)*86400000).toLocaleDateString("uz")}
            </div>
          )}
        </div>
      )}
    </>
  );

  const renderKiritish = () => (
    <div style={{maxWidth:520}}>
      <h2 style={{fontSize:16,fontWeight:700,marginBottom:20}}>{t("vaultDepositToken")}</h2>
      <div className="card" style={{marginBottom:24}}>
        <DepositForm signer={signer} provider={provider} account={account} onSuccess={load} approveMode={approveMode} />
      </div>
      <h2 style={{fontSize:16,fontWeight:700,marginBottom:16}}>{t("vaultDepositNFT")}</h2>
      <div className="card">
        <div className="form-group">
          <label className="form-label">NFT Token ID</label>
          <input className="form-input" type="number" placeholder="12345"
            value={depositNFTId} onChange={e => setDepositNFTId(e.target.value)} />
        </div>
        <div className="form-group">
          <label className="form-label">{t("vaultNFTDays")}</label>
          <input className="form-input" type="number" min="1" placeholder="365"
            value={depositNFTDays} onChange={e => setDepositNFTDays(e.target.value)} />
          {depositNFTDays && Number(depositNFTDays) >= 1 && (
            <div className="form-hint">
              Unlock: <span style={{color:"var(--accent)"}}>
                {new Date(Date.now() + Number(depositNFTDays)*86400000).toLocaleDateString("uz")}
              </span>
            </div>
          )}
        </div>
        <button className="btn btn-primary" style={{width:"100%"}}
          onClick={handleDepositNFT} disabled={txLoading.depositNFT}>
          {txLoading.depositNFT
            ? <div className="spinner" style={{width:16,height:16}} />
            : <ArrowDownToLine size={16} />}
          {t("vaultDepositNFT")}
        </button>
      </div>
    </div>
  );

  const APPROVE_MODES = [
    { id: "1",   label: "1 × 1" },
    { id: "10",  label: "1 × 10" },
    { id: "100", label: "1 × 100" },
    { id: "max", label: "Cheksiz" },
  ];

  const renderSozlamalar = () => (
    <div style={{maxWidth:600}}>
      <h2 style={{fontSize:16,fontWeight:700,marginBottom:20}}>{t("vaultSettings") || "Sozlamalar"}</h2>

      {/* Approve miqdori sozlamasi */}
      <div className="card" style={{marginBottom:16}}>
        <div className="card-title" style={{marginBottom:8}}>Approve miqdori</div>
        <p style={{fontSize:12,color:"var(--text-muted)",marginBottom:14,lineHeight:1.5}}>
          Token kiritishda Vault ga beriladigan ruxsat miqdori. Kiritilgan miqdorga ko'paytiriladi
          (masalan 100 DUR × 10 = 1000 DUR), yoki cheksiz.
        </p>
        <div style={{display:"flex",gap:8,flexWrap:"wrap"}}>
          {APPROVE_MODES.map(m => (
            <button key={m.id}
              className={"btn btn-sm" + (approveMode === m.id ? " btn-primary" : " btn-ghost")}
              onClick={() => setApproveMode(m.id)}>
              {m.label}
            </button>
          ))}
        </div>
        <div style={{fontSize:11,color:"var(--text-muted)",marginTop:10}}>
          Tanlangan: <span style={{color:"var(--accent)",fontWeight:600}}>
            {APPROVE_MODES.find(m => m.id === approveMode)?.label}
          </span>
        </div>
      </div>

      {/* Barcha approve larni bekor qilish */}
      <div className="card" style={{marginBottom:16,borderColor:"rgba(239,68,68,0.2)"}}>
        <div className="card-title" style={{marginBottom:8}}>Approve larni bekor qilish</div>
        <p style={{fontSize:12,color:"var(--text-muted)",marginBottom:14,lineHeight:1.5}}>
          Barcha tokenlar (DUR, USDC, WBTC) uchun Vault ga berilgan ruxsatni 0 ga tushiradi.
          Faqat ruxsat berilgan tokenlar uchun tranzaksiya yuboriladi.
        </p>
        <button className="btn btn-danger" style={{width:"100%"}}
          onClick={handleRevokeAll} disabled={txLoading.revokeAll}>
          {txLoading.revokeAll
            ? <div className="spinner" style={{width:14,height:14}} />
            : <AlertTriangle size={14} />}
          Barcha approve larni bekor qilish
        </button>
      </div>

      <div className="card" style={{marginBottom:16}}>
        <div className="card-title" style={{marginBottom:16}}>{t("vaultSyncBalance")}</div>
        <div style={{display:"flex",gap:8}}>
          <select className="form-select" style={{flex:1}} value={syncToken} onChange={e => setSyncToken(e.target.value)}>
            {TOKEN_LIST.map(t => <option key={t.symbol} value={t.symbol}>{t.symbol}</option>)}
          </select>
          <button className="btn btn-ghost" onClick={handleSyncBalance} disabled={txLoading.sync}>
            <RefreshCw size={13} /> Sinxronlash
          </button>
        </div>
      </div>
      <div className="card">
        <div className="card-title" style={{marginBottom:16}}>{t("vaultNFTRebalance")}</div>
        <div className="form-group">
          <label className="form-label">{t("vaultOldNFTLockId")}</label>
          <input className="form-input" type="number" placeholder="0"
            value={rebalanceOld} onChange={e => setRebalanceOld(e.target.value)}
            style={{ color: 'var(--text-primary)', background: 'var(--bg-secondary)' }} />
          <div className="form-hint">{t("vaultOldNFTHint")}</div>
        </div>
        <div className="form-group">
          <label className="form-label">{t("vaultNewNFTTokenId")}</label>
          <input className="form-input" type="number" placeholder="99999"
            value={rebalanceNew} onChange={e => setRebalanceNew(e.target.value)}
            style={{ color: 'var(--text-primary)', background: 'var(--bg-secondary)' }} />
          <div className="form-hint">Yangi yaratilgan LP pozitsiya ID si</div>
        </div>
        <button className="btn btn-primary" style={{width:"100%"}}
          onClick={handleRebalance} disabled={txLoading.rebalance}>
          Rebalance
        </button>
      </div>
    </div>
  );

  const renderTarix = () => {
    const finishedStreams = streams.filter(s => Number(s.status) !== 0);

    if (historyLocks.length === 0 && historyNFTLocks.length === 0 && finishedStreams.length === 0) {
      return (
        <div className="empty-state" style={{padding: 48}}>
          <Search size={40} />
          <p style={{color: "var(--text-muted)", marginTop: 16}}>
            Tarixda hozircha yozuvlar yo'q.
          </p>
          <p style={{color: "var(--text-secondary)", fontSize: 13, marginTop: 8, textAlign: 'center', lineHeight: 1.6}}>
            Token lock, NFT lock yoki Stream muddati tugagach<br/>
            (yoki emergency qilinganda) tarixga tushadi.
          </p>
        </div>
      );
    }

    return (
      <>
        {/* Token tarix */}
        {historyLocks.length > 0 && (
          <>
            <h2 style={{fontSize:16,fontWeight:700,marginBottom:16}}>
              {t("vaultTokenHistory")}
              <span style={{marginLeft:8,fontSize:12,color:"var(--text-muted)",fontFamily:"var(--font-mono)",fontWeight:400}}>
                {historyLocks.length}{t("vaultCount")}
              </span>
            </h2>
            <div className="lock-list" style={{marginBottom:32}}>
              {historyLocks.map(lock => {
                const token = TOKEN_BY_ADDR[lock.token?.toLowerCase()];
                const sym = token?.symbol || "???";
                const dec = token?.decimals || 18;
                const st = Number(lock.status);
                const statusLabel = st === 1 ? "Yechildi" : "Emergency";
                const statusClass = st === 1 ? "withdrawn" : "emergency";
                return (
                  <div key={lock.id} className="lock-row" style={{opacity:0.75}}>
                    <div className="lock-id">#{lock.id}</div>
                    <div>
                      <span className={"token-badge " + sym.toLowerCase()}>{sym}</span>
                      <span className="lock-amount" style={{marginLeft:10}}>{formatAmt(lock.amount, dec)}</span>
                    </div>
                    <div className="lock-time">
                      <div style={{fontSize:11,color:"var(--text-muted)",marginBottom:2}}>{t("vaultDeposited")}</div>
                      <div>{formatDate(lock.depositTime)}</div>
                    </div>
                    <div className="lock-time">
                      <div style={{fontSize:11,color:"var(--text-muted)",marginBottom:2}}>{t("vaultUnlockDate")}</div>
                      <div>{formatDate(lock.unlockTimestamp)}</div>
                    </div>
                    <div>
                      <span className={"status-badge " + statusClass}>
                        <span className="status-dot" />{statusLabel}
                      </span>
                    </div>
                    <div />
                  </div>
                );
              })}
            </div>
          </>
        )}

        {/* NFT tarix */}
        {historyNFTLocks.length > 0 && (
          <>
            <h2 style={{fontSize:16,fontWeight:700,marginBottom:16}}>
              {t("vaultNFTHistory")}
              <span style={{marginLeft:8,fontSize:12,color:"var(--text-muted)",fontFamily:"var(--font-mono)",fontWeight:400}}>
                {historyNFTLocks.length}{t("vaultCount")}
              </span>
            </h2>
            <div className="lock-list">
              {historyNFTLocks.map(nft => {
                const st = Number(nft.status);
                const statusLabel = st === 1 ? "Yechildi" : st === 2 ? "Rebalanced" : "Emergency";
                const statusClass = st === 1 ? "withdrawn" : st === 2 ? "emergency" : "emergency";
                return (
                  <div key={nft.id} className="lock-row" style={{opacity:0.75}}>
                    <div className="lock-id">#{nft.id}</div>
                    <div>
                      <span className="token-badge" style={{background:"rgba(99,102,241,0.12)",color:"#818cf8"}}>
                        DUR/USDC NFT
                      </span>
                      <span style={{marginLeft:10,fontSize:12,color:"var(--text-secondary)",fontFamily:"var(--font-mono)"}}>
                        #{Number(nft.tokenId)}
                      </span>
                    </div>
                    <div className="lock-time">
                      <div style={{fontSize:11,color:"var(--text-muted)",marginBottom:2}}>{t("vaultDeposited")}</div>
                      <div>{formatDate(nft.depositTime)}</div>
                    </div>
                    <div className="lock-time">
                      <div style={{fontSize:11,color:"var(--text-muted)",marginBottom:2}}>{t("vaultUnlockDate")}</div>
                      <div>{formatDate(nft.unlockTimestamp)}</div>
                    </div>
                    <div>
                      <span className={"status-badge " + statusClass}>
                        <span className="status-dot" />{statusLabel}
                      </span>
                    </div>
                    {(st === 1 || st === 3) ? (
                      <div style={{fontSize:11,lineHeight:1.5}}>
                        <div style={{color:"var(--warning)",marginBottom:4}}>
                          NFT withdrawal manzilida. MetaMask ga import qiling:
                        </div>
                        <div style={{display:"flex",alignItems:"center",gap:6,marginBottom:3}}>
                          <span style={{color:"var(--text-muted)",minWidth:60}}>Kontrakt:</span>
                          <span style={{fontFamily:"var(--font-mono)",color:"var(--text-secondary)"}}>{POSITION_MANAGER.slice(0,8)}...{POSITION_MANAGER.slice(-6)}</span>
                          <button onClick={() => { navigator.clipboard.writeText(POSITION_MANAGER); toast.success("Kontrakt nusxalandi"); }} style={{background:"none",border:"none",cursor:"pointer",color:"var(--text-muted)",padding:0,display:"flex"}} title="Nusxalash"><Copy size={13} /></button>
                        </div>
                        <div style={{display:"flex",alignItems:"center",gap:6}}>
                          <span style={{color:"var(--text-muted)",minWidth:60}}>Token ID:</span>
                          <span style={{fontFamily:"var(--font-mono)",color:"var(--text-secondary)"}}>{Number(nft.tokenId)}</span>
                          <button onClick={() => { navigator.clipboard.writeText(String(Number(nft.tokenId))); toast.success("Token ID nusxalandi"); }} style={{background:"none",border:"none",cursor:"pointer",color:"var(--text-muted)",padding:0,display:"flex"}} title="Nusxalash"><Copy size={13} /></button>
                        </div>
                      </div>
                    ) : <div />}
                  </div>
                );
              })}
            </div>
          </>
        )}

        {/* Stream tarix */}
        {finishedStreams.length > 0 && (
          <>
            <h2 style={{fontSize:16,fontWeight:700,marginBottom:16}}>
              Stream tarixi
              <span style={{marginLeft:8,fontSize:12,color:"var(--text-muted)",fontFamily:"var(--font-mono)",fontWeight:400}}>
                {finishedStreams.length}
              </span>
            </h2>
            <div className="lock-list">
              {finishedStreams.map(s => {
                const token = TOKEN_BY_ADDR[s.token?.toLowerCase()];
                const sym = token?.symbol || "???";
                const dec = token?.decimals || 18;
                const st = Number(s.status);
                const statusLabel = st === 1 ? "Tugagan" : "Emergency";
                return (
                  <div key={`s-${s.id}`} className="lock-row" style={{opacity:0.75}}>
                    <div className="lock-id">S#{s.id}</div>
                    <div>
                      <span className={"token-badge " + sym.toLowerCase()}>{sym}</span>
                      <span className="lock-amount" style={{marginLeft:10}}>{formatAmt(s.totalAmount, dec)}</span>
                    </div>
                    <div className="lock-time">
                      <div style={{fontSize:11,color:"var(--text-muted)",marginBottom:2}}>Boshlangan</div>
                      <div>{formatDate(s.startTime)}</div>
                    </div>
                    <div className="lock-time">
                      <div style={{fontSize:11,color:"var(--text-muted)",marginBottom:2}}>Tugagan</div>
                      <div>{formatDate(s.endTime)}</div>
                    </div>
                    <div>
                      <span className={"status-badge " + (st === 1 ? "withdrawn" : "emergency")}>
                        <span className="status-dot" />{statusLabel}
                      </span>
                    </div>
                    <div />
                  </div>
                );
              })}
            </div>
          </>
        )}
      </>
    );
  };

  // ── Oddiy foydalanuvchi view ─────────────────────────────────────────────────
  if (!isOwner) {
    const publicLocks = locks.filter(l => {
      const token = TOKEN_BY_ADDR[l.token?.toLowerCase()];
      return token?.symbol === "DUR";
    });
    const activePub = publicLocks.filter(l => Number(l.status) === 0);

    return (
      <>
        <style>{vaultStyles}</style>
        <div className="animate-in vault-wrap">
          <div className="page-header">
            <h1 className="page-title">{t("vaultTitle")}</h1>
            <button className="btn btn-ghost btn-sm" onClick={load}>
              <RefreshCw size={14} /> {t("vaultRefresh")}
            </button>
          </div>

          {/* Statistika */}
          <div className="stat-grid" style={{marginBottom:24}}>
            <div className="stat-card">
              <div className="stat-label">{t("vaultActiveLocks")}</div>
              <div className="stat-value accent">{activePub.length}</div>
            </div>
            <div className="stat-card">
              <div className="stat-label">{t("vaultNFTLocks")}</div>
              <div className="stat-value">{activeNFTLocks.length}</div>
            </div>
          </div>

          {/* Balanslar - faqat DUR */}
          {balances && (
            <div className="card" style={{marginBottom:24}}>
              <div className="card-header">
                <div className="card-title">
                  <Shield size={16} style={{display:"inline",marginRight:8,verticalAlign:-2}} />
                  {t("vaultBalances")}
                </div>
              </div>
              <div className="balance-grid">
                {[TOKENS.DUR].map(tk => {
                  const bal = balances.durBalance;
                  return (
                    <div className="balance-item" key={tk.symbol}>
                      <span className={"token-badge " + tk.symbol.toLowerCase()}>{tk.symbol}</span>
                      <span className="balance-amount">{formatAmt(bal, tk.decimals)}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Info */}
          <div className="card" style={{borderColor:"rgba(0,212,170,0.15)",marginBottom:24}}>
            <div style={{display:"flex",gap:12,alignItems:"flex-start"}}>
              <Lock size={18} style={{color:"var(--accent)",flexShrink:0,marginTop:2}} />
              <p style={{fontSize:13,color:"var(--text-secondary)",lineHeight:1.6}}>
                {t("vaultInfo")}
                {withdrawalAddr && (
                  <> {" "}
                    <strong style={{color:"var(--accent)",fontFamily:"var(--font-mono)",fontSize:11}}>
                      {withdrawalAddr.slice(0,8)}...{withdrawalAddr.slice(-6)}
                    </strong> {t("vaultWithdrawalAddr")}
                  </>
                )}
              </p>
            </div>
          </div>

          {/* Token Locklar */}
          <h2 style={{fontSize:16,fontWeight:700,marginBottom:16}}>
            {t("vaultActiveLocksList")}
            <span style={{marginLeft:8,fontSize:12,color:"var(--text-muted)",fontFamily:"var(--font-mono)",fontWeight:400}}>
              {activePub.length}{t("vaultCount")}
            </span>
          </h2>
          {activePub.length === 0 ? (
            <div className="empty-state"><Lock size={40} /><p>{t("vaultNoLocks")}</p></div>
          ) : (
            <div className="lock-list">
              {activePub.map(lock => {
                const token = TOKEN_BY_ADDR[lock.token?.toLowerCase()];
                const sym = token?.symbol || "???";
                const dec = token?.decimals || 18;
                const st = Number(lock.status);
                const ti = lock.ti;
                const isActive = st === 0;
                const isUnlocked = ti ? ti.isUnlocked : false;
                const cd = countdown(lock.unlockTimestamp, st);
                const statusLabel = st === 0 ? (isUnlocked ? t("vaultUnlocked") : t("vaultActive")) : st === 1 ? t("vaultWithdrawn") : t("vaultEmergency");
                const statusClass = st === 0 ? (isUnlocked ? "unlocked" : "active") : st === 1 ? "withdrawn" : "emergency";
                return (
                  <div key={lock.id} className={"lock-row" + (isActive && isUnlocked ? " unlocked pulse-glow" : "")}>
                    <div className="lock-id">#{lock.id}</div>
                    <div>
                      <span className={"token-badge " + sym.toLowerCase()}>{sym}</span>
                      <span className="lock-amount" style={{marginLeft:10}}>{formatAmt(lock.amount, dec)}</span>
                    </div>
                    <div className="lock-time">
                      <div style={{fontSize:11,color:"var(--text-muted)",marginBottom:2}}>{t("vaultUnlockDate")}</div>
                      <div>{formatDate(lock.unlockTimestamp)}</div>
                    </div>
                    <div>
                      <div className={"lock-countdown " + (isActive && isUnlocked ? "expired" : "active")}>{cd}</div>
                    </div>
                    <div>
                      <span className={"status-badge " + statusClass}>
                        <span className="status-dot" />{statusLabel}
                      </span>
                    </div>
                    <div />
                  </div>
                );
              })}
            </div>
          )}

          {/* NFT Locklar — oddiy foydalanuvchi uchun */}
          <h2 style={{fontSize:16,fontWeight:700,marginBottom:16,marginTop:32}}>
            NFT (LP) locklar
            <span style={{marginLeft:8,fontSize:12,color:"var(--text-muted)",fontFamily:"var(--font-mono)",fontWeight:400}}>
              {activeNFTLocks.length}{t("vaultCount")}
            </span>
          </h2>
          {activeNFTLocks.length === 0 ? (
            <div className="empty-state"><Lock size={40} /><p>{t("vaultNoNFT")}</p></div>
          ) : (
            <div className="lock-list">
              {activeNFTLocks.map(nft => {
                const liq = Number(nft.liquidity);
                const cd = countdown(nft.unlockTimestamp, 0);
                const isUnlocked = now >= Number(nft.unlockTimestamp);
                return (
                  <div key={nft.id} className={"lock-row" + (isUnlocked ? " unlocked pulse-glow" : "")}>
                    <div className="lock-id">#{nft.id}</div>
                    <div>
                      <span className="token-badge" style={{background:"rgba(99,102,241,0.12)",color:"#818cf8"}}>
                        DUR/USDC LP
                      </span>
                      <span style={{marginLeft:8,fontSize:11,color:"var(--text-muted)",fontFamily:"var(--font-mono)"}}>
                        #{Number(nft.tokenId)}
                      </span>
                    </div>
                    <div className="lock-time">
                      <div style={{fontSize:11,color:"var(--text-muted)",marginBottom:2}}>{t("vaultLPValue")}</div>
                      <div style={{fontFamily:"var(--font-mono)",fontSize:12,color:"var(--success)"}}>
                        {nft.usdcValue != null
                          ? "$" + (Number(nft.usdcValue) / 1e6).toFixed(2)
                          : "—"}
                      </div>
                    </div>
                    <div className="lock-time">
                      <div style={{fontSize:11,color:"var(--text-muted)",marginBottom:2}}>{t("vaultUnlockDate")}</div>
                      <div>{formatDate(nft.unlockTimestamp)}</div>
                    </div>
                    <div>
                      <div className={"lock-countdown " + (isUnlocked ? "expired" : "active")}>{cd}</div>
                    </div>
                    <div>
                      <span className={"status-badge " + (isUnlocked ? "unlocked" : "active")}>
                        <span className="status-dot" />{isUnlocked ? t("vaultUnlocked") : t("vaultActive")}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
          {/* Streamlar — barcha foydalanuvchilar uchun (faqat ko'rish) */}
          <h2 style={{fontSize:16,fontWeight:700,marginBottom:16,marginTop:32}}>
            Streamlar
            <span style={{marginLeft:8,fontSize:12,color:"var(--text-muted)",fontFamily:"var(--font-mono)",fontWeight:400}}>
              {streams.filter(s => Number(s.status) === 0).length}{t("vaultCount")}
            </span>
          </h2>
          {streams.filter(s => Number(s.status) === 0).length === 0 ? (
            <div className="empty-state"><Zap size={40}/><p>Faol stream yoq</p></div>
          ) : (
            <div className="lock-list">
              {streams.filter(s => Number(s.status) === 0).map(s => {
                const token = TOKEN_BY_ADDR[s.token?.toLowerCase()];
                const sym = token?.symbol || "???";
                const dec = token?.decimals || 18;
                const withdrawable = s.ti?.withdrawable || 0n;
                return (
                  <div key={s.id} className="lock-row">
                    <div className="lock-id">#{s.id}</div>
                    <div>
                      <span className={"token-badge " + sym.toLowerCase()}>{sym}</span>
                      <span className="lock-amount" style={{marginLeft:10}}>{formatAmt(s.totalAmount, dec)}</span>
                    </div>
                    <div className="lock-time">
                      <div style={{fontSize:11,color:"var(--text-muted)",marginBottom:2}}>Tugash</div>
                      <div>{formatDate(s.endTime)}</div>
                    </div>
                    <div>
                      <div style={{fontSize:11,color:"var(--text-muted)"}}>Qolgan</div>
                      <div style={{fontSize:13,color:"var(--text-primary)",fontFamily:"var(--font-mono)"}}>{formatAmt(BigInt(s.totalAmount) - BigInt(s.withdrawnAmount), dec)} {sym}</div>
                      <div style={{fontSize:11,color:"var(--text-muted)",marginTop:6}}>Yechish mumkin</div>
                      <div style={{fontSize:13,color:"var(--success)"}}>{formatAmt(withdrawable, dec)} {sym}</div>
                    </div>
                    <div />
                    <div />
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </>
    );
  }

  // ── Owner view ───────────────────────────────────────────────────────────────
  const TABS = [
    { id: "statistika", label: t("vaultTabStatistika"), icon: <Shield size={15} /> },
    { id: "locklar",    label: t("vaultTabLocklar"),    icon: <Lock size={15} /> },
    { id: "nft",        label: t("vaultTabNFT"),        icon: <Zap size={15} /> },
    { id: "tarix",      label: t("vaultTabTarix"),      icon: <Search size={15} /> },
    { id: "kiritish",   label: t("vaultTabKiritish"),   icon: <ArrowDownToLine size={15} /> },
    { id: "stream",     label: "Stream",                   icon: <Zap size={15} /> },
    { id: "sozlamalar", label: t("vaultSettings") || "Sozlamalar", icon: <RefreshCw size={15} /> },
  ];

  return (
    <>
      <style>{vaultStyles}</style>
      <div className="animate-in vault-wrap">
        <div className="page-header">
          <div>
            <h1 className="page-title">{t("vaultTitle")}</h1>
            <div style={{display:"inline-flex",alignItems:"center",gap:6,
              background:"rgba(0,212,170,0.1)",color:"var(--accent)",
              border:"1px solid rgba(0,212,170,0.3)",borderRadius:999,
              padding:"3px 10px",fontSize:11,fontWeight:600,marginTop:6}}>
              {t("vaultOwnerPanel")}
            </div>
          </div>
          <button className="btn btn-ghost btn-sm" onClick={load}>
            <RefreshCw size={14} /> {t("vaultRefresh")}
          </button>
        </div>

        <div style={{display:"flex",gap:6,flexWrap:"wrap",marginBottom:20}}>
          {TABS.map(tab => (
            <button key={tab.id}
              className={"btn btn-sm" + (activeTab === tab.id ? " btn-primary" : " btn-ghost")}
              onClick={() => setActiveTab(tab.id)}>
              {tab.icon} {tab.label}
            </button>
          ))}
        </div>

        <div>
          {activeTab === "statistika" && renderStatistika()}
          {activeTab === "locklar" && renderLocklar()}
          {activeTab === "nft" && renderNFT()}
          {activeTab === "tarix" && renderTarix()}
          {activeTab === "kiritish" && renderKiritish()}
          {activeTab === "stream" && renderStream()}
          {activeTab === "sozlamalar" && renderSozlamalar()}
        </div>
      </div>
    </>
  );
}
