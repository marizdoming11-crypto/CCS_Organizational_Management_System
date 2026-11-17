
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using MySql.Data.MySqlClient;
using System.Security.Claims;
using System.IO;
using System.Linq;
using Microsoft.AspNetCore.Http;

[ApiController]
[Route("api/membership-fees")]
[Authorize]
public sealed class MembershipFeeController : ControllerBase
{
    private readonly AppDbContext _db;

    public MembershipFeeController(AppDbContext db)
    {
        _db = db;
    }

    // ==========================================
    // GET: api/membership-fees
    // Retrieve all membership fee configurations
    // ==========================================
    [HttpGet]
    public async Task<IActionResult> GetFees()
    {
        await using var conn = _db.GetConnection();
        await conn.OpenAsync();

        const string sql = @"
            SELECT
                fee_id,
                academic_year,
                semester,
                required_amount,
                due_date,
                status,
                created_at
            FROM membership_fees
            ORDER BY fee_id DESC";

        await using var cmd = new MySqlCommand(sql, conn);
        await using var reader = await cmd.ExecuteReaderAsync();

        var fees = new List<object>();

        while (await reader.ReadAsync())
        {
            fees.Add(new
            {
                fee_id = Convert.ToInt32(reader["fee_id"]),
                academic_year = Convert.ToString(reader["academic_year"]),
                semester = Convert.ToString(reader["semester"]),
                required_amount = Convert.ToDecimal(reader["required_amount"]),

                due_date = reader["due_date"] == DBNull.Value
                    ? null
                    : Convert.ToDateTime(reader["due_date"])
                        .ToString("yyyy-MM-dd"),

                status = Convert.ToString(reader["status"]),

                created_at = Convert.ToDateTime(reader["created_at"])
            });
        }

        return Ok(fees);
    }

    // ==========================================
    // GET: api/membership-fees/{feeId}/members/{memberId}/balance
    // Retrieve a student's membership payment balance
    // ==========================================
    [HttpGet("{feeId:int}/members/{memberId:int}/balance")]
    public async Task<IActionResult> GetMemberBalance(
        int feeId,
        int memberId)
    {
        if (feeId <= 0 || memberId <= 0)
        {
            return BadRequest(new
            {
                message = "Invalid fee ID or member ID."
            });
        }

        await using var conn = _db.GetConnection();
        await conn.OpenAsync();

        const string sql = @"
            SELECT
                f.fee_id,
                f.academic_year,
                f.semester,
                f.required_amount,
                m.id AS member_id,
                m.full_name,

                COALESCE(
                    SUM(
                        CASE
                            WHEN p.verification_status = 'Verified'
                            THEN p.amount_paid
                            ELSE 0
                        END
                    ), 0
                ) AS total_paid

            FROM membership_fees f

            CROSS JOIN members m

            LEFT JOIN membership_payments p
                ON p.fee_id = f.fee_id
                AND p.member_id = m.id

            WHERE f.fee_id = @feeId
                AND m.id = @memberId

            GROUP BY
                f.fee_id,
                f.academic_year,
                f.semester,
                f.required_amount,
                m.id,
                m.full_name";

        await using var cmd = new MySqlCommand(sql, conn);

        cmd.Parameters.AddWithValue("@feeId", feeId);
        cmd.Parameters.AddWithValue("@memberId", memberId);

        await using var reader = await cmd.ExecuteReaderAsync();

        if (!await reader.ReadAsync())
        {
            return NotFound(new
            {
                message = "Membership fee configuration or student not found."
            });
        }

        decimal requiredAmount =
            Convert.ToDecimal(reader["required_amount"]);

        decimal totalPaid =
            Convert.ToDecimal(reader["total_paid"]);

        decimal balance =
            Math.Max(0, requiredAmount - totalPaid);

        decimal overpayment =
            Math.Max(0, totalPaid - requiredAmount);

        string paymentStatus =
            totalPaid >= requiredAmount
                ? "Fully Paid"
                : totalPaid > 0
                    ? "Partially Paid"
                    : "Unpaid";

        return Ok(new
        {
            fee_id = Convert.ToInt32(reader["fee_id"]),

            academic_year =
                Convert.ToString(reader["academic_year"]),

            semester =
                Convert.ToString(reader["semester"]),

            member_id =
                Convert.ToInt32(reader["member_id"]),

            full_name =
                Convert.ToString(reader["full_name"]),

            required_amount = requiredAmount,
            total_paid = totalPaid,
            balance = balance,
            overpayment = overpayment,
            payment_status = paymentStatus
        });
    }

