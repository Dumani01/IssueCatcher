param([string]$PgBin='')
$ErrorActionPreference='Stop'
$projectRoot=Split-Path $PSScriptRoot -Parent
Set-Location -LiteralPath $projectRoot
if(!$PgBin){$PgBin=Join-Path $projectRoot '.local\pgsql\bin'}
if(!(Test-Path -LiteralPath (Join-Path $PgBin 'pg_ctl.exe'))){
 New-Item -ItemType Directory -Path '.local' -Force | Out-Null
 $archive=Join-Path $projectRoot '.local\postgresql.zip'
 Invoke-WebRequest 'https://get.enterprisedb.com/postgresql/postgresql-17.12-2-windows-x64-binaries.zip' -OutFile $archive
 if((Get-FileHash -LiteralPath $archive -Algorithm SHA256).Hash -ne '520C8C6F19ABB3B31FA83EC5E486E2F769EEDD7593D94E60A7CDA8A5BFB4DF91'){throw 'PostgreSQL checksum mismatch'}
 Expand-Archive -LiteralPath $archive -DestinationPath '.local'
}
& npm.cmd ci
if($LASTEXITCODE -ne 0){throw 'npm ci failed'}
& npm.cmd run setup
if($LASTEXITCODE -ne 0){throw 'setup failed'}
& node scripts/local-db.mjs --password-only
if(!(Test-Path '.local\pgdata\PG_VERSION')){
 & (Join-Path $PgBin 'initdb.exe') -D '.local\pgdata' -U postgres --pwfile='.local\pg-password' --auth=scram-sha-256 --encoding=UTF8 --locale=C
 if($LASTEXITCODE -ne 0){throw 'initdb failed'}
 Add-Content '.local\pgdata\postgresql.conf' "`nlisten_addresses = '127.0.0.1'`nport = 55432`npassword_encryption = 'scram-sha-256'"
}
& (Join-Path $PgBin 'pg_ctl.exe') -D '.local\pgdata' status
if($LASTEXITCODE -ne 0){& (Join-Path $PgBin 'pg_ctl.exe') -D '.local\pgdata' -l '.local\postgres.log' -w start;if($LASTEXITCODE -ne 0){throw 'PostgreSQL start failed'}}
& node scripts/local-db.mjs
if($LASTEXITCODE -ne 0){throw 'database provisioning failed'}
& npm.cmd run db:seed
if($LASTEXITCODE -ne 0){throw 'seed failed'}
& npm.cmd run build
if($LASTEXITCODE -ne 0){throw 'build failed'}
Write-Host 'Ready: npm run local:start, then http://localhost:3001. Private accounts: backend/.local/demo-accounts.json'
