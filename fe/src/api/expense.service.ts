import axiosInstance from './axiosInstance'
import type { ExpenseSummaryItem, ExpenseSummaryResponse, ExpenseBreakdownResponse } from './types'

export const expenseService = {
  /**
   * Lấy tổng hợp chi tiêu theo tháng trong năm hiện tại
   */
  getExpenseSummary: async (): Promise<ExpenseSummaryResponse> => {
    const response = await axiosInstance.get<ExpenseSummaryResponse>('/v1/expenses/summary')
    return response.data
  },

  /**
   * Lấy breakdown chi tiêu theo danh mục cho một tháng cụ thể
   * @param month - Chuỗi tháng định dạng 'YYYY-MM' (ví dụ: '2025-11')
   */
  getExpensesBreakdown: async (month: string): Promise<ExpenseBreakdownResponse> => {
    const response = await axiosInstance.get<ExpenseBreakdownResponse>('/v1/expenses/breakdown', {
      params: { month },
    })
    return response.data
  },
}

