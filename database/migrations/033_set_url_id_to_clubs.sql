UPDATE clubs
SET url_id = SUBSTRING(REPLACE(UUID(), '-', ''), 1, 12)
WHERE url_id IS NULL OR url_id = '';