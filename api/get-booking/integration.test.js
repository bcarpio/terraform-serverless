const request = require('supertest');
const AWS = require('aws-sdk');
const jwt = require('jsonwebtoken');
const { handler } = require('./handler');

// Mock AWS SDK
jest.mock('aws-sdk');

/**
 * Helper function to generate a valid JWT token
 * @param {Object} payload - Token payload
 * @returns {string} - JWT token
 */
function generateToken(payload) {
  const secret = process.env.JWT_SECRET || 'test-secret-key';
  return jwt.sign(payload, secret, { expiresIn: '1h' });
}

/**
 * Helper function to create an API Gateway event
 * @param {string} bookingId - Booking ID
 * @param {string} token - Authorization token
 * @param {Object} authorizerContext - Authorizer context
 * @returns {Object} - API Gateway event
 */
function createApiGatewayEvent(bookingId, token, authorizerContext) {
  return {
    pathParameters: {
      id: bookingId,
    },
    headers: {
      Authorization: token ? `Bearer ${token}` : undefined,
    },
    requestContext: {
      authorizer: authorizerContext,
    },
  };
}

describe('Get Booking Integration Tests', () => {
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

    // Set environment variables
    process.env.DYNAMODB_BOOKINGS = 'test-bookings-table';
    process.env.JWT_SECRET = 'test-secret-key';
  });

  afterEach(() => {
    // Clean up environment variables
    delete process.env.DYNAMODB_BOOKINGS;
    delete process.env.JWT_SECRET;
  });

  describe('Success Cases', () => {
    it('should return 200 with booking details when valid token is provided', async () => {
      // Arrange
      const bookingId = '550e8400-e29b-41d4-a716-446655440000';
      const userId = 'user-123';

      const mockBooking = {
        id: bookingId,
        date: '2025-01-15',
        user: {
          id: userId,
          name: 'John Doe',
          email: 'john@example.com',
        },
      };

      // Generate valid JWT token
      const token = generateToken({
        userId: userId,
        role: 'USER',
      });

      // Create authorizer context (simulating what the authorizer Lambda would provide)
      const authorizerContext = {
        userId: userId,
        role: 'USER',
      };

      const event = createApiGatewayEvent(bookingId, token, authorizerContext);

      // Mock DynamoDB response
      mockPromise.mockResolvedValue({
        Item: mockBooking,
      });

      // Act
      const result = await handler(event);

      // Assert
      expect(result.statusCode).toBe(200);
      expect(result.headers['Content-Type']).toBe('application/json');
      expect(result.headers['Access-Control-Allow-Origin']).toBe('*');
      expect(result.headers['Access-Control-Allow-Credentials']).toBe(true);

      const body = JSON.parse(result.body);
      expect(body).toEqual({
        id: bookingId,
        date: '2025-01-15',
        user: {
          id: userId,
          name: 'John Doe',
          email: 'john@example.com',
        },
      });

      // Verify DynamoDB was called with correct parameters
      expect(mockGet).toHaveBeenCalledTimes(1);
      expect(mockGet).toHaveBeenCalledWith({
        TableName: 'test-bookings-table',
        Key: {
          id: bookingId,
        },
      });
    });

    it('should return 200 when ADMIN user accesses any booking', async () => {
      // Arrange
      const bookingId = '550e8400-e29b-41d4-a716-446655440000';
      const adminUserId = 'admin-789';
      const bookingOwnerId = 'user-123'; // Different from admin

      const mockBooking = {
        id: bookingId,
        date: '2025-01-15',
        user: {
          id: bookingOwnerId,
          name: 'John Doe',
          email: 'john@example.com',
        },
      };

      // Generate valid JWT token for ADMIN
      const token = generateToken({
        userId: adminUserId,
        role: 'ADMIN',
      });

      // Create authorizer context
      const authorizerContext = {
        userId: adminUserId,
        role: 'ADMIN',
      };

      const event = createApiGatewayEvent(bookingId, token, authorizerContext);

      // Mock DynamoDB response
      mockPromise.mockResolvedValue({
        Item: mockBooking,
      });

      // Act
      const result = await handler(event);

      // Assert
      expect(result.statusCode).toBe(200);
      expect(result.headers['Content-Type']).toBe('application/json');

      const body = JSON.parse(result.body);
      expect(body).toEqual({
        id: bookingId,
        date: '2025-01-15',
        user: {
          id: bookingOwnerId,
          name: 'John Doe',
          email: 'john@example.com',
        },
      });
    });

    it('should return 200 with correct CORS headers', async () => {
      // Arrange
      const bookingId = '550e8400-e29b-41d4-a716-446655440000';
      const userId = 'user-123';

      const mockBooking = {
        id: bookingId,
        date: '2025-01-15',
        user: {
          id: userId,
          name: 'John Doe',
          email: 'john@example.com',
        },
      };

      const token = generateToken({
        userId: userId,
        role: 'USER',
      });

      const authorizerContext = {
        userId: userId,
        role: 'USER',
      };

      const event = createApiGatewayEvent(bookingId, token, authorizerContext);

      mockPromise.mockResolvedValue({
        Item: mockBooking,
      });

      // Act
      const result = await handler(event);

      // Assert CORS headers
      expect(result.headers['Access-Control-Allow-Origin']).toBe('*');
      expect(result.headers['Access-Control-Allow-Credentials']).toBe(true);
      expect(result.headers['Content-Type']).toBe('application/json');
    });

    it('should handle booking with missing user fields gracefully', async () => {
      // Arrange
      const bookingId = '660e8400-e29b-41d4-a716-446655441111';
      const adminUserId = 'admin-789';

      // Booking with missing user fields
      const mockBooking = {
        id: bookingId,
        date: '2025-01-15',
        // No user field
      };

      const token = generateToken({
        userId: adminUserId,
        role: 'ADMIN',
      });

      const authorizerContext = {
        userId: adminUserId,
        role: 'ADMIN',
      };

      const event = createApiGatewayEvent(bookingId, token, authorizerContext);

      mockPromise.mockResolvedValue({
        Item: mockBooking,
      });

      // Act
      const result = await handler(event);

      // Assert - ADMIN should still be able to access
      expect(result.statusCode).toBe(200);

      const body = JSON.parse(result.body);
      expect(body).toEqual({
        id: bookingId,
        date: '2025-01-15',
        user: {
          id: '',
          name: '',
          email: '',
        },
      });
    });

    it('should handle booking with partial user data', async () => {
      // Arrange
      const bookingId = '770e8400-e29b-41d4-a716-446655442222';
      const userId = 'user-123';

      // Booking with partial user data
      const mockBooking = {
        id: bookingId,
        date: '2025-01-15',
        user: {
          id: userId,
          // Missing name and email
        },
      };

      const token = generateToken({
        userId: userId,
        role: 'USER',
      });

      const authorizerContext = {
        userId: userId,
        role: 'USER',
      };

      const event = createApiGatewayEvent(bookingId, token, authorizerContext);

      mockPromise.mockResolvedValue({
        Item: mockBooking,
      });

      // Act
      const result = await handler(event);

      // Assert
      expect(result.statusCode).toBe(200);

      const body = JSON.parse(result.body);
      expect(body).toEqual({
        id: bookingId,
        date: '2025-01-15',
        user: {
          id: userId,
          name: '',
          email: '',
        },
      });
    });

    it('should handle booking with additional fields', async () => {
      // Arrange
      const bookingId = '880e8400-e29b-41d4-a716-446655443333';
      const userId = 'user-123';

      // Booking with additional fields that should be ignored
      const mockBooking = {
        id: bookingId,
        date: '2025-01-15',
        user: {
          id: userId,
          name: 'John Doe',
          email: 'john@example.com',
        },
        // Additional fields
        createdAt: '2025-01-01T12:00:00Z',
        updatedAt: '2025-01-02T12:00:00Z',
        status: 'confirmed',
      };

      const token = generateToken({
        userId: userId,
        role: 'USER',
      });

      const authorizerContext = {
        userId: userId,
        role: 'USER',
      };

      const event = createApiGatewayEvent(bookingId, token, authorizerContext);

      mockPromise.mockResolvedValue({
        Item: mockBooking,
      });

      // Act
      const result = await handler(event);

      // Assert - Only specified fields should be returned
      expect(result.statusCode).toBe(200);

      const body = JSON.parse(result.body);
      expect(body).toEqual({
        id: bookingId,
        date: '2025-01-15',
        user: {
          id: userId,
          name: 'John Doe',
          email: 'john@example.com',
        },
      });
      // Ensure additional fields are not included
      expect(body.createdAt).toBeUndefined();
      expect(body.updatedAt).toBeUndefined();
      expect(body.status).toBeUndefined();
    });
  });

  describe('Validation Errors', () => {
    it('should return 400 when booking ID is invalid format', async () => {
      // Arrange
      const invalidBookingId = 'invalid-id-format';
      const userId = 'user-123';

      const token = generateToken({
        userId: userId,
        role: 'USER',
      });

      const authorizerContext = {
        userId: userId,
        role: 'USER',
      };

      const event = createApiGatewayEvent(invalidBookingId, token, authorizerContext);

      // Act
      const result = await handler(event);

      // Assert
      expect(result.statusCode).toBe(400);
      expect(result.headers['Content-Type']).toBe('application/json');

      const body = JSON.parse(result.body);
      expect(body).toEqual({
        message: 'Invalid booking ID format',
      });

      // Verify DynamoDB was never called
      expect(mockGet).not.toHaveBeenCalled();
    });

    it('should return 400 when booking ID is missing', async () => {
      // Arrange
      const userId = 'user-123';

      const token = generateToken({
        userId: userId,
        role: 'USER',
      });

      const authorizerContext = {
        userId: userId,
        role: 'USER',
      };

      const event = createApiGatewayEvent(null, token, authorizerContext);

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

    it('should return 400 for UUID with invalid characters', async () => {
      // Arrange
      const invalidBookingId = '550e8400-e29b-41d4-a716-44665544000g'; // 'g' is invalid
      const userId = 'user-123';

      const token = generateToken({
        userId: userId,
        role: 'USER',
      });

      const authorizerContext = {
        userId: userId,
        role: 'USER',
      };

      const event = createApiGatewayEvent(invalidBookingId, token, authorizerContext);

      // Act
      const result = await handler(event);

      // Assert
      expect(result.statusCode).toBe(400);
      expect(result.headers['Content-Type']).toBe('application/json');

      const body = JSON.parse(result.body);
      expect(body.message).toBe('Invalid booking ID format');

      // Verify DynamoDB was never called
      expect(mockGet).not.toHaveBeenCalled();
    });
  });

  describe('Authorization Errors', () => {
    it('should return 401 when no authorization token is provided', async () => {
      // Arrange
      const bookingId = '550e8400-e29b-41d4-a716-446655440000';

      // No token and no authorizer context (simulating missing auth)
      const event = {
        pathParameters: {
          id: bookingId,
        },
        headers: {},
        requestContext: {
          // No authorizer context
        },
      };

      // Act
      const result = await handler(event);

      // Assert
      expect(result.statusCode).toBe(401);
      expect(result.headers['Content-Type']).toBe('application/json');

      const body = JSON.parse(result.body);
      expect(body.message).toBe('Unauthorized');

      // Verify DynamoDB was never called
      expect(mockGet).not.toHaveBeenCalled();
    });

    it('should return 401 when user ID is missing from authorizer context', async () => {
      // Arrange
      const bookingId = '550e8400-e29b-41d4-a716-446655440000';

      const token = generateToken({
        userId: 'user-123',
        role: 'USER',
      });

      // Authorizer context without userId
      const authorizerContext = {
        role: 'USER',
        // No userId
      };

      const event = createApiGatewayEvent(bookingId, token, authorizerContext);

      // Act
      const result = await handler(event);

      // Assert
      expect(result.statusCode).toBe(401);
      expect(result.headers['Content-Type']).toBe('application/json');

      const body = JSON.parse(result.body);
      expect(body.message).toBe('Unauthorized');

      // Verify DynamoDB was never called
      expect(mockGet).not.toHaveBeenCalled();
    });

    it('should return 403 when non-ADMIN user tries to access another user\\'s booking', async () => {
      // Arrange
      const bookingId = '550e8400-e29b-41d4-a716-446655440000';
      const bookingOwnerId = 'user-123';
      const requestingUserId = 'user-456'; // Different user

      const mockBooking = {
        id: bookingId,
        date: '2025-01-15',
        user: {
          id: bookingOwnerId,
          name: 'John Doe',
          email: 'john@example.com',
        },
      };

      const token = generateToken({
        userId: requestingUserId,
        role: 'USER',
      });

      const authorizerContext = {
        userId: requestingUserId,
        role: 'USER',
      };

      const event = createApiGatewayEvent(bookingId, token, authorizerContext);

      mockPromise.mockResolvedValue({
        Item: mockBooking,
      });

      // Act
      const result = await handler(event);

      // Assert
      expect(result.statusCode).toBe(403);
      expect(result.headers['Content-Type']).toBe('application/json');

      const body = JSON.parse(result.body);
      expect(body.message).toBe('Not authorized to view this booking');

      // Verify DynamoDB was called (authorization check happens after fetch)
      expect(mockGet).toHaveBeenCalledTimes(1);
    });

    it('should return 403 when user field is missing and user is not ADMIN', async () => {
      // Arrange
      const bookingId = '660e8400-e29b-41d4-a716-446655441111';
      const userId = 'user-123';

      // Booking with missing user field
      const mockBooking = {
        id: bookingId,
        date: '2025-01-15',
        // No user field
      };

      const token = generateToken({
        userId: userId,
        role: 'USER',
      });

      const authorizerContext = {
        userId: userId,
        role: 'USER',
      };

      const event = createApiGatewayEvent(bookingId, token, authorizerContext);

      mockPromise.mockResolvedValue({
        Item: mockBooking,
      });

      // Act
      const result = await handler(event);

      // Assert - Non-ADMIN should be denied
      expect(result.statusCode).toBe(403);

      const body = JSON.parse(result.body);
      expect(body.message).toBe('Not authorized to view this booking');
    });
  });

  describe('Not Found Errors', () => {
    it('should return 404 when booking does not exist', async () => {
      // Arrange
      const bookingId = '550e8400-e29b-41d4-a716-446655440000';
      const userId = 'user-123';

      const token = generateToken({
        userId: userId,
        role: 'USER',
      });

      const authorizerContext = {
        userId: userId,
        role: 'USER',
      };

      const event = createApiGatewayEvent(bookingId, token, authorizerContext);

      // Mock DynamoDB response - no item found
      mockPromise.mockResolvedValue({});

      // Act
      const result = await handler(event);

      // Assert
      expect(result.statusCode).toBe(404);
      expect(result.headers['Content-Type']).toBe('application/json');

      const body = JSON.parse(result.body);
      expect(body.message).toBe('Booking not found');

      // Verify DynamoDB was called
      expect(mockGet).toHaveBeenCalledTimes(1);
    });

    it('should return 404 for non-existent booking even with ADMIN role', async () => {
      // Arrange
      const bookingId = '660e8400-e29b-41d4-a716-446655441111';
      const adminUserId = 'admin-789';

      const token = generateToken({
        userId: adminUserId,
        role: 'ADMIN',
      });

      const authorizerContext = {
        userId: adminUserId,
        role: 'ADMIN',
      };

      const event = createApiGatewayEvent(bookingId, token, authorizerContext);

      // Mock DynamoDB response - no item found
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
