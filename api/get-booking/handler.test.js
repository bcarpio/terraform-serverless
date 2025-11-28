const { handler } = require('./handler');
const AWS = require('aws-sdk');

// Mock AWS SDK
jest.mock('aws-sdk');

describe('Get Booking Handler - Authorization Failures', () => {
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

  describe('403 Forbidden - Non-ADMIN user accessing another user\'s booking', () => {
    it('should return 403 when non-ADMIN user tries to access another user\'s booking', async () => {
      // Arrange
      const bookingId = '550e8400-e29b-41d4-a716-446655440000';
      const bookingOwnerId = 'user-123'; // Owner of the booking
      const requestingUserId = 'user-456'; // Different user trying to access

      const event = {
        pathParameters: {
          id: bookingId,
        },
        requestContext: {
          authorizer: {
            userId: requestingUserId,
            role: 'USER', // Not an ADMIN
          },
        },
      };

      // Mock DynamoDB response - booking exists but belongs to another user
      mockPromise.mockResolvedValue({
        Item: {
          id: bookingId,
          date: '2025-01-15',
          user: {
            id: bookingOwnerId, // Different from requesting user
            name: 'John Doe',
            email: 'john@example.com',
          },
        },
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

      // Verify DynamoDB call
      expect(mockGet).toHaveBeenCalledTimes(1);
      expect(mockGet).toHaveBeenCalledWith({
        TableName: 'test-bookings-table',
        Key: {
          id: bookingId,
        },
      });
    });

    it('should return 403 with correct error message format', async () => {
      // Arrange
      const bookingId = '660e8400-e29b-41d4-a716-446655441111';
      const bookingOwnerId = 'user-789';
      const requestingUserId = 'user-999';

      const event = {
        pathParameters: {
          id: bookingId,
        },
        requestContext: {
          authorizer: {
            userId: requestingUserId,
            role: 'USER',
          },
        },
      };

      mockPromise.mockResolvedValue({
        Item: {
          id: bookingId,
          date: '2025-02-20',
          user: {
            id: bookingOwnerId,
            name: 'Jane Smith',
            email: 'jane@example.com',
          },
        },
      });

      // Act
      const result = await handler(event);

      // Assert
      expect(result.statusCode).toBe(403);
      expect(result.headers['Content-Type']).toBe('application/json');
      expect(result.headers['Access-Control-Allow-Origin']).toBe('*');
      expect(result.headers['Access-Control-Allow-Credentials']).toBe(true);

      const body = JSON.parse(result.body);
      expect(body).toEqual({
        message: 'Not authorized to view this booking',
      });
      expect(Object.keys(body).length).toBe(1); // Only message field
    });

    it('should return 403 when user ID does not match booking owner', async () => {
      // Arrange
      const bookingId = '770e8400-e29b-41d4-a716-446655442222';
      const bookingOwnerId = 'user-abc123';
      const requestingUserId = 'user-xyz789';

      const event = {
        pathParameters: {
          id: bookingId,
        },
        requestContext: {
          authorizer: {
            userId: requestingUserId,
            role: 'USER',
          },
        },
      };

      mockPromise.mockResolvedValue({
        Item: {
          id: bookingId,
          date: '2025-03-10',
          user: {
            id: bookingOwnerId,
            name: 'Bob Johnson',
            email: 'bob@example.com',
          },
        },
      });

      // Act
      const result = await handler(event);

      // Assert
      expect(result.statusCode).toBe(403);

      const body = JSON.parse(result.body);
      expect(body.message).toBe('Not authorized to view this booking');
    });

    it('should return 403 when user role is not ADMIN', async () => {
      // Arrange
      const bookingId = '880e8400-e29b-41d4-a716-446655443333';
      const bookingOwnerId = 'user-owner';
      const requestingUserId = 'user-other';

      const event = {
        pathParameters: {
          id: bookingId,
        },
        requestContext: {
          authorizer: {
            userId: requestingUserId,
            role: 'USER', // Explicitly not ADMIN
          },
        },
      };

      mockPromise.mockResolvedValue({
        Item: {
          id: bookingId,
          date: '2025-04-05',
          user: {
            id: bookingOwnerId,
            name: 'Alice Williams',
            email: 'alice@example.com',
          },
        },
      });

      // Act
      const result = await handler(event);

      // Assert
      expect(result.statusCode).toBe(403);

      const body = JSON.parse(result.body);
      expect(body.message).toBe('Not authorized to view this booking');
    });

    it('should return 403 when booking exists but user is not owner', async () => {
      // Arrange
      const bookingId = '990e8400-e29b-41d4-a716-446655444444';
      const bookingOwnerId = 'user-111';
      const requestingUserId = 'user-222';

      const event = {
        pathParameters: {
          id: bookingId,
        },
        requestContext: {
          authorizer: {
            userId: requestingUserId,
            role: 'USER',
          },
        },
      };

      mockPromise.mockResolvedValue({
        Item: {
          id: bookingId,
          date: '2025-05-15',
          user: {
            id: bookingOwnerId,
            name: 'Charlie Brown',
            email: 'charlie@example.com',
          },
        },
      });

      // Act
      const result = await handler(event);

      // Assert
      expect(result.statusCode).toBe(403);
      expect(result.statusCode).not.toBe(200); // Should not be successful

      const body = JSON.parse(result.body);
      expect(body.message).toBe('Not authorized to view this booking');
    });

    it('should return 403 when booking user ID is different case', async () => {
      // Arrange - Test case sensitivity
      const bookingId = 'aa0e8400-e29b-41d4-a716-446655445555';
      const bookingOwnerId = 'USER-333'; // Uppercase
      const requestingUserId = 'user-333'; // Lowercase - should not match

      const event = {
        pathParameters: {
          id: bookingId,
        },
        requestContext: {
          authorizer: {
            userId: requestingUserId,
            role: 'USER',
          },
        },
      };

      mockPromise.mockResolvedValue({
        Item: {
          id: bookingId,
          date: '2025-06-20',
          user: {
            id: bookingOwnerId,
            name: 'David Miller',
            email: 'david@example.com',
          },
        },
      });

      // Act
      const result = await handler(event);

      // Assert - Should be 403 because IDs don't match (case sensitive)
      expect(result.statusCode).toBe(403);

      const body = JSON.parse(result.body);
      expect(body.message).toBe('Not authorized to view this booking');
    });

    it('should return 403 when booking user object exists but ID doesn\'t match', async () => {
      // Arrange
      const bookingId = 'bb0e8400-e29b-41d4-a716-446655446666';
      const bookingOwnerId = 'user-aaa';
      const requestingUserId = 'user-bbb';

      const event = {
        pathParameters: {
          id: bookingId,
        },
        requestContext: {
          authorizer: {
            userId: requestingUserId,
            role: 'USER',
          },
        },
      };

      mockPromise.mockResolvedValue({
        Item: {
          id: bookingId,
          date: '2025-07-25',
          user: {
            id: bookingOwnerId,
            name: 'Eve Davis',
            email: 'eve@example.com',
          },
        },
      });

      // Act
      const result = await handler(event);

      // Assert
      expect(result.statusCode).toBe(403);

      const body = JSON.parse(result.body);
      expect(body.message).toBe('Not authorized to view this booking');
    });

    it('should return 403 when booking user field is missing and user is not ADMIN', async () => {
      // Arrange - Edge case: booking exists but user field is missing
      const bookingId = 'cc0e8400-e29b-41d4-a716-446655447777';
      const requestingUserId = 'user-ccc';

      const event = {
        pathParameters: {
          id: bookingId,
        },
        requestContext: {
          authorizer: {
            userId: requestingUserId,
            role: 'USER',
          },
        },
      };

      mockPromise.mockResolvedValue({
        Item: {
          id: bookingId,
          date: '2025-08-30',
          // No user field - data integrity issue
        },
      });

      // Act
      const result = await handler(event);

      // Assert - Should be 403 because non-ADMIN user can't access booking without owner
      expect(result.statusCode).toBe(403);

      const body = JSON.parse(result.body);
      expect(body.message).toBe('Not authorized to view this booking');
    });

    it('should return 403 when user.id is undefined in booking', async () => {
      // Arrange
      const bookingId = 'dd0e8400-e29b-41d4-a716-446655448888';
      const requestingUserId = 'user-ddd';

      const event = {
        pathParameters: {
          id: bookingId,
        },
        requestContext: {
          authorizer: {
            userId: requestingUserId,
            role: 'USER',
          },
        },
      };

      mockPromise.mockResolvedValue({
        Item: {
          id: bookingId,
          date: '2025-09-15',
          user: {
            // id is undefined
            name: 'Frank Wilson',
            email: 'frank@example.com',
          },
        },
      });

      // Act
      const result = await handler(event);

      // Assert
      expect(result.statusCode).toBe(403);

      const body = JSON.parse(result.body);
      expect(body.message).toBe('Not authorized to view this booking');
    });

    it('should not return booking details in 403 response', async () => {
      // Arrange - Ensure no information leakage
      const bookingId = 'ee0e8400-e29b-41d4-a716-446655449999';
      const bookingOwnerId = 'user-owner-999';
      const requestingUserId = 'user-other-999';

      const event = {
        pathParameters: {
          id: bookingId,
        },
        requestContext: {
          authorizer: {
            userId: requestingUserId,
            role: 'USER',
          },
        },
      };

      mockPromise.mockResolvedValue({
        Item: {
          id: bookingId,
          date: '2025-10-20',
          user: {
            id: bookingOwnerId,
            name: 'Grace Taylor',
            email: 'grace@example.com',
          },
        },
      });

      // Act
      const result = await handler(event);

      // Assert
      expect(result.statusCode).toBe(403);

      const body = JSON.parse(result.body);
      expect(body).toEqual({
        message: 'Not authorized to view this booking',
      });
      // Ensure no booking details are leaked
      expect(body.id).toBeUndefined();
      expect(body.date).toBeUndefined();
      expect(body.user).toBeUndefined();
    });
  });
});