    // ==========================================
    // POST: api/membership-fees/payments
    // Record Cash or GCash membership payment
    // ==========================================
    [HttpPost("payments")]
    public async Task<IActionResult> RecordPayment(
        [FromBody] MembershipPaymentRequest request)
    {
        if (!ModelState.IsValid)
            return ValidationProblem(ModelState);

        if (request.FeeId <= 0 || request.MemberId <= 0)
            return BadRequest(new { message = "Invalid fee or member ID." });

        if (request.AmountPaid <= 0)
            return BadRequest(new { message = "Payment amount must be greater than zero." });

        if (request.PaymentDate == default)
            return BadRequest(new { message = "Payment date is required." });

        string method = request.PaymentMethod.Trim();

        if (method != "Cash" && method != "GCash")
            return BadRequest(new { message = "Invalid payment method." });

        string? referenceNumber = request.ReferenceNumber?.Trim();

        if (method == "GCash" &&
            string.IsNullOrWhiteSpace(referenceNumber))
        {
            return BadRequest(new
            {
                message = "GCash reference number is required."
            });
        }

        string? adviserClaim =
            User.FindFirst(ClaimTypes.NameIdentifier)?.Value;

        if (!int.TryParse(adviserClaim, out int adviserId))
            return Unauthorized(new
            {
                message = "Unable to identify the logged-in adviser."
            });

        await using var conn = _db.GetConnection();
        await conn.OpenAsync();

        await using var transaction =
            await conn.BeginTransactionAsync();

        try
        {
            // 1. Check membership fee configuration.
            const string feeSql = @"
                SELECT required_amount, status
                FROM membership_fees
                WHERE fee_id = @feeId
                LIMIT 1";

            decimal requiredAmount;
            string feeStatus;

            await using (var feeCmd =
                new MySqlCommand(feeSql, conn, transaction))
            {
                feeCmd.Parameters.AddWithValue("@feeId", request.FeeId);

                await using var reader =
                    await feeCmd.ExecuteReaderAsync();

                if (!await reader.ReadAsync())
                {
                    await transaction.RollbackAsync();
                    return NotFound(new
                    {
                        message = "Membership fee configuration not found."
                    });
                }

                requiredAmount =
                    Convert.ToDecimal(reader["required_amount"]);

                feeStatus =
                    Convert.ToString(reader["status"]) ?? "";
            }

            if (!string.Equals(
                feeStatus, "Active",
                StringComparison.OrdinalIgnoreCase))
            {
                await transaction.RollbackAsync();
                return BadRequest(new
                {
                    message = "This membership fee is not active."
                });
            }

            // 2. Check whether the student exists.
            const string memberSql = @"
                SELECT COUNT(*)
                FROM members
                WHERE id = @memberId";

            await using (var memberCmd =
                new MySqlCommand(memberSql, conn, transaction))
            {
                memberCmd.Parameters.AddWithValue(
                    "@memberId", request.MemberId);

                int memberExists = Convert.ToInt32(
                    await memberCmd.ExecuteScalarAsync());

                if (memberExists == 0)
                {
                    await transaction.RollbackAsync();
                    return NotFound(new
                    {
                        message = "Student not found."
                    });
                }
            }

            // 3. Check duplicate GCash reference number.
            if (method == "GCash")
            {
                const string referenceSql = @"
                    SELECT COUNT(*)
                    FROM membership_payments
                    WHERE reference_number = @reference";

                await using var referenceCmd =
                    new MySqlCommand(referenceSql, conn, transaction);

                referenceCmd.Parameters.AddWithValue(
                    "@reference", referenceNumber);

                int duplicate = Convert.ToInt32(
                    await referenceCmd.ExecuteScalarAsync());

                if (duplicate > 0)
                {
                    await transaction.RollbackAsync();
                    return Conflict(new
                    {
                        message = "This GCash reference number has already been used."
                    });
                }
            }

            // 4. Calculate remaining balance using VERIFIED payments only.
            const string balanceSql = @"
                SELECT COALESCE(SUM(amount_paid), 0)
                FROM membership_payments
                WHERE fee_id = @feeId
                  AND member_id = @memberId
                  AND verification_status = 'Verified'";

            decimal totalPaid;

            await using (var balanceCmd =
                new MySqlCommand(balanceSql, conn, transaction))
            {
                balanceCmd.Parameters.AddWithValue(
                    "@feeId", request.FeeId);

                balanceCmd.Parameters.AddWithValue(
                    "@memberId", request.MemberId);

                totalPaid = Convert.ToDecimal(
                    await balanceCmd.ExecuteScalarAsync());
            }

            decimal remainingBalance =
                Math.Max(0, requiredAmount - totalPaid);

            if (request.AmountPaid > remainingBalance)
            {
                await transaction.RollbackAsync();
                return BadRequest(new
                {
                    message = "Payment exceeds the remaining balance.",
                    remaining_balance = remainingBalance,
                    attempted_amount = request.AmountPaid
                });
            }
            

            // 5. Determine verification status.
            string verificationStatus =
                method == "Cash" ? "Verified" : "Pending";

            object? verifiedBy =
                method == "Cash" ? adviserId : DBNull.Value;

            object? verifiedAt =
                method == "Cash" ? DateTime.UtcNow : DBNull.Value;

            // 6. Insert payment transaction.
            const string insertSql = @"
                INSERT INTO membership_payments
                (
                    fee_id,
                    member_id,
                    amount_paid,
                    payment_method,
                    reference_number,
                    payment_date,
                    verification_status,
                    received_by,
                    verified_by,
                    verified_at,
                    remarks
                )
                VALUES
                (
                    @feeId,
                    @memberId,
                    @amount,
                    @method,
                    @reference,
                    @paymentDate,
                    @status,
                    @receivedBy,
                    @verifiedBy,
                    @verifiedAt,
                    @remarks
                );

                SELECT LAST_INSERT_ID();";

            int paymentId;

            await using (var insertCmd =
                new MySqlCommand(insertSql, conn, transaction))
            {
                insertCmd.Parameters.AddWithValue(
                    "@feeId", request.FeeId);

                insertCmd.Parameters.AddWithValue(
                    "@memberId", request.MemberId);

                insertCmd.Parameters.AddWithValue(
                    "@amount", request.AmountPaid);

                insertCmd.Parameters.AddWithValue(
                    "@method", method);

                insertCmd.Parameters.AddWithValue(
                    "@reference",
                    string.IsNullOrWhiteSpace(referenceNumber)
                        ? DBNull.Value
                        : referenceNumber);

                insertCmd.Parameters.AddWithValue(
                    "@paymentDate", request.PaymentDate.Date);

                insertCmd.Parameters.AddWithValue(
                    "@status", verificationStatus);

                insertCmd.Parameters.AddWithValue(
                    "@receivedBy", adviserId);

                insertCmd.Parameters.AddWithValue(
                    "@verifiedBy", verifiedBy);

                insertCmd.Parameters.AddWithValue(
                    "@verifiedAt", verifiedAt);

                insertCmd.Parameters.AddWithValue(
                    "@remarks",
                    string.IsNullOrWhiteSpace(request.Remarks)
                        ? DBNull.Value
                        : request.Remarks.Trim());

                paymentId = Convert.ToInt32(
                    await insertCmd.ExecuteScalarAsync());
            }

            // 7. Record the activity in the audit log.
            const string auditSql = @"
                INSERT INTO payment_audit_logs
                (
                    payment_id,
                    action,
                    old_value,
                    new_value,
                    remarks,
                    performed_by
                )
                VALUES
                (
                    @paymentId,
                    @action,
                    NULL,
                    @newValue,
                    @remarks,
                    @performedBy
                )";

            await using (var auditCmd =
                new MySqlCommand(auditSql, conn, transaction))
            {
                auditCmd.Parameters.AddWithValue(
                    "@paymentId", paymentId);

                auditCmd.Parameters.AddWithValue(
                    "@action",
                    method == "Cash"
                        ? "Cash Payment Recorded and Verified"
                        : "GCash Payment Submitted");

                auditCmd.Parameters.AddWithValue(
                    "@newValue",
                    $"{request.AmountPaid:N2} | {method} | {verificationStatus}");

                auditCmd.Parameters.AddWithValue(
                    "@remarks",
                    request.Remarks ?? "");

                auditCmd.Parameters.AddWithValue(
                    "@performedBy", adviserId);

                await auditCmd.ExecuteNonQueryAsync();
            }

            string? receiptNumber = null;

            // Cash payments are verified immediately, so issue a receipt now.
            // GCash receipts are issued only after successful verification.
            if (method == "Cash")
            {
                
                receiptNumber = await CreateReceiptIfNotExistsAsync(
                    conn,
                    transaction,
                    paymentId,
                    request.AmountPaid,
                    adviserId);
            }

            await transaction.CommitAsync();

            return Ok(new
            {
                message = method == "Cash"
                    ? "Cash payment recorded and verified successfully."
                    : "GCash payment submitted. Awaiting verification.",

                payment_id = paymentId,
                fee_id = request.FeeId,
                member_id = request.MemberId,
                amount_paid = request.AmountPaid,
                payment_method = method,
                verification_status = verificationStatus,
                receipt_number = receiptNumber,
                remaining_balance = method == "Cash"
                    ? remainingBalance - request.AmountPaid
                    : remainingBalance
            });
        }
        catch (MySqlException ex) when (ex.Number == 1062)
        {
            await transaction.RollbackAsync();

            return Conflict(new
            {
                message = "Duplicate payment reference number."
            });
        }
        catch
        {
            await transaction.RollbackAsync();
            throw;
        }
    }

