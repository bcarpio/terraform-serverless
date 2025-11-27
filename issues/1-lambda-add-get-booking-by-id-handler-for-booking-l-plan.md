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
- **Lambda handler standards** (ADR-004) for AWS serverless applications, including API Gateway handlers, event-driven handlers, and internal workers
- **Frontend standards** (ADR-005) for React applications using the `apiFetch` helper
- **Testing standards** for Lambda functions
- **ADR creation guidelines**
- # Query: Node.js error handling and middleware patterns
- **Document 1**: Lambda handler standards for Python (using boto3, Pydantic validation, JWT authentication)
- **Document 2**: Python implementation of a query-kb Lambda orchestrator
- **Document 3**: Python implementation of an ask-claude Lambda using AWS Bedrock
- **Document 4**: Python implementation of an ingest-docs Lambda
- **Document 5**: Python implementation of a run-tests Lambda
- Express.js or similar framework middleware patterns
- Node.js error handling conventions
- Async/await error patterns in Node.js
- Node.js-specific ADRs or coding standards
- # Query: TypeScript Express API structure
- Document 2 shows a React frontend project structure with TypeScript
- Documents 3 & 4 describe a serverless Node.js API using AWS Lambda and API Gateway (not Express)

### Terraform Standards

- # Query: Terraform Node.js deployment configuration

### Testing Standards

- # Query: Jest testing standards and patterns
- **ADR-003** and **ADR-005** establish testing standards for a "Python-based serverless application built on AWS Lambda"
- The mandated testing framework is **pytest** with pytest-cov for coverage reporting
- All testing patterns, examples, and infrastructure shown use Python (mocking with moto, boto3 for AWS services, Pydantic for data models)
- # Query: TypeScript API testing best practices
- Python testing with pytest
- Lambda function testing in Python
- AWS service mocking using moto (Python library)
- Python-specific patterns like dynamic module loading with `importlib`
- Arrange-Act-Assert pattern
- Unit/integration/functional test pyramid
- Mocking strategies for AWS services
- # Query: Supertest integration testing patterns
- **pytest** as the testing framework
- **moto** for AWS service mocking
- **unittest.mock.patch** for external dependencies

## Implementation Steps

### Step 1: Create get-booking handler directory and handler.js ✅

**Status:** completed
**Description:** Create the Lambda handler for retrieving a booking by ID. Implement UUID validation, DynamoDB query, and authorization logic (user owns booking OR is ADMIN). Follow existing handler patterns from create-booking and list-bookings.

**Files:**
- `api/get-booking/handler.js`

**KB Queries:**
- UUID validation in Node.js Lambda handlers
- DynamoDB GetItem with AWS SDK v2 DocumentClient

**Completed:** 2025-11-27T22:51:38.672259

**Cost:** $0.074688 (2801 input tokens, 4419 output tokens)

---

### Step 2: Create serverless.yml for get-booking function ✅

**Status:** completed
**Description:** Add serverless.yml configuration for the get-booking Lambda function. Configure API Gateway GET endpoint at /bookings/{id}, set timeout to 30s, memory to 256MB, reference IAM role from SSM, and use existing authorizer.

**Files:**
- `api/get-booking/serverless.yml`

**KB Queries:**
- Serverless Framework path parameters configuration
- Serverless Framework custom authorizer reference

**Completed:** 2025-11-27T22:52:53.110207

**Cost:** $0.041085 (8145 input tokens, 1110 output tokens)

---

### Step 3: Add get-booking IAM role in Terraform ✅

**Status:** completed
**Description:** Create IAM role for get-booking Lambda with DynamoDB GetItem permissions on bookings table. Store role ARN in SSM parameter following existing pattern.

**Files:**
- `terraform/infra/system/iam-get-booking.tf`

**Completed:** 2025-11-27T22:53:58.523577

**Cost:** $0.083619 (8803 input tokens, 3814 output tokens)

---

### Step 4: Create unit tests for get-booking success cases ✅

**Status:** completed
**Description:** Create unit tests for happy path scenarios: (1) booking owner retrieves their booking successfully, (2) ADMIN user retrieves any booking successfully. Mock DynamoDB responses and JWT context.

**Files:**
- `api/get-booking/handler.test.js`

**KB Queries:**
- Jest mocking AWS SDK v2 DocumentClient
- Testing Lambda event.requestContext.authorizer

**Completed:** 2025-11-27T22:56:23.139144

**Cost:** $0.169404 (14123 input tokens, 8469 output tokens)

---

### Step 5: Create unit tests for get-booking validation errors ✅

**Status:** completed
**Description:** Add unit tests for validation error cases: (1) invalid UUID format returns 400, (2) malformed booking ID returns 400 with proper error message.

**Files:**
- `api/get-booking/handler.test.js`

**Completed:** 2025-11-27T22:59:46.546420

**Cost:** $0.352836 (22617 input tokens, 18999 output tokens)

---

### Step 6: Create unit tests for get-booking authorization errors ✅

**Status:** completed
**Description:** Add unit tests for authorization scenarios: (1) non-owner non-ADMIN user gets 403, (2) booking not found returns 404, (3) DynamoDB error returns 500.

**Files:**
- `api/get-booking/handler.test.js`

**Completed:** 2025-11-27T23:04:42.525668

**Cost:** $0.528309 (33588 input tokens, 28503 output tokens)

---

### Step 7: Create integration tests for get-booking endpoint ✅

**Status:** completed
**Description:** Add integration tests using supertest: (1) GET /bookings/{id} with valid token returns booking, (2) GET with invalid ID returns 400, (3) GET without authorization returns 401.

**Files:**
- `api/get-booking/integration.test.js`

**KB Queries:**
- Supertest testing API Gateway Lambda endpoints
- Integration testing with JWT tokens in Node.js

**Completed:** 2025-11-27T23:08:35.069978

**Cost:** $0.384909 (44173 input tokens, 16826 output tokens)

---

### Step 8: Update API service serverless.yml to include get-booking 🔄

**Status:** in_progress
**Description:** Add get-booking function configuration to api/serverless.yml following the pattern of existing functions (create-booking, list-bookings). Include function definition, events, and environment variables.

---

### Step 9: Update deployment scripts if needed ⏳

**Status:** pending
**Description:** Verify deploy.sh includes the get-booking service deployment. Update if necessary to ensure Terraform applies IAM changes before Serverless Framework deployment.

---

## Total Cost

**Total:** $1.634850
**Input Tokens:** 134,250
**Output Tokens:** 82,140