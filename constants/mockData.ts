import { Visitor } from '../types';

export const initialVisitors: Visitor[] = [
  {
    id: 'VIS-1001',
    fullName: 'Adebayo Olumide',
    phone: '08031234567',
    purpose: 'Family visit',
    expectedAt: new Date(Date.now() + 3600000).toISOString(),
    houseNumber: 'A12',
    residentName: 'Grace Adebayo',
    residentPhone: '08035550121',
    status: 'EXPECTED',
    entryToken: 'EV-ENTRY-7K2P',
    createdAt: new Date().toISOString(),
  },

  {
    id: 'VIS-1002',
    fullName: 'Chiamaka Okoro',
    phone: '08069876543',
    purpose: 'Delivery',
    expectedAt: new Date().toISOString(),
    houseNumber: 'B04',
    residentName: 'David Okoro',
    residentPhone: '08035550122',
    status: 'INSIDE',
    entryToken: 'EV-ENTRY-9M4Q',
    createdAt: new Date().toISOString(),
    entryAt: new Date(Date.now() - 45 * 60000).toISOString(),
    entryOfficer: 'SG-002',
  },
];