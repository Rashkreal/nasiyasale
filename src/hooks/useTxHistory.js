import { useState, useEffect, useCallback } from 'react';
import { ethers } from 'ethers';
import { CONTRACT_ADDRESS, CONTRACT_ABI } from '../abi/contract';

const STORAGE_KEY = 'nasiyasavdo_tx_history';
const MAX_HISTORY = 100;

function loadHistory() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch { return []; }
}

function saveHistory(history) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(history.slice(0, MAX_HISTORY)));
  } catch {}
}

export function useTxHistory(provider, account) {
  const [history, setHistory] = useState(loadHistory);

  const addTx = useCallback((entry) => {
    setHistory(prev => {
      const updated = [entry, ...prev].slice(0, MAX_HISTORY);
      saveHistory(updated);
      return updated;
    });
  }, []);

  const clearHistory = useCallback(() => {
    localStorage.removeItem(STORAGE_KEY);
    setHistory([]);
  }, []);

  // Listen to contract events
  useEffect(() => {
    if (!provider || !account) return;

    let contract;
    try {
      contract = new ethers.Contract(CONTRACT_ADDRESS, CONTRACT_ABI, provider);
    } catch { return; }

    const addr = account.toLowerCase();

    const onListingCreated = (listingId, creator, durAmount, priceUSDC, paymentPeriod, isCollateral, event) => {
      if (creator.toLowerCase() !== addr) return;
      addTx({
        id: Date.now(),
        type: 'ListingCreated',
        label: "E'lon yaratildi",
        listingId: Number(listingId),
        durAmount: ethers.formatUnits(durAmount, 18),
        priceUSDC: ethers.formatUnits(priceUSDC, 6),
        isCollateral,
        txHash: event.log?.transactionHash || '',
        time: Date.now(),
      });
    };

    const onListingApproved = (listingId, buyer, seller, durAmount, priceUSDC, dueDate, event) => {
      const isMe = buyer.toLowerCase() === addr || seller.toLowerCase() === addr;
      if (!isMe) return;
      addTx({
        id: Date.now(),
        type: 'ListingApproved',
        label: "E'lon tasdiqlandi",
        listingId: Number(listingId),
        durAmount: ethers.formatUnits(durAmount, 18),
        priceUSDC: ethers.formatUnits(priceUSDC, 6),
        role: buyer.toLowerCase() === addr ? 'xaridor' : 'sotuvchi',
        txHash: event.log?.transactionHash || '',
        time: Date.now(),
      });
    };

    const onPaymentCompleted = (listingId, buyer, newBL, seller, event) => {
      const isMe = buyer.toLowerCase() === addr || seller.toLowerCase() === addr;
      if (!isMe) return;
      addTx({
        id: Date.now(),
        type: 'PaymentCompleted',
        label: "To'lov amalga oshirildi",
        listingId: Number(listingId),
        newBL: ethers.formatUnits(newBL, 18),
        role: buyer.toLowerCase() === addr ? 'xaridor' : 'sotuvchi',
        txHash: event.log?.transactionHash || '',
        time: Date.now(),
      });
    };

    const onCollateralClaimed = (claimer, listingId, collateralBLT, event) => {
      if (claimer.toLowerCase() !== addr) return;
      addTx({
        id: Date.now(),
        type: 'CollateralClaimed',
        label: 'Garov qaytarildi',
        listingId: Number(listingId),
        collateralBLT: ethers.formatUnits(collateralBLT, 18),
        txHash: event.log?.transactionHash || '',
        time: Date.now(),
      });
    };

    const onBLClaimed = (listingId, buyer, seller, event) => {
      const isMe = buyer.toLowerCase() === addr || seller.toLowerCase() === addr;
      if (!isMe) return;
      addTx({
        id: Date.now(),
        type: 'BLClaimed',
        label: "BL da'vo qilindi",
        listingId: Number(listingId),
        txHash: event.log?.transactionHash || '',
        time: Date.now(),
      });
    };

    contract.on('ListingCreated', onListingCreated);
    contract.on('ListingApproved', onListingApproved);
    contract.on('PaymentCompleted', onPaymentCompleted);
    contract.on('CollateralClaimed', onCollateralClaimed);
    contract.on('BLClaimed', onBLClaimed);

    return () => {
      contract.removeAllListeners();
    };
  }, [provider, account, addTx]);

  return { history, addTx, clearHistory };
}