    // ==========================================
    // GET: api/membership-fees/payments/{paymentId}/receipt
    // Retrieve an issued payment receipt
    // ==========================================
    [HttpGet("payments/{paymentId:int}/receipt")]
    public async Task<IActionResult> GetPaymentReceipt(int paymentId)
    {
        if (paymentId <= 0)
        {
            return BadRequest(new
            {
                message = "Invalid payment ID."
            });
        }

        await using var conn = _db.GetConnection();
        await conn.OpenAsync();

        const string sql = @"
            SELECT
                r.receipt_id,
                r.receipt_number,
                r.amount,
                r.issued_at,
                r.issued_by,

                p.payment_id,
                p.payment_method,
                p.payment_date,
                p.reference_number,
                p.verification_status,

                m.id AS member_id,
                m.full_name,

                f.academic_year,
                f.semester,
                f.required_amount

            FROM payment_receipts r

            INNER JOIN membership_payments p
                ON r.payment_id = p.payment_id

            INNER JOIN members m
                ON p.member_id = m.id

            INNER JOIN membership_fees f
                ON p.fee_id = f.fee_id

            WHERE r.payment_id = @paymentId
            LIMIT 1";

        await using var cmd = new MySqlCommand(sql, conn);
        cmd.Parameters.AddWithValue("@paymentId", paymentId);

        await using var reader = await cmd.ExecuteReaderAsync();

        if (!await reader.ReadAsync())
        {
            return NotFound(new
            {
                message = "Receipt not found. The payment may not yet be verified."
            });
        }

        string verificationStatus =
            Convert.ToString(reader["verification_status"]) ?? "";

        if (verificationStatus != "Verified")
        {
            return Conflict(new
            {
                message = "A receipt is only available for verified payments."
            });
        }

        return Ok(new
        {
            receipt_id = Convert.ToInt32(reader["receipt_id"]),
            receipt_number = Convert.ToString(reader["receipt_number"]),
            issued_at = Convert.ToDateTime(reader["issued_at"]),
            issued_by = Convert.ToInt32(reader["issued_by"]),

            payment = new
            {
                payment_id = Convert.ToInt32(reader["payment_id"]),
                payment_method = Convert.ToString(reader["payment_method"]),
                payment_date = Convert.ToDateTime(reader["payment_date"])
                    .ToString("yyyy-MM-dd"),
                reference_number = reader["reference_number"] == DBNull.Value
                    ? null
                    : Convert.ToString(reader["reference_number"]),
                verification_status = verificationStatus
            },

            student = new
            {
                member_id = Convert.ToInt32(reader["member_id"]),
                full_name = Convert.ToString(reader["full_name"])
            },

            membership = new
            {
                academic_year = Convert.ToString(reader["academic_year"]),
                semester = Convert.ToString(reader["semester"]),
                required_amount = Convert.ToDecimal(reader["required_amount"])
            },

            amount_paid = Convert.ToDecimal(reader["amount"])
        });
    }

