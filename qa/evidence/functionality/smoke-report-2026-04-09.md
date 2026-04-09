# Smoke Report (2026-04-09)

- Command: `npm run test:smoke`
- Exit code: `0`
- Duration: `2.4m` (latest stabilized regression run)

## Result

- Total tests: `10`
- Passed: `10`
- Failed: `0`
- Skipped: `0`

## Notes

- Test scope: Flow 1, Flow 2, and route smoke coverage.
- Runtime warnings from OpenTelemetry dependency version mismatch appeared during web server startup but did not fail execution.
