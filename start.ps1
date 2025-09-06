Write-Host "🚀 Starting MindfulChat Sentiment Service..." -ForegroundColor Green
$sentimentJob = Start-Job -ScriptBlock {
    # Ensure we are in the right directory inside the job
    Push-Location "$using:PWD\sentiment_service"
    python app.py
    Pop-Location
}

# --- Configuration Load for Health Check ---
# Set the default port (must match the default in sentiment_service/app.py)
$sentimentPort = "5001"
$envFilePath = "$PSScriptRoot/.env"

if (Test-Path $envFilePath) {
    try {
        # Read the .env file and find the port variable
        $portLine = Get-Content $envFilePath | Select-String -Pattern '^SENTIMENT_SERVICE_PORT=' -SimpleMatch
        if ($portLine) {
            # Found it. Split the line at '=' and take the second part (the value)
            $sentimentPort = ($portLine.Line -split '=')[1].Trim()
            Write-Host "Found SENTIMENT_SERVICE_PORT in .env, using port $sentimentPort" -ForegroundColor Cyan
        } else {
            Write-Host "SENTIMENT_SERVICE_PORT not set in .env, using default 5001." -ForegroundColor Yellow
        }
    } catch {
        Write-Host "Error reading .env file, falling back to default port 5001." -ForegroundColor Yellow
    }
} else {
    Write-Host ".env file not found, using default port 5001." -ForegroundColor Yellow
}


# --- Health Check Polling Loop ---
# Construct the URL dynamically using the loaded (or default) port
$serviceUrl = "http://localhost:$sentimentPort/healthz"
$maxRetries = 20 # Wait for a maximum of 20 seconds
$serviceReady = $false

Write-Host "Waiting for sentiment service to be ready at $serviceUrl..." -ForegroundColor Yellow
for ($i = 1; $i -le $maxRetries; $i++) {
    if ($sentimentJob.State -ne 'Running') {
        Write-Host "❌ Sentiment service job failed to stay running. State: $($sentimentJob.State)" -ForegroundColor Red
        Receive-Job $sentimentJob # Print any error output from the job
        break
    }

    try {
        $response = Invoke-WebRequest -Uri $serviceUrl -UseBasicParsing -TimeoutSec 1 -ErrorAction SilentlyContinue
        if ($response.StatusCode -eq 200) {
            Write-Host "✅ Sentiment service is up and running!" -ForegroundColor Green
            $serviceReady = $true
            break
        }
    }
    catch {
        # Catch connection errors, which are expected while the service is starting
    }
    
    Write-Host "  Attempt $i of $maxRetries... still waiting."
    Start-Sleep -Seconds 1
}

# --- Proceed or Fail ---
if (-not $serviceReady) {
    Write-Host "❌ CRITICAL: Sentiment service did not start within $maxRetries seconds." -ForegroundColor Red
    Write-Host "Please check the 'sentiment_service' logs for errors."
    Stop-Job -Job $sentimentJob
    Remove-Job -Job $sentimentJob
    exit 1
}

Write-Host "`n🚀 Starting Node.js MindfulChat Backend..." -ForegroundColor Cyan
# Run Node.js in the current console
npm run dev

# --- Cleanup ---
Write-Host "Shutting down background sentiment service job..."
Stop-Job -Job $sentimentJob
Remove-Job -Job $sentimentJob