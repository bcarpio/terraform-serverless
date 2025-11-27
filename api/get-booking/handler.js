const AWS = require('aws-sdk');
const dynamoDb = new AWS.DynamoDB.DocumentClient();

/**
 * Validates if a string is a valid UUID format
 * @param {string} str - The string to validate
 * @returns {boolean} - True if valid UUID, false otherwise
 */
function isValidUUID(str) {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  return uuidRegex.test(str);
}

/**
 * Creates a standardized API Gateway response
 * @param {number} statusCode - HTTP status code
 * @param {Object} body - Response body object
 * @returns {Object} - API Gateway response object
 */
function createResponse(statusCode, body) {
  return {
    statusCode,
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Credentials': true,
    },
    body: JSON.stringify(body), 
  };
}

/**
 * Lambda handler for retrieving a booking by ID
 * @param {Object} event - API Gateway event object
 * @returns {Promise<Object>} - API Gateway response
 */
module.exports.handler = async (event) => {
  console.log('Get Booking Handler Invoked', JSON.stringify(event));

  try {
    // Extract booking ID from path parameters
    const bookingId = event.pathParameters?.id;

    if (!bookingId) {
      console.error('Booking ID missing from path parameters');
      return createResponse(400, {
        message: 'Booking ID is required',
      });
    }

    // Validate UUID format
    if (!isValidUUID(bookingId)) {
      console.error('Invalid booking ID format:', bookingId);
      return createResponse(400, {
        message: 'Invalid booking ID format',
      });
    }

    // Get user context from authorizer
    const userContext = event.requestContext?.authorizer;
    const userId = userContext?.userId;
    const userRole = userContext?.role;

    if (!userId) {
      console.error('User ID not found in authorizer context');
      return createResponse(401, {
        message: 'Unauthorized',
      });
    }

    console.log(`User ID: ${userId}, Role: ${userRole}`);

    // Query DynamoDB for booking
    const tableName = process.env.DYNAMODB_BOOKINGS;
    if (!tableName) {
      console.error('DYNAMODB_BOOKINGS environment variable not set');
      return createResponse(500, {
        message: 'Internal server error',
      });
    }

    const params = {
      TableName: tableName,
      Key: {
        id: bookingId,
      },
    };

    console.log('DynamoDB GetItem params:', JSON.stringify(params));

    let result;
    try {
      result = await dynamoDb.get(params).promise();
    } catch (dynamoError) {
      console.error('DynamoDB error:', dynamoError);
      return createResponse(500, {
        message: 'Error retrieving booking',
      });
    }

    // Check if booking exists
    if (!result.Item) {
      console.log('Booking not found:', bookingId);
      return createResponse(404, {
        message: 'Booking not found',
      });
    }

    const booking = result.Item;
    console.log('Booking retrieved:', JSON.stringify(booking));

    // Authorization check: user owns booking OR user is ADMIN
    const isAdmin = userRole === 'ADMIN';
    const isOwner = booking.user?.id === userId;

    if (!isAdmin && !isOwner) {
      console.log(`User ${userId} not authorized to view booking ${bookingId}`);
      return createResponse(403, {
        message: 'Not authorized to view this booking',
      });
    }

    // Return booking details
    console.log('Returning booking details for:', bookingId);
    return createResponse(200, {
      id: booking.id,
      date: booking.date,
      user: {
        id: booking.user?.id || '',
        name: booking.user?.name || '',
        email: booking.user?.email || '',
      },
    });
  } catch (error) {
    console.error('Unexpected error:', error);
    return createResponse(500, {
      message: 'Internal server error',
    });
  }
};
