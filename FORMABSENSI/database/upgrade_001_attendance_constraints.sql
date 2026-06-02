USE datakaryawan;

ALTER TABLE attendance_records
  ADD UNIQUE KEY uq_attendance_user_date_type (user_id, attendance_date, attendance_type);
