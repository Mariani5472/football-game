import { dashboardData } from "../data/dashboard.data";

export function useDashboard() {
  return {
    data: dashboardData,
    isLoading: false,
  };
}
