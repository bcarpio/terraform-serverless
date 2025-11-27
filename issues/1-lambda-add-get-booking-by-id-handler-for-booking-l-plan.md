# Code Generation Plan

**Issue:** #1 - [Lambda]: Add get-booking-by-id handler for booking lookup
**Branch:** `1-lambda-add-get-booking-by-id-handler-for-booking-l`
**Repository:** bcarpio/terraform-serverless
**Backend:** typescript
**Created:** 2025-11-27T23:59:41.636120

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

The context documents cover:
- **Lambda handler standards** (ADR-004) for AWS serverless applications, including API Gateway handlers, event-driven handlers, and internal workers
- **Frontend standards** (ADR-005) for React applications using the `apiFetch` helper
- **Testing standards** for Lambda functions
- **ADR creation guidelines**

However, none of these documents discuss Express.js or Express route handlers. The API patterns described are specifically for:
1. AWS Lambda functions invoked via API Gateway (not Express)
2. React frontend API clients using fetch/apiFetch

If you need Express route handler standards for this project, that information is not present in the provided context documents.
- # Query: Node.js error handling and middleware patterns

I don't have enough information in the provided context to answer questions about Node.js error handling and middleware patterns.

The provided context focuses exclusively on **Python-based AWS Lambda handlers** and includes:

- **Document 1**: Lambda handler standards for Python (logging, AWS clients, Pydantic validation)
- **Document 2**: Python implementation of `query-kb` Lambda orchestrator
- **Document 3**: Python implementation of `ask-claude` Lambda using AWS Bedrock
- **Document 4**: Python implementation of `ingest-docs` Lambda for GitHub documentation
- **Document 5**: Python implementation of `run-tests` Lambda handler

All examples and patterns in the context are specific to:
- Python Lambda functions
- AWS services (DynamoDB, SSM Parameter Store, Bedrock)
- Python-specific libraries (Pydantic, boto3)

**To answer your question about Node.js**, I would need context documents that cover:
- Node.js/Express middleware patterns
- Node.js error handling conventions
- Node.js Lambda handler standards (if applicable)
- Node.js-specific architectural decision records

The current context does not contain any Node.js-related standards or patterns.
- # Query: TypeScript Express API structure

Based on the provided context, I don't have specific information about TypeScript Express API structure.

The documents provided cover:

1. **Fantacyai-UI** - A React/TypeScript frontend application with a component-based architecture (Document 1)
2. **OutcomeOps AI Assist Frontend** - A React-based SPA using Vite, TypeScript, and Tailwind CSS (Document 2 - ADR-005)
3. **Terraform-Serverless** - A serverless booking application using AWS Lambda, API Gateway, and Node.js (Documents 3 & 4)
4. **Code Maps Lambda** - Documentation about generating code maps for repositories (Document 5)

None of these documents describe a TypeScript Express API structure. The closest relevant information is:

- **Document 4** mentions Node.js Lambda functions for API operations, but these use AWS Lambda/API Gateway rather than Express
- **Documents 1 & 2** describe TypeScript project structures, but these are for React frontend applications, not Express APIs

To answer your question about TypeScript Express API structure, I would need documentation or ADRs specifically covering Express.js backend architecture, routing patterns, middleware organization, or similar Express-specific topics.

### Terraform Standards

- # Query: Terraform Node.js deployment configuration

Based on the provided context, I can only find limited information about Terraform deployment configuration for Node.js applications.

## What the Context Shows

According to the **config-summary from terraform-serverless** (Document 3), there is a booking/reservation system that uses:

- **Runtime**: Node.js 12.x across all services
- **Region**: us-east-1
- **Framework**: Serverless Framework (not pure Terraform)
- **Memory Configuration**: Variable by service (e.g., SMS notification uses 128MB in dev, 2048MB in prod)

The document states: "All use **Node.js 12.x** runtime" and "Deploy to **us-east-1** region" with "Stage-based configuration (dev/prod)".

## What's Missing

The provided context does **not** contain:

1. Specific Terraform configuration examples for Node.js Lambda deployments
2. How to package Node.js dependencies for Lambda in Terraform
3. Node.js-specific environment variable configuration
4. Build or bundling processes for Node.js code
5. Node.js version management in Terraform

## Available Terraform Standards

The context does provide general Terraform standards from **ADR-004-terraform-workflow** (Document 1), including:

- Resource naming conventions: `${var.environment}-${var.app_name}-{resource-name}`
- Module version pinning requirements
- Deployment workflow using plan files
- But these are **language-agnostic** and don't address Node.js-specific concerns

**To get Node.js-specific Terraform deployment configuration, you would need additional documentation that covers Lambda function packaging, runtime configuration, and dependency management for Node.js applications.**
- # Query: Terraform resource naming conventions

# Terraform Resource Naming Conventions

