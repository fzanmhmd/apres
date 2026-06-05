<?php
declare(strict_types=1);

require __DIR__ . '/config.php';

$data = $_SERVER['REQUEST_METHOD'] === 'POST' ? read_json() : [];
$user = current_user($data);

if ($_SERVER['REQUEST_METHOD'] === 'GET') {
    respond(['ok' => true, 'user' => public_user($user)]);
}

require_method('POST');

$profile = $data['profile'] ?? [];
if (!is_array($profile)) {
    fail('Profil tidak valid.');
}

$currentPassword = (string)($data['current_password'] ?? '');
$newPassword = (string)($data['new_password'] ?? '');

if ($newPassword !== '') {
    if ($currentPassword === '') {
        fail('Password saat ini wajib diisi.');
    }

    if (!password_verify($currentPassword, $user['password_hash'])) {
        audit((int)$user['id'], 'password_update_failed', 'Update password gagal', []);
        fail('Password saat ini salah.', 422);
    }

    if (strlen($newPassword) < 6) {
        fail('Password baru minimal 6 karakter.', 422);
    }

    $stmt = db()->prepare('UPDATE users SET password_hash = ? WHERE id = ?');
    $stmt->execute([password_hash($newPassword, PASSWORD_DEFAULT), (int)$user['id']]);
    audit((int)$user['id'], 'password_update', 'Password diperbarui', []);
} else {
    audit((int)$user['id'], 'profile_locked_no_change', 'Profil dibuka tanpa perubahan', []);
}

$fresh = db()->prepare('SELECT * FROM users WHERE id = ? LIMIT 1');
$fresh->execute([(int)$user['id']]);

respond(['ok' => true, 'user' => public_user($fresh->fetch())]);
