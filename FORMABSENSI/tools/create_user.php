<?php
declare(strict_types=1);

require __DIR__ . '/../api/config.php';

if (PHP_SAPI !== 'cli') {
    fail('Script ini hanya boleh dijalankan dari terminal.', 403);
}

[$script, $nik, $name, $password, $role, $department] = array_pad($argv, 6, '');

if ($nik === '' || $name === '' || $password === '') {
    echo "Pakai: php tools/create_user.php MP-001 \"Admin PT.MARKOJAN\" admin123 admin HR\n";
    exit(1);
}

$role = in_array($role, ['admin', 'employee'], true) ? $role : 'employee';
$department = $department !== '' ? $department : null;
$passwordHash = password_hash($password, PASSWORD_DEFAULT);

$stmt = db()->prepare(
    'INSERT INTO users (nik, full_name, password_hash, department, role)
     VALUES (?, ?, ?, ?, ?)
     ON DUPLICATE KEY UPDATE
       full_name = VALUES(full_name),
       password_hash = VALUES(password_hash),
       department = VALUES(department),
       role = VALUES(role),
       is_active = 1'
);
$stmt->execute([$nik, $name, $passwordHash, $department, $role]);

echo "User {$nik} berhasil dibuat/diupdate sebagai {$role}.\n";
