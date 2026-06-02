<?php
declare(strict_types=1);

require __DIR__ . '/config.php';

$data = $_SERVER['REQUEST_METHOD'] === 'POST' ? read_json() : [];
$user = current_user($data);
$month = trim((string)($_GET['month'] ?? $data['month'] ?? ''));
$type = trim((string)($_GET['type'] ?? $data['type'] ?? ''));

$where = ['user_id = ?'];
$params = [(int)$user['id']];

if ($month !== '') {
    $where[] = "DATE_FORMAT(attendance_date, '%Y-%m') = ?";
    $params[] = $month;
}

if ($type !== '') {
    $where[] = 'attendance_type = ?';
    $params[] = $type;
}

$sql = 'SELECT public_id, attendance_type, shift_name, attendance_date, attendance_time,
               latitude, longitude, distance_m, geofence_status, status, created_at
        FROM attendance_records
        WHERE ' . implode(' AND ', $where) . '
        ORDER BY attendance_date DESC, attendance_time DESC
        LIMIT 300';
$stmt = db()->prepare($sql);
$stmt->execute($params);

respond(['ok' => true, 'records' => $stmt->fetchAll()]);
