import React, { useState, useEffect } from 'react'
import { expenseService } from '../../api/expense.service'
import { ExpenseSummaryItem } from '../../api/types'
import { formatCurrency } from '../../utils/format'

/**
 * Component hiển thị biểu đồ cột tổng hợp chi tiêu theo tháng
 */
const ExpenseSummaryChart: React.FC = () => {
  const [summaryData, setSummaryData] = useState<ExpenseSummaryItem[]>([])
  const [isLoading, setIsLoading] = useState<boolean>(true)
  const [error, setError] = useState<string | null>(null)
  const [hoveredMonth, setHoveredMonth] = useState<string | null>(null)

  /**
   * Lấy dữ liệu tổng hợp chi tiêu từ API
   */
  const fetchExpenseSummary = async () => {
    try {
      setIsLoading(true)
      setError(null)

      const response = await expenseService.getExpenseSummary()

      // Kiểm tra nếu mảng data rỗng
      if (!response.data || response.data.length === 0) {
        setSummaryData([])
        setError('Chưa có dữ liệu chi tiêu nào được ghi nhận để phân tích.')
        return
      }

      // Cập nhật state với dữ liệu nhận được
      setSummaryData(response.data)
    } catch (err: any) {
      // Xử lý lỗi API
      const errorMessage =
        err.response?.data?.error || 'Không thể tải dữ liệu chi tiêu. Vui lòng thử lại sau.'
      setError(errorMessage)
      setSummaryData([])
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    fetchExpenseSummary()
  }, [])

  /**
   * Xác định tháng hiện tại
   */
  const getCurrentMonth = (): string => {
    const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
    const currentMonthIndex = new Date().getMonth()
    return monthNames[currentMonthIndex]
  }

  /**
   * Tính chiều cao của cột dựa trên giá trị lớn nhất
   */
  const getMaxExpense = (): number => {
    if (summaryData.length === 0) return 1
    return Math.max(...summaryData.map((item) => item.totalExpense))
  }

  /**
   * Tính phần trăm chiều cao của cột
   */
  const getBarHeight = (expense: number): number => {
    const maxExpense = getMaxExpense()
    if (maxExpense === 0) return 0
    return (expense / maxExpense) * 100
  }

  /**
   * Tính toán các mốc giá trị cho trục Y
   */
  const getYAxisValues = (): number[] => {
    const maxExpense = getMaxExpense()
    if (maxExpense === 0) return [0]
    
    // Tạo 5 mốc: 0%, 25%, 50%, 75%, 100%
    const steps = [0, 0.25, 0.5, 0.75, 1]
    return steps.map((step) => step * maxExpense)
  }

  /**
   * Render skeleton loader cho biểu đồ
   */
  const renderChartSkeletonLoader = () => {
    const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
    return (
      <div className="w-full">
        <div className="mb-8">
          <div className="h-7 w-48 bg-gray-200 dark:bg-gray-700 rounded animate-pulse mb-2" />
          <div className="h-4 w-64 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
        </div>
        <div className="relative w-full h-[320px] flex items-end justify-between gap-3 px-6 pb-12">
          {monthNames.map((month) => (
            <div key={month} className="flex-1 flex flex-col items-center gap-3">
              <div
                className="w-full bg-gray-200 dark:bg-gray-700 rounded-t-lg animate-pulse"
                style={{ height: `${Math.random() * 60 + 20}%` }}
              />
              <div className="h-4 w-8 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
            </div>
          ))}
        </div>
      </div>
    )
  }

  /**
   * Render biểu đồ cột theo thiết kế Monthly Comparison
   */
  const renderChart = () => {
    const currentMonth = getCurrentMonth()
    const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
    
    // Tạo mảng đầy đủ 12 tháng với dữ liệu từ API
    const fullYearData = monthNames.map((month) => {
      const found = summaryData.find((item) => item.month === month)
      return found || { month, totalExpense: 0 }
    })

    return (
      <div className="w-full">
        {/* Tiêu đề Monthly Comparison */}
        <div className="mb-8">
          <h2 className="text-[22px] leading-[32px] font-normal text-[#878787] dark:text-gray-400 mb-2">
            Monthly Comparison
          </h2>
          <p className="text-sm text-[#878787] dark:text-gray-500">
            So sánh chi tiêu theo tháng trong năm {new Date().getFullYear()}
          </p>
        </div>

        {/* Biểu đồ container */}
        <div className="relative flex">
          {/* Trục Y - Nhãn giá trị */}
          <div className="flex flex-col justify-between h-[320px] pb-12 pr-4">
            {getYAxisValues()
              .slice()
              .reverse()
              .map((value, index) => (
                <div
                  key={index}
                  className="text-xs text-[#6B7280] dark:text-gray-500 font-medium text-right"
                  style={{ lineHeight: '1' }}
                >
                  {formatCurrency(value)}
                </div>
              ))}
          </div>

          {/* Biểu đồ chính */}
          <div className="flex-1 relative">
            {/* Grid lines cho trục Y */}
            <div className="absolute inset-0 flex flex-col justify-between pb-12">
              {[0, 25, 50, 75, 100].map((percent) => (
                <div
                  key={percent}
                  className="border-t border-gray-200 dark:border-gray-700"
                  style={{ opacity: percent === 0 ? 0 : 0.3 }}
                />
              ))}
            </div>

            {/* Biểu đồ cột */}
            <div className="relative w-full h-[320px] flex items-end justify-between gap-3 px-6 pb-12">
            {fullYearData.map((item) => {
              const isCurrentMonth = item.month === currentMonth
              const barHeight = getBarHeight(item.totalExpense)
              const isHovered = hoveredMonth === item.month

              return (
                <div
                  key={item.month}
                  className="flex-1 flex flex-col items-center gap-3 relative group h-full"
                  onMouseEnter={() => setHoveredMonth(item.month)}
                  onMouseLeave={() => setHoveredMonth(null)}
                >
                  {/* Tooltip */}
                  {isHovered && item.totalExpense > 0 && (
                    <div className="absolute bottom-full mb-3 px-4 py-2 bg-[#1A1A1A] text-white text-sm rounded-lg shadow-xl z-20 whitespace-nowrap">
                      <div className="font-semibold mb-1">{item.month}</div>
                      <div className="text-xs opacity-90">{formatCurrency(item.totalExpense)}</div>
                      <div className="absolute top-full left-1/2 transform -translate-x-1/2 border-4 border-transparent border-t-[#1A1A1A]" />
                    </div>
                  )}

                  {/* Container cho cột biểu đồ */}
                  <div className="w-full flex flex-col items-center justify-end h-full relative">
                    {/* Cột biểu đồ */}
                    <div
                      className={`w-full rounded-t-lg transition-all duration-300 cursor-pointer ${
                        isCurrentMonth
                          ? 'bg-[#10B981] hover:bg-[#059669] shadow-md'
                          : 'bg-[#D1D5DB] hover:bg-[#9CA3AF]'
                      } ${item.totalExpense === 0 ? 'opacity-20' : ''}`}
                      style={{
                        height: `${Math.max(barHeight, item.totalExpense > 0 ? 3 : 0)}%`,
                        minHeight: item.totalExpense > 0 ? '8px' : '0',
                      }}
                    />
                  </div>

                  {/* Nhãn tháng */}
                  <div
                    className={`text-xs font-medium ${
                      isCurrentMonth
                        ? 'text-[#10B981] dark:text-green-400'
                        : 'text-[#6B7280] dark:text-gray-500'
                    }`}
                  >
                    {item.month}
                  </div>

                  {/* Giá trị trên đầu cột (nếu có dữ liệu) */}
                  {item.totalExpense > 0 && isHovered && (
                    <div className="absolute bottom-[calc(100%-8px)] left-1/2 transform -translate-x-1/2 -translate-y-full mb-2">
                      <div className="text-xs font-semibold text-gray-700 dark:text-gray-300 whitespace-nowrap">
                        {formatCurrency(item.totalExpense)}
                      </div>
                    </div>
                  )}
                </div>
              )
            })}
            </div>

            {/* Trục X - Baseline */}
            <div className="border-t-2 border-gray-300 dark:border-gray-600 mx-6" />
          </div>
        </div>

        {/* Legend */}
        <div className="mt-6 flex items-center justify-center gap-6">
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded bg-[#D1D5DB]"></div>
            <span className="text-sm text-[#6B7280] dark:text-gray-400">Tháng trước</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded bg-[#10B981]"></div>
            <span className="text-sm text-[#6B7280] dark:text-gray-400">Tháng hiện tại</span>
          </div>
        </div>
      </div>
    )
  }

  // Hiển thị loading state
  if (isLoading) {
    return (
      <div className="w-full bg-white dark:bg-gray-800 rounded-2xl shadow-sm p-8">
        {renderChartSkeletonLoader()}
      </div>
    )
  }

  // Hiển thị error state
  if (error) {
    return (
      <div className="w-full bg-white dark:bg-gray-800 rounded-2xl shadow-sm p-8">
        <div className="flex flex-col items-center justify-center h-[400px] text-center">
          <div className="text-6xl mb-4">📊</div>
          <p className="text-[#878787] dark:text-gray-400 text-lg font-medium">{error}</p>
        </div>
      </div>
    )
  }

  // Hiển thị biểu đồ
  return (
    <div className="w-full bg-white dark:bg-gray-800 rounded-2xl shadow-sm p-8">
      {renderChart()}
    </div>
  )
}

export default ExpenseSummaryChart