    // ==========================================
    // PATCH: Verify a pending GCash payment
    // ==========================================
    [HttpPatch("payments/{paymentId:int}/verify")]
    public async Task<IActionResult> VerifyPayment(int paymentId)
    {
        if (paymentId <= 0)
            return BadRequest(new { message = "Invalid payment ID." });

        if (!int.TryParse(
            User.FindFirst(ClaimTypes.NameIdentifier)?.Value,
            out int adviserId))
        {
            return Unauthorized(new { message = "Invalid adviser account." });
        }

        await using var conn = _db.GetConnection();
        await conn.OpenAsync();

        await using var transaction = await conn.BeginTransactionAsync();

        try
        {
            const string selectSql = @"
                SELECT fee_id, member_id, amount_paid, payment_method,
                       verification_status
                FROM membership_payments
                WHERE payment_id = @paymentId
                FOR UPDATE";

            int feeId;
            int memberId;
            decimal amountPaid;
            string method;
            string status;

            await using (var cmd =
                new MySqlCommand(selectSql, conn, transaction))
            {
                cmd.Parameters.AddWithValue("@paymentId", paymentId);

                await using var reader = await cmd.ExecuteReaderAsync();

                if (!await reader.ReadAsync())
                {
                    await transaction.RollbackAsync();
                    return NotFound(new { message = "Payment not found." });
                }

                feeId = Convert.ToInt32(reader["fee_id"]);
                memberId = Convert.ToInt32(reader["member_id"]);
                amountPaid = Convert.ToDecimal(reader["amount_paid"]);
                method = Convert.ToString(reader["payment_method"]) ?? "";
                status = Convert.ToString(reader["verification_status"]) ?? "";
            }

            if (!string.Equals(method, "GCash",
                StringComparison.OrdinalIgnoreCase))
            {
                await transaction.RollbackAsync();
                return BadRequest(new
                {
                    message = "Only GCash payments require manual verification."
                });
            }

            if (status != "Pending")
            {
                await transaction.RollbackAsync();
                return Conflict(new
                {
                    message = $"This payment is already {status}."
                });
            }

            // Recheck balance before confirming the payment.
            const string balanceSql = @"
                SELECT required_amount -
                    COALESCE((
                        SELECT SUM(amount_paid)
                        FROM membership_payments
                        WHERE fee_id = @feeId
                          AND member_id = @memberId
                          AND verification_status = 'Verified'
                    ), 0)
                FROM membership_fees
                WHERE fee_id = @feeId";

            decimal remainingBalance;

            await using (var balanceCmd =
                new MySqlCommand(balanceSql, conn, transaction))
            {
                balanceCmd.Parameters.AddWithValue("@feeId", feeId);
                balanceCmd.Parameters.AddWithValue("@memberId", memberId);

                object? result = await balanceCmd.ExecuteScalarAsync();

                if (result == null || result == DBNull.Value)
                {
                    await transaction.RollbackAsync();
                    return NotFound(new
                    {
                        message = "Membership fee configuration not found."
                    });
                }

                remainingBalance = Convert.ToDecimal(result);
            }

            if (amountPaid > remainingBalance)
            {
                await transaction.RollbackAsync();
                return Conflict(new
                {
                    message = "Cannot verify this payment because it exceeds the remaining balance.",
                    remaining_balance = Math.Max(0, remainingBalance),
                    payment_amount = amountPaid
                });
            }

            const string updateSql = @"
                UPDATE membership_payments
                SET verification_status = 'Verified',
                    verified_by = @adviserId,
                    verified_at = UTC_TIMESTAMP()
                WHERE payment_id = @paymentId
                  AND verification_status = 'Pending'";

            await using (var updateCmd =
                new MySqlCommand(updateSql, conn, transaction))
            {
                updateCmd.Parameters.AddWithValue("@adviserId", adviserId);
                updateCmd.Parameters.AddWithValue("@paymentId", paymentId);

                if (await updateCmd.ExecuteNonQueryAsync() != 1)
                {
                    await transaction.RollbackAsync();
                    return Conflict(new
                    {
                        message = "Payment status changed. Please refresh and try again."
                    });
                }
            }

            const string auditSql = @"
                INSERT INTO payment_audit_logs
                (payment_id, action, old_value, new_value, remarks, performed_by)
                VALUES
                (@paymentId, 'GCash Payment Verified',
                 'Pending', 'Verified', 'GCash payment verified by adviser.',
                 @adviserId)";

            await using (var auditCmd =
                new MySqlCommand(auditSql, conn, transaction))
            {
                auditCmd.Parameters.AddWithValue("@paymentId", paymentId);
                auditCmd.Parameters.AddWithValue("@adviserId", adviserId);
                await auditCmd.ExecuteNonQueryAsync();
            }

            // Issue the receipt only after the GCash payment is verified.
            string receiptNumber = await CreateReceiptIfNotExistsAsync(
                conn,
                transaction,
                paymentId,
                amountPaid,
                adviserId);

            await transaction.CommitAsync();

            return Ok(new
            {
                message = "GCash payment verified and receipt generated successfully.",
                payment_id = paymentId,
                verification_status = "Verified",
                verified_by = adviserId,
                receipt_number = receiptNumber,
                receipt_amount = amountPaid,
                remaining_balance = Math.Max(0, remainingBalance - amountPaid)
            });
        }
        catch
        {
            await transaction.RollbackAsync();
            throw;
        }
    }

    // ==========================================
    // PATCH: Reject a pending GCash payment
    // ==========================================
    [HttpPatch("payments/{paymentId:int}/reject")]
    public async Task<IActionResult> RejectPayment(
        int paymentId,
        [FromQuery] string reason)
    {
        if (paymentId <= 0)
            return BadRequest(new { message = "Invalid payment ID." });

        if (string.IsNullOrWhiteSpace(reason))
            return BadRequest(new { message = "Rejection reason is required." });

        if (reason.Trim().Length > 500)
            return BadRequest(new { message = "Reason must not exceed 500 characters." });

        if (!int.TryParse(
            User.FindFirst(ClaimTypes.NameIdentifier)?.Value,
            out int adviserId))
        {
            return Unauthorized(new { message = "Invalid adviser account." });
        }

        await using var conn = _db.GetConnection();
        await conn.OpenAsync();

        await using var transaction = await conn.BeginTransactionAsync();

        try
        {
            const string selectSql = @"
                SELECT payment_method, verification_status
                FROM membership_payments
                WHERE payment_id = @paymentId
                FOR UPDATE";

            string method;
            string status;

            await using (var cmd =
                new MySqlCommand(selectSql, conn, transaction))
            {
                cmd.Parameters.AddWithValue("@paymentId", paymentId);

                await using var reader = await cmd.ExecuteReaderAsync();

                if (!await reader.ReadAsync())
                {
                    await transaction.RollbackAsync();
                    return NotFound(new { message = "Payment not found." });
                }

                method = Convert.ToString(reader["payment_method"]) ?? "";
                status = Convert.ToString(reader["verification_status"]) ?? "";
            }

            if (method != "GCash")
            {
                await transaction.RollbackAsync();
                return BadRequest(new
                {
                    message = "Only GCash payments can be rejected."
                });
            }

            if (status != "Pending")
            {
                await transaction.RollbackAsync();
                return Conflict(new
                {
                    message = $"This payment is already {status}."
                });
            }

            const string updateSql = @"
                UPDATE membership_payments
                SET verification_status = 'Rejected',
                    remarks = CONCAT(
                        COALESCE(remarks, ''),
                        CASE
                            WHEN remarks IS NULL OR remarks = '' THEN ''
                            ELSE ' | '
                        END,
                        'Rejected: ',
                        @reason
                    )
                WHERE payment_id = @paymentId
                  AND verification_status = 'Pending'";

            await using (var updateCmd =
                new MySqlCommand(updateSql, conn, transaction))
            {
                updateCmd.Parameters.AddWithValue(
                    "@reason", reason.Trim());

                updateCmd.Parameters.AddWithValue(
                    "@paymentId", paymentId);

                if (await updateCmd.ExecuteNonQueryAsync() != 1)
                {
                    await transaction.RollbackAsync();
                    return Conflict(new
                    {
                        message = "Payment status changed. Please refresh and try again."
                    });
                }
            }

            const string auditSql = @"
                INSERT INTO payment_audit_logs
                (payment_id, action, old_value, new_value, remarks, performed_by)
                VALUES
                (@paymentId, 'GCash Payment Rejected',
                 'Pending', 'Rejected', @reason, @adviserId)";

            await using (var auditCmd =
                new MySqlCommand(auditSql, conn, transaction))
            {
                auditCmd.Parameters.AddWithValue("@paymentId", paymentId);
                auditCmd.Parameters.AddWithValue("@reason", reason.Trim());
                auditCmd.Parameters.AddWithValue("@adviserId", adviserId);

                await auditCmd.ExecuteNonQueryAsync();
            }

            // Rejected payments must not generate receipts.
            await transaction.CommitAsync();

            
return Ok(new
            {
                message = "GCash payment rejected successfully.",
                payment_id = paymentId,
                verification_status = "Rejected",
                rejected_by = adviserId,
                rejection_reason = reason.Trim()
            });

        }
        catch
        {
            await transaction.RollbackAsync();
            throw;
        }
    }
    




