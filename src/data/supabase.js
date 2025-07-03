// src/data/supabase.js
// Complete version with all required functions

import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.REACT_APP_SUPABASE_URL
const supabaseKey = process.env.REACT_APP_SUPABASE_ANON_KEY

export const supabase = createClient(supabaseUrl, supabaseKey)

export const db = {

  // =================== PROJECT MANAGEMENT ===================
  
  // Get all projects for current user
  async getProjects() {
    console.log('🔍 Getting projects...');
    const { data: user } = await supabase.auth.getUser()
    
    if (!user.user) {
      throw new Error('No authenticated user');
    }
    
    const { data, error } = await supabase
      .from('projects')
      .select('*')
      .eq('user_id', user.user.id)
      .order('created_at', { ascending: false })
    
    if (error) {
      console.error('❌ Error getting projects:', error)
      throw error
    }
    
    console.log('✅ Projects loaded:', data?.length || 0);
    return data || []
  },

  // Create new project
  async createProject(projectData) {
    console.log('🚀 Creating project:', projectData);
    
    const { data: user } = await supabase.auth.getUser()
    
    if (!user.user) {
      throw new Error('No authenticated user');
    }
    
    const projectToInsert = {
      company_name: projectData.company_name.trim(),
      plant_name: projectData.plant_name.trim(),
      product: projectData.product.trim(),
      study_performed_by: projectData.study_performed_by.trim(),
      tentative_completion_date: projectData.tentative_completion_date || null,
      status: 'active',
      user_id: user.user.id
    };
    
    const { data, error } = await supabase
      .from('projects')
      .insert([projectToInsert])
      .select()
      .single()
    
    if (error) {
      console.error('❌ Error creating project:', error)
      throw error
    }
    
    console.log('✅ Project created:', data);
    return data
  },

  // Update project
  async updateProject(projectId, updates) {
    const { data, error } = await supabase
      .from('projects')
      .update({
        ...updates,
        updated_at: new Date().toISOString()
      })
      .eq('id', projectId)
      .select()
      .single()
    
    if (error) {
      throw error
    }
    
    return data
  },

  // Delete project (CASCADE will delete all related data)
  async deleteProject(projectId) {
    const { error } = await supabase
      .from('projects')
      .delete()
      .eq('id', projectId)
    
    if (error) {
      throw error
    }
    
    return true
  },

  // =================== PROJECT-SPECIFIC PROCESS MANAGEMENT ===================

  // Get ALL processes for a specific project ONLY
  async getProcessesByProject(projectId) {
    console.log('🔍 Getting processes for project:', projectId);
    
    if (!projectId) {
      console.log('❌ No project ID provided');
      return [];
    }
    
    const { data, error } = await supabase
      .from('processes')
      .select(`
        *,
        subprocesses (
          *
        )
      `)
      .eq('project_id', projectId)  // ✅ ONLY get processes for THIS project
      .order('created_at', { ascending: true })
    
    if (error) {
      console.error('❌ Error getting processes:', error)
      return []
    }
    
    // Sort subprocesses within each process
    const processesWithSortedSubprocesses = (data || []).map(process => ({
      ...process,
      subprocesses: (process.subprocesses || []).sort((a, b) => 
        (a.order_index || 0) - (b.order_index || 0) || 
        new Date(a.created_at) - new Date(b.created_at)
      )
    }));
    
    console.log('✅ Processes loaded for project:', processesWithSortedSubprocesses.length);
    return processesWithSortedSubprocesses;
  },

  // Add process to a specific project
  async addProcess(name, projectId) {
    console.log('🚀 Adding process to project:', { name, projectId });
    
    const { data: user } = await supabase.auth.getUser()
    
    if (!user.user) {
      throw new Error('No authenticated user');
    }
    
    if (!projectId) {
      throw new Error('Project ID is required');
    }
    
    if (!name || !name.trim()) {
      throw new Error('Process name is required');
    }
    
    // ✅ Include BOTH project_id and user_id for proper isolation
    const processData = {
      name: name.trim(),
      project_id: projectId,      // ✅ Links to specific project
      user_id: user.user.id       // ✅ Links to specific user
    };
    
    console.log('📤 Inserting process:', processData);
    
    const { data, error } = await supabase
      .from('processes')
      .insert([processData])
      .select()
      .single()
    
    if (error) {
      console.error('❌ Error adding process:', error)
      throw error
    }
    
    console.log('✅ Process added:', data);
    return { ...data, subprocesses: [] }
  },

  // Update process
  async updateProcess(processId, updates) {
    const { data, error } = await supabase
      .from('processes')
      .update({
        ...updates,
        updated_at: new Date().toISOString()
      })
      .eq('id', processId)
      .select()
      .single()
    
    if (error) {
      throw error
    }
    return data
  },

  // Delete process (CASCADE will delete subprocesses and time_readings)
  async deleteProcess(processId) {
    const { error } = await supabase
      .from('processes')
      .delete()
      .eq('id', processId)
    
    if (error) {
      throw error
    }
    return true
  },

  // =================== SUBPROCESS MANAGEMENT ===================

  // Add subprocess to a process
  async addSubprocess(processId, name) {
    // Get current count for order_index
    const { count } = await supabase
      .from('subprocesses')
      .select('*', { count: 'exact', head: true })
      .eq('process_id', processId)
    
    const { data, error } = await supabase
      .from('subprocesses')
      .insert([{
        process_id: processId,
        name: name.trim(),
        order_index: count || 0,
        activity_type: '',
        person_count: 1,
        production_qty: 0,
        rating: 100
      }])
      .select()
      .single()
    
    if (error) {
      throw error
    }
    return data
  },

  // ✅ MISSING FUNCTION: Update subprocess
  async updateSubprocess(subprocessId, updates) {
    console.log('🔄 Updating subprocess:', subprocessId, updates);
    
    const { data, error } = await supabase
      .from('subprocesses')
      .update({
        ...updates,
        updated_at: new Date().toISOString()
      })
      .eq('id', subprocessId)
      .select()
      .single()
    
    if (error) {
      console.error('❌ Error updating subprocess:', error);
      throw error
    }
    
    console.log('✅ Subprocess updated:', data);
    return data
  },

  // ✅ MISSING FUNCTION: Delete subprocess (CASCADE will delete time_readings)
  async deleteSubprocess(subprocessId) {
    console.log('🗑️ Deleting subprocess:', subprocessId);
    
    const { error } = await supabase
      .from('subprocesses')
      .delete()
      .eq('id', subprocessId)
    
    if (error) {
      console.error('❌ Error deleting subprocess:', error);
      throw error
    }
    
    console.log('✅ Subprocess deleted successfully');
    return true
  },

  async deleteTimeReading(readingId) {
    console.log('🗑️ Deleting time reading:', readingId);
    
    const { error } = await supabase
      .from('time_readings')
      .delete()
      .eq('id', readingId)
    
    if (error) {
      console.error('❌ Error deleting time reading:', error);
      throw error
    }
    
    console.log('✅ Time reading deleted successfully');
    return true
  },
  async updateTimeReading(readingId, updates) {
    console.log('🔄 Updating time reading:', readingId, updates);
    
    const { data, error } = await supabase
      .from('time_readings')
      .update({
        ...updates,
        updated_at: new Date().toISOString()
      })
      .eq('id', readingId)
      .select()
      .single()
    
    if (error) {
      console.error('❌ Error updating time reading:', error);
      throw error
    }
    
    console.log('✅ Time reading updated:', data);
    return data
  },

  // =================== PROJECT-SPECIFIC TIME RECORDINGS ===================

  // Save time reading for a specific project's subprocess
  async saveTimeReading(processId, subprocessId, timeData) {
    const reading = {
      process_id: processId,
      subprocess_id: subprocessId,
      time_milliseconds: timeData.time || timeData.timeMilliseconds,
      start_time: timeData.startTime,
      end_time: timeData.endTime,
      remarks: timeData.remarks || '',
      activity_type: timeData.activityType || '',
      person_count: timeData.personCount || 1,
      production_qty: timeData.productionQty || 0,
      rating: timeData.rating || 100
    };

    const { error } = await supabase
      .from('time_readings')
      .insert([reading]);
  
    if (error) {
      console.error('Error saving time reading:', error);
      throw error;
    }
  
    return reading;
  },

  // Get time readings for a specific PROJECT only
  async getTimeReadingsForProject(projectId) {
    console.log('🔍 Getting time readings for project:', projectId);
    
    const { data, error } = await supabase
      .from('time_readings')
      .select(`
        *,
        processes!inner (
          id,
          name,
          project_id
        ),
        subprocesses (
          id,
          name
        )
      `)
      .eq('processes.project_id', projectId)  // ✅ Only get readings for THIS project
      .order('created_at', { ascending: false })
      .limit(500)
    
    if (error) {
      console.error('Error getting project time readings:', error)
      return []
    }
    
    console.log('✅ Time readings for project:', (data || []).length);
    return data || []
  },

  // Get time readings for a specific process (within current project)
  async getTimeReadings(processId) {
    const { data, error } = await supabase
      .from('time_readings')
      .select(`
        *,
        subprocesses (name),
        processes (name)
      `)
      .eq('process_id', processId)
      .order('created_at', { ascending: false })
      .limit(100)
    
    if (error) {
      console.error('Error getting time readings:', error)
      return []
    }
    return data || []
  },

  // Get subprocess readings
  async getSubprocessReadings(subprocessId, limit = 50) {
    const { data, error } = await supabase
      .from('time_readings')
      .select('*')
      .eq('subprocess_id', subprocessId)
      .order('created_at', { ascending: false })
      .limit(limit)
    
    if (error) {
      console.error('Error getting subprocess readings:', error)
      return []
    }
    return data || []
  },

  // =================== ADVANCED OPERATIONS ===================

  // Update subprocess properties (for form data)
  async updateSubprocessProperties(subprocessId, properties) {
    console.log('🔄 Updating subprocess properties:', subprocessId, properties);
    
    const { data, error } = await supabase
      .from('subprocesses')
      .update({
        activity_type: properties.activityType,
        person_count: properties.personCount,
        production_qty: properties.productionQty,
        rating: properties.rating,
        updated_at: new Date().toISOString()
      })
      .eq('id', subprocessId)
      .select()
      .single()
    
    if (error) {
      console.error('❌ Error updating subprocess properties:', error);
      throw error
    }
    
    console.log('✅ Subprocess properties updated:', data);
    return data
  },

  // Delete time reading
  async deleteTimeReading(readingId) {
    console.log('🗑️ Deleting time reading:', readingId);
    
    const { error } = await supabase
      .from('time_readings')
      .delete()
      .eq('id', readingId)
    
    if (error) {
      console.error('❌ Error deleting time reading:', error);
      throw error
    }
    
    console.log('✅ Time reading deleted successfully');
    return true
  },

  // Update time reading
  async updateTimeReading(readingId, updates) {
    console.log('🔄 Updating time reading:', readingId, updates);
    
    const { data, error } = await supabase
      .from('time_readings')
      .update({
        ...updates,
        updated_at: new Date().toISOString()
      })
      .eq('id', readingId)
      .select()
      .single()
    
    if (error) {
      console.error('❌ Error updating time reading:', error);
      throw error
    }
    
    console.log('✅ Time reading updated:', data);
    return data
  },

  // =================== PROJECT STATISTICS ===================

  // Get statistics for a specific project
  async getProjectStats(projectId) {
    const [processCount, subprocessCount, readingCount] = await Promise.all([
      supabase.from('processes').select('*', { count: 'exact', head: true }).eq('project_id', projectId),
      supabase.from('subprocesses').select('sp.*, p.project_id', { count: 'exact', head: true })
        .from('subprocesses as sp')
        .join('processes as p', 'p.id', 'sp.process_id')
        .eq('p.project_id', projectId),
      supabase.from('time_readings').select('tr.*, p.project_id', { count: 'exact', head: true })
        .from('time_readings as tr') 
        .join('processes as p', 'p.id', 'tr.process_id')
        .eq('p.project_id', projectId)
    ]);

    return {
      totalProcesses: processCount.count || 0,
      totalSubprocesses: subprocessCount.count || 0,
      totalReadings: readingCount.count || 0
    };
  },

  // Get user statistics (all projects)
  async getUserStats() {
    const { data: user } = await supabase.auth.getUser()
    if (!user.user) return null;

    const [projectCount, processCount, subprocessCount, readingCount] = await Promise.all([
      supabase.from('projects').select('*', { count: 'exact', head: true }).eq('user_id', user.user.id),
      supabase.from('processes').select('*', { count: 'exact', head: true }).eq('user_id', user.user.id),
      supabase.from('subprocesses').select('*', { count: 'exact', head: true }),
      supabase.from('time_readings').select('*', { count: 'exact', head: true })
    ]);

    return {
      totalProjects: projectCount.count || 0,
      totalProcesses: processCount.count || 0,
      totalSubprocesses: subprocessCount.count || 0,
      totalReadings: readingCount.count || 0
    };
  }
}

