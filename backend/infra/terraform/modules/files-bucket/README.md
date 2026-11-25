# files-bucket module

Private S3 bucket for user files. Clients upload and download with presigned URLs.

## What it creates

- Bucket `<name_prefix>-files-<account>` with full public access block and `BucketOwnerEnforced` ownership.
- SSE-KMS encryption with bucket key. The KMS key belongs to the module (yearly rotation) or is the one you pass in `kms_key_arn`.
- Versioning, with expiration of noncurrent versions (90 days by default).
- Lifecycle: aborts multipart uploads after 7 days, expires the `tmp/` prefix after 1 day (unconfirmed uploads) and moves to Intelligent-Tiering after 30 days.
- CORS for presigned PUT, GET and HEAD only from the given origins.
- Bucket policy that denies all traffic without TLS and with TLS below 1.2.

## Main inputs

| Variable                   | Description                                                  |
| -------------------------- | ------------------------------------------------------------ |
| `name_prefix`              | Prefix of the bucket and the key.                            |
| `cors_allowed_origins`     | Explicit origins; `*` is not allowed.                        |
| `versioning_enabled`       | Versioning on by default.                                    |
| `temporary_prefix`         | Prefix of pending uploads that expires (`tmp/`).             |
| `intelligent_tiering_days` | Days before moving to Intelligent-Tiering; null disables it. |
| `kms_key_arn`              | Optional existing key.                                       |
| `force_destroy`            | Only for disposable environments.                            |

## Outputs

`bucket_id`, `bucket_arn`, `bucket_regional_domain_name`, `kms_key_arn`, `read_write_policy_json`.

## Permissions

The module grants access to no role. The `files` service attaches `read_write_policy_json` to its task or function role, and signs the URLs with that role.
