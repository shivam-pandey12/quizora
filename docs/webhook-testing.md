# Webhook Testing

Configure the Razorpay dashboard webhook endpoint:

```text
https://YOUR_DOMAIN/api/billing/razorpay-webhook
```

Enable:

- `order.paid`
- `payment.captured`
- `payment.failed`
- `refund.processed`

Set `RAZORPAY_WEBHOOK_SECRET` to the dashboard secret. Do not commit the value.

Testing steps:

1. Create a test order from `/pricing`.
2. Complete checkout in Razorpay test mode.
3. Confirm `/billing` shows active access.
4. Confirm `webhookEvents` receives the event.
5. Re-deliver the same webhook and confirm no duplicate entitlement extension.
6. Check `payments.webhookConfirmed`.

If signature validation fails, verify the handler reads `request.text()` before parsing JSON.
