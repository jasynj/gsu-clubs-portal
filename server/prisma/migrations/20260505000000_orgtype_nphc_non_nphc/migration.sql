-- Replace OrgType enum (greek -> nphc/non_nphc; club stays).
-- Existing 'greek' rows are temporarily mapped to 'non_nphc';
-- the seed script then sets the correct nphc / non_nphc / club value
-- for each org based on org_passwords.json (and removes orgs no longer
-- present in that file).

ALTER TYPE "OrgType" RENAME TO "OrgType_old";

CREATE TYPE "OrgType" AS ENUM ('nphc', 'non_nphc', 'club');

ALTER TABLE "organizations"
  ALTER COLUMN "type" DROP DEFAULT,
  ALTER COLUMN "type" TYPE "OrgType" USING (
    CASE "type"::text
      WHEN 'greek' THEN 'non_nphc'::"OrgType"
      WHEN 'club'  THEN 'club'::"OrgType"
    END
  );

-- Some installs may not yet have registration_requests; guard the alter.
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'registration_requests' AND column_name = 'orgType'
  ) THEN
    EXECUTE $sql$
      ALTER TABLE "registration_requests"
        ALTER COLUMN "orgType" TYPE "OrgType" USING (
          CASE "orgType"::text
            WHEN 'greek' THEN 'non_nphc'::"OrgType"
            WHEN 'club'  THEN 'club'::"OrgType"
          END
        );
    $sql$;
  END IF;
END
$$;

DROP TYPE "OrgType_old";
