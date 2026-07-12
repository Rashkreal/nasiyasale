import React from 'react';
import { Shield, Zap, TrendingUp, Lock, Users, Info } from 'lucide-react';
import { useLang } from '../hooks/useLang';

export default function About() {
  const { t } = useLang();

  return (
    <div style={{ maxWidth: '850px', margin: '0 auto' }}>
      <div className="page-header">
        <h1 className="page-title">
          <Info size={24} style={{ marginRight: '10px' }} />
          About NasiyaSale
        </h1>
        <p className="page-subtitle">
          A decentralized, ownerless deferred-payment marketplace for the DUR token
        </p>
      </div>

      {/* 1. General Principles */}
      <section className="card" style={{ padding: '24px', marginBottom: '20px' }}>
        <h2 style={{ fontSize: '1.3rem', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Shield size={22} color="var(--accent-bright)" />
          General Principles
        </h2>
        <ul style={{ lineHeight: 1.8, paddingLeft: '20px', color: 'var(--text-secondary)' }}>
          <li><strong>Ownerless and immutable:</strong> The contract has no admin, owner, or upgrade path. It is deployed on Arbitrum One and can never be changed by anyone. Tokens sent to the wrong address cannot be recovered.</li>
          <li><strong>Everything is open:</strong> All listings, prices, and statuses are transparent on-chain. There are no hidden privileges.</li>
          <li><strong>Islamic principles:</strong> In collateralized trades, only the debt-equivalent amount of collateral is taken; any surplus is returned to the buyer (rahn). No interest (riba), no penalties.</li>
        </ul>
      </section>

      {/* 2. Collateralized Trading */}
      <section className="card" style={{ padding: '24px', marginBottom: '20px' }}>
        <h2 style={{ fontSize: '1.3rem', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Lock size={22} color="var(--warning)" />
          Collateralized Trading
        </h2>
        <ul style={{ lineHeight: 1.8, paddingLeft: '20px', color: 'var(--text-secondary)' }}>
          <li><strong>Collateral tokens:</strong> Only WBTC and WETH are accepted.</li>
          <li><strong>Who can post a listing?</strong> Both the seller and the buyer can post a collateralized listing. The buyer transfers collateral to the contract when posting. The seller transfers DUR to the contract when posting.</li>
          <li><strong>Prices:</strong> The collateral price is taken from Chainlink at listing time and stays locked for the whole trade. If the price hasn't updated in the last 48 hours, a fallback mechanism kicks in.</li>
          <li><strong>Payment:</strong> The buyer can pay in USDC at any time — early or late. Once paid, the collateral is returned and the buyer earns BL points.</li>
          <li><strong>Default (if unpaid):</strong> For an overdue collateralized listing, <strong>either the seller or the buyer</strong> can "claim" it. The seller receives only the debt-equivalent amount of collateral; the rest is returned to the buyer.</li>
          <li><strong>Extra collateral buffer:</strong> The listing creator can increase the collateral value by 0-20%, which protects against price movement.</li>
        </ul>
      </section>

      {/* 3. Uncollateralized Trading */}
      <section className="card" style={{ padding: '24px', marginBottom: '20px' }}>
        <h2 style={{ fontSize: '1.3rem', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Users size={22} color="var(--success)" />
          Uncollateralized Trading (BL-based)
        </h2>
        <ul style={{ lineHeight: 1.8, paddingLeft: '20px', color: 'var(--text-secondary)' }}>
          <li><strong>Business Level (BL):</strong> Uncollateralized trading is only available to buyers with sufficient BL points. BL points accumulate over time through successful payments.</li>
          <li><strong>BL accounting:</strong>
            <ul>
              <li>In collateralized trades: 10% of the DUR amount is added as BL.</li>
              <li>In uncollateralized trades: 100% of the DUR amount is added as BL (a reward for the higher risk).</li>
            </ul>
          </li>
          <li><strong>How does it work?</strong> The buyer posts an uncollateralized listing and BL is reserved. Once the seller approves, DUR is transferred to the buyer. If the buyer pays on time, BL increases further.</li>
          <li><strong>If unpaid:</strong> The buyer's BL with that seller resets to zero, they're blacklisted, and can't post new uncollateralized listings. To get off the blacklist, the debt must be repaid in USDC via <strong>Pay After Default</strong> (BL is not restored, but the ability to trade uncollateralized returns).</li>
          <li><strong>BL limit:</strong> Total active uncollateralized debt with a single seller cannot exceed 10x their BL. This caps the risk.</li>
        </ul>
      </section>

      {/* 4. Price Deviation Protection */}
      <section className="card" style={{ padding: '24px', marginBottom: '20px' }}>
        <h2 style={{ fontSize: '1.3rem', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <TrendingUp size={22} color="var(--info)" />
          Price Deviation Protection (anti-flash-loan)
        </h2>
        <ul style={{ lineHeight: 1.8, paddingLeft: '20px', color: 'var(--text-secondary)' }}>
          <li><strong>Listing creator's limit:</strong> For every collateralized listing, the creator sets a maximum price deviation percentage (0.01%-20%). This value appears on the listing card as "limit: X.XX%".</li>
          <li><strong>Automatic protection:</strong> At approval time, the live price from Chainlink is compared against the price at listing time. If the difference exceeds the set percentage, the contract automatically reverts the transaction.</li>
          <li><strong>Default threshold:</strong> If either party doesn't specify an exact percentage, the contract automatically applies a 2% limit.</li>
          <li><strong>Two-sided:</strong> The approver can also set their own limit. Whichever of the two limits is stricter is the one that applies.</li>
        </ul>
      </section>

      {/* 5. Oracle */}
      <section className="card" style={{ padding: '24px', marginBottom: '20px' }}>
        <h2 style={{ fontSize: '1.3rem', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Zap size={22} color="var(--accent-bright)" />
          Price Source (Oracle)
        </h2>
        <ul style={{ lineHeight: 1.8, paddingLeft: '20px', color: 'var(--text-secondary)' }}>
          <li><strong>Chainlink:</strong> All prices are sourced from Chainlink's WBTC/USD and ETH/USD feeds on Arbitrum One.</li>
          <li><strong>L2 Sequencer protection:</strong> If the Arbitrum sequencer goes down, all price-dependent actions are paused. Once the sequencer recovers, there's a 1-hour grace period.</li>
          <li><strong>Fallback price:</strong> If Chainlink is down for an extended period (more than 48 hours), the fallback price stored on the listing is used. Anyone can refresh this price (refreshSnapshot).</li>
        </ul>
      </section>

      {/* 6. Addresses — full list on the Tokenomics page */}
      <section className="card" style={{ padding: '24px', marginBottom: '20px' }}>
        <h2 style={{ fontSize: '1.3rem', marginBottom: '12px' }}>
          Network and Addresses
        </h2>
        <p style={{ color: 'var(--text-secondary)', lineHeight: 1.7, marginBottom: '8px' }}>
          NasiyaSale runs on <strong>Arbitrum One</strong> (Chain ID 42161).
          All token and contract addresses — DUR, USDC, WBTC, WETH, CreditSale, and Vault —
          are listed in full on the <strong>Tokenomics</strong> page and can be verified via Arbiscan links.
        </p>
      </section>
    </div>
  );
}