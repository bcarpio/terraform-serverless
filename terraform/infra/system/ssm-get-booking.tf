# SSM Parameter for get-booking Lambda IAM role ARN
# This parameter is already created in iam-get-booking.tf
# This file is a placeholder to maintain consistency with other services

# The SSM parameter is defined in iam-get-booking.tf as:
# resource "aws_ssm_parameter" "get_booking_role_arn" {
#   name          = "/${var.environment}/iam/get-booking-role-arn"
#   description   = "IAM role ARN for get-booking Lambda function"
#   type          = "String"
#   value         = aws_iam_role.get_booking_lambda.arn
#   overwrite     = true
# }

# Note: This parameter is referenced in serverless.yml as:
# role: ${ssm:/${self:provider.stage}/iam/get-booking-role-arn}
