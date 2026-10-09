ALTER TABLE "public"."User"
ADD COLUMN "permissions" JSONB NOT NULL DEFAULT '{}'::jsonb;
