CREATE TABLE tracker_state (
 id INTEGER PRIMARY KEY CHECK(id=1), run_id TEXT, started_at TEXT,
 revealed INTEGER NOT NULL DEFAULT 0, workshop_revision INTEGER, answer_key TEXT
);
INSERT INTO tracker_state(id) VALUES(1);
CREATE TABLE tracker_submissions (
 participant_id TEXT PRIMARY KEY REFERENCES participants(id), run_id TEXT NOT NULL,
 nickname TEXT NOT NULL, score INTEGER NOT NULL, total INTEGER NOT NULL,
 answers TEXT NOT NULL, submitted_at TEXT NOT NULL
);
CREATE TABLE tracker_reset_challenges (
 token TEXT PRIMARY KEY, stage INTEGER NOT NULL, expires_at INTEGER NOT NULL
);
CREATE TRIGGER tracker_lock_insert BEFORE INSERT ON assessments
 WHEN EXISTS(SELECT 1 FROM tracker_submissions WHERE participant_id=NEW.participant_id) OR EXISTS(SELECT 1 FROM tracker_state WHERE revealed=1)
 BEGIN SELECT RAISE(ABORT,'Final submission is locked.'); END;
CREATE TRIGGER tracker_lock_update BEFORE UPDATE ON assessments
 WHEN EXISTS(SELECT 1 FROM tracker_submissions WHERE participant_id=NEW.participant_id) OR EXISTS(SELECT 1 FROM tracker_state WHERE revealed=1)
 BEGIN SELECT RAISE(ABORT,'Final submission is locked.'); END;
CREATE TRIGGER tracker_lock_config BEFORE INSERT ON workshop_config_versions
 WHEN EXISTS(SELECT 1 FROM tracker_state WHERE run_id IS NOT NULL)
 BEGIN SELECT RAISE(ABORT,'Tracker session configuration is frozen.'); END;
