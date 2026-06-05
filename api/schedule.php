<?php
declare(strict_types=1);

require __DIR__ . '/config.php';

$data = $_SERVER['REQUEST_METHOD'] === 'POST' ? read_json() : [];
$user = current_user($data);

if ($_SERVER['REQUEST_METHOD'] === 'GET') {
    $stmt = db()->prepare(
        'SELECT active_shift, pagi_time, siang_time, malam_time
         FROM work_schedules
         WHERE user_id = ?
         LIMIT 1'
    );
    $stmt->execute([(int)$user['id']]);
    $row = $stmt->fetch();

    if (!$row) {
        respond([
            'ok' => true,
            'schedule' => [
                'activeShift' => 'Pagi',
                'times' => [
                    'Pagi' => '08:00',
                    'Siang' => '13:30',
                    'Malam' => '21:00',
                ],
            ],
        ]);
    }

    respond(['ok' => true, 'schedule' => schedule_payload($row)]);
}

require_method('POST');

$schedule = $data['schedule'] ?? [];
if (!is_array($schedule)) {
    fail('Jadwal tidak valid.');
}

$activeShift = (string)($schedule['activeShift'] ?? 'Pagi');
$times = is_array($schedule['times'] ?? null) ? $schedule['times'] : [];

if (!in_array($activeShift, ['Pagi', 'Siang', 'Malam'], true)) {
    fail('Shift aktif tidak valid.');
}

$pagi = normalize_time((string)($times['Pagi'] ?? '08:00'));
$siang = normalize_time((string)($times['Siang'] ?? '13:30'));
$malam = normalize_time((string)($times['Malam'] ?? '21:00'));

$stmt = db()->prepare(
    'INSERT INTO work_schedules (user_id, active_shift, pagi_time, siang_time, malam_time)
     VALUES (?, ?, ?, ?, ?)
     ON DUPLICATE KEY UPDATE
       active_shift = VALUES(active_shift),
       pagi_time = VALUES(pagi_time),
       siang_time = VALUES(siang_time),
       malam_time = VALUES(malam_time)'
);
$stmt->execute([(int)$user['id'], $activeShift, $pagi, $siang, $malam]);

audit((int)$user['id'], 'schedule_update', 'Jadwal kerja diperbarui', [
    'active_shift' => $activeShift,
]);

respond([
    'ok' => true,
    'schedule' => [
        'activeShift' => $activeShift,
        'times' => [
            'Pagi' => substr($pagi, 0, 5),
            'Siang' => substr($siang, 0, 5),
            'Malam' => substr($malam, 0, 5),
        ],
    ],
]);

function normalize_time(string $value): string
{
    if (!preg_match('/^\d{2}:\d{2}$/', $value)) {
        fail('Format jam harus HH:MM.');
    }

    return $value . ':00';
}

function schedule_payload(array $row): array
{
    return [
        'activeShift' => $row['active_shift'],
        'times' => [
            'Pagi' => substr((string)$row['pagi_time'], 0, 5),
            'Siang' => substr((string)$row['siang_time'], 0, 5),
            'Malam' => substr((string)$row['malam_time'], 0, 5),
        ],
    ];
}
