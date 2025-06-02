// src/utils/excelExport.js
// Advanced Excel export with multiple sheets and calculations

import * as XLSX from 'xlsx';

// Calculate frequencies for cycle time analysis
function calculateFrequencies(processes) {
  const allFrequencies = {};
  
  processes.forEach(process => {
    if (!process.subprocesses || process.subprocesses.length === 0) {
      allFrequencies[process.name] = {};
      return;
    }
    
    allFrequencies[process.name] = {};
    const subprocessCounts = {};
    const subprocessNames = new Set();
    
    // Get all subprocess names
    process.subprocesses.forEach(subprocess => {
      subprocessNames.add(subprocess.name);
    });
    
    // Count readings for each subprocess
    Array.from(subprocessNames).forEach(subprocessName => {
      const subprocess = process.subprocesses.find(sub => sub.name === subprocessName);
      const readings = subprocess?.time_readings || [];
      subprocessCounts[subprocessName] = readings.length;
    });
    
    const cycleValues = Object.values(subprocessCounts);
    
    if (cycleValues.length === 0) {
      return;
    }
    
    const maxCycleCount = Math.max(...cycleValues);
    
    if (maxCycleCount === 0) {
      return;
    }
    
    // Calculate frequency ratios
    Object.keys(subprocessCounts).forEach(subprocessName => {
      const count = subprocessCounts[subprocessName];
      
      if (count === 0) {
        allFrequencies[process.name][subprocessName] = {
          occurrences: 1,
          units: 1
        };
        return;
      }
      
      const unitsPerOccurrence = maxCycleCount / count;
      
      allFrequencies[process.name][subprocessName] = {
        occurrences: 1,
        units: unitsPerOccurrence
      };
    });
  });
  
  return allFrequencies;
}

