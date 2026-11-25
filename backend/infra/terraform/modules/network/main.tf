data "aws_region" "current" {}

data "aws_caller_identity" "current" {}

data "aws_partition" "current" {}

data "aws_availability_zones" "available" {
  state = "available"
}

locals {
  # Two availability zones. With a /16, newbits 6 gives /22 subnets.
  # Public at indexes 0 and 1, private (apps) at 2 and 3, data at 4 and 5.
  azs           = slice(data.aws_availability_zones.available.names, 0, 2)
  public_cidrs  = [for i in range(2) : cidrsubnet(var.vpc_cidr, 6, i)]
  private_cidrs = [for i in range(2) : cidrsubnet(var.vpc_cidr, 6, i + 2)]
  data_cidrs    = [for i in range(2) : cidrsubnet(var.vpc_cidr, 6, i + 4)]

  # Internet egress only for the private application subnets (ADR 0016).
  # none: no NAT. single_nat: one NAT in the first AZ. per_az_nat: one NAT per AZ.
  nat_count = { none = 0, single_nat = 1, per_az_nat = 2 }[var.egress]

  flow_log_group_name = "/aws/vpc/${var.name_prefix}-flow-logs"

  # Traffic to AWS services goes through VPC endpoints, bypassing the NAT.
  interface_endpoints = toset([
    "sqs", "sns", "secretsmanager", "ecr.api", "ecr.dkr", "logs", "sts", "kms", "monitoring",
  ])
}

resource "aws_vpc" "this" {
  cidr_block           = var.vpc_cidr
  enable_dns_support   = true
  enable_dns_hostnames = true

  tags = merge(var.tags, { Name = "${var.name_prefix}-vpc" })
}

resource "aws_internet_gateway" "this" {
  vpc_id = aws_vpc.this.id

  tags = merge(var.tags, { Name = "${var.name_prefix}-igw" })
}

resource "aws_subnet" "public" {
  count = 2

  vpc_id            = aws_vpc.this.id
  cidr_block        = local.public_cidrs[count.index]
  availability_zone = local.azs[count.index]

  tags = merge(var.tags, {
    Name = "${var.name_prefix}-public-${count.index}"
    Tier = "public"
  })
}

resource "aws_subnet" "private" {
  count = 2

  vpc_id            = aws_vpc.this.id
  cidr_block        = local.private_cidrs[count.index]
  availability_zone = local.azs[count.index]

  tags = merge(var.tags, {
    Name = "${var.name_prefix}-private-${count.index}"
    Tier = "private"
  })
}

resource "aws_subnet" "data" {
  count = 2

  vpc_id            = aws_vpc.this.id
  cidr_block        = local.data_cidrs[count.index]
  availability_zone = local.azs[count.index]

  tags = merge(var.tags, {
    Name = "${var.name_prefix}-data-${count.index}"
    Tier = "data"
  })
}

resource "aws_route_table" "public" {
  vpc_id = aws_vpc.this.id

  route {
    cidr_block = "0.0.0.0/0"
    gateway_id = aws_internet_gateway.this.id
  }

  tags = merge(var.tags, { Name = "${var.name_prefix}-public" })
}

resource "aws_route_table_association" "public" {
  count = 2

  subnet_id      = aws_subnet.public[count.index].id
  route_table_id = aws_route_table.public.id
}

moved {
  from = aws_route_table.private
  to   = aws_route_table.private[0]
}

# One private table per AZ so each one can point to its own NAT gateway.
resource "aws_route_table" "private" {
  count = 2

  vpc_id = aws_vpc.this.id

  tags = merge(var.tags, { Name = "${var.name_prefix}-private-${count.index}" })
}

resource "aws_route_table_association" "private" {
  count = 2

  subnet_id      = aws_subnet.private[count.index].id
  route_table_id = aws_route_table.private[count.index].id
}

resource "aws_eip" "nat" {
  count = local.nat_count

  domain = "vpc"

  tags = merge(var.tags, { Name = "${var.name_prefix}-nat-${count.index}" })

  depends_on = [aws_internet_gateway.this]
}

resource "aws_nat_gateway" "this" {
  count = local.nat_count

  allocation_id = aws_eip.nat[count.index].id
  subnet_id     = aws_subnet.public[count.index].id

  tags = merge(var.tags, { Name = "${var.name_prefix}-nat-${count.index}" })
}

# Default route for the private subnets. With single_nat they all use NAT 0.
resource "aws_route" "private_default" {
  count = local.nat_count == 0 ? 0 : 2

  route_table_id         = aws_route_table.private[count.index].id
  destination_cidr_block = "0.0.0.0/0"
  nat_gateway_id         = aws_nat_gateway.this[var.egress == "per_az_nat" ? count.index : 0].id
}

# No default route: the data subnets never reach the Internet.
resource "aws_route_table" "data" {
  vpc_id = aws_vpc.this.id

  tags = merge(var.tags, { Name = "${var.name_prefix}-data" })
}

