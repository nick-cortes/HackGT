'use client';

import { useState, useEffect } from 'react';
import Timeline from '@/components/Timeline';

interface Patient {
  id: string;
  name: string;
  prescriptions: Array<{
    id: string;
    startDate: string;
    drug: {
      id: string;
      name: string;
    };
  }>;
}

export default function Dashboard() {
  const [patients, setPatients] = useState<Patient[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedPatientId, setSelectedPatientId] = useState<string>('');
  const [selectedDrugId, setSelectedDrugId] = useState<string>('');

  useEffect(() => {
    const fetchPatients = async () => {
      try {
        const response = await fetch('/api/patients');
        if (!response.ok) {
          throw new Error('Failed to fetch patients');
        }
        const data = await response.json();
        setPatients(data);
        // Auto-select first patient if available
        if (data.length > 0) {
          setSelectedPatientId(data[0].id);
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'An error occurred');
      } finally {
        setLoading(false);
      }
    };

    fetchPatients();
  }, []);

  // Get selected patient data
  const selectedPatient = patients.find(p => p.id === selectedPatientId);
  
  // Get unique drugs from selected patient's prescriptions
  const availableDrugs = selectedPatient?.prescriptions.map(p => p.drug) || [];

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading patients...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <p className="text-red-600">Error: {error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 flex">
      {/* Sidebar */}
      <div className="w-80 bg-white shadow-lg">
        <div className="p-6 border-b">
          <h1 className="text-2xl font-bold text-gray-900">Patient Dashboard</h1>
        </div>
        
        <div className="p-6">
          {/* Patient List */}
          <div>
            {patients.length === 0 ? (
              <div className="text-center py-8">
                <p className="text-gray-500">No patients found</p>
                <p className="text-gray-400 text-sm mt-1">Add some patients to get started</p>
              </div>
            ) : (
              <div className="space-y-1">
                {patients.map((patient) => (
                  <div key={patient.id}>
                    {/* Patient Button */}
                    <button
                      onClick={() => {
                        setSelectedPatientId(patient.id === selectedPatientId ? '' : patient.id);
                        setSelectedDrugId(''); // Reset drug selection when patient changes
                      }}
                      className={`w-full text-left px-3 py-2 rounded-md transition-colors ${
                        selectedPatientId === patient.id
                          ? 'bg-blue-100 text-blue-900 border border-blue-200'
                          : 'hover:bg-gray-100 text-gray-700'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-medium">{patient.name}</span>
                        <div className="flex items-center space-x-2">
                          <span className="text-xs text-gray-500">
                            {patient.prescriptions.length} Rx
                          </span>
                          <svg
                            className={`h-4 w-4 transition-transform ${
                              selectedPatientId === patient.id ? 'rotate-90' : ''
                            }`}
                            fill="none"
                            viewBox="0 0 24 24"
                            stroke="currentColor"
                          >
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                          </svg>
                        </div>
                      </div>
                    </button>

                    {/* Drug Options - Show when patient is selected */}
                    {selectedPatientId === patient.id && patient.prescriptions.length > 0 && (
                      <div className="ml-4 mt-2 space-y-1">
                        {/* All Drugs Option */}
                        <button
                          onClick={() => setSelectedDrugId('')}
                          className={`w-full text-left px-3 py-2 text-sm rounded-md transition-colors ${
                            selectedDrugId === ''
                              ? 'bg-green-100 text-green-900 border border-green-200'
                              : 'hover:bg-gray-50 text-gray-600'
                          }`}
                        >
                          All Drugs ({patient.prescriptions.length})
                        </button>
                        
                        {/* Individual Drug Options */}
                        {availableDrugs.map((drug) => (
                          <button
                            key={drug.id}
                            onClick={() => setSelectedDrugId(drug.id)}
                            className={`w-full text-left px-3 py-2 text-sm rounded-md transition-colors ${
                              selectedDrugId === drug.id
                                ? 'bg-green-100 text-green-900 border border-green-200'
                                : 'hover:bg-gray-50 text-gray-600'
                            }`}
                          >
                            <div className="flex items-center justify-between">
                              <span>{drug.name}</span>
                            </div>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 p-8">
        {selectedPatient ? (
          <div>
            <div className="mb-6">
              <h2 className="text-3xl font-bold text-gray-900">
                Timeline for {selectedPatient.name}
              </h2>
              {selectedDrugId && (
                <p className="text-gray-600 mt-2">
                  Showing prescriptions for: {availableDrugs.find(d => d.id === selectedDrugId)?.name}
                </p>
              )}
            </div>
            
            {/* Timeline Component */}
            <Timeline />
          </div>
        ) : (
          <div className="flex items-center justify-center h-full">
            <div className="text-center">
              <div className="text-gray-400 mb-4">
                <svg className="mx-auto h-16 w-16" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                </svg>
              </div>
              <h3 className="text-lg font-medium text-gray-900 mb-2">No Patient Selected</h3>
              <p className="text-gray-500">Select a patient from the sidebar to view their timeline</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
