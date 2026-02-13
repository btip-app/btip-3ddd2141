
-- Atomic entity merge function: merges source entity INTO target entity
-- Reassigns all aliases and incident_entities, then deletes source
CREATE OR REPLACE FUNCTION public.merge_entities(
  _target_id UUID,
  _source_id UUID
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  _aliases_moved INT := 0;
  _links_moved INT := 0;
  _links_deduped INT := 0;
  _target_name TEXT;
  _source_name TEXT;
BEGIN
  -- Validate both exist
  SELECT canonical_name INTO _target_name FROM entities WHERE id = _target_id;
  SELECT canonical_name INTO _source_name FROM entities WHERE id = _source_id;
  
  IF _target_name IS NULL OR _source_name IS NULL THEN
    RAISE EXCEPTION 'One or both entity IDs are invalid';
  END IF;
  
  IF _target_id = _source_id THEN
    RAISE EXCEPTION 'Cannot merge an entity into itself';
  END IF;

  -- 1. Add source's canonical name as an alias on target (if not already)
  INSERT INTO entity_aliases (entity_id, alias, alias_normalized, source)
  SELECT _target_id, _source_name, lower(trim(_source_name)), 'merge'
  WHERE NOT EXISTS (
    SELECT 1 FROM entity_aliases
    WHERE entity_id = _target_id AND alias_normalized = lower(trim(_source_name))
  );

  -- 2. Move aliases from source to target (skip duplicates)
  WITH moved AS (
    UPDATE entity_aliases
    SET entity_id = _target_id
    WHERE entity_id = _source_id
      AND alias_normalized NOT IN (
        SELECT alias_normalized FROM entity_aliases WHERE entity_id = _target_id
      )
    RETURNING 1
  )
  SELECT count(*) INTO _aliases_moved FROM moved;

  -- Delete remaining duplicate aliases on source
  DELETE FROM entity_aliases WHERE entity_id = _source_id;

  -- 3. Move incident links from source to target (skip if same incident already linked)
  WITH moved AS (
    UPDATE incident_entities
    SET entity_id = _target_id
    WHERE entity_id = _source_id
      AND incident_id NOT IN (
        SELECT incident_id FROM incident_entities WHERE entity_id = _target_id
      )
    RETURNING 1
  )
  SELECT count(*) INTO _links_moved FROM moved;

  -- Count and delete duplicate links
  WITH deleted AS (
    DELETE FROM incident_entities WHERE entity_id = _source_id
    RETURNING 1
  )
  SELECT count(*) INTO _links_deduped FROM deleted;

  -- 4. Update target stats
  UPDATE entities
  SET 
    incident_count = (SELECT count(*) FROM incident_entities WHERE entity_id = _target_id),
    confidence = GREATEST(
      (SELECT confidence FROM entities WHERE id = _target_id),
      (SELECT confidence FROM entities WHERE id = _source_id)
    ),
    last_seen = GREATEST(
      (SELECT last_seen FROM entities WHERE id = _target_id),
      (SELECT last_seen FROM entities WHERE id = _source_id)
    ),
    first_seen = LEAST(
      (SELECT first_seen FROM entities WHERE id = _target_id),
      (SELECT first_seen FROM entities WHERE id = _source_id)
    ),
    updated_at = now()
  WHERE id = _target_id;

  -- 5. Delete source entity
  DELETE FROM entities WHERE id = _source_id;

  RETURN jsonb_build_object(
    'target_id', _target_id,
    'target_name', _target_name,
    'source_name', _source_name,
    'aliases_moved', _aliases_moved,
    'links_moved', _links_moved,
    'links_deduped', _links_deduped
  );
END;
$$;
