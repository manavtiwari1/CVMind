/** Colour band for a 0-10 answer score (the report passes its 0-100 score divided by 10). */
export const scoreTone = (score10: number) => (score10 >= 7.5 ? 'good' : score10 >= 5 ? 'ok' : 'low');
