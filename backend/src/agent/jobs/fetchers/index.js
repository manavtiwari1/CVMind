import { fetchGreenhouseJob } from './greenhouse.js';
import { fetchLeverJob } from './lever.js';
import { fetchGenericJob } from './generic.js';

// Each returns { title, company, location, descriptionText, applyUrl, atsQuestions, workMode?, salary? }
export const defaultFetchers = {
  greenhouse: fetchGreenhouseJob,
  lever: fetchLeverJob,
  generic: fetchGenericJob
};
