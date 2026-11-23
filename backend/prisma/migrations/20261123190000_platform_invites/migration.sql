-- Platform team invitations are separate from tenant invitations.
CREATE TABLE "platform_invites" (
    "id" UUID NOT NULL,
    "email" CITEXT NOT NULL,
    "role_id" UUID NOT NULL,
    "invited_by_platform_user_id" UUID NOT NULL,
    "token_hash" TEXT NOT NULL,
    "status" "invite_status" NOT NULL DEFAULT 'PENDING',
    "expires_at" TIMESTAMPTZ(6) NOT NULL,
    "accepted_at" TIMESTAMPTZ(6),
    "revoked_at" TIMESTAMPTZ(6),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "platform_invites_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "platform_invites_token_hash_key" ON "platform_invites"("token_hash");
CREATE INDEX "platform_invites_email_status_expires_at_idx" ON "platform_invites"("email", "status", "expires_at");
CREATE INDEX "platform_invites_invited_by_platform_user_id_created_at_idx" ON "platform_invites"("invited_by_platform_user_id", "created_at");
ALTER TABLE "platform_invites"
    ADD CONSTRAINT "platform_invites_role_id_fkey"
    FOREIGN KEY ("role_id") REFERENCES "platform_roles"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "platform_invites"
    ADD CONSTRAINT "platform_invites_invited_by_platform_user_id_fkey"
    FOREIGN KEY ("invited_by_platform_user_id") REFERENCES "platform_users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
