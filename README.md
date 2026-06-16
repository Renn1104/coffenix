# Coffenix Arabica - SPPK Pemilihan Supplier Kopi (AHP - TOPSIS)

**Coffenix Arabica** adalah sebuah Sistem Pendukung Keputusan (SPPK) berbasis web yang dirancang khusus untuk membantu pemilik bisnis kopi (roastery/café) dalam menentukan supplier biji kopi arabika terbaik secara objektif dan ilmiah. Sistem ini menggunakan kombinasi dua metode pengambilan keputusan multi-kriteria populer:
1. **Analytic Hierarchy Process (AHP)**: Untuk menentukan bobot kepentingan relatif dari masing-masing kriteria secara konsisten melalui perbandingan berpasangan (pairwise comparison).
2. **Technique for Order of Preference by Similarity to Ideal Solution (TOPSIS)**: Untuk merangking alternatif supplier berdasarkan kedekatan geometris terhadap solusi ideal positif dan terjauh dari solusi ideal negatif.

Aplikasi ini dibangun menggunakan framework **Flask (Python)** untuk backend komputasi matematika, dan **Vanilla JS/CSS** untuk frontend bertema dashboard modern dan responsif.

---

## 🚀 Fitur Utama

### 1. Dashboard SPPK
* **Ringkasan KPI**: Menampilkan jumlah supplier aktif, jumlah kriteria, nama supplier terbaik saat ini, serta nilai *Consistency Ratio* (CR) terbaru dari perhitungan AHP.
* **Visualisasi Data**: Chart interaktif menggunakan **Chart.js** untuk menunjukkan perbandingan skor preferensi akhir supplier (TOPSIS) dan porsi bobot kriteria (AHP).
* **Log Aktivitas Terbaru**: Catatan riwayat aksi administratif (seperti penambahan supplier, pembaruan kriteria, atau reset matriks) yang disimpan secara dinamis.

### 2. Kelola Kriteria & Perhitungan AHP
* **Manajemen CRUD Kriteria**: Menambah, mengubah, atau menghapus kriteria (misal: Aroma, Flavor, Aftertaste, Acidity, Body, Balance, Harga, dll) beserta tipenya (*Benefit* atau *Cost*).
* **Pairwise Comparison Editor**:
  * **Slider View**: Pengaturan perbandingan tingkat kepentingan antar-kriteria menggunakan slider interaktif yang mudah dipahami.
  * **Matrix View**: Pengisian nilai matriks perbandingan berpasangan secara langsung menggunakan skala Saaty (1-9).
* **Validasi Konsistensi Otomatis**: Menghitung secara real-time matriks normalisasi, *Priority Vector* (bobot), $\lambda_{max}$, *Consistency Index* (CI), dan *Consistency Ratio* (CR). Sistem akan memberikan peringatan jika nilai $CR \ge 0.1$ (matriks tidak konsisten).

### 3. Kelola Supplier & Alternatif
* **Manajemen CRUD Supplier**: Mengelola nama supplier dan kode alternatif (misal: `ALT-01`, `ALT-02`).
* **Input Nilai Dinamis**: Formulir penginputan nilai kriteria supplier (skala 1-100) yang menyesuaikan secara otomatis dengan kriteria yang aktif di sistem.
* **Fitur Pencarian & Halaman**: Mempermudah pencarian nama/alternatif supplier dengan pagination dan filter kelengkapan data nilai kriteria.

### 4. Dataset (Decision Matrix)
* **Tampilan Matriks Keputusan**: Menampilkan seluruh data mentah alternatif beserta skor kriteria dalam satu tabel bersih.
* **Ekspor CSV**: Mengunduh dataset matriks keputusan ke format `.csv` dengan satu klik.

### 5. Hasil Ranking & Detail Rumus TOPSIS
* **Podium Juara**: Representasi visual ala podium olahraga untuk peringkat Top 3 supplier dengan nilai preferensi tertinggi.
* **Tabel Ranking Final**: Hasil peringkat seluruh supplier lengkap dengan kode alternatif dan nilai preferensi ($V_i$).
* **Rincian Perhitungan Matematika**: *Accordion* interaktif yang membeberkan detail matriks di setiap langkah TOPSIS:
  1. Matriks Keputusan Asli ($D$).
  2. Matriks Normalisasi ($R$).
  3. Matriks Normalisasi Terbobot ($Y$).
  4. Solusi Ideal Positif ($A^+$) & Negatif ($A^-$).
  5. Jarak Separasi Positif ($D^+$) & Negatif ($D^-$).
  6. Nilai Preferensi Akhir ($V$).
* **Riwayat Perhitungan**: Menyimpan riwayat hasil eksekusi ranking sebelumnya untuk referensi perbandingan keputusan di masa lalu.

---

## 📁 Struktur Proyek

```text
coffenix/
│
├── app.py                  # Entry-point aplikasi Flask & definisi API Routing
├── calculations.py          # Modul kalkulasi algoritma AHP dan TOPSIS (NumPy)
│
├── static/
│   ├── css/
│   │   └── style.css       # Desain UI tema premium (Blue/SaaS) & responsive styles
│   └── js/
│       └── admin.js        # State manager, Chart.js, rendering views, & AJAX API
│
└── templates/
    └── admin.html          # Template HTML single-page dashboard admin
```

