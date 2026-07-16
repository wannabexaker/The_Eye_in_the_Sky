-- Record when a user accepted the Terms of Use / Privacy Policy at
-- registration. Nullable: pre-existing accounts registered before the
-- acceptance gate have no recorded timestamp.
ALTER TABLE "User" ADD COLUMN "acceptedTermsAt" TIMESTAMP(3);
