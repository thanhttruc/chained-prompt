import axiosInstance from './axiosInstance'
import { Bill } from './types'

export interface BillsResponse {
  data: Bill[]
}

export const billService = {
  // Lấy danh sách hóa đơn sắp tới của user
  getUpcomingBills: async (): Promise<BillsResponse> => {
    const response = await axiosInstance.get<BillsResponse>('/v1/bills')
    return response.data
  },
}
