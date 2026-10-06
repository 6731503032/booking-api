DROP TABLE IF EXISTS bookings;
DROP TABLE IF EXISTS equipment;

CREATE TABLE equipment (
  id       TEXT PRIMARY KEY,
  name     TEXT NOT NULL,
  location TEXT NOT NULL
);

CREATE TABLE bookings (
  id           TEXT PRIMARY KEY,
  equipmentId  TEXT NOT NULL REFERENCES equipment(id),
  borrowerName TEXT NOT NULL,
  startAt      TEXT NOT NULL,  -- ISO 8601 UTC
  endAt        TEXT NOT NULL,  -- ISO 8601 UTC
  purpose      TEXT NOT NULL DEFAULT ''
);

CREATE INDEX idx_bookings_equipment_time ON bookings (equipmentId, startAt, endAt);

INSERT INTO equipment (id, name, location) VALUES
  ('eq-1', 'Projector A', 'Building 1'),
  ('eq-2', 'Camera B', 'Building 2'),
  ('eq-3', 'Meeting Room C', 'Building 3');
