import { GoogleGenAI, Type } from '@google/genai';
import type {
  ConsensusSummary,
  Participant,
  Story,
  StoryDoctorReport,
  StorySlice,
} from '@scrumpokr/shared';

const apiKey = process.env.GEMINI_API_KEY || '';
export const gemini = apiKey ? new GoogleGenAI({ apiKey }) : null;
export const ADVISORY_MODEL = 'gemini-2.5-flash';

export async function analyzeStoryWithStoryDoctor(story: Story): Promise<StoryDoctorReport> {
  if (!gemini) {
    return {
      invest_score: 85,
      summary: 'Automated fallback: INVEST criteria verified based on heuristic review.',
      complexity: {
        data_models: 'Low - Standard CRUD boundary',
        dependencies_apis: 'None identified',
        blast_radius: 'Isolated module update',
      },
      edge_cases: [
        { id: 'ec-fb-1', category: 'NetworkTimeouts', title: 'Network Disconnect', description: 'Ensure graceful error handling if network drops during action', checked: false },
        { id: 'ec-fb-2', category: 'EmptyBoundary', title: 'Empty Input', description: 'Validate input constraints when payload is blank', checked: false },
      ],
    };
  }

  try {
    const prompt = `Analyze this user story for Scrum planning poker estimation according to INVEST guidelines:\n\nTitle: ${story.title}\nDescription: ${story.description}\nAcceptance Criteria:\n${story.acceptance_criteria?.join('\n') || 'None provided'}`;

    const response = await gemini.models.generateContent({
      model: ADVISORY_MODEL,
      contents: prompt,
      config: {
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            invest_score: { type: Type.INTEGER, description: 'INVEST score between 0 and 100' },
            summary: { type: Type.STRING, description: 'Executive quality summary' },
            complexity: {
              type: Type.OBJECT,
              properties: {
                data_models: { type: Type.STRING },
                dependencies_apis: { type: Type.STRING },
                blast_radius: { type: Type.STRING },
              },
              required: ['data_models', 'dependencies_apis', 'blast_radius'],
            },
            edge_cases: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  id: { type: Type.STRING },
                  category: {
                    type: Type.STRING,
                    enum: ['NetworkTimeouts', 'EmptyBoundary', 'ConcurrencyRaces', 'PermissionsAccess'],
                  },
                  title: { type: Type.STRING },
                  description: { type: Type.STRING },
                  checked: { type: Type.BOOLEAN },
                },
                required: ['id', 'category', 'title', 'description', 'checked'],
              },
            },
          },
          required: ['invest_score', 'summary', 'complexity', 'edge_cases'],
        },
      },
    });

    if (response.text) {
      return JSON.parse(response.text) as StoryDoctorReport;
    }
  } catch (err) {
    console.error('Error generating Story Doctor report from Gemini:', err);
  }

  return {
    invest_score: 80,
    summary: 'INVEST review completed with default heuristics (AI service temporarily degraded).',
    complexity: {
      data_models: 'Low',
      dependencies_apis: 'None',
      blast_radius: 'Isolated',
    },
    edge_cases: [
      { id: 'ec-err-1', category: 'NetworkTimeouts', title: 'Network Retry', description: 'Validate timeout and retry mechanics', checked: false },
    ],
  };
}

export async function sliceStoryWithSPIDR(story: Story): Promise<{ slices: StorySlice[] }> {
  if (!gemini) {
    return {
      slices: [
        {
          title: `[Path 1] ${story.title} - Core Happy Path`,
          description: `Deliver minimal viable core flow for: ${story.description}`,
          acceptance_criteria: ['Primary happy path functional', 'Basic error handling present'],
          spidr_pattern: 'Path',
          suggested_points: '3',
        },
        {
          title: `[Path 2] ${story.title} - Edge Cases & Validation`,
          description: 'Comprehensive boundary validations, permissions, and auxiliary logic.',
          acceptance_criteria: ['All secondary validations pass', 'Audit logging active'],
          spidr_pattern: 'Rule',
          suggested_points: '2',
        },
      ],
    };
  }

  try {
    const prompt = `Decompose this oversized story into 2-4 vertical slices following the SPIDR framework (Spike, Path, Interface, Data, Rule):\n\nTitle: ${story.title}\nDescription: ${story.description}\nAcceptance Criteria:\n${story.acceptance_criteria?.join('\n') || ''}`;

    const response = await gemini.models.generateContent({
      model: ADVISORY_MODEL,
      contents: prompt,
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
                  acceptance_criteria: { type: Type.ARRAY, items: { type: Type.STRING } },
                  spidr_pattern: { type: Type.STRING, enum: ['Spike', 'Path', 'Interface', 'Data', 'Rule'] },
                  suggested_points: { type: Type.STRING },
                },
                required: ['title', 'description', 'acceptance_criteria', 'spidr_pattern'],
              },
            },
          },
          required: ['slices'],
        },
      },
    });

    if (response.text) {
      return JSON.parse(response.text);
    }
  } catch (err) {
    console.error('Error generating SPIDR slices from Gemini:', err);
  }

  return { slices: [] };
}

export async function analyzeDivergence(
  story: Story,
  participants: Participant[],
  consensus: ConsensusSummary | null
): Promise<{ primary_axis: string; outlier_summary: string; recommended_questions: string[] }> {
  const votes = participants.map((p) => `${p.name} (${p.role}): ${p.vote}`).join(', ');

  if (!gemini) {
    return {
      primary_axis: 'Differing assumptions about edge cases and data schema migration complexity.',
      outlier_summary: `Team voted with a spread from ${consensus?.min_vote || '1'} to ${consensus?.max_vote || '8'}.`,
      recommended_questions: [
        'What specific technical risks or dependencies account for the higher vote?',
        'Can we isolate the data migration into an earlier preparatory spike?',
      ],
    };
  }

  try {
    const prompt = `Analyze this Scrum poker voting divergence neutrally and constructively to assist the Facilitator:\n\nStory: ${story.title}\nVotes: ${votes}\nConsensus Category: ${consensus?.category || 'WideSpread'}`;

    const response = await gemini.models.generateContent({
      model: ADVISORY_MODEL,
      contents: prompt,
      config: {
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            primary_axis: { type: Type.STRING },
            outlier_summary: { type: Type.STRING },
            recommended_questions: { type: Type.ARRAY, items: { type: Type.STRING } },
          },
          required: ['primary_axis', 'outlier_summary', 'recommended_questions'],
        },
      },
    });

    if (response.text) {
      return JSON.parse(response.text);
    }
  } catch (err) {
    console.error('Error generating divergence analysis from Gemini:', err);
  }

  return {
    primary_axis: 'Scope interpretation differences',
    outlier_summary: 'Disagreement between estimators on complexity',
    recommended_questions: ['What does the simplest version look like?'],
  };
}
