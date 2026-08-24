# 05: AI Advisory Services & Gemini SDK Integration Contract

Type: grilling
Status: resolved
Blocked by: 01

## Question

How should the AI advisory capabilities (Story Doctor INVEST auditing, SPIDR vertical slicer, Divergence analyzer) be architected in the Hono backend using the official `@google/genai` (Gemini 2.5 / 3.0) TypeScript SDK with structured schema outputs and streaming support?

## Background & Context

- Scrum Pokr AI features 7 AI advisory capabilities that are advisory-only (AI never votes):
  1. INVEST audit scoring (0-100) & actionable improvements.
  2. 3-Axis Complexity summary (Data Models, External APIs, Blast Radius).
  3. 4-Category interactive edge-case checklist generation.
  4. SPIDR vertical slicing into bite-sized stories.
  5. 5-Category consensus classification & supportive divergence analysis.
  6. Point reference library matching & auto-seeding.
  7. Team estimation profile calibration.
- The official `@google/genai` TypeScript SDK offers first-class support for Gemini structured outputs via `responseSchema` (JSON schema / TypeBox / Zod) and streaming.
- We need to define the contract, prompt structure, and fallback error handling for these AI endpoints in Hono.

## Answer

### 1. `@google/genai` SDK Client & Model Architecture

The Hono AI service uses the official Google Gen AI TypeScript SDK (`@google/genai`) powered by `gemini-2.5-flash` for sub-second structured analysis:

```typescript
// server/src/ai/gemini-client.ts
import { GoogleGenAI } from '@google/genai';

export const gemini = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY || '',
});

export const ADVISORY_MODEL = 'gemini-2.5-flash';
```

### 2. Strict Schema-Enforced Advisory Contracts

Gemini's native `responseSchema` guarantees 100% structured JSON compliance:

#### A. Story Doctor (INVEST Score + 3-Axis Complexity + Edge Cases)
```typescript
// server/src/ai/story-doctor.ts
import { Type } from '@google/genai';
import { gemini, ADVISORY_MODEL } from './gemini-client';
import type { Story, StoryDoctorReport } from '@scrumpokr/shared';

export async function analyzeStoryWithStoryDoctor(story: Story): Promise<StoryDoctorReport> {
  const response = await gemini.models.generateContent({
    model: ADVISORY_MODEL,
    contents: `Analyze this user story for Scrum planning poker:\n\nTitle: ${story.title}\nDescription: ${story.description}\nAcceptance Criteria: ${story.acceptance_criteria.join('\n')}`,
    config: {
      responseMimeType: 'application/json',
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          investScore: { type: Type.INTEGER, description: 'Score from 0 to 100 based on INVEST guidelines' },
          summary: { type: Type.STRING, description: 'Executive quality summary' },
          complexity: {
            type: Type.OBJECT,
            properties: {
              dataModels: { type: Type.STRING, description: 'Data schema changes or migrations' },
              dependenciesApis: { type: Type.STRING, description: 'External API dependencies' },
              blastRadius: { type: Type.STRING, description: 'Impact on existing system components' },
            },
            required: ['dataModels', 'dependenciesApis', 'blastRadius'],
          },
          edgeCases: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                id: { type: Type.STRING },
                category: { type: Type.STRING, enum: ['NetworkTimeouts', 'EmptyBoundary', 'ConcurrencyRaces', 'PermissionsAccess'] },
                title: { type: Type.STRING },
                description: { type: Type.STRING },
                checked: { type: Type.BOOLEAN },
              },
              required: ['id', 'category', 'title', 'description', 'checked'],
            },
          },
        },
        required: ['investScore', 'summary', 'complexity', 'edgeCases'],
      },
    },
  });

  return JSON.parse(response.text!);
}
```

#### B. SPIDR Vertical Slicer
Transforms oversized stories (e.g. 13+ points) into independent vertical slices following the **SPIDR** framework (Spike, Path, Interface, Data, Rule):

```typescript
// server/src/ai/spidr-slicer.ts
export async function sliceStoryWithSPIDR(story: Story): Promise<{ slices: StorySlice[] }> {
  const response = await gemini.models.generateContent({
    model: ADVISORY_MODEL,
    contents: `Decompose this oversized story into 2-4 vertical slices following SPIDR:\n\n${JSON.stringify(story)}`,
    config: {
      responseMimeType: 'application/json',
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          slices: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                title: { type: Type.STRING },
                description: { type: Type.STRING },
                acceptanceCriteria: { type: Type.ARRAY, items: { type: Type.STRING } },
                spidrPattern: { type: Type.STRING, enum: ['Spike', 'Path', 'Interface', 'Data', 'Rule'] },
                suggestedPoints: { type: Type.STRING },
              },
              required: ['title', 'description', 'acceptanceCriteria', 'spidrPattern'],
            },
          },
        },
        required: ['slices'],
      },
    },
  });

  return JSON.parse(response.text!);
}
```

### 3. Reveal Gate Confinement & Error Fallbacks

1. **Reveal Gate Adherence**: Divergence analysis and SPIDR slicing are strictly gated behind the `Revealed` phase. The backend rejects AI divergence requests during `Voting` phase.
2. **Graceful Fallbacks**: If `GEMINI_API_KEY` is missing or quota is exhausted, the server returns an informative 200 payload with `fallback: true` and default heuristics, ensuring real-time poker gameplay never halts.

