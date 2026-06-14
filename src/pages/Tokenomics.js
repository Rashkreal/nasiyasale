import React from 'react';
import { TrendingUp, Lock, Shield, Info } from 'lucide-react';
import { useLang } from '../hooks/useLang';

export default function Tokenomics() {
  const { t } = useLang();

  return (
    <div style={{ maxWidth: '850px', margin: '0 auto' }}>
      <div className="page-header">
        <h1 className="page-title">
          <TrendingUp size={24} style={{ marginRight: '10px' }} />
          Tokenomics
        </h1>
        <p className="page-subtitle">
          NasiyaSale ekotizimi va DUR tokeni iqtisodi
        </p>
      </div>

      {/* 1. DUR tokeni */}
      <section className="card" style={{ padding: '24px', marginBottom: '20px' }}>
        <h2 style={{ fontSize: '1.3rem', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Info size={22} color="var(--accent-bright)" />
          DUR tokeni
        </h2>
        <ul style={{ lineHeight: 1.8, paddingLeft: '20px', color: 'var(--text-secondary)' }}>
          <li><strong>Nomi:</strong> DUR (Durvodik)</li>
          <li><strong>Manzil:</strong> <code>0xf2f471dd1fBD278e54a81af7D5a22E3a38eA43Ff</code></li>
          <li><strong>Decimals:</strong> 18</li>
          <li><strong>Asosiy foydalanish:</strong> NasiyaSale platformasida nasiyaga sotiladigan token.</li>
        </ul>
      </section>

      {/* 2. Vault — DUR qulflash */}
      <section className="card" style={{ padding: '24px', marginBottom: '20px' }}>
        <h2 style={{ fontSize: '1.3rem', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Lock size={22} color="var(--warning)" />
          Vault — DUR qulflash
        </h2>
        <p style={{ fontSize: '14px', color: 'var(--text-secondary)', marginBottom: '16px' }}>
          Vault faqat <strong>owner</strong> tomonidan boshqariladi. Tokenlar uzoq muddatga qulflanadi va stream orqali vaqt bo‘yicha chiziqli ochiladi.
        </p>
        
        <h3 style={{ fontSize: '16px', marginTop: '20px', marginBottom: '12px' }}>Streamlar (DUR)</h3>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.9rem', marginBottom: '20px' }}>
          <thead>
            <tr style={{ borderBottom: '1px solid var(--border)' }}>
              <th style={{ textAlign: 'left', padding: '8px' }}>ID</th>
              <th style={{ textAlign: 'left', padding: '8px' }}>Jami</th>
              <th style={{ textAlign: 'left', padding: '8px' }}>Qolgan</th>
              <th style={{ textAlign: 'left', padding: '8px' }}>Yechish mumkin</th>
              <th style={{ textAlign: 'left', padding: '8px' }}>Tugash sanasi</th>
            </tr>
          </thead>
          <tbody>
            <tr style={{ borderBottom: '1px solid var(--border)' }}>
              <td style={{ padding: '8px', fontWeight: 600 }}>#2</td>
              <td style={{ padding: '8px' }}>1.00M DUR</td>
              <td style={{ padding: '8px' }}>938.90K DUR</td>
              <td style={{ padding: '8px', color: 'var(--success)' }}>434.42 DUR</td>
              <td style={{ padding: '8px' }}>23-may, 2027</td>
            </tr>
            <tr style={{ borderBottom: '1px solid var(--border)' }}>
              <td style={{ padding: '8px', fontWeight: 600 }}>#3</td>
              <td style={{ padding: '8px' }}>5.00M DUR</td>
              <td style={{ padding: '8px' }}>4.98M DUR</td>
              <td style={{ padding: '8px', color: 'var(--success)' }}>39.15K DUR</td>
              <td style={{ padding: '8px' }}>22-may, 2031</td>
            </tr>
            <tr style={{ borderBottom: '1px solid var(--border)' }}>
              <td style={{ padding: '8px', fontWeight: 600 }}>#4</td>
              <td style={{ padding: '8px' }}>50.00M DUR</td>
              <td style={{ padding: '8px' }}>49.89M DUR</td>
              <td style={{ padding: '8px', color: 'var(--success)' }}>195.72K DUR</td>
              <td style={{ padding: '8px' }}>20-may, 2036</td>
            </tr>
          </tbody>
        </table>

        <h3 style={{ fontSize: '16px', marginBottom: '12px' }}>NFT Locklar (DUR/USDC LP)</h3>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.9rem' }}>
          <thead>
            <tr style={{ borderBottom: '1px solid var(--border)' }}>
              <th style={{ textAlign: 'left', padding: '8px' }}>ID</th>
              <th style={{ textAlign: 'left', padding: '8px' }}>Hovuz</th>
              <th style={{ textAlign: 'left', padding: '8px' }}>Token ID</th>
              <th style={{ textAlign: 'left', padding: '8px' }}>Unlock sanasi</th>
              <th style={{ textAlign: 'left', padding: '8px' }}>Qolgan vaqt</th>
            </tr>
          </thead>
          <tbody>
            <tr style={{ borderBottom: '1px solid var(--border)' }}>
              <td style={{ padding: '8px', fontWeight: 600 }}>#0</td>
              <td style={{ padding: '8px' }}>DUR/USDC</td>
              <td style={{ padding: '8px' }}>#25217</td>
              <td style={{ padding: '8px' }}>23-may, 2027</td>
              <td style={{ padding: '8px' }}>~343 kun</td>
            </tr>
            <tr style={{ borderBottom: '1px solid var(--border)' }}>
              <td style={{ padding: '8px', fontWeight: 600 }}>#1</td>
              <td style={{ padding: '8px' }}>DUR/USDC</td>
              <td style={{ padding: '8px' }}>#25607</td>
              <td style={{ padding: '8px' }}>22-may, 2028</td>
              <td style={{ padding: '8px' }}>~708 kun</td>
            </tr>
            <tr style={{ borderBottom: '1px solid var(--border)' }}>
              <td style={{ padding: '8px', fontWeight: 600 }}>#2</td>
              <td style={{ padding: '8px' }}>DUR/USDC</td>
              <td style={{ padding: '8px' }}>#25608</td>
              <td style={{ padding: '8px' }}>22-may, 2029</td>
              <td style={{ padding: '8px' }}>~1073 kun</td>
            </tr>
            <tr style={{ borderBottom: '1px solid var(--border)' }}>
              <td style={{ padding: '8px', fontWeight: 600 }}>#3</td>
              <td style={{ padding: '8px' }}>DUR/USDC</td>
              <td style={{ padding: '8px' }}>#25609</td>
              <td style={{ padding: '8px' }}>22-may, 2030</td>
              <td style={{ padding: '8px' }}>~1438 kun</td>
            </tr>
          </tbody>
        </table>
      </section>

      {/* 3. Business Level (BL) */}
      <section className="card" style={{ padding: '24px', marginBottom: '20px' }}>
        <h2 style={{ fontSize: '1.3rem', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Shield size={22} color="var(--success)" />
          Business Level (BL)
        </h2>
        <ul style={{ lineHeight: 1.8, paddingLeft: '20px', color: 'var(--text-secondary)' }}>
          <li><strong>Nima?</strong> BL — bu on-chain ishonch darajasi. Har bir muvaffaqiyatli to‘lov BL ball keltiradi.</li>
          <li><strong>Qanday to‘planadi?</strong>
            <ul>
              <li>Garovli savdoda: DUR miqdorining 10% i BL sifatida qo‘shiladi.</li>
              <li>Garovsiz savdoda: DUR miqdorining 100% i BL sifatida qo‘shiladi.</li>
            </ul>
          </li>
          <li><strong>Cheklovlar:</strong> Bitta sotuvchi bilan faol garovsiz qarz BL’ning 10% dan oshmasligi kerak. Bu tizimni xavfsiz saqlaydi.</li>
          <li><strong>Jarima:</strong> To‘lovni o‘z vaqtida bajarmasangiz, o‘sha sotuvchi bilan BL nolga tushadi va qora ro‘yxatga kirasiz. Qora ro‘yxatdan chiqish uchun qarzni to‘lash kerak (BL qayta tiklanmaydi).</li>
        </ul>
      </section>

      {/* 4. Garov tizimi */}
      <section className="card" style={{ padding: '24px', marginBottom: '20px' }}>
        <h2 style={{ fontSize: '1.3rem', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Lock size={22} color="var(--info)" />
          Garov (Collateral)
        </h2>
        <ul style={{ lineHeight: 1.8, paddingLeft: '20px', color: 'var(--text-secondary)' }}>
          <li><strong>Qabul qilinadigan tokenlar:</strong> Faqat WBTC va WETH.</li>
          <li><strong>Narx manbai:</strong> Chainlink (L2 Sequencer himoyasi bilan).</li>
          <li><strong>Narx qulflash (snapshot):</strong> E’lon vaqtida narx olinadi.</li>
          <li><strong>Narx farqi himoyasi:</strong> Tasdiqlashda jonli narx snapshot bilan solishtiriladi; agar farq ruxsat etilgan foizdan oshsa, tranzaksiya rad etiladi (flash‑loan hujumidan himoya).</li>
          <li><strong>Ortiqcha garov:</strong> Sotuvchi faqat qarz miqdoricha garov oladi, qolgani xaridorga qaytariladi (rahn).</li>
        </ul>
      </section>

      {/* 5. Narx manbasi (Oracle) */}
      <section className="card" style={{ padding: '24px', marginBottom: '20px' }}>
        <h2 style={{ fontSize: '1.3rem', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <TrendingUp size={22} color="var(--accent-bright)" />
          Narx manbasi (Oracle)
        </h2>
        <ul style={{ lineHeight: 1.8, paddingLeft: '20px', color: 'var(--text-secondary)' }}>
          <li><strong>Chainlink:</strong> WBTC va ETH narxlari uchun.</li>
          <li><strong>Zaxira narx:</strong> Agar Chainlink 48 soatdan ortiq ishlamasa, listingdagi zaxira narx (Snapshot) ishlatiladi.</li>
        </ul>
      </section>
    </div>
  );
}