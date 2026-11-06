// Shared types for the PL-300 practice questions.

export type Domain = 'prepare' | 'model' | 'visualize' | 'manage';

export const DOMAINS: { id: Domain; title: string; weight: string }[] = [
  { id: 'prepare', title: 'Prepare the data', weight: '25–30%' },
  { id: 'model', title: 'Model the data', weight: '25–30%' },
  { id: 'visualize', title: 'Visualize and analyze the data', weight: '25–30%' },
  { id: 'manage', title: 'Manage and secure Power BI', weight: '15–20%' },
];

export interface Question {
  id: string;
  domain: Domain;
  prompt: string;
  options: string[];
  /** Indexes of the correct options. More than one means "choose all that apply". */
  correct: number[];
  explanation: string;
  /** Set when the question belongs to a case study. */
  caseId?: string;
}

export const q = (id: string, domain: Domain, prompt: string, options: string[], correct: number[], explanation: string): Question => ({ id, domain, prompt, options, correct, explanation });


/** A short company scenario followed by several questions, like the case studies in the real exam. */
export interface CaseStudy {
  id: string;
  title: string;
  /** The scenario, one paragraph per item. */
  scenario: string[];
}

/** A question that belongs to a case study. */
export const cq = (caseId: string, id: string, domain: Domain, prompt: string, options: string[], correct: number[], explanation: string): Question => ({
  id,
  domain,
  prompt,
  options,
  correct,
  explanation,
  caseId,
});
