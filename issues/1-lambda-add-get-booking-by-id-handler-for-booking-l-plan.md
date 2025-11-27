# Code Generation Plan

**Issue:** #1 - [Lambda]: Add get-booking-by-id handler for booking lookup
**Branch:** `1-lambda-add-get-booking-by-id-handler-for-booking-l`
**Repository:** bcarpio/terraform-serverless
**Backend:** typescript
**Created:** 2025-11-27T22:49:24.150811

## Issue Description

  User Story

  As a user,
  I want to retrieve a specific booking by its ID,
  So that I can view the details of a booking I have made.

  ---
  Handler Specification

  Handler Name: get-booking

  Trigger Type: API Gateway (HTTP GET)

  Timeout: 30 seconds

  Memory: 256 MB

  ---
  Request

  HTTP Method: GET

  Path: /bookings/{id}

  Path Parameters:
  - id: Required, string (UUID format), the booking ID

  Headers:
  - Authorization: Required, Bearer token (JWT)

  ---
  Response Payload

  Success (200):
  {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "date": "2025-01-15",
    "user": {
      "id": "user-123",
      "name": "John Doe",
      "email": "john@example.com"
    }
  }

  Status Codes:

  - 200: Booking found and returned
  - 400: Invalid booking ID format
  - 403: User not authorized to view this booking
  - 404: Booking not found
  - 500: DynamoDB error

  ---
  AWS Resources Needed

  DynamoDB Tables:

  - ${env}-bookings (existing) - Get item access

  SSM Parameters:

  - /${env}/dynamodb/bookings - Table name reference

  ---
  Environment Variables

  | Name              | Description         | Example Value |
  |-------------------|---------------------|---------------|
  | AWS_REGION        | AWS region          | us-east-1     |
  | DYNAMODB_BOOKINGS | DynamoDB table name | dev-bookings  |

  ---
  Business Logic

  1. Extract booking ID from path parameters
  2. Validate booking ID is a valid UUID format
  3. Get user context from event.requestContext.authorizer
  4. Query DynamoDB for booking by ID
  5. If booking not found → return 404
  6. If booking found, check if user owns the booking OR user is ADMIN
  7. If not authorized → return 403
  8. Return booking details

  Error Handling:

  - Invalid UUID format → 400 with validation error message
  - Booking not found → 404 with "Booking not found" message
  - User not owner and not ADMIN → 403 with "Not authorized to view this booking"
  - DynamoDB error → 500, log error with traceback

  Authorization Rules:

  - Users can only view their own bookings (matching user.id)
  - ADMIN users can view any booking

  ---
  Test Scenarios

  Success Cases

  1. Valid request by booking owner → 200 with booking details
  2. Valid request by ADMIN user for any booking → 200 with booking details

  Error Cases

  1. Invalid booking ID format → 400 with {"message": "Invalid booking ID format"}
  2. Non-existent booking ID → 404 with {"message": "Booking not found"}
  3. User requesting another user's booking (non-ADMIN) → 403 with {"message": "Not authorized to view this booking"}
  4. Missing Authorization header → 401 (handled by authorizer)

  Edge Cases

  1. Booking exists but user field is missing → Handle gracefully, allow ADMIN access only
  2. User ID in token doesn't match stored format → Normalize comparison

  ---
  Expected Implementation

  Files to create:

  - api/get-booking/handler.js - Main Lambda handler

  Files to modify:

  - serverless.yml - Add new function and API Gateway endpoint
  - Add function configuration following existing patterns (create-booking, list-bookings)

  Implementation requirements:

  - Follow existing handler patterns (see api/create-booking/handler.js, api/list-bookings/handler.js)
  - Use AWS SDK v2 DocumentClient (matches existing codebase)
  - Use existing authorizer for JWT validation
  - Return consistent JSON response format matching other endpoints

  ---
  Notes

  This is a test story to validate OutcomeOps code generation in a forked OSS repository. The implementation should:

  - Follow existing patterns in the codebase (AWS SDK v2, module.exports pattern)
  - Use existing DynamoDB table and authorizer
  - Match the code style of other handlers
  - Be a straightforward single-item lookup

## Cached Standards

<!-- Standards retrieved during plan generation (avoid re-querying) -->

### Lambda Standards

- # Query: Express route handler standards and patterns

Based on the provided context, I cannot find information about Express route handler standards and patterns.

The context documents focus on:
- **Lambda handler standards** (ADR-004) for AWS serverless applications, including API Gateway handlers, event-driven handlers, and internal workers
- **Frontend standards** (ADR-005) for React applications using the `apiFetch` helper
- **Testing standards** for Lambda functions
- **ADR creation guidelines**