    // ==========================================
    // POST: api/membership-fees/payments/{paymentId}/attachments
    // Upload GCash payment screenshot
    // ==========================================
    [HttpPost("payments/{paymentId:int}/attachments")]
    [Consumes("multipart/form-data")]
    [RequestSizeLimit(5 * 1024 * 1024)]
    public async Task<IActionResult> UploadPaymentProof(
        int paymentId,
        IFormFile file)
    {
        if (paymentId <= 0)
            return BadRequest(new { message = "Invalid payment ID." });

        if (file == null || file.Length == 0)
            return BadRequest(new { message = "Please select a payment screenshot." });

        const long maxFileSize = 5 * 1024 * 1024;

        if (file.Length > maxFileSize)
            return BadRequest(new { message = "File size must not exceed 5 MB." });

        string extension = Path.GetExtension(file.FileName).ToLowerInvariant();

        string[] allowedExtensions = { ".jpg", ".jpeg", ".png", ".webp" };

        if (!allowedExtensions.Contains(extension))
            return BadRequest(new
            {
                message = "Only JPG, JPEG, PNG, and WEBP images are allowed."
            });

        string contentType = file.ContentType?.ToLowerInvariant() ?? "";

        string[] allowedContentTypes =
        {
            "image/jpeg",
            "image/png",
            "image/webp"
        };

        if (!allowedContentTypes.Contains(contentType))
            return BadRequest(new { message = "Invalid image content type." });

        if (!int.TryParse(
            User.FindFirst(ClaimTypes.NameIdentifier)?.Value,
            out int adviserId))
        {
            return Unauthorized(new { message = "Invalid adviser account." });
        }

        await using var conn = _db.GetConnection();
        await conn.OpenAsync();

        const string paymentSql = @"
            SELECT payment_method, verification_status
            FROM membership_payments
            WHERE payment_id = @paymentId
            LIMIT 1";

        string method;
        string status;

        await using (var cmd = new MySqlCommand(paymentSql, conn))
        {
            cmd.Parameters.AddWithValue("@paymentId", paymentId);

            await using var reader = await cmd.ExecuteReaderAsync();

            if (!await reader.ReadAsync())
                return NotFound(new { message = "Payment not found." });

            method = Convert.ToString(reader["payment_method"]) ?? "";
            status = Convert.ToString(reader["verification_status"]) ?? "";
        }

        if (!string.Equals(method, "GCash", StringComparison.OrdinalIgnoreCase))
            return BadRequest(new
            {
                message = "Proof upload is only for GCash payments."
            });

        if (!string.Equals(status, "Pending", StringComparison.OrdinalIgnoreCase))
            return Conflict(new
            {
                message = "Proof can only be uploaded for pending GCash payments."
            });

        string uploadFolder = Path.Combine(
            Directory.GetCurrentDirectory(),
            "Uploads",
            "PaymentProofs");

        Directory.CreateDirectory(uploadFolder);

        string storedFileName = $"{Guid.NewGuid():N}{extension}";
        string fullPath = Path.Combine(uploadFolder, storedFileName);

        string relativePath = Path.Combine(
            "Uploads",
            "PaymentProofs",
            storedFileName);

        try
        {
            await using (var stream = new FileStream(
                fullPath,
                FileMode.CreateNew,
                FileAccess.Write,
                FileShare.None))
            {
                await file.CopyToAsync(stream);
            }

            const string insertSql = @"
                INSERT INTO payment_attachments
                (
                    payment_id,
                    file_name,
                    file_path,
                    file_type,
                    file_size,
                    uploaded_by
                )
                VALUES
                (
                    @paymentId,
                    @fileName,
                    @filePath,
                    @fileType,
                    @fileSize,
                    @uploadedBy
                );

                SELECT LAST_INSERT_ID();";

            await using var insertCmd = new MySqlCommand(insertSql, conn);

            insertCmd.Parameters.AddWithValue("@paymentId", paymentId);
            insertCmd.Parameters.AddWithValue(
                "@fileName", Path.GetFileName(file.FileName));
            insertCmd.Parameters.AddWithValue("@filePath", relativePath);
            insertCmd.Parameters.AddWithValue("@fileType", contentType);
            insertCmd.Parameters.AddWithValue("@fileSize", file.Length);
            insertCmd.Parameters.AddWithValue("@uploadedBy", adviserId);

            int attachmentId = Convert.ToInt32(
                await insertCmd.ExecuteScalarAsync());

            return Ok(new
            {
                message = "GCash payment proof uploaded successfully.",
                attachment_id = attachmentId,
                payment_id = paymentId,
                file_name = Path.GetFileName(file.FileName),
                file_size = file.Length,
                uploaded_by = adviserId
            });
        }
        catch
        {
            if (System.IO.File.Exists(fullPath))
                System.IO.File.Delete(fullPath);

            throw;
        }
    }

    // ==========================================
    // GET: api/membership-fees/attachments/{attachmentId}/file
    // View or download a payment proof image
    // ==========================================
    [HttpGet("attachments/{attachmentId:int}/file")]
    public async Task<IActionResult> GetPaymentProof(int attachmentId)
    {
        if (attachmentId <= 0)
            return BadRequest(new { message = "Invalid attachment ID." });

        await using var conn = _db.GetConnection();
        await conn.OpenAsync();

        const string sql = @"
            SELECT file_name, file_path, file_type
            FROM payment_attachments
            WHERE attachment_id = @attachmentId
            LIMIT 1";

        string fileName;
        string relativePath;
        string contentType;

        await using (var cmd = new MySqlCommand(sql, conn))
        {
            cmd.Parameters.AddWithValue("@attachmentId", attachmentId);

            await using var reader = await cmd.ExecuteReaderAsync();

            if (!await reader.ReadAsync())
                return NotFound(new { message = "Payment proof not found." });

            fileName = Convert.ToString(reader["file_name"]) ?? "payment-proof";
            relativePath = Convert.ToString(reader["file_path"]) ?? "";
            contentType = Convert.ToString(reader["file_type"]) ?? "application/octet-stream";
        }

        string uploadRoot = Path.GetFullPath(
            Path.Combine(
                Directory.GetCurrentDirectory(),
                "Uploads",
                "PaymentProofs"));

        string fullPath = Path.GetFullPath(
            Path.Combine(Directory.GetCurrentDirectory(), relativePath));

        string expectedPrefix = uploadRoot + Path.DirectorySeparatorChar;

        if (!fullPath.StartsWith(
            expectedPrefix,
            StringComparison.OrdinalIgnoreCase))
        {
            return BadRequest(new { message = "Invalid file path." });
        }

        if (!System.IO.File.Exists(fullPath))
            return NotFound(new { message = "Payment proof file is missing." });

        return PhysicalFile(fullPath, contentType, fileName);
    }


