import React, { useState, useEffect, useCallback } from 'react'
import { expenseService } from '../../api/expense.service'
import { ExpenseBreakdownItem } from '../../api/types'
import { formatCurrency, formatDate } from '../../utils/format'

interface ExpensesBreakdownProps {
  month: string // Format: 'YYYY-MM'
}

/**
 * Component hiển thị breakdown chi tiêu theo danh mục
 */
const ExpensesBreakdown: React.FC<ExpensesBreakdownProps> = ({ month }) => {
  const [expensesData, setExpensesData] = useState<ExpenseBreakdownItem[]>([])
  const [isLoading, setIsLoading] = useState<boolean>(true) // Bắt đầu với true để hiển thị loading khi mount
  const [error, setError] = useState<string | null>(null)

  /**
   * Lấy dữ liệu breakdown chi tiêu từ API
   */
  const fetchExpensesBreakdown = useCallback(async (monthParam: string) => {
    // Validation: đảm bảo month có định dạng hợp lệ
    if (!monthParam || !/^\d{4}-\d{2}$/.test(monthParam)) {
      setError('Định dạng tháng không hợp lệ. Vui lòng sử dụng định dạng YYYY-MM.')
      setIsLoading(false)
      return
    }

    try {
      setIsLoading(true)
      setError(null)

      const response = await expenseService.getExpensesBreakdown(monthParam)

      // Kiểm tra nếu mảng data rỗng
      if (!response.data || response.data.length === 0) {
        setExpensesData([])
        setError('Bạn chưa có chi tiêu nào được ghi nhận trong tháng này.')
        return
      }

      // Cập nhật state với dữ liệu nhận được
      setExpensesData(response.data)
    } catch (err: any) {
      // Xử lý lỗi API
      const errorMessage =
        err.response?.data?.error ||
        err.response?.data?.message ||
        'Không thể tải dữ liệu breakdown chi tiêu. Vui lòng thử lại sau.'
      setError(errorMessage)
      setExpensesData([])
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    if (month) {
      fetchExpensesBreakdown(month)
    }
  }, [month, fetchExpensesBreakdown])

  /**
   * Render icon cho category (placeholder - có thể thay bằng icon thật từ thư viện)
   */
  const getCategoryIcon = (categoryName: string): string => {
    // Map category names to emoji icons (có thể thay bằng icon component)
    const iconMap: Record<string, string> = {
      Housing: '🏠',
      Food: '🍔',
      Transportation: '🚗',
      Shopping: '🛍️',
      Entertainment: '🎬',
      Health: '🏥',
      Education: '📚',
      Bills: '💳',
      Other: '📦',
    }
    return iconMap[categoryName] || '📋'
  }

  /**
   * Render skeleton loader
   */
  const renderSkeleton = () => {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {[1, 2, 3, 4, 5, 6].map((i) => (
          <div
            key={i}
            className="bg-white rounded-lg p-6 shadow-[0px_20px_25px_0px_rgba(76,103,100,0.1)] animate-pulse flex flex-col"
          >
            <div className="mb-4">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-10 h-10 bg-gray-200 rounded-full"></div>
                <div className="h-5 w-24 bg-gray-200 rounded"></div>
              </div>
              <div className="h-6 w-32 bg-gray-200 rounded mb-2"></div>
              <div className="h-5 w-20 bg-gray-200 rounded"></div>
            </div>
            <div className="border-t border-[rgba(210,210,210,0.25)] pt-4 mt-auto">
              <div className="space-y-2">
                {[1, 2].map((j) => (
                  <div key={j} className="flex justify-between items-center">
                    <div className="flex-1">
                      <div className="h-3 w-32 bg-gray-200 rounded mb-1"></div>
                      <div className="h-2 w-20 bg-gray-200 rounded"></div>
                    </div>
                    <div className="h-3 w-20 bg-gray-200 rounded"></div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        ))}
      </div>
    )
  }

  /**
   * Render error message
   */
  const renderError = () => {
    return (
      <div className="bg-white rounded-lg p-12 shadow-[0px_20px_25px_0px_rgba(76,103,100,0.1)] text-center">
        <div className="text-[#878787] text-5xl mb-4">📊</div>
        <p className="text-[#878787] text-base font-normal">{error}</p>
      </div>
    )
  }

  /**
   * Format change percentage với màu sắc theo Figma design
   */
  const formatChangePercent = (changePercent: number | null): { text: string; color: string; bgColor: string } => {
    if (changePercent === null) {
      return { text: 'N/A', color: 'text-[#878787]', bgColor: 'bg-gray-100' }
    }

    const isPositive = changePercent >= 0
    const sign = isPositive ? '+' : ''
    const color = isPositive ? 'text-[#10B981]' : 'text-[#EF4444]'
    const bgColor = isPositive ? 'bg-[#D1FAE5]' : 'bg-[#FEE2E2]'

    return {
      text: `${sign}${changePercent.toFixed(1)}%`,
      color,
      bgColor,
    }
  }

  if (isLoading) {
    return renderSkeleton()
  }

  if (error) {
    return renderError()
  }

  if (expensesData.length === 0) {
    return (
      <div className="bg-white rounded-lg p-12 shadow-[0px_20px_25px_0px_rgba(76,103,100,0.1)] text-center">
        <div className="text-[#878787] text-5xl mb-4">📊</div>
        <p className="text-[#878787] text-base font-normal">
          Bạn chưa có chi tiêu nào được ghi nhận trong tháng này.
        </p>
      </div>
    )
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {expensesData.map((item, index) => {
        const changeInfo = formatChangePercent(item.changePercent)

        return (
          <div
            key={index}
            className="bg-white rounded-lg p-6 shadow-[0px_20px_25px_0px_rgba(76,103,100,0.1)] hover:shadow-[0px_25px_30px_0px_rgba(76,103,100,0.15)] transition-shadow duration-200 flex flex-col"
          >
            {/* Header: Category Icon, Name, Total, Change Percent */}
            <div className="mb-4">
              <div className="flex items-center gap-3 mb-3">
                {/* Category Icon với background màu */}
                <div className="w-10 h-10 rounded-full bg-[#F3F4F6] flex items-center justify-center text-xl flex-shrink-0">
                  {getCategoryIcon(item.category)}
                </div>
                <h3 className="text-base font-semibold text-[#191D23] leading-5 truncate">
                  {item.category}
                </h3>
              </div>
              <div className="mb-2">
                <div className="text-lg font-bold text-[#191D23] leading-6">
                  {formatCurrency(item.total)}
                </div>
              </div>
              {/* Change Percent Badge */}
              <div className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium ${changeInfo.color} ${changeInfo.bgColor}`}>
                {changeInfo.text}
              </div>
            </div>

            {/* SubCategories List */}
            {item.subCategories && item.subCategories.length > 0 && (
              <div className="border-t border-[rgba(210,210,210,0.25)] pt-4 mt-auto">
                <div className="space-y-2 max-h-48 overflow-y-auto">
                  {item.subCategories.map((subItem, subIndex) => (
                    <div
                      key={subIndex}
                      className="flex justify-between items-start py-1.5 hover:bg-[#F9FAFB] rounded-lg px-2 -mx-2 transition-colors duration-150"
                    >
                      <div className="flex-1 min-w-0 pr-2">
                        <p className="text-xs font-medium text-[#191D23] leading-4 mb-0.5 truncate">
                          {subItem.item_description}
                        </p>
                        <p className="text-[10px] font-normal text-[#878787] leading-3">
                          {formatDate(subItem.date)}
                        </p>
                      </div>
                      <div className="text-xs font-semibold text-[#191D23] leading-4 flex-shrink-0">
                        {formatCurrency(subItem.amount)}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}

export default ExpensesBreakdown

