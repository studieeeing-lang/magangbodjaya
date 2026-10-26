# Tracker Magang

Tracker bersama untuk daftar perusahaan, detail lowongan, tahap lamaran, hasil, dan dashboard. Setiap pengunjung tautan situs melihat serta mengubah data yang sama, termasuk centang progres. Perubahan muncul otomatis dalam sekitar enam detik tanpa memuat ulang halaman.

Data disimpan di Netlify Database melalui Netlify Functions. Situs tidak memerlukan pengaturan Google Sheet atau Apps Script. Berkas `Code.gs` merupakan integrasi lama dan tidak digunakan oleh situs ini.

Aset situs ada di `public/`, skema di `db/schema.ts`, dan migrasi di `netlify/database/migrations/`. Netlify menerapkan migrasi saat deploy. Instal dependensi dengan `npm install`. Untuk pengembangan lokal gunakan `netlify dev --port 8889`.

Saat penyimpanan bersama kosong, daftar yang sudah tersimpan di browser pengunjung pertama diunggah sebagai data awal. Selanjutnya server menjadi sumber data bersama. Browser menyimpan salinan data terakhir, tetapi perubahan baru memerlukan koneksi ke penyimpanan bersama. Jika koneksi terputus saat menyimpan, situs menampilkan status gagal terhubung dan mencoba lagi; biarkan halaman terbuka sampai sinkronisasi selesai.

Semua orang yang memiliki tautan dapat membaca, mengubah, dan menghapus data bersama. Aplikasi ini tidak memakai akun pengguna.
