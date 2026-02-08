UPDATE clubs SET public_id = UUID() WHERE public_id IS NULL;
