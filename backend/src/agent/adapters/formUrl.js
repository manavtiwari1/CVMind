const isGreenhouseHost = (url) => {
  try {
    return /(^|\.)greenhouse\.io$/.test(new URL(url).hostname);
  } catch {
    return false;
  }
};

// The page the server browser opens to fill a posting. Greenhouse boards with their own careers
// page report an absolute_url on the company's domain, where the form sits in an iframe the
// adapters cannot reach, so those use Greenhouse's embed form, which always renders the form itself.
export function formUrlFor(job) {
  const url = job?.applyUrl || job?.url || '';
  const ids = job?.atsIds;
  if (job?.ats === 'greenhouse' && ids?.boardToken && /^\d+$/.test(String(ids.jobId || '')) && !isGreenhouseHost(url)) {
    return `https://boards.greenhouse.io/embed/job_app?for=${encodeURIComponent(ids.boardToken)}&token=${ids.jobId}`;
  }
  return url;
}
