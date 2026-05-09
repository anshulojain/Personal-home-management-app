/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { MaintenanceItem, MaintenanceState } from "../types";
import { INITIAL_CATEGORIES } from "../constants";

const STORAGE_KEY = "nestcare_data";

export const loadData = (): MaintenanceState => {
  const saved = localStorage.getItem(STORAGE_KEY);
  if (saved) {
    try {
      return JSON.parse(saved);
    } catch (e) {
      console.error("Failed to parse saved data", e);
    }
  }
  return {
    items: [],
    categories: INITIAL_CATEGORIES,
  };
};

export const saveData = (state: MaintenanceState) => {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
};

export const calculateNextChangeDate = (lastDate: string, frequencyMonths: number): Date => {
  const date = new Date(lastDate);
  date.setMonth(date.getMonth() + frequencyMonths);
  return date;
};

export const isDue = (nextDate: Date): boolean => {
  const now = new Date();
  return nextDate <= now;
};

export const getStatus = (nextDate: Date) => {
  const now = new Date();
  const diffDays = Math.ceil((nextDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
  
  if (diffDays < 0) return "overdue";
  if (diffDays <= 14) return "soon";
  return "ok";
};
