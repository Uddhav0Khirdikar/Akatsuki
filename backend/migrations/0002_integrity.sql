-- Existing accounts are deliberately not grandfathered into ERP verification.
ALTER TABLE users ADD COLUMN erp_verified INTEGER NOT NULL DEFAULT 0;

CREATE INDEX idx_conversations_job_updated ON conversations(job_id, updated_at DESC);
CREATE INDEX idx_messages_history ON messages(conversation_id, created_at DESC, id DESC);
CREATE INDEX idx_messages_unread ON messages(conversation_id, sender_id) WHERE is_read = 0;

-- Enforce lifecycle rules at the write boundary, including concurrent requests.
CREATE TRIGGER applications_guard BEFORE INSERT ON applications BEGIN
    SELECT CASE WHEN (SELECT status FROM jobs WHERE id = NEW.job_id) != 'OPEN'
        THEN RAISE(ABORT, 'job_closed') END;
    SELECT CASE WHEN (SELECT creator_id FROM jobs WHERE id = NEW.job_id) = NEW.applicant_id
        THEN RAISE(ABORT, 'self_application') END;
END;

CREATE TRIGGER conversations_guard BEFORE INSERT ON conversations BEGIN
    SELECT CASE WHEN (SELECT status FROM jobs WHERE id = NEW.job_id) != 'OPEN'
        THEN RAISE(ABORT, 'job_closed') END;
    SELECT CASE WHEN NEW.student_id = NEW.owner_id
        OR NEW.owner_id != (SELECT creator_id FROM jobs WHERE id = NEW.job_id)
        THEN RAISE(ABORT, 'invalid_conversation_participants') END;
END;

CREATE TRIGGER messages_guard BEFORE INSERT ON messages BEGIN
    SELECT CASE WHEN NOT EXISTS (
        SELECT 1 FROM conversations WHERE id = NEW.conversation_id
        AND (student_id = NEW.sender_id OR owner_id = NEW.sender_id)
    ) THEN RAISE(ABORT, 'invalid_message_sender') END;
END;

CREATE TRIGGER jobs_values_insert BEFORE INSERT ON jobs BEGIN
    SELECT CASE WHEN NEW.status NOT IN ('OPEN', 'CLOSED')
        OR NEW.category NOT IN ('INTERNSHIP','PART_TIME','RESEARCH_ASSISTANT','PROJECT_COLLAB','CAMPUS_GIG','TUTORING')
        OR NEW.location_type NOT IN ('ON_CAMPUS','REMOTE','HYBRID')
        OR length(trim(NEW.title)) = 0 OR length(trim(NEW.description)) = 0
        THEN RAISE(ABORT, 'invalid_job_values') END;
END;

CREATE TRIGGER jobs_values_update BEFORE UPDATE ON jobs BEGIN
    SELECT CASE WHEN NEW.status NOT IN ('OPEN', 'CLOSED')
        OR NEW.category NOT IN ('INTERNSHIP','PART_TIME','RESEARCH_ASSISTANT','PROJECT_COLLAB','CAMPUS_GIG','TUTORING')
        OR NEW.location_type NOT IN ('ON_CAMPUS','REMOTE','HYBRID')
        OR length(trim(NEW.title)) = 0 OR length(trim(NEW.description)) = 0
        THEN RAISE(ABORT, 'invalid_job_values') END;
END;

CREATE TRIGGER application_status_insert BEFORE INSERT ON applications BEGIN
    SELECT CASE WHEN NEW.status NOT IN ('PENDING','SHORTLISTED','ACCEPTED','REJECTED')
        THEN RAISE(ABORT, 'invalid_application_status') END;
END;
CREATE TRIGGER application_status_update BEFORE UPDATE OF status ON applications BEGIN
    SELECT CASE WHEN NEW.status NOT IN ('PENDING','SHORTLISTED','ACCEPTED','REJECTED')
        THEN RAISE(ABORT, 'invalid_application_status') END;
END;
