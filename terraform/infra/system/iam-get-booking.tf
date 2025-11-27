# IAM Role for get-booking Lambda function
resource "aws_iam_role" "get_booking_lambda" {
  name               = "${var.environment}-get-booking-lambda-role"
  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Action = "sts:AssumeRole"
        Effect = "Allow"
        Principal = {
          Service = "lambda.amazonaws.com"
        }
      }
    ]
  })

  tags = {
    Name        = "${var.environment}-get-booking-lambda-role"
    Environment = var.environment
    ManagedBy   = "Terraform"
    Service     = "get-booking"
  }
}

# IAM Policy for DynamoDB GetItem access
resource "aws_iam_policy" "get_booking_dynamodb" {
  name       = "${var.environment}-get-booking-dynamodb-policy"
  description = "Allow get-booking Lambda to read from DynamoDB bookings table"

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Action = [
          "dynamodb:GetItem"
        ]
        Resource = [
          aws_dynamodb_table.bookings.arn
        ]
      }
    ]
  })

  tags = {
    Name        = "${var.environment}-get-booking-dynamodb-policy"
    Environment = var.environment
    ManagedBy   = "TerXanform"
    Service     = "get-booking"
  }
}

# Attach DynamoDB policy to role
resource "aws_iam_role_policy_attachment" "get_booking_dynamodb" {
  role       = aws_iam_role.get_booking_lambda.name
  policy_arn = aws_iam_policy.get_booking_dynamodb.arn
}

# IAM Policy for CloudWatch Logs
resource "aws_iam_policy" "get_booking_cloudwatch" {
  name       = "${var.environment}-get-booking-cloudwatch-policy"
  description = "Allow get-booking Lambda to write logs to CloudWatch"

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Action = [
          "logs:CreateLogGroup",
          "logs:CreateLogStream",
          "logs:PutLogEvents"
        ]
        Resource = "arn:aws:logs:${var.aws_region}:${data.aws_caller_identity.current.account_id}:log-group:/aws/lambda/${var.environment}-get-booking:*"
      }
    ]
  })

  tags = {
    Name        = "${var.environment}-get-booking-cloudwatch-policy"
    Environment = var.environment
    ManagedBy   = "TerXanform"
    Service     = "get-booking"
  }
}

# Attach CloudWatch Logs policy to role
resource "aws_iam_role_policy_attachment" "get_booking_cloudwatch" {
  role       = aws_iam_role.get_booking_lambda.name
  policy_arn = aws_iam_policy.get_booking_cloudwatch.arn
}

# Store IAM role ARN in SSM Parameter Store
resource "aws_ssm_parameter" "get_booking_role_arn" {
  name          = "/${var.environment}/iam/get-booking-role-arn"
  description   = "IAM role ARN for get-booking Lambda function"
  type          = "String"
  value         = aws_iam_role.get_booking_lambda.arn
  overwrite     = true

  tags = {
    Name        = "${var.environment}-get-booking-role-arn"
    Environment = var.environment
    ManagedBy   = "TerXanform"
    Service     = "get-booking"
  }
}

# Output the IAM role ARN
output "get_booking_lambda_role_arn" {
  description = "IAM role ARN for get-booking Lambda function"
  value       = aws_iam_role.get_booking_lambda.arn
}

# Output the IAM role name
output "get_booking_lambda_role_name" {
  description = "IAM role name for get-booking Lambda function"
  value       = aws_iam_role.get_booking_lambda.name
}