None of these documents discuss Express.js or Express route handlers. The API patterns described are specifically for AWS Lambda functions invoked via API Gateway, not Express.js web servers.

If you need information about Express route handler standards for this project, that documentation would need to be provided in the context.
- # Query: Node.js error handling and middleware patterns

I don't have enough information in the provided context to answer questions about Node.js error handling and middleware patterns.

The context provided focuses exclusively on **Python-based AWS Lambda handlers** and includes:

- **Document 1**: Lambda handler standards for Python (using boto3, Pydantic validation, JWT authentication)
- **Document 2**: Python implementation of a query-kb Lambda orchestrator
- **Document 3**: Python implementation of an ask-claude Lambda using AWS Bedrock
- **Document 4**: Python implementation of an ingest-docs Lambda
- **Document 5**: Python implementation of a run-tests Lambda

All the architectural decisions, code examples, and patterns documented are specific to Python serverless applications on AWS Lambda, not Node.js applications.

To answer your question about Node.js error handling and middleware patterns, I would need context documents that cover Node.js-specific standards, such as:
- Express.js or similar framework middleware patterns
- Node.js error handling conventions
- Async/await error patterns in Node.js
- Node.js-specific ADRs or coding standards
- # Query: TypeScript Express API structure

Based on the provided context, I cannot find specific information about TypeScript Express API structure.

The documents provided cover:

1. **Fantacyai-UI** - A React/TypeScript frontend application with a component-based architecture (Document 1)

2. **OutcomeOps AI Assist Frontend** - A React-based SPA using Vite, TypeScript, Tailwind CSS, and React Router (Document 2 - ADR-005)

3. **Terraform-Serverless** - A serverless booking application using AWS Lambda, API Gateway, and Node.js (Documents 3 & 4)

4. **Code Maps Lambda** - Documentation about generating architectural summaries (Document 5)

While these documents mention TypeScript usage, none of them describe a **TypeScript Express API structure** specifically. The closest relevant information is:

- Document 2 shows a React frontend project structure with TypeScript
- Documents 3 & 4 describe a serverless Node.js API using AWS Lambda and API Gateway (not Express)

To answer your question about TypeScript Express API structure, I would need documentation or ADRs that specifically cover Express.js backend architecture, which is not present in the provided context.

### Terraform Standards

- # Query: Terraform Node.js deployment configuration

Based on the provided context, I can only find limited information about Terraform deployment configuration for Node.js applications.

## Available Information

According to the **config-summary from terraform-serverless**, there is a booking/reservation system that uses:

- **Runtime**: Node.js 12.x across all services
- **Region**: us-east-1
- **Framework**: Serverless Framework (not pure Terraform)
- **Memory Configuration**: Variable by service (e.g., SMS notification uses 128MB in dev, 2048MB in prod)

The system consists of 4 microservices:
1. API Service (5 Lambda functions)
2. Bookings Consumer (stream listener)
3. Email Notification (SQS-triggered)
4. SMS Notification (SQS-triggered)

## Key Configuration Details

From the terraform-serverless documentation:
- All services use **Node.js 12.x runtime**
- Deploy to **us-east-1 region**
- IAM roles and secrets managed via **AWS SSM Parameter Store**
- **Stage-based configuration** (dev/prod)

## Limitations

However, the provided context does **not include**:
- Specific Terraform configuration files for Node.js Lambda deployments
- Package.json or dependency management details
- Build/bundling configuration
- Terraform module usage for Node.js Lambdas
- Version pinning for Node.js-related Terraform modules

The context primarily focuses on:
- General Terraform workflow standards (ADR-004)
- Python-based Lambda deployments (outcome-ops-ai-assist)
- Serverless Framework configuration rather than pure Terraform

**To provide complete Terraform Node.js deployment configuration details, I would need access to the actual Terraform `.tf` files from the terraform-serverless project.**
- # Query: Terraform resource naming conventions

# Terraform Resource Naming Conventions

According to **ADR-004-terraform-workflow**, all resources **MUST** follow this naming pattern:

```
${var.environment}-${var.app_name}-{resource-name}
```

## Required Variables

Every Terraform project must include these variables:

```hcl
variable "environment" {
  description = "Environment name (dev, staging, prd)"
  type        = string
}

variable "app_name" {
  description = "Application name prefix for resources"
  type        = string
}
```

## Implementation Pattern

