BEGIN TRY

BEGIN TRAN;

-- CreateTable
CREATE TABLE [dbo].[User] (
    [id] NVARCHAR(1000) NOT NULL,
    [email] NVARCHAR(1000) NOT NULL,
    [passwordHash] NVARCHAR(1000) NOT NULL,
    [displayName] NVARCHAR(1000) NOT NULL,
    [role] NVARCHAR(1000) NOT NULL CONSTRAINT [User_role_df] DEFAULT 'player',
    [isActive] BIT NOT NULL CONSTRAINT [User_isActive_df] DEFAULT 1,
    [welcomeBonusClaimed] BIT NOT NULL CONSTRAINT [User_welcomeBonusClaimed_df] DEFAULT 0,
    [createdAt] DATETIME2 NOT NULL CONSTRAINT [User_createdAt_df] DEFAULT CURRENT_TIMESTAMP,
    [updatedAt] DATETIME2 NOT NULL,
    CONSTRAINT [User_pkey] PRIMARY KEY CLUSTERED ([id]),
    CONSTRAINT [User_email_key] UNIQUE NONCLUSTERED ([email])
);

-- CreateTable
CREATE TABLE [dbo].[AuthSession] (
    [id] NVARCHAR(1000) NOT NULL,
    [userId] NVARCHAR(1000) NOT NULL,
    [tokenHash] NVARCHAR(1000) NOT NULL,
    [expiresAt] DATETIME2 NOT NULL,
    [createdAt] DATETIME2 NOT NULL CONSTRAINT [AuthSession_createdAt_df] DEFAULT CURRENT_TIMESTAMP,
    [lastSeenAt] DATETIME2 NOT NULL CONSTRAINT [AuthSession_lastSeenAt_df] DEFAULT CURRENT_TIMESTAMP,
    [userAgent] NVARCHAR(1000),
    [ipAddress] NVARCHAR(1000),
    CONSTRAINT [AuthSession_pkey] PRIMARY KEY CLUSTERED ([id]),
    CONSTRAINT [AuthSession_tokenHash_key] UNIQUE NONCLUSTERED ([tokenHash])
);

-- CreateTable
CREATE TABLE [dbo].[Wallet] (
    [id] NVARCHAR(1000) NOT NULL,
    [userId] NVARCHAR(1000) NOT NULL,
    [currencyCode] NVARCHAR(1000) NOT NULL CONSTRAINT [Wallet_currencyCode_df] DEFAULT 'EUR',
    [balance] DECIMAL(18,2) NOT NULL,
    [createdAt] DATETIME2 NOT NULL CONSTRAINT [Wallet_createdAt_df] DEFAULT CURRENT_TIMESTAMP,
    [updatedAt] DATETIME2 NOT NULL,
    CONSTRAINT [Wallet_pkey] PRIMARY KEY CLUSTERED ([id]),
    CONSTRAINT [Wallet_userId_key] UNIQUE NONCLUSTERED ([userId])
);

-- CreateTable
CREATE TABLE [dbo].[LedgerEntry] (
    [id] NVARCHAR(1000) NOT NULL,
    [walletId] NVARCHAR(1000) NOT NULL,
    [roundId] NVARCHAR(1000),
    [reason] NVARCHAR(1000) NOT NULL,
    [amount] DECIMAL(18,2) NOT NULL,
    [balanceAfter] DECIMAL(18,2) NOT NULL,
    [createdAt] DATETIME2 NOT NULL CONSTRAINT [LedgerEntry_createdAt_df] DEFAULT CURRENT_TIMESTAMP,
    [metadataJson] NTEXT,
    CONSTRAINT [LedgerEntry_pkey] PRIMARY KEY CLUSTERED ([id])
);

