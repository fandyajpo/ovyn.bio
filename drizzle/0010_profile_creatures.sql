ALTER TABLE "profiles" ADD COLUMN "creatures" jsonb DEFAULT '{"version":1,"list":[]}'::jsonb NOT NULL;
