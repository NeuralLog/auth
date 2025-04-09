# Security Updates

This document tracks security updates and vulnerability fixes in NeuralLog Auth.

## Recent Security Fixes

### April 2025

#### Axios Vulnerabilities Fixed (v1.6.7)

Two vulnerabilities in the axios dependency were fixed by updating to version 1.6.7:

1. **High Severity (CVE-2025-27152)**: SSRF and Credential Leakage vulnerability
   - **Affected versions**: < 0.30.0
   - **Issue**: When `baseURL` is set in axios and an absolute URL is passed to methods like `get()`, axios ignores the `baseURL` and sends the request to the specified absolute URL, potentially causing SSRF and credential leakage.
   - **Impact**: Sensitive API keys or credentials could be exposed to unintended third-party hosts, and attackers could send requests to internal hosts on the network.
   - **Fix**: Updated to axios v1.6.7 which includes the patch for this vulnerability.

2. **Moderate Severity (CVE-2023-45857)**: Cross-Site Request Forgery vulnerability
   - **Affected versions**: >= 0.8.1, < 0.28.0
   - **Issue**: Axios inadvertently reveals the confidential XSRF-TOKEN stored in cookies by including it in the HTTP header X-XSRF-TOKEN for every request made to any host.
   - **Impact**: Attackers could potentially view sensitive CSRF tokens.
   - **Fix**: Updated to axios v1.6.7 which includes the patch for this vulnerability.

## Security Best Practices

NeuralLog Auth follows these security best practices:

1. **Regular Dependency Updates**: Dependencies are regularly updated to include the latest security patches.
2. **Automated Security Scanning**: Automated security scanning is performed as part of the CI/CD pipeline.
3. **Vulnerability Disclosure**: Security vulnerabilities are promptly addressed and documented.
4. **Secure Coding Practices**: The codebase follows secure coding practices and undergoes regular security reviews.

## Reporting Security Issues

If you discover a security vulnerability in NeuralLog Auth, please report it by sending an email to [security@neurallog.com](mailto:security@neurallog.com). Please do not disclose security vulnerabilities publicly until they have been addressed by the team.

## Security Tools

NeuralLog Auth uses the following security tools:

1. **GitHub Dependabot**: Automatically detects vulnerable dependencies and creates pull requests to update them.
2. **OWASP Dependency-Check**: Identifies known vulnerabilities in project dependencies.
3. **ESLint Security Plugin**: Static analysis tool that identifies potential security vulnerabilities in the code.
4. **Snyk**: Continuously monitors for new vulnerabilities and provides remediation advice.
5. **CodeQL**: GitHub's semantic code analysis engine that identifies potential security vulnerabilities.

## Security Testing

Security testing is performed as part of the CI/CD pipeline. The following tests are run:

1. **Dependency Scanning**: Scans dependencies for known vulnerabilities.
2. **Static Application Security Testing (SAST)**: Analyzes source code for security vulnerabilities.
3. **Software Composition Analysis (SCA)**: Identifies open source components and their known vulnerabilities.

For more information on security practices, see the [Security Considerations](../architecture/security.md) document.