-- CreateTable
CREATE TABLE [dbo].[Game] (
    [id] NVARCHAR(1000) NOT NULL,
    [key] NVARCHAR(1000) NOT NULL,
    [title] NVARCHAR(1000) NOT NULL,
    [isActive] BIT NOT NULL CONSTRAINT [Game_isActive_df] DEFAULT 1,
    [createdAt] DATETIME2 NOT NULL CONSTRAINT [Game_createdAt_df] DEFAULT CURRENT_TIMESTAMP,
    [updatedAt] DATETIME2 NOT NULL,
    CONSTRAINT [Game_pkey] PRIMARY KEY CLUSTERED ([id]),
    CONSTRAINT [Game_key_key] UNIQUE NONCLUSTERED ([key])
);

-- CreateTable
CREATE TABLE [dbo].[GameMathProfile] (
    [id] NVARCHAR(1000) NOT NULL,
    [gameId] NVARCHAR(1000) NOT NULL,
    [profileId] NVARCHAR(1000) NOT NULL,
    [label] NVARCHAR(1000) NOT NULL,
    [version] NVARCHAR(1000) NOT NULL,
    [isLegacy] BIT NOT NULL CONSTRAINT [GameMathProfile_isLegacy_df] DEFAULT 0,
    [configJson] NTEXT NOT NULL,
    [targetRtp] FLOAT(53) NOT NULL,
    [volatilityLabel] NVARCHAR(1000) NOT NULL,
    [createdAt] DATETIME2 NOT NULL CONSTRAINT [GameMathProfile_createdAt_df] DEFAULT CURRENT_TIMESTAMP,
    [updatedAt] DATETIME2 NOT NULL,
    CONSTRAINT [GameMathProfile_pkey] PRIMARY KEY CLUSTERED ([id]),
    CONSTRAINT [GameMathProfile_profileId_key] UNIQUE NONCLUSTERED ([profileId]),
    CONSTRAINT [GameMathProfile_version_key] UNIQUE NONCLUSTERED ([version])
);

-- CreateTable
CREATE TABLE [dbo].[AppSetting] (
    [key] NVARCHAR(1000) NOT NULL,
    [value] NVARCHAR(400) NOT NULL,
    [createdAt] DATETIME2 NOT NULL CONSTRAINT [AppSetting_createdAt_df] DEFAULT CURRENT_TIMESTAMP,
    [updatedAt] DATETIME2 NOT NULL,
    CONSTRAINT [AppSetting_pkey] PRIMARY KEY CLUSTERED ([key])
);

-- CreateTable
CREATE TABLE [dbo].[GameSession] (
    [id] NVARCHAR(1000) NOT NULL,
    [userId] NVARCHAR(1000) NOT NULL,
    [gameId] NVARCHAR(1000) NOT NULL,
    [activeProfileId] NVARCHAR(1000) NOT NULL,
    [configVersion] NVARCHAR(1000) NOT NULL,
    [stateJson] NTEXT,
    [lastRoundId] NVARCHAR(1000),
    [startedAt] DATETIME2 NOT NULL CONSTRAINT [GameSession_startedAt_df] DEFAULT CURRENT_TIMESTAMP,
    [lastActiveAt] DATETIME2 NOT NULL CONSTRAINT [GameSession_lastActiveAt_df] DEFAULT CURRENT_TIMESTAMP,
    [endedAt] DATETIME2,
    CONSTRAINT [GameSession_pkey] PRIMARY KEY CLUSTERED ([id]),
    CONSTRAINT [GameSession_userId_gameId_key] UNIQUE NONCLUSTERED ([userId],[gameId])
);

