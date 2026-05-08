import { saveGlobalTxHistory } from './globalTxHistory';
export const TX_HISTORY_KEY = 'nasiyasale_tx_history_v1';
export const TX_HISTORY_MAX = 20;

function safeValue(value) {
  try {
    if (value === undefined || value === null) return null;

    if (typeof value === 'bigint') {
      return value.toString();
    }

    if (typeof value === 'number' || typeof value === 'string' || typeof value === 'boolean') {
      return value;
    }

    if (Array.isArray(value)) {
      return value.map((x) => safeValue(x));
    }

    if (typeof value === 'object') {
      const out = {};
      Object.keys(value).forEach((key) => {
        out[key] = safeValue(value[key]);
      });
      return out;
    }

    return String(value);
  } catch {
    return String(value || '');
  }
}

function safeString(value) {
  if (value === undefined || value === null) return '';
  if (typeof value === 'bigint') return value.toString();
  return String(value);
}

export function saveLocalTxHistory(tx) {
  try {
    const oldItems = JSON.parse(localStorage.getItem(TX_HISTORY_KEY) || '[]');
    const list = Array.isArray(oldItems) ? oldItems : [];

    const item = {
      id: safeString(tx.id || `${Date.now()}-${Math.random().toString(16).slice(2)}`),
      type: safeString(tx.type || 'Transaction'),
      label: safeString(tx.label || tx.type || 'Transaction'),
      listingId: tx.listingId === undefined || tx.listingId === null ? null : safeString(tx.listingId),
      txHash: safeString(tx.txHash || ''),
      status: safeString(tx.status || 'success'),
      time: Number(tx.time || Date.now()),
      account: safeString(tx.account || ''),
      extra: safeString(tx.extra || ''),
      data: safeValue(tx.data || null),
    };

    const nextItems = [
      item,
      ...list.filter((x) => {
        if (!item.txHash) return true;
        return x.txHash !== item.txHash;
      }),
    ].slice(0, TX_HISTORY_MAX);

    localStorage.setItem(TX_HISTORY_KEY, JSON.stringify(nextItems));
    window.dispatchEvent(new Event('nasiyasale:tx-history-updated'));

    console.log('[NasiyaSale TxHistory] saved:', item);

    saveGlobalTxHistory(item).catch((e) => {
      console.error('[NasiyaSale GlobalHistory] async save failed:', e);
    });

    return true;
  } catch (e) {
    console.error('[NasiyaSale TxHistory] save failed:', e);
    return false;
  }
}

export function loadLocalTxHistory() {
  try {
    const raw = localStorage.getItem(TX_HISTORY_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed.slice(0, TX_HISTORY_MAX) : [];
  } catch (e) {
    console.error('[NasiyaSale TxHistory] load failed:', e);
    return [];
  }
}

export function clearLocalTxHistory() {
  try {
    localStorage.removeItem(TX_HISTORY_KEY);
    window.dispatchEvent(new Event('nasiyasale:tx-history-updated'));
    return true;
  } catch (e) {
    console.error('[NasiyaSale TxHistory] clear failed:', e);
    return false;
  }
}