**Use locals for consistent prefixing:**

```hcl
locals {
  name_prefix = "${var.environment}-${var.app_name}"
}

# Then use throughout:
name = "${local.name_prefix}-licenses"
```

## Examples by Resource Type

According to ADR-004, here are the naming conventions for different AWS resources:

- **DynamoDB table**: `${var.environment}-${var.app_name}-licenses`
  - Result: `dev-outcomeops-licenses`, `prd-outcomeops-licenses`

- **Lambda function**: `${var.environment}-${var.app_name}-generate-code`
  - Result: `dev-outcomeops-generate-code`, `prd-outcomeops-generate-code`

- **S3 bucket**: `${var.environment}-${var.app_name}-artifacts`
  - Result: `dev-outcomeops-artifacts`, `prd-outcomeops-artifacts`

- **Secrets Manager**: `${var.environment}-${var.app_name}/license/private-key`
  - Result: `dev-outcomeops/license/private-key`

This naming convention ensures standardized resource naming across all environments and makes it easy to identify which environment and application a resource belongs to.
- # Query: ECS or Lambda Node.js deployment patterns

Based on the provided context, I can only provide information about **Lambda Node.js deployment patterns**, as there is no information about ECS deployment patterns in the documents.

## Lambda Node.js Deployment Patterns

According to the terraform-serverless repository documentation, the following Lambda Node.js deployment pattern is used:

### Serverless Framework Pattern

**Runtime & Configuration:**
- All Lambda functions use **Node.js 12.x** runtime
- Deploy to **us-east-1** region
- Stage-based configuration (dev/prod)
- IAM roles and secrets managed via **AWS SSM Parameter Store**

### Architecture Pattern

The system implements an **Event-Driven Serverless Microservices Architecture** with:

1. **API Gateway-driven REST endpoints** for synchronous operations
2. **DynamoDB Streams** for event-driven processing
3. **SNS/SQS** for asynchronous notification delivery
4. Decoupled services communicating through AWS managed services

### Service Organization

The codebase is organized into 4 microservices (from config-summary):

1. **API Service** - 5 Lambda functions (register, login, create_booking, list_bookings, authorizer)
2. **Bookings Consumer** - Stream listener for DynamoDB events
3. **Email Notification** - SQS-triggered email sender
4. **SMS Notification** - SQS-triggered SMS sender (128MB dev, 2048MB prod)

### Deployment Tooling

- **Terraform**: Infrastructure provisioning (DynamoDB, IAM, SNS, SQS, SSM)
- **Serverless Framework**: Lambda deployment and API Gateway configuration
- Shell scripts: `deploy.sh`, `destroy.sh` for multi-stage deployment

---

**Note:** The provided context contains no information about ECS deployment patterns. If you need ECS-specific guidance, that information is not available in these documents.

### Testing Standards

- # Query: Jest testing standards and patterns

Based on the provided context, **there are no Jest testing standards or patterns documented**. 

The testing standards in the context are exclusively for **Python-based testing using pytest**, not Jest (which is a JavaScript testing framework).

According to the documented standards:

- **ADR-003** and **ADR-005** establish testing standards for a "Python-based serverless application built on AWS Lambda"
- The mandated testing framework is **pytest** with pytest-cov for coverage reporting
- All testing patterns, examples, and infrastructure shown use Python (mocking with moto, boto3 for AWS services, Pydantic for data models)

From **ADR-003**: "**Framework:** pytest with pytest-cov for coverage reporting"

From **ADR-005**: The test suite uses "pytest with mocking patterns" and follows Python-specific patterns like the Arrange-Act-Assert (AAA) pattern.

If you need Jest testing standards for this project, they would need to be documented separately, as the current architecture documentation only covers Python/pytest-based testing for Lambda functions.
- # Query: TypeScript API testing best practices

Based on the provided context, I cannot find information about TypeScript API testing best practices.

The context documents focus exclusively on **Python-based testing practices** for a serverless application built on AWS Lambda. The testing standards and patterns described are specifically for:

- Python testing with pytest
- Lambda function testing in Python
- AWS service mocking using moto (Python library)
- Python-specific patterns like dynamic module loading with `importlib`

The documents mention testing patterns such as:
- Arrange-Act-Assert pattern
- Unit/integration/functional test pyramid
- Mocking strategies for AWS services

However, **none of the provided documents discuss TypeScript, JavaScript, or API testing practices for TypeScript-based applications**.

