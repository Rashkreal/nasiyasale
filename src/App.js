import React from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { Web3Provider } from './hooks/useWeb3';
import { LangProvider } from './hooks/useLang';
import { ThemeProvider } from './hooks/useTheme';
import Layout from './components/Layout';
import Dashboard from './pages/Dashboard';
import CreateListing from './pages/CreateListing';
import Listings from './pages/Listings';
import Approved from './pages/Approved';
import BLLevel from './pages/BLLevel';
import TxHistory from './pages/TxHistory';
import About from './pages/About';
import Vault from './pages/Vault';
import Tokenomics from './pages/Tokenomics';
import './App.css';

export default function App() {
  return (
    <ThemeProvider>
      <LangProvider>
        <Web3Provider>
          <BrowserRouter>
            <Toaster position="top-right" toastOptions={{
              style: { background: 'var(--bg-card)', color: 'var(--text-primary)', border: '1px solid var(--border)', fontSize: '14px' },
              success: { iconTheme: { primary: 'var(--success)', secondary: 'white' } },
              error: { iconTheme: { primary: 'var(--danger)', secondary: 'white' } },
            }} />
            <Layout>
              <Routes>
                <Route path="/" element={<Dashboard />} />
                <Route path="/create" element={<CreateListing />} />
                <Route path="/listings" element={<Listings />} />
                <Route path="/approved" element={<Approved />} />
                <Route path="/bl" element={<BLLevel />} />
                <Route path="/history" element={<TxHistory />} />
                <Route path="/about" element={<About />} />
                <Route path="/vault" element={<Vault />} />
                <Route path="/tokenomics" element={<Tokenomics />} />
              </Routes>
            </Layout>
          </BrowserRouter>
        </Web3Provider>
      </LangProvider>
    </ThemeProvider>
  );
}