// Main export function
export async function exportToAdvancedExcel(processes, filename = 'time-motion-study') {
  try {
    // Ensure XLSX is available
    if (typeof XLSX === 'undefined') {
      throw new Error('XLSX library not available. Please install xlsx package.');
    }

    // Calculate frequencies for all processes
    const allFrequencies = calculateFrequencies(processes);
    
    // Create workbook
    const wb = XLSX.utils.book_new();
    
    // --- SHEET 1: Detailed Readings ---
    const allReadings = [];
    
    processes.forEach(process => {
      if (process.subprocesses && process.subprocesses.length > 0) {
        process.subprocesses.forEach(subprocess => {
          if (subprocess.time_readings && subprocess.time_readings.length > 0) {
            subprocess.time_readings.forEach(reading => {
              const timeInSeconds = Math.round(reading.time_milliseconds / 1000);
              
              allReadings.push({
                "Process": process.name,
                "Subprocess": subprocess.name,
                "Activity Type": reading.activity_type || "",
                "Persons Required": reading.person_count || 1,
                "Production Quantity": reading.production_qty || 0,
                "Rating (%)": reading.rating || 100,
                "Time (seconds)": timeInSeconds,
                "Remarks": reading.remarks || "",
                "Start Time": new Date(reading.start_time).toLocaleString(),
                "End Time": new Date(reading.end_time).toLocaleString(),
                "Recorded At": new Date(reading.created_at).toLocaleString()
              });
            });
          }
        });
      }
    });
    
    // Create detailed worksheet
    const detailedWs = XLSX.utils.json_to_sheet(allReadings);
    XLSX.utils.book_append_sheet(wb, detailedWs, 'Detailed Readings');
    
    // --- SHEET 2: Process Summary with Calculations ---
    const summaryData = [];
    
    processes.forEach(process => {
      if (process.subprocesses && process.subprocesses.length > 0) {
        // Get frequencies for this process
        const processFrequencies = allFrequencies[process.name] || {};
        
        // Group readings by subprocess
        const subprocessMap = {};
        
        process.subprocesses.forEach(subprocess => {
          if (subprocess.time_readings && subprocess.time_readings.length > 0) {
            const subprocessName = subprocess.name;
            const frequency = processFrequencies[subprocessName] || { occurrences: 1, units: 1 };
            
            // Calculate times and metrics
            const times = subprocess.time_readings.map(reading => 
              Math.round(reading.time_milliseconds / 1000)
            );
            
            const totalTimeSec = times.reduce((sum, time) => sum + time, 0);
            const avgTimeSec = times.length > 0 ? totalTimeSec / times.length : 0;
            
            // Get latest subprocess data
            const latestReading = subprocess.time_readings[subprocess.time_readings.length - 1];
            const productionQty = Math.max(latestReading?.production_qty || 1, 1);
            const rating = latestReading?.rating || 100;
            const activityType = latestReading?.activity_type || subprocess.activity_type || "";
            
            // Calculations based on original app formulas
            const cycleTime = avgTimeSec / productionQty;
            const basicTimeSec = cycleTime * (rating / 100);
            const effectiveTime = basicTimeSec * (frequency.occurrences / frequency.units);
            
            const frequencyStr = `${frequency.occurrences}/${frequency.units.toFixed(2)}`;
            
            summaryData.push({
              "Process": process.name,
              "Subprocess": subprocessName,
              "Activity Type": activityType,
              "Average Time (sec)": avgTimeSec.toFixed(1),
              "Production Quantity": productionQty,
              "Cycle Time (sec)": cycleTime.toFixed(1),
              "Rating (%)": rating,
              "Basic Time (sec)": basicTimeSec.toFixed(1),
              "Frequency": frequencyStr,
              "Effective Time (sec)": effectiveTime.toFixed(1),
              "Number of Readings": times.length
            });
          }
        });
      }
    });
    
    if (summaryData.length > 0) {
      const summaryWs = XLSX.utils.json_to_sheet(summaryData);
      
      // Set column widths
      const wsColWidth = [
        {wch: 15}, // Process
        {wch: 20}, // Subprocess
        {wch: 12}, // Activity Type
        {wch: 15}, // Average Time (sec)
        {wch: 15}, // Production Quantity
        {wch: 15}, // Cycle Time (sec)
        {wch: 12}, // Rating (%)
        {wch: 15}, // Basic Time (sec)
        {wch: 12}, // Frequency
        {wch: 15}, // Effective Time (sec)
        {wch: 15}  // Number of Readings
      ];
      summaryWs['!cols'] = wsColWidth;
      
      XLSX.utils.book_append_sheet(wb, summaryWs, 'Process Summary');
      
      // --- SHEET 3: Activity Analysis ---
      const analysisData = [];
      
      // Calculate VA, NVA, RNVA times
      const vaTimes = summaryData.filter(item => item["Activity Type"] === "VA");
      const nvaTimes = summaryData.filter(item => item["Activity Type"] === "NVA");
      const rnvaTimes = summaryData.filter(item => item["Activity Type"] === "RNVA");
      
      const totalVATime = vaTimes.reduce((sum, item) => sum + parseFloat(item["Effective Time (sec)"]), 0);
      const totalNVATime = nvaTimes.reduce((sum, item) => sum + parseFloat(item["Effective Time (sec)"]), 0);
      const totalRNVATime = rnvaTimes.reduce((sum, item) => sum + parseFloat(item["Effective Time (sec)"]), 0);
      const totalTime = totalVATime + totalNVATime + totalRNVATime;
      
      analysisData.push(
        {
          "Activity Type": "Value Added (VA)",
          "Time (sec)": totalVATime.toFixed(1),
          "Percentage": totalTime > 0 ? ((totalVATime / totalTime) * 100).toFixed(1) + "%" : "0%",
          "Count of Activities": vaTimes.length
        },
        {
          "Activity Type": "Non-Value Added (NVA)",
          "Time (sec)": totalNVATime.toFixed(1),
          "Percentage": totalTime > 0 ? ((totalNVATime / totalTime) * 100).toFixed(1) + "%" : "0%",
          "Count of Activities": nvaTimes.length
        },
        {
          "Activity Type": "Required Non-Value Added (RNVA)",
          "Time (sec)": totalRNVATime.toFixed(1),
          "Percentage": totalTime > 0 ? ((totalRNVATime / totalTime) * 100).toFixed(1) + "%" : "0%",
          "Count of Activities": rnvaTimes.length
        },
        {
          "Activity Type": "TOTAL",
          "Time (sec)": totalTime.toFixed(1),
          "Percentage": "100%",
          "Count of Activities": summaryData.length
        }
      );
      
      const analysisWs = XLSX.utils.json_to_sheet(analysisData);
      
      const analysisColWidth = [
        {wch: 30}, // Activity Type
        {wch: 15}, // Time (sec)
        {wch: 15}, // Percentage
        {wch: 20}  // Count of Activities
      ];
      analysisWs['!cols'] = analysisColWidth;
      
      XLSX.utils.book_append_sheet(wb, analysisWs, 'Activity Analysis');
      
      // --- SHEET 4: Process Statistics ---
      const statsData = [];
      
      processes.forEach(process => {
        if (process.subprocesses && process.subprocesses.length > 0) {
          const processReadings = process.subprocesses.flatMap(sub => sub.time_readings || []);
          const processEffectiveTime = summaryData
            .filter(item => item.Process === process.name)
            .reduce((sum, item) => sum + parseFloat(item["Effective Time (sec)"]), 0);
          
          const vaCount = summaryData.filter(item => item.Process === process.name && item["Activity Type"] === "VA").length;
          const nvaCount = summaryData.filter(item => item.Process === process.name && item["Activity Type"] === "NVA").length;
          const rnvaCount = summaryData.filter(item => item.Process === process.name && item["Activity Type"] === "RNVA").length;
          
          statsData.push({
            "Process": process.name,
            "Total Subprocesses": process.subprocesses.length,
            "Total Readings": processReadings.length,
            "Total Effective Time (sec)": processEffectiveTime.toFixed(1),
            "VA Activities": vaCount,
            "NVA Activities": nvaCount,
            "RNVA Activities": rnvaCount,
            "Efficiency (VA/Total)": vaCount > 0 ? ((vaCount / (vaCount + nvaCount + rnvaCount)) * 100).toFixed(1) + "%" : "0%"
          });
        }
      });
      
      if (statsData.length > 0) {
        const statsWs = XLSX.utils.json_to_sheet(statsData);
        XLSX.utils.book_append_sheet(wb, statsWs, 'Process Statistics');
      }
    }
    
    // Export the file
    try {
      XLSX.writeFile(wb, `${filename}.xlsx`);
      return { success: true, message: 'Excel file exported successfully!' };
    } catch (writeError) {
      // Fallback for browsers that don't support writeFile
      const wb_out = XLSX.write(wb, { bookType: 'xlsx', type: 'binary' });
      
      function s2ab(s) {
        const buf = new ArrayBuffer(s.length);
        const view = new Uint8Array(buf);
        for (let i = 0; i < s.length; i++) view[i] = s.charCodeAt(i) & 0xFF;
        return buf;
      }
      
      const blob = new Blob([s2ab(wb_out)], { type: 'application/octet-stream' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${filename}.xlsx`;
      document.body.appendChild(a);
      a.click();
      setTimeout(() => {
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
      }, 100);
      
      return { success: true, message: 'Excel file exported successfully!' };
    }
    
  } catch (error) {
    console.error('Excel export error:', error);
    return { success: false, error: error.message };
  }
}

// CSV export as fallback
export function exportToCSV(processes, filename = 'time-motion-study') {
  try {
    const allReadings = [];
    
    processes.forEach(process => {
      if (process.subprocesses && process.subprocesses.length > 0) {
        process.subprocesses.forEach(subprocess => {
          if (subprocess.time_readings && subprocess.time_readings.length > 0) {
            subprocess.time_readings.forEach(reading => {
              allReadings.push({
                "Process": process.name,
                "Subprocess": subprocess.name,
                "Activity Type": reading.activity_type || "",
                "Time (seconds)": Math.round(reading.time_milliseconds / 1000),
                "Person Count": reading.person_count || 1,
                "Production Quantity": reading.production_qty || 0,
                "Rating (%)": reading.rating || 100,
                "Remarks": reading.remarks || "",
                "Start Time": new Date(reading.start_time).toLocaleString(),
                "End Time": new Date(reading.end_time).toLocaleString(),
                "Recorded At": new Date(reading.created_at).toLocaleString()
              });
            });
          }
        });
      }
    });
    
    if (allReadings.length === 0) {
      throw new Error('No data to export');
    }
    
    // Generate CSV content
    const headers = Object.keys(allReadings[0]);
    const csvContent = [
      headers.join(','),
      ...allReadings.map(row => 
        headers.map(header => 
          `"${String(row[header]).replace(/"/g, '""')}"`
        ).join(',')
      )
    ].join('\n');
    
    // Download CSV
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `${filename}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    
    return { success: true, message: 'CSV exported successfully!' };
  } catch (error) {
    console.error('CSV export error:', error);
    return { success: false, error: error.message };
  }
}