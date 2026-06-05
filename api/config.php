<?php
declare(strict_types=1);

header('Content-Type: application/json; charset=utf-8');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Headers: Content-Type, Authorization');
header('Access-Control-Allow-Methods: GET, POST, OPTIONS');

if (($_SERVER['REQUEST_METHOD'] ?? '') === 'OPTIONS') {
    http_response_code(204);
    exit;
}

function env_value(string $key, string $fallback): string
{
    $value = getenv($key);
    return $value === false || $value === '' ? $fallback : $value;
}

function db(): PDO
{
    static $pdo = null;

    if ($pdo instanceof PDO) {
        return $pdo;
    }

    $host = env_value('DB_HOST', '127.0.0.1');
    $port = env_value('DB_PORT', '3306');
    $name = env_value('DB_NAME', 'datakaryawan');
    $user = env_value('DB_USER', 'root');
    $pass = env_value('DB_PASS', '');

    $dsn = "mysql:host={$host};port={$port};dbname={$name};charset=utf8mb4";
    $pdo = new PDO($dsn, $user, $pass, [
        PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
        PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
        PDO::ATTR_EMULATE_PREPARES => false,
    ]);

    return $pdo;
}

function read_json(): array
{
    $raw = file_get_contents('php://input') ?: '';
    $data = json_decode($raw, true);
    return is_array($data) ? $data : [];
}

function respond(array $payload, int $status = 200): void
{
    http_response_code($status);
    echo json_encode($payload, JSON_UNESCAPED_SLASHES);
    exit;
}

function fail(string $message, int $status = 400): void
{
    respond(['ok' => false, 'message' => $message], $status);
}

function require_method(string $method): void
{
    if ($_SERVER['REQUEST_METHOD'] !== $method) {
        fail('Method tidak diizinkan.', 405);
    }
}

function session_token_from_request(array $data): string
{
    $header = $_SERVER['HTTP_AUTHORIZATION'] ?? '';
    if (strpos($header, 'Bearer ') === 0) {
        return trim(substr($header, 7));
    }
    return trim((string)($data['session_token'] ?? $_GET['session_token'] ?? ''));
}

function current_user(array $data): array
{
    $token = session_token_from_request($data);
    if ($token === '') {
        fail('Session token wajib dikirim.', 401);
    }

    $stmt = db()->prepare(
        'SELECT u.* FROM user_sessions s
         JOIN users u ON u.id = s.user_id
         WHERE s.token_hash = ? AND s.expires_at > NOW() AND u.is_active = 1
         LIMIT 1'
    );
    $stmt->execute([hash('sha256', $token)]);
    $user = $stmt->fetch();

    if (!$user) {
        fail('Session tidak valid.', 401);
    }

    return $user;
}

function optional_current_user(array $data): ?array
{
    $token = session_token_from_request($data);
    if ($token === '') {
        return null;
    }

    $stmt = db()->prepare(
        'SELECT u.* FROM user_sessions s
         JOIN users u ON u.id = s.user_id
         WHERE s.token_hash = ? AND s.expires_at > NOW() AND u.is_active = 1
         LIMIT 1'
    );
    $stmt->execute([hash('sha256', $token)]);
    $user = $stmt->fetch();
    return $user ?: null;
}

function public_user(array $user): array
{
    return [
        'id' => (string)$user['id'],
        'nik' => $user['nik'],
        'name' => $user['full_name'],
        'department' => $user['department'],
        'role' => $user['role'],
    ];
}

function require_admin(array $user): void
{
    if (($user['role'] ?? '') !== 'admin') {
        fail('Hanya admin yang boleh mengubah lokasi kantor.', 403);
    }
}

function audit(?int $userId, string $type, string $title, array $metadata = []): void
{
    $stmt = db()->prepare(
        'INSERT INTO audit_logs (user_id, event_type, title, metadata, ip_address, user_agent)
         VALUES (?, ?, ?, ?, ?, ?)'
    );
    $stmt->execute([
        $userId,
        $type,
        $title,
        json_encode($metadata, JSON_UNESCAPED_SLASHES),
        $_SERVER['REMOTE_ADDR'] ?? null,
        substr($_SERVER['HTTP_USER_AGENT'] ?? '', 0, 255),
    ]);
}

function upsert_device(int $userId, array $device): ?int
{
    $uuid = trim((string)($device['id'] ?? ''));
    $fingerprint = trim((string)($device['fingerprint'] ?? ''));

    if ($uuid === '' || $fingerprint === '') {
        return null;
    }

    $stmt = db()->prepare(
        'INSERT INTO devices (user_id, device_uuid, fingerprint_hash, label, is_bound, bound_at, last_seen_at)
         VALUES (?, ?, ?, ?, 1, NOW(), NOW())
         ON DUPLICATE KEY UPDATE
           fingerprint_hash = VALUES(fingerprint_hash),
           label = VALUES(label),
           is_bound = 1,
           last_seen_at = NOW()'
    );
    $stmt->execute([
        $userId,
        $uuid,
        $fingerprint,
        substr((string)($device['label'] ?? 'Browser'), 0, 120),
    ]);

    $find = db()->prepare('SELECT id FROM devices WHERE user_id = ? AND device_uuid = ? LIMIT 1');
    $find->execute([$userId, $uuid]);
    $row = $find->fetch();
    return $row ? (int)$row['id'] : null;
}
