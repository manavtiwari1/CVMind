import { useEffect, useState } from 'react';
import { RESUME_TEMPLATES, TEMPLATES, type Template } from '../data/resumeTemplates';
import { API_BASE } from './apiBase';
import { authFetch } from './authFetch';
import { readUser } from './currentUser';

// Resume formats a student's college added on the placements portal. They join the built-in
// template lists (first in the picker) so the builder, saved resumes and downloads find them by id.
// The server only returns the formats of the student's own college.

export const isCollegeTemplate = (id?: string | null) => !!id && id.startsWith('college:');

let loading: Promise<boolean> | null = null;

function add(list: Template[], template: Template) {
  const at = list.findIndex((t) => t.id === template.id);
  if (at >= 0) list[at] = template;
  else list.unshift(template);
}

// Fetches once per page load; resolves true when the lists changed
export function loadCollegeTemplates(): Promise<boolean> {
  if (!readUser()?.token) return Promise.resolve(false);
  if (!loading) {
    loading = authFetch(`${API_BASE}/api/user/college/templates`)
      .then((res) => (res.ok ? res.json() : { data: [] }))
      .then((body: { college?: string; data?: Array<{ id: string; name: string; description: string; html: string }> }) => {
        const rows = body.data || [];
        for (const row of [...rows].reverse()) {
          const template: Template = {
            id: row.id,
            name: row.name,
            tag: `${body.college || 'Your college'} format`,
            icon: '🎓',
            color: '#2dc08d',
            accent: 'rgba(45,192,141,0.12)',
            description: row.description || `The official resume format of ${body.college || 'your college'}.`,
            highlights: ['College format', 'Reviewed by your placement team'],
            html: row.html,
            type: 'resume'
          };
          add(TEMPLATES, template);
          add(RESUME_TEMPLATES, template);
        }
        return rows.length > 0;
      })
      .catch(() => {
        loading = null;
        return false;
      });
  }
  return loading;
}

// Re-renders the caller once the college formats are in the template lists
export function useCollegeTemplates(): number {
  const [version, setVersion] = useState(0);
  useEffect(() => {
    let active = true;
    loadCollegeTemplates().then((changed) => { if (active && changed) setVersion((v) => v + 1); });
    return () => { active = false; };
  }, []);
  return version;
}