---

## 🧮 Dasar Teori Algoritma

### 1. Analytic Hierarchy Process (AHP)
AHP digunakan untuk mengukur bobot kriteria. Langkah-langkah perhitungan yang dijalankan pada `calculations.py`:
1. **Penyusunan Matriks Perbandingan**: Membuat matriks persegi $A_{n \times n}$ berdasarkan input pengguna.
2. **Normalisasi Matriks**: Membagi setiap elemen sel dengan jumlah total kolomnya:
   $$Normalized\_A_{ij} = \frac{A_{ij}}{\sum_{k=1}^n A_{kj}}$$
3. **Menghitung Bobot (Priority Vector)**: Mengambil rata-rata baris dari matriks yang telah dinormalisasi:
   $$W_i = \frac{\sum_{j=1}^n Normalized\_A_{ij}}{n}$$
4. **Uji Konsistensi**:
   * Menghitung nilai $\lambda_{max}$ dari rata-rata vector konsistensi.
   * Menghitung Consistency Index: $CI = \frac{\lambda_{max} - n}{n - 1}$
   * Menghitung Consistency Ratio: $CR = \frac{CI}{RI}$ (di mana $RI$ diperoleh dari tabel indeks acak Saaty sesuai ukuran matriks $n$). Nilai $CR < 0.1$ menyatakan matriks konsisten.

### 2. TOPSIS
TOPSIS menentukan ranking alternatif dari matriks keputusan $X_{m \times n}$:
1. **Normalisasi Matriks Keputusan ($R$)**:
   $$r_{ij} = \frac{x_{ij}}{\sqrt{\sum_{k=1}^m x_{kj}^2}}$$
2. **Normalisasi Terbobot ($Y$)**: mengalikan matriks ternormalisasi dengan bobot kriteria ($W$) hasil AHP:
   $$y_{ij} = r_{ij} \times w_j$$
3. **Menentukan Solusi Ideal Positif ($A^+$) dan Negatif ($A^-$)**:
   * **Benefit**: $A^+_j = \max(y_{ij})$, $A^-_j = \min(y_{ij})$
   * **Cost**: $A^+_j = \min(y_{ij})$, $A^-_j = \max(y_{ij})$
4. **Menghitung Jarak Separasi ($D^+$ dan $D^-$)**:
   $$D^+_i = \sqrt{\sum_{j=1}^n (y_{ij} - A^+_j)^2}$$
   $$D^-_i = \sqrt{\sum_{j=1}^n (y_{ij} - A^-_j)^2}$$
5. **Menghitung Nilai Preferensi Akhir ($V_i$)**:
   $$V_i = \frac{D^-_i}{D^+_i + D^-_i}$$
   Alternatif dengan nilai $V_i$ mendekati 1 adalah pilihan terbaik.

---

## 🛠️ Instalasi & Cara Menjalankan

Ikuti langkah berikut untuk memasang dan menjalankan aplikasi Coffenix di komputer Anda:

### Prerequisites
Pastikan Anda sudah menginstal **Python 3.x** di sistem Anda.

### 1. Clone atau Salin Folder Proyek
Unduh kode sumber aplikasi dan letakkan dalam satu direktori kerja (misalnya `coffenix/`).

### 2. Instal Dependensi
Gunakan terminal / PowerShell Anda, arahkan ke direktori proyek, lalu instal modul yang dibutuhkan:
```bash
pip install flask numpy
```

### 3. Jalankan Aplikasi
Jalankan server Flask dengan perintah berikut:
```bash
python app.py
```

Setelah dijalankan, terminal akan menunjukkan bahwa server lokal aktif:
```text
 * Running on http://127.0.0.1:5000/ (Press CTRL+C to quit)
```

### 4. Akses Web Dashboard
Buka browser web pilihan Anda (Chrome, Edge, Firefox, dll) lalu buka alamat:
👉 **[http://localhost:5000/](http://localhost:5000/)** atau **[http://localhost:5000/admin](http://localhost:5000/admin)**

---

## 💾 Penyimpanan Data (Persistence)
Aplikasi ini menggunakan perpaduan **LocalStorage** di sisi klien untuk menyimpan konfigurasi data kriteria, perbandingan matriks AHP, data supplier, log aktivitas, serta riwayat perhitungan. Hal ini memastikan data Anda tidak hilang saat halaman browser direfresh atau server Flask dimatikan sementara.

---

## 💻 Tech Stack & Pustaka
* **Backend**: Python 3, Flask, NumPy (untuk komputasi aljabar linear matriks).
* **Frontend**: HTML5 (Semantic), Vanilla CSS (Custom Variables, Flexbox, CSS Grid), Vanilla Javascript (ES6+, Fetch API, LocalStorage).
* **Pustaka Pihak Ketiga (CDN)**:
  * [Chart.js](https://www.chartjs.org/) (Visualisasi chart batang dan pai).
  * [Lucide Icons](https://lucide.dev/) (Set ikon modern berkualitas tinggi).
  * Google Fonts - Plus Jakarta Sans (Tipografi premium & modern).

---
*Dibuat untuk memenuhi kebutuhan penentuan supplier kopi arabika terbaik secara efisien, transparan, dan akurat.*
