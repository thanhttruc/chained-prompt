import axiosInstance from './axiosInstance'
import type { SavingsSummaryResponse } from './types'

export const savingsService = {
  /**
   * Lấy tổng hợp tiết kiệm theo tháng cho năm được chỉ định
   * @param year - Năm cần lấy dữ liệu (mặc định là năm hiện tại)
   */
  getSavingsSummary: async (year?: number): Promise<SavingsSummaryResponse> => {
    const params = year ? { year } : {}
    const response = await axiosInstance.get<SavingsSummaryResponse>('/v1/savings/summary', {
      params,
    })
    return response.data
  },
}

