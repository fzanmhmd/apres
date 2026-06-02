<?php
declare(strict_types=1);

require __DIR__ . '/config.php';

$data = $_SERVER['REQUEST_METHOD'] === 'POST' ? read_json() : [];
$user = current_user($data);

if ($_SERVER['REQUEST_METHOD'] === 'GET') {
    $stmt = db()->query(
        'SELECT id, name, latitude, longitude, radius_m
         FROM geofences
         WHERE is_active = 1
         ORDER BY id ASC
         LIMIT 1'
    );
    respond(['ok' => true, 'geofence' => $stmt->fetch()]);
}

require_method('POST');
require_admin($user);

$geofence = $data['geofence'] ?? [];
if (!is_array($geofence)) {
    fail('Data geofence tidak valid.');
}

$lat = (float)($geofence['lat'] ?? 0);
$lng = (float)($geofence['lng'] ?? 0);
$radius = (int)($geofence['radius'] ?? 0);

if ($lat < -90 || $lat > 90 || $lng < -180 || $lng > 180 || $radius < 20) {
    fail('Koordinat atau radius tidak valid.');
}

$name = trim((string)($geofence['name'] ?? 'Kantor PT.MARKOJAN'));

$existing = db()->query(
    'SELECT id FROM geofences WHERE is_active = 1 ORDER BY id ASC LIMIT 1'
)->fetch();

if ($existing) {
    $stmt = db()->prepare(
        'UPDATE geofences
         SET name = ?, latitude = ?, longitude = ?, radius_m = ?
         WHERE id = ?'
    );
    $stmt->execute([$name, $lat, $lng, $radius, (int)$existing['id']]);
} else {
    $stmt = db()->prepare(
        'INSERT INTO geofences (name, latitude, longitude, radius_m, is_active)
         VALUES (?, ?, ?, ?, 1)'
    );
    $stmt->execute([$name, $lat, $lng, $radius]);
}

audit((int)$user['id'], 'geofence_update', 'Lokasi kantor diperbarui', [
    'latitude' => $lat,
    'longitude' => $lng,
    'radius_m' => $radius,
]);

respond(['ok' => true]);
