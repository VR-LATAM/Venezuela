ALTER TABLE drivers   ADD COLUMN IF NOT EXISTS operative_code VARCHAR(20) UNIQUE;
ALTER TABLE passengers ADD COLUMN IF NOT EXISTS operative_code VARCHAR(20) UNIQUE;

CREATE OR REPLACE FUNCTION generate_operative_code(prefix TEXT, full_name TEXT)
RETURNS TEXT AS $$
DECLARE
  last_name TEXT;
  name_code TEXT;
  rand_num  TEXT;
  code      TEXT;
  attempts  INT := 0;
BEGIN
  IF position(' ' IN full_name) > 0 THEN
    last_name := split_part(full_name, ' ', 2);
  ELSE
    last_name := full_name;
  END IF;

  name_code := upper(left(
    regexp_replace(
      translate(last_name,
        'áéíóúÁÉÍÓÚàèìòùÀÈÌÒÙäëïöüÄËÏÖÜâêîôûÂÊÎÔÛñÑ',
        'aeiouAEIOUaeiouAEIOUaeiouAEIOUaeiouAEIOUnN'
      ),
      '[^a-zA-Z]', '', 'g'
    ), 2
  ));
  IF length(name_code) < 2 THEN
    name_code := rpad(name_code, 2, 'X');
  END IF;

  LOOP
    rand_num := lpad(floor(random() * 900 + 100)::TEXT, 3, '0');
    code := prefix || '-' || name_code || '-' || rand_num;

    IF NOT EXISTS (SELECT 1 FROM drivers   WHERE operative_code = code)
   AND NOT EXISTS (SELECT 1 FROM passengers WHERE operative_code = code) THEN
      RETURN code;
    END IF;

    attempts := attempts + 1;
    IF attempts > 100 THEN
      rand_num := lpad(floor(random() * 9000 + 1000)::TEXT, 4, '0');
      RETURN prefix || '-' || name_code || '-' || rand_num;
    END IF;
  END LOOP;
END;
$$ LANGUAGE plpgsql;

UPDATE drivers d
SET operative_code = generate_operative_code(
  CASE
    WHEN d.services && ARRAY['motorcycle']::TEXT[] THEN 'MT'
    WHEN d.services && ARRAY['sedan']::TEXT[]      THEN 'SD'
    WHEN d.services && ARRAY['suv']::TEXT[]        THEN 'SV'
    WHEN d.services && ARRAY['van']::TEXT[]        THEN 'VN'
    WHEN d.services && ARRAY['pickup']::TEXT[]     THEN 'PU'
    WHEN d.services && ARRAY['350','npr']::TEXT[]  THEN 'CG'
    ELSE 'DR'
  END,
  u.name
)
FROM users u
WHERE d.id = u.id AND d.operative_code IS NULL;

UPDATE passengers p
SET operative_code = generate_operative_code('PSJ', u.name)
FROM users u
WHERE p.id = u.id AND p.operative_code IS NULL;
