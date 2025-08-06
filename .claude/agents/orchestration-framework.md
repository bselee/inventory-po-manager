# Orchestration Execution Framework

## Agent Capability Matrix

| Agent | Primary Skills | Best For | Dependencies | Output Types |
|-------|---------------|----------|--------------|--------------|
| **security-auditor** | OWASP, Auth, Crypto, Validation | Security vulnerabilities, Auth systems, Input validation | None (runs first) | Audit reports, Secure code, Policies |
| **backend-architect** | APIs, Databases, Performance, Scale | System design, Data models, Optimization | Security clearance | Architectures, APIs, Schemas |
| **ui-ux-designer** | React, CSS, Accessibility, UX | Components, Layouts, User flows | API contracts | Components, Styles, Patterns |
| **test-automator** | Jest, Playwright, Coverage, Performance | Test suites, E2E, Coverage | Implementation | Tests, Reports, Configs |
| **devops-automator** | CI/CD, Docker, Monitoring, IaC | Pipelines, Deployment, Monitoring | Tests passing | Configs, Scripts, Dashboards |
| **code-reviewer** | Quality, Standards, Performance, Debt | Reviews, Refactoring, Best practices | Any code | Reviews, Fixes, Guidelines |
| **feature-planner** | Requirements, Stories, Specs | Planning, Documentation, Roadmaps | None (runs first) | Specs, Stories, Diagrams |

## Standard Execution Sequences

### 1. 🔒 Security-First Sequence
```yaml
sequence: security_first
steps:
  - agent: security-auditor
    task: "Audit current security posture"
    parallel: false
    
  - agent: security-auditor
    task: "Fix critical vulnerabilities"
    depends_on: [step_1]
    
  - agent: backend-architect
    task: "Implement secure architecture"
    depends_on: [step_2]
    
  - agent: test-automator
    task: "Create security test suite"
    depends_on: [step_3]
    
  - agent: code-reviewer
    task: "Validate security implementation"
    depends_on: [step_4]
```

### 2. 🚀 Feature Development Sequence
```yaml
sequence: feature_development
steps:
  - agent: feature-planner
    task: "Create feature specifications"
    parallel: false
    
  - parallel_group_1:
    - agent: backend-architect
      task: "Design API and data model"
    - agent: ui-ux-designer
      task: "Design UI components"
    - agent: test-automator
      task: "Setup test framework"
      
  - parallel_group_2:
    - agent: backend-architect
      task: "Implement backend"
      depends_on: [parallel_group_1.backend-architect]
    - agent: ui-ux-designer
      task: "Implement frontend"
      depends_on: [parallel_group_1.ui-ux-designer]
      
  - agent: test-automator
    task: "Create integration tests"
    depends_on: [parallel_group_2]
    
  - agent: code-reviewer
    task: "Review complete implementation"
    depends_on: [step_4]
    
  - agent: devops-automator
    task: "Deploy feature"
    depends_on: [step_5]
```

### 3. 🔧 Refactoring Sequence
```yaml
sequence: refactoring
steps:
  - agent: code-reviewer
    task: "Identify refactoring opportunities"
    parallel: false
    
  - agent: backend-architect
    task: "Plan refactoring strategy"
    depends_on: [step_1]
    
  - parallel_group:
    - agent: backend-architect
      task: "Refactor backend code"
    - agent: ui-ux-designer
      task: "Refactor frontend components"
      
  - agent: test-automator
    task: "Update and run tests"
    depends_on: [parallel_group]
    
  - agent: code-reviewer
    task: "Validate refactoring"
    depends_on: [step_4]
```

### 4. 🎯 Performance Optimization Sequence
```yaml
sequence: performance_optimization
steps:
  - parallel_group_1:
    - agent: code-reviewer
      task: "Profile performance bottlenecks"
    - agent: backend-architect
      task: "Analyze database queries"
      
  - agent: backend-architect
    task: "Create optimization plan"
    depends_on: [parallel_group_1]
    
  - parallel_group_2:
    - agent: backend-architect
      task: "Optimize backend"
    - agent: ui-ux-designer
      task: "Optimize frontend"
    - agent: devops-automator
      task: "Optimize infrastructure"
      
  - agent: test-automator
    task: "Run performance tests"
    depends_on: [parallel_group_2]
    
  - agent: code-reviewer
    task: "Validate improvements"
    depends_on: [step_4]
```

