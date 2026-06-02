<?php
declare(strict_types=1);

require __DIR__ . '/config.php';

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $data = read_json();
    $event = $data['event'] ?? [];
    $user = optional_current_user($data);

    audit(
        $user ? (int)$user['id'] : null,
        (string)($event['type'] ?? 'client_event'),
        (string)($event['title'] ?? 'Client event'),
        is_array($event['metadata'] ?? null) ? $event['metadata'] : []
    );

    respond(['ok' => true]);
}

$data = [];
$user = current_user($data);
$stmt = db()->prepare(
    'SELECT event_type, title, metadata, created_at
     FROM audit_logs
     WHERE user_id = ?
     ORDER BY created_at DESC
     LIMIT 100'
);
$stmt->execute([(int)$user['id']]);

respond(['ok' => true, 'events' => $stmt->fetchAll()]);