    // ==========================================
    // GET: api/membership-fees/payments/pending-verification
    // List pending GCash payments with uploaded proof
    // ==========================================
    [HttpGet("payments/pending-verification")]
    public async Task<IActionResult> GetPendingPaymentsForVerification()
    {
        await using var conn = _db.GetConnection();
        await conn.OpenAsync();

        const string sql = @"
            SELECT
                p.payment_id,
                p.fee_id,
                p.member_id,
                m.full_name,
                p.amount_paid,
                p.payment_method,
                p.reference_number,
                p.payment_date,
                p.verification_status,
                p.remarks,
                p.received_by,
                p.created_at,
                a.attachment_id,
                a.file_name,
                a.file_path,
                a.file_type,
                a.file_size,
                a.uploaded_at
            FROM membership_payments p
            INNER JOIN members m
                ON p.member_id = m.id
            LEFT JOIN payment_attachments a
                ON p.payment_id = a.payment_id
            WHERE p.payment_method = 'GCash'
              AND p.verification_status = 'Pending'
            ORDER BY p.created_at DESC, p.payment_id DESC, a.attachment_id DESC";

        await using var cmd = new MySqlCommand(sql, conn);
        await using var reader = await cmd.ExecuteReaderAsync();

        var payments = new Dictionary<int, dynamic>();

        while (await reader.ReadAsync())
        {
            int paymentId = Convert.ToInt32(reader["payment_id"]);

            if (!payments.ContainsKey(paymentId))
            {
                payments[paymentId] = new
                {
                    payment_id = paymentId,
                    fee_id = Convert.ToInt32(reader["fee_id"]),
                    member_id = Convert.ToInt32(reader["member_id"]),
                    student_name = Convert.ToString(reader["full_name"]),
                    amount_paid = Convert.ToDecimal(reader["amount_paid"]),
                    payment_method = Convert.ToString(reader["payment_method"]),
                    reference_number = reader["reference_number"] == DBNull.Value
                        ? null
                        : Convert.ToString(reader["reference_number"]),
                    payment_date = Convert.ToDateTime(reader["payment_date"])
                        .ToString("yyyy-MM-dd"),
                    verification_status = Convert.ToString(reader["verification_status"]),
                    remarks = reader["remarks"] == DBNull.Value
                        ? null
                        : Convert.ToString(reader["remarks"]),
                    received_by = reader["received_by"] == DBNull.Value
                        ? (int?)null
                        : Convert.ToInt32(reader["received_by"]),
                    created_at = reader["created_at"] == DBNull.Value
                        ? (DateTime?)null
                        : Convert.ToDateTime(reader["created_at"]),
                    attachments = new List<object>()
                };
            }

            if (reader["attachment_id"] != DBNull.Value)
            {
                var payment = payments[paymentId];
                payment.attachments.Add(new
                {
                    attachment_id = Convert.ToInt32(reader["attachment_id"]),
                    file_name = Convert.ToString(reader["file_name"]),
                    file_type = Convert.ToString(reader["file_type"]),
                    file_size = Convert.ToInt64(reader["file_size"]),
                    uploaded_at = reader["uploaded_at"] == DBNull.Value
                        ? (DateTime?)null
                        : Convert.ToDateTime(reader["uploaded_at"]),
                    view_url = $"/api/membership-fees/attachments/{Convert.ToInt32(reader["attachment_id"])}/file"
                });
            }
        }

        return Ok(payments.Values);
    }

