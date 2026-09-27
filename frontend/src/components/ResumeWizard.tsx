import React, { useState, useEffect } from 'react';
import {
  ArrowLeft,
  Sparkles,
  Plus,
  Trash,
  User,
  Briefcase,
  GraduationCap,
  Wrench,
  Mail,
  Phone,
  MapPin,
  Linkedin,
  SkipForward,
  Award,
  UploadCloud,
  FileText
} from 'lucide-react';
import './ResumeWizard.css';

interface WorkExperience {
  company: string;
  jobTitle: string;
  location: string;
  startDate: string;
  endDate: string;
  description: string;
}

interface Education {
  university: string;
  degree: string;
  gradYear: string;
  cgpa: string;
}

interface Course {
  name: string;
  platform: string;
  date: string;
}

interface ResumeWizardProps {
  templateName: string;
  onBack: () => void;
  onSkip: () => void;
  onGenerate: (formData: any) => void;
  initialData?: any;
  onUploadResumeClick?: () => void;
}

export default function ResumeWizard({ templateName, onBack, onSkip, onGenerate, initialData, onUploadResumeClick }: ResumeWizardProps) {
  // Personal Info
  const [personalInfo, setPersonalInfo] = useState({
    fullName: initialData?.personalInfo?.fullName || '',
    email: initialData?.personalInfo?.email || '',
    phone: initialData?.personalInfo?.phone || '',
    location: initialData?.personalInfo?.location || '',
    linkedin: initialData?.personalInfo?.linkedin || '',
    jobTitle: initialData?.personalInfo?.jobTitle || ''
  });

  // Summary
  const [summary, setSummary] = useState(initialData?.summary || '');

  // Education (initialized with one empty entry or extracted)
  const [educations, setEducations] = useState<Education[]>(() => {
    if (initialData?.educations && initialData.educations.length > 0) {
      return initialData.educations;
    }
    return [{ university: '', degree: '', gradYear: '', cgpa: '' }];
  });

  // Work Experiences (initialized with one empty entry or extracted)
  const [workExperiences, setWorkExperiences] = useState<WorkExperience[]>(() => {
    if (initialData?.workExperiences && initialData.workExperiences.length > 0) {
      return initialData.workExperiences;
    }
    return [{ company: '', jobTitle: '', location: '', startDate: '', endDate: '', description: '' }];
  });

  // Courses / Certifications (initialized with one empty entry or extracted)
  const [courses, setCourses] = useState<Course[]>(() => {
    if (initialData?.courses && initialData.courses.length > 0) {
      return initialData.courses;
    }
    return [{ name: '', platform: '', date: '' }];
  });

  // Skills
  const [skills, setSkills] = useState<string[]>(initialData?.skills || []);
  const [skillInput, setSkillInput] = useState('');

  // Additional rich template sections (Languages, Achievements, Time Breakdown)
  const [languages, setLanguages] = useState(initialData?.languages || []);
  const [achievements, setAchievements] = useState(initialData?.achievements || []);
  const [timeBreakdown, setTimeBreakdown] = useState(initialData?.timeBreakdown || []);

  // Sync state if initialData is updated dynamically
  useEffect(() => {
    if (initialData) {
      if (initialData.personalInfo) {
        setPersonalInfo({
          fullName: initialData.personalInfo.fullName || '',
          email: initialData.personalInfo.email || '',
          phone: initialData.personalInfo.phone || '',
          location: initialData.personalInfo.location || '',
          linkedin: initialData.personalInfo.linkedin || '',
          jobTitle: initialData.personalInfo.jobTitle || ''
        });
      }
      if (initialData.summary) setSummary(initialData.summary);
      if (initialData.educations && initialData.educations.length > 0) {
        setEducations(initialData.educations);
      }
      if (initialData.workExperiences && initialData.workExperiences.length > 0) {
        setWorkExperiences(initialData.workExperiences);
      }
      if (initialData.skills && initialData.skills.length > 0) {
        setSkills(initialData.skills);
      }
      if (initialData.courses && initialData.courses.length > 0) {
        setCourses(initialData.courses);
      }
      if (initialData.languages) setLanguages(initialData.languages);
      if (initialData.achievements) setAchievements(initialData.achievements);
      if (initialData.timeBreakdown) setTimeBreakdown(initialData.timeBreakdown);
    }
  }, [initialData]);

  // Form errors
  const [errors, setErrors] = useState<Record<string, string>>({});

  const handlePersonalInfoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setPersonalInfo(prev => ({ ...prev, [name]: value }));
    if (errors[name]) {
      setErrors(prev => {
        const copy = { ...prev };
        delete copy[name];
        return copy;
      });
    }
  };

  const handleEducationChange = (index: number, field: keyof Education, value: string) => {
    setEducations(prev => {
      const updated = [...prev];
      updated[index] = { ...updated[index], [field]: value };
      return updated;
    });
  };

  const addEducation = () => {
    setEducations(prev => [
      ...prev,
      { university: '', degree: '', gradYear: '', cgpa: '' }
    ]);
  };

  const removeEducation = (index: number) => {
    if (educations.length === 1) return; // Keep at least one
    setEducations(prev => prev.filter((_, i) => i !== index));
  };

  // Work Experience Handlers
  const handleWorkExperienceChange = (index: number, field: keyof WorkExperience, value: string) => {
    setWorkExperiences(prev => {
      const updated = [...prev];
      updated[index] = { ...updated[index], [field]: value };
      return updated;
    });
  };

  const addWorkExperience = () => {
    setWorkExperiences(prev => [
      ...prev,
      { company: '', jobTitle: '', location: '', startDate: '', endDate: '', description: '' }
    ]);
  };

  const removeWorkExperience = (index: number) => {
    if (workExperiences.length === 1) return; // Keep at least one
    setWorkExperiences(prev => prev.filter((_, i) => i !== index));
  };

  // Skill Handlers
  const handleAddSkill = (e: React.FormEvent | React.MouseEvent) => {
    e.preventDefault();
    const cleanSkill = skillInput.trim();
    if (cleanSkill && !skills.includes(cleanSkill)) {
      setSkills(prev => [...prev, cleanSkill]);
      setSkillInput('');
    }
  };

  const handleKeyDownSkill = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleAddSkill(e);
    }
  };

  const removeSkill = (index: number) => {
    setSkills(prev => prev.filter((_, i) => i !== index));
  };

  // Course Handlers
  const handleCourseChange = (index: number, field: keyof Course, value: string) => {
    setCourses(prev => {
      const updated = [...prev];
      updated[index] = { ...updated[index], [field]: value };
      return updated;
    });
  };

  const addCourse = () => {
    setCourses(prev => [
      ...prev,
      { name: '', platform: '', date: '' }
    ]);
  };

  const removeCourse = (index: number) => {
    if (courses.length === 1) return; // Keep at least one
    setCourses(prev => prev.filter((_, i) => i !== index));
  };

  // Submit Handler
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const newErrors: Record<string, string> = {};

    if (!personalInfo.fullName.trim()) newErrors.fullName = 'Full name is required';
    if (!personalInfo.email.trim()) newErrors.email = 'Email address is required';

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      // Scroll to top of form to show errors
      window.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }

    onGenerate({
      personalInfo,
      jobTitle: personalInfo.jobTitle || 'Professional',
      summary: summary.trim(),
      education: educations.filter(edu => edu.university.trim() || edu.degree.trim()),
      workExperiences: workExperiences.filter(exp => exp.company.trim() || exp.jobTitle.trim()),
      skills,
      courses: courses.filter(c => c.name.trim() || c.platform.trim()),
      languages,
      achievements,
      timeBreakdown
    });
  };

  return (
    <div className="rw-wizard animate-fade-in-up">
      {/* Wizard Header */}
      <div className="rw-header">
        <div className="rw-header-left">
          <button className="rw-back-btn" onClick={onBack}>
            <ArrowLeft size={16} /> Back to Templates
          </button>
          <div className="rw-template-tag">
            Selected Layout: <strong>{templateName}</strong>
          </div>
        </div>
        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
          {onUploadResumeClick && (
            <button type="button" className="rw-autofill-btn" onClick={onUploadResumeClick}>
              <UploadCloud size={14} /> Auto-fill from Existing Resume
            </button>
          )}
          <button className="rw-skip-btn" onClick={onSkip}>
            Skip & Edit Manually <SkipForward size={14} />
          </button>
        </div>
      </div>

      <div className="rw-grid-layout">
        {/* Left Column: Form Fields */}
        <form className="rw-form-column" onSubmit={handleSubmit}>
          <div className="rw-hero-text">
            <h2>Let's build your <span className="rw-gradient-text">ATS Resume</span></h2>
            <p>Fill in some basic details and CV Mind will optimize them into a beautiful, recruiter-ready resume layout.</p>
          </div>

          {initialData && (
            <div className="rw-extracted-alert">
              <Sparkles size={18} className="rw-alert-icon" />
              <div>
                <strong>Existing resume details imported!</strong>
                <span> Your data has been populated into the fields below. Review and adjust anything you'd like.</span>
              </div>
            </div>
          )}

          {/* SECTION 1: Personal Info */}
          <div className="rw-card">
            <div className="rw-card-header">
              <User size={18} className="rw-section-icon" />
              <h3>1. Personal Info</h3>
            </div>
            <div className="rw-card-body">
              <div className="rw-form-row">
                <div className="rw-form-group">
                  <label htmlFor="fullName">Full Name <span className="rw-required">*</span></label>
                  <input
                    type="text"
                    id="fullName"
                    name="fullName"
                    placeholder="e.g. John Doe"
                    value={personalInfo.fullName}
                    onChange={handlePersonalInfoChange}
                    className={errors.fullName ? 'rw-input-error' : ''}
                  />
                  {errors.fullName && <span className="rw-error-text">{errors.fullName}</span>}
                </div>
                <div className="rw-form-group">
                  <label htmlFor="email">Email Address <span className="rw-required">*</span></label>
                  <div className="rw-input-with-icon">
                    <Mail size={14} className="rw-field-icon" />
                    <input
                      type="email"
                      id="email"
                      name="email"
                      placeholder="e.g. john@email.com"
                      value={personalInfo.email}
                      onChange={handlePersonalInfoChange}
                      className={errors.email ? 'rw-input-error' : ''}
                    />
                  </div>
                  {errors.email && <span className="rw-error-text">{errors.email}</span>}
                </div>
              </div>

              <div className="rw-form-row">
                <div className="rw-form-group">
                  <label htmlFor="phone">Phone Number</label>
                  <div className="rw-input-with-icon">
                    <Phone size={14} className="rw-field-icon" />
                    <input
                      type="text"
                      id="phone"
                      name="phone"
                      placeholder="e.g. +91 9876543210"
                      value={personalInfo.phone}
                      onChange={handlePersonalInfoChange}
                    />
                  </div>
                </div>
                <div className="rw-form-group">
                  <label htmlFor="location">Location (City, Country)</label>
                  <div className="rw-input-with-icon">
                    <MapPin size={14} className="rw-field-icon" />
                    <input
                      type="text"
                      id="location"
                      name="location"
                      placeholder="e.g. Mumbai, India"
                      value={personalInfo.location}
                      onChange={handlePersonalInfoChange}
                    />
                  </div>
                </div>
              </div>

              <div className="rw-form-row">
                <div className="rw-form-group">
                  <label htmlFor="linkedin">LinkedIn Profile URL</label>
                  <div className="rw-input-with-icon">
                    <Linkedin size={14} className="rw-field-icon" />
                    <input
                      type="text"
                      id="linkedin"
                      name="linkedin"
                      placeholder="e.g. linkedin.com/in/johndoe"
                      value={personalInfo.linkedin}
                      onChange={handlePersonalInfoChange}
                    />
                  </div>
                </div>
                <div className="rw-form-group">
                  <label htmlFor="jobTitle">Target Role / Job Title</label>
                  <div className="rw-input-with-icon">
                    <Briefcase size={14} className="rw-field-icon" />
                    <input
                      type="text"
                      id="jobTitle"
                      name="jobTitle"
                      placeholder="e.g. Senior Software Engineer"
                      value={personalInfo.jobTitle || ''}
                      onChange={handlePersonalInfoChange}
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* SECTION 2: Summary */}
          <div className="rw-card">
            <div className="rw-card-header">
              <FileText size={18} className="rw-section-icon" />
              <h3>2. Professional Summary</h3>
            </div>
            <div className="rw-card-body">
              <div className="rw-form-group">
                <label htmlFor="summary">Executive Summary / Pitch</label>
                <textarea
                  id="summary"
                  name="summary"
                  rows={3}
                  placeholder="Briefly explain your experience, accomplishments, and value you bring..."
                  value={summary}
                  onChange={e => setSummary(e.target.value)}
                  style={{
                    width: '100%',
                    boxSizing: 'border-box',
                    padding: '0.75rem',
                    background: 'rgba(255, 255, 255, 0.03)',
                    border: '1px solid var(--border)',
                    borderRadius: 'var(--radius-sm)',
                    color: 'var(--text-primary)',
                    fontFamily: 'inherit',
                    fontSize: '0.86rem',
                    resize: 'vertical',
                    minHeight: '75px'
                  }}
                />
              </div>
            </div>
          </div>

          {/* SECTION 3: Academic Info */}
          <div className="rw-card">
            <div className="rw-card-header">
              <GraduationCap size={18} className="rw-section-icon" />
              <h3>3. Education / Academic details</h3>
            </div>
            <div className="rw-card-body">
              {educations.map((edu, index) => (
                <div key={index} className="rw-dynamic-item">
                  <div className="rw-dynamic-item-header">
                    <h4>Education Entry #{index + 1}</h4>
                    {educations.length > 1 && (
                      <button
                        type="button"
                        className="rw-remove-btn"
                        onClick={() => removeEducation(index)}
                      >
                        <Trash size={13} /> Remove
                      </button>
                    )}
                  </div>

                  <div className="rw-form-row">
                    <div className="rw-form-group">
                      <label>University / School Name</label>
                      <input
                        type="text"
                        placeholder="e.g. Delhi University, IIT Bombay"
                        value={edu.university}
                        onChange={e => handleEducationChange(index, 'university', e.target.value)}
                      />
                    </div>
                    <div className="rw-form-group">
                      <label>Degree / Major</label>
                      <input
                        type="text"
                        placeholder="e.g. B.Tech in Computer Science, B.Com"
                        value={edu.degree}
                        onChange={e => handleEducationChange(index, 'degree', e.target.value)}
                      />
                    </div>
                  </div>

                  <div className="rw-form-row">
                    <div className="rw-form-group">
                      <label>Graduation Year / Period</label>
                      <input
                        type="text"
                        placeholder="e.g. 2018 - 2022"
                        value={edu.gradYear}
                        onChange={e => handleEducationChange(index, 'gradYear', e.target.value)}
                      />
                    </div>
                    <div className="rw-form-group">
                      <label>CGPA / Score / Percentage</label>
                      <input
                        type="text"
                        placeholder="e.g. 8.5/10, 85%"
                        value={edu.cgpa}
                        onChange={e => handleEducationChange(index, 'cgpa', e.target.value)}
                      />
                    </div>
                  </div>
                </div>
              ))}

              <button
                type="button"
                className="rw-add-btn"
                onClick={addEducation}
              >
                <Plus size={14} /> Add Education
              </button>
            </div>
          </div>

          {/* SECTION 4: Work Experience */}
          <div className="rw-card">
            <div className="rw-card-header">
              <Briefcase size={18} className="rw-section-icon" />
              <h3>4. Work Experience</h3>
            </div>
            <div className="rw-card-body">
              {workExperiences.map((exp, index) => (
                <div key={index} className="rw-dynamic-item">
                  <div className="rw-dynamic-item-header">
                    <h4>Experience #{index + 1}</h4>
                    {workExperiences.length > 1 && (
                      <button
                        type="button"
                        className="rw-remove-btn"
                        onClick={() => removeWorkExperience(index)}
                      >
                        <Trash size={13} /> Remove
                      </button>
                    )}
                  </div>

                  <div className="rw-form-row">
                    <div className="rw-form-group">
                      <label>Job Title</label>
                      <input
                        type="text"
                        placeholder="e.g. Senior Software Engineer"
                        value={exp.jobTitle}
                        onChange={e => handleWorkExperienceChange(index, 'jobTitle', e.target.value)}
                      />
                    </div>
                    <div className="rw-form-group">
                      <label>Company / Organization</label>
                      <input
                        type="text"
                        placeholder="e.g. Google India"
                        value={exp.company}
                        onChange={e => handleWorkExperienceChange(index, 'company', e.target.value)}
                      />
                    </div>
                  </div>

                  <div className="rw-form-row">
                    <div className="rw-form-group">
                      <label>Location</label>
                      <input
                        type="text"
                        placeholder="e.g. Bengaluru, Karnataka"
                        value={exp.location}
                        onChange={e => handleWorkExperienceChange(index, 'location', e.target.value)}
                      />
                    </div>
                    <div className="rw-form-group rw-grid-2cols">
                      <div>
                        <label>Start Date</label>
                        <input
                          type="text"
                          placeholder="e.g. Jan 2021"
                          value={exp.startDate}
                          onChange={e => handleWorkExperienceChange(index, 'startDate', e.target.value)}
                        />
                      </div>
                      <div>
                        <label>End Date</label>
                        <input
                          type="text"
                          placeholder="e.g. Present, Dec 2024"
                          value={exp.endDate}
                          onChange={e => handleWorkExperienceChange(index, 'endDate', e.target.value)}
                        />
                      </div>
                    </div>
                  </div>

                  <div className="rw-form-group">
                    <label>Description / Core Achievements</label>
                    <textarea
                      placeholder="List your projects, responsibilities, or tools used. Don't worry if it is brief, AI will rewrite it beautifully!"
                      value={exp.description}
                      onChange={e => handleWorkExperienceChange(index, 'description', e.target.value)}
                      rows={3}
                    />
                  </div>
                </div>
              ))}

              <button
                type="button"
                className="rw-add-btn"
                onClick={addWorkExperience}
              >
                <Plus size={14} /> Add Work Experience
              </button>
            </div>
          </div>

          {/* SECTION 5: Skills */}
          <div className="rw-card">
            <div className="rw-card-header">
              <Wrench size={18} className="rw-section-icon" />
              <h3>5. Skills</h3>
            </div>
            <div className="rw-card-body">
              <div className="rw-form-group">
                <label>Add Skills</label>
                <div className="rw-skill-input-row">
                  <input
                    type="text"
                    placeholder="e.g. React, Python, Financial Auditing, Project Management"
                    value={skillInput}
                    onChange={e => setSkillInput(e.target.value)}
                    onKeyDown={handleKeyDownSkill}
                  />
                  <button type="button" className="rw-skill-add-btn" onClick={handleAddSkill}>
                    Add
                  </button>
                </div>
              </div>

              {skills.length > 0 && (
                <div className="rw-skills-tags">
                  {skills.map((skill, index) => (
                    <span key={index} className="rw-skill-tag">
                      {skill}
                      <button type="button" onClick={() => removeSkill(index)}>✕</button>
                    </span>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* SECTION 6: Courses / Certifications */}
          <div className="rw-card">
            <div className="rw-card-header">
              <Award size={18} className="rw-section-icon" />
              <h3>6. Courses / Certifications</h3>
            </div>
            <div className="rw-card-body">
              {courses.map((course, index) => (
                <div key={index} className="rw-dynamic-item">
                  <div className="rw-dynamic-item-header">
                    <h4>Course Entry #{index + 1}</h4>
                    {courses.length > 1 && (
                      <button
                        type="button"
                        className="rw-remove-btn"
                        onClick={() => removeCourse(index)}
                      >
                        <Trash size={13} /> Remove
                      </button>
                    )}
                  </div>

                  <div className="rw-form-row">
                    <div className="rw-form-group">
                      <label>Course / Certification Name</label>
                      <input
                        type="text"
                        placeholder="e.g. Google Project Management, Neural Networks Specialization"
                        value={course.name}
                        onChange={e => handleCourseChange(index, 'name', e.target.value)}
                      />
                    </div>
                    <div className="rw-form-group">
                      <label>Platform / Institution</label>
                      <input
                        type="text"
                        placeholder="e.g. Coursera, Udemy, Stanford University"
                        value={course.platform}
                        onChange={e => handleCourseChange(index, 'platform', e.target.value)}
                      />
                    </div>
                  </div>

                  <div className="rw-form-row">
                    <div className="rw-form-group">
                      <label>Completion Year / Period</label>
                      <input
                        type="text"
                        placeholder="e.g. 2023, Dec 2024"
                        value={course.date}
                        onChange={e => handleCourseChange(index, 'date', e.target.value)}
                      />
                    </div>
                    <div className="rw-form-group" style={{ visibility: 'hidden' }}>
                      {/* Filler */}
                    </div>
                  </div>
                </div>
              ))}

              <button
                type="button"
                className="rw-add-btn"
                onClick={addCourse}
              >
                <Plus size={14} /> Add Course
              </button>
            </div>
          </div>

          {/* Submit Actions */}
          <div className="rw-submit-section">
            <button type="submit" className="rw-generate-btn">
              <Sparkles size={16} /> Generate ATS Resume in 60s
            </button>
          </div>
        </form>

        {/* Right Column: Premium Sidebar Guide */}
        <div className="rw-guide-column">
          <div className="rw-guide-card">
            <h4>💡 Why use AI Resume builder?</h4>
            <ul className="rw-guide-list">
              <li>
                <strong>beat manual writing:</strong> Drafting resume points manually can take hours. AI does it in 60 seconds with perfect vocabulary.
              </li>
              <li>
                <strong>ATS-friendly:</strong> Emphasizes impact using strong action verbs and keyword density tailored to pass automatic screens.
              </li>
              <li>
                <strong>completely customized:</strong> Fills out the chosen <strong>{templateName}</strong> template layout without breaking elements.
              </li>
              <li>
                <strong>live editor access:</strong> Once generated, you get a full Word-like live editor to refine details, download PDF/DOCX, or share!
              </li>
            </ul>
          </div>

          <div className="rw-preview-box">
            <div className="rw-preview-top">
              <div className="rw-preview-circle-red"></div>
              <div className="rw-preview-circle-yellow"></div>
              <div className="rw-preview-circle-green"></div>
            </div>
            <div className="rw-preview-body">
              <div className="rw-preview-line name"></div>
              <div className="rw-preview-line subtitle"></div>
              <div className="rw-preview-line section"></div>
              <div className="rw-preview-line bullet"></div>
              <div className="rw-preview-line bullet"></div>
              <div className="rw-preview-line bullet short"></div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
