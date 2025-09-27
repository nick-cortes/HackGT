'use client';

import { useState, useEffect } from 'react';
// Make sure to import the Timeline and its types/data
import Timeline, { Publication } from '@/components/Timeline';

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

interface ApiPublication {
  id: string;
  title: string;
  url: string;
  publishedDate: string;
  drugID: string;
  drug: {
    id:string;
    name: string;
  };
}

export default function Dashboard() {
  const [patients, setPatients] = useState<Patient[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedPatientId, setSelectedPatientId] = useState<string>('');
  const [selectedDrugId, setSelectedDrugId] = useState<string>('');
  const [timelinePublications, setTimelinePublications] = useState<Publication[]>([]);
  const [publicationsLoading, setPublicationsLoading] = useState(false);

  // Fetch real patients from API
  useEffect(() => {
    const fetchPatients = async () => {
      try {
        setLoading(true);
        const response = await fetch('/api/patients');
        if (!response.ok) {
          throw new Error('Failed to fetch patients');
        }
        const data = await response.json();
        setPatients(data);
        if (data.length > 0) {
          setSelectedPatientId(data[0].id);
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to fetch patients');
        console.error('Error fetching patients:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchPatients();
  }, []);

  // Fetch publications when patient or drug selection changes
  useEffect(() => {
    const fetchPublications = async () => {
      if (!selectedPatientId) {
        setTimelinePublications([]);
        return;
      }

      try {
        setPublicationsLoading(true);
        const selectedPatient = patients.find(p => p.id === selectedPatientId);
        if (!selectedPatient) return;

        // STEP 1: Update database with publications from intern
        console.log('Step 1: Updating database with publications from intern...');
        try {
          const updateResponse = await fetch('/api/publications/fetch-pubmed', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({ patientId: selectedPatientId, drugId: selectedDrugId }),
          });
          
          if (updateResponse.ok) {
            const updateResult = await updateResponse.json();
            console.log('Database updated with publications:', updateResult);
          } else {
            console.warn('Failed to update database with publications:', await updateResponse.text());
          }
        } catch (error) {
          console.error('Error updating database with publications:', error);
          // Continue with existing data even if update fails
        }

        // STEP 2: Search database for publications by drug
        console.log('Step 2: Searching database for publications by drug...');
        const drugIds = [...new Set(selectedPatient.prescriptions.map(p => p.drug.id))];
        
        // Fetch publications for each drug
        const allPublications: ApiPublication[] = [];
        for (const drugId of drugIds) {
          const response = await fetch(`/api/publications?drugId=${drugId}`);
          if (response.ok) {
            const publications = await response.json();
            allPublications.push(...publications);
          }
        }

        // STEP 3: Filter publications by date
        console.log('Step 3: Filtering publications by prescription start date...');
        const timelineData: Publication[] = allPublications
          .filter(pub => {
            // Find the prescription for this drug
            const prescription = selectedPatient.prescriptions.find(p => p.drug.id === pub.drugID);
            if (!prescription) return false;
            
            // Only include publications published after prescription start date
            const publicationDate = new Date(pub.publishedDate);
            const prescriptionStartDate = new Date(prescription.startDate);
            return publicationDate >= prescriptionStartDate;
          })
          .map(pub => ({
            id: pub.id,
            title: pub.drug.name,
            date: pub.publishedDate.split('T')[0], // Convert ISO date to YYYY-MM-DD
            pdfUrl: pub.url,
            summary: `Publication about ${pub.drug.name}`
          }));

        // Add prescription start markers
        const prescriptionMarkers: Publication[] = selectedPatient.prescriptions.map(prescription => ({
          id: `prescription-${prescription.id}`,
          title: `Start of ${prescription.drug.name}`,
          date: prescription.startDate,
          pdfUrl: '#',
          summary: `Patient started taking ${prescription.drug.name} on ${prescription.startDate.split('T')[0]}`,
          isPrescriptionMarker: true
        }));

        // Combine publications and prescription markers
        const allTimelineData = [...timelineData, ...prescriptionMarkers];
        setTimelinePublications(allTimelineData);
      } catch (err) {
        console.error('Error fetching publications:', err);
        setTimelinePublications([]);
      } finally {
        setPublicationsLoading(false);
      }
    };

    fetchPublications();
  }, [selectedPatientId, patients]);

  const selectedPatient = patients.find(p => p.id === selectedPatientId);
  const availableDrugs = selectedPatient?.prescriptions.map(p => p.drug) || [];

  // Filter publications by selected drug if one is selected
  const filteredPublications = selectedDrugId 
    ? timelinePublications.filter(pub => {
        const selectedPatient = patients.find(p => p.id === selectedPatientId);
        const selectedDrug = selectedPatient?.prescriptions.find(p => p.drug.id === selectedDrugId)?.drug;
        return pub.summary.includes(selectedDrug?.name || '');
      })
    : timelinePublications;

  if (loading) {
    return (
      <div className="h-screen bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-500 mx-auto"></div>
          <p className="mt-4 text-gray-300">Loading patients...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="h-screen bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <p className="text-red-400 mb-4">Error: {error}</p>
          <button 
            onClick={() => window.location.reload()} 
            className="px-4 py-2 bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 text-white rounded hover:from-indigo-600 hover:via-purple-600 hover:to-pink-600 transition-all duration-300"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen bg-gray-900 flex overflow-hidden">
      {/* Sidebar */}
      <div className="w-80 bg-gray-800 shadow-lg border-r border-gray-700">
        <div className="p-6 border-b border-gray-700">
          <h1 className="text-2xl font-bold text-white">Patient Dashboard</h1>
        </div>
        
        <div className="p-6">
          {/* Patient List */}
          <div>
            {patients.length === 0 ? (
              <div className="text-center py-8">
                <p className="text-gray-400">No patients found</p>
                <p className="text-gray-500 text-sm mt-1">Add some patients to get started</p>
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
                      className={`w-full text-left px-3 py-2 rounded-md transition-all duration-300 ${
                        selectedPatientId === patient.id
                          ? 'bg-indigo-600 text-white border border-indigo-500'
                          : 'hover:bg-gray-700 text-gray-300'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-medium">{patient.name}</span>
                        <div className="flex items-center space-x-2">
                          <span className={`text-xs ${
                            selectedPatientId === patient.id ? 'text-indigo-200' : 'text-gray-400'
                          }`}>
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
                          className={`w-full text-left px-3 py-2 text-sm rounded-md transition-all duration-300 ${
                            selectedDrugId === ''
                              ? 'bg-purple-600 text-white border border-purple-500'
                              : 'hover:bg-gray-700 text-gray-300'
                          }`}
                        >
                          All Drugs ({patient.prescriptions.length})
                        </button>
                        
                        {/* Individual Drug Options */}
                        {availableDrugs.map((drug) => (
                          <button
                            key={drug.id}
                            onClick={() => setSelectedDrugId(drug.id)}
                            className={`w-full text-left px-3 py-2 text-sm rounded-md transition-all duration-300 ${
                              selectedDrugId === drug.id
                                ? 'bg-purple-600 text-white border border-purple-500'
                                : 'hover:bg-gray-700 text-gray-300'
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

      {/* Main Content */}
      <div className="flex-1 p-8 min-w-0 overflow-y-auto bg-gray-900">
        {selectedPatient ? (
          <div className="flex flex-col h-full">
            <div className="mb-6">
              <h2 className="text-3xl font-bold bg-gradient-to-r from-indigo-400 via-purple-400 to-pink-400 bg-clip-text text-transparent">
                Timeline for {selectedPatient.name}
              </h2>
              {selectedDrugId && (
                <p className="text-gray-300 mt-2">
                  Showing publications for: <span className="text-purple-400 font-medium">{availableDrugs.find(d => d.id === selectedDrugId)?.name}</span>
                </p>
              )}
              {!selectedDrugId && (
                <p className="text-gray-300 mt-2">
                  Showing publications for all drugs (<span className="text-indigo-400 font-medium">{availableDrugs.length} drugs</span>)
                </p>
              )}
            </div>
            
            {/* Timeline */}
            {publicationsLoading ? (
              <div className="flex flex-1 items-center justify-center bg-gray-800 rounded-lg border border-gray-700">
                <div className="text-center">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-500 mx-auto"></div>
                  <p className="mt-2 text-gray-300">Loading publications...</p>
                </div>
              </div>
            ) : (
              <div className="flex-1">
                <Timeline publications={filteredPublications} />
              </div>
            )}
          </div>
        ) : (
          <div className="flex items-center justify-center h-full">
            <div className="text-center">
              <p className="text-gray-400 text-lg">Select a patient to view their timeline</p>
              <p className="text-gray-500 text-sm mt-2">Choose a patient from the sidebar to get started</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}