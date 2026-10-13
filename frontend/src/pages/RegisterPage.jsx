import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { 
  User, 
  Mail, 
  Lock, 
  Hash, 
  Building2, 
  GraduationCap, 
  Sparkles, 
  FileText, 
  UserPlus, 
  AlertCircle 
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import AkatsukiCloud from '../assets/AkatsukiCloud';
import AvatarSelector from '../components/AvatarSelector';
import { AKATSUKI_BACKGROUNDS } from '../constants/backgrounds';

export const RegisterPage = () => {
  const navigate = useNavigate();
  const { register, selectedAvatarId, setAvatar } = useAuth();

  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    roll_number: '',
    department: 'Computer Science & Engineering',
    graduation_year: '2026',
    bio: '',
    skills: '',
    resume_url: '',
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.name.trim() || !formData.email.trim() || !formData.roll_number.trim()) {
      setError('Name, College Email, and Roll Number are required.');
      return;
    }
    if (formData.password.length < 6) {
      setError('Password must be at least 6 characters.');
      return;
    }

    try {
      setLoading(true);
      setError('');
      await register({
        name: formData.name.trim(),
        email: formData.email.trim(),
        password: formData.password,
        roll_number: formData.roll_number.trim(),
        department: formData.department.trim(),
        graduation_year: parseInt(formData.graduation_year, 10) || 2026,
        bio: formData.bio.trim() || undefined,
        skills: formData.skills.trim() || undefined,
        resume_url: formData.resume_url.trim() || undefined,
      }, selectedAvatarId);
      navigate('/my-dashboard');
    } catch (err) {
      const errMsg = err.response?.data?.error || err.message || 'Registration failed';
      setError(errMsg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-black text-white relative py-12 px-4 sm:px-6 lg:px-8">
      {/* Background with Ambient Crimson Veil */}
      <div 
        className="absolute inset-0 bg-cover bg-center pointer-events-none opacity-20 mix-blend-screen"
        style={{ backgroundImage: `url(${AKATSUKI_BACKGROUNDS.auth.url})` }}
      />
      <div 
        className="absolute inset-0 pointer-events-none"
        style={{ background: AKATSUKI_BACKGROUNDS.auth.overlay }}
      />

      <div className="relative max-w-2xl mx-auto space-y-6">
        {/* Header */}
        <div className="text-center space-y-2">
          <Link to="/" className="inline-flex items-center gap-2">
            <AkatsukiCloud size={40} />
          </Link>
          <h1 className="text-3xl font-black tracking-tight text-white uppercase font-mono">
            JOIN THE AKATSUKI NETWORK
          </h1>
          <p className="text-xs text-zinc-400">
            Create your student dossier, showcase your skills, and unlock peer opportunities
          </p>
        </div>

        {error && (
          <div className="p-3.5 rounded-xl bg-red-950/60 border border-red-500/40 text-red-200 text-xs flex items-start gap-2 shadow-md">
            <AlertCircle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
            <span>{error}</span>
          </div>
        )}

        <form
          onSubmit={handleSubmit}
          className="p-6 sm:p-8 rounded-2xl bg-zinc-950/90 border border-red-950/60 shadow-[0_0_50px_rgba(229,9,20,0.18)] backdrop-blur-md space-y-5"
        >
          {/* Avatar Selector */}
          <div className="pb-4 border-b border-zinc-900">
            <AvatarSelector
              selectedId={selectedAvatarId}
              onSelect={setAvatar}
            />
          </div>

          {/* Full Name & College Email */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-zinc-300 uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
                <User className="w-3.5 h-3.5 text-red-500" />
                <span>Full Name *</span>
              </label>
              <input
                type="text"
                name="name"
                value={formData.name}
                onChange={handleChange}
                placeholder="e.g. Sarah Connor"
                className="w-full px-3.5 py-2.5 bg-black/60 border border-zinc-800 focus:border-red-500 rounded-xl text-xs text-white focus:outline-none"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-zinc-300 uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
                <Mail className="w-3.5 h-3.5 text-red-500" />
                <span>College Email *</span>
              </label>
              <input
                type="email"
                name="email"
                value={formData.email}
                onChange={handleChange}
                placeholder="e.g. sarah.mech@college.edu"
                className="w-full px-3.5 py-2.5 bg-black/60 border border-zinc-800 focus:border-red-500 rounded-xl text-xs text-white focus:outline-none"
                required
              />
            </div>
          </div>

          {/* Roll Number & Password */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-zinc-300 uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
                <Hash className="w-3.5 h-3.5 text-red-500" />
                <span>College Roll Number *</span>
              </label>
              <input
                type="text"
                name="roll_number"
                value={formData.roll_number}
                onChange={handleChange}
                placeholder="e.g. MECH2027-104"
                className="w-full px-3.5 py-2.5 bg-black/60 border border-zinc-800 focus:border-red-500 rounded-xl text-xs text-white focus:outline-none"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-zinc-300 uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
                <Lock className="w-3.5 h-3.5 text-red-500" />
                <span>Password (min 6 chars) *</span>
              </label>
              <input
                type="password"
                name="password"
                value={formData.password}
                onChange={handleChange}
                placeholder="Create secure password"
                className="w-full px-3.5 py-2.5 bg-black/60 border border-zinc-800 focus:border-red-500 rounded-xl text-xs text-white focus:outline-none"
                required
              />
            </div>
          </div>

          {/* Department & Grad Year */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-zinc-300 uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
                <Building2 className="w-3.5 h-3.5 text-zinc-400" />
                <span>Department / Specialization</span>
              </label>
              <input
                type="text"
                name="department"
                value={formData.department}
                onChange={handleChange}
                placeholder="e.g. Mechanical & Mechatronics"
                className="w-full px-3.5 py-2.5 bg-black/60 border border-zinc-800 focus:border-red-500 rounded-xl text-xs text-white focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-zinc-300 uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
                <GraduationCap className="w-3.5 h-3.5 text-zinc-400" />
                <span>Graduation Year</span>
              </label>
              <input
                type="number"
                name="graduation_year"
                value={formData.graduation_year}
                onChange={handleChange}
                placeholder="2026"
                className="w-full px-3.5 py-2.5 bg-black/60 border border-zinc-800 focus:border-red-500 rounded-xl text-xs text-white focus:outline-none"
              />
            </div>
          </div>

          {/* Skills */}
          <div>
            <label className="block text-xs font-semibold text-zinc-300 uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-red-500" />
              <span>Skills & Tools (Comma-separated)</span>
            </label>
            <input
              type="text"
              name="skills"
              value={formData.skills}
              onChange={handleChange}
              placeholder="e.g. ROS2, C++, CAD, Arduino, Python"
              className="w-full px-3.5 py-2.5 bg-black/60 border border-zinc-800 focus:border-red-500 rounded-xl text-xs text-white focus:outline-none"
            />
          </div>

          {/* Bio */}
          <div>
            <label className="block text-xs font-semibold text-zinc-300 uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
              <FileText className="w-3.5 h-3.5 text-red-500" />
              <span>Bio & Campus Focus</span>
            </label>
            <textarea
              name="bio"
              rows={3}
              value={formData.bio}
              onChange={handleChange}
              placeholder="Brief summary of your campus interests, clubs, or research focus..."
              className="w-full px-3.5 py-2.5 bg-black/60 border border-zinc-800 focus:border-red-500 rounded-xl text-xs text-white focus:outline-none resize-none"
            />
          </div>

          {/* Submit */}
          <div className="pt-2">
            <button
              type="submit"
              disabled={loading}
              className="w-full py-3.5 rounded-xl bg-gradient-to-r from-red-700 to-red-600 hover:from-red-600 hover:to-red-500 text-white font-bold text-xs uppercase tracking-wider shadow-[0_0_20px_rgba(229,9,20,0.4)] disabled:opacity-50 transition-all flex items-center justify-center gap-2"
            >
              {loading ? (
                <span>Registering Dossier...</span>
              ) : (
                <>
                  <UserPlus className="w-4 h-4" />
                  <span>Register & Activate Campus Access</span>
                </>
              )}
            </button>
          </div>
        </form>

        <div className="text-center text-xs text-zinc-400">
          <span>Already registered with college credentials? </span>
          <Link to="/login" className="text-red-400 hover:text-red-300 font-bold transition-colors">
            Login here →
          </Link>
        </div>
      </div>
    </div>
  );
};

export default RegisterPage;
