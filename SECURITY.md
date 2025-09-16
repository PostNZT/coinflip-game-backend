# Security Documentation

## Overview

This document outlines the security measures implemented in the coinflip game backend to protect against common vulnerabilities and ensure fair gameplay.

## Security Features

### 1. Input Validation
- **Global Validation Pipe**: All incoming requests are validated using class-validator decorators
- **Type Safety**: TypeScript ensures type safety at compile time
- **Sanitization**: Input data is sanitized and unknown properties are stripped
- **DTOs**: Data Transfer Objects enforce strict input/output schemas

### 2. Rate Limiting
- **IP-based Rate Limiting**: 100 requests per 15-minute window per IP address
- **Configurable Limits**: Rate limits can be adjusted via environment variables
- **Memory-based**: Uses in-memory storage for rate limit tracking (consider Redis for production)

### 3. Error Handling
- **Global Exception Filter**: Centralized error handling prevents information leakage
- **Custom Exceptions**: Specific exception types for different error scenarios
- **Error Logging**: All errors are logged for monitoring and debugging
- **Production Mode**: Detailed error messages are hidden in production

### 4. CORS Configuration
- **Development**: Allows all origins for ease of development
- **Production**: Restricts origins to configured frontend URLs only
- **Credentials**: Supports credentials for authenticated requests
- **Headers**: Only allows specific headers to prevent header injection

### 5. Environment Validation
- **Required Variables**: Validates all required environment variables on startup
- **URL Validation**: Ensures URLs are properly formatted
- **Secure Defaults**: Sets secure default values for optional configuration

### 6. Provably Fair Gaming
- **Cryptographic Seeds**: Uses cryptographically secure random number generation
- **Hash Verification**: Players can verify game results using provided seeds
- **Transparent Algorithm**: All randomness generation is documented and verifiable
- **Immutable Results**: Game results cannot be changed once generated

## Security Considerations

### Database Security
- **Parameterized Queries**: Supabase client prevents SQL injection
- **Row Level Security**: Enable RLS policies in Supabase for additional protection
- **Connection Security**: Uses encrypted connections to database

### WebSocket Security
- **Rate Limiting**: WebSocket connections are subject to rate limiting
- **Input Validation**: All WebSocket messages are validated
- **Connection Management**: Proper cleanup of disconnected clients
- **Error Handling**: WebSocket errors are handled gracefully

### Logging and Monitoring
- **Error Logging**: All errors are logged with context
- **Access Logging**: Important operations are logged for audit trail
- **Security Events**: Rate limit violations and security events are logged
- **No Sensitive Data**: Logs do not contain sensitive information

## Environment Variables

### Required (Production)
```bash
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=your-anon-key
FRONTEND_URL=https://yourdomain.com,https://www.yourdomain.com
```

### Optional (Security)
```bash
NODE_ENV=production
RATE_LIMIT_MAX=100
RATE_LIMIT_WINDOW_MS=900000
LOG_LEVEL=warn
PORT=8080
```

## Deployment Security

### Production Checklist
- [ ] Set NODE_ENV=production
- [ ] Configure proper CORS origins
- [ ] Set up proper logging
- [ ] Enable Supabase RLS policies
- [ ] Configure reverse proxy (nginx/cloudflare)
- [ ] Set up SSL/TLS certificates
- [ ] Configure firewall rules
- [ ] Set up monitoring and alerting

### Recommended Infrastructure
- **Reverse Proxy**: nginx or Cloudflare for additional security
- **SSL/TLS**: HTTPS only in production
- **Database**: Enable Row Level Security in Supabase
- **Monitoring**: Set up error tracking and performance monitoring
- **Backups**: Regular database backups

## Security Testing

### Automated Tests
- Input validation tests
- Rate limiting tests
- Error handling tests
- WebSocket security tests

### Manual Testing
- SQL injection attempts
- XSS prevention
- CORS policy testing
- Rate limit verification

## Reporting Security Issues

If you discover a security vulnerability, please report it to:
- Email: security@yourdomain.com
- Include: Detailed description and reproduction steps
- Response: We aim to respond within 24 hours

## Security Updates

- Regularly update dependencies
- Monitor security advisories
- Apply security patches promptly
- Review and update security policies

## Compliance

This implementation follows security best practices for:
- OWASP Top 10 protection
- Secure coding standards
- Data protection principles
- Fair gaming regulations