# NasiyaSale — Likvidlik strategiyasi (DUR/USDC, Uniswap V4)

## Asosiy g'oya

Likvidlik **markazlashtirilgan (concentrated) diapazonlarda** bosqichma-bosqich kiritiladi.
Har bir diapazon narxni **2 baravar** oshiradi va **10 ta segment**ga bo'linadi;
har bir segment narxni taxminan **1%** ga ko'taradi.

Qoida:
- Har bir diapazonga taxminan **7,000 USDC** kiritiladi (1-diapazon ~7,400).
- Narx oshgani sayin har bir diapazondagi **DUR miqdori taxminan yarmiga kamayadi**
  (chunki bir xil USDC yuqori narxda kamroq DUR sotib oladi).
- Bu sikl narx tabiiy bozor nazoratiga o'tguncha davom etadi.

## Maqsad

Bu strategiya **boshlang'ich (seed) likvidlik** — bozorni ishga tushirish uchun.
Narx tartibli, bosqichma-bosqich o'sadi; keskin sakrash yoki qulash bo'lmaydi.
Yetarlicha foydalanuvchi o'zi likvidlik kirita boshlagach va bozor narxni
o'zi boshqaradigan darajaga yetgach, ushbu rejali kiritish to'xtaydi —
narxni keyin to'liq ochiq bozor belgilaydi.

---

## 1–5 diapazon (rejalashtirilgan, batafsil)

### 1-diapazon: $0.01 → $0.02
| Segment | P_low | P_high | L | DUR | USDC |
|---|---|---|---|---|---|
| 1 | 0.010000 | 0.010718 | 200 500 | 68 400 | 708 |
| 2 | 0.010718 | 0.011487 | 193 600 | 62 100 | 716 |
| 3 | 0.011487 | 0.012311 | 186 900 | 56 200 | 723 |
| 4 | 0.012311 | 0.013195 | 180 500 | 50 800 | 731 |
| 5 | 0.013195 | 0.014142 | 174 300 | 45 800 | 738 |
| 6 | 0.014142 | 0.015157 | 168 300 | 41 100 | 746 |
| 7 | 0.015157 | 0.016245 | 162 500 | 36 800 | 753 |
| 8 | 0.016245 | 0.017411 | 156 900 | 32 700 | 761 |
| 9 | 0.017411 | 0.018660 | 151 500 | 28 900 | 769 |
| 10 | 0.018660 | 0.020000 | 146 300 | 25 300 | 777 |
| **Jami** | | | | **~448 100 DUR** | **~7 400 USDC** |

### 2-diapazon: $0.02 → $0.04
| Segment | P_low | P_high | L | DUR | USDC |
|---|---|---|---|---|---|
| 1 | 0.020000 | 0.021435 | 141 900 | 34 200 | 708 |
| 2 | 0.021435 | 0.022974 | 136 200 | 31 800 | 705 |
| 3 | 0.022974 | 0.024623 | 130 800 | 29 500 | 703 |
| 4 | 0.024623 | 0.026390 | 125 600 | 27 400 | 701 |
| 5 | 0.026390 | 0.028284 | 120 700 | 25 400 | 699 |
| 6 | 0.028284 | 0.030314 | 116 000 | 23 600 | 697 |
| 7 | 0.030314 | 0.032490 | 111 400 | 21 800 | 696 |
| 8 | 0.032490 | 0.034822 | 107 100 | 20 100 | 695 |
| 9 | 0.034822 | 0.037321 | 103 000 | 18 600 | 693 |
| 10 | 0.037321 | 0.040000 | 99 000 | 17 100 | 692 |
| **Jami** | | | | **~249 500 DUR** | **~7 000 USDC** |

### 3-diapazon: $0.04 → $0.08
| Segment | P_low | P_high | L | DUR | USDC |
|---|---|---|---|---|---|
| 1 | 0.040000 | 0.042871 | 100 300 | 17 100 | 706 |
| 2 | 0.042871 | 0.045948 | 96 300 | 15 900 | 703 |
| 3 | 0.045948 | 0.049246 | 92 500 | 14 800 | 701 |
| 4 | 0.049246 | 0.052780 | 88 800 | 13 700 | 699 |
| 5 | 0.052780 | 0.056568 | 85 300 | 12 700 | 697 |
| 6 | 0.056568 | 0.060629 | 82 000 | 11 800 | 696 |
| 7 | 0.060629 | 0.064980 | 78 800 | 10 900 | 694 |
| 8 | 0.064980 | 0.069644 | 75 700 | 10 100 | 693 |
| 9 | 0.069644 | 0.074642 | 72 800 | 9 300 | 692 |
| 10 | 0.074642 | 0.080000 | 70 000 | 8 600 | 691 |
| **Jami** | | | | **~125 000 DUR** | **~7 000 USDC** |

