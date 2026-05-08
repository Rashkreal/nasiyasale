import { ref, push, set, query, orderByChild, limitToLast, onValue, off, remove } from 'firebase/database';
import { db } from '../firebase';

export const OWNER_ADDRESS = '0x0e86d8afaa0B77D732d89BD5ceC3dC9003b321dA';
export const GLOBAL_TX_HISTORY_PATH = 'globalTxHistory';
export const GLOBAL_TX_HISTORY_MAX = 20;

export function isOwnerAddress(account) {
  if (!account) return false;
  return String(account).toLowerCase() === OWNER_ADDRESS.toLowerCase();
}

function safeString(value) {
  if (value === undefined || value === null) return '';
  if (typeof value === 'bigint') return value.toString();
  return String(value);
}

function safeItem(tx) {
  return {
    id: safeString(tx.id || `${Date.now()}-${Math.random().toString(16).slice(2)}`),
    type: safeString(tx.type || 'Transaction'),
    label: safeString(tx.label || tx.type || 'Transaction'),
    listingId: tx.listingId === undefined || tx.listingId === null ? null : safeString(tx.listingId),
    txHash: safeString(tx.txHash || ''),
    status: safeString(tx.status || 'success'),
    time: Number(tx.time || Date.now()),
    account: safeString(tx.account || ''),
    extra: safeString(tx.extra || ''),
  };
}

export async function saveGlobalTxHistory(tx) {
  try {
    const item = safeItem(tx);

    if (!item.txHash) {
      console.warn('[NasiyaSale GlobalHistory] skipped: no txHash', item);
      return false;
    }

    const node = push(ref(db, GLOBAL_TX_HISTORY_PATH));
    await set(node, {
      ...item,
      firebaseKey: node.key,
      createdAt: Date.now(),
    });

    console.log('[NasiyaSale GlobalHistory] saved:', item);
    return true;
  } catch (e) {
    console.error('[NasiyaSale GlobalHistory] save failed:', e);
    return false;
  }
}

export function listenGlobalTxHistory(account, callback) {
  if (!isOwnerAddress(account)) {
    callback([]);
    return () => {};
  }

  const q = query(
    ref(db, GLOBAL_TX_HISTORY_PATH),
    orderByChild('time'),
    limitToLast(GLOBAL_TX_HISTORY_MAX)
  );

  const handler = (snap) => {
    const val = snap.val() || {};
    const items = Object.entries(val)
      .map(([key, value]) => ({ firebaseKey: key, ...value }))
      .sort((a, b) => Number(b.time || 0) - Number(a.time || 0))
      .slice(0, GLOBAL_TX_HISTORY_MAX);

    callback(items);
  };

  onValue(q, handler);

  return () => off(q, 'value', handler);
}

export async function clearGlobalTxHistory(account) {
  if (!isOwnerAddress(account)) {
    throw new Error('Only owner can clear global history');
  }

  await remove(ref(db, GLOBAL_TX_HISTORY_PATH));
}
