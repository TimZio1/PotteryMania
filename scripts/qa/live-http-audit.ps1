param(
  [string]$BaseUrl = "https://potterymania.com",
  [string]$WearSlug = "abstract-design-relaxed-fit-unisex-organic-t-shirt"
)

$ErrorActionPreference = "Stop"

function Invoke-AuditRequest {
  param(
    [string]$Path,
    [int[]]$ExpectedStatuses,
    [switch]$ExpectJsonOk,
    [switch]$ExpectRobotsAdmin
  )

  $uri = if ($Path.StartsWith("http")) { $Path } else { "$BaseUrl$Path" }
  try {
    $response = Invoke-WebRequest -Uri $uri -MaximumRedirection 5 -Headers @{
      "User-Agent" = "PotteryMania-Live-Smoke/1.0"
      "Accept" = "text/html,application/json,text/plain,*/*"
    }
    $statusCode = [int]$response.StatusCode
    $headers = $response.Headers
    $body = [string]$response.Content
    $finalUrl = $response.BaseResponse.ResponseUri.AbsoluteUri
  } catch {
    $webResponse = $_.Exception.Response
    if (-not $webResponse) {
      return [pscustomobject]@{
        path = $Path
        finalUrl = $uri
        status = "REQUEST_FAILED"
        pass = $false
        note = $_.Exception.Message
        xFrameOptions = ""
        xContentTypeOptions = ""
        referrerPolicy = ""
        strictTransportSecurity = ""
      }
    }

    $statusCode = [int]$webResponse.StatusCode
    $headers = $webResponse.Headers
    $reader = New-Object System.IO.StreamReader($webResponse.GetResponseStream())
    $body = $reader.ReadToEnd()
    $finalUrl = $webResponse.ResponseUri.AbsoluteUri
  }

  $pass = $ExpectedStatuses -contains $statusCode
  $notes = @()

  if (-not $pass) {
    $notes += "Expected status one of: $($ExpectedStatuses -join ', ')"
  }

  if ($ExpectJsonOk) {
    try {
      $json = $body | ConvertFrom-Json
      if (-not $json.ok) {
        $pass = $false
        $notes += "JSON payload did not include ok=true"
      }
    } catch {
      $pass = $false
      $notes += "Response was not valid JSON"
    }
  }

  if ($ExpectRobotsAdmin) {
    if ($body -notmatch "Disallow:\s*/admin") {
      $pass = $false
      $notes += "robots.txt did not contain Disallow: /admin"
    }
  }

  [pscustomobject]@{
    path = $Path
    finalUrl = $finalUrl
    status = $statusCode
    pass = $pass
    note = ($notes -join "; ")
    xFrameOptions = [string]$headers["X-Frame-Options"]
    xContentTypeOptions = [string]$headers["X-Content-Type-Options"]
    referrerPolicy = [string]$headers["Referrer-Policy"]
    strictTransportSecurity = [string]$headers["Strict-Transport-Security"]
  }
}

$checks = @(
  @{ Path = "/"; ExpectedStatuses = @(200) },
  @{ Path = "/wear/shop"; ExpectedStatuses = @(200) },
  @{ Path = "/wear/$WearSlug"; ExpectedStatuses = @(200) },
  @{ Path = "/wear/nonexistent-slug-404"; ExpectedStatuses = @(404) },
  @{ Path = "/register"; ExpectedStatuses = @(200) },
  @{ Path = "/login"; ExpectedStatuses = @(200) },
  @{ Path = "/forgot-password"; ExpectedStatuses = @(200) },
  @{ Path = "/pricing"; ExpectedStatuses = @(200) },
  @{ Path = "/privacy"; ExpectedStatuses = @(200) },
  @{ Path = "/terms"; ExpectedStatuses = @(200) },
  @{ Path = "/robots.txt"; ExpectedStatuses = @(200); ExpectRobotsAdmin = $true },
  @{ Path = "/sitemap.xml"; ExpectedStatuses = @(200) },
  @{ Path = "/api/ready"; ExpectedStatuses = @(200); ExpectJsonOk = $true }
)

$results = foreach ($check in $checks) {
  Invoke-AuditRequest @check
}

$results | ConvertTo-Json -Depth 4
