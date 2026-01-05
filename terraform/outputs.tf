output "user_pool_id" {
  value = aws_cognito_user_pool.main.id
}

output "user_pool_client_id" {
  value = aws_cognito_user_pool_client.main.id
}

output "api_base_url" {
  value = aws_apigatewayv2_stage.default.invoke_url
}

output "cloudfront_url" {
  value = "https://${aws_cloudfront_distribution.main.domain_name}"
}

output "evidence_bucket_name" {
  value = aws_s3_bucket.evidence.id
}

output "certificate_validation_records" {
  value = [for dvo in aws_acm_certificate.cert.domain_validation_options : {
    name  = dvo.resource_record_name
    type  = dvo.resource_record_type
    value = dvo.resource_record_value
  }]
  description = "DNS records to add to your registrar to validate the ACM certificate."
}
