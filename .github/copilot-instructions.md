# GitHub Copilot Instructions

This document provides context and guidelines for GitHub Copilot to better assist with this inventory and purchase order management system.

## Project Overview

This is a Next.js application for managing inventory and purchase orders with:
- **Frontend**: React with TypeScript and Tailwind CSS
- **Backend**: Next.js API routes
- **Database**: Supabase (PostgreSQL)
- **Testing**: Jest (unit/integration), Playwright (E2E)
- **Deployment**: Vercel
- **External Integration**: Finale Inventory API

## Code Standards & Patterns

### TypeScript
- Use strict TypeScript with proper type definitions
- Prefer interfaces over types for object shapes
- Use proper generics and utility types
- Always type function parameters and return values

### React Components
- Use functional components with hooks
- Implement proper error boundaries
- Use TypeScript for prop types
- Follow the component structure: imports → types → component → export

### API Routes
- Use proper HTTP status codes (200, 201, 400, 401, 404, 500)
- Implement consistent error handling
- Validate input data using Zod or similar
- Use proper async/await patterns
- Include CORS headers when needed

### Database Operations
- Use Supabase client for all database operations
- Implement proper error handling for database queries
- Use transactions for multi-table operations
- Include proper type safety with generated types

### Testing Patterns
- **Unit Tests**: Test individual functions and components
- **Integration Tests**: Test API endpoints and database operations
- **E2E Tests**: Use Playwright for full user workflows
- Mock external API calls (Finale API)
- Use descriptive test names and proper assertions

## CI/CD Guidelines

### GitHub Actions Workflows
- Use Node.js 20 for consistency
- Cache npm dependencies for faster builds
- Run tests in parallel when possible
- Upload artifacts for debugging (test reports, build files)
- Use proper environment variables and secrets

### Branch Strategy
- `master/main`: Production-ready code
- `develop`: Integration branch for features
- Feature branches: `feature/description`
- Hotfix branches: `hotfix/description`

### Deployment Strategy
- Automatic deployment to staging on `develop` push
- Automatic deployment to production on `master/main` push
- Manual deployment option via workflow_dispatch
- Health checks after deployment
- Rollback capability

## NPM Scripts Usage

### Development
```bash
npm run dev          # Start development server
npm run build        # Build for production
npm run start        # Start production server
npm run lint         # Run ESLint
npm run type-check   # Run TypeScript checks
```

### Testing
```bash
npm run test               # Run all Jest tests
npm run test:unit         # Unit tests only
npm run test:integration  # Integration tests only
npm run test:coverage     # Generate coverage report
npm run test:e2e          # Run Playwright tests
npm run test:health-e2e   # Health check E2E tests
npm run test:inventory    # Inventory page E2E tests
npm run test:settings     # Settings page E2E tests
```

### Database
```bash
npm run db:migrate   # Run database migrations
npm run db:validate  # Validate database schema
npm run db:backup    # Create database backup
```

## API Integration Patterns

### Finale API Integration
- Use proper authentication headers
- Implement retry logic for failed requests
- Cache responses when appropriate
- Handle rate limiting gracefully
- Log API interactions for debugging

### Error Handling
- Use consistent error response format
- Log errors with proper context
- Implement user-friendly error messages
- Use proper HTTP status codes

## Security Best Practices

### Environment Variables
- Never commit secrets to version control
- Use GitHub Secrets for sensitive data
- Validate environment variables at startup
- Use different secrets for different environments

### Input Validation
- Validate all user inputs
- Sanitize data before database operations
- Use parameterized queries
- Implement CSRF protection

### Authentication & Authorization
- Implement proper session management
- Use secure cookies
- Validate user permissions for each operation
- Log security-related events

## File Organization

```
app/
├── api/                 # API routes
├── components/          # Reusable components
├── inventory/          # Inventory management pages
├── lib/                # Utility functions and configurations
├── purchase-orders/    # Purchase order management
├── settings/           # Application settings
├── types/              # TypeScript type definitions
└── vendors/            # Vendor management

.github/
├── workflows/          # GitHub Actions workflows
├── copilot-instructions.md
└── auto-assign.yml

scripts/                # Database and utility scripts
tests/                  # Test files
├── e2e/               # End-to-end tests
└── creative/          # Advanced automation tests
```

## Common Patterns to Suggest

### API Route Template
```typescript
export async function GET(request: Request) {
  try {
    // Validation
    // Database operation
    // Return response
  } catch (error) {
    console.error('Error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
```

### Component Template
```typescript
interface ComponentProps {
  // Define props
}

export default function Component({ ...props }: ComponentProps) {
  // Component logic
  return (
    // JSX
  );
}
```

### Test Template
```typescript
describe('Component/Function Name', () => {
  it('should do something specific', async () => {
    // Arrange
    // Act
    // Assert
  });
});
```

## Workflow Suggestions

When working with this codebase:

1. **Always run tests** before committing
2. **Use descriptive commit messages** following conventional commits
3. **Create feature branches** for new functionality
4. **Write tests** for new features and bug fixes
5. **Update documentation** when adding new features
6. **Check CI/CD status** before merging PRs
7. **Monitor deployment** health after releases

## Dependencies to Prefer

- **UI**: Tailwind CSS, Lucide React (icons)
- **Forms**: React Hook Form, Zod (validation)
- **Date handling**: date-fns
- **HTTP requests**: Built-in fetch or axios
- **Testing**: Jest, Playwright, Testing Library
- **File processing**: Papa Parse (CSV), XLSX, jsPDF

## Performance Considerations

- Implement proper caching strategies
- Use React.memo for expensive components
- Optimize database queries
- Implement pagination for large datasets
- Use proper loading states
- Minimize bundle size

Remember: This is a production application handling business-critical inventory data. Prioritize reliability, security, and maintainability in all suggestions.