resource "aws_route_table_association" "data" {
  count = 2

  subnet_id      = aws_subnet.data[count.index].id
  route_table_id = aws_route_table.data.id
}

resource "aws_vpc_endpoint" "s3" {
  vpc_id            = aws_vpc.this.id
  service_name      = "com.amazonaws.${data.aws_region.current.region}.s3"
  vpc_endpoint_type = "Gateway"
  route_table_ids   = concat(aws_route_table.private[*].id, [aws_route_table.data.id])

  tags = merge(var.tags, { Name = "${var.name_prefix}-s3-endpoint" })
}

resource "aws_vpc_endpoint" "dynamodb" {
  vpc_id            = aws_vpc.this.id
  service_name      = "com.amazonaws.${data.aws_region.current.region}.dynamodb"
  vpc_endpoint_type = "Gateway"
  route_table_ids   = concat(aws_route_table.private[*].id, [aws_route_table.data.id])

  tags = merge(var.tags, { Name = "${var.name_prefix}-dynamodb-endpoint" })
}

resource "aws_security_group" "endpoints" {
  name        = "${var.name_prefix}-endpoints"
  description = "HTTPS desde la VPC hacia los endpoints de interfaz"
  vpc_id      = aws_vpc.this.id

  ingress {
    description = "HTTPS desde la VPC"
    from_port   = 443
    to_port     = 443
    protocol    = "tcp"
    cidr_blocks = [var.vpc_cidr]
  }

  tags = merge(var.tags, { Name = "${var.name_prefix}-endpoints" })
}

resource "aws_vpc_endpoint" "interface" {
  for_each = local.interface_endpoints

  vpc_id              = aws_vpc.this.id
  service_name        = "com.amazonaws.${data.aws_region.current.region}.${each.value}"
  vpc_endpoint_type   = "Interface"
  subnet_ids          = aws_subnet.private[*].id
  security_group_ids  = [aws_security_group.endpoints.id]
  private_dns_enabled = true

  tags = merge(var.tags, { Name = "${var.name_prefix}-${replace(each.value, ".", "-")}-endpoint" })
}

# Flow logs for the whole VPC to CloudWatch Logs, encrypted with a CMK.
module "flow_logs_kms" {
  source = "../kms-key"

  alias          = "${var.name_prefix}-flow-logs"
  description    = "Cifrado de los flow logs de ${var.name_prefix}"
  log_group_arns = ["arn:${data.aws_partition.current.partition}:logs:${data.aws_region.current.region}:${data.aws_caller_identity.current.account_id}:log-group:${local.flow_log_group_name}"]
  tags           = var.tags
}

resource "aws_cloudwatch_log_group" "flow_logs" {
  name              = local.flow_log_group_name
  retention_in_days = var.flow_logs_retention_days
  kms_key_id        = module.flow_logs_kms.arn

  tags = merge(var.tags, { Name = "${var.name_prefix}-flow-logs" })

  depends_on = [module.flow_logs_kms]
}

resource "aws_iam_role" "flow_logs" {
  name = "${var.name_prefix}-vpc-flow-logs"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Effect    = "Allow"
      Principal = { Service = "vpc-flow-logs.amazonaws.com" }
      Action    = "sts:AssumeRole"
      Condition = {
        StringEquals = { "aws:SourceAccount" = data.aws_caller_identity.current.account_id }
        ArnLike      = { "aws:SourceArn" = "arn:${data.aws_partition.current.partition}:ec2:${data.aws_region.current.region}:${data.aws_caller_identity.current.account_id}:vpc-flow-log/*" }
      }
    }]
  })

  tags = var.tags
}

resource "aws_iam_role_policy" "flow_logs" {
  name = "write-flow-logs"
  role = aws_iam_role.flow_logs.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Effect = "Allow"
      Action = [
        "logs:CreateLogStream",
        "logs:PutLogEvents",
        "logs:DescribeLogGroups",
        "logs:DescribeLogStreams",
      ]
      Resource = [aws_cloudwatch_log_group.flow_logs.arn, "${aws_cloudwatch_log_group.flow_logs.arn}:*"]
    }]
  })
}

resource "aws_flow_log" "this" {
  vpc_id               = aws_vpc.this.id
  traffic_type         = var.flow_logs_traffic_type
  log_destination_type = "cloud-watch-logs"
  log_destination      = aws_cloudwatch_log_group.flow_logs.arn
  iam_role_arn         = aws_iam_role.flow_logs.arn

  max_aggregation_interval = 600

  tags = merge(var.tags, { Name = "${var.name_prefix}-flow-logs" })

  depends_on = [aws_iam_role_policy.flow_logs]
}

moved {
  from = aws_kms_key.flow_logs
  to   = module.flow_logs_kms.aws_kms_key.this
}

moved {
  from = aws_kms_alias.flow_logs
  to   = module.flow_logs_kms.aws_kms_alias.this
}
