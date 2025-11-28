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
- **Lambda handler standards** (ADR-004) for AWS serverless applications, including API Gateway handlers, event-driven handlers, and internal workers
- **Frontend standards** (ADR-005) for React applications using the `apiFetch` helper
- **Testing standards** for Lambda functions
- **ADR creation guidelines**
- # Query: Node.js error handling and middleware patterns
- **Document 1**: Lambda handler standards for Python (logging, AWS clients, Pydantic validation)
- **Document 2**: Python implementation of `query-kb` Lambda orchestrator
- **Document 3**: Python implementation of `ask-claude` Lambda using AWS Bedrock
- **Document 4**: Python implementation of `ingest-docs` Lambda for GitHub documentation
- **Document 5**: Python implementation of `run-tests` Lambda handler
- Python Lambda functions
- AWS services (DynamoDB, SSM Parameter Store, Bedrock)
- Python-specific libraries (Pydantic, boto3)
- Node.js/Express middleware patterns
- Node.js error handling conventions
- Node.js Lambda handler standards (if applicable)
- Node.js-specific architectural decision records
- # Query: TypeScript Express API structure
- **Document 4** mentions Node.js Lambda functions for API operations, but these use AWS Lambda/API Gateway rather than Express
- **Documents 1 & 2** describe TypeScript project structures, but these are for React frontend applications, not Express APIs

### Terraform Standards

- # Query: Terraform Node.js deployment configuration

### Testing Standards

- # Query: Jest testing standards and patterns
- **Framework**: pytest with pytest-cov for coverage reporting
- **Language**: Python
- **AWS Service Mocking**: moto library (not Jest mocks)
- Arrange-Act-Assert (AAA) pattern
- pytest fixtures and conftest.py configuration
- moto decorators for AWS service mocking
- Dynamic module loading with importlib
- # Query: TypeScript API testing best practices
- Testing standards for Python Lambda functions using pytest
- Mocking AWS services (DynamoDB, S3, Bedrock, SQS) using moto
- Python-specific patterns like the Arrange-Act-Assert pattern
- Testing frameworks: pytest with pytest-cov
- # Query: Supertest integration testing patterns
- **pytest** as the testing framework
- **moto** for AWS service mocking
- **unittest.mock.patch** for external dependencies

## Implementation Steps

### Step 1: Create get-booking handler directory and main handler file ✅

**Status:** completed
**Description:** Create the api/get-booking/ directory structure and implement the main Lambda handler with UUID validation, DynamoDB lookup, and authorization logic following existing patterns from create-booking and list-bookings handlers

**Files:**
- `api/get-booking/handler.js`

**KB Queries:**
- UUID validation in Node.js Lambda handlers
- DynamoDB GetItem operation with AWS SDK v2 DocumentClient

**Completed:** 2025-11-28T00:02:00.171910

**Cost:** $0.078162 (3959 input tokens, 4419 output tokens)

---

### Step 2: Create serverless.yml for get-booking function ✅

**Status:** completed
**Description:** Create serverless.yml configuration for the get-booking Lambda function with API Gateway HTTP GET endpoint, environment variables from SSM, and IAM role reference following the pattern from existing api service functions

**Files:**
- `api/get-booking/serverless.yml`

**KB Queries:**
- Serverless Framework HTTP GET path parameters configuration
- Serverless Framework custom authorizer integration

**Completed:** 2025-11-28T00:03:16.481742

**Cost:** $0.031485 (4585 input tokens, 1182 output tokens)

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

## Total Cost

**Total:** $0.109647
**Input Tokens:** 8,544
**Output Tokens:** 5,601