-- CreateTable
CREATE TABLE [dbo].[Round] (
    [id] NVARCHAR(1000) NOT NULL,
    [userId] NVARCHAR(1000) NOT NULL,
    [gameId] NVARCHAR(1000) NOT NULL,
    [gameSessionId] NVARCHAR(1000),
    [profileId] NVARCHAR(1000) NOT NULL,
    [configVersion] NVARCHAR(1000) NOT NULL,
    [seedUsed] NVARCHAR(1000) NOT NULL,
    [mode] NVARCHAR(1000) NOT NULL,
    [chargedBet] DECIMAL(18,2) NOT NULL,
    [bet] DECIMAL(18,2) NOT NULL,
    [totalWin] DECIMAL(18,2) NOT NULL,
    [walletDelta] DECIMAL(18,2) NOT NULL,
    [initialBoardJson] NTEXT,
    [resultJson] NTEXT NOT NULL,
    [createdAt] DATETIME2 NOT NULL CONSTRAINT [Round_createdAt_df] DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT [Round_pkey] PRIMARY KEY CLUSTERED ([id])
);

-- CreateTable
CREATE TABLE [dbo].[BonusState] (
    [id] NVARCHAR(1000) NOT NULL,
    [userId] NVARCHAR(1000) NOT NULL,
    [roundId] NVARCHAR(1000),
    [mode] NVARCHAR(1000) NOT NULL,
    [freeSpinsRemaining] INT NOT NULL,
    [stickyMultiplier] INT NOT NULL,
    [totalBonusWin] DECIMAL(18,2) NOT NULL,
    [betPerSpin] DECIMAL(18,2) NOT NULL,
    [initialBonusBudget] DECIMAL(18,2) NOT NULL,
    [remainingBonusBudget] DECIMAL(18,2) NOT NULL,
    [preBonusBet] DECIMAL(18,2) NOT NULL,
    [stateJson] NTEXT,
    [createdAt] DATETIME2 NOT NULL CONSTRAINT [BonusState_createdAt_df] DEFAULT CURRENT_TIMESTAMP,
    [updatedAt] DATETIME2 NOT NULL,
    CONSTRAINT [BonusState_pkey] PRIMARY KEY CLUSTERED ([id])
);

-- CreateTable
CREATE TABLE [dbo].[AdminAction] (
    [id] NVARCHAR(1000) NOT NULL,
    [userId] NVARCHAR(1000) NOT NULL,
    [actionType] NVARCHAR(1000) NOT NULL,
    [payload] NTEXT NOT NULL,
    [createdAt] DATETIME2 NOT NULL CONSTRAINT [AdminAction_createdAt_df] DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT [AdminAction_pkey] PRIMARY KEY CLUSTERED ([id])
);

-- CreateTable
CREATE TABLE [dbo].[AuditLog] (
    [id] NVARCHAR(1000) NOT NULL,
    [entityType] NVARCHAR(1000) NOT NULL,
    [entityId] NVARCHAR(1000) NOT NULL,
    [eventType] NVARCHAR(1000) NOT NULL,
    [payload] NTEXT NOT NULL,
    [createdAt] DATETIME2 NOT NULL CONSTRAINT [AuditLog_createdAt_df] DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT [AuditLog_pkey] PRIMARY KEY CLUSTERED ([id])
);

-- CreateTable
CREATE TABLE [dbo].[AnalyticsRound] (
    [id] NVARCHAR(1000) NOT NULL,
    [timestampMs] BIGINT NOT NULL,
    [bet] DECIMAL(18,2) NOT NULL,
    [win] DECIMAL(18,2) NOT NULL,
    [net] DECIMAL(18,2) NOT NULL,
    [mode] NVARCHAR(1000) NOT NULL,
    [cascades] INT NOT NULL,
    [bonusTriggered] BIT NOT NULL,
    [multiplier] FLOAT(53) NOT NULL,
    [winMultiple] FLOAT(53) NOT NULL,
    [tier] NVARCHAR(1000) NOT NULL,
    [balanceAfter] DECIMAL(18,2) NOT NULL,
    [createdAt] DATETIME2 NOT NULL CONSTRAINT [AnalyticsRound_createdAt_df] DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT [AnalyticsRound_pkey] PRIMARY KEY CLUSTERED ([id])
);

