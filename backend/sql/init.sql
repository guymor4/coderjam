-- Initialize CoderJam database
CREATE TABLE IF NOT EXISTS pads (
    id VARCHAR(6) PRIMARY KEY,
    language VARCHAR(50) NOT NULL,
    code TEXT NOT NULL DEFAULT '',
    output TEXT NOT NULL DEFAULT '',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Function to update the updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Trigger to automatically update updated_at
CREATE TRIGGER update_pads_updated_at
    BEFORE UPDATE ON pads
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();