const { handler } = require('./handler');
const AWS = require('aws-sdk');

// Mock AWS SDK
jest.mock('aws-sdk');

describe('Get Booking Handler - Success Cases', () => {
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

  describe('Booking Owner Retrieves Their Booking', () => {
    it('should return 200 with booking details when user is the owner', async () => {
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

      // Verify DynamoDB call
      expect(mockGet).toHaveBeenCalledTimes(1);
      expect(mockGet).toHaveBeenCalledWith({
        TableName: 'test-bookings-table',
        Key: {
          id: bookingId,
        },
      });
    });

    it('should handle booking with missing user fields gracefully', async () => {
      // Arrange
      const bookingId = '550e8400-e29b-41d4-a716-446655440000';
      const userId = 'user-123';

      const mockBooking = {
        id: bookingId,
        date: '2025-01-15',
        user: {
          id: userId,
          // Missing name and email
        },
      };

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

      // Mock DynamoDB response
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

    it('should normalize user ID comparison', async () => {
      // Arrange
      const bookingId = '550e8400-e29b-41d4-a716-446655440000';
      const userId = 'user-123';

      const mockBooking = {
        id: bookingId,
        date: '2025-01-15',
        user: {
          id: userId, // Exact match
          name: 'John Doe',
          email: 'john@example.com',
        },
      };

      const event = {
        pathParameters: {
          id: bookingId,
        },
        requestContext: {
          authorizer: {
            userId: userId, // Same ID
            role: 'USER',
          },
        },
      };

      // Mock DynamoDB response
      mockPromise.mockResolvedValue({
        Item: mockBooking,
      });

      // Act
      const result = await handler(event);

      // Assert
      expect(result.statusCode).toBe(200);

      const body = JSON.parse(result.body);
      expect(body.id).toBe(bookingId);
      expect(body.user.id).toBe(userId);
    });
  });

  describe('ADMIN User Retrieves Any Booking', () => {
    it('should return 200 when ADMIN user retrieves any booking', async () => {
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

      // Verify DynamoDB call
      expect(mockGet).toHaveBeenCalledTimes(1);
      expect(mockGet).toHaveBeenCalledWith({
        TableName: 'test-bookings-table',
        Key: {
          id: bookingId,
        },
      });
    });

    it('should allow ADMIN to view booking with missing user field', async () => {
      // Arrange
      const bookingId = '550e8400-e29b-41d4-a716-446655440000';
      const adminUserId = 'admin-789';

      const mockBooking = {
        id: bookingId,
        date: '2025-01-15',
        // No user field at all
      };

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

      // Mock DynamoDB response
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
          id: '',
          name: '',
          email: '',
        },
      });
    });

    it('should allow ADMIN to view booking with partial user data', async () => {
      // Arrange
      const bookingId = '550e8400-e29b-41d4-a716-446655440000';
      const adminUserId = 'admin-789';

      const mockBooking = {
        id: bookingId,
        date: '2025-01-15',
        user: {
          id: 'user-123',
          // Missing name and email
        },
      };

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

      // Mock DynamoDB response
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
          id: 'user-123',
          name: '',
          email: '',
        },
      });
    });
  });
});

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

  describe('Invalid UUID Format', () => {
    it('should return 400 for invalid UUID format', async () => {
      // Arrange
      const invalidBookingId = 'invalid-uuid-format';
      const userId = 'user-123';

      const event = {
        pathParameters: {
          id: invalidBookingId,
        },
        requestContext: {
          authorizer: {
            userId: userId,
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
      expect(body).toEqual({
        message: 'Invalid booking ID format',
      });

      // Verify DynamoDB was never called
      expect(mockGet).not.toHaveBeenCalled();
    });

    it('should return 400 for UUID with invalid characters', async () => {
      // Arrange
      const invalidBookingId = '550e8400-e29b-41d4-a716-44665544000g'; // 'g' is invalid in UUID
      const userId = 'user-123';

      const event = {
        pathParameters: {
          id: invalidBookingId,
        },
        requestContext: {
          authorizer: {
            userId: userId,
            role: 'USER',
          },
        },
      };

      // Act
      const result = await handler(event);

      // Assert
      expect(result.statusCode).toBe(400);

      const body = JSON.parse(result.body);
      expect(body).toEqual({
        message: 'Invalid booking ID format',
      });

      // Verify DynamoDB was never called
      expect(mockGet).not.toHaveBeenCalled();
    });

    it('should return 400 for UUID with incorrect length', async () => {
      // Arrange
      const invalidBookingId = '550e8400-e29b-41d4-a716'; // Too short
      const userId = 'user-123';

      const event = {
        pathParameters: {
          id: invalidBookingId,
        },
        requestContext: {
          authorizer: {
            userId: userId,
            role: 'USER',
          },
        },
      };

      // Act
      const result = await handler(event);

      // Assert
      expect(result.statusCode).toBe(400);

      const body = JSON.parse(result.body);
      expect(body).toEqual({
        message: 'Invalid booking ID format',
      });

      // Verify DynamoDB was never called
      expect(mockGet).not.toHaveBeenCalled();
    });

    it('should return 400 for empty string', async () => {
      // Arrange
      const invalidBookingId = '';
      const userId = 'user-123';

      const event = {
        pathParameters: {
          id: invalidBookingId,
        },
        requestContext: {
          authorizer: {
            userId: userId,
            role: 'USER',
          },
        },
      };

      // Act
      const result = await handler(event);

      // Assert
      expect(result.statusCode).toBe(400);

      const body = JSON.parse(result.body);
      expect(body).toEqual({
        message: 'Invalid booking ID format',
      });

      // Verify DynamoDB was never called
      expect(mockGet).not.toHaveBeenCalled();
    });
  });

  describe('Missing Booking ID', () => {
    it('should return 400 when booking ID is missing', async () => {
      // Arrange
      const userId = 'user-123';

      const event = {
        pathParameters: {}, // No id parameter
        requestContext: {
          authorizer: {
            userId: userId,
            role: 'USER',
          },
        },
      };

      // Act
      const result = await handler(event);

      // Assert
      expect(result.statusCode).toBe(400);

      const body = JSON.parse(result.body);
      expect(body).toEqual({
        message: 'Booking ID is required',
      });

      // Verify DynamoDB was never called
      expect(mockGet).not.toHaveBeenCalled();
    });

    it('should return 400 when pathParameters is null', async () => {
      // Arrange
      const userId = 'user-123';

      const event = {
        pathParameters: null, // Null path parameters
        requestContext: {
          authorizer: {
            userId: userId,
            role: 'USER',
          },
        },
      };

      // Act
      const result = await handler(event);

      // Assert
      expect(result.statusCode).toBe(400);

      const body = JSON.parse(result.body);
      expect(body).toEqual({
        message: 'Booking ID is required',
      });

      // Verify DynamoDB was never called
      expect(mockGet).not.toHaveBeenCalled();
    });
  });
});

describe('Get Booking Handler - Not Found Errors', () => {
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

  describe('Booking Not Found', () => {
    it('should return 404 when booking does not exist', async () => {
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

      // Mock DynamoDB response - no item found
      mockPromise.mockResolvedValue({});

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

    it('should return 404 for ADMIN user when booking does not exist', async () => {
      // Arrange
      const bookingId = '550e8400-e29b-41d4-a716-446655440000';
      const adminUserId = 'admin-789';

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

      // Mock DynamoDB response - no item found
      mockPromise.mockResolvedValue({});

      // Act
      const result = await handler(event);

      // Assert
      expect(result.statusCode).toBe(404);

      const body = JSON.parse(result.body);
      expect(body).toEqual({
        message: 'Booking not found',
      });
    });
  });
});

describe('Get Booking Handler - Authorization Errors', () => {
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

  describe('Unauthorized Access', () => {
    it('should return 403 when non-owner tries to access booking', async () => {
      // Arrange
      const bookingId = '550e8400-e29b-41d4-a716-446655440000';
      const ownerId = 'user-123';
      const requesterId = 'user-456'; // Different user

      const mockBooking = {
        id: bookingId,
        date: '2025-01-15',
        user: {
          id: ownerId,
          name: 'John Doe',
          email: 'john@example.com',
        },
      };

      const event = {
        pathParameters: {
          id: bookingId,
        },
        requestContext: {
          authorizer: {
            userId: requesterId,
            role: 'USER',
          },
        },
      };

      // Mock DynamoDB response
      mockPromise.mockResolvedValue({
        Item: mockBooking,
      });

      // Act
      const result = await handler(event);

      // Assert
      expect(result.statusCode).toBe(403);
      expect(result.headers['Content-Type']).toBe('application/json');

      const body = JSON.parse(result.body);
      expect(body).toEqual({
        message: 'Not authorized to view this booking',
      });

      // Verify DynamoDB was called
      expect(mockGet).toHaveBeenCalledTimes(1);
    });

    it('should return 403 when non-ADMIN user tries to access booking with missing user field', async () => {
      // Arrange
      const bookingId = '550e8400-e29b-41d4-a716-446655440000';
      const requesterId = 'user-456';

      const mockBooking = {
        id: bookingId,
        date: '2025-01-15',
        // No user field
      };

      const event = {
        pathParameters: {
          id: bookingId,
        },
        requestContext: {
          authorizer: {
            userId: requesterId,
            role: 'USER',
          },
        },
      };

      // Mock DynamoDB response
      mockPromise.mockResolvedValue({
        Item: mockBooking,
      });

      // Act
      const result = await handler(event);

      // Assert
      expect(result.statusCode).toBe(403);

      const body = JSON.parse(result.body);
      expect(body).toEqual({
        message: 'Not authorized to view this booking',
      });
    });

    it('should return 401 when user ID is missing from authorizer', async () => {
      // Arrange
      const bookingId = '550e8400-e29b-41d4-a716-446655440000';

      const event = {
        pathParameters: {
          id: bookingId,
        },
        requestContext: {
          authorizer: {
            // No userId
            role: 'USER',
          },
        },
      };

      // Act
      const result = await handler(event);

      // Assert
      expect(result.statusCode).toBe(401);

      const body = JSON.parse(result.body);
      expect(body).toEqual({
        message: 'Unauthorized',
      });

      // Verify DynamoDB was never called
      expect(mockGet).not.toHaveBeenCalled();
    });
  });
});

describe('Get Booking Handler - DynamoDB Errors', () => {
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

  describe('Database Errors', () => {
    it('should return 500 when DynamoDB throws an error', async () => {
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
      const dynamoError = new Error('DynamoDB connection failed');
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

      // Verify DynamoDB was called
      expect(mockGet).toHaveBeenCalledTimes(1);
    });

    it('should return 500 when environment variable is missing', async () => {
      // Arrange
      delete process.env.DYNAMODB_BOOKINGS; // Remove env var

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

      // Act
      const result = await handler(event);

      // Assert
      expect(result.statusCode).toBe(500);

      const body = JSON.parse(result.body);
      expect(body).toEqual({
        message: 'Internal server error',
      });

      // Verify DynamoDB was never called
      expect(mockGet).not.toHaveBeenCalled();
    });
  });
});
