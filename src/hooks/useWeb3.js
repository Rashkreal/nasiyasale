import React, { createContext, useContext, useState, useCallback, useEffect, useRef } from 'react';
import { ethers } from 'ethers';
import { CONTRACT_ADDRESS, CONTRACT_ABI, ERC20_ABI, TOKEN_ADDRESSES, TOKEN_DECIMALS, OP_MAINNET } from '../abi/contract';
import toast from 'react-hot-toast';

const Web3Context = createContext(null);
const ALL_TOKENS = ['DUR', 'USDC', 'USDT', 'BLT', 'WBTC', 'WETH'];
const emptyBals = () => Object.fromEntries(ALL_TOKENS.map(k => [k, '0']));

// WalletConnect Project ID — https://cloud.walletconnect.com dan oling
const WC_PROJECT_ID = '931c40a15bee2387d84ff99b93520df7';

// Mobil qurilma ekanligini aniqlash
const isMobile = () => {
  return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(
    navigator.userAgent
  );
};

// Read-only provider — wallet ulanmagan holda ham ishlaydi
const READ_ONLY_RPC = 'https://optimism.publicnode.com';

export function Web3Provider({ children }) {
  const [provider, setProvider] = useState(null);
  const [signer, setSigner] = useState(null);
  const [account, setAccount] = useState(null);
  const [chainId, setChainId] = useState(null);
  const [contract, setContract] = useState(null);
  const [readOnlyContract, setReadOnlyContract] = useState(null);
  const [tokens, setTokens] = useState({});
  const [connecting, setConnecting] = useState(false);
  const [walletType, setWalletType] = useState(null);
  const [walletBalances, setWalletBalances] = useState(emptyBals());
  const wcProviderRef = useRef(null);
  const disconnectingRef = useRef(false);

  const isCorrectNetwork = chainId === OP_MAINNET.chainId;

  // Boshlangich read-only contract — wallet ulanmagan holda ham ishlaydi
  useEffect(() => {
    try {
      const roProvider = new ethers.JsonRpcProvider(READ_ONLY_RPC);
      const roContract = new ethers.Contract(CONTRACT_ADDRESS, CONTRACT_ABI, roProvider);
      setReadOnlyContract(roContract);
    } catch (e) { console.error('read-only contract init:', e); }
  }, []);

  const initContracts = useCallback((signerOrProvider) => {
    const c = new ethers.Contract(CONTRACT_ADDRESS, CONTRACT_ABI, signerOrProvider);
    setContract(c);
    const tc = {};
    for (const key of ALL_TOKENS) {
      tc[key] = new ethers.Contract(TOKEN_ADDRESSES[key], ERC20_ABI, signerOrProvider);
    }
    setTokens(tc);
    return { c, tokenContracts: tc };
  }, []);

  const fetchBalances = useCallback(async (addr, tokenContracts) => {
    if (!addr || !tokenContracts) return;
    try {
      const results = await Promise.all(
        ALL_TOKENS.map(k => tokenContracts[k].balanceOf(addr))
      );
      const bals = {};
      ALL_TOKENS.forEach((k, i) => { bals[k] = ethers.formatUnits(results[i], TOKEN_DECIMALS[k]); });
      setWalletBalances(bals);
    } catch (e) { console.error('fetchBalances:', e); }
  }, []);

  const switchToOptimism = useCallback(async () => {
    if (!window.ethereum) return;
    try {
      await window.ethereum.request({ method: 'wallet_switchEthereumChain', params: [{ chainId: '0xA' }] });
    } catch (err) {
      if (err.code === 4902) {
        await window.ethereum.request({
          method: 'wallet_addEthereumChain',
          params: [{ chainId: '0xA', chainName: 'Optimism', nativeCurrency: { name: 'ETH', symbol: 'ETH', decimals: 18 }, rpcUrls: ['https://mainnet.optimism.io'], blockExplorerUrls: ['https://optimistic.etherscan.io'] }],
        });
      }
    }
  }, []);

  // ══════════════════════════════════════════════════════════════
  // Disconnect
  // ══════════════════════════════════════════════════════════════

  const disconnect = useCallback(() => {
    if (disconnectingRef.current) return;
    disconnectingRef.current = true;

    // MetaMask ruxsatini bekor qilish
    if (window.ethereum && walletType === 'metamask') {
      try {
        window.ethereum.request({
          method: 'wallet_revokePermissions',
          params: [{ eth_accounts: {} }],
        }).catch(() => {});
      } catch (e) { /* ignore */ }
    }
    // WalletConnect sessiyasini yopish
    if (wcProviderRef.current && walletType === 'walletconnect') {
      try {
        wcProviderRef.current.removeAllListeners();
        wcProviderRef.current.disconnect().catch(() => {});
      } catch (e) { /* ignore */ }
      wcProviderRef.current = null;
    }
    setProvider(null); setSigner(null); setAccount(null); setChainId(null);
    setContract(null); setTokens({}); setWalletType(null); setWalletBalances(emptyBals());

    disconnectingRef.current = false;
  }, [walletType]);

  // ══════════════════════════════════════════════════════════════
  // MetaMask ulanish
  // ══════════════════════════════════════════════════════════════

  const connectMetaMask = useCallback(async () => {
    if (!window.ethereum) return toast.error("MetaMask topilmadi!");
    setConnecting(true);
    try {
      const p = new ethers.BrowserProvider(window.ethereum);
      await p.send("eth_requestAccounts", []);
      const s = await p.getSigner();
      const addr = await s.getAddress();
      const net = await p.getNetwork();
      const cid = Number(net.chainId);
      setProvider(p); setSigner(s); setAccount(addr); setChainId(cid); setWalletType('metamask');
      const { tokenContracts } = initContracts(s);
      if (cid !== OP_MAINNET.chainId) {
        toast.error("Optimism tarmog'iga o'ting!");
        await switchToOptimism();
      } else {
        await fetchBalances(addr, tokenContracts);
      }
    } catch (e) {
      if (!e?.message?.includes('rejected')) toast.error("Ulanishda xato");
    } finally { setConnecting(false); }
  }, [initContracts, fetchBalances, switchToOptimism]);

  // ══════════════════════════════════════════════════════════════
  // WalletConnect ulanish — TUZATILGAN
  // ══════════════════════════════════════════════════════════════

  const connectWalletConnect = useCallback(async () => {
    setConnecting(true);
    try {
      // 1. Agar eski sessiya qolgan bo'lsa, tozalash
      if (wcProviderRef.current) {
        try {
          wcProviderRef.current.removeAllListeners();
          await wcProviderRef.current.disconnect();
        } catch (e) { /* ignore stale session errors */ }
        wcProviderRef.current = null;
      }

      const { EthereumProvider } = await import('@walletconnect/ethereum-provider');

      const wcProvider = await EthereumProvider.init({
        projectId: WC_PROJECT_ID,
        chains: [10], // Optimism — asosiy tarmoq
        optionalChains: [1, 10],
        showQrModal: true,
        // Mobil walletlarga to'liq method/event ro'yxati kerak
        methods: [
          'eth_sendTransaction',
          'eth_signTransaction',
          'personal_sign',
          'eth_sign',
          'eth_signTypedData',
          'eth_signTypedData_v4',
          'wallet_switchEthereumChain',
          'wallet_addEthereumChain',
        ],
        optionalMethods: [
          'eth_signTypedData_v3',
          'wallet_getPermissions',
          'wallet_requestPermissions',
        ],
        events: ['chainChanged', 'accountsChanged'],
        optionalEvents: ['connect', 'disconnect', 'session_update'],
        qrModalOptions: {
          themeMode: 'dark',
          themeVariables: {
            '--wcm-z-index': '99999',
          },
          // Mobilda Trust Wallet, MetaMask va boshqalarni yuqorida ko'rsatish
          explorerRecommendedWalletIds: [
            '4622a2b2d6af1c9844944291e5e7351a6aa24cd7b23099efac1b2fd875da31a0', // Trust Wallet
            'c57ca95b47569778a828d19178114f4db188b89b763c899ba0be274e97267d96', // MetaMask
            'fd20dc426fb37566d803205b19bbc1d4096b248ac04548e18e50c9403f29e418', // Coinbase
          ],
          // Mobil qurilmalarda walletlar ro'yxatini ko'rsatish
          mobileWallets: undefined, // default holatda barcha walletlar ko'rinadi
        },
        metadata: {
          name: 'NasiyaSale',
          description: 'DUR token credit trading platform',
          url: window.location.origin,
          icons: [`${window.location.origin}/favicon.ico`],
        },
        rpcMap: {
          1: 'https://eth.drpc.org',
          10: 'https://optimism.publicnode.com',
        },
      });

      // 2. Event listenerlarni OLDIN o'rnatish (enable() dan OLDIN)
      //    Bu muhim — ba'zi walletlar tezda javob qaytaradi
      wcProvider.on('display_uri', (uri) => {
        console.log('WC URI generated:', uri ? 'yes' : 'no');

        // Mobilda: agar modal wallet ilovasini ochmasa,
        // deep link orqali ochishga urinish
        if (isMobile() && uri) {
          // 500ms kutish — modal o'zi ochishi mumkin
          setTimeout(() => {
            // Agar hali ham biz sahifadamiz (wallet ochilmagan),
            // deep link bilan ochishga urinish
            if (document.visibilityState === 'visible') {
              // Trust Wallet deep link
              const trustDeepLink = `trust://wc?uri=${encodeURIComponent(uri)}`;
              // Universal link — barcha walletlar uchun
              const wcUniversalLink = `https://walletconnect.org/wc?uri=${encodeURIComponent(uri)}`;

              // Foydalanuvchiga xabar berish
              console.log('Attempting mobile deep link...');

              // Avval trust wallet, keyin universal
              try {
                window.location.href = trustDeepLink;
              } catch (e) {
                window.location.href = wcUniversalLink;
              }
            }
          }, 1500);
        }
      });

      // 3. Ulanishni boshlash — timeout bilan
      const enableTimeout = isMobile() ? 120000 : 60000; // Mobilda 2 daqiqa
      const enablePromise = wcProvider.enable();
      const timeoutPromise = new Promise((_, reject) =>
        setTimeout(() => reject(new Error('WalletConnect timeout')), enableTimeout)
      );

      await Promise.race([enablePromise, timeoutPromise]);

      wcProviderRef.current = wcProvider;

      const p = new ethers.BrowserProvider(wcProvider);
      const s = await p.getSigner();
      const addr = await s.getAddress();
      const net = await p.getNetwork();
      const cid = Number(net.chainId);

      setProvider(p); setSigner(s); setAccount(addr); setChainId(cid); setWalletType('walletconnect');
      const { tokenContracts } = initContracts(s);

      if (cid !== OP_MAINNET.chainId) {
        toast.error("Optimism tarmog'iga o'ting!");
        try {
          await wcProvider.request({
            method: 'wallet_switchEthereumChain',
            params: [{ chainId: '0xA' }],
          });
        } catch (switchErr) {
          console.error('WC switch chain error:', switchErr);
        }
      } else {
        await fetchBalances(addr, tokenContracts);
      }

      // 4. Sessiya davomidagi eventlar
      wcProvider.on('accountsChanged', async (accounts) => {
        if (accounts.length === 0) {
          disconnect();
        } else {
          try {
            const newP = new ethers.BrowserProvider(wcProvider);
            const newS = await newP.getSigner();
            const newAddr = await newS.getAddress();
            setProvider(newP); setSigner(newS); setAccount(newAddr);
            const { tokenContracts: tc } = initContracts(newS);
            await fetchBalances(newAddr, tc);
          } catch (e) {
            console.error('WC accountsChanged error:', e);
          }
        }
      });

      wcProvider.on('chainChanged', (chainIdHex) => {
        const newCid = typeof chainIdHex === 'string'
          ? parseInt(chainIdHex, 16)
          : Number(chainIdHex);
        setChainId(newCid);
        if (newCid !== OP_MAINNET.chainId) {
          toast.error("Optimism tarmog'iga o'ting!");
        }
      });

      wcProvider.on('disconnect', (error) => {
        console.log('WC disconnected:', error?.message || 'user initiated');
        disconnect();
      });

      // 5. Session ping — sessiya tirikligini tekshirish
      wcProvider.on('session_delete', () => {
        console.log('WC session deleted');
        disconnect();
      });

      toast.success("Wallet ulandi!");
      return true;
    } catch (e) {
      console.error('WalletConnect error:', e);
      // Xato bo'lsa provider ni tozalash
      if (wcProviderRef.current) {
        try {
          wcProviderRef.current.removeAllListeners();
          await wcProviderRef.current.disconnect();
        } catch (_) { /* ignore */ }
        wcProviderRef.current = null;
      }

      if (
        e?.message?.includes('rejected') ||
        e?.message?.includes('dismissed') ||
        e?.message?.includes('User closed') ||
        e?.message?.includes('Connection request reset')
      ) {
        // Foydalanuvchi o'zi yopdi — xato ko'rsatmaslik
      } else if (e?.message?.includes('timeout')) {
        toast.error("Ulanish vaqti tugadi. Qaytadan urinib ko'ring.");
      } else {
        toast.error("WalletConnect ulanishda xato. Qaytadan urinib ko'ring.");
      }
      return false;
    } finally { setConnecting(false); }
  }, [initContracts, fetchBalances, disconnect]);

  // ══════════════════════════════════════════════════════════════
  // Manzil bilan ko'rish (read-only)
  // ══════════════════════════════════════════════════════════════

  const connectByAddress = useCallback(async (address) => {
    if (!ethers.isAddress(address)) { toast.error("Noto'g'ri manzil!"); return false; }
    setConnecting(true);
    try {
      const p = new ethers.JsonRpcProvider(READ_ONLY_RPC);
      setProvider(p); setSigner(null); setAccount(address); setChainId(10); setWalletType('readonly');
      const { tokenContracts } = initContracts(p);
      await fetchBalances(address, tokenContracts);
      return true;
    } catch { toast.error("Ulanishda xato"); return false; }
    finally { setConnecting(false); }
  }, [initContracts, fetchBalances]);

  const refreshBalances = useCallback(() => {
    fetchBalances(account, tokens);
  }, [account, tokens, fetchBalances]);

  // MetaMask event listener
  useEffect(() => {
    if (!window.ethereum || walletType !== 'metamask') return;
    const onAccounts = async (accs) => {
      if (accs.length === 0) {
        disconnect();
      } else {
        try {
          const p = new ethers.BrowserProvider(window.ethereum);
          const s = await p.getSigner();
          const addr = await s.getAddress();
          setProvider(p); setSigner(s); setAccount(addr);
          const { tokenContracts } = initContracts(s);
          await fetchBalances(addr, tokenContracts);
        } catch (e) {
          console.error('accountsChanged error:', e);
          disconnect();
        }
      }
    };
    const onChain = () => window.location.reload();
    window.ethereum.on('accountsChanged', onAccounts);
    window.ethereum.on('chainChanged', onChain);
    return () => { window.ethereum.removeListener('accountsChanged', onAccounts); window.ethereum.removeListener('chainChanged', onChain); };
  }, [walletType, disconnect, initContracts, fetchBalances]);

  // Sahifa qayta ochilganda WC sessiyani tozalash
  // (stale session muammosini oldini olish)
  useEffect(() => {
    return () => {
      if (wcProviderRef.current) {
        wcProviderRef.current.removeAllListeners();
      }
    };
  }, []);

  const ensureApproval = async (tokenKey, amountRaw) => {
    const token = tokens[tokenKey];
    if (!token || !account) throw new Error("Token topilmadi");
    if (walletType === 'readonly') throw new Error("Faqat ko'rish rejimi");
    const allowance = await token.allowance(account, CONTRACT_ADDRESS);
    if (allowance < amountRaw) {
      const tid = toast.loading(`${tokenKey} uchun ruxsat so'ralmoqda...`);
      const tx = await token.connect(signer).approve(CONTRACT_ADDRESS, amountRaw);
      await tx.wait();
      toast.dismiss(tid);
    }
  };

  return (
    <Web3Context.Provider value={{
      provider, signer, account, chainId, contract, readOnlyContract, tokens, connecting,
      isCorrectNetwork, walletBalances, walletType,
      connectMetaMask, connectWalletConnect, connectByAddress, disconnect,
      refreshBalances, ensureApproval, switchToOptimism,
      isReadOnly: walletType === 'readonly',
    }}>
      {children}
    </Web3Context.Provider>
  );
}

export const useWeb3 = () => {
  const ctx = useContext(Web3Context);
  if (!ctx) throw new Error('useWeb3 must be inside Web3Provider');
  return ctx;
};
