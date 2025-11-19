import React, { useState, useEffect } from 'react'
import Button from '../Button/Button'
import Input from '../Input/Input'
import { goalService } from '../../api/goal.service'
import { useToast } from '../../hooks/useToast'
import Toast from '../Toast/Toast'

interface AdjustGoalModalProps {
  isOpen: boolean
  onClose: () => void
  goalId: number
  currentTargetAmount: number
  onSuccess?: () => void
}

const AdjustGoalModal: React.FC<AdjustGoalModalProps> = ({
  isOpen,
  onClose,
  goalId,
  currentTargetAmount,
  onSuccess,
}) => {
  const { toast, showToast, hideToast } = useToast()
  const [targetAmount, setTargetAmount] = useState<string>(currentTargetAmount.toString())
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [inputError, setInputError] = useState<string | null>(null)

  // Reset state when modal opens/closes
  useEffect(() => {
    if (isOpen) {
      setTargetAmount(currentTargetAmount.toString())
      setError(null)
      setInputError(null)
      setIsLoading(false)
    }
  }, [isOpen, currentTargetAmount])

  // Handle save
  const handleSave = async () => {
    // Clear previous errors
    setError(null)
    setInputError(null)

    // Client-side validation: Kiểm tra giá trị nhập vào
    const amount = parseFloat(targetAmount)
    if (isNaN(amount) || amount <= 0) {
      setInputError('Số tiền mục tiêu phải lớn hơn 0.')
      return
    }

    // Set loading state
    setIsLoading(true)

    try {
      // Gọi API để cập nhật mục tiêu
      const response = await goalService.updateGoal(goalId, {
        target_amount: amount,
      })

      // Kiểm tra response thành công
      if (response.message === 'Goal updated successfully' || response.updated_goal) {
        // 1. Hiển thị thông báo toast thành công
        showToast('Điều chỉnh mục tiêu thành công.', 'success')

        // 2. Gọi hàm onClose() để đóng modal
        onClose()

        // 3. Gọi hàm callback onSuccess() để làm mới lại danh sách mục tiêu
        if (onSuccess) {
          onSuccess()
        }
      }
    } catch (err: any) {
      // Xử lý lỗi API
      setIsLoading(false)

      if (err.response) {
        const status = err.response.status
        const errorData = err.response.data

        if (status === 400) {
          // Lỗi validation từ backend
          setInputError(
            errorData.message?.[0] || 'Số tiền mục tiêu phải lớn hơn 0.',
          )
        } else if (status === 403) {
          // Lỗi quyền truy cập
          setError('Bạn không có quyền chỉnh sửa mục tiêu này.')
        } else if (status === 500) {
          // Lỗi hệ thống
          setError(
            errorData.message ||
              'Không thể lưu thay đổi lúc này. Vui lòng thử lại sau.',
          )
        } else {
          // Các lỗi khác
          setError(
            errorData.message || 'Đã xảy ra lỗi. Vui lòng thử lại sau.',
          )
        }
      } else {
        setError('Đã xảy ra lỗi. Vui lòng thử lại sau.')
      }
    }
  }

  // Don't render if modal is not open
  if (!isOpen) {
    return null
  }

  return (
    <>
      {/* Modal Overlay */}
      <div
        className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4"
        onClick={onClose}
      >
        {/* Modal Content */}
        <div
          className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-md w-full p-6"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Modal Header */}
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-bold text-gray-900 dark:text-white">
              Điều chỉnh mục tiêu
            </h2>
            {/* Close Button */}
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 focus:outline-none transition-colors"
              disabled={isLoading}
            >
              <svg
                className="w-6 h-6"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            </button>
          </div>

          {/* Modal Body */}
          <div className="space-y-4">
            {/* Target Amount Input */}
            <Input
              label="Số tiền mục tiêu"
              type="number"
              min="0"
              step="0.01"
              value={targetAmount}
              onChange={(e) => {
                setTargetAmount(e.target.value)
                setInputError(null) // Clear error when user types
              }}
              error={inputError || undefined}
              disabled={isLoading}
              placeholder="Nhập số tiền mục tiêu"
            />

            {/* General Error Message */}
            {error && (
              <div className="p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-md">
                <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
              </div>
            )}
          </div>

          {/* Modal Footer */}
          <div className="flex justify-end gap-3 mt-6">
            <Button
              variant="outline"
              onClick={onClose}
              disabled={isLoading}
            >
              Hủy
            </Button>
            <Button
              variant="primary"
              onClick={handleSave}
              isLoading={isLoading}
              disabled={isLoading}
            >
              Lưu
            </Button>
          </div>
        </div>
      </div>

      {/* Toast Notification */}
      {toast.show && (
        <Toast
          message={toast.message}
          type={toast.type}
          onClose={hideToast}
        />
      )}
    </>
  )
}

export default AdjustGoalModal

