export const ANALYST_MODELS = [
  {
    id: 'onnx-community/Qwen2.5-0.5B-Instruct',
    label: 'Qwen 2.5 0.5B',
    note: 'Clearer answers. About 480 MB the first time.',
  },
  {
    id: 'onnx-community/SmolLM2-135M-Instruct-ONNX-MHA',
    label: 'SmolLM2 135M',
    note: 'Faster. About 120 MB the first time.',
  },
] as const;

export type AnalystModelId = (typeof ANALYST_MODELS)[number]['id'];

export const ANALYST_SYSTEM = 'Answer in three sentences using only the NASA notes. Name the experiment. Quote the percent in parentheses, not the count before the word of. Do not invent tests, gases, or numbers. If the notes do not answer the question, say what is missing.';