### 5. 🏗️ Full System Implementation
```yaml
sequence: full_implementation
steps:
  - parallel_group_1:
    - agent: feature-planner
      task: "System requirements analysis"
    - agent: security-auditor
      task: "Security requirements"
      
  - agent: backend-architect
    task: "System architecture design"
    depends_on: [parallel_group_1]
    
  - parallel_group_2:
    - agent: backend-architect
      task: "Core backend implementation"
    - agent: ui-ux-designer
      task: "UI framework setup"
    - agent: devops-automator
      task: "Infrastructure setup"
      
  - parallel_group_3:
    - agent: backend-architect
      task: "API implementation"
      depends_on: [parallel_group_2.backend-architect]
    - agent: ui-ux-designer
      task: "Component implementation"
      depends_on: [parallel_group_2.ui-ux-designer]
    - agent: test-automator
      task: "Test implementation"
      
  - agent: code-reviewer
    task: "System integration review"
    depends_on: [parallel_group_3]
    
  - agent: security-auditor
    task: "Final security audit"
    depends_on: [step_5]
    
  - agent: devops-automator
    task: "Production deployment"
    depends_on: [step_6]
```

## Task Delegation Templates

### Template 1: Critical Security Fix
```typescript
{
  sequence: "SEQUENTIAL",
  urgent: true,
  tasks: [
    {
      agent: "security-auditor",
      prompt: `
        CRITICAL SECURITY ISSUE DETECTED
        
        Task: Immediately audit and fix the following vulnerability:
        - Issue: [SPECIFIC_VULNERABILITY]
        - Affected Components: [COMPONENTS]
        - Severity: CRITICAL
        
        Required Deliverables:
        1. Detailed vulnerability analysis
        2. Immediate mitigation steps
        3. Permanent fix implementation
        4. Security test cases
        5. Prevention guidelines
        
        Time Constraint: URGENT - Fix within 2 hours
      `,
      timeout: "2h",
      critical: true
    },
    {
      agent: "test-automator",
      prompt: `
        Create security regression tests for fixed vulnerability:
        - Vulnerability: [FROM_PREVIOUS_STEP]
        - Fix Applied: [FROM_PREVIOUS_STEP]
        
        Create comprehensive tests to ensure this never happens again.
      `,
      depends_on: ["security-auditor"]
    }
  ]
}
```

### Template 2: Feature Implementation
```typescript
{
  sequence: "MIXED",
  tasks: [
    {
      agent: "feature-planner",
      prompt: `
        Analyze and create detailed specifications for:
        Feature: [FEATURE_NAME]
        User Story: [USER_STORY]
        
        Deliverables:
        1. Technical requirements
        2. User acceptance criteria
        3. API contracts
        4. UI/UX requirements
        5. Performance requirements
      `,
      id: "planning"
    },
    {
      parallel: true,
      tasks: [
        {
          agent: "backend-architect",
          prompt: `
            Design and implement backend for:
            Requirements: [FROM planning]
            
            Focus on:
            - Scalable architecture
            - Efficient data model
            - RESTful API design
            - Performance optimization
          `,
          id: "backend"
        },
        {
          agent: "ui-ux-designer",
          prompt: `
            Design and implement frontend for:
            Requirements: [FROM planning]
            
            Focus on:
            - Responsive design
            - Accessibility (WCAG 2.1 AA)
            - Performance optimization
            - User experience
          `,
          id: "frontend"
        }
      ]
    }
  ]
}
```

### Template 3: Code Quality Improvement
```typescript
{
  sequence: "PIPELINE",
  tasks: [
    {
      agent: "code-reviewer",
      prompt: `
        Perform comprehensive code review:
        - Scope: [CODEBASE_AREA]
        - Focus: Quality, Performance, Security, Maintainability
        
        Identify:
        1. Code smells
        2. Performance bottlenecks
        3. Security vulnerabilities
        4. Testing gaps
        5. Documentation needs
      `,
      id: "review",
      output: "issues_list"
    },
    {
      agent: "backend-architect",
      prompt: `
        Create improvement plan for:
        Issues: [FROM review.issues_list]
        
        Prioritize by:
        1. Security impact
        2. Performance impact
        3. Maintainability
        4. Technical debt
      `,
      id: "planning",
      depends_on: ["review"]
    },
    {
      parallel: true,
      tasks: [
        {
          agent: "backend-architect",
          prompt: "Fix backend issues from [planning]",
          filter: "backend_issues"
        },
        {
          agent: "ui-ux-designer",
          prompt: "Fix frontend issues from [planning]",
          filter: "frontend_issues"
        },
        {
          agent: "test-automator",
          prompt: "Add missing tests from [planning]",
          filter: "test_gaps"
        }
      ],
      depends_on: ["planning"]
    }
  ]
}
```

