<?php
declare(strict_types=1);

require __DIR__ . '/config.php';

require_method('POST');

$data = read_json();
$user = current_user($data);
$record = $data['record'] ?? [];

if (!is_array($record)) {
    fail('Payload presensi tidak valid.');
}

$type = (string)($record['type'] ?? '');
$shift = (string)($record['shift'] ?? '');

if (!in_array($type, ['Masuk', 'Keluar'], true) || !in_array($shift, ['Pagi', 'Siang', 'Malam'], true)) {
    fail('Tipe presensi atau shift tidak valid.');
}

$devicePayload = is_array($record['device'] ?? null) ? $record['device'] : [
    'id' => $record['device_id'] ?? '',
    'fingerprint' => $record['device_id'] ?? '',
    'label' => 'Attendance device',
];
$deviceId = upsert_device((int)$user['id'], $devicePayload);

$geofence = active_geofence();
$latitude = isset($record['latitude']) ? (float)$record['latitude'] : null;
$longitude = isset($record['longitude']) ? (float)$record['longitude'] : null;

if ($latitude === null || $longitude === null) {
    fail('Lokasi GPS wajib dikirim.');
}

$distance = calculate_distance_m(
    $latitude,
    $longitude,
    (float)$geofence['latitude'],
    (float)$geofence['longitude']
);
$geofenceStatus = $distance <= (int)$geofence['radius_m'] ? 'inside' : 'outside';

if ($geofenceStatus !== 'inside') {
    audit((int)$user['id'], 'attendance_rejected_geofence', "Presensi {$type} ditolak", [
        'distance_m' => $distance,
        'radius_m' => (int)$geofence['radius_m'],
    ]);
    fail('Lokasi berada di luar radius kantor.', 422);
}

$attendanceDate = (string)($record['date'] ?? date('Y-m-d'));
$attendanceTime = (string)($record['time'] ?? date('H:i'));

$duplicate = db()->prepare(
    'SELECT id FROM attendance_records
     WHERE user_id = ? AND attendance_date = ? AND attendance_type = ?
     LIMIT 1'
);
$duplicate->execute([(int)$user['id'], $attendanceDate, $type]);
if ($duplicate->fetch()) {
    fail("Presensi {$type} hari ini sudah tersimpan.", 409);
}

$faceImage = (string)($record['face_image'] ?? '');

$stmt = db()->prepare(
    'INSERT INTO attendance_records
      (public_id, user_id, device_id, attendance_type, shift_name, attendance_date, attendance_time,
       latitude, longitude, distance_m, geofence_status, face_score, liveness_status,
       face_snapshot_base64, note, status)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)'
);
$stmt->execute([
    (string)($record['id'] ?? bin2hex(random_bytes(12))),
    (int)$user['id'],
    $deviceId,
    $type,
    $shift,
    $attendanceDate,
    $attendanceTime,
    $latitude,
    $longitude,
    $distance,
    $geofenceStatus,
    90.00,
    'valid',
    $faceImage === '' ? null : $faceImage,
    (string)($record['note'] ?? ''),
    'Valid',
]);

audit((int)$user['id'], 'attendance_save', "Presensi {$type}", [
    'shift' => $shift,
    'distance_m' => $distance,
]);

respond(['ok' => true, 'id' => db()->lastInsertId()]);

function active_geofence(): array
{
    $stmt = db()->query(
        'SELECT name, latitude, longitude, radius_m
         FROM geofences
         WHERE is_active = 1
         ORDER BY id ASC
         LIMIT 1'
    );
    $geofence = $stmt->fetch();

    if (!$geofence) {
        fail('Geofence kantor belum diset.', 500);
    }

    return $geofence;
}

function calculate_distance_m(float $lat1, float $lng1, float $lat2, float $lng2): int
{
    $earthRadius = 6371000;
    $dLat = deg2rad($lat2 - $lat1);
    $dLng = deg2rad($lng2 - $lng1);
    $a = sin($dLat / 2) ** 2
        + cos(deg2rad($lat1)) * cos(deg2rad($lat2)) * sin($dLng / 2) ** 2;

    return (int)round($earthRadius * 2 * atan2(sqrt($a), sqrt(1 - $a)));
}
