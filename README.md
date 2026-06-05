# APRES PT.MARKOJAN

APRES adalah aplikasi presensi karyawan berbasis frontend statis, PHP PDO, dan MySQL. Struktur repo sudah dipisahkan supaya mudah dipasang di XAMPP, Laragon, atau hosting PHP biasa.

## Struktur folder

```text
/
|-- index.html
|-- assets/
|   |-- css/style.css
|   |-- js/script.js
|   `-- img/
|-- api/
|-- database/
|-- tools/
`-- static-server.cjs
```

- `assets/` menyimpan CSS, JavaScript, logo, dan gambar brosur.
- `api/` menyimpan endpoint PHP.
- `database/` menyimpan schema dan file upgrade SQL.
- `tools/` menyimpan script CLI untuk administrasi data awal.

## Setup singkat

1. Buat database dari `database/schema.sql`.
2. Atur koneksi database lewat environment variable server:
   - `DB_HOST`
   - `DB_PORT`
   - `DB_NAME`
   - `DB_USER`
   - `DB_PASS`
3. Buat password hash:

```bash
php -r "echo password_hash('password-anda', PASSWORD_DEFAULT), PHP_EOL;"
```

4. Insert user awal ke tabel `users` dengan hash tersebut.
5. Jalankan root project dari server PHP, bukan langsung dari `file://`.

Endpoint tersedia:

- `POST api/login.php`
- `POST api/attendance.php`
- `GET/POST api/history.php`
- `GET/POST api/audit.php`
- `GET/POST api/profile.php`
- `GET/POST api/geofence.php`
- `GET api/db_check.php`

Role:

- `admin` bisa mengubah lokasi kantor/geofence.
- `employee` hanya bisa melihat lokasi dan melakukan presensi.

## Laragon

Default Laragon biasanya cocok dengan konfigurasi saat ini:

- host: `127.0.0.1`
- port: `3306`
- database: `datakaryawan`
- user: `root`
- password: kosong

Kalau nama database berbeda, ubah fallback `DB_NAME` di `api/config.php` atau set environment variable server.

Langkah ringkas:

1. Start Apache dan MySQL di Laragon.
2. Import `database/schema.sql` ke MySQL.
3. Cek koneksi dari browser: `http://localhost/apres/api/db_check.php`.
4. Buat admin pertama dari terminal Laragon:

```bash
php tools/create_user.php MP-001 "Admin PT.MARKOJAN" admin123 admin HR
```

5. Buat karyawan:

```bash
php tools/create_user.php MP-002 "Karyawan Demo" karyawan123 employee Produksi
```

6. Login dari website dengan NIK dan password yang dibuat.
