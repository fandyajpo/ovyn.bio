-- The profile picture now lives solely in `profiles.avatar_key`; the synced
-- Discord avatar column is no longer written or read anywhere.
ALTER TABLE "discord_accounts" DROP COLUMN "avatar_url";