import axiosInstance from './axiosInstance'
import { ApiResponse, Goal, GoalsResponse } from './types'

export const goalService = {
  // Lấy danh sách mục tiêu của user
  getGoals: async (): Promise<ApiResponse<GoalsResponse>> => {
    const response = await axiosInstance.get('/v1/goals')
    return response.data
  },

  // Lấy chi tiết một mục tiêu
  getGoal: async (goalId: number): Promise<ApiResponse<Goal>> => {
    const response = await axiosInstance.get(`/goals/${goalId}`)
    return response.data
  },

  // Tạo mục tiêu mới
  createGoal: async (data: {
    goal_type: 'Saving' | 'Expense_Limit'
    category_id?: number | null
    start_date: string
    end_date: string
    target_amount: number
  }): Promise<{ message: string; goal_id: number }> => {
    const response = await axiosInstance.post('/v1/goals', data)
    return response.data
  },

  // Cập nhật mục tiêu
  updateGoal: async (
    goalId: number,
    data: { target_amount: number },
  ): Promise<{ message: string; updated_goal: { goal_id: number; target_amount: number } }> => {
    const response = await axiosInstance.put(`/v1/goals/${goalId}`, data)
    return response.data
  },

  // Xóa mục tiêu
  deleteGoal: async (goalId: number): Promise<ApiResponse<void>> => {
    const response = await axiosInstance.delete(`/goals/${goalId}`)
    return response.data
  },
}

