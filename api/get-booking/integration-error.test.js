const { handler } = require('./handler');
const AWS = require('aws-sdk');

// Mock AWS SDK
jest.mock('aws-sdk');

/**
 * Helper function to create an API Gateway event
 * @param {string} bookingId - Booking ID
 * @param {Object} authorizerContext - Authorizer context
 * @returns {Object} - API Gateway event
 */
function createApiGatewayEvent(bookingId, authorizerContext) {
  return {
    pathParameters: {
      id: bookingId,
    },
    headers: {
      Authorization: 'Bearer mock-token',
    },
    requestContext: {
      authorizer: authorizerContext,
    },
  };
}

/**
 * Helper function to create an API Gateway event without path parameters
 * @param {Object} authorizerContext - Authorizer context
 * @returns {Object} - API Gateway event
 */
function createApiGatewayEventWithoutPathParams(authorizerContext) {
  return {
    headers: {
      Authorization: 'Bearer mock-token',
    },
    requestContext: {
      authorizer: authorizerContext,
    },
  };
}

/**
 * Helper function to create an API Gateway event with empty path parameters
 * @param {Object} authorizerContext - Authorizer context
 * @returns {Object} - API Gateway event
 */
function createApiGatewayEventWithEmptyPathParams(authorizerContext) {
  return {
    pathParameters: {
      id: '',
    },
    headers: {
      Authorization: 'Bearer mock-token',
    },
    requestContext: {
      authorizer: authorizerContext,
    },
  };
}