-- CreateIndex
CREATE NONCLUSTERED INDEX [AuthSession_userId_idx] ON [dbo].[AuthSession]([userId]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [AuthSession_expiresAt_idx] ON [dbo].[AuthSession]([expiresAt]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [LedgerEntry_walletId_createdAt_idx] ON [dbo].[LedgerEntry]([walletId], [createdAt]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [LedgerEntry_reason_createdAt_idx] ON [dbo].[LedgerEntry]([reason], [createdAt]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [GameMathProfile_gameId_idx] ON [dbo].[GameMathProfile]([gameId]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [GameSession_gameId_idx] ON [dbo].[GameSession]([gameId]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [Round_userId_createdAt_idx] ON [dbo].[Round]([userId], [createdAt]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [Round_gameId_createdAt_idx] ON [dbo].[Round]([gameId], [createdAt]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [Round_gameSessionId_idx] ON [dbo].[Round]([gameSessionId]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [BonusState_userId_updatedAt_idx] ON [dbo].[BonusState]([userId], [updatedAt]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [AdminAction_userId_createdAt_idx] ON [dbo].[AdminAction]([userId], [createdAt]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [AuditLog_entityType_entityId_createdAt_idx] ON [dbo].[AuditLog]([entityType], [entityId], [createdAt]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [AnalyticsRound_timestampMs_idx] ON [dbo].[AnalyticsRound]([timestampMs]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [AnalyticsRound_tier_idx] ON [dbo].[AnalyticsRound]([tier]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [AnalyticsRound_createdAt_idx] ON [dbo].[AnalyticsRound]([createdAt]);

-- AddForeignKey
ALTER TABLE [dbo].[AuthSession] ADD CONSTRAINT [AuthSession_userId_fkey] FOREIGN KEY ([userId]) REFERENCES [dbo].[User]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[Wallet] ADD CONSTRAINT [Wallet_userId_fkey] FOREIGN KEY ([userId]) REFERENCES [dbo].[User]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[LedgerEntry] ADD CONSTRAINT [LedgerEntry_walletId_fkey] FOREIGN KEY ([walletId]) REFERENCES [dbo].[Wallet]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[LedgerEntry] ADD CONSTRAINT [LedgerEntry_roundId_fkey] FOREIGN KEY ([roundId]) REFERENCES [dbo].[Round]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[GameMathProfile] ADD CONSTRAINT [GameMathProfile_gameId_fkey] FOREIGN KEY ([gameId]) REFERENCES [dbo].[Game]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[GameSession] ADD CONSTRAINT [GameSession_userId_fkey] FOREIGN KEY ([userId]) REFERENCES [dbo].[User]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[GameSession] ADD CONSTRAINT [GameSession_gameId_fkey] FOREIGN KEY ([gameId]) REFERENCES [dbo].[Game]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[Round] ADD CONSTRAINT [Round_userId_fkey] FOREIGN KEY ([userId]) REFERENCES [dbo].[User]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[Round] ADD CONSTRAINT [Round_gameId_fkey] FOREIGN KEY ([gameId]) REFERENCES [dbo].[Game]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[Round] ADD CONSTRAINT [Round_gameSessionId_fkey] FOREIGN KEY ([gameSessionId]) REFERENCES [dbo].[GameSession]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[BonusState] ADD CONSTRAINT [BonusState_userId_fkey] FOREIGN KEY ([userId]) REFERENCES [dbo].[User]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[BonusState] ADD CONSTRAINT [BonusState_roundId_fkey] FOREIGN KEY ([roundId]) REFERENCES [dbo].[Round]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[AdminAction] ADD CONSTRAINT [AdminAction_userId_fkey] FOREIGN KEY ([userId]) REFERENCES [dbo].[User]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

COMMIT TRAN;

END TRY
BEGIN CATCH

IF @@TRANCOUNT > 0
BEGIN
    ROLLBACK TRAN;
END;
THROW

END CATCH

