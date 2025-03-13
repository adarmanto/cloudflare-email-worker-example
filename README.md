# CloudFlare Email Worker Example

This project is a Cloudflare Worker that processes emails and forwards them to a support center.

Medium post: [here](https://medium.com/@agungdarmanto/how-to-set-up-cloudflare-email-worker-e97b65210a23)

## Installation

1. Clone the repository:

   ```sh
   git clone https://github.com/adarmanto/cloudflare-email-worker-example.git
   cd cloudflare-email-worker-example
   ```

2. Install dependencies:
   ```sh
   npm install
   ```

## Setup

1. Configure your Cloudflare Worker by editing the `wrangler.jsonc` file with your Cloudflare account details.

2. Ensure you have the necessary environment variables set up in your Cloudflare Worker settings.

## Testing

Run the tests using Vitest:

```sh
npm run test
```

## Deployment

Deploy the Cloudflare Worker using Wrangler:

```sh
npm run deploy
```
