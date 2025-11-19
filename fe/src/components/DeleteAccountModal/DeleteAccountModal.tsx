import React, { useState } from 'react'
import Button from '../Button/Button'
import { accountService } from '../../api/account.service'
import { useToast } from '../../hooks/useToast'
import Toast from '../Toast/Toast'

interface DeleteAccountModalProps {
  isOpen: boolean
  onClose: () => void
  accountId: number
  accountName: string
  accountNumberLast4: string
  onSuccess?: () => void
}

const DeleteAccountModal: React.FC<DeleteAccountModalProps> = ({
  isOpen,
  onClose,
  accountId,
  accountName,
  accountNumberLast4,
  onSuccess,
}) => {
  const { toast, showToast, hideToast } = useToast()
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Reset state when modal opens/closes
  React.useEffect(() => {
    if (!isOpen) {
      setError(null)
      setIsLoading(false)
    }
  }, [isOpen])

  // Handle delete account
  const handleDeleteAccount = async () => {
    // Clear previous errors
    setError(null)

    // Set loading state
    setIsLoading(true)

    try {
      // Call API to delete account
      const response = await accountService.deleteAccount(accountId)

      // Check if response is successful (backend returns { message, deleted_account_id })
      if (response.message || response.success) {
        // 1. Close modal
        onClose()

        // 2. Show success toast
        showToast('Đã xóa tài khoản thành công.', 'success')

        // 3. Call onSuccess callback to refresh account list
        if (onSuccess) {
          onSuccess()
        }
      }
    } catch (err: any) {
      // Handle errors
      setIsLoading(false)

      if (err.response) {
        const status = err.response.status
        const errorData = err.response.data

        if (status === 404) {
          setError(
            errorData.message || 'Account not found or not owned by current user',
          )
        } else if (status === 403) {
          setError('Bạn không có quyền thực hiện thao tác này.')
        } else if (status === 500) {
          setError(
            errorData.message ||
              'Đã xảy ra lỗi hệ thống, không thể xóa tài khoản và giao dịch liên quan.',
          )
        } else {
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
          <div className="flex items-center gap-3 mb-4">
            {/* Warning Icon */}
            <div className="flex-shrink-0">
              <svg
                className="w-8 h-8 text-yellow-500"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                />
              </svg>
            </div>
            <h2 className="text-xl font-bold text-gray-900 dark:text-white">
              Xác nhận xóa tài khoản
            </h2>
          </div>

          {/* Warning Message */}
          <div className="mb-6">
            <p className="text-gray-700 dark:text-gray-300 leading-relaxed">
              <span className="font-semibold text-red-600 dark:text-red-400">
                CẢNH BÁO:
              </span>{' '}
              Bạn có chắc chắn muốn xóa tài khoản{' '}
              <span className="font-semibold">
                {accountName} - {accountNumberLast4}
              </span>{' '}
              không? Thao tác này sẽ xóa{' '}
              <span className="font-semibold text-red-600 dark:text-red-400">
                VĨNH VIỄN
              </span>{' '}
              tài khoản và{' '}
              <span className="font-semibold text-red-600 dark:text-red-400">
                TẤT CẢ
              </span>{' '}
              giao dịch liên quan.
            </p>
          </div>

          {/* Error Message */}
          {error && (
            <div className="mb-4 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-md">
              <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex justify-end gap-3">
            <Button
              variant="outline"
              onClick={onClose}
              disabled={isLoading}
            >
              Hủy
            </Button>
            <Button
              variant="danger"
              onClick={handleDeleteAccount}
              isLoading={isLoading}
              disabled={isLoading}
            >
              {isLoading ? (
                <span className="flex items-center">
                  <svg
                    className="animate-spin -ml-1 mr-2 h-4 w-4"
                    fill="none"
                    viewBox="0 0 24 24"
                  >
                    <circle
                      className="opacity-25"
                      cx="12"
                      cy="12"
                      r="10"
                      stroke="currentColor"
                      strokeWidth="4"
                    />
                    <path
                      className="opacity-75"
                      fill="currentColor"
                      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                    />
                  </svg>
                  Đang xử lý...
                </span>
              ) : (
                'Xác nhận Xóa'
              )}
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

export default DeleteAccountModal

