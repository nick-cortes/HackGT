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

        // Get all unique drug IDs from patient's prescriptions
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

        // Convert API publications to Timeline format, filtering by prescription start date
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
            title: pub.title,
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
          summary: `Patient started taking ${prescription.drug.name} on ${prescription.startDate}`,
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
      <div className="h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading patients...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <p className="text-red-600 mb-4">Error: {error}</p>
          <button 
            onClick={() => window.location.reload()} 
            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen bg-gray-50 flex overflow-hidden">
      {/* Sidebar */}
      <div className="w-80 bg-white shadow-lg flex flex-col">
        {/* Sidebar Header */}
        <div className="p-6 border-b">
          <h1 className="text-2xl font-bold text-gray-900">Patient Dashboard</h1>
        </div>
        
        {/* Patient List */}
        <div className="flex-1 p-6 overflow-y-auto">
          {patients.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-gray-500">No patients found</p>
            </div>
          ) : (
            <div className="space-y-2">
              {patients.map((patient) => (
                <div key={patient.id} className="space-y-2">
                  {/* Patient Button */}
                  <button
                    onClick={() => {
                      setSelectedPatientId(patient.id);
                      setSelectedDrugId(''); // Reset drug selection
                    }}
                    className={`w-full p-3 text-left rounded-lg border-2 transition-all ${
                      selectedPatientId === patient.id
                        ? 'border-blue-500 bg-blue-50 text-blue-900'
                        : 'border-gray-200 bg-white hover:border-gray-300 hover:bg-gray-50'
                    }`}
                  >
                    <div className="font-medium">{patient.name}</div>
                    <div className="text-sm text-gray-500">
                      {patient.prescriptions.length} prescription{patient.prescriptions.length !== 1 ? 's' : ''}
                    </div>
                  </button>

                  {/* Drug Buttons (only show if this patient is selected) */}
                  {selectedPatientId === patient.id && patient.prescriptions.length > 0 && (
                    <div className="ml-4 space-y-1">
                      <button
                        onClick={() => setSelectedDrugId('')}
                        className={`w-full p-2 text-left text-sm rounded border transition-all ${
                          selectedDrugId === ''
                            ? 'border-green-500 bg-green-50 text-green-900'
                            : 'border-gray-200 bg-white hover:border-gray-300'
                        }`}
                      >
                        All Drugs ({patient.prescriptions.length})
                      </button>
                      {patient.prescriptions.map((prescription) => (
                        <button
                          key={prescription.id}
                          onClick={() => setSelectedDrugId(prescription.drug.id)}
                          className={`w-full p-2 text-left text-sm rounded border transition-all ${
                            selectedDrugId === prescription.drug.id
                              ? 'border-green-500 bg-green-50 text-green-900'
                              : 'border-gray-200 bg-white hover:border-gray-300'
                          }`}
                        >
                          {prescription.drug.name}
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

      {/* Main Content */}
      <div className="flex-1 p-8 min-w-0 overflow-y-auto">
        {selectedPatient ? (
          <div className="flex flex-col h-full">
            <div className="mb-6">
              <h2 className="text-3xl font-bold text-gray-900">
                Timeline for {selectedPatient.name}
              </h2>
              {selectedDrugId && (
                <p className="text-gray-600 mt-2">
                  Showing publications for: {availableDrugs.find(d => d.id === selectedDrugId)?.name}
                </p>
              )}
              {!selectedDrugId && (
                <p className="text-gray-600 mt-2">
                  Showing publications for all drugs ({availableDrugs.length} drugs)
                </p>
              )}
            </div>
            
            {/* Timeline */}
            {publicationsLoading ? (
              <div className="flex flex-1 items-center justify-center bg-gray-100 rounded-lg">
                <div className="text-center">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
                  <p className="mt-2 text-gray-600">Loading publications...</p>
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
              <p className="text-gray-500 text-lg">Select a patient to view their timeline</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}