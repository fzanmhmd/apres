<?php
declare(strict_types=1);

require __DIR__ . '/config.php';

try {
    $tables = db()->query('SHOW TABLES')->fetchAll(PDO::FETCH_COLUMN);
    respond([
        'ok' => true,
        'database' => env_value('DB_NAME', 'datakaryawan'),
        'tables' => $tables,
        'message' => 'Koneksi MySQL berhasil.',
    ]);
} catch (Throwable $error) {
    respond([
        'ok' => false,
        'message' => 'Koneksi MySQL gagal.',
        'error' => $error->getMessage(),
    ], 500);
}