To get information about TypeScript API testing best practices, you would need context documents that specifically cover TypeScript testing frameworks (like Jest, Mocha, or Vitest), TypeScript-specific testing patterns, or API testing tools relevant to TypeScript applications.
- # Query: Supertest integration testing patterns

Based on the provided context, **there is no information about Supertest integration testing patterns**.

The context documents describe testing patterns for a Python-based AWS Lambda application called "OutcomeOps AI Assist" that uses:

- **pytest** as the testing framework
- **moto** for AWS service mocking
- **unittest.mock.patch** for external dependencies

According to the testing standards in the context (ADR-003 and ADR-005), the integration testing patterns used are:

1. **Mock-Based Integration Testing** using moto library for AWS services (S3, DynamoDB, SSM, Bedrock)
2. **Fixture-Based Setup** with pytest fixtures
3. **Arrange-Act-Assert Pattern** for test structure

However, **Supertest** (which is typically a Node.js/JavaScript library for testing HTTP APIs) is not mentioned anywhere in the provided documentation. The application appears to be entirely Python-based with no JavaScript/Node.js components described.

If you're looking for integration testing patterns for this specific project, the relevant patterns are documented in Document 1 (Integration Tests Summary) and Documents 2, 4 (ADR-003 and ADR-005 Testing Standards).

## Implementation Steps

### Step 1: Create get-booking handler directory and handler.js ⏳

**Status:** pending
**Description:** Create the Lambda handler for retrieving a booking by ID. Implement UUID validation, DynamoDB query, and authorization logic (user owns booking OR is ADMIN). Follow existing handler patterns from create-booking and list-bookings.

**Files:**
- `api/get-booking/handler.js`

**KB Queries:**
- UUID validation in Node.js Lambda handlers
- DynamoDB GetItem with AWS SDK v2 DocumentClient

---

### Step 2: Create serverless.yml for get-booking function ⏳

**Status:** pending
**Description:** Add serverless.yml configuration for the get-booking Lambda function. Configure API Gateway GET endpoint at /bookings/{id}, set timeout to 30s, memory to 256MB, reference IAM role from SSM, and use existing authorizer.

**Files:**
- `api/get-booking/serverless.yml`

**KB Queries:**
- Serverless Framework path parameters configuration
- Serverless Framework custom authorizer reference

---

### Step 3: Add get-booking IAM role in Terraform ⏳

**Status:** pending
**Description:** Create IAM role for get-booking Lambda with DynamoDB GetItem permissions on bookings table. Store role ARN in SSM parameter following existing pattern.

**Files:**
- `terraform/infra/system/iam-get-booking.tf`

---

### Step 4: Create unit tests for get-booking success cases ⏳

**Status:** pending
**Description:** Create unit tests for happy path scenarios: (1) booking owner retrieves their booking successfully, (2) ADMIN user retrieves any booking successfully. Mock DynamoDB responses and JWT context.

**Files:**
- `api/get-booking/handler.test.js`

**KB Queries:**
- Jest mocking AWS SDK v2 DocumentClient
- Testing Lambda event.requestContext.authorizer

---

### Step 5: Create unit tests for get-booking validation errors ⏳

**Status:** pending
**Description:** Add unit tests for validation error cases: (1) invalid UUID format returns 400, (2) malformed booking ID returns 400 with proper error message.

**Files:**
- `api/get-booking/handler.test.js`

---

### Step 6: Create unit tests for get-booking authorization errors ⏳

**Status:** pending
**Description:** Add unit tests for authorization scenarios: (1) non-owner non-ADMIN user gets 403, (2) booking not found returns 404, (3) DynamoDB error returns 500.

**Files:**
- `api/get-booking/handler.test.js`

---

### Step 7: Create integration tests for get-booking endpoint ⏳

**Status:** pending
**Description:** Add integration tests using supertest: (1) GET /bookings/{id} with valid token returns booking, (2) GET with invalid ID returns 400, (3) GET without authorization returns 401.

**Files:**
- `api/get-booking/integration.test.js`

**KB Queries:**
- Supertest testing API Gateway Lambda endpoints
- Integration testing with JWT tokens in Node.js

---

### Step 8: Update API service serverless.yml to include get-booking ⏳

**Status:** pending
**Description:** Add get-booking function configuration to api/serverless.yml following the pattern of existing functions (create-booking, list-bookings). Include function definition, events, and environment variables.

---

### Step 9: Update deployment scripts if needed ⏳

**Status:** pending
**Description:** Verify deploy.sh includes the get-booking service deployment. Update if necessary to ensure Terraform applies IAM changes before Serverless Framework deployment.

---
