variable "aws_region" {
  description = "AWS Region"
  default     = "eu-west-2" # UK based given 'FCA' context usually implies UK, but configurable
}

variable "project_name" {
  description = "Project Name"
  default     = "zastras-governance"
}

variable "account_id" {
  description = "AWS Account ID (used for unique bucket names)"
  type        = string
}
