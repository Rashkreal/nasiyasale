import React, { createContext, useContext, useState, useCallback, useEffect, useRef } from 'react';
import { ethers } from 'ethers';
import {
  CONTRACT_ADDRESS,
  CONTRACT_ABI,
  ERC20_ABI,
  TOKEN_ADDRESSES,
  TOKEN_DECIMALS,
  ARBITRUM_ONE,
} from '../abi/contract';
import { loadApproveMultiplier } from '../pages/Settings';
import toast from 'react-hot-toast';

const Web3Context = createContext(null);

const ALL_TOKENS = ['DUR', 'USDC', 'WBTC', 'WETH'];
const emptyBals = () => Object.fromEntries(ALL_TOKENS.map((k) => [k, '0']));

const WC_PROJECT_ID = '931c40a15bee2387d84ff99b93520df7';

export function useWeb3() {
  return useContext(Web3Context);
}

function isMobile() {
  return /Mobi|Android|iPhone|iPad|iPod/i.test(navigator.userAgent);
}

export function Web3Provider({ children }) {
  const [provider, setProvider] = useState(null);
  const [signer, setSigner] = useState(null);
  const [account, setAccount] = useState(null);
  const [chainId, setChainId] = useState(null);
  const [contract, setContract] = useState(null);
  const [tokens, setTokens] = useState({});
  const [connecting, setConnecting] = useState(false);
  const [walletType, setWalletType] = useState(null);
  const [walletBalances, setWalletBalances] = useState(emptyBals());

  const wcProviderRef = useRef(null);
  const disconnectingRef = useRef(false);
  const walletTypeRef = useRef(null);
  const actionAbortRef = useRef(false);
  const activeToastRef = useRef(null);

  const isCorrectNetwork = chainId === ARBITRUM_ONE.chainId;

  const clearWalletSessionStorage = useCallback(async () => {
    try {
      if (walletTypeRef.current === 'walletconnect') {
        const wc = wcProviderRef.current;
        if (wc && typeof wc.disconnect === 'function') {
          await wc.disconnect().catch(() => {});
        }
        wcProviderRef.current = null;
      }
      Object.keys(window.sessionStorage).forEach((k) => {
        if (k.startsWith('walletlink') || k.startsWith('WALLETCONNECT') || k.startsWith('wc@')) {
          window.sessionStorage.removeItem(k);
        }
      });
      Object.keys(window.localStorage).forEach((k) => {
        if (k.startsWith('walletlink') || k.startsWith('WALLETCONNECT') || k.startsWith('wc@')) {
          window.localStorage.removeItem(k);
        }
      });
    } catch (_) {}
  }, []);

  const initContracts = useCallback((signerOrProvider) => {
    if (!signerOrProvider) {
      setContract(null);
      return { c: null, tokenContracts: {} };
    }
    const c = new ethers.Contract(CONTRACT_ADDRESS, CONTRACT_ABI, signerOrProvider);
    setContract(c);
    const tc = {};
    for (const key of ALL_TOKENS) {
      tc[key] = new ethers.Contract(TOKEN_ADDRESSES[key], ERC20_ABI, signerOrProvider);
    }
    return { c, tokenContracts: tc };
  }, []);

  const fetchBalances = useCallback(async (addr, tokenContracts) => {
    if (!addr || !tokenContracts || Object.keys(tokenContracts).length === 0) return;
    try {
      const results = await Promise.all(
        ALL_TOKENS.map((k) => tokenContracts[k].balanceOf(addr))
      );
      const bals = {};
      ALL_TOKENS.forEach((k, i) => {
        bals[k] = ethers.formatUnits(results[i], TOKEN_DECIMALS[k]);
      });
      setWalletBalances(bals);
    } catch (e) {
      console.error('fetchBalances:', e);
    }
  }, []);

  const requestSwitchToArbitrum = useCallback(async (walletProvider) => {
    try {
      await walletProvider.request({
        method: 'wallet_switchEthereumChain',
        params: [{ chainId: '0xa4b1' }],
      });
      return true;
    } catch (switchError) {
      if (switchError.code === 4902) {
        try {
          await walletProvider.request({
            method: 'wallet_addEthereumChain',
            params: [{
              chainId: '0xa4b1',
              chainName: 'Arbitrum One',
              nativeCurrency: { name: 'ETH', symbol: 'ETH', decimals: 18 },
              rpcUrls: ['https://arb1.arbitrum.io/rpc'],
              blockExplorerUrls: ['https://arbiscan.io'],
            }],
          });
          return true;
        } catch (addError) {
          toast.error("Arbitrum tarmog'ini qo'shish rad etildi");
          return false;
        }
      }
      toast.error("Arbitrum tarmog'iga o'tish rad etildi");
      return false;
    }
  }, []);

  const openWalletForRequest = useCallback(() => {
    if (!isMobile()) return;
    if (walletTypeRef.current !== 'walletconnect') return;
    const wc = wcProviderRef.current;
    if (!wc) return;
    try {
      const peerMeta =
        wc.session?.peer?.metadata ||
        wc.signer?.session?.peer?.metadata ||
        {};
      const { native, universal } = peerMeta.redirect || {};
      let target = null;
      if (universal) {
        target = universal.endsWith('/') ? universal : universal + '/';
      } else if (native) {
        target = native;
      }
      if (!target) {
        console.warn('openWalletForRequest: peer redirect topilmadi', peerMeta);
        return;
      }
      const a = document.createElement('a');
      a.href = target;
      a.target = '_self';
      a.rel = 'noopener';
      a.style.display = 'none';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
    } catch (e) {
      console.warn('openWalletForRequest failed:', e);
    }
  }, []);

  const ensureCorrectChain = useCallback(async () => {
    // WalletConnect (mobil): tranzaksiya setDefaultChain tufayli baribir
    // Arbitrum'ga yo'naltiriladi. MetaMask mobil WC orqali tarmoq
    // almashtirishni ishonchli bajarmaydi, shuning uchun bu yerda
    // majburlamaymiz - to'g'ridan-to'g'ri davom etamiz.
    if (walletTypeRef.current === 'walletconnect') {
      if (chainId !== ARBITRUM_ONE.chainId) setChainId(ARBITRUM_ONE.chainId);
      return true;
    }
    if (!provider) throw new Error('Provider topilmadi');
    const currentChainId = await provider.request({ method: 'eth_chainId' });
    if (parseInt(currentChainId, 16) === ARBITRUM_ONE.chainId) {
      if (chainId !== ARBITRUM_ONE.chainId) setChainId(ARBITRUM_ONE.chainId);
      return true;
    }
    const tid = toast.loading(`Wallet ${currentChainId} tarmog'ida. Arbitrum'ga o'tkazilmoqda...`);
    openWalletForRequest();
    const switched = await requestSwitchToArbitrum(provider);
    if (!switched) {
      toast.error("Arbitrum Mainnet'ga o'ting", { id: tid });
      throw new Error("Arbitrum Mainnet'ga o'ting");
    }
    await new Promise((r) => setTimeout(r, 800));
    const newChainId = await provider.request({ method: 'eth_chainId' });
    const newCid = parseInt(newChainId, 16);
    setChainId(newCid);
    if (newCid !== ARBITRUM_ONE.chainId) {
      toast.error("Wallet hali ham Arbitrum'da emas. Qo'lda o'ting.", { id: tid });
      throw new Error("Wallet hali ham Arbitrum'da emas");
    }
    toast.success("Arbitrum'ga o'tildi", { id: tid });
    return true;
  }, [provider, chainId, requestSwitchToArbitrum, openWalletForRequest]);

  const connectMetaMask = useCallback(async () => {
    setConnecting(true);
    const tid = toast.loading('Connecting MetaMask...');
    try {
      if (!window.ethereum) {
        toast.error('MetaMask topilmadi.', { id: tid });
        return;
      }
      const accounts = await window.ethereum.request({ method: 'eth_requestAccounts' });
      const addr = ethers.getAddress(accounts[0]);
      const s = await new ethers.BrowserProvider(window.ethereum).getSigner();
      setSigner(s);
      setAccount(addr);
      setProvider(window.ethereum);
      setWalletType('metamask');
      walletTypeRef.current = 'metamask';

      const cid = await window.ethereum.request({ method: 'eth_chainId' });
      const numCid = parseInt(cid, 16);
      setChainId(numCid);

      const { tokenContracts } = initContracts(s);
      setTokens(tokenContracts);

      if (numCid !== ARBITRUM_ONE.chainId) {
        const switched = await requestSwitchToArbitrum(window.ethereum);
        if (switched) {
          await new Promise((r) => setTimeout(r, 500));
          const newS = await new ethers.BrowserProvider(window.ethereum).getSigner();
          setSigner(newS);
          const newCid = await window.ethereum.request({ method: 'eth_chainId' });
          const nc = parseInt(newCid, 16);
          setChainId(nc);
          if (nc === ARBITRUM_ONE.chainId) {
            const { tokenContracts: tc } = initContracts(newS);
            setTokens(tc);
            await fetchBalances(addr, tc);
          }
        }
      } else {
        await fetchBalances(addr, tokenContracts);
      }
      toast.success('Wallet ulandi!', { id: tid });
    } catch (e) {
      console.error('MetaMask ulanish xatosi:', e);
      toast.error(e?.shortMessage || e?.message || 'Ulanishda xato', { id: tid });
    } finally {
      setConnecting(false);
    }
  }, [initContracts, fetchBalances, requestSwitchToArbitrum]);

  const connectWalletConnect = useCallback(async () => {
    setConnecting(true);
    try {
      const WalletConnectProvider = (await import('@walletconnect/ethereum-provider')).default;
      const wc = await WalletConnectProvider.init({
        projectId: WC_PROJECT_ID,
        // Arbitrum'ni OPTIONAL qilamiz: MetaMask mobil "required" notanish
        // tarmoqli ulanish so'rovini indamay tashlab yuboradi. optionalChains
        // bilan so'rov normal ko'rinadi va ulanish ochiladi.
        optionalChains: [42161],
        showQrModal: true,
        rpcMap: {
          42161: 'https://arb1.arbitrum.io/rpc',
        },
      });
      wcProviderRef.current = wc;
      walletTypeRef.current = 'walletconnect';

      // Eski/mos kelmaydigan sessiya qolgan bo'lsa, uni uzib toza boshlaymiz.
      try {
        if (wc.session) await wc.disconnect();
      } catch {}

      await wc.enable();
      const accounts = wc.accounts;
      if (!accounts || accounts.length === 0) {
        toast.error('WalletConnect hisob topilmadi');
        return;
      }
      const addr = ethers.getAddress(accounts[0]);

      // Ulangan zahoti, wallet hali MetaMask kontekstida turganda, uni
      // Arbitrum'ga o'tkazamiz. Aks holda keyin tranzaksiya yuborilganda
      // MetaMask boshqa tarmoqda bo'lib, tasdiq deeplink'i chiqmaydi.
      let realCid = parseInt(await wc.request({ method: 'eth_chainId' }), 16);
      if (realCid !== ARBITRUM_ONE.chainId) {
        try {
          await wc.request({
            method: 'wallet_switchEthereumChain',
            params: [{ chainId: '0xa4b1' }],
          });
        } catch (err) {
          // Arbitrum qo'shilmagan bo'lsa - qo'shib, keyin o'tkazamiz
          if (err?.code === 4902 || String(err?.message || '').includes('Unrecognized')) {
            try {
              await wc.request({
                method: 'wallet_addEthereumChain',
                params: [{
                  chainId: '0xa4b1',
                  chainName: 'Arbitrum One',
                  nativeCurrency: { name: 'Ether', symbol: 'ETH', decimals: 18 },
                  rpcUrls: ['https://arb1.arbitrum.io/rpc'],
                  blockExplorerUrls: ['https://arbiscan.io'],
                }],
              });
            } catch {}
          }
        }
        try { realCid = parseInt(await wc.request({ method: 'eth_chainId' }), 16); } catch {}
      }
      try { wc.setDefaultChain('eip155:42161'); } catch {}

      const s = await new ethers.BrowserProvider(wc).getSigner();
      setSigner(s);
      setAccount(addr);
      setProvider(wc);
      setWalletType('walletconnect');
      setChainId(realCid);

      const { tokenContracts } = initContracts(s);
      setTokens(tokenContracts);
      await fetchBalances(addr, tokenContracts);

      toast.success('WalletConnect ulandi!');
    } catch (e) {
      console.error('WalletConnect ulanish xatosi:', e);
      toast.error(e?.shortMessage || e?.message || 'Ulanishda xato');
    } finally {
      setConnecting(false);
    }
  }, [initContracts, fetchBalances]);

  const disconnect = useCallback(async (options = {}) => {
    if (disconnectingRef.current) return;
    disconnectingRef.current = true;
    const { silent = false, reload = false } = options;
    try {
      if (walletTypeRef.current === 'walletconnect') {
        const wc = wcProviderRef.current;
        if (wc && typeof wc.disconnect === 'function') {
          try { await wc.disconnect(); } catch (_) {}
        }
        wcProviderRef.current = null;
      }
      await clearWalletSessionStorage();
    } finally {
      setProvider(null);
      setSigner(null);
      setAccount(null);
      setChainId(null);
      setContract(null);
      setTokens({});
      setWalletType(null);
      setWalletBalances(emptyBals());
      walletTypeRef.current = null;
      disconnectingRef.current = false;
      if (!silent) toast.success('Wallet uzildi');
      if (reload) window.location.reload();
    }
  }, [clearWalletSessionStorage]);

  const refreshBalances = useCallback(() => {
    if (!account || !tokens || Object.keys(tokens).length === 0) return;
    fetchBalances(account, tokens);
  }, [account, tokens, fetchBalances]);

  useEffect(() => {
    if (!window.ethereum || walletType !== 'metamask') return undefined;
    const onAccountsChanged = async (accounts) => {
      try {
        if (!accounts || accounts.length === 0) {
          disconnect({ silent: true, reload: true });
          return;
        }
        const addr = ethers.getAddress(accounts[0]);
        setAccount(addr);
        const s = await new ethers.BrowserProvider(window.ethereum).getSigner();
        setSigner(s);
        const { tokenContracts } = initContracts(s);
        setTokens(tokenContracts);
        const cid = await window.ethereum.request({ method: 'eth_chainId' });
        const nc = parseInt(cid, 16);
        setChainId(nc);
        if (nc === ARBITRUM_ONE.chainId) {
          await fetchBalances(addr, tokenContracts);
        }
      } catch (e) {
        console.error('accountsChanged error:', e);
      }
    };
    const onChainChanged = async (chainIdHex) => {
      try {
        const nc = parseInt(chainIdHex, 16);
        setChainId(nc);
        const addr = account;
        if (!addr) return;
        const s = await new ethers.BrowserProvider(window.ethereum).getSigner();
        setSigner(s);
        const { tokenContracts } = initContracts(s);
        setTokens(tokenContracts);
        if (nc === ARBITRUM_ONE.chainId) {
          await fetchBalances(addr, tokenContracts);
        }
      } catch (e) {
        console.error('chainChanged refresh error:', e);
      }
    };
    window.ethereum.on('accountsChanged', onAccountsChanged);
    window.ethereum.on('chainChanged', onChainChanged);
    return () => {
      window.ethereum.removeListener('accountsChanged', onAccountsChanged);
      window.ethereum.removeListener('chainChanged', onChainChanged);
    };
  }, [walletType, disconnect, initContracts, fetchBalances, account]);

  const withTimeout = (promise, ms, message) =>
    Promise.race([
      promise,
      new Promise((_, reject) => setTimeout(() => reject(new Error(message)), ms)),
    ]);

  const ensureApproval = useCallback(async (tokenKey, amountRaw) => {
    if (!account || !signer) return true;
    const tokenWithSigner = tokens[tokenKey];
    if (!tokenWithSigner) return true;
    const tokenReadOnly = new ethers.Contract(
      await tokenWithSigner.getAddress(),
      ['function allowance(address,address) view returns (uint256)'],
      signer.provider
    );
    const initialAllowance = await tokenReadOnly.allowance(account, CONTRACT_ADDRESS);
    if (initialAllowance >= amountRaw) return true;
    const tid = toast.loading(`${tokenKey} uchun ruxsat so‘ralmoqda...`);
    activeToastRef.current = tid;
    try {
      const mult = loadApproveMultiplier();
      const approveAmount = mult === 'max' ? ethers.MaxUint256 : amountRaw * BigInt(mult);
      openWalletForRequest();
      const tx = await withTimeout(
        tokenWithSigner.connect(signer).approve(CONTRACT_ADDRESS, approveAmount),
        90000,
        `${tokenKey} approval oynasi chiqmadi yoki wallet javob bermadi`
      );
      await withTimeout(tx.wait(), 90000, `${tokenKey} approval tasdiqlanmadi`);
      toast.success(`${tokenKey} ruxsat berildi! Endi tugmani yana bosing.`, { id: tid });
      activeToastRef.current = null;
      return false;
    } catch (e) {
      const msg = (e?.message || '').toLowerCase();
      if (msg.includes('rejected') || msg.includes('denied')) {
        toast.error('Ruxsat rad etildi', { id: tid });
      } else {
        toast.error('Ruxsat olishda xato', { id: tid });
      }
      activeToastRef.current = null;
      throw e;
    }
  }, [account, signer, tokens, openWalletForRequest]);

  const revokeAllApprovals = useCallback(async (onProgress) => {
    if (!account || !signer) throw new Error('Avval walletni ulang');
    const roProvider = signer.provider;
    const toRevoke = [];
    for (const tokenKey of ALL_TOKENS) {
      try {
        const tokenAddr = TOKEN_ADDRESSES[tokenKey];
        const roToken = new ethers.Contract(
          tokenAddr,
          ['function allowance(address,address) view returns (uint256)'],
          roProvider
        );
        const allowance = await roToken.allowance(account, CONTRACT_ADDRESS);
        if (allowance > 0n) toRevoke.push(tokenKey);
      } catch (_) {}
    }
    if (toRevoke.length === 0) {
      return { total: 0, revoked: 0, message: 'no_approvals' };
    }
    const total = toRevoke.length;
    let done = 0, revoked = 0;
    const failed = [];
    for (const tokenKey of toRevoke) {
      if (actionAbortRef.current) break;
      try {
        if (typeof onProgress === 'function') onProgress(done, total, tokenKey);
        const tokenWithSigner = tokens[tokenKey];
        openWalletForRequest();
        const tx = await withTimeout(
          tokenWithSigner.connect(signer).approve(CONTRACT_ADDRESS, 0),
          90000,
          `${tokenKey} cancel window did not open`
        );
        await withTimeout(tx.wait(), 90000, `${tokenKey} cancel not confirmed`);
        revoked++;
      } catch (e) {
        failed.push(tokenKey);
        console.error('revoke error:', tokenKey, e);
      }
      done++;
    }
    return { total, revoked, failed };
  }, [account, signer, tokens, openWalletForRequest]);

  const resetWalletConnection = useCallback(() => {
    disconnect({ silent: true, reload: true });
  }, [disconnect]);

  return (
    <Web3Context.Provider
      value={{
        provider,
        signer,
        account,
        chainId,
        contract,
        readOnlyContract: contract,
        tokens,
        connecting,
        isCorrectNetwork,
        walletBalances,
        walletType,
        connectMetaMask,
        connectWalletConnect,
        disconnect,
        refreshBalances,
        ensureApproval,
        revokeAllApprovals,
        ensureCorrectChain,
        switchToArbitrum: requestSwitchToArbitrum,
        openWalletForRequest,
        resetWalletConnection,
        isReadOnly: walletType === 'readonly',
      }}
    >
      {children}
    </Web3Context.Provider>
  );
}