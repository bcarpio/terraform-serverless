const { handler } = require('./handler');
const AWS = require('aws-sdk');

// Mock AWS SDK
jest.mock('aws-sdk');

describe('Get Booking Handler - ADMIN User Access', () => {
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

    it('should allow ADMIN to view booking with complete user data', async () => {
      // Arrange
      const bookingId = '660e8400-e29b-41d4-a716-446655441111';
      const adminUserId = 'admin-999';
      const bookingOwnerId = 'user-456';

      const mockBooking = {
        id: bookingId,
        date: '2025-02-20',
        user: {
          id: bookingOwnerId,
          name: 'Jane Smith',
          email: 'jane@example.com',
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
        date: '2025-02-20',
        user: {
          id: bookingOwnerId,
          name: 'Jane Smith',
          email: 'jane@example.com',
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

    it('should allow ADMIN to view booking regardless of userId match', async () => {
      // Arrange
      const bookingId = '770e8400-e29b-41d4-a716-446655442222';
      const adminUserId = 'admin-111';
      const bookingOwnerId = 'user-777'; // Completely different ID

      const mockBooking = {
        id: bookingId,
        date: '2025-03-10',
        user: {
          id: bookingOwnerId,
          name: 'Bob Johnson',
          email: 'bob@example.com',
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
      expect(body.id).toBe(bookingId);
      expect(body.user.id).toBe(bookingOwnerId);
      expect(body.user.name).toBe('Bob Johnson');
      expect(body.user.email).toBe('bob@example.com');

      // Verify DynamoDB call
      expect(mockGet).toHaveBeenCalledTimes(1);
    });

    it('should return 200 for ADMIN even when booking has null user field', async () => {
      // Arrange
      const bookingId = '880e8400-e29b-41d4-a716-446655443333';
      const adminUserId = 'admin-222';

      const mockBooking = {
        id: bookingId,
        date: '2025-04-05',
        user: null, // Explicitly null
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
        date: '2025-04-05',
        user: {
          id: '',
          name: '',
          email: '',
        },
      });
    });
  });
});
