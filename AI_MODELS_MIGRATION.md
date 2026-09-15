# AI Models Migration Guide

## Overview
This document describes the migration of AI models in the Digital Menu application to use the latest Groq models: `qwen/qwen3.8-27b` for vision tasks and `openai/gpt-oss-120b` for text generation.

## Changes Made

### 1. Vision Model Update (Menu Extraction)
**File**: `app/api/extract-menu/route.ts`

**Previous Model**: `qwen/qwen3.6-27b`  
**New Model**: `qwen/qwen3.8-27b`

**Purpose**: Extracts menu items from uploaded restaurant menu images, including:
- Item names
- Categories
- Pricing (supports multiple tiers: full, half, quarter, piece, sizes)
- Descriptions

**Provider**: Groq API  
**Configuration**: Uses `GROQ_API_KEY` environment variable

**Model Specifications**:
- Context Window: 131K tokens
- Image Support: Up to 3 images per request
- Image Size Limit: 20MB maximum
- Image Tokens: 2048 tokens per image
- Supports thinking and instruct modes
- Tunable reasoning effort
- Tool use and JSON mode support

### 2. Text Model Update (Description Generation)
**File**: `app/api/generate-description/route.ts`

**Previous Model**: `llama-3.3-70b-versatile`  
**New Model**: `openai/gpt-oss-120b`

**Purpose**: Generates appetizing one-line descriptions for menu items based on their name and category.

**Provider**: Groq API (not OpenAI directly)  
**Configuration**: Uses same `GROQ_API_KEY` environment variable

**Model Specifications**:
- Context Window: 200K tokens
- High-quality text generation
- Fast inference on Groq infrastructure
- Cost-effective for production use

### 4. Environment Variables

#### Single API Key Required
```env
GROQ_API_KEY=your_groq_api_key_here
```

Get your API key from: https://console.groq.com/keys

**Note**: Both models (vision and text) now use the same Groq API key, simplifying configuration.

### 5. Dependencies
No new dependencies required - the existing `groq-sdk` package handles both models.

## Setup Instructions

### For New Installations

1. **Install Dependencies**
   ```bash
   npm install
   ```

2. **Configure Environment Variables**
   - Copy `.env.local.example` to `.env.local`
   - Add your Groq API key (for both vision and text models)
   ```env
   GROQ_API_KEY=your_groq_api_key_here
   ```

3. **Run the Application**
   ```bash
   npm run dev
   ```

### For Existing Installations

1. **No New Dependencies Required**
   - The existing `groq-sdk` package works for both models

2. **Update Environment Variables**
   - Your existing `GROQ_API_KEY` will work for both models
   - No additional API keys needed

3. **Restart Your Development Server**
   ```bash
   npm run dev
   ```

## API Endpoints Affected

### `/api/extract-menu` (POST)
- **Purpose**: Extract menu items from an image
- **Model Used**: `qwen/qwen3.8-27b` via Groq
- **Input**: Base64-encoded image data URI
- **Output**: Array of menu items with name, category, pricing, description

### `/api/generate-description` (POST)
- **Purpose**: Generate description for a menu item
- **Model Used**: `openai/gpt-oss-120b` via Groq
- **Input**: Item name and category
- **Output**: Single-line appetizing description (max 15 words)

## Model Specifications

### Qwen3.8-27B (Vision)
- **Type**: Multimodal vision-language model
- **Parameters**: 27 billion
- **Context Window**: 131K tokens
- **Image Capacity**: Up to 3 images per request (20MB max each)
- **Image Tokens**: 2048 tokens per image
- **Strengths**: 
  - Excellent OCR capabilities
  - Structured data extraction from complex layouts
  - Thinking and instruct modes
  - Tool use support
  - JSON mode for structured output
  - Cost-effective for vision tasks
- **Token Optimization**: Images are automatically downscaled to ≤1024px to minimize token usage

### OpenAI GPT-OSS-120B (Text)
- **Type**: Large language model (text-only)
- **Parameters**: 120 billion
- **Context Window**: 200K tokens
- **Provider**: Available via Groq (not OpenAI directly)
- **Strengths**:
  - High-quality creative text generation
  - Consistent output format
  - Fast inference on Groq infrastructure
  - Cost-effective for text tasks

## Cost Considerations

### Groq Pricing
- Single API key for both models
- Free tier available for testing
- Pay-as-you-go pricing for production
- Competitive pricing compared to other providers
- Images are downscaled to reduce token costs

## Troubleshooting

### "GROQ_API_KEY environment variable is not set"
**Solution**: Ensure you've added `GROQ_API_KEY` to your `.env.local` file and restarted your dev server.

### "The model does not exist or you do not have access to it"
**Solution**: 
1. Verify your Groq API key is valid
2. Check that you have access to the models in your Groq account
3. Ensure you're using the correct model names: `qwen/qwen3.8-27b` and `openai/gpt-oss-120b`

### Build Errors
**Solution**: Run `npm install` to ensure all packages are properly installed.

### Description Generation Returns Errors
**Solution**: 
1. Verify your Groq API key is valid
2. Check that you have access to `openai/gpt-oss-120b` model
3. Ensure the `GROQ_API_KEY` is set correctly in `.env.local`

## Testing

### Test Vision Model (Menu Extraction)
1. Navigate to `/dashboard/menu`
2. Click "AI Import" button
3. Upload a menu image
4. Verify items are extracted correctly with `qwen/qwen3.8-27b`

### Test Text Model (Description Generation)
1. Navigate to `/dashboard/menu`
2. Click "Add Item" button
3. Enter item name and category
4. Click "Generate Description" button
5. Verify a description is generated using `openai/gpt-oss-120b`

## Rollback Instructions

If you need to revert to the previous setup:

1. **Update `app/api/extract-menu/route.ts`**
   - Change model from `qwen/qwen3.8-27b` back to `qwen/qwen3.6-27b`

2. **Update `app/api/generate-description/route.ts`**
   - Change model from `openai/gpt-oss-120b` to `llama-3.3-70b-versatile`

## Support

For issues or questions:
1. Check the Groq documentation: https://console.groq.com/docs
2. Review Vision model docs: https://console.groq.com/docs/vision
3. Review the API endpoint logs in your console

## Version History

- **v2.0.0** (Current) - Migrated to Qwen3.8-27B for vision, OpenAI GPT-OSS-120B for text (both via Groq)
- **v1.0.0** - Original implementation with Qwen3.6-27B and Llama-3.3-70B
