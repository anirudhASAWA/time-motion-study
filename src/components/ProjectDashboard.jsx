import React, { useState, useEffect } from 'react';
import { Clock, Plus, Play, Calendar, Building, User, Package, Trash2, X, Factory, LogOut } from 'lucide-react';
import { db, auth } from '../data/supabase';

function ProjectDashboard({ user, onSelectProject, onCreateProject, onDeleteProject, notifications }) {
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [isMobile, setIsMobile] = useState(window.innerWidth <= 768);

  useEffect(() => {
    loadProjects();
    
    // Listen for window resize
    const handleResize = () => {
      setIsMobile(window.innerWidth <= 768);
    };
    
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const loadProjects = async () => {
    try {
      console.log('🔄 Loading projects...');
      const data = await db.getProjects();
      console.log('📦 Projects loaded:', data);
      setProjects(data);
    } catch (error) {
      console.error('❌ Error loading projects:', error);
      notifications?.showError('Load Error', 'Failed to load projects');
    } finally {
      setLoading(false);
    }
  };

  const handleProjectSelect = (project) => {
    if ('vibrate' in navigator) {
      navigator.vibrate(50);
    }
    onSelectProject(project);
  };

  const handleProjectCreate = async (projectData) => {
    try {
      console.log('🚀 Creating project with data:', projectData);
      await onCreateProject(projectData);
      console.log('✅ Project created, reloading list...');
      await loadProjects();
      setShowCreateModal(false);
    } catch (error) {
      console.error('❌ Error creating project:', error);
    }
  };

  const handleProjectDelete = async (projectId, projectName) => {
    if (!window.confirm(`Delete "${projectName}" and all its data? This action cannot be undone.`)) {
      return;
    }

    try {
      await onDeleteProject(projectId);
      await loadProjects();
    } catch (error) {
      console.error('❌ Error deleting project:', error);
    }
  };

  const handleSignOut = async () => {
    try {
      await auth.signOut();
      notifications?.showInfo('Signed Out', 'You have been signed out successfully');
    } catch (error) {
      notifications?.showError('Sign Out Error', 'Failed to sign out');
      console.error('Sign out error:', error);
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'active': return 'bg-green-100 text-green-800 border-green-200';
      case 'paused': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'completed': return 'bg-blue-100 text-blue-800 border-blue-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'active': return '🟢';
      case 'paused': return '⏸️';
      case 'completed': return '✅';
      default: return '⚪';
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'Not set';
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  };

  const getDaysRemaining = (targetDate) => {
    if (!targetDate) return null;
    
    const today = new Date();
    const target = new Date(targetDate);
    const diffTime = target - today;
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    if (diffDays < 0) return 'Overdue';
    if (diffDays === 0) return 'Due today';
    if (diffDays === 1) return '1 day left';
    return `${diffDays} days left`;
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
        <div className="text-center bg-white rounded-2xl p-8 shadow-lg">
          <Clock className="animate-spin text-blue-500 mx-auto mb-4" size={48} />
          <p className="text-gray-600 font-medium">Loading your projects...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      {/* ✅ REDESIGNED: Mobile-First Header */}
      <div className="bg-white shadow-sm">
        <div className="container mx-auto px-4 py-4">
          {/* Mobile Layout */}
          {isMobile ? (
            <div className="space-y-4">
              {/* Top Row: Title and Sign Out */}
              <div className="flex items-center justify-between">
                <div className="flex items-center">
                  <div className="w-10 h-10 bg-blue-500 rounded-xl flex items-center justify-center mr-3">
                    <Clock className="text-white" size={20} />
                  </div>
                  <div>
                    <h1 className="text-lg font-bold text-gray-800">
                      Study Projects
                    </h1>
                  </div>
                </div>
                
                <button
                  onClick={handleSignOut}
                  className="flex items-center gap-2 px-3 py-2 bg-gray-500 hover:bg-gray-600 text-white rounded-lg text-sm font-medium transition-colors"
                >
                  <LogOut size={16} />
                  <span>Sign Out</span>
                </button>
              </div>
              
              {/* User Info */}
              <div className="bg-blue-50 rounded-xl p-3 border border-blue-100">
                <p className="text-blue-800 font-medium text-sm">Welcome back!</p>
                <p className="text-blue-600 text-xs truncate">{user?.email}</p>
                <p className="text-blue-500 text-xs mt-1">Manage your industrial engineering studies</p>
              </div>
            </div>
          ) : (
            /* Desktop Layout */
            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <div className="w-12 h-12 bg-blue-500 rounded-xl flex items-center justify-center mr-4">
                  <Clock className="text-white" size={24} />
                </div>
                <div>
                  <h1 className="text-2xl md:text-3xl font-bold text-gray-800">
                    Time & Motion Study Projects
                  </h1>
                  <p className="text-gray-600">Welcome back, {user?.email}</p>
                  <p className="text-sm text-gray-500">Manage your industrial engineering studies</p>
                </div>
              </div>
              
              <button
                onClick={handleSignOut}
                className="flex items-center gap-2 px-4 py-2 bg-gray-500 hover:bg-gray-600 text-white rounded-lg font-medium transition-colors"
              >
                <LogOut size={16} />
                <span>Sign Out</span>
              </button>
            </div>
          )}
        </div>
      </div>

      <div className="container mx-auto px-4 py-6">
        {/* ✅ REDESIGNED: Projects Section Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
          <div>
            <h2 className="text-xl font-bold text-gray-800">Your Projects</h2>
            <p className="text-gray-600 text-sm">
              {isMobile ? 'Tap a project to continue' : 'Select a project to continue your time and motion study'}
            </p>
          </div>
          
          <button
            onClick={() => setShowCreateModal(true)}
            className="flex items-center justify-center gap-2 px-4 py-3 bg-blue-500 hover:bg-blue-600 text-white rounded-xl font-medium transition-all duration-200 shadow-lg hover:shadow-xl active:scale-98 w-full sm:w-auto"
          >
            <Plus size={20} />
            <span>{isMobile ? 'New Project' : 'New Study Project'}</span>
          </button>
        </div>

        {/* ✅ REDESIGNED: Projects Grid */}
        {projects.length > 0 ? (
          <div className={`grid gap-4 ${isMobile ? 'grid-cols-1' : 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3'}`}>
            {projects.map((project) => (
              <div
                key={project.id}
                className="bg-white rounded-2xl shadow-md hover:shadow-xl transition-all duration-300 border border-gray-100 relative group overflow-hidden"
              >
                {/* ✅ MOBILE-OPTIMIZED: Delete Button */}
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleProjectDelete(project.id, `${project.company_name} - ${project.plant_name}`);
                  }}
                  className={`absolute top-3 right-3 p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-full transition-colors z-10 ${
                    isMobile ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'
                  }`}
                  title="Delete Project"
                >
                  <Trash2 size={16} />
                </button>

                <div 
                  className="p-4 cursor-pointer h-full"
                  onClick={() => handleProjectSelect(project)}
                >
                  {/* ✅ REDESIGNED: Project Header */}
                  <div className="mb-4">
                    <div className="flex items-start justify-between mb-3 pr-8">
                      <div className="flex-1">
                        <h3 className="text-lg font-bold text-gray-800 mb-1 leading-tight">
                          {project.company_name}
                        </h3>
                        <p className="text-gray-600 text-sm mb-2">{project.plant_name}</p>
                      </div>
                    </div>
                    
                    {/* Status Badge */}
                    <div className="flex items-center gap-2 mb-3">
                      <span className={`px-3 py-1 rounded-full text-xs font-medium border ${getStatusColor(project.status)}`}>
                        {getStatusIcon(project.status)} {project.status.charAt(0).toUpperCase() + project.status.slice(1)}
                      </span>
                    </div>
                  </div>

                  {/* ✅ REDESIGNED: Project Details */}
                  <div className="space-y-2 mb-4">
                    <div className="flex items-center gap-2 text-sm text-gray-600">
                      <div className="w-6 h-6 bg-gray-100 rounded-lg flex items-center justify-center flex-shrink-0">
                        <Building size={12} className="text-gray-500" />
                      </div>
                      <span className="truncate">{project.company_name}</span>
                    </div>
                    
                    <div className="flex items-center gap-2 text-sm text-gray-600">
                      <div className="w-6 h-6 bg-gray-100 rounded-lg flex items-center justify-center flex-shrink-0">
                        <Factory size={12} className="text-gray-500" />
                      </div>
                      <span className="truncate">{project.plant_name}</span>
                    </div>

                    <div className="flex items-center gap-2 text-sm text-gray-600">
                      <div className="w-6 h-6 bg-gray-100 rounded-lg flex items-center justify-center flex-shrink-0">
                        <Package size={12} className="text-gray-500" />
                      </div>
                      <span className="truncate">{project.product}</span>
                    </div>
                    
                    <div className="flex items-center gap-2 text-sm text-gray-600">
                      <div className="w-6 h-6 bg-gray-100 rounded-lg flex items-center justify-center flex-shrink-0">
                        <User size={12} className="text-gray-500" />
                      </div>
                      <span className="truncate">{project.study_performed_by}</span>
                    </div>
                  </div>

                  {/* ✅ REDESIGNED: Project Timeline */}
                  <div className="border-t border-gray-100 pt-3 mb-4">
                    <div className="flex items-center justify-between text-xs">
                      <div className="flex items-center gap-1 text-gray-500">
                        <Calendar size={12} />
                        <span>Started {formatDate(project.created_at)}</span>
                      </div>
                      
                      {project.tentative_completion_date && (
                        <div className={`font-medium text-xs ${
                          getDaysRemaining(project.tentative_completion_date)?.includes('Overdue') 
                            ? 'text-red-600' 
                            : getDaysRemaining(project.tentative_completion_date)?.includes('today')
                              ? 'text-orange-600'
                              : 'text-green-600'
                        }`}>
                          {getDaysRemaining(project.tentative_completion_date)}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* ✅ REDESIGNED: Continue Button */}
                  <button className="w-full flex items-center justify-center gap-2 bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white py-3 px-4 rounded-xl font-medium transition-all duration-200 shadow-sm hover:shadow-md active:scale-98">
                    <Play size={16} />
                    <span>Continue Study</span>
                  </button>
                </div>
              </div>
            ))}
          </div>
        ) : (
          /* ✅ REDESIGNED: Empty State */
          <div className="text-center py-12">
            <div className="max-w-sm mx-auto">
              <div className="w-20 h-20 bg-blue-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
                <Clock className="text-blue-500" size={32} />
              </div>
              <h3 className="text-xl font-semibold text-gray-800 mb-2">
                No Projects Yet
              </h3>
              <p className="text-gray-600 mb-6 text-sm leading-relaxed">
                Create your first time and motion study project to get started with industrial engineering analysis.
              </p>
              <button
                onClick={() => setShowCreateModal(true)}
                className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white rounded-xl font-medium transition-all duration-200 mx-auto shadow-lg hover:shadow-xl active:scale-98"
              >
                <Plus size={20} />
                <span>Create Your First Project</span>
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Create Project Modal */}
      {showCreateModal && (
        <CreateProjectModal
          isOpen={showCreateModal}
          onClose={() => setShowCreateModal(false)}
          onSubmit={handleProjectCreate}
          notifications={notifications}
          isMobile={isMobile}
        />
      )}
    </div>
  );
}

// ✅ REDESIGNED: Mobile-Optimized Create Project Modal
function CreateProjectModal({ isOpen, onClose, onSubmit, notifications, isMobile }) {
  const [formData, setFormData] = useState({
    company_name: '',
    plant_name: '',
    product: '',
    study_performed_by: '',
    tentative_completion_date: ''
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errors, setErrors] = useState({});

  const handleInputChange = (field, value) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
    
    if (errors[field]) {
      setErrors(prev => ({
        ...prev,
        [field]: ''
      }));
    }
  };

  const validateForm = () => {
    const newErrors = {};
    
    if (!formData.company_name.trim()) {
      newErrors.company_name = 'Company name is required';
    }
    
    if (!formData.plant_name.trim()) {
      newErrors.plant_name = 'Plant name is required';
    }
    
    if (!formData.product.trim()) {
      newErrors.product = 'Product name is required';
    }
    
    if (!formData.study_performed_by.trim()) {
      newErrors.study_performed_by = 'Study performed by is required';
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }
    
    setIsSubmitting(true);
    
    try {
      const projectData = {
        ...formData,
        status: 'active'
      };
      
      await onSubmit(projectData);
      
      setFormData({
        company_name: '',
        plant_name: '',
        product: '',
        study_performed_by: '',
        tentative_completion_date: ''
      });
      
      notifications?.showSuccess('Project Created', 'Your study project has been created successfully');
      
    } catch (error) {
      console.error('Error creating project:', error);
      notifications?.showError('Create Error', 'Failed to create project');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      {/* Backdrop */}
      <div className="fixed inset-0 bg-black bg-opacity-50" onClick={onClose} />
      
      {/* ✅ MOBILE-FIRST: Modal */}
      <div className="flex items-center justify-center min-h-screen p-4">
        <div className={`relative bg-white rounded-2xl shadow-2xl w-full max-h-[90vh] overflow-y-auto ${
          isMobile ? 'max-w-sm' : 'max-w-lg'
        }`}>
          {/* Header */}
          <div className="flex items-center justify-between p-6 border-b border-gray-100">
            <h3 className="text-lg font-semibold text-gray-900">
              {isMobile ? 'New Project' : 'Create New Study Project'}
            </h3>
            <button
              onClick={onClose}
              className="p-2 hover:bg-gray-100 rounded-full transition-colors"
            >
              <X size={20} />
            </button>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="p-6 space-y-5">
            {/* Company Name */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Company Name *
              </label>
              <input
                type="text"
                value={formData.company_name}
                onChange={(e) => handleInputChange('company_name', e.target.value)}
                className={`w-full px-4 py-3 border rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all ${
                  errors.company_name ? 'border-red-300 bg-red-50' : 'border-gray-300'
                }`}
                placeholder="Enter company name"
                disabled={isSubmitting}
              />
              {errors.company_name && (
                <p className="text-red-600 text-sm mt-1">{errors.company_name}</p>
              )}
            </div>

            {/* Plant Name */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Plant/Factory Name *
              </label>
              <input
                type="text"
                value={formData.plant_name}
                onChange={(e) => handleInputChange('plant_name', e.target.value)}
                className={`w-full px-4 py-3 border rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all ${
                  errors.plant_name ? 'border-red-300 bg-red-50' : 'border-gray-300'
                }`}
                placeholder="Enter plant or factory name"
                disabled={isSubmitting}
              />
              {errors.plant_name && (
                <p className="text-red-600 text-sm mt-1">{errors.plant_name}</p>
              )}
            </div>

            {/* Product */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Product/Line Being Studied *
              </label>
              <input
                type="text"
                value={formData.product}
                onChange={(e) => handleInputChange('product', e.target.value)}
                className={`w-full px-4 py-3 border rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all ${
                  errors.product ? 'border-red-300 bg-red-50' : 'border-gray-300'
                }`}
                placeholder="Enter product or production line"
                disabled={isSubmitting}
              />
              {errors.product && (
                <p className="text-red-600 text-sm mt-1">{errors.product}</p>
              )}
            </div>

            {/* Study Performed By */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Study Performed By *
              </label>
              <input
                type="text"
                value={formData.study_performed_by}
                onChange={(e) => handleInputChange('study_performed_by', e.target.value)}
                className={`w-full px-4 py-3 border rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all ${
                  errors.study_performed_by ? 'border-red-300 bg-red-50' : 'border-gray-300'
                }`}
                placeholder="Your name or team name"
                disabled={isSubmitting}
              />
              {errors.study_performed_by && (
                <p className="text-red-600 text-sm mt-1">{errors.study_performed_by}</p>
              )}
            </div>

            {/* Tentative Completion Date */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Tentative Date of Completion
              </label>
              <input
                type="date"
                value={formData.tentative_completion_date}
                onChange={(e) => handleInputChange('tentative_completion_date', e.target.value)}
                className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                disabled={isSubmitting}
                min={new Date().toISOString().split('T')[0]}
              />
            </div>

            {/* Submit Buttons */}
            <div className="flex flex-col gap-3 pt-4">
              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full px-4 py-3 bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white rounded-xl font-medium transition-all duration-200 disabled:opacity-50 flex items-center justify-center gap-2 shadow-lg hover:shadow-xl active:scale-98"
              >
                {isSubmitting ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    Creating...
                  </>
                ) : (
                  <>
                    <Plus size={16} />
                    Create Project
                  </>
                )}
              </button>
              
              <button
                type="button"
                onClick={onClose}
                disabled={isSubmitting}
                className="w-full px-4 py-3 border border-gray-300 text-gray-700 rounded-xl hover:bg-gray-50 font-medium transition-colors disabled:opacity-50"
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}

export default ProjectDashboard;