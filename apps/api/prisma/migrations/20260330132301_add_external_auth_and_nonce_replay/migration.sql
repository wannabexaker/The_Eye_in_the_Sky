BEGIN TRY

BEGIN TRAN;

-- AlterTable
ALTER TABLE [dbo].[AuthSession] ADD [authSource] NVARCHAR(1000) NOT NULL CONSTRAINT [AuthSession_authSource_df] DEFAULT 'internal',
[externalSessionRef] NVARCHAR(1000),
[lastValidatedAt] DATETIME2,
[providerKey] NVARCHAR(1000),
[riskFlags] NVARCHAR(1000);

-- CreateTable
CREATE TABLE [dbo].[ExternalIdentity] (
    [id] NVARCHAR(1000) NOT NULL,
    [userId] NVARCHAR(1000) NOT NULL,
    [providerKey] NVARCHAR(1000) NOT NULL,
    [externalUserId] NVARCHAR(1000) NOT NULL,
    [externalUsername] NVARCHAR(1000),
    [metadataJson] NTEXT,
    [createdAt] DATETIME2 NOT NULL CONSTRAINT [ExternalIdentity_createdAt_df] DEFAULT CURRENT_TIMESTAMP,
    [updatedAt] DATETIME2 NOT NULL,
    CONSTRAINT [ExternalIdentity_pkey] PRIMARY KEY CLUSTERED ([id]),
    CONSTRAINT [ExternalIdentity_providerKey_externalUserId_key] UNIQUE NONCLUSTERED ([providerKey],[externalUserId])
);

-- CreateTable
CREATE TABLE [dbo].[AuthNonceReplay] (
    [id] NVARCHAR(1000) NOT NULL,
    [nonceOrJti] NVARCHAR(1000) NOT NULL,
    [providerKey] NVARCHAR(1000) NOT NULL,
    [issuedAt] DATETIME2 NOT NULL,
    [expiresAt] DATETIME2 NOT NULL,
    [consumedAt] DATETIME2,
    [requestHash] NVARCHAR(1000),
    [createdAt] DATETIME2 NOT NULL CONSTRAINT [AuthNonceReplay_createdAt_df] DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT [AuthNonceReplay_pkey] PRIMARY KEY CLUSTERED ([id]),
    CONSTRAINT [AuthNonceReplay_nonceOrJti_providerKey_key] UNIQUE NONCLUSTERED ([nonceOrJti],[providerKey])
);

-- CreateIndex
CREATE NONCLUSTERED INDEX [ExternalIdentity_userId_idx] ON [dbo].[ExternalIdentity]([userId]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [ExternalIdentity_providerKey_idx] ON [dbo].[ExternalIdentity]([providerKey]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [AuthNonceReplay_expiresAt_idx] ON [dbo].[AuthNonceReplay]([expiresAt]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [AuthNonceReplay_providerKey_idx] ON [dbo].[AuthNonceReplay]([providerKey]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [AuthSession_authSource_idx] ON [dbo].[AuthSession]([authSource]);

-- AddForeignKey
ALTER TABLE [dbo].[ExternalIdentity] ADD CONSTRAINT [ExternalIdentity_userId_fkey] FOREIGN KEY ([userId]) REFERENCES [dbo].[User]([id]) ON DELETE CASCADE ON UPDATE NO ACTION;

COMMIT TRAN;

END TRY
BEGIN CATCH

IF @@TRANCOUNT > 0
BEGIN
    ROLLBACK TRAN;
END;
THROW

END CATCH
