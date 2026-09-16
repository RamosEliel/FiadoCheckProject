<#
.SYNOPSIS
  Configura el login OIDC de GitHub Actions -> Azure para fiadocheck-api y
  fiadocheck-ml, y carga los secrets que esperan los workflows.

.DESCRIPTION
  Los deploys fallan en el paso "Login to Azure" porque los secrets
  AZUREAPPSERVICE_CLIENTID_* / TENANTID_* / SUBSCRIPTIONID_* estan vacios en el
  repo. Este script:
    1. Crea (o reutiliza) un App Registration + Service Principal en Azure AD.
    2. Le agrega una credencial federada para push a la rama 'develop'.
    3. Le asigna rol Contributor sobre los dos App Services.
    4. Carga los 6 secrets en GitHub con los nombres EXACTOS de los workflows.

.PREREQUISITOS  (una sola vez)
    az login     # con permisos para crear App Registrations y asignar roles
    gh auth login
  Ejecutar desde la raiz del repo. Si tienes varias suscripciones, selecciona la
  correcta antes:  az account set --subscription "<nombre-o-id>"
#>

$ErrorActionPreference = 'Stop'

# ------------------------- Parametros -------------------------
$repo      = 'RamosEliel/FiadoCheckProject'
$branch    = 'develop'
$appApi    = 'fiadocheck-api'
$appMl     = 'fiadocheck-ml'
$adAppName = 'github-fiadocheck-deploy'   # App Registration a crear/reutilizar

# Nombres EXACTOS de secrets que referencian los workflows (.github/workflows)
$secApi = @{
  clientId       = 'AZUREAPPSERVICE_CLIENTID_99C12A82EE6B4734A2CEFFE27A3FD4C1'
  tenantId       = 'AZUREAPPSERVICE_TENANTID_4E57A2E4EB6C4569B96D5A5E7221C1B7'
  subscriptionId = 'AZUREAPPSERVICE_SUBSCRIPTIONID_B50973E5A0A04BD2BB2DB9A77A507C3C'
}
$secMl = @{
  clientId       = 'AZUREAPPSERVICE_CLIENTID_09D05102077343CA88E5D76159F20FB1'
  tenantId       = 'AZUREAPPSERVICE_TENANTID_8C442D8B6A3A44D7AE1E288375860E62'
  subscriptionId = 'AZUREAPPSERVICE_SUBSCRIPTIONID_B9F1AD6F78A24901B2DD548CC327B892'
}

# ------------------------- Verificaciones -------------------------
Write-Host '==> Verificando sesiones de az y gh...' -ForegroundColor Cyan
az account show 1>$null
gh auth status 1>$null

$subscriptionId = az account show --query id       -o tsv
$tenantId       = az account show --query tenantId -o tsv
Write-Host "    Suscripcion: $subscriptionId"
Write-Host "    Tenant:      $tenantId"

# ------------------------- App Registration -------------------------
$appId = az ad app list --display-name $adAppName --query "[0].appId" -o tsv
if ([string]::IsNullOrWhiteSpace($appId)) {
  Write-Host "==> Creando App Registration '$adAppName'..." -ForegroundColor Cyan
  $appId = az ad app create --display-name $adAppName --query appId -o tsv
} else {
  Write-Host "==> Reutilizando App Registration existente: $appId"
}

# ------------------------- Service Principal -------------------------
$spId = az ad sp list --filter "appId eq '$appId'" --query "[0].id" -o tsv
if ([string]::IsNullOrWhiteSpace($spId)) {
  Write-Host '==> Creando Service Principal...' -ForegroundColor Cyan
  az ad sp create --id $appId 1>$null
  $spId = az ad sp list --filter "appId eq '$appId'" --query "[0].id" -o tsv
}

# ------------------------- Credencial federada (OIDC) -------------------------
$subject = "repo:${repo}:ref:refs/heads/${branch}"
$existingFic = az ad app federated-credential list --id $appId `
                 --query "[?subject=='$subject'] | [0].name" -o tsv
if ([string]::IsNullOrWhiteSpace($existingFic)) {
  Write-Host "==> Creando credencial federada para $subject..." -ForegroundColor Cyan
  $fic = @{
    name      = "gh-$branch"
    issuer    = 'https://token.actions.githubusercontent.com'
    subject   = $subject
    audiences = @('api://AzureADTokenExchange')
  } | ConvertTo-Json -Compress
  $tmp = New-TemporaryFile
  $fic | Set-Content -Path $tmp.FullName -Encoding utf8
  az ad app federated-credential create --id $appId --parameters "@$($tmp.FullName)" 1>$null
  Remove-Item $tmp.FullName
} else {
  Write-Host '==> La credencial federada ya existe.'
}

# ------------------------- Rol Contributor sobre las apps -------------------------
foreach ($app in @($appApi, $appMl)) {
  $resId = az resource list --name $app --resource-type 'Microsoft.Web/sites' `
             --query "[0].id" -o tsv
  if ([string]::IsNullOrWhiteSpace($resId)) {
    Write-Warning "No se encontro el App Service '$app' en esta suscripcion. Revisa 'az account set'."
    continue
  }
  Write-Host "==> Asignando Contributor sobre $app..." -ForegroundColor Cyan
  az role assignment create --assignee-object-id $spId `
    --assignee-principal-type ServicePrincipal `
    --role Contributor --scope $resId 1>$null 2>$null
}

# ------------------------- Cargar secrets en GitHub -------------------------
Write-Host '==> Cargando secrets en GitHub...' -ForegroundColor Cyan
foreach ($set in @($secApi, $secMl)) {
  gh secret set $set.clientId       --repo $repo --body $appId
  gh secret set $set.tenantId       --repo $repo --body $tenantId
  gh secret set $set.subscriptionId --repo $repo --body $subscriptionId
}

Write-Host ''
Write-Host '==> Secrets configurados:' -ForegroundColor Green
gh secret list --repo $repo

Write-Host ''
Write-Host 'Relanzando los deploys fallidos...' -ForegroundColor Yellow
$runs = gh run list --branch $branch --workflow 'develop_fiadocheck-api.yml' --limit 1 --json databaseId --jq '.[0].databaseId'
if ($runs) { gh run rerun $runs --failed }
$runsMl = gh run list --branch $branch --workflow 'develop_fiadocheck-ml.yml' --limit 1 --json databaseId --jq '.[0].databaseId'
if ($runsMl) { gh run rerun $runsMl --failed }

Write-Host ''
Write-Host 'Listo. Revisa el estado con: gh run list --branch develop --limit 5' -ForegroundColor Green