## Dependency Management Rules

### 1. Hard Dependencies (Must Complete)
```yaml
security_audit -> any_implementation
feature_planning -> development
implementation -> testing
testing -> deployment
```

### 2. Soft Dependencies (Preferred Order)
```yaml
architecture_design -> implementation
ui_design -> ui_implementation
test_planning -> test_implementation
```

### 3. Parallel Opportunities
```yaml
can_parallelize:
  - backend_development + frontend_development
  - unit_tests + integration_tests
  - documentation + testing
  - multiple_feature_implementations
  - independent_bug_fixes
```

## Check-in Protocol

### Mandatory Check-ins
```typescript
enum CheckinPoint {
  AFTER_PLANNING = "After requirements/planning phase",
  BEFORE_MAJOR_CHANGE = "Before breaking changes",
  AFTER_SECURITY_AUDIT = "After security findings",
  BEFORE_DEPLOYMENT = "Before production deployment",
  ON_FAILURE = "When any agent task fails",
  ON_CONFLICT = "When agents provide conflicting recommendations",
  AT_MILESTONE = "At each major milestone"
}

interface CheckinData {
  point: CheckinPoint
  completed: TaskResult[]
  upcoming: Task[]
  issues: Issue[]
  recommendation: string
  requiresApproval: boolean
}
```

### Check-in Message Format
```markdown
## 🔄 Orchestrator Check-in: [CHECKPOINT_NAME]

### ✅ Completed by Agents
- **[Agent]**: [Task] - [Key Result]
  - Output: [Brief description]
  - Metrics: [Time, LOC, Tests, etc.]

### 🚧 Currently Processing
- **[Agent]**: [Task] ([X]% complete)
  - Started: [Time]
  - ETA: [Time]

### 📋 Upcoming Tasks
- **[Agent]**: [Task] (Waiting on: [Dependency])

### ⚠️ Issues/Decisions Needed
- [Issue description]
  - Impact: [HIGH/MEDIUM/LOW]
  - Options: 
    1. [Option 1]
    2. [Option 2]
  - Recommendation: [Suggested option]

### 📊 Overall Progress
- Phase: [X] of [Y]
- Tasks: [X]/[Y] completed
- Time: [X] hours elapsed
- Blockers: [None/List]

### 🎯 Next Steps
1. [Immediate action]
2. [Following action]

**❓ Approval needed for:** [Specific decision/action]

**Continue with current plan?** _(Y/N)_
```

## Quality Gates

### Between Agent Handoffs
```typescript
interface QualityGate {
  from_agent: string
  to_agent: string
  criteria: {
    must_have: string[]      // Required outputs
    should_have: string[]    // Recommended outputs
    quality_checks: {
      tests_pass: boolean
      code_coverage: number  // percentage
      security_scan: boolean
      performance_check: boolean
      documentation: boolean
    }
  }
  on_failure: "retry" | "escalate" | "skip" | "alternative_agent"
}
```

## Agent Performance Tracking

### Metrics to Track
```typescript
interface AgentMetrics {
  agent: string
  task: string
  started: Date
  completed: Date
  duration: number
  status: "success" | "partial" | "failed"
  outputs: {
    code_lines: number
    tests_created: number
    issues_found: number
    issues_fixed: number
    documentation_pages: number
  }
  quality_score: number  // 0-100
  retry_count: number
}
```

### Performance Report Template
```markdown
## Agent Performance Report

### Summary
- Total Tasks: [X]
- Agents Used: [Y]
- Parallel Efficiency: [Z]%
- Total Duration: [Time]

### By Agent
| Agent | Tasks | Success Rate | Avg Time | Quality Score |
|-------|-------|-------------|----------|---------------|
| [Name] | [X] | [Y]% | [Time] | [Score]/100 |

### Bottlenecks Identified
- [Agent]: [Issue] - [Recommendation]

### Optimization Opportunities
- [Opportunity description]
```

## Remember: Orchestrator's Prime Directives

1. **ALWAYS delegate specialized work** - Never implement yourself
2. **Maximize parallelization** - Run independent tasks simultaneously  
3. **Track everything** - Monitor progress, performance, and quality
4. **Communicate clearly** - Regular check-ins with detailed status
5. **Handle failures gracefully** - Have fallback plans
6. **Ensure quality** - Use code-reviewer at critical points
7. **Think in systems** - Consider the full lifecycle
8. **Respect dependencies** - Never skip critical prerequisites
9. **Document decisions** - Keep audit trail of all orchestration choices
10. **Optimize continuously** - Learn from each orchestration cycle