According to **ADR-004-terraform-workflow**, all resources **MUST follow this naming pattern**:

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

According to ADR-004, here are the naming patterns for different AWS resources:

- **DynamoDB table**: `${var.environment}-${var.app_name}-licenses`
  - Result: `dev-outcomeops-licenses`, `prd-outcomeops-licenses`

- **Lambda function**: `${var.environment}-${var.app_name}-generate-code`
  - Result: `dev-outcomeops-generate-code`, `prd-outcomeops-generate-code`

- **S3 bucket**: `${var.environment}-${var.app_name}-artifacts`
  - Result: `dev-outcomeops-artifacts`, `prd-outcomeops-artifacts`

- **Secrets Manager**: `${var.environment}-${var.app_name}/license/private-key`
  - Result: `dev-outcomeops/license/private-key`

This naming convention ensures **standardized resource naming across all environments** and enables clear identification of which environment and application each resource belongs to.
- # Query: ECS or Lambda Node.js deployment patterns

Based on the provided context, I can only provide information about **Lambda Node.js deployment patterns**, as there is no information about ECS deployment patterns in the documents.

## Lambda Node.js Deployment Patterns

According to the terraform-serverless repository documentation:

### Architecture Pattern
The system uses an **Event-Driven Serverless Microservices Architecture** with the following characteristics:

- **API Gateway-driven REST endpoints** for synchronous operations
- **DynamoDB Streams** for event-driven processing
- **SNS/SQS** for asynchronous notification delivery
- Decoupled services communicating through AWS managed services

### Deployment Approach
The repository demonstrates a **dual-tooling pattern**:

1. **Terraform**: Used for infrastructure provisioning (DynamoDB, IAM, SNS, SQS, SSM Parameter Store)
2. **Serverless Framework**: Used for Lambda deployment and API Gateway configuration

### Runtime Configuration
All Lambda functions use:
- **Node.js 12.x** runtime
- Deploy to **us-east-1** region
- IAM roles and secrets managed via **AWS SSM Parameter Store**
- Stage-based configuration (dev/prod)

### Service Organization
The booking system is organized into 4 microservices:
- **API Service** (5 Lambda functions for user registration, login, bookings)
- **Bookings Consumer** (event-driven processor listening to DynamoDB Streams)
- **Email Notification** (SQS-triggered)
- **SMS Notification** (SQS-triggered with configurable memory: 128MB dev, 2048MB prod)

### Deployment Scripts
The system uses shell scripts for deployment orchestration:
- `deploy.sh` for deployment
- `destroy.sh` for teardown
- Multi-stage deployment support

**Note**: The context does not contain any information about ECS deployment patterns or how to deploy Node.js applications to ECS.

### Testing Standards

- # Query: Jest testing standards and patterns

Based on the provided context, **there are no Jest testing standards or patterns documented** for this project.

The context exclusively describes **pytest** as the testing framework for this Python-based serverless application. According to **ADR-003: Testing Standards** and **ADR-005: Testing Standards for Lambda Functions**, the project uses:

- **Framework**: pytest with pytest-cov for coverage reporting
- **Language**: Python
- **AWS Service Mocking**: moto library (not Jest mocks)

The documented testing patterns include:
- Arrange-Act-Assert (AAA) pattern
- pytest fixtures and conftest.py configuration
- moto decorators for AWS service mocking
- Dynamic module loading with importlib

Since this is a Python/Lambda project, Jest (a JavaScript testing framework) is not part of the technology stack or testing standards. If you're looking for testing standards for this project, the relevant documentation is in ADR-003 and ADR-005, which cover pytest-based testing approaches.
- # Query: TypeScript API testing best practices

I cannot provide information about TypeScript API testing best practices based on the provided context.

The context documents focus exclusively on **Python-based testing practices** for a serverless application built on AWS Lambda. Specifically, the documents cover:

- Testing standards for Python Lambda functions using pytest
- Mocking AWS services (DynamoDB, S3, Bedrock, SQS) using moto
- Python-specific patterns like the Arrange-Act-Assert pattern
- Testing frameworks: pytest with pytest-cov

There is **no mention of TypeScript** or TypeScript-specific testing practices in any of the provided documents (ADR-003, ADR-005, test summaries, or implementation documentation).

To answer your question about TypeScript API testing best practices, I would need context documents that specifically address TypeScript testing approaches, frameworks (such as Jest, Mocha, or Vitest), and TypeScript-specific testing patterns.
- # Query: Supertest integration testing patterns

Based on the provided context, **there is no information about Supertest integration testing patterns**.

The context documents describe testing patterns for a Python-based serverless application using:

- **pytest** as the testing framework
- **moto** for AWS service mocking
- **unittest.mock.patch** for external dependencies

According to Document 1 and Document 3, the integration testing patterns used in this codebase are:

1. **Mock-Based Integration Testing** using the `moto` library for AWS services (S3, DynamoDB, SSM)
2. **Fixture-Based Setup** with pytest fixtures
3. **Dynamic Module Loading** using `importlib` to load Lambda handlers
4. **Arrange-Act-Assert Pattern** for test structure

However, **Supertest** (which is typically a Node.js/JavaScript library for HTTP assertion testing) is not mentioned anywhere in the provided documentation. The context only covers Python-based testing approaches for AWS Lambda functions.

If you need information about Supertest patterns specifically, that information is not available in these documents.

## Implementation Steps

### Step 1: Create get-booking handler directory and main handler file ⏳

**Status:** pending
**Description:** Create the api/get-booking/ directory structure and implement the main Lambda handler with UUID validation, DynamoDB lookup, and authorization logic following existing patterns from create-booking and list-bookings handlers

**Files:**
- `api/get-booking/handler.js`

**KB Queries:**
- UUID validation in Node.js Lambda handlers
- DynamoDB GetItem operation with AWS SDK v2 DocumentClient

---

### Step 2: Create serverless.yml for get-booking function ⏳

**Status:** pending
**Description:** Create serverless.yml configuration for the get-booking Lambda function with API Gateway HTTP GET endpoint, environment variables from SSM, and IAM role reference following the pattern from existing api service functions

**Files:**
- `api/get-booking/serverless.yml`

**KB Queries:**
- Serverless Framework HTTP GET path parameters configuration
- Serverless Framework custom authorizer integration

---

### Step 3: Update main API serverless.yml to include get-booking function ⏳

**Status:** pending
**Description:** Add the get-booking function definition to api/serverless.yml following the existing pattern for create-booking and list-bookings, including the GET /bookings/{id} endpoint with authorizer

---

### Step 4: Create Terraform IAM role for get-booking Lambda ⏳

**Status:** pending
**Description:** Create Terraform configuration for the get-booking Lambda IAM role with DynamoDB GetItem permissions on the bookings table, following the pattern from existing Lambda roles in terraform/infra/

**Files:**
- `terraform/infra/system/iam-get-booking.tf`

**KB Queries:**
- Terraform IAM policy for DynamoDB GetItem operation

---

### Step 5: Create SSM parameter for get-booking IAM role ARN ⏳

**Status:** pending
**Description:** Add Terraform SSM parameter resource to store the get-booking Lambda IAM role ARN for reference in serverless.yml, following the existing pattern for other Lambda role ARNs

---

### Step 6: Create unit tests for successful booking retrieval by owner ⏳

**Status:** pending
**Description:** Create Jest unit tests for the happy path scenarios: valid booking ID format, successful DynamoDB lookup, and booking owner authorization returning 200 with booking details

**Files:**
- `api/get-booking/handler.test.js`

**KB Queries:**
- Jest mocking AWS SDK v2 DocumentClient get operation
- Jest test structure for Lambda handlers with API Gateway events

---

### Step 7: Create unit tests for ADMIN user access ⏳

**Status:** pending
**Description:** Create Jest unit tests for ADMIN role authorization: ADMIN user successfully retrieving any booking regardless of ownership, returning 200 with booking details

---

### Step 8: Create unit tests for validation errors ⏳

**Status:** pending
**Description:** Create Jest unit tests for invalid booking ID format validation, testing that malformed UUIDs return 400 with appropriate error message

**KB Queries:**
- Jest expect assertions for HTTP 400 error responses

---

### Step 9: Create unit tests for booking not found scenario ⏳

**Status:** pending
**Description:** Create Jest unit tests for 404 error handling when DynamoDB returns empty result for non-existent booking ID

---

### Step 10: Create unit tests for authorization failures ⏳

**Status:** pending
**Description:** Create Jest unit tests for 403 forbidden scenarios: non-ADMIN user attempting to access another user's booking, returning appropriate error message

---

### Step 11: Create unit tests for DynamoDB error handling ⏳

**Status:** pending
**Description:** Create Jest unit tests for 500 internal server error when DynamoDB operations fail, verifying error logging and response format

**KB Queries:**
- Jest mocking DynamoDB errors and exceptions

---

### Step 12: Create integration tests for successful retrieval flows ⏳

**Status:** pending
**Description:** Create integration tests using supertest (or equivalent for Lambda) to test end-to-end successful booking retrieval by owner and by ADMIN user with real API Gateway event structure

**Files:**
- `api/get-booking/integration.test.js`

**KB Queries:**
- Integration testing patterns for AWS Lambda with API Gateway events

---

### Step 13: Create integration tests for error scenarios ⏳

**Status:** pending
**Description:** Create integration tests for validation errors, not found, and authorization failures using complete API Gateway event payloads with authorization context

---