describe('Get Booking Integration Tests - Error Scenarios', () => {
  let mockGet;
  let mockPromise;
  let consoleErrorSpy;

  beforeEach(() => {
    // Clear all mocks before each test
    jest.clearAllMocks();

    // Spy on console.error to verify logging
    consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});

    // Create mock promise function
    mockPromise = jest.fn();

    // Create mock get function
    mockGet = jest.fn().mockReturnValue({
      promise: mockPromise,
    });

    // Mock DynamoDB DocumentClient
    AWS.DynamoDB.DocumentClient = jest.fn().mockImplementation(() => ({
      get: mockGet,
    }));

    // Set environment variables
    process.env.DYNAMODB_BOOKINGS = 'test-bookings-table';
  });

  afterEach(() => {
    // Restore console.error
    consoleErrorSpy.mockRestore();

    // Clean up environment variables
    delete process.env.DYNAMODB_BOOKINGS;
  });

  describe('400 Bad Request - Validation Errors', () => {
    it('should return 400 when booking ID is missing', async () => {
      // Arrange
      const authorizerContext = {
        userId: 'user-123',
        role: 'USER',
      };

      const event = createApiGatewayEventWithoutPathParams(authorizerContext);

      // Act
      const result = await handler(event);

      // Assert
      expect(result.statusCode).toBe(400);
      expect(result.headers['Content-Type']).toBe('application/json');
      expect(result.headers['Access-Control-Allow-Origin']).toBe('*');

      const body = JSON.parse(result.body);
      expect(body).toEqual({
        message: 'Booking ID is required',
      });

      // Verify error logging
      expect(consoleErrorSpy).toHaveBeenCalledWith('Booking ID missing from path parameters');

      // Verify DynamoDB was not called
      expect(mockGet).not.toHaveBeenCalled();
    });

    it('should return 400 when booking ID is empty string', async () => {
      // Arrange
      const authorizerContext = {
        userId: 'user-123',
        role: 'USER',
      };

      const event = createApiGatewayEventWithEmptyPathParams(authorizerContext);

      // Act
      const result = await handler(event);

      // Assert
      expect(result.statusCode).toBe(400);

      const body = JSON.parse(result.body);
      expect(body.message).toBe('Booking ID is required');

      // Verify DynamoDB was not called
      expect(mockGet).not.toHaveBeenCalled();
    });

    it('should return 400 when booking ID is not a valid UUID', async () => {
      // Arrange
      const invalidBookingId = 'invalid-id';
      const authorizerContext = {
        userId: 'user-123',
        role: 'USER',
      };

      const event = createApiGatewayEvent(invalidBookingId, authorizerContext);

      // Act
      const result = await handler(event);

      // Assert
      expect(result.statusCode).toBe(400);
      expect(result.headers['Content-Type']).toBe('application/json');
      expect(result.headers['Access-Control-Allow-Origin']).toBe('*');

      const body = JSON.parse(result.body);
      expect(body).toEqual({
        message: 'Invalid booking ID format',
      });

      // Verify error logging
      expect(consoleErrorSpy).toHaveBeenCalledWith('Invalid booking ID format:', invalidBookingId);

      // Verify DynamoDB was not called
      expect(mockGet).not.toHaveBeenCalled();
    });

    it('should return 400 when booking ID has invalid UUID format (too short)', async () => {
      // Arrange
      const invalidBookingId = '550e8400-e29b-41d4-a716'; // Missing last segment
      const authorizerContext = {
        userId: 'user-123',
        role: 'USER',
      };

      const event = createApiGatewayEvent(invalidBookingId, authorizerContext);

      // Act
      const result = await handler(event);

      // Assert
      expect(result.statusCode).toBe(400);

      const body = JSON.parse(result.body);
      expect(body.message).toBe('Invalid booking ID format');

      // Verify DynamoDB was not called
      expect(mockGet).not.toHaveBeenCalled();
    });

    it('should return 400 when booking ID has invalid UUID format (invalid characters)', async () => {
      // Arrange
      const invalidBookingId = '550e8400-e29b-41d4-a716-44665544000g'; // 'g' is invalid
      const authorizerContext = {
        userId: 'user-123',
        role: 'USER',
      };

      const event = createApiGatewayEvent(invalidBookingId, authorizerContext);

      // Act
      const result = await handler(event);

      // Assert
      expect(result.statusCode).toBe(400);

      const body = JSON.parse(result.body);
      expect(body.message).toBe('Invalid booking ID format');

      // Verify DynamoDB was not called
      expect(mockGet).not.toHaveBeenCalled();
    });

    it('should return 400 when booking ID has invalid UUID format (wrong segment lengths)', async () => {
      // Arrange
      const invalidBookingId = '550e8400-e29b-41d4-a716-4466554400000'; // Last segment too long
      const authorizerContext = {
        userId: 'user-123',
        role: 'USER',
      };

      const event = createApiGatewayEvent(invalidBookingId, authorizerContext);

      // Act
      const result = await handler(event);

      // Assert
      expect(result.statusCode).toBe(400);

      const body = JSON.parse(result.body);
      expect(body.message).toBe('Invalid booking ID format');

      // Verify DynamoDB was not called
      expect(mockGet).not.toHaveBeenCalled();
    });
  });

  describe('404 Not Found - Booking Does Not Exist', () => {
    it('should return 404 when booking does not exist', async () => {
      // Arrange
      const bookingId = '550e8400-e29b-41d4-a716-446655440000';
      const authorizerContext = {
        userId: 'user-123',
        role: 'USER',
      };

      const event = createApiGatewayEvent(bookingId, authorizerContext);

      // Mock DynamoDB response - no item found
      mockPromise.mockResolvedValue({}); // Empty response, no Item

      // Act
      const result = await handler(event);

      // Assert
      expect(result.statusCode).toBe(404);
      expect(result.headers['Content-Type']).toBe('application/json');
      expect(result.headers['Access-Control-Allow-Origin']).toBe('*');

      const body = JSON.parse(result.body);
      expect(body).toEqual({
        message: 'Booking not found',
      });

      // Verify DynamoDB was called
      expect(mockGet).toHaveBeenCalledTimes(1);
      expect(mockGet).toHaveBeenCalledWith({
        TableName: 'test-bookings-table',
        Key: {
          id: bookingId,
        },
      });
    });

    it('should return 404 when booking does not exist (ADMIN user)', async () => {
      // Arrange
      const bookingId = '660e8400-e29b-41d4-a716-446655441111';
      const authorizerContext = {
        userId: 'admin-789',
        role: 'ADMIN',
      };

      const event = createApiGatewayEvent(bookingId, authorizerContext);

      // Mock DynamoDB response - no item found
      mockPromise.mockResolvedValue({});

      // Act
      const result = await handler(event);

      // Assert
      expect(result.statusCode).toBe(404);

      const body = JSON.parse(result.body);
      expect(body.message).toBe('Booking not found');
    });

    it('should return 404 when booking does not exist (valid UUID format)', async () => {
      // Arrange
      const bookingId = '770e8400-e29b-41d4-a716-446655442222';
      const authorizerContext = {
        userId: 'user-456',
        role: 'USER',
      };

      const event = createApiGatewayEvent(bookingId, authorizerContext);

      // Mock DynamoDB response - no item found
      mockPromise.mockResolvedValue({
        Item: undefined, // Explicitly undefined
      });

      // Act
      const result = await handler(event);

      // Assert
      expect(result.statusCode).toBe(404);

      const body = JSON.parse(result.body);
      expect(body.message).toBe('Booking not found');
    });
  });

  describe('403 Forbidden - Authorization Failures', () => {
    it('should return 403 when user tries to access another user\'s booking', async () => {
      // Arrange
      const bookingId = '550e8400-e29b-41d4-a716-446655440000';
      const requestingUserId = 'user-123';
      const bookingOwnerId = 'user-456'; // Different user

      const authorizerContext = {
        userId: requestingUserId,
        role: 'USER', // Not ADMIN
      };

      const event = createApiGatewayEvent(bookingId, authorizerContext);

      // Mock DynamoDB response - booking belongs to another user
      const mockBooking = {
        id: bookingId,
        date: '2025-01-15',
        user: {
          id: bookingOwnerId,
          name: 'Jane Doe',
          email: 'jane@example.com',
        },
      };

      mockPromise.mockResolvedValue({
        Item: mockBooking,
      });

      // Act
      const result = await handler(event);

      // Assert
      expect(result.statusCode).toBe(403);
      expect(result.headers['Content-Type']).toBe('application/json');
      expect(result.headers['Access-Control-Allow-Origin']).toBe('*');

      const body = JSON.parse(result.body);
      expect(body).toEqual({
        message: 'Not authorized to view this booking',
      });

      // Verify DynamoDB was called
      expect(mockGet).toHaveBeenCalledTimes(1);
    });

    it('should return 403 when user with no role tries to access another user\'s booking', async () => {
      // Arrange
      const bookingId = '660e8400-e29b-41d4-a716-446655441111';
      const requestingUserId = 'user-789';
      const bookingOwnerId = 'user-123';

      const authorizerContext = {
        userId: requestingUserId,
        // No role field
      };

      const event = createApiGatewayEvent(bookingId, authorizerContext);

      const mockBooking = {
        id: bookingId,
        date: '2025-01-15',
        user: {
          id: bookingOwnerId,
          name: 'John Doe',
          email: 'john@example.com',
        },
      };

      mockPromise.mockResolvedValue({
        Item: mockBooking,
      });

      // Act
      const result = await handler(event);

      // Assert
      expect(result.statusCode).toBe(403);

      const body = JSON.parse(result.body);
      expect(body.message).toBe('Not authorized to view this booking');
    });

    it('should return 403 when user with unknown role tries to access another user\'s booking', async () => {
      // Arrange
      const bookingId = '770e8400-e29b-41d4-a716-446655442222';
      const requestingUserId = 'user-999';
      const bookingOwnerId = 'user-123';

      const authorizerContext = {
        userId: requestingUserId,
        role: 'GUEST', // Unknown role, not ADMIN
      };

      const event = createApiGatewayEvent(bookingId, authorizerContext);

      const mockBooking = {
        id: bookingId,
        date: '2025-01-15',
        user: {
          id: bookingOwnerId,
          name: 'John Doe',
          email: 'john@example.com',
        },
      };

      mockPromise.mockResolvedValue({
        Item: mockBooking,
      });

      // Act
      const result = await handler(event);

      // Assert
      expect(result.statusCode).toBe(403);

      const body = JSON.parse(result.body);
      expect(body.message).toBe('Not authorized to view this booking');
    });

    it('should return 403 when booking has no user field and requester is not ADMIN', async () => {
      // Arrange
      const bookingId = '880e8400-e29b-41d4-a716-446655443333';
      const requestingUserId = 'user-123';

      const authorizerContext = {
        userId: requestingUserId,
        role: 'USER',
      };

      const event = createApiGatewayEvent(bookingId, authorizerContext);

      // Booking with no user field
      const mockBooking = {
        id: bookingId,
        date: '2025-01-15',
        // No user field
      };

      mockPromise.mockResolvedValue({
        Item: mockBooking,
      });

      // Act
      const result = await handler(event);

      // Assert
      expect(result.statusCode).toBe(403);

      const body = JSON.parse(result.body);
      expect(body.message).toBe('Not authorized to view this booking');
    });

    it('should return 403 when booking user ID is empty string and requester is not ADMIN', async () => {
      // Arrange
      const bookingId = '990e8400-e29b-41d4-a716-446655444444';
      const requestingUserId = 'user-123';

      const authorizerContext = {
        userId: requestingUserId,
        role: 'USER',
      };

      const event = createApiGatewayEvent(bookingId, authorizerContext);

      // Booking with empty user ID
      const mockBooking = {
        id: bookingId,
        date: '2025-01-15',
        user: {
          id: '', // Empty string
          name: 'John Doe',
          email: 'john@example.com',
        },
      };

      mockPromise.mockResolvedValue({
        Item: mockBooking,
      });

      // Act
      const result = await handler(event);

      // Assert
      expect(result.statusCode).toBe(403);

      const body = JSON.parse(result.body);
      expect(body.message).toBe('Not authorized to view this booking');
    });
  });

  describe('401 Unauthorized - Missing Authorization Context', () => {
    it('should return 401 when user ID is missing from authorizer context', async () => {
      // Arrange
      const bookingId = '550e8400-e29b-41d4-a716-446655440000';

      const authorizerContext = {
        role: 'USER',
        // No userId
      };

      const event = createApiGatewayEvent(bookingId, authorizerContext);

      // Act
      const result = await handler(event);

      // Assert
      expect(result.statusCode).toBe(401);
      expect(result.headers['Content-Type']).toBe('application/json');
      expect(result.headers['Access-Control-Allow-Origin']).toBe('*');

      const body = JSON.parse(result.body);
      expect(body).toEqual({
        message: 'Unauthorized',
      });

      // Verify error logging
      expect(consoleErrorSpy).toHaveBeenCalledWith('User ID not found in authorizer context');

      // Verify DynamoDB was not called
      expect(mockGet).not.toHaveBeenCalled();
    });

    it('should return 401 when authorizer context is missing', async () => {
      // Arrange
      const bookingId = '660e8400-e29b-41d4-a716-446655441111';

      const event = {
        pathParameters: {
          id: bookingId,
        },
        headers: {
          Authorization: 'Bearer mock-token',
        },
        requestContext: {
          // No authorizer context
        },
      };

      // Act
      const result = await handler(event);

      // Assert
      expect(result.statusCode).toBe(401);

      const body = JSON.parse(result.body);
      expect(body.message).toBe('Unauthorized');

      // Verify DynamoDB was not called
      expect(mockGet).not.toHaveBeenCalled();
    });

    it('should return 401 when user ID is empty string', async () => {
      // Arrange
      const bookingId = '770e8400-e29b-41d4-a716-446655442222';

      const authorizerContext = {
        userId: '', // Empty string
        role: 'USER',
      };

      const event = createApiGatewayEvent(bookingId, authorizerContext);

      // Act
      const result = await handler(event);

      // Assert
      expect(result.statusCode).toBe(401);

      const body = JSON.parse(result.body);
      expect(body.message).toBe('Unauthorized');

      // Verify DynamoDB was not called
      expect(mockGet).not.toHaveBeenCalled();
    });
  });
});
