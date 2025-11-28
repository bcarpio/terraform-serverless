const { handler } = require('./handler');
const AWS = require('aws-sdk');

// Mock AWS SDK
jest.mock('aws-sdk');

describe('Get Booking Handler - Booking Not Found', () => {
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

  describe('Booking Not Found - 404 Error Handling', () => {
    it('should return 404 when DynamoDB returns empty result', async () => {
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

      // Mock DynamoDB response - empty result (Item is undefined)
      mockPromise.mockResolvedValue({
        // No Item property - booking not found
      });

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

      // Verify DynamoDB call
      expect(mockGet).toHaveBeenCalledTimes(1);
      expect(mockGet).toHaveBeenCalledWith({
        TableName: 'test-bookings-table',
        Key: {
          id: bookingId,
        },
      });
    });

    it('should return 404 when DynamoDB returns null Item', async () => {
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
            role: 'USER',
          },
        },
      };

      // Mock DynamoDB response - explicitly null Item
      mockPromise.mockResolvedValue({
        Item: null,
      });

      // Act
      const result = await handler(event);

      // Assert
      expect(result.statusCode).toBe(404);
      expect(result.headers['Content-Type']).toBe('application/json');

      const body = JSON.parse(result.body);
      expect(body).toEqual({
        message: 'Booking not found',
      });

      // Verify DynamoDB call
      expect(mockGet).toHaveBeenCalledTimes(1);
      expect(mockGet).toHaveBeenCalledWith({
        TableName: 'test-bookings-table',
        Key: {
          id: bookingId,
        },
      });
    });

    it('should return 404 for non-existent booking with valid UUID', async () => {
      // Arrange
      const bookingId = '770e8400-e29b-41d4-a716-446655442222'; // Valid UUID but doesn't exist
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

      // Mock DynamoDB response - empty result
      mockPromise.mockResolvedValue({});

      // Act
      const result = await handler(event);

      // Assert
      expect(result.statusCode).toBe(404);

      const body = JSON.parse(result.body);
      expect(body.message).toBe('Booking not found');

      // Verify DynamoDB call
      expect(mockGet).toHaveBeenCalledTimes(1);
    });

    it('should return 404 for ADMIN user when booking does not exist', async () => {
      // Arrange
      const bookingId = '880e8400-e29b-41d4-a716-446655443333';
      const adminUserId = 'admin-999';

      const event = {
        pathParameters: {
          id: bookingId,
        },
        requestContext: {
          authorizer: {
            userId: adminUserId,
            role: 'ADMIN',
          },
        },
      };

      // Mock DynamoDB response - empty result
      mockPromise.mockResolvedValue({});

      // Act
      const result = await handler(event);

      // Assert
      expect(result.statusCode).toBe(404);

      const body = JSON.parse(result.body);
      expect(body.message).toBe('Booking not found');

      // Verify DynamoDB call
      expect(mockGet).toHaveBeenCalledTimes(1);
      expect(mockGet).toHaveBeenCalledWith({
        TableName: 'test-bookings-table',
        Key: {
          id: bookingId,
        },
      });
    });

    it('should return 404 with correct message format', async () => {
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

      // Mock DynamoDB response - empty result
      mockPromise.mockResolvedValue({});

      // Act
      const result = await handler(event);

      // Assert
      expect(result.statusCode).toBe(404);
      expect(result.headers['Content-Type']).toBe('application/json');
      expect(result.headers['Access-Control-Allow-Origin']).toBe('*');
      expect(result.headers['Access-Control-Allow-Credentials']).toBe(true);

      const body = JSON.parse(result.body);
      expect(body).toEqual({
        message: 'Booking not found',
      });
      expect(Object.keys(body).length).toBe(1); // Only message field
    });

    it('should return 404 before checking authorization', async () => {
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
            role: 'USER', // Not an admin
          },
        },
      };

      // Mock DynamoDB response - empty result
      mockPromise.mockResolvedValue({});

      // Act
      const result = await handler(event);

      // Assert - Should return 404, not 403
      // This prevents information leakage about which booking IDs exist
      expect(result.statusCode).toBe(404);
      expect(result.statusCode).not.toBe(403);

      const body = JSON.parse(result.body);
      expect(body.message).toBe('Booking not found');
    });

    it('should handle DynamoDB response with undefined Item property', async () => {
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

      // Mock DynamoDB response - Item is explicitly undefined
      mockPromise.mockResolvedValue({
        Item: undefined,
      });

      // Act
      const result = await handler(event);

      // Assert
      expect(result.statusCode).toBe(404);

      const body = JSON.parse(result.body);
      expect(body.message).toBe('Booking not found');
    });

    it('should return 404 for different valid UUID formats', async () => {
      // Arrange
      const bookingId = 'CC0E8400-E29B-41D4-A716-446655447777'; // Uppercase UUID
      const userId = 'user-444';

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

      // Mock DynamoDB response - empty result
      mockPromise.mockResolvedValue({});

      // Act
      const result = await handler(event);

      // Assert
      expect(result.statusCode).toBe(404);

      const body = JSON.parse(result.body);
      expect(body.message).toBe('Booking not found');
    });
  });
});
