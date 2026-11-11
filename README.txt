SETUP NEON + NETLIFY

A. Neon (database)
1. Daftar di https://neon.tech, buat project gratis.
2. Di Dashboard klik "Connect", salin connection string (diawali postgresql://...).
   Tabel dibuat otomatis saat pertama kali dipakai, tidak perlu menjalankan SQL.

B. Netlify (hosting + function)
Fungsi database ada di netlify/functions/labels.mjs, jadi deploy perlu
membaca folder ini utuh (bukan hanya index.html). Pilih salah satu:
  - GitHub (paling mudah dan otomatis update): upload folder ini ke repo,
    lalu Netlify > Add new site > Import from Git.
  - Netlify CLI:  npm i -g netlify-cli  lalu  netlify deploy --prod
1. Setelah site dibuat: Site configuration > Environment variables >
   Add variable:  DATABASE_URL = (connection string dari Neon)
2. Deploy ulang (Deploys > Trigger deploy) agar variabel terbaca.
3. Selesai. Buka link site, isi label, klik "Simpan online".
   Set yang tersimpan bisa dibagikan lewat link  ...netlify.app/?set=<id>

Catatan: connection string hanya ada di server Netlify, tidak pernah dikirim ke browser.
