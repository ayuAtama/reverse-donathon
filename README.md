# Donation Countdown Timer

A real-time donation countdown timer for Indonesian live-streamers. When viewers donate via [Saweria](https://saweria.co), the countdown ticks down. When it hits zero, confetti and a celebration sound fire off on stream.

Built to be used as an **OBS Browser Source** overlay or as a standalone countdown page.

---

## How It Works

1. **Saweria sends a webhook** to `/api/webhook` every time a donation comes in.
2. The server calculates how many seconds to subtract based on the donation amount and your configured rate (e.g. Rp 1,000 per 9 minutes).
3. The countdown target datetime is reduced accordingly and saved to a local JSON file.
4. The countdown page and OBS overlay poll the `/api/countdown` endpoint every second and display the updated timer.
5. When a donation arrives, a **blinking effect** shows the donor name, amount, and time reduction for 10 seconds.
6. If a donation is large enough to overshoot the remaining time, the timer **immediately hits zero**.
7. When the timer reaches zero, **confetti bursts** and a **celebration fanfare** play on both the countdown page and the OBS overlay.

---

## Pages

| Route | Description |
| --- | --- |
| `/` | Home -- navigation links to all pages |
| `/countdown` | Full countdown page with timer, progress bar, stats, and celebration effects |
| `/overlay` | Transparent OBS Browser Source overlay with large mono timer and effects |
| `/admin` | Password-protected admin panel to update target datetime, rate, and time unit |

---

## API Endpoints

| Method | Route | Description |
| --- | --- | --- |
| `POST` `GET` `PUT` `PATCH` `DELETE` | `/api/webhook` | Receives Saweria webhook payloads and reduces the countdown |
| `GET` | `/api/countdown` | Returns current countdown state (remaining seconds, formatted time, percentage, last donation) |
| `GET` | `/api/admin` | Returns current admin state (requires Bearer token) |
| `PATCH` | `/api/admin` | Updates target datetime, rpPerUnit, or secondsPerUnit (requires Bearer token) |
| `POST` | `/api/admin/login` | Validates admin password and returns a session token |

---

## Environment Variables

| Variable | Description | Example |
| --- | --- | --- |
| `INITIAL_TARGET_DATETIME` | The starting countdown target in ISO 8601 format | `2026-02-28T15:00:00+07:00` |
| `RP_PER_UNIT` | Rupiah amount per time unit | `1000` |
| `SECONDS_PER_UNIT` | How many seconds each unit represents | `540` (9 minutes) |
| `ADMIN_PASSWORD` | Password to access the admin panel | `your-secret-password` |

### Configuring the Rate

The rate is defined by two values working together:

- **`RP_PER_UNIT`** -- the donation amount threshold per unit (e.g. `1000` means Rp 1,000)
- **`SECONDS_PER_UNIT`** -- how many seconds each unit subtracts (e.g. `540` = 9 minutes)

This gives you full flexibility:

| RP_PER_UNIT | SECONDS_PER_UNIT | Effective Rate |
| --- | --- | --- |
| `1000` | `540` | Rp 1,000 per 9 minutes |
| `1000` | `60` | Rp 1,000 per 1 minute |
| `5000` | `300` | Rp 5,000 per 5 minutes |
| `1000` | `1` | Rp 1,000 per 1 second |
| `1000` | `90` | Rp 1,000 per 1 minute 30 seconds |

---

## Setup

### 1. Install dependencies

```bash
pnpm install
```

### 2. Set environment variables

Copy the example env file and fill in your values:

```bash
cp .env.example .env.local
```

Then edit `.env.local` with your actual configuration. See `.env.example` for descriptions of each variable.

### 3. Run the dev server

```bash
pnpm dev
```

### 4. Configure Saweria webhook

In your Saweria dashboard, set the webhook URL to:

```
https://your-domain.com/api/webhook
```

Saweria will send donation alerts to this endpoint automatically.

### 5. Add OBS Browser Source

In OBS Studio:

1. Add a new **Browser Source**
2. Set the URL to `https://your-domain.com/overlay`
3. Set width/height to match your stream canvas (e.g. 1920x1080)
4. The background is transparent -- the timer will float over your stream content

For a minimal version with just the timer, use `https://your-domain.com/overlay?minimal=true`.

---

## Testing with cURL

Send a test donation webhook:

```bash
curl -X POST http://localhost:3000/api/webhook \
  -H "Content-Type: application/json" \
  -d '{
    "id": "test-001",
    "type": "alert",
    "message": "Test donation",
    "amount": 5000,
    "hasRecording": false,
    "gifUrl": "",
    "pollingTitle": null,
    "pollingOptionId": null,
    "pollingOptionTitle": null,
    "soundboardName": null,
    "soundboardSoundId": null,
    "gifterId": null,
    "gifterName": "Tester",
    "gifterEmail": "test@test.com",
    "creatorId": "creator1",
    "creatorUsername": "streamer",
    "creatorName": "Streamer",
    "mediaType": null,
    "mediaId": null,
    "mediaStartTime": null,
    "createdAt": "2026-02-20T10:00:00Z",
    "updatedAt": "2026-02-20T10:00:00Z",
    "expiredAt": "2026-02-21T10:00:00Z"
  }'
```

---

## Tech Stack

- **Next.js 16** (App Router)
- **React 19**
- **Tailwind CSS 4**
- **shadcn/ui** components
- **canvas-confetti** for celebration effects
- **File-based state** with atomic writes and mutex locking

---

## Disclaimer

This application was **vibe coded** -- built rapidly with AI assistance (v0 by Vercel) through conversational prompting rather than traditional software engineering. It works, it's fun, but it was not architected through careful upfront design. Use at your own risk, and feel free to improve it.

---

## License

MIT
