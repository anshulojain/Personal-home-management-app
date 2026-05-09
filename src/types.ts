/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export interface MaintenanceItem {
  id: string;
  name: string;
  categoryId: string;
  type: string; // e.g., "RO", "Oil Change"
  lastChangeDate: string; // ISO string
  frequencyMonths: number;
  referenceLink?: string;
  notes?: string;
}

export interface Category {
  id: string;
  name: string;
  icon: string;
}

export interface MaintenanceState {
  items: MaintenanceItem[];
  categories: Category[];
}
