This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## AI Models Configuration

This application uses Groq API for both vision and text AI tasks:

### Vision Model (Menu Extraction)
- **Provider**: Groq
- **Model**: `qwen/qwen3.8-27b`
- **Purpose**: Extracts menu items from uploaded images
- **API Endpoint**: `/app/api/extract-menu/route.ts`
- **Context Window**: 131K tokens
- **Image Support**: Up to 3 images per request, 20MB max size

### Text Model (Description Generation)
- **Provider**: Groq
- **Model**: `openai/gpt-oss-120b`
- **Purpose**: Generates appetizing descriptions for menu items
- **API Endpoint**: `/app/api/generate-description/route.ts`
- **Context Window**: 200K tokens

### Setup Instructions

1. Get a Groq API key from [console.groq.com](https://console.groq.com/keys)
2. Add the key to your `.env.local` file:
   ```env
   GROQ_API_KEY=your_groq_api_key_here
   ```

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
