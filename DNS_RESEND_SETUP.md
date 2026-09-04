# Resend Production Custom Domain DNS Configuration Guide

Follow these steps to configure your custom production domain (e.g. `leadrescue.ai`) on Resend for transactional emails, team invitations, and password reset notifications.

---

## 1. Add Domain in Resend Dashboard

1. Log into your [Resend Account](https://resend.com/domains).
2. Click **Add Domain**.
3. Enter your domain: `leadrescue.ai` (or your registered production domain).
4. Select region: **US East (N. Virginia)** or your preferred region.
5. Click **Add**.

---

## 2. Configure DNS Records in Your Domain Provider (Cloudflare / Namecheap / GoDaddy)

Add the following 3 records provided by Resend to your domain's DNS management panel:

### A. MX Record (For Inbound & Mail Routing Verification)
| Type | Name / Host | Value / Target | Priority | TTL |
| :--- | :--- | :--- | :---: | :---: |
| **MX** | `bounces.leadrescue.ai` | `feedback-smtp.us-east-1.amazonses.com` | `10` | Auto / 3600 |

### B. TXT Record (SPF - Sender Policy Framework)
| Type | Name / Host | Value | TTL |
| :--- | :--- | :--- | :---: |
| **TXT** | `bounces.leadrescue.ai` | `v=spf1 include:amazonses.com ~all` | Auto / 3600 |

### C. CNAME Records (DKIM - DomainKeys Identified Mail)
| Type | Name / Host | Value / Target | TTL |
| :--- | :--- | :--- | :---: |
| **CNAME** | `resend._domainkey.leadrescue.ai` | `dkim.resend.com` | Auto / 3600 |

### D. TXT Record (DMARC Policy)
| Type | Name / Host | Value | TTL |
| :--- | :--- | :--- | :---: |
| **TXT** | `_dmarc.leadrescue.ai` | `v=DMARC1; p=none; rua=mailto:dmarc@leadrescue.ai` | Auto / 3600 |

---

## 3. Verify Domain

1. In Resend, click **Verify DNS Records**.
2. Status will change to **Verified** (typically within 1 to 5 minutes).

---

## 4. Set Environment Variables

Update `.env.local` / Production Environment Variables:

```env
RESEND_API_KEY=re_123456789_your_production_api_key
EMAIL_FROM="Lead Rescue AI <notifications@leadrescue.ai>"
APP_URL=https://app.leadrescue.ai
```

---

## 5. Verification Command

Run the test migration script or invite a team member via the Settings UI to confirm successful email delivery to any external recipient address!
