const { handler } = require('./handler');
const AWS = require('aws-sdk');

// Mock AWS SDK
jest.mock('aws-sdk');

describe('Get Booking Handler - DynamoDB Error Handling', () => {
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

    // Set environment variable
    process.env.DYNAMODB_BOOKINGS = 'test-bookings-table';
  });

  afterEach(() => {
    // Restore console.error
    consoleErrorSpy.mockRestore();

    // Clean up environment variables
    delete process.env.DYNAMODB_BOOKINGS;
  });

  describe('500 Internal Server Error - DynamoDB Operation Failures', () => {
    it('should return 500 when DynamoDB get operation fails', async () => {
      // Arrange
      const bookingId = '550e8400-e29b-41d4-a716-446655440000';
      const userId = 'user-123';

      const event = {
        pathParameters: {
          id: bookingId,
        },
        requestContext: {
          authorizer: {
            userId: userId,
            role: 'USER',
          },
        },
      };

      // Mock DynamoDB error
      const dynamoError = new Error('DynamoDB service unavailable');
      dynamoError.code = 'ServiceUnavailableException';
      mockPromise.mockRejectedValue(dynamoError);

      // Act
      const result = await handler(event);

      // Assert
      expect(result.statusCode).toBe(500);
      expect(result.headers['Content-Type']).toBe('application/json');
      expect(result.headers['Access-Control-Allow-Origin']).toBe('*');

      const body = JSON.parse(result.body);
      expect(body).toEqual({
        message: 'Error retrieving booking',
      });

      // Verify error logging
      expect(consoleErrorSpy).toHaveBeenCalledWith('DynamoDB error:', dynamoError);

      // Verify DynamoDB call
      expect(mockGet).toHaveBeenCalledTimes(1);
      expect(mockGet).toHaveBeenCalledWith({
        TableName: 'test-bookings-table',
        Key: {
          id: bookingId,
        },
      });
    });

    it('should return 500 when DynamoDB throws ResourceNotFoundException', async () => {
      // Arrange
      const bookingId = '660e8400-e29b-41d4-a716-446655441111';
      const userId = 'user-456';

      const event = {
        pathParameters: {
          id: bookingId,
        },
        requestContext: {
          authorizer: {
            userId: userId,
            role: 'ADMIN',
          },
        },
      };

      // Mock DynamoDB error - table not found
      const dynamoError = new Error('Requested resource not found');
      dynamoError.code = 'ResourceNotFoundException';
      mockPromise.mockRejectedValue(dynamoError);

      // Act
      const result = await handler(event);

      // Assert
      expect(result.statusCode).toBe(500);

      const body = JSON.parse(result.body);
      expect(body.message).toBe('Error retrieving booking');

      // Verify error logging
      expect(consoleErrorSpy).toHaveBeenCalledWith('DynamoDB error:', dynamoError);
    });

    it('should return 500 when DynamoDB throws AccessDeniedException', async () => {
      // Arrange
      const bookingId = '770e8400-e29b-41d4-a716-446655442222';
      const userId = 'user-789';

      const event = {
        pathParameters: {
          id: bookingId,
        },
        requestContext: {
          authorizer: {
            userId: userId,
            role: 'USER',
          },
        },
      };

      // Mock DynamoDB error - insufficient permissions
      const dynamoError = new Error('User is not authorized to perform dynamodb:GetItem');
      dynamoError.code = 'AccessDeniedException';
      mockPromise.mockRejectedValue(dynamoError);

      // Act
      const result = await handler(event);

      // Assert
      expect(result.statusCode).toBe(500);
      expect(result.headers['Content-Type']).toBe('application/json');

      const body = JSON.parse(result.body);
      expect(body).toEqual({
        message: 'Error retrieving booking',
      });

      // Verify error logging
      expect(consoleErrorSpy).toHaveBeenCalledWith('DynamoDB error:', dynamoError);
    });

    it('should return 500 when DynamoDB throws ValidationException', async () => {
      // Arrange
      const bookingId = '880e8400-e29b-41d4-a716-446655443333';
      const userId = 'user-999';

      const event = {
        pathParameters: {
          id: bookingId,
        },
        requestContext: {
          authorizer: {
            userId: userId,
            role: 'ADMIN',
          },
        },
      };

      // Mock DynamoDB error - invalid parameter
      const dynamoError = new Error('One or more parameter values were invalid');
      dynamoError.code = 'ValidationException';
      mockPromise.mockRejectedValue(dynamoError);

      // Act
      const result = await handler(event);

      // Assert
      expect(result.statusCode).toBe(500);

      const body = JSON.parse(result.body);
      expect(body.message).toBe('Error retrieving booking');

      // Verify error logging
      expect(consoleErrorSpy).toHaveBeenCalledWith('DynamoDB error:', dynamoError);
    });

    it('should return 500 when DynamoDB throws ProvisionedThroughputExceededException', async () => {
      // Arrange
      const bookingId = '990e8400-e29b-41d4-a716-446655444444';
      const userId = 'user-111';

      const event = {
        pathParameters: {
          id: bookingId,
        },
        requestContext: {
          authorizer: {
            userId: userId,
            role: 'USER',
          },
        },
      };

      // Mock DynamoDB error - throttling
      const dynamoError = new Error('You exceeded your maximum allowed provisioned throughput');
      dynamoError.code = 'ProvisionedThroughputExceededException';
      mockPromise.mockRejectedValue(dynamoError);

      // Act
      const result = await handler(event);

      // Assert
      expect(result.statusCode).toBe(500);
      expect(result.headers['Content-Type']).toBe('application/json');
      expect(result.headers['Access-Control-Allow-Origin']).toBe('*');

      const body = JSON.parse(result.body);
      expect(body).toEqual({
        message: 'Error rtrieving booking',
      });

      // Verify error logging
      expect(consoleErrorSpy).toHaveBeenCalledWith('DynamoDB error:', dynamoError);
    });

    it('should return 500 when DynamoDB throws generic error', async () => {
      // Arrange
      const bookingId = 'aa0e8400-e29b-41d4-a716-446655445555';
      const userId = 'user-222';

      const event = {
        pathParameters: {
          id: bookingId,
        },
        requestContext: {
          authorizer: {
            userId: userId,
            role: 'ADMIN',
          },
        },
      };

      // Mock DynamoDB error - generic error
      const dynamoError = new Error('Unexpected error occurred');
      mockPromise.mockRejectedValue(dynamoError);

      // Act
      const result = await handler(event);

      // Assert
      expect(result.statusCode).toBe(500);

      const body = JSON.parse(result.body);
      expect(body.message).toBe('Error retrieving booking');

      // Verify error logging
      expect(consoleErrorSpy).toHaveBeenCalledWith('DynamoDB error:', dynamoError);
    });

    it('should log error with full error object', async () => {
      // Arrange
      const bookingId = 'bb0e8400-e29b-41d4-a716-446655446666';
      const userId = 'user-333';

      const event = {
        pathParameters: {
          id: bookingId,
        },
        requestContext: {
          authorizer: {
            userId: userId,
            role: 'USER',
          },
        },
      };

      // Mock DynamoDB error with additional properties
      const dynamoError = new Error('DynamoDB error with details');
      dynamoError.code = 'InternalServerError';
      dynamoError.statusCode = 500;
      dynamoError.retryable = true;
      mockPromise.mockRejectedValue(dynamoError);

      // Act
      const result = await handler(event);

      // Assert
      expect(result.statusCode).toBe(500);

      const body = JSON.parse(result.body);
      expect(body.message).toBe('Error retrieving booking');

      // Verify error logging with full error object
      expect(consoleErrorSpy).toHaveBeenCalledWith('DynamoDB error:', dynamoError);
      expect(consoleErrorSpy.mock.calls[0][1]).toHaveProperty('code', 'InternalServerError');
      expect(consoleErrorSpy.mock.calls[0][1]).toHaveProperty('statusCode', 500);
    });

    it('should return 500 with correct response format', async () => {
      // Arrange
      const bookingId = 'cc0e8400-e29b-41d4-a716-446655447777';
      const userId = 'user-444';

      const event = {
        pathParameters: {
          id: bookingId,
        },
        requestContext: {
          authorizer: {
            userId: userId,
            role: 'ADMIN',
          },
        },
      };

      const dynamoError = new Error('Database error');
      mockPromise.mockRejectedValue(dynamoError);

      // Act
      const result = await handler(event);

      // Assert - Verify response structure
      expect(result).toHaveProperty('statusCode');
      expect(result).toHaveProperty('headers');
      expect(result).toHaveProperty('body');

      expect(result.statusCode).toBe(500);
      expect(result.headers['Content-Type']).toBe('application/json');
      expect(result.headers['Access-Control-Allow-Origin']).toBe('*');
      expect(result.headers['Access-Control-Allow-Credentials']).toBe(true);

      // Verify body is valid JSON
      expect(() => JSON.parse(result.body)).not.toThrow();

      const body = JSON.parse(result.body);
      expect(body).toEqual({
        message: 'Error retrieving booking',
      });
      expect(Object.keys(body).length).toBe(1); // Only message field
    });

    it('should not expose internal error details in response', async () => {
      // Arrange
      const bookingId = 'dd0e8400-e29b-41d4-a716-446655448888';
      const userId = 'user-555';

      const event = {
        pathParameters: {
          id: bookingId,
        },
        requestContext: {
          authorizer: {
            userId: userId,
            role: 'USER',
          },
        },
      };

      // Mock DynamoDB error with sensitive information
      const dynamoError = new Error('Database connection failed: host=prod-db-server.internal, port=5432, user=admin');
      dynamoError.code = 'NetworkError';
      mockPromise.mockRejectedValue(dynamoError);

      // Act
      const result = await handler(event);

      // Assert
      expect(result.statusCode).toBe(500);

      const body = JSON.parse(result.body);
      expect(body.message).toBe('Error retrieving booking');

      // Verify sensitive information is NOT in response
      expect(result.body).not.toContain('prod-db-server');
      expect(result.body).not.toContain('admin');
      expect(result.body).not.toContain('5432');

      // But error should be logged with full details
      expect(consoleErrorSpy).toHaveBeenCalledWith('DynamoDB error:', dynamoError);
    });
  });
});
