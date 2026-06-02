<?php
declare(strict_types=1);

require __DIR__ . '/config.php';

require_method('POST');

$data = read_json();
$nik = trim((string)($data['nik'] ?? ''));
$password = (string)($data['password'] ?? '');

if ($nik === '' || $password === '') {
    fail('NIK dan password wajib diisi.');
}

$stmt = db()->prepare('SELECT * FROM users WHERE nik = ? AND is_active = 1 LIMIT 1');
$stmt->execute([$nik]);
$user = $stmt->fetch();

if (!$user || !password_verify($password, $user['password_hash'])) {
    audit(null, 'login_failed', 'Login gagal', ['nik' => $nik]);
    fail('NIK atau password salah.', 401);
}

if (!empty($data['bind_device'])) {
    upsert_device((int)$user['id'], $data['device'] ?? []);
}

$token = bin2hex(random_bytes(32));
$session = db()->prepare(
    'INSERT INTO user_sessions (user_id, token_hash, ip_address, user_agent, expires_at)
     VALUES (?, ?, ?, ?, DATE_ADD(NOW(), INTERVAL 12 HOUR))'
);
$session->execute([
    (int)$user['id'],
    hash('sha256', $token),
    $_SERVER['REMOTE_ADDR'] ?? null,
    substr($_SERVER['HTTP_USER_AGENT'] ?? '', 0, 255),
]);

audit((int)$user['id'], 'login', 'Login berhasil', ['nik' => $nik]);

respond([
    'ok' => true,
    'session_token' => $token,
    'user' => public_user($user),
]);
