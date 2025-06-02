import React, { useState, useEffect } from 'react';
import { Clock, Plus, Play, Calendar, Building, MapPin, User, Package, Trash2, X, Factory } from 'lucide-react';
import { db } from '../data/supabase';

function ProjectDashboard({ user, onSelectProject, onCreateProject, onDeleteProject, notifications }) {
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);

  useEffect(() => {
    loadProjects();
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

  const getStatusColor = (status) => {
    switch (status) {
      case 'active': return 'bg-green-100 text-green-800';
      case 'paused': return 'bg-yellow-100 text-yellow-800';
      case 'completed': return 'bg-blue-100 text-blue-800';
      default: return 'bg-gray-100 text-gray-800';
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
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div className="text-center">
          <Clock className="animate-spin text-blue-500 mx-auto mb-4" size={48} />
          <p className="text-gray-600">Loading your projects...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100">
      {/* Header */}
      <div className="bg-white shadow-sm border-b">
        <div className="container mx-auto px-4 py-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <Clock className="text-blue-500 mr-3" size={32} />
              <div>
                <h1 className="text-2xl md:text-3xl font-bold text-gray-800">
                  Time & Motion Study Projects
                </h1>
                <p className="text-gray-600">Welcome back, {user?.email}</p>
                <p className="text-sm text-gray-500">Manage your industrial engineering studies</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-8">
        {/* Projects Section */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-xl font-bold text-gray-800">Your Study Projects</h2>
            <p className="text-gray-600">Select a project to continue your time and motion study</p>
          </div>
          
          <button
            onClick={() => setShowCreateModal(true)}
            className="flex items-center gap-2 px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg font-medium transition-colors"
          >
            <Plus size={20} />
            <span className="hidden md:inline">New Study Project</span>
            <span className="md:hidden">New Project</span>
          </button>
        </div>

        {/* Projects Grid */}
        {projects.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {projects.map((project) => (
              <div
                key={project.id}
                className="bg-white rounded-lg shadow-lg hover:shadow-xl transition-shadow border border-gray-200 relative group"
              >
                {/* Delete Button */}
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleProjectDelete(project.id, `${project.company_name} - ${project.plant_name}`);
                  }}
                  className="absolute top-3 right-3 p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-full transition-colors opacity-0 group-hover:opacity-100"
                  title="Delete Project"
                >
                  <Trash2 size={16} />
                </button>

                <div 
                  className="p-6 cursor-pointer"
                  onClick={() => handleProjectSelect(project)}
                >
                  {/* Project Header */}
                  <div className="flex items-start justify-between mb-4 pr-8">
                    <div className="flex-1">
                      <h3 className="text-lg font-bold text-gray-800 mb-1">
                        {project.company_name}
                      </h3>
                      <p className="text-md text-gray-600 mb-2">{project.plant_name}</p>
                      <div className="flex items-center gap-2">
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(project.status)}`}>
                          {getStatusIcon(project.status)} {project.status.charAt(0).toUpperCase() + project.status.slice(1)}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Project Details */}
                  <div className="space-y-3 mb-4">
                    <div className="flex items-center gap-2 text-sm text-gray-600">
                      <Building size={16} className="text-gray-400" />
                      <span><strong>Company:</strong> {project.company_name}</span>
                    </div>
                    
                    <div className="flex items-center gap-2 text-sm text-gray-600">
                      <Factory size={16} className="text-gray-400" />
                      <span><strong>Plant:</strong> {project.plant_name}</span>
                    </div>

                    <div className="flex items-center gap-2 text-sm text-gray-600">
                      <Package size={16} className="text-gray-400" />
                      <span><strong>Product:</strong> {project.product}</span>
                    </div>
                    
                    <div className="flex items-center gap-2 text-sm text-gray-600">
                      <User size={16} className="text-gray-400" />
                      <span><strong>Study by:</strong> {project.study_performed_by}</span>
                    </div>
                  </div>

                  {/* Project Timeline */}
                  <div className="border-t pt-4">
                    <div className="flex items-center justify-between text-sm">
                      <div className="flex items-center gap-2 text-gray-600">
                        <Calendar size={16} className="text-gray-400" />
                        <span>Started {formatDate(project.created_at)}</span>
                      </div>
                      
                      {project.tentative_completion_date && (
                        <div className={`font-medium ${
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

                  {/* Continue Button */}
                  <div className="mt-4 pt-4 border-t">
                    <button className="w-full flex items-center justify-center gap-2 bg-blue-500 hover:bg-blue-600 text-white py-2 px-4 rounded-lg font-medium transition-colors">
                      <Play size={16} />
                      Continue Study
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          /* Empty State */
          <div className="text-center py-12">
            <div className="max-w-md mx-auto">
              <Clock className="mx-auto text-gray-400 mb-4" size={64} />
              <h3 className="text-xl font-semibold text-gray-800 mb-2">
                No Study Projects Yet
              </h3>
              <p className="text-gray-600 mb-6">
                Create your first time and motion study project to get started with industrial engineering analysis.
              </p>
              <button
                onClick={() => setShowCreateModal(true)}
                className="flex items-center gap-2 px-6 py-3 bg-blue-500 hover:bg-blue-600 text-white rounded-lg font-medium transition-colors mx-auto"
              >
                <Plus size={20} />
                Create Your First Project
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
        />
      )}
    </div>
  );
}

// Create Project Modal Component
function CreateProjectModal({ isOpen, onClose, onSubmit, notifications }) {
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
    
    // Clear error when user starts typing
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
      
      // Reset form
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
      
      {/* Modal */}
      <div className="flex items-center justify-center min-h-screen p-4">
        <div className="relative bg-white rounded-lg shadow-xl max-w-lg w-full max-h-[90vh] overflow-y-auto">
          {/* Header */}
          <div className="flex items-center justify-between p-6 border-b">
            <h3 className="text-lg font-semibold text-gray-900">
              Create New Study Project
            </h3>
            <button
              onClick={onClose}
              className="p-2 hover:bg-gray-100 rounded-full transition-colors"
            >
              <X size={20} />
            </button>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="p-6 space-y-6">
            {/* Company Name */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Company Name *
              </label>
              <input
                type="text"
                value={formData.company_name}
                onChange={(e) => handleInputChange('company_name', e.target.value)}
                className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${
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
                className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${
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
                className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${
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
                className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${
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
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                disabled={isSubmitting}
                min={new Date().toISOString().split('T')[0]}
              />
            </div>

            {/* Submit Buttons */}
            <div className="flex gap-3 pt-4">
              <button
                type="button"
                onClick={onClose}
                disabled={isSubmitting}
                className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSubmitting}
                className="flex-1 px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
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
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}

export default ProjectDashboard;