    // ==========================================
    // GET: api/membership-fees/payments/history
    // Payment history with receipt and uploaded proof
    // Optional filters: feeId, memberId, status
    // ==========================================
    [HttpGet("payments/history")]
    public async Task<IActionResult> GetPaymentHistory(
        [FromQuery] int? feeId,
        [FromQuery] int? memberId,
        [FromQuery] string? status)
    {
        if (feeId.HasValue && feeId.Value <= 0)
            return BadRequest(new { message = "Invalid fee ID." });

        if (memberId.HasValue && memberId.Value <= 0)
            return BadRequest(new { message = "Invalid member ID." });

        string? normalizedStatus = string.IsNullOrWhiteSpace(status)
            ? null
            : status.Trim();

        if (normalizedStatus != null &&
            !new[] { "Pending", "Verified", "Rejected" }
                .Contains(normalizedStatus, StringComparer.OrdinalIgnoreCase))
        {
            return BadRequest(new { message = "Invalid status. Use Pending, Verified, or Rejected." });
        }

        await using var conn = _db.GetConnection();
        await conn.OpenAsync();

        const string sql = @"
            SELECT
                p.payment_id, p.fee_id, f.academic_year, f.semester,
                p.member_id, m.full_name, p.amount_paid, p.payment_method,
                p.reference_number, p.payment_date, p.verification_status,
                p.received_by, p.verified_by, p.verified_at, p.remarks, p.created_at,
                r.receipt_id, r.receipt_number, r.issued_at,
                a.attachment_id, a.file_name, a.file_type, a.file_size, a.uploaded_at
            FROM membership_payments p
            INNER JOIN membership_fees f ON p.fee_id = f.fee_id
            INNER JOIN members m ON p.member_id = m.id
            LEFT JOIN payment_receipts r ON p.payment_id = r.payment_id
            LEFT JOIN payment_attachments a ON p.payment_id = a.payment_id
            WHERE (@feeId IS NULL OR p.fee_id = @feeId)
              AND (@memberId IS NULL OR p.member_id = @memberId)
              AND (@status IS NULL OR p.verification_status = @status)
            ORDER BY p.payment_date DESC, p.payment_id DESC, a.attachment_id DESC";

        await using var cmd = new MySqlCommand(sql, conn);
        cmd.Parameters.AddWithValue("@feeId", feeId.HasValue ? feeId.Value : DBNull.Value);
        cmd.Parameters.AddWithValue("@memberId", memberId.HasValue ? memberId.Value : DBNull.Value);
        cmd.Parameters.AddWithValue("@status", normalizedStatus == null ? DBNull.Value : normalizedStatus);

        await using var reader = await cmd.ExecuteReaderAsync();
        var results = new Dictionary<int, Dictionary<string, object?>>();

        while (await reader.ReadAsync())
        {
            int paymentId = Convert.ToInt32(reader["payment_id"]);

            if (!results.ContainsKey(paymentId))
            {
                results[paymentId] = new Dictionary<string, object?>
                {
                    ["payment_id"] = paymentId,
                    ["fee_id"] = Convert.ToInt32(reader["fee_id"]),
                    ["academic_year"] = Convert.ToString(reader["academic_year"]),
                    ["semester"] = Convert.ToString(reader["semester"]),
                    ["member_id"] = Convert.ToInt32(reader["member_id"]),
                    ["student_name"] = Convert.ToString(reader["full_name"]),
                    ["amount_paid"] = Convert.ToDecimal(reader["amount_paid"]),
                    ["payment_method"] = Convert.ToString(reader["payment_method"]),
                    ["reference_number"] = reader["reference_number"] == DBNull.Value ? null : Convert.ToString(reader["reference_number"]),
                    ["payment_date"] = Convert.ToDateTime(reader["payment_date"]).ToString("yyyy-MM-dd"),
                    ["verification_status"] = Convert.ToString(reader["verification_status"]),
                    ["received_by"] = reader["received_by"] == DBNull.Value ? null : Convert.ToInt32(reader["received_by"]),
                    ["verified_by"] = reader["verified_by"] == DBNull.Value ? null : Convert.ToInt32(reader["verified_by"]),
                    ["verified_at"] = reader["verified_at"] == DBNull.Value ? null : Convert.ToDateTime(reader["verified_at"]),
                    ["remarks"] = reader["remarks"] == DBNull.Value ? null : Convert.ToString(reader["remarks"]),
                    ["created_at"] = reader["created_at"] == DBNull.Value ? null : Convert.ToDateTime(reader["created_at"]),
                    ["receipt"] = reader["receipt_id"] == DBNull.Value ? null : new
                    {
                        receipt_id = Convert.ToInt32(reader["receipt_id"]),
                        receipt_number = Convert.ToString(reader["receipt_number"]),
                        issued_at = reader["issued_at"] == DBNull.Value ? (DateTime?)null : Convert.ToDateTime(reader["issued_at"])
                    },
                    ["attachments"] = new List<object>()
                };
            }

            if (reader["attachment_id"] != DBNull.Value)
            {
                var attachments = (List<object>)results[paymentId]["attachments"]!;
                int attachmentId = Convert.ToInt32(reader["attachment_id"]);

                attachments.Add(new
                {
                    attachment_id = attachmentId,
                    file_name = Convert.ToString(reader["file_name"]),
                    file_type = Convert.ToString(reader["file_type"]),
                    file_size = Convert.ToInt64(reader["file_size"]),
                    uploaded_at = reader["uploaded_at"] == DBNull.Value ? (DateTime?)null : Convert.ToDateTime(reader["uploaded_at"]),
                    view_url = $"/api/membership-fees/attachments/{attachmentId}/file"
                });
            }
        }

        return Ok(results.Values);
    }

    // ==========================================
    // GET: api/membership-fees/{feeId}/collection-summary
    // Membership fee collection and student payment summary
    // ==========================================
    [HttpGet("{feeId:int}/collection-summary")]
    public async Task<IActionResult> GetCollectionSummary(int feeId)
    {
        if (feeId <= 0)
            return BadRequest(new { message = "Invalid membership fee ID." });

        await using var conn = _db.GetConnection();
        await conn.OpenAsync();

        const string feeSql = @"
            SELECT fee_id, academic_year, semester, required_amount, status
            FROM membership_fees
            WHERE fee_id = @feeId
            LIMIT 1";

        decimal requiredAmount;
        string academicYear;
        string semester;
        string feeStatus;

        await using (var feeCmd = new MySqlCommand(feeSql, conn))
        {
            feeCmd.Parameters.AddWithValue("@feeId", feeId);

            await using var reader = await feeCmd.ExecuteReaderAsync();

            if (!await reader.ReadAsync())
                return NotFound(new { message = "Membership fee configuration not found." });

            requiredAmount = Convert.ToDecimal(reader["required_amount"]);
            academicYear = Convert.ToString(reader["academic_year"]) ?? "";
            semester = Convert.ToString(reader["semester"]) ?? "";
            feeStatus = Convert.ToString(reader["status"]) ?? "";
        }

        const string summarySql = @"
            SELECT
                COUNT(*) AS total_members,

                COALESCE(SUM(
                    CASE WHEN COALESCE(paid.total_paid, 0) >= @requiredAmount
                         THEN 1 ELSE 0 END
                ), 0) AS fully_paid,

                COALESCE(SUM(
                    CASE WHEN COALESCE(paid.total_paid, 0) > 0
                               AND COALESCE(paid.total_paid, 0) < @requiredAmount
                         THEN 1 ELSE 0 END
                ), 0) AS partially_paid,

                COALESCE(SUM(
                    CASE WHEN COALESCE(paid.total_paid, 0) <= 0
                         THEN 1 ELSE 0 END
                ), 0) AS unpaid,

                COALESCE(SUM(COALESCE(paid.total_paid, 0)), 0) AS total_collected

            FROM members m

            LEFT JOIN
            (
                SELECT member_id, SUM(amount_paid) AS total_paid
                FROM membership_payments
                WHERE fee_id = @feeId
                  AND verification_status = 'Verified'
                GROUP BY member_id
            ) paid ON paid.member_id = m.id";

        int totalMembers;
        int fullyPaid;
        int partiallyPaid;
        int unpaid;
        decimal totalCollected;

        await using (var summaryCmd = new MySqlCommand(summarySql, conn))
        {
            summaryCmd.Parameters.AddWithValue("@feeId", feeId);
            summaryCmd.Parameters.AddWithValue("@requiredAmount", requiredAmount);

            await using var reader = await summaryCmd.ExecuteReaderAsync();

            if (!await reader.ReadAsync())
                return StatusCode(500, new { message = "Unable to generate collection summary." });

            totalMembers = Convert.ToInt32(reader["total_members"]);
            fullyPaid = Convert.ToInt32(reader["fully_paid"]);
            partiallyPaid = Convert.ToInt32(reader["partially_paid"]);
            unpaid = Convert.ToInt32(reader["unpaid"]);
            totalCollected = Convert.ToDecimal(reader["total_collected"]);
        }

        const string pendingSql = @"
            SELECT
                COUNT(*) AS pending_transactions,
                COALESCE(SUM(amount_paid), 0) AS pending_amount
            FROM membership_payments
            WHERE fee_id = @feeId
              AND verification_status = 'Pending'";

        int pendingTransactions;
        decimal pendingAmount;

        await using (var pendingCmd = new MySqlCommand(pendingSql, conn))
        {
            pendingCmd.Parameters.AddWithValue("@feeId", feeId);

            await using var reader = await pendingCmd.ExecuteReaderAsync();
            await reader.ReadAsync();

            pendingTransactions = Convert.ToInt32(reader["pending_transactions"]);
            pendingAmount = Convert.ToDecimal(reader["pending_amount"]);
        }

        decimal expectedCollection = totalMembers * requiredAmount;
        decimal remainingCollection = Math.Max(0, expectedCollection - totalCollected);

        return Ok(new
        {
            fee_id = feeId,
            academic_year = academicYear,
            semester = semester,
            fee_status = feeStatus,
            required_amount_per_member = requiredAmount,

            students = new
            {
                total_members = totalMembers,
                fully_paid = fullyPaid,
                partially_paid = partiallyPaid,
                unpaid = unpaid
            },

            collection = new
            {
                expected_collection = expectedCollection,
                total_collected = totalCollected,
                remaining_collection = remainingCollection,
                collection_percentage = expectedCollection > 0
                    ? Math.Round((totalCollected / expectedCollection) * 100, 2)
                    : 0
            },

            pending_gcash = new
            {
                pending_transactions = pendingTransactions,
                pending_amount = pendingAmount
            }
        });
    }

    // ==========================================
    // GET: api/membership-fees/{feeId}/student-status
    // List each member's verified payment total and balance
    // Optional filter: status=Unpaid|Partially Paid|Fully Paid
    // ==========================================
    [HttpGet("{feeId:int}/student-status")]
    public async Task<IActionResult> GetStudentPaymentStatuses(
        int feeId,
        [FromQuery] string? status)
    {
        if (feeId <= 0)
            return BadRequest(new { message = "Invalid membership fee ID." });

        string? normalizedStatus = string.IsNullOrWhiteSpace(status)
            ? null
            : status.Trim();

        if (normalizedStatus != null &&
            !new[] { "Unpaid", "Partially Paid", "Fully Paid" }
                .Contains(normalizedStatus, StringComparer.OrdinalIgnoreCase))
        {
            return BadRequest(new
            {
                message = "Invalid status. Use Unpaid, Partially Paid, or Fully Paid."
            });
        }

        await using var conn = _db.GetConnection();
        await conn.OpenAsync();

        const string sql = @"
            SELECT
                f.fee_id,
                f.academic_year,
                f.semester,
                f.required_amount,
                m.id AS member_id,
                m.full_name,
                COALESCE(paid.total_paid, 0) AS total_paid
            FROM membership_fees f
            CROSS JOIN members m
            LEFT JOIN
            (
                SELECT
                    member_id,
                    SUM(amount_paid) AS total_paid
                FROM membership_payments
                WHERE fee_id = @feeId
                  AND verification_status = 'Verified'
                GROUP BY member_id
            ) paid ON paid.member_id = m.id
            WHERE f.fee_id = @feeId
            ORDER BY m.full_name ASC";

        await using var cmd = new MySqlCommand(sql, conn);
        cmd.Parameters.AddWithValue("@feeId", feeId);

        await using var reader = await cmd.ExecuteReaderAsync();

        var students = new List<object>();
        bool feeFound = false;

        while (await reader.ReadAsync())
        {
            feeFound = true;

            decimal requiredAmount = Convert.ToDecimal(reader["required_amount"]);
            decimal totalPaid = Convert.ToDecimal(reader["total_paid"]);
            decimal balance = Math.Max(0, requiredAmount - totalPaid);

            string paymentStatus = totalPaid >= requiredAmount
                ? "Fully Paid"
                : totalPaid > 0
                    ? "Partially Paid"
                    : "Unpaid";

            if (normalizedStatus != null &&
                !string.Equals(paymentStatus, normalizedStatus, StringComparison.OrdinalIgnoreCase))
            {
                continue;
            }

            students.Add(new
            {
                fee_id = Convert.ToInt32(reader["fee_id"]),
                academic_year = Convert.ToString(reader["academic_year"]),
                semester = Convert.ToString(reader["semester"]),
                member_id = Convert.ToInt32(reader["member_id"]),
                student_name = Convert.ToString(reader["full_name"]),
                required_amount = requiredAmount,
                total_paid = totalPaid,
                balance = balance,
                payment_status = paymentStatus
            });
        }

        if (!feeFound)
            return NotFound(new { message = "Membership fee configuration not found." });

        return Ok(new
        {
            fee_id = feeId,
            status_filter = normalizedStatus,
            total_students = students.Count,
            students = students
        });
    }

    // ==========================================
    // Helper: Create or retrieve a payment receipt
    // ==========================================
    private static async Task<string> CreateReceiptIfNotExistsAsync(
        MySqlConnection conn,
        MySqlTransaction transaction,
        int paymentId,
        decimal amountPaid,
        int adviserId)
    {
        const string existingReceiptSql = @"
            SELECT receipt_number
            FROM payment_receipts
            WHERE payment_id = @paymentId
            LIMIT 1";

        await using (var receiptCheckCmd =
            new MySqlCommand(existingReceiptSql, conn, transaction))
        {
            receiptCheckCmd.Parameters.AddWithValue("@paymentId", paymentId);

            object? existingReceipt =
                await receiptCheckCmd.ExecuteScalarAsync();

            if (existingReceipt != null && existingReceipt != DBNull.Value)
            {
                return Convert.ToString(existingReceipt)!;
            }
        }

        string receiptNumber = $"CSS-MF-{paymentId:D6}";

        const string insertReceiptSql = @"
            INSERT INTO payment_receipts
                (payment_id, receipt_number, amount, issued_by)
            VALUES
                (@paymentId, @receiptNumber, @amountPaid, @adviserId)";

        await using var receiptCmd =
            new MySqlCommand(insertReceiptSql, conn, transaction);

        receiptCmd.Parameters.AddWithValue("@paymentId", paymentId);
        receiptCmd.Parameters.AddWithValue("@receiptNumber", receiptNumber);
        receiptCmd.Parameters.AddWithValue("@amountPaid", amountPaid);
        receiptCmd.Parameters.AddWithValue("@adviserId", adviserId);

        await receiptCmd.ExecuteNonQueryAsync();

        return receiptNumber;
    }
}