### 4-diapazon: $0.08 → $0.16
| Segment | P_low | P_high | L | DUR | USDC |
|---|---|---|---|---|---|
| 1 | 0.080000 | 0.085742 | 71 000 | 8 600 | 706 |
| 2 | 0.085742 | 0.091896 | 68 100 | 7 900 | 703 |
| 3 | 0.091896 | 0.098492 | 65 400 | 7 400 | 701 |
| 4 | 0.098492 | 0.105560 | 62 800 | 6 900 | 699 |
| 5 | 0.105560 | 0.113136 | 60 300 | 6 400 | 697 |
| 6 | 0.113136 | 0.121259 | 58 000 | 5 900 | 696 |
| 7 | 0.121259 | 0.129961 | 55 700 | 5 500 | 694 |
| 8 | 0.129961 | 0.139288 | 53 500 | 5 100 | 693 |
| 9 | 0.139288 | 0.149284 | 51 400 | 4 700 | 692 |
| 10 | 0.149284 | 0.160000 | 49 400 | 4 300 | 691 |
| **Jami** | | | | **~62 700 DUR** | **~7 000 USDC** |

### 5-diapazon: $0.16 → $0.32
| Segment | P_low | P_high | L | DUR | USDC |
|---|---|---|---|---|---|
| 1 | 0.160000 | 0.171484 | 50 200 | 4 300 | 706 |
| 2 | 0.171484 | 0.183793 | 48 200 | 4 000 | 703 |
| 3 | 0.183793 | 0.196985 | 46 300 | 3 700 | 701 |
| 4 | 0.196985 | 0.211121 | 44 400 | 3 400 | 699 |
| 5 | 0.211121 | 0.226273 | 42 700 | 3 200 | 697 |
| 6 | 0.226273 | 0.242518 | 41 000 | 2 900 | 696 |
| 7 | 0.242518 | 0.259921 | 39 400 | 2 700 | 694 |
| 8 | 0.259921 | 0.278577 | 37 800 | 2 500 | 693 |
| 9 | 0.278577 | 0.298568 | 36 400 | 2 300 | 692 |
| 10 | 0.298568 | 0.320000 | 34 900 | 2 100 | 691 |
| **Jami** | | | | **~31 100 DUR** | **~7 000 USDC** |

---

## 6–10 diapazon (proyeksiya — ayni qoida bo'yicha)

Bu diapazonlar yuqoridagi naqshning davomi: narx 2x, USDC ~7,000, DUR yarmiga kamayadi.

| # | Narx diapazoni | DUR (~) | USDC (~) |
|---|---|---|---|
| 6 | $0.32 → $0.64 | 15 550 | 7 000 |
| 7 | $0.64 → $1.28 | 7 775 | 7 000 |
| 8 | $1.28 → $2.56 | 3 888 | 7 000 |
| 9 | $2.56 → $5.12 | 1 944 | 7 000 |
| 10 | $5.12 → $10.24 | 972 | 7 000 |

**1–10 jami:** ~946,500 DUR (umumiy supply'ning ~0.95%), ~70,400 USDC.

Naqsh shu tarzda yana davom etishi mumkin (11, 12, … diapazon), lekin har bir
yangi diapazon narxni yana 2x oshirgani sayin kerakli DUR tobora kamayib boradi.
Amalda rejali kiritish bozor o'zini-o'zi boshqaradigan darajaga yetganda to'xtaydi.

---

## Eslatma

- Bu raqamlar **rejalashtirilgan** strategiya; har bir diapazon kiritilgach,
  zanjirdagi haqiqiy tranzaksiyalar bilan tasdiqlanadi.
- L (liquidity) — Uniswap V4 pozitsiyasining likvidlik birligi.
- DUR/USDC qiymatlari taxminiy; aniq miqdor kiritish vaqtidagi narxga bog'liq.
