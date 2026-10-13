import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Briefcase, 
  DollarSign, 
  MapPin, 
  Building2, 
  Calendar, 
  Sparkles, 
  FileText, 
  Send, 
  AlertCircle 
} from 'lucide-react';
import { jobsApi } from '../api/jobs';
import { useAuth } from '../context/AuthContext';
import AkatsukiCloud from '../assets/AkatsukiCloud';

const CATEGORIES = [
  { value: 'CAMPUS_GIG', label: 'Campus Gig / One-off Task' },
  { value: 'INTERNSHIP', label: 'Student Internship' },
  { value: 'PROJECT_COLLAB', label: 'Hackathon / Project Collab' },
  { value: 'RESEARCH_ASSISTANT', label: 'Research Lab Assistantship' },
  { value: 'PART_TIME', label: 'Campus Part-Time Work' },
  { value: 'TUTORING', label: 'Peer Tutoring / Mentorship' },
];

const LOCATION_TYPES = [
  { value: 'ON_CAMPUS', label: 'On Campus' },
  { value: 'REMOTE', label: 'Remote / Online' },
  { value: 'HYBRID', label: 'Hybrid' },
];

export const CreateJobPage = () => {
  const navigate = useNavigate();
  const { isAuthenticated } = useAuth();

  const [formData, setFormData] = useState({
    title: '',
    category: 'CAMPUS_GIG',
    location_type: 'ON_CAMPUS',
    location: '',
    stipend: '',
    department: 'Open to all branches',
    skills_required: '',
    deadline: '',
    description: '',
  });

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  if (!isAuthenticated) {
    navigate('/login');
    return null;
  }

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.title.trim() || !formData.description.trim()) {
      setError('Please provide both an Opportunity Title and Detailed Description.');
      return;
    }

    try {
      setSubmitting(true);
      setError('');
      const created = await jobsApi.createJob({
        title: formData.title.trim(),
        category: formData.category,
        location_type: formData.location_type,
        location: formData.location.trim() || undefined,
        stipend: formData.stipend.trim() || undefined,
        department: formData.department.trim() || undefined,
        skills_required: formData.skills_required.trim() || undefined,
        deadline: formData.deadline || undefined,
        description: formData.description.trim(),
      });
      navigate(`/jobs/${created.id}`);
    } catch (err) {
      const errMsg = err.response?.data?.error || err.message || 'Failed to post opportunity';
      setError(errMsg);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-black text-white py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-3xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8 space-y-2">
          <div className="inline-flex items-center gap-2 mb-2">
            <AkatsukiCloud size={32} />
            <span className="text-xs font-mono font-bold tracking-widest text-red-500 uppercase">
              RECRUIT PEER TALENT
            </span>
          </div>
          <h1 className="text-3xl font-black tracking-tight text-white">
            Publish Campus Opportunity
          </h1>
          <p className="text-xs text-zinc-400 max-w-md mx-auto">
            Post an opening for your student startup, club event, research team, or campus project.
            Direct candidate inquiries will be routed to your job inbox.
          </p>
        </div>

        {error && (
          <div className="mb-6 p-4 rounded-xl bg-red-950/60 border border-red-500/50 text-red-200 text-xs flex items-start gap-2.5 shadow-lg">
            <AlertCircle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
            <span>{error}</span>
          </div>
        )}

        {/* Post Form */}
        <form
          onSubmit={handleSubmit}
          className="p-6 sm:p-8 rounded-2xl bg-zinc-950/80 border border-red-950/60 shadow-[0_0_50px_rgba(229,9,20,0.15)] space-y-6 backdrop-blur-md"
        >
          {/* Opportunity Title */}
          <div>
            <label className="block text-xs font-bold text-zinc-300 uppercase tracking-wider mb-2">
              Role / Opportunity Title *
            </label>
            <input
              type="text"
              name="title"
              value={formData.title}
              onChange={handleChange}
              placeholder="e.g. Lead Frontend React Engineer, Autonomous Drone Firmware Lead"
              className="w-full px-4 py-3 bg-black/60 border border-zinc-800 focus:border-red-500 rounded-xl text-sm text-zinc-100 placeholder-zinc-500 focus:outline-none focus:ring-1 focus:ring-red-500 transition-all"
              required
            />
          </div>

          {/* Category & Location Type */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-zinc-300 uppercase tracking-wider mb-2">
                Category
              </label>
              <select
                name="category"
                value={formData.category}
                onChange={handleChange}
                className="w-full px-4 py-2.5 bg-black/60 border border-zinc-800 rounded-xl text-xs text-zinc-200 focus:border-red-500 focus:outline-none"
              >
                {CATEGORIES.map((c) => (
                  <option key={c.value} value={c.value} className="bg-zinc-900 text-white">
                    {c.label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-zinc-300 uppercase tracking-wider mb-2">
                Location Mode
              </label>
              <select
                name="location_type"
                value={formData.location_type}
                onChange={handleChange}
                className="w-full px-4 py-2.5 bg-black/60 border border-zinc-800 rounded-xl text-xs text-zinc-200 focus:border-red-500 focus:outline-none"
              >
                {LOCATION_TYPES.map((l) => (
                  <option key={l.value} value={l.value} className="bg-zinc-900 text-white">
                    {l.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Campus Location & Compensation */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-zinc-300 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                <MapPin className="w-3.5 h-3.5 text-red-500" />
                <span>Campus Location / Lab Spot</span>
              </label>
              <input
                type="text"
                name="location"
                value={formData.location}
                onChange={handleChange}
                placeholder="e.g. Incubation Center Shed 3, Central Library"
                className="w-full px-4 py-2.5 bg-black/60 border border-zinc-800 focus:border-red-500 rounded-xl text-xs text-zinc-100 placeholder-zinc-500 focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-zinc-300 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                <DollarSign className="w-3.5 h-3.5 text-emerald-400" />
                <span>Compensation / Stipend</span>
              </label>
              <input
                type="text"
                name="stipend"
                value={formData.stipend}
                onChange={handleChange}
                placeholder="e.g. INR 8,000 / month, Certificate + Sponsorship"
                className="w-full px-4 py-2.5 bg-black/60 border border-zinc-800 focus:border-red-500 rounded-xl text-xs text-zinc-100 placeholder-zinc-500 focus:outline-none"
              />
            </div>
          </div>

          {/* Department & Deadline */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-zinc-300 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                <Building2 className="w-3.5 h-3.5 text-zinc-400" />
                <span>Department Eligibility</span>
              </label>
              <input
                type="text"
                name="department"
                value={formData.department}
                onChange={handleChange}
                placeholder="e.g. Open to all branches, Computer Science"
                className="w-full px-4 py-2.5 bg-black/60 border border-zinc-800 focus:border-red-500 rounded-xl text-xs text-zinc-100 placeholder-zinc-500 focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-zinc-300 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5 text-yellow-500" />
                <span>Application Deadline (Optional)</span>
              </label>
              <input
                type="date"
                name="deadline"
                value={formData.deadline}
                onChange={handleChange}
                className="w-full px-4 py-2.5 bg-black/60 border border-zinc-800 focus:border-red-500 rounded-xl text-xs text-zinc-100 focus:outline-none"
              />
            </div>
          </div>

          {/* Required Skills */}
          <div>
            <label className="block text-xs font-bold text-zinc-300 uppercase tracking-wider mb-2 flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-red-500" />
              <span>Skills & Technologies Required (Comma-separated)</span>
            </label>
            <input
              type="text"
              name="skills_required"
              value={formData.skills_required}
              onChange={handleChange}
              placeholder="e.g. React, TypeScript, Rust, Tailwind CSS, System Design"
              className="w-full px-4 py-2.5 bg-black/60 border border-zinc-800 focus:border-red-500 rounded-xl text-xs text-zinc-100 placeholder-zinc-500 focus:outline-none"
            />
          </div>

          {/* Full Description */}
          <div>
            <label className="block text-xs font-bold text-zinc-300 uppercase tracking-wider mb-2 flex items-center gap-1.5">
              <FileText className="w-3.5 h-3.5 text-red-500" />
              <span>Detailed Role Description & Project Scope *</span>
            </label>
            <textarea
              name="description"
              rows={6}
              value={formData.description}
              onChange={handleChange}
              placeholder="Describe the opportunity in detail: project goals, what the peer student will build, weekly time commitment, and what they will learn..."
              className="w-full px-4 py-3 bg-black/60 border border-zinc-800 focus:border-red-500 rounded-xl text-sm text-zinc-100 placeholder-zinc-500 focus:outline-none focus:ring-1 focus:ring-red-500 transition-all resize-y"
              required
            />
          </div>

          {/* Submit Button */}
          <div className="pt-2">
            <button
              type="submit"
              disabled={submitting}
              className="w-full py-3.5 px-6 rounded-xl bg-gradient-to-r from-red-700 to-red-600 hover:from-red-600 hover:to-red-500 text-white font-bold text-xs uppercase tracking-wider shadow-[0_0_25px_rgba(229,9,20,0.5)] transition-all flex items-center justify-center gap-2 disabled:opacity-50"
            >
              {submitting ? (
                <span>Publishing Role...</span>
              ) : (
                <>
                  <Send className="w-4 h-4" />
                  <span>Publish to Akatsuki Marketplace</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default CreateJobPage;
