import React, { useState } from 'react'
import ExpenseSummaryChart from '../../components/ExpenseSummaryChart/ExpenseSummaryChart'
import ExpensesBreakdown from '../../components/ExpensesBreakdown/ExpensesBreakdown'

/**
 * Trang hiển thị tổng hợp chi tiêu theo tháng
 */
const ExpensesPage: React.FC = () => {
  // State cho month picker - mặc định là tháng hiện tại
  const getCurrentMonth = (): string => {
    const now = new Date()
    const year = now.getFullYear()
    const month = String(now.getMonth() + 1).padStart(2, '0')
    return `${year}-${month}`
  }

  const [selectedMonth, setSelectedMonth] = useState<string>(getCurrentMonth())

  return (
    <div className="min-h-screen bg-[#F4F5F7] dark:bg-gray-900 p-8">
      <div className="max-w-7xl mx-auto">
        <h1 className="text-[22px] leading-[32px] font-normal text-[#878787] dark:text-gray-400 mb-6">
          Chi tiêu
        </h1>

        {/* Monthly Comparison Chart */}
        <div className="mb-8">
          <ExpenseSummaryChart />
        </div>

        {/* Expenses Breakdown Section */}
        <div className="mt-8">
          <div className="mb-6 flex items-center justify-between">
            <div>
              <h2 className="text-[22px] leading-[32px] font-normal text-[#878787] dark:text-gray-400 mb-2">
                Expenses Breakdown
              </h2>
              <p className="text-sm text-[#878787] dark:text-gray-500">
                Chi tiết chi tiêu theo danh mục
              </p>
            </div>
            <div className="flex items-center gap-3">
              <label
                htmlFor="month-picker"
                className="text-sm font-medium text-gray-700 dark:text-gray-300"
              >
                Chọn tháng:
              </label>
              <input
                id="month-picker"
                type="month"
                value={selectedMonth}
                onChange={(e) => setSelectedMonth(e.target.value)}
                className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md 
                         bg-white dark:bg-gray-700 text-gray-900 dark:text-white
                         focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent
                         cursor-pointer"
              />
            </div>
          </div>
          <ExpensesBreakdown month={selectedMonth} />
        </div>
      </div>
    </div>
  )
}

export default ExpensesPage

