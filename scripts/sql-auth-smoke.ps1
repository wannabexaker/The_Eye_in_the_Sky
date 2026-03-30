$base = $env:API_BASE_URL
if ([string]::IsNullOrWhiteSpace($base)) {
  $base = "http://localhost:3200"
}

$playerSession = New-Object Microsoft.PowerShell.Commands.WebRequestSession
$playerSessionB = New-Object Microsoft.PowerShell.Commands.WebRequestSession
$adminSession = New-Object Microsoft.PowerShell.Commands.WebRequestSession
$email = "player+a$([guid]::NewGuid().ToString('N').Substring(0,8))@example.com"
$emailB = "player+b$([guid]::NewGuid().ToString('N').Substring(0,8))@example.com"
$password = "Player123!"

$publicConfig = Invoke-RestMethod -Uri "$base/game-config" -WebSession $playerSession -Method Get
$originalProfile = $publicConfig.activeProfileId
$profileUnderTest = if ($originalProfile -eq "constellation_simple_v0_1") { "math_base_v2_0" } else { "constellation_simple_v0_1" }
$null = Invoke-RestMethod -Uri "$base/auth/register" -WebSession $playerSession -Method Post -ContentType "application/json" -Body (@{
  email = $email
  password = $password
  displayName = "Smoke Player"
} | ConvertTo-Json)
$playerSessionDto = Invoke-RestMethod -Uri "$base/auth/me" -WebSession $playerSession -Method Get
$bootstrap = Invoke-RestMethod -Uri "$base/player/bootstrap" -WebSession $playerSession -Method Get
$welcome = Invoke-RestMethod -Uri "$base/player/welcome-bonus/claim" -WebSession $playerSession -Method Post
$welcomeRepeat = Invoke-RestMethod -Uri "$base/player/welcome-bonus/claim" -WebSession $playerSession -Method Post
$deposit = Invoke-RestMethod -Uri "$base/player/wallet/deposit" -WebSession $playerSession -Method Post -ContentType "application/json" -Body (@{
  amount = 25
  methodLabel = "Temple Visa"
} | ConvertTo-Json)
$withdraw = Invoke-RestMethod -Uri "$base/player/wallet/withdraw" -WebSession $playerSession -Method Post -ContentType "application/json" -Body (@{
  amount = 5
  methodLabel = "Temple Visa"
} | ConvertTo-Json)

$roundId = "round-$([guid]::NewGuid().ToString('N'))"
$roundBody = @{
  profileId = "math_base_v2_0"
  result = @{
    roundSummary = @{ roundId = $roundId; timestamp = (Get-Date).ToString("o") }
    nextState = @{
      balance = 0
      bet = 0.1
      betOptions = @(0.1, 0.2, 0.5)
      history = @()
      mode = "base"
      bonusMeter = 0
      bonusState = $null
      freeSpinsRemaining = 0
      lastRoundWin = 0.25
      totalSessionWin = 0.25
      chargedBet = 0.1
      walletDelta = 0.15
    }
    configVersion = "eye-sky-math-v2.0"
    seedUsed = "smoke-seed"
    mode = "base"
    debugMetadata = @{ chargedBet = 0.1 }
    totalWin = 0.25
    bet = 0.1
    walletDelta = 0.15
    initialBoard = @(@("ashen_sigil"))
    appliedWinMultiplier = 1
    bonusTriggered = $false
  }
}

$roundPersist = Invoke-RestMethod -Uri "$base/player/rounds" -WebSession $playerSession -Method Post -ContentType "application/json" -Body ($roundBody | ConvertTo-Json -Depth 10)
$roundPersistDuplicate = Invoke-RestMethod -Uri "$base/player/rounds" -WebSession $playerSession -Method Post -ContentType "application/json" -Body ($roundBody | ConvertTo-Json -Depth 10)
$bootstrapAfterRound = Invoke-RestMethod -Uri "$base/player/bootstrap" -WebSession $playerSession -Method Get

$null = Invoke-RestMethod -Uri "$base/auth/register" -WebSession $playerSessionB -Method Post -ContentType "application/json" -Body (@{
  email = $emailB
  password = $password
  displayName = "Smoke Player B"
} | ConvertTo-Json)
$bootstrapB = Invoke-RestMethod -Uri "$base/player/bootstrap" -WebSession $playerSessionB -Method Get
$welcomeB = Invoke-RestMethod -Uri "$base/player/welcome-bonus/claim" -WebSession $playerSessionB -Method Post
$bootstrapAAfterBWelcome = Invoke-RestMethod -Uri "$base/player/bootstrap" -WebSession $playerSession -Method Get

$playerSelectStatus = $null
try {
  Invoke-RestMethod -Uri "$base/game-config/select" -WebSession $playerSession -Method Post -ContentType "application/json" -Body (@{ profileId = "legacy_v1_3" } | ConvertTo-Json) | Out-Null
  $playerSelectStatus = "unexpected-success"
} catch {
  $playerSelectStatus = $_.Exception.Response.StatusCode.value__
}

$null = Invoke-RestMethod -Uri "$base/auth/login" -WebSession $adminSession -Method Post -ContentType "application/json" -Body (@{
  email = "admin@example.com"
  password = "ChangeMe123!"
} | ConvertTo-Json)
$adminSessionDto = Invoke-RestMethod -Uri "$base/auth/me" -WebSession $adminSession -Method Get
$adminSelect = Invoke-RestMethod -Uri "$base/game-config/select" -WebSession $adminSession -Method Post -ContentType "application/json" -Body (@{
  profileId = $profileUnderTest
} | ConvertTo-Json)
$adminRestore = Invoke-RestMethod -Uri "$base/game-config/select" -WebSession $adminSession -Method Post -ContentType "application/json" -Body (@{
  profileId = $originalProfile
} | ConvertTo-Json)

[pscustomobject]@{
  publicProfile = $originalProfile
  playerRole = $playerSessionDto.user.role
  bootstrapBalance = $bootstrap.wallet.balance
  balanceAfterWelcome = $welcome.wallet.balance
  balanceAfterWelcomeRepeat = $welcomeRepeat.wallet.balance
  balanceAfterDeposit = $deposit.wallet.balance
  balanceAfterWithdraw = $withdraw.wallet.balance
  balanceAfterRound = $roundPersist.wallet.balance
  balanceAfterDuplicateRound = $roundPersistDuplicate.wallet.balance
  duplicateRoundIdempotent = ($roundPersist.wallet.balance -eq $roundPersistDuplicate.wallet.balance)
  restoredBalanceAfterReload = $bootstrapAfterRound.wallet.balance
  restoredSessionId = $bootstrapAfterRound.sessionId
  playerBRole = $bootstrapB.user.role
  playerBBootstrapBalance = $bootstrapB.wallet.balance
  playerBBalanceAfterWelcome = $welcomeB.wallet.balance
  playerAAfterBWelcome = $bootstrapAAfterBWelcome.wallet.balance
  accountIsolationPass = (
    ($bootstrapB.wallet.balance -eq 0) -and
    ($welcomeB.wallet.balance -eq 500) -and
    ($bootstrapAAfterBWelcome.wallet.balance -eq $roundPersist.wallet.balance)
  )
  playerAdminSelectStatus = $playerSelectStatus
  adminRole = $adminSessionDto.user.role
  selectedProfileAfterAdmin = $adminSelect.activeProfileId
  restoredProfileAfterAdmin = $adminRestore.activeProfileId
} | ConvertTo-Json -Depth 5