// Authentication functions
export const auth = {
  async signUp(email, password) {
    const { data, error } = await supabase.auth.signUp({
      email: email.trim(),
      password: password,
      options: {
        emailRedirectTo: `${window.location.origin}/auth/callback`
      }
    })
    
    if (error) {
      return { success: false, error: error.message }
    }
    
    return { 
      success: true, 
      user: data.user,
      needsConfirmation: !data.user?.email_confirmed_at
    }
  },
  
  async signIn(email, password) {
    const { data, error } = await supabase.auth.signInWithPassword({
      email: email.trim(),
      password: password
    })
    
    if (error) {
      return { success: false, error: error.message }
    }
    
    return { success: true, user: data.user }
  },

  async signOut() {
    const { error } = await supabase.auth.signOut()
    if (error) {
      throw error
    }
  },

  async getCurrentUser() {
    const { data: { user }, error } = await supabase.auth.getUser()
    if (error) {
      return null
    }
    return user
  },

  onAuthChange(callback) {
    return supabase.auth.onAuthStateChange(callback)
  },

  // Reset password
  async resetPassword(email) {
    const { data, error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`
    })
    
    if (error) {
      return { success: false, error: error.message }
    }
    
    return { success: true, data }
  },

  // Update password
  async updatePassword(newPassword) {
    const { data, error } = await supabase.auth.updateUser({
      password: newPassword
    })
    
    if (error) {
      return { success: false, error: error.message }
    }
    
    return { success: true, user: data.user }
  }
}
