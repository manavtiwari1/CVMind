import { useState, useMemo, useEffect } from 'react';
import { Search, CheckCircle2, Circle, Sparkles, Code2, ArrowRight, ChevronLeft, ChevronRight } from 'lucide-react';
import { TOPICS, COMPANIES, type CodingProblem } from '../../data/codingProblems';

interface ProblemLibraryProps {
  problems: CodingProblem[];
  solvedProblemIds: string[];
  onSelectProblem: (problem: CodingProblem) => void;
  onOpenAiGenerator: () => void;
}

export default function ProblemLibrary({
  problems,
  solvedProblemIds,
  onSelectProblem,
  onOpenAiGenerator
}: ProblemLibraryProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTopic, setSelectedTopic] = useState('All');
  const [selectedDifficulty, setSelectedDifficulty] = useState('All');
  const [selectedCompany, setSelectedCompany] = useState('All');
  const [statusFilter, setStatusFilter] = useState<'All' | 'Solved' | 'Unsolved'>('All');
  const [currentPage, setCurrentPage] = useState(1);
  const ITEMS_PER_PAGE = 10;

  const filteredProblems = useMemo(() => {
    return problems.filter((p) => {
      // Search query
      const matchesSearch =
        p.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        p.category.toLowerCase().includes(searchQuery.toLowerCase());

      // Topic
      const matchesTopic =
        selectedTopic === 'All' || p.category.toLowerCase().includes(selectedTopic.toLowerCase());

      // Difficulty
      const matchesDifficulty =
        selectedDifficulty === 'All' || p.difficulty.toLowerCase() === selectedDifficulty.toLowerCase();

      // Company
      const matchesCompany =
        selectedCompany === 'All' ||
        p.companies.some((c) => c.toLowerCase() === selectedCompany.toLowerCase());

      // Status
      const isSolved = solvedProblemIds.includes(p.id);
      const matchesStatus =
        statusFilter === 'All' ||
        (statusFilter === 'Solved' && isSolved) ||
        (statusFilter === 'Unsolved' && !isSolved);

      return matchesSearch && matchesTopic && matchesDifficulty && matchesCompany && matchesStatus;
    });
  }, [problems, searchQuery, selectedTopic, selectedDifficulty, selectedCompany, statusFilter, solvedProblemIds]);

  // Reset to page 1 whenever any filter changes
  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, selectedTopic, selectedDifficulty, selectedCompany, statusFilter]);

  const totalPages = Math.max(1, Math.ceil(filteredProblems.length / ITEMS_PER_PAGE));
  const safeCurrentPage = Math.min(Math.max(1, currentPage), totalPages);

  const startIndex = (safeCurrentPage - 1) * ITEMS_PER_PAGE;
  const paginatedProblems = filteredProblems.slice(startIndex, startIndex + ITEMS_PER_PAGE);

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
    const tableEl = document.querySelector('.problem-table-card');
    if (tableEl) {
      tableEl.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  const getPageNumbers = () => {
    const pages: (number | string)[] = [];
    if (totalPages <= 7) {
      for (let i = 1; i <= totalPages; i++) pages.push(i);
    } else {
      if (safeCurrentPage <= 4) {
        pages.push(1, 2, 3, 4, 5, '...', totalPages);
      } else if (safeCurrentPage >= totalPages - 3) {
        pages.push(1, '...', totalPages - 4, totalPages - 3, totalPages - 2, totalPages - 1, totalPages);
      } else {
        pages.push(1, '...', safeCurrentPage - 1, safeCurrentPage, safeCurrentPage + 1, '...', totalPages);
      }
    }
    return pages;
  };

  const solvedCount = solvedProblemIds.length;
  const totalCount = problems.length;
  const progressPercent = Math.round((solvedCount / Math.max(1, totalCount)) * 100);

  // Pick first unsolved problem as recommended
  const recommendedProblem = problems.find(p => !solvedProblemIds.includes(p.id)) || problems[0];

  return (
    <div className="problem-lib-view">
      {/* Hero Welcome Banner */}
      <div className="code-hero-banner">
        <div className="code-hero-content">
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', background: 'rgba(41, 151, 255, 0.08)', color: '#2563eb', padding: '5px 14px', borderRadius: '99px', fontSize: '0.78rem', fontWeight: 700, marginBottom: '14px', border: '1px solid rgba(41, 151, 255, 0.2)' }}>
            <Sparkles size={14} color="#7c3aed" />
            AI-POWERED TECHNICAL INTERVIEW ARENA
          </div>
          <h1>Practice. Prove. Get Hired.</h1>
          <p>
            Master Data Structures & Algorithms with an in-browser isolated code judge, 
            6-tier progressive AI assistance, and standardized CVmind skill scores that recruiters verify.
          </p>
          <div style={{ display: 'flex', gap: '12px', marginTop: '22px', flexWrap: 'wrap' }}>
            {recommendedProblem && (
              <button
                onClick={() => onSelectProblem(recommendedProblem)}
                className="btn-primary-submit"
                style={{ display: 'inline-flex', alignItems: 'center', gap: '8px' }}
              >
                <Code2 size={16} />
                Continue Practice: {recommendedProblem.title}
                <ArrowRight size={15} />
              </button>
            )}
            <button
              onClick={onOpenAiGenerator}
              className="btn-secondary-light"
            >
              <Sparkles size={16} color="#7c3aed" />
              Generate Custom AI Problem
            </button>
          </div>
        </div>

        <div className="code-hero-metrics">
          <div className="hero-metric-card">
            <div className="hero-metric-num" style={{ color: '#10b981' }}>{solvedCount}</div>
            <div className="hero-metric-label">Solved</div>
          </div>
          <div className="hero-metric-card">
            <div className="hero-metric-num" style={{ color: '#0f172a' }}>{totalCount}</div>
            <div className="hero-metric-label">Challenges</div>
          </div>
          <div className="hero-metric-card">
            <div className="hero-metric-num" style={{ color: '#2563eb' }}>{progressPercent}%</div>
            <div className="hero-metric-label">Mastery</div>
          </div>
        </div>
      </div>

      {/* Filter Controls */}
      <div className="problem-filters-container">
        <div className="problem-search-row">
          <div className="code-search-box">
            <Search size={18} />
            <input
              type="text"
              placeholder="Search problems by title or topic..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="code-search-input"
            />
          </div>

          <select
            value={selectedDifficulty}
            onChange={(e) => setSelectedDifficulty(e.target.value)}
            className="filter-select"
          >
            <option value="All">Difficulty: All</option>
            <option value="Easy">Easy</option>
            <option value="Medium">Medium</option>
            <option value="Hard">Hard</option>
          </select>

          <select
            value={selectedCompany}
            onChange={(e) => setSelectedCompany(e.target.value)}
            className="filter-select"
          >
            {COMPANIES.map((c) => (
              <option key={c} value={c}>
                {c === 'All' ? 'Company: All' : c}
              </option>
            ))}
          </select>

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as any)}
            className="filter-select"
          >
            <option value="All">Status: All</option>
            <option value="Solved">Solved</option>
            <option value="Unsolved">Unsolved</option>
          </select>
        </div>

        {/* Topic Pills Carousel */}
        <div className="topic-chips-bar">
          {TOPICS.map((topic) => (
            <button
              key={topic}
              onClick={() => setSelectedTopic(topic)}
              className={`topic-chip ${selectedTopic === topic ? 'active' : ''}`}
            >
              {topic}
            </button>
          ))}
        </div>
      </div>

      {/* Problem Table */}
      <div className="problem-table-card">
        <table className="problem-table">
          <thead>
            <tr>
              <th style={{ width: '60px' }}>Status</th>
              <th>Problem Title</th>
              <th style={{ width: '130px' }}>Difficulty</th>
              <th style={{ width: '220px' }}>Category</th>
              <th style={{ width: '130px' }}>Acceptance</th>
              <th style={{ width: '200px' }}>Companies</th>
            </tr>
          </thead>
          <tbody>
            {filteredProblems.length === 0 ? (
              <tr>
                <td colSpan={6} style={{ textAlign: 'center', padding: '48px', color: '#94a3b8' }}>
                  No challenges matched your search filters. Try resetting the filters or generate a custom AI problem!
                </td>
              </tr>
            ) : (
              paginatedProblems.map((p) => {
                const isSolved = solvedProblemIds.includes(p.id);
                return (
                  <tr key={p.id}>
                    <td>
                      {isSolved ? (
                        <CheckCircle2 size={18} color="#10b981" />
                      ) : (
                        <Circle size={18} color="#475569" />
                      )}
                    </td>
                    <td>
                      <div
                        onClick={() => onSelectProblem(p)}
                        className="problem-title-cell"
                      >
                        {p.title}
                        {p.isAiGenerated && (
                          <span style={{ fontSize: '0.65rem', background: 'rgba(6, 182, 212, 0.2)', color: '#06b6d4', padding: '2px 6px', borderRadius: '4px', fontWeight: 700 }}>
                            AI GENERATED
                          </span>
                        )}
                      </div>
                    </td>
                    <td>
                      <span className={`diff-badge diff-${p.difficulty.toLowerCase()}`}>
                        {p.difficulty}
                      </span>
                    </td>
                    <td style={{ color: '#94a3b8', fontSize: '0.86rem' }}>
                      {p.category}
                    </td>
                    <td style={{ color: '#cbd5e1', fontSize: '0.86rem', fontWeight: 600 }}>
                      {p.acceptanceRate}
                    </td>
                    <td>
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
                        {p.companies.slice(0, 3).map((comp) => (
                          <span key={comp} className="company-tag">
                            {comp}
                          </span>
                        ))}
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>

        {/* ─── Pagination Footer ─── */}
        {totalPages > 1 && (
          <div className="table-pagination-bar">
            <div className="pagination-info">
              Showing <strong>{filteredProblems.length === 0 ? 0 : startIndex + 1}</strong> to{' '}
              <strong>{Math.min(startIndex + ITEMS_PER_PAGE, filteredProblems.length)}</strong> of{' '}
              <strong>{filteredProblems.length}</strong> challenges
            </div>

            <div className="pagination-controls">
              <button
                onClick={() => handlePageChange(safeCurrentPage - 1)}
                disabled={safeCurrentPage === 1}
                className="pagination-btn pagination-nav-btn"
                title="Previous page"
              >
                <ChevronLeft size={16} />
                <span>Prev</span>
              </button>

              <div className="pagination-numbers">
                {getPageNumbers().map((item, idx) => {
                  if (item === '...') {
                    return (
                      <span key={`dots-${idx}`} className="pagination-ellipsis">
                        …
                      </span>
                    );
                  }
                  const pageNum = item as number;
                  return (
                    <button
                      key={pageNum}
                      onClick={() => handlePageChange(pageNum)}
                      className={`pagination-btn pagination-num-btn ${safeCurrentPage === pageNum ? 'active' : ''}`}
                    >
                      {pageNum}
                    </button>
                  );
                })}
              </div>

              <button
                onClick={() => handlePageChange(safeCurrentPage + 1)}
                disabled={safeCurrentPage === totalPages}
                className="pagination-btn pagination-nav-btn"
                title="Next page"
              >
                <span>Next</span>
                <ChevronRight size={16} />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
