const { handler } = require('./handler');
const AWS = require('aws-sdk');

// Mock AWS SDK
jest.mock('aws-sdk');

describe('Get Booking Handler - Validation Errors', () => {
  let mockGet;
  let mockPromise;

  beforeEach(() => {
    // Clear all mocks before each test
    jest.clearAllMocks();

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
    // Clean up environment variables
    delete process.env.DYNAMODB_BOOKINGS;
  });

  describe('Invalid Booking ID Format', () => {
    it('should return 400 for non-UUID string', async () => {
      // Arrange
      const event = {
        pathParameters: {
          id: 'not-a-uuid',
        },
        requestContext: {
          authorizer: {
            userId: 'user-123',
            role: 'USER',
          },
        },
      };

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

      // Verify DynamoDB was never called
      expect(mockGet).not.toHaveBeenCalled();
    });

    it('should return 400 for UUID with incorrect format (missing hyphens)', async () => {
      // Arrange
      const event = {
        pathParameters: {
          id: '550e8400e29b41d4a716446655440000', // No hyphens
        },
        requestContext: {
          authorizer: {
            userId: 'user-123',
            role: 'USER',
          },
        },
      };

      // Act
      const result = await handler(event);

      // Assert
      expect(result.statusCode).toBe(400);

      const body = JSON.parse(result.body);
      expect(body.message).toBe('Invalid booking ID format');

      // Verify DynamoDB was never called
      expect(mockGet).not.toHaveBeenCalled();
    });

    it('should return 400 for UUID with wrong hyphen positions', async () => {
      // Arrange
      const event = {
        pathParameters: {
          id: '550e84-00e29b4-1d4a7-164466-55440000', // Wrong hyphen positions
        },
        requestContext: {
          authorizer: {
            userId: 'user-123',
            role: 'USER',
          },
        },
      };

      // Act
      const result = await handler(event);

      // Assert
      expect(result.statusCode).toBe(400);
      expect(JSON.parse(result.body).message).toBe('Invalid booking ID format');
      expect(mockGet).not.toHaveBeenCalled();
    });

    it('should return 400 for UUID with invalid characters', async () => {
      // Arrange
      const event = {
        pathParameters: {
          id: '550e8400-e29b-41d4-a716-44665544000g', // 'g' is not a valid hex character
        },
        requestContext: {
          authorizer: {
            userId: 'user-123',
            role: 'USER',
          },
        },
      };

      // Act
      const result = await handler(event);

      // Assert
      expect(result.statusCode).toBe(400);
      expect(JSON.parse(result.body).message).toBe('Invalid booking ID format');
      expect(mockGet).not.toHaveBeenCalled();
    });

    it('should return 400 for UUID with uppercase and lowercase mixed (should still be valid)', async () => {
      // Arrange
      const event = {
        pathParameters: {
          id: '550E8400-E29b-41d4-a716-446655440000', // Mixed case - should be valid
        },
        requestContext: {
          authorizer: {
            userId: 'user-123',
            role: 'USER',
          },
        },
      };

      // Mock DynamoDB to return no item (booking not found)
      mockPromise.mockResolvedValue({
        Item: undefined,
      });

      // Act
      const result = await handler(event);

      // Assert - Mixed case UUID is valid, so it should proceed to DynamoDB
      // and return 404 (not found) instead of 400 (validation error)
      expect(result.statusCode).toBe(404);
      expect(JSON.parse(result.body).message).toBe('Booking not found');
      expect(mockGet).toHaveBeenCalledTimes(1);
    });

    it('should return 400 for empty string', async () => {
      // Arrange
      const event = {
        pathParameters: {
          id: '',
        },
        requestContext: {
          authorizer: {
            userId: 'user-123',
            role: 'USER',
          },
        },
      };

      // Act
      const result = await handler(event);

      // Assert
      expect(result.statusCode).toBe(400);
      expect(JSON.parse(result.body).message).toBe('Invalid booking ID format');
      expect(mockGet).not.toHaveBeenCalled();
    });

    it('should return 400 for numeric ID', async () => {
      // Arrange
      const event = {
        pathParameters: {
          id: '12345',
        },
        requestContext: {
          authorizer: {
            userId: 'user-123',
            role: 'USER',
          },
        },
      };

      // Act
      const result = await handler(event);

      // Assert
      expect(result.statusCode).toBe(400);
      expect(JSON.parse(result.body).message).toBe('Invalid booking ID format');
      expect(mockGet).not.toHaveBeenCalled();
    });

    it('should return 400 for UUID with too many characters', async () => {
      // Arrange
      const event = {
        pathParameters: {
          id: '550e8400-e29b-41d4-a716-4466554400000000', // Too long
        },
        requestContext: {
          authorizer: {
            userId: 'user-123',
            role: 'USER',
          },
        },
      };

      // Act
      const result = await handler(event);

      // Assert
      expect(result.statusCode).toBe(400);
      expect(JSON.parse(result.body).message).toBe('Invalid booking ID format');
      expect(mockGet).not.toHaveBeenCalled();
    });

    it('should return 400 for UUID with too few characters', async () => {
      // Arrange
      const event = {
        pathParameters: {
          id: '550e8400-e29b-41d4-a716', // Too short
        },
        requestContext: {
          authorizer: {
            userId: 'user-123',
            role: 'USER',
          },
        },
      };

      // Act
      const result = await handler(event);

      // Assert
      expect(result.statusCode).toBe(400);
      expect(JSON.parse(result.body).message).toBe('Invalid booking ID format');
      expect(mockGet).not.toHaveBeenCalled();
    });

    it('should return 400 for special characters in UUID', async () => {
      // Arrange
      const event = {
        pathParameters: {
          id: '550e8400-e29b!41d4-a716-446655440000', // '!' is not valid
        },
        requestContext: {
          authorizer: {
            userId: 'user-123',
            role: 'USER',
          },
        },
      };

      // Act
      const result = await handler(event);

      // Assert
      expect(result.statusCode).toBe(400);
      expect(JSON.parse(result.body).message).toBe('Invalid booking ID format');
      expect(mockGet).not.toHaveBeenCalled();
    });

    it('should return 400 for spaces in UUID', async () => {
      // Arrange
      const event = {
        pathParameters: {
          id: '550e8400 e29b 41d4 a716 446655440000', // Spaces instead of hyphens
        },
        requestContext: {
          authorizer: {
            userId: 'user-123',
            role: 'USER',
          },
        },
      };

      // Act
      const result = await handler(event);

      // Assert
      expect(result.statusCode).toBe(400);
      expect(JSON.parse(result.body).message).toBe('Invalid booking ID format');
      expect(mockGet).not.toHaveBeenCalled();
    });
  });

  describe('Missing Booking ID', () => {
    it('should return 400 when booking ID is missing from path parameters', async () => {
      // Arrange
      const event = {
        pathParameters: {
          // No id field
        },
        requestContext: {
          authorizer: {
            userId: 'user-123',
            role: 'USER',
          },
        },
      };

      // Act
      const result = await handler(event);

      // Assert
      expect(result.statusCode).toBe(400);
      expect(result.headers['Content-Type']).toBe('application/json');

      const body = JSON.parse(result.body);
      expect(body.message).toBe('Booking ID is required');

      // Verify DynamoDB was never called
      expect(mockGet).not.toHaveBeenCalled();
    });

    it('should return 400 when pathParameters is undefined', async () => {
      // Arrange
      const event = {
        // No pathParameters at all
        requestContext: {
          authorizer: {
            userId: 'user-123',
            role: 'USER',
          },
        },
      };

      // Act
      const result = await handler(event);

      // Assert
      expect(result.statusCode).toBe(400);
      const body = JSON.parse(result.body);
      expect(body.message).toBe('Booking ID is required');
      expect(mockGet).not.toHaveBeenCalled();
    });

    it('should return 400 when booking ID is null', async () => {
      // Arrange
      const event = {
        pathParameters: {
          id: null,
        },
        requestContext: {
          authorizer: {
            userId: 'user-123',
            role: 'USER',
          },
        },
      };

      // Act
      const result = await handler(event);

      // Assert
      expect(result.statusCode).toBe(400);
      const body = JSON.parse(result.body);
      expect(body.message).toBe('Booking ID is required');
      expect(mockGet).not.toHaveBeenCalled();
    });
  });
});
