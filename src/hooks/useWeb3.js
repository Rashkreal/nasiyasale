import React, { createContext, useContext, useState, useCallback, useEffect, useRef } from 'react';
import { ethers } from 'ethers';
import {
  CONTRACT_ADDRESS,
  CONTRACT_ABI,
  ERC20_ABI,
  TOKEN_ADDRESSES,
  TOKEN_DECIMALS,
  OP_MAINNET,
} from '../abi/contract';
import toast from 'react-hot-toast';

const Web3Context = createContext(null);

const ALL_TOKENS = ['DUR', 'USDC', 'USDT', 'BLT', 'WBTC', 'WETH'];
const emptyBals = () => Object.fromEntries(ALL_TOKENS.map((k) => [k, '0']));

// WalletConnect Project ID — https://cloud.walletconnect.com
const WC_PROJECT_ID = '931c40a15bee2387d84ff99b93520df7';

// Read-only provider — wallet ulanmagan holda ham ishlaydi
const READ_ONLY_RPC = 'https://optimism.publicnode.com';

// Optimism Mainnet params
const OP_CHAIN_HEX = '0xA';

const OP_CHAIN_PARAMS = {
  chainId: OP_CHAIN_HEX,
  chainName: 'Optimism',
  nativeCurrency: {
    name: 'Ether',
    symbol: 'ETH',
    decimals: 18,
  },
  rpcUrls: [
    'https://optimism.publicnode.com',
    'https://mainnet.optimism.io',
  ],
  blockExplorerUrls: ['https://optimistic.etherscan.io'],
};

// Mobil qurilma ekanligini aniqlash
const isMobile = () => {
  return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(
    navigator.userAgent
  );
};

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

  const clearWalletSessionStorage = useCallback(async () => {
    try {
      const shouldRemove = (key) => {
        const k = String(key || '').toLowerCase();

        return (
          k.includes('walletconnect') ||
          k.includes('wc@') ||
          k.includes('wagmi') ||
          k.includes('web3modal') ||
          k.includes('coinbasewallet') ||
          k.includes('metamask') ||
          k.includes('recentwallet') ||
          k.includes('connectedwallet') ||
          k.includes('wcm') ||
          k.includes('walletlink') ||
          k.includes('@walletconnect') ||
          k.includes('wc_')
        );
      };

      const localKeys = [];
      for (let i = 0; i < localStorage.length; i += 1) {
        const key = localStorage.key(i);
        if (shouldRemove(key)) localKeys.push(key);
      }
      localKeys.forEach((key) => localStorage.removeItem(key));

      const sessionKeys = [];
      for (let i = 0; i < sessionStorage.length; i += 1) {
        const key = sessionStorage.key(i);
        if (shouldRemove(key)) sessionKeys.push(key);
      }
      sessionKeys.forEach((key) => sessionStorage.removeItem(key));

      // WalletConnect v2 ba'zan sessiyani IndexedDB ichida ham saqlaydi
      if (window.indexedDB && indexedDB.databases) {
        try {
          const dbs = await indexedDB.databases();

          await Promise.all(
            dbs
              .filter((db) => shouldRemove(db.name))
              .map(
                (db) =>
                  new Promise((resolve) => {
                    const req = indexedDB.deleteDatabase(db.name);
                    req.onsuccess = () => resolve(true);
                    req.onerror = () => resolve(false);
                    req.onblocked = () => resolve(false);
                  })
              )
          );
        } catch (e) {
          console.warn('IndexedDB cleanup failed:', e);
        }
      }

      console.log('Wallet session storage cleared:', {
        local: localKeys,
        session: sessionKeys,
      });
    } catch (e) {
      console.warn('clearWalletSessionStorage failed:', e);
    }
  }, []);

  // Boshlangich read-only contract — wallet ulanmagan holda ham ishlaydi
  useEffect(() => {
    try {
      const roProvider = new ethers.JsonRpcProvider(READ_ONLY_RPC);
      const roContract = new ethers.Contract(CONTRACT_ADDRESS, CONTRACT_ABI, roProvider);
      setReadOnlyContract(roContract);
    } catch (e) {
      console.error('read-only contract init:', e);
    }
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

  // Har qanday EIP-1193 provider uchun OP Mainnetga o'tish
  const requestSwitchToOptimism = useCallback(async (walletProvider) => {
    if (!walletProvider?.request) {
      toast.error('Wallet provider topilmadi');
      return false;
    }

    try {
      await walletProvider.request({
        method: 'wallet_switchEthereumChain',
        params: [{ chainId: OP_CHAIN_HEX }],
      });

      return true;
    } catch (err) {
      const code = err?.code;
      const msg = String(err?.message || '').toLowerCase();

      // 4902: walletda Optimism network qo'shilmagan
      if (
        code === 4902 ||
        msg.includes('unrecognized chain') ||
        msg.includes('not added') ||
        msg.includes('unknown chain')
      ) {
        try {
          await walletProvider.request({
            method: 'wallet_addEthereumChain',
            params: [OP_CHAIN_PARAMS],
          });

          await walletProvider.request({
            method: 'wallet_switchEthereumChain',
            params: [{ chainId: OP_CHAIN_HEX }],
          });

          return true;
        } catch (addErr) {
          console.error('add/switch Optimism error:', addErr);
          toast.error('Optimism Mainnet qo‘shish yoki ulash rad etildi');
          return false;
        }
      }

      if (code === 4001 || msg.includes('rejected') || msg.includes('denied')) {
        toast.error('Optimism Mainnetga o‘tish rad etildi');
        return false;
      }

      console.error('switch Optimism error:', err);
      toast.error('Optimism Mainnetga avtomatik o‘tib bo‘lmadi');
      return false;
    }
  }, []);

  const switchToOptimism = useCallback(async () => {
    if (!window.ethereum) {
      toast.error('MetaMask topilmadi');
      return false;
    }

    return requestSwitchToOptimism(window.ethereum);
  }, [requestSwitchToOptimism]);

  // ══════════════════════════════════════════════════════════════
  // Disconnect — WalletConnect cache/session tozalash bilan
  // ══════════════════════════════════════════════════════════════

  const disconnect = useCallback(
    async (options = {}) => {
      const { reload = false, silent = false } = options;

      if (disconnectingRef.current) return;
      disconnectingRef.current = true;

      try {
        // MetaMask permission revoke
        if (window.ethereum && walletType === 'metamask') {
          try {
            await window.ethereum.request({
              method: 'wallet_revokePermissions',
              params: [{ eth_accounts: {} }],
            });
          } catch (e) {
            // Ba'zi mobile walletlar revokePermissions qo'llamaydi
          }
        }

        // WalletConnect sessiyasini haqiqiy yopish
        if (wcProviderRef.current) {
          try {
            wcProviderRef.current.removeAllListeners?.();
          } catch (e) {
            // ignore
          }

          try {
            await wcProviderRef.current.disconnect?.();
          } catch (e) {
            // ignore
          }

          try {
            await wcProviderRef.current.close?.();
          } catch (e) {
            // ignore
          }

          wcProviderRef.current = null;
        }

        await clearWalletSessionStorage();

        setProvider(null);
        setSigner(null);
        setAccount(null);
        setChainId(null);
        setContract(null);
        setTokens({});
        setWalletType(null);
        setWalletBalances(emptyBals());

        if (!silent) {
          toast.success('Wallet uzildi');
        }

        if (reload) {
          setTimeout(() => {
            window.location.reload();
          }, 300);
        }
      } finally {
        disconnectingRef.current = false;
      }
    },
    [walletType, clearWalletSessionStorage]
  );

  // ══════════════════════════════════════════════════════════════
  // MetaMask ulanish
  // ══════════════════════════════════════════════════════════════

  const connectMetaMask = useCallback(async () => {
    if (!window.ethereum) {
      toast.error('MetaMask topilmadi!');
      return false;
    }

    setConnecting(true);

    try {
      const p = new ethers.BrowserProvider(window.ethereum);

      await p.send('eth_requestAccounts', []);

      const s = await p.getSigner();
      const addr = await s.getAddress();
      const net = await p.getNetwork();
      const cid = Number(net.chainId);

      setProvider(p);
      setSigner(s);
      setAccount(addr);
      setChainId(cid);
      setWalletType('metamask');

      const { tokenContracts } = initContracts(s);

      if (cid !== OP_MAINNET.chainId) {
        const switched = await requestSwitchToOptimism(window.ethereum);

        if (switched) {
          const newNet = await p.getNetwork();
          const newCid = Number(newNet.chainId);

          setChainId(newCid);

          if (newCid === OP_MAINNET.chainId) {
            await fetchBalances(addr, tokenContracts);
            toast.success('Optimism Mainnetga ulandi');
          } else {
            toast.error('Optimism Mainnetga o‘ting');
          }
        }
      } else {
        await fetchBalances(addr, tokenContracts);
      }

      toast.success('Wallet ulandi!');
      return true;
    } catch (e) {
      console.error('MetaMask connect error:', e);

      if (!String(e?.message || '').toLowerCase().includes('rejected')) {
        toast.error('Ulanishda xato');
      }

      return false;
    } finally {
      setConnecting(false);
    }
  }, [initContracts, fetchBalances, requestSwitchToOptimism]);

  // ══════════════════════════════════════════════════════════════
  // WalletConnect ulanish — cache/session + OP Mainnet auto request
  // ══════════════════════════════════════════════════════════════

  const connectWalletConnect = useCallback(async () => {
    setConnecting(true);

    try {
      // Har yangi WalletConnect urinishida eski session/cache tozalanadi.
      // Bu telefonda boshqa account tanlash imkonini beradi.
      await clearWalletSessionStorage();

      // Agar eski provider ref qolgan bo'lsa, yopamiz
      if (wcProviderRef.current) {
        try {
          wcProviderRef.current.removeAllListeners?.();
        } catch (e) {
          // ignore
        }

        try {
          await wcProviderRef.current.disconnect?.();
        } catch (e) {
          // ignore stale session errors
        }

        try {
          await wcProviderRef.current.close?.();
        } catch (e) {
          // ignore
        }

        wcProviderRef.current = null;
      }

      const { EthereumProvider } = await import('@walletconnect/ethereum-provider');

      const wcProvider = await EthereumProvider.init({
        projectId: WC_PROJECT_ID,

        // Optimism asosiy chain
        chains: [10],
        optionalChains: [1, 10],

        showQrModal: true,

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
        optionalEvents: ['connect', 'disconnect', 'session_update', 'session_delete'],

        qrModalOptions: {
          themeMode: 'dark',
          themeVariables: {
            '--wcm-z-index': '99999',
          },
          explorerRecommendedWalletIds: [
            '4622a2b2d6af1c9844944291e5e7351a6aa24cd7b23099efac1b2fd875da31a0',
            'c57ca95b47569778a828d19178114f4db188b89b763c899ba0be274e97267d96',
            'fd20dc426fb37566d803205b19bbc1d4096b248ac04548e18e50c9403f29e418',
          ],
          mobileWallets: undefined,
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

      // Enable'dan oldin listenerlar
      wcProvider.on('display_uri', (uri) => {
        console.log('WC URI generated:', uri ? 'yes' : 'no');

        if (isMobile() && uri) {
          setTimeout(() => {
            if (document.visibilityState === 'visible') {
              const trustDeepLink = `trust://wc?uri=${encodeURIComponent(uri)}`;
              const wcUniversalLink = `https://walletconnect.org/wc?uri=${encodeURIComponent(uri)}`;

              console.log('Attempting mobile deep link...');

              try {
                window.location.href = trustDeepLink;
              } catch (e) {
                window.location.href = wcUniversalLink;
              }
            }
          }, 1500);
        }
      });

      const enableTimeout = isMobile() ? 120000 : 60000;

      const enablePromise = wcProvider.enable();
      const timeoutPromise = new Promise((_, reject) => {
        setTimeout(() => reject(new Error('WalletConnect timeout')), enableTimeout);
      });

      await Promise.race([enablePromise, timeoutPromise]);

      wcProviderRef.current = wcProvider;

      let p = new ethers.BrowserProvider(wcProvider);
      let s = await p.getSigner();
      let addr = await s.getAddress();
      let net = await p.getNetwork();
      let cid = Number(net.chainId);

      setProvider(p);
      setSigner(s);
      setAccount(addr);
      setChainId(cid);
      setWalletType('walletconnect');

      let { tokenContracts } = initContracts(s);

      if (cid !== OP_MAINNET.chainId) {
        const switched = await requestSwitchToOptimism(wcProvider);

        if (switched) {
          // Switchdan keyin provider/signer/networkni qayta o'qiymiz
          p = new ethers.BrowserProvider(wcProvider);
          s = await p.getSigner();
          addr = await s.getAddress();
          net = await p.getNetwork();
          cid = Number(net.chainId);

          setProvider(p);
          setSigner(s);
          setAccount(addr);
          setChainId(cid);

          const next = initContracts(s);
          tokenContracts = next.tokenContracts;

          if (cid === OP_MAINNET.chainId) {
            await fetchBalances(addr, tokenContracts);
            toast.success('Optimism Mainnetga ulandi');
          } else {
            toast.error('Optimism Mainnetga o‘ting');
          }
        } else {
          toast.error('Optimism Mainnetga o‘tmasdan savdo qilib bo‘lmaydi');
        }
      } else {
        await fetchBalances(addr, tokenContracts);
      }

      wcProvider.on('accountsChanged', async (accounts) => {
        if (!accounts || accounts.length === 0) {
          disconnect({ reload: true, silent: true });
          return;
        }

        try {
          const newP = new ethers.BrowserProvider(wcProvider);
          const newS = await newP.getSigner();
          const newAddr = await newS.getAddress();
          const newNet = await newP.getNetwork();
          const newCid = Number(newNet.chainId);

          setProvider(newP);
          setSigner(newS);
          setAccount(newAddr);
          setChainId(newCid);

          const { tokenContracts: tc } = initContracts(newS);

          if (newCid !== OP_MAINNET.chainId) {
            await requestSwitchToOptimism(wcProvider);
          } else {
            await fetchBalances(newAddr, tc);
          }
        } catch (e) {
          console.error('WC accountsChanged error:', e);
          disconnect({ reload: true, silent: true });
        }
      });

      wcProvider.on('chainChanged', async (chainIdHex) => {
        const newCid =
          typeof chainIdHex === 'string' ? parseInt(chainIdHex, 16) : Number(chainIdHex);

        setChainId(newCid);

        if (newCid !== OP_MAINNET.chainId) {
          toast.error('Optimism Mainnetga o‘ting');
          return;
        }

        try {
          const newP = new ethers.BrowserProvider(wcProvider);
          const newS = await newP.getSigner();
          const newAddr = await newS.getAddress();

          setProvider(newP);
          setSigner(newS);
          setAccount(newAddr);

          const { tokenContracts: tc } = initContracts(newS);
          await fetchBalances(newAddr, tc);
        } catch (e) {
          console.error('WC chainChanged refresh error:', e);
        }
      });

      wcProvider.on('disconnect', (error) => {
        console.log('WC disconnected:', error?.message || 'user initiated');
        disconnect({ reload: true, silent: true });
      });

      wcProvider.on('session_delete', () => {
        console.log('WC session deleted');
        disconnect({ reload: true, silent: true });
      });

      toast.success('Wallet ulandi!');
      return true;
    } catch (e) {
      console.error('WalletConnect error:', e);

      if (wcProviderRef.current) {
        try {
          wcProviderRef.current.removeAllListeners?.();
        } catch (_) {
          // ignore
        }

        try {
          await wcProviderRef.current.disconnect?.();
        } catch (_) {
          // ignore
        }

        try {
          await wcProviderRef.current.close?.();
        } catch (_) {
          // ignore
        }

        wcProviderRef.current = null;
      }

      await clearWalletSessionStorage();

      const msg = String(e?.message || '');

      if (
        msg.includes('rejected') ||
        msg.includes('dismissed') ||
        msg.includes('User closed') ||
        msg.includes('Connection request reset')
      ) {
        // Foydalanuvchi o'zi yopdi — xato ko'rsatmaslik
      } else if (msg.includes('timeout')) {
        toast.error("Ulanish vaqti tugadi. Qaytadan urinib ko'ring.");
      } else {
        toast.error("WalletConnect ulanishda xato. Qaytadan urinib ko'ring.");
      }

      return false;
    } finally {
      setConnecting(false);
    }
  }, [
    initContracts,
    fetchBalances,
    disconnect,
    clearWalletSessionStorage,
    requestSwitchToOptimism,
  ]);

  // ══════════════════════════════════════════════════════════════
  // Manzil bilan ko'rish — read-only
  // ══════════════════════════════════════════════════════════════

  const connectByAddress = useCallback(
    async (address) => {
      if (!ethers.isAddress(address)) {
        toast.error("Noto'g'ri manzil!");
        return false;
      }

      setConnecting(true);

      try {
        const p = new ethers.JsonRpcProvider(READ_ONLY_RPC);

        setProvider(p);
        setSigner(null);
        setAccount(address);
        setChainId(10);
        setWalletType('readonly');

        const { tokenContracts } = initContracts(p);
        await fetchBalances(address, tokenContracts);

        return true;
      } catch (e) {
        console.error('connectByAddress:', e);
        toast.error('Ulanishda xato');
        return false;
      } finally {
        setConnecting(false);
      }
    },
    [initContracts, fetchBalances]
  );

  const refreshBalances = useCallback(() => {
    fetchBalances(account, tokens);
  }, [account, tokens, fetchBalances]);

  // MetaMask event listener
  useEffect(() => {
    if (!window.ethereum || walletType !== 'metamask') return undefined;

    const onAccounts = async (accs) => {
      if (!accs || accs.length === 0) {
        disconnect({ reload: true, silent: true });
        return;
      }

      try {
        const p = new ethers.BrowserProvider(window.ethereum);
        const s = await p.getSigner();
        const addr = await s.getAddress();
        const net = await p.getNetwork();
        const cid = Number(net.chainId);

        setProvider(p);
        setSigner(s);
        setAccount(addr);
        setChainId(cid);

        const { tokenContracts } = initContracts(s);

        if (cid !== OP_MAINNET.chainId) {
          await requestSwitchToOptimism(window.ethereum);
        } else {
          await fetchBalances(addr, tokenContracts);
        }
      } catch (e) {
        console.error('accountsChanged error:', e);
        disconnect({ reload: true, silent: true });
      }
    };

    const onChain = async (chainIdHex) => {
      const cid =
        typeof chainIdHex === 'string' ? parseInt(chainIdHex, 16) : Number(chainIdHex);

      setChainId(cid);

      if (cid !== OP_MAINNET.chainId) {
        toast.error('Optimism Mainnetga o‘ting');
        return;
      }

      try {
        const p = new ethers.BrowserProvider(window.ethereum);
        const s = await p.getSigner();
        const addr = await s.getAddress();

        setProvider(p);
        setSigner(s);
        setAccount(addr);

        const { tokenContracts } = initContracts(s);
        await fetchBalances(addr, tokenContracts);
      } catch (e) {
        console.error('chainChanged refresh error:', e);
      }
    };

    window.ethereum.on('accountsChanged', onAccounts);
    window.ethereum.on('chainChanged', onChain);

    return () => {
      window.ethereum.removeListener('accountsChanged', onAccounts);
      window.ethereum.removeListener('chainChanged', onChain);
    };
  }, [walletType, disconnect, initContracts, fetchBalances, requestSwitchToOptimism]);

  // Sahifa yopilganda listenerlarni olib tashlash
  useEffect(() => {
    return () => {
      if (wcProviderRef.current) {
        try {
          wcProviderRef.current.removeAllListeners?.();
        } catch (e) {
          // ignore
        }
      }
    };
  }, []);

  const ensureApproval = async (tokenKey, amountRaw) => {
    const token = tokens[tokenKey];

    if (!token || !account) {
      throw new Error('Token topilmadi');
    }

    if (walletType === 'readonly') {
      throw new Error("Faqat ko'rish rejimi");
    }

    const allowance = await token.allowance(account, CONTRACT_ADDRESS);

    if (allowance < amountRaw) {
      const tid = toast.loading(`${tokenKey} uchun ruxsat so'ralmoqda...`);

      try {
        const tx = await token.connect(signer).approve(CONTRACT_ADDRESS, amountRaw);
        await tx.wait();
      } finally {
        toast.dismiss(tid);
      }
    }
  };

  return (
    <Web3Context.Provider
      value={{
        provider,
        signer,
        account,
        chainId,
        contract,
        readOnlyContract,
        tokens,
        connecting,
        isCorrectNetwork,
        walletBalances,
        walletType,

        connectMetaMask,
        connectWalletConnect,
        connectByAddress,
        disconnect,

        refreshBalances,
        ensureApproval,
        switchToOptimism,

        isReadOnly: walletType === 'readonly',
      }}
    >
      {children}
    </Web3Context.Provider>
  );
}

export const useWeb3 = () => {
  const ctx = useContext(Web3Context);

  if (!ctx) {
    throw new Error('useWeb3 must be inside Web3Provider');
  }

  return ctx